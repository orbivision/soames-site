import { test, expect } from "@playwright/test";
import { internalLinks, findBrokenLinks } from "./helpers";

// Whole-site health: the pages render their expected structure, and every internal
// link actually resolves. Broken menu/slug configuration is a recurring class of
// breakage here (WP menus and the blog base slug are both resolved at build time),
// and nothing caught it before this suite.

test("home page renders one h1 and the hero", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);

  // Exactly one h1 — a second one usually means a block or hero regressed into
  // emitting its own top-level heading.
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).not.toHaveText(/^\s*$/);

  // The hero backdrop is applied via a <style> rule on .soames-background-lg
  // (::after), not an inline style, so assert the section and its overlay rather
  // than a background-image attribute.
  await expect(page.locator("section.soames-header-lg").first()).toBeVisible();
  await expect(page.locator(".soames-hero-header").first()).toBeVisible();
});

test("site chrome is present on every top-level page", async ({ page }) => {
  for (const path of ["/", "/blog/", "/docs/"]) {
    await page.goto(path);
    await expect(page.locator(".soames-menu nav.navbar").first()).toBeVisible();
    // The footer is tall and below the fold; existence in the DOM is the assertion.
    await expect(page.locator("section.soames-footer").first()).toHaveCount(1);
  }
});

test("every internal link resolves", async ({ page, request }) => {
  // Seed the crawl from the three hubs; between them they surface the nav menu,
  // the blog archive, and the docs tree.
  const seen = new Set<string>();
  for (const path of ["/", "/blog/", "/docs/"]) {
    await page.goto(path);
    for (const url of await internalLinks(page)) seen.add(url);
  }

  // Bound the crawl so this can't grow into a multi-minute test as content grows.
  // If the cap ever bites, say so out loud — a silent truncation would read as
  // full coverage.
  const CAP = 60;
  const urls = [...seen];
  if (urls.length > CAP) {
    console.log(`[e2e] link crawl capped: checking ${CAP} of ${urls.length} URLs`);
  }
  const checked = urls.slice(0, CAP);
  expect(checked.length).toBeGreaterThan(3);

  const broken = await findBrokenLinks(request, checked);
  expect(broken, `broken internal links: ${JSON.stringify(broken, null, 2)}`).toEqual([]);
});

test("social/SEO meta tags are populated", async ({ page }) => {
  for (const path of ["/", "/blog/", "/docs/"]) {
    await page.goto(path);
    for (const property of ["og:title", "og:type"]) {
      const content = await page
        .locator(`meta[property="${property}"]`)
        .first()
        .getAttribute("content");
      expect(content?.trim(), `${property} on ${path}`).toBeTruthy();
    }
    const card = await page
      .locator('meta[name="twitter:card"]')
      .first()
      .getAttribute("content");
    expect(card?.trim(), `twitter:card on ${path}`).toBeTruthy();
  }
});

// Both defects this test was written for were FIXED in ORBI-68 (theme 0.1.25), so
// it is a live assertion now rather than a `fixme`:
//
//   1. `/` and every blog post emitted RAW HTML inside the description, e.g.
//      content="<p>Soames connects WordPress…". WP excerpts are HTML and nothing
//      stripped the tags.
//   2. `/blog/` (the WP "Posts page") emitted an EMPTY description attribute — the
//      route passed no description at all and the WP tagline is blank.
//
// The theme now strips tags, decodes entities and caps at 160 chars centrally in
// Base.astro, so this holds for every route rather than the three probed here.
//
// If this ever fails by TIMEOUT rather than assertion, the meta tag is absent, not
// empty: `getAttribute` waits for an element that never appears. That means the
// theme's description fallback chain resolved to "" — which it is designed never
// to do, since its last resort is derived from the required `pageTitle` prop.
test("descriptions are non-empty and contain no HTML", async ({ page }) => {
  for (const path of ["/", "/blog/", "/docs/"]) {
    await page.goto(path);
    for (const sel of ['meta[property="og:description"]', 'meta[name="description"]']) {
      const content = (await page.locator(sel).first().getAttribute("content")) ?? "";
      expect(content.trim(), `${sel} on ${path} is empty`).toBeTruthy();
      expect(content, `${sel} on ${path} contains HTML`).not.toMatch(/<[a-z/]/i);
    }
  }
});
