import { test, expect } from "@playwright/test";

// ORBI-85: /preview/ — where WordPress's Preview button lands (the plugin 302s to
// /preview/?token=…). A real draft needs a logged-in editor to mint a token, which this suite
// can't do against live WordPress; the plugin's own e2e covers that half. These assert the shell:
// it exists, it can never be indexed, and it reports a bad token instead of hanging on "Loading".

test("the preview shell is noindex and has no canonical", async ({ page }) => {
  const res = await page.goto("/preview/");
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("no token: says how to get one", async ({ page }) => {
  await page.goto("/preview/");
  await expect(page.locator(".soames-preview-status p")).toContainText("Preview button");
});

test("a bad token: WordPress refuses it and the page says so", async ({ page }) => {
  const rest = page.waitForResponse((r) => r.url().includes("/soames/v1/preview"));
  await page.goto("/preview/?token=not-a-real-token");
  expect((await rest).status()).toBe(403);
  const status = page.locator(".soames-preview-status p");
  await expect(status).not.toContainText("Loading");
  await expect(status).not.toBeEmpty();
});
