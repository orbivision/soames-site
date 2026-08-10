import { test, expect } from "@playwright/test";
import { wpHost } from "./helpers";

// The blog archive and single-post surfaces, including the ORBI-53 author byline.
// Structure only: the display name and post titles come from live WordPress and are
// expected to change, so nothing here asserts their value.

// First post link on the archive — several tests need it.
async function firstPostPath(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/blog/");
  const link = page.locator('a[href^="/blog/post/"]').first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}

// Every single-post path, for the ORBI-64 sidebar tests — which post carries a Blog
// Image is a content decision, so they scan rather than assume.
async function allPostPaths(page: import("@playwright/test").Page): Promise<string[]> {
  await page.goto("/blog/");
  const hrefs = await page
    .locator('a[href^="/blog/post/"]')
    .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).getAttribute("href")!));
  return [...new Set(hrefs)];
}

test("blog archive lists posts", async ({ page }) => {
  await page.goto("/blog/");
  const links = page.locator('a[href^="/blog/post/"]');
  expect(await links.count()).toBeGreaterThan(0);
});

test("post byline shows an author name and avatar", async ({ page }) => {
  await page.goto(await firstPostPath(page));

  const bio = page.locator(".bio");
  await expect(bio).toHaveCount(1);

  // The avatar: Gravatar today, a WP-hosted upload localized to /wp-media/ once the
  // ORBI-53 plugin picker is in use. Either is fine — assert it has a real source.
  const avatar = bio.locator("img.bio-avatar");
  await expect(avatar).toHaveCount(1);
  const src = await avatar.getAttribute("src");
  expect(src?.trim()).toBeTruthy();

  // ORBI-53: the display name, in a <strong>. Non-empty, value not asserted.
  const name = bio.locator("strong");
  await expect(name).toHaveCount(1);
  expect((await name.innerText()).trim().length).toBeGreaterThan(0);
});

test("post has no Twitter follow link (ORBI-53 regression guard)", async ({ page }) => {
  await page.goto(await firstPostPath(page));

  // The byline used to end in "You should follow them on Twitter", linking to
  // twitter.com/<display name> — a URL with spaces in it that never worked.
  await expect(page.locator('a[href*="twitter.com"]')).toHaveCount(0);
  await expect(page.locator(".bio")).not.toContainText(/follow them on twitter/i);
});

// ── ORBI-64: the dedicated sidebar Blog Image ────────────────────────────────
//
// The bug: the sidebar used to render the post's FEATURED image with explicit
// width/height from WordPress, so a 1600px upload laid out at full intrinsic size in
// a ~440px column and ran off the right edge of the page. Nothing in the cascade
// constrained it (Bootstrap 5 dropped the broad `img{max-width:100%}`). It never
// showed on soames.app because no post here had a featured image — it needed real
// content to appear, which is why these tests measure rather than eyeball.

const SIDEBAR_IMG = "#soames-gatsby-sidebar-container img";

test("sidebar blog image is localized and stays inside its column", async ({ page }) => {
  let checked = 0;

  for (const path of await allPostPaths(page)) {
    await page.goto(path);
    const img = page.locator(SIDEBAR_IMG).first();
    if ((await page.locator(SIDEBAR_IMG).count()) === 0) continue;
    checked++;

    // ORBI-51: the URL must have been localized at build time. A WP-host src here
    // means blogImage skipped localizeUrl and every visitor fetches this image from
    // WordPress at runtime.
    const src = await img.getAttribute("src");
    expect(src, `${path} sidebar image src`).toMatch(/^\/wp-media\//);
    expect(src, `${path} sidebar image still points at WordPress`).not.toContain(wpHost());

    // The image must actually have decoded — a broken src would otherwise measure
    // 0-wide and sail through the width assertion below.
    expect(
      await img.evaluate((el) => (el as HTMLImageElement).naturalWidth),
      `${path} sidebar image failed to load`
    ).toBeGreaterThan(0);

    // The regression guard proper: rendered width must not exceed the column.
    const { imgW, colW } = await img.evaluate((el) => {
      const col = el.closest(".col-12") as HTMLElement;
      return {
        imgW: el.getBoundingClientRect().width,
        colW: col.getBoundingClientRect().width,
      };
    });
    expect(imgW, `${path} sidebar image is ${imgW}px in a ${colW}px column`)
      .toBeLessThanOrEqual(colW + 1);
  }

  // Same guard as core-blocks.spec: a scan that found nothing proves nothing. If this
  // fails, no published post has a Blog Image set — set one in WP (Posts → edit →
  // Blog Image) rather than deleting this assertion.
  expect(checked, "no post had a sidebar Blog Image — this test proved nothing")
    .toBeGreaterThan(0);
});

test("a post with no Blog Image renders no sidebar image and no gap", async ({ page }) => {
  // There is deliberately NO featured-image fallback (the featured image is reserved
  // for hero backgrounds), so an unset Blog Image must render nothing at all — not an
  // empty box holding 50px of margin above Recent Posts.
  for (const path of await allPostPaths(page)) {
    await page.goto(path);
    if ((await page.locator(SIDEBAR_IMG).count()) > 0) continue;

    const firstTag = await page
      .locator("#soames-gatsby-sidebar-container")
      .evaluate((el) => el.firstElementChild?.tagName ?? "");
    expect(firstTag, `${path} sidebar leads with something other than Recent Posts`).toBe("H1");
  }
});

test("a post page does not overflow horizontally at mobile width", async ({ page }) => {
  // NOT a regression test for the ORBI-64 overflow — verified: it passes against the
  // unfixed theme too. `main` carries `overflow-x: hidden` (components.css), so a
  // 1600px sidebar image was CLIPPED at the viewport edge rather than making the
  // document scroll — the image was visibly cut off, the page was not scrollable
  // sideways. The width assertion above is the guard that actually catches it.
  // This one is a forward guard for the neighbouring failure: something wide that
  // escapes that clip and does make a phone scroll sideways.
  await page.setViewportSize({ width: 390, height: 900 });
  for (const path of await allPostPaths(page)) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `${path} scrolls horizontally by ${overflow}px at 390px`).toBeLessThanOrEqual(1);
  }
});

test("post prev/next navigation resolves", async ({ page, request }) => {
  await page.goto(await firstPostPath(page));

  const nav = page.locator("nav.blog-post-nav");
  await expect(nav).toHaveCount(1);

  // With a single post there are no siblings, so links are optional — but any that
  // render must work.
  const hrefs = await nav.locator("a[href]").evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).href)
  );
  for (const href of hrefs) {
    const res = await request.get(href, { failOnStatusCode: false });
    expect(res.status(), `prev/next target ${href}`).toBe(200);
  }
});
