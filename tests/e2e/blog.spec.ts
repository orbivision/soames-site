import { test, expect } from "@playwright/test";

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
