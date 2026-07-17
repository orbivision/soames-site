import { test, expect } from "@playwright/test";

// Visual snapshots of the site's stable chrome (header + footer). Phase 1 stays
// on chrome and avoids WordPress-driven body content, which is non-deterministic.
// Runs once per project (desktop + mobile) — see playwright.config.ts.

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // Web fonts change metrics; wait for them before snapshotting.
  await page.evaluate(() => document.fonts.ready);
});

test("site header", async ({ page }) => {
  // The header holds the logo — this is the ORBI-45 surface (desktop 42px;
  // mobile still too large as of 2026-07-17, to be fixed as a baseline update).
  // Target the nav bar itself: the wrapping <section> collapses to 0 height
  // because .navbar is position:fixed (removed from flow), so it reads as hidden.
  const header = page.locator(".soames-menu nav.navbar").first();
  await expect(header).toBeVisible();
  await expect(header).toHaveScreenshot("header.png");
});

test("site footer", async ({ page }) => {
  // Hide the fixed navbar: when the tall footer scrolls into view the pinned
  // header composites over its top edge, which would (wrongly) couple this
  // snapshot to header changes. Isolate the footer as its own piece of chrome.
  await page.addStyleTag({ content: ".soames-menu { display: none !important; }" });
  const footer = page.locator("section.soames-footer").first();
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  // Contact blurb / company name come from Site Assets (rarely change); if they
  // start causing churn, add `mask:` locators for those regions here.
  await expect(footer).toHaveScreenshot("footer.png");
});
