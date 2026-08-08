import { test, expect } from "@playwright/test";
import { internalLinks, wpHost } from "./helpers";

// ORBI-63 — the Soames Icon Header block renders as a FULL-WIDTH band.
//
// Why this suite exists. The gray `#eee` header band used to be hand-written in WordPress as
// a raw `<section class="soames-section-subhead">`. ORBI-59 taught the page transform to wrap
// any unmapped top-level element in `.container.col-md-10`, which boxed those bands into the
// content column — on orbisoftware's Resume page, 54 of them at once. Moving the markup into
// a real block fixed it.
//
// WHAT ACTUALLY MAKES IT FULL WIDTH — worth stating, because the obvious answer is wrong.
// It is NOT `shouldWrapCoreBlock()`'s `wp-block-soames-` exemption. `handleShortcodes` claims
// the node at its class mapping (Shortcodes.tsx ~line 95) and returns the component there;
// the core-block fallback is deliberately LAST (~line 346) and never sees it. Verified by
// deleting the exemption from an installed theme and rebuilding: all four tests still passed.
// The exemption only matters for a Soames block that has NO mapping. So the mechanism here is
// simply "the mapping claims it first", and the thing worth testing is the OUTCOME.
//
// What these tests genuinely catch — verified by disabling the class mapping in an installed
// theme, which turned all four red with the discovery error below:
//   * the block silently stops rendering (mapping removed, component broken, block deleted in WP)
//   * the band stops spanning the viewport (component markup gains a container; CSS regresses)
//   * the icon stops being localized and reverts to loading from WordPress
//
// House rule (tests/e2e/helpers.ts): assert STRUCTURE, never COPY. These tests discover which
// page carries the block rather than hardcoding one, and read heading text only to check it is
// non-empty — so moving the block or rewording it can't turn them red.

/** The first page carrying an Icon Header, discovered from the nav rather than hardcoded. */
async function pageWithIconHeader(page: any): Promise<string> {
  await page.goto("/");
  const paths = Array.from(
    new Set(
      ["/"].concat(
        (await internalLinks(page))
          .map((href: string) => new URL(href).pathname)
          .filter((p: string) => !p.startsWith("/blog") && !p.startsWith("/docs"))
      )
    )
  ).slice(0, 12) as string[];

  for (const path of paths) {
    await page.goto(path);
    if ((await page.locator(".soames-section-subhead").count()) > 0) return path;
  }

  // Not a skip. The block being absent means this suite is no longer covering anything, and
  // that should be loud rather than silently green.
  throw new Error(
    `No .soames-section-subhead found on any of: ${paths.join(", ")}. ` +
      `Either the Icon Header block was removed from WordPress, or the theme stopped rendering it.`
  );
}

test("the Icon Header renders with its icon, title, subtitle and meta", async ({ page }) => {
  const path = await pageWithIconHeader(page);
  const section = page.locator(".soames-section-subhead").first();

  // Structural contract, mirroring the markup the block replaced.
  await expect(section.locator(".media-wrap-icon"), `${path} icon tile`).toHaveCount(1);
  for (const tag of ["h2", "h3", "h5"]) {
    const text = (await section.locator(tag).first().textContent()) ?? "";
    expect(text.trim().length, `${path} ${tag} is empty`).toBeGreaterThan(0);
  }
});

test("the Icon Header band spans the full viewport", async ({ page }) => {
  const path = await pageWithIconHeader(page);

  // The point of the whole project. Measured against the viewport rather than a fixed pixel
  // count so it holds at any window size — boxed, this would measure the ~1176px content
  // column at a 1440px viewport.
  const { width, viewport, left, boxed } = await page.evaluate(() => {
    const el = document.querySelector(".soames-section-subhead")!;
    const r = el.getBoundingClientRect();
    return {
      width: Math.round(r.width),
      viewport: window.innerWidth,
      left: Math.round(r.left),
      boxed: !!el.closest(".soames-core-block"),
    };
  });

  expect(left, `${path}: band starts at ${left}px, not the viewport edge`).toBeLessThanOrEqual(1);
  expect(
    width,
    `${path}: band is ${width}px inside a ${viewport}px viewport — it is being constrained`
  ).toBeGreaterThanOrEqual(viewport - 1);

  // Belt and braces. Can't fail while the mapping claims the node (see the header comment),
  // but it would catch the band ending up nested inside a constrained wrapper some other way.
  expect(boxed, `${path}: Icon Header is inside a .soames-core-block`).toBe(false);
});

test("the Icon Header icon is localized, not served from WordPress", async ({ page }) => {
  const path = await pageWithIconHeader(page);
  const src = await page
    .locator(".soames-section-subhead .media-wrap-icon img")
    .first()
    .getAttribute("src");

  // ORBI-51: the block's `data-image` is a WP-hosted URL, rewritten at build time by
  // localizeHtml. It gets that from a whole-content URL regex rather than any block-specific
  // code — nothing in the block's own path would break if that regex stopped matching, which
  // is exactly why it's worth pinning here.
  expect(src, `${path}: no icon rendered`).toBeTruthy();
  expect(src!, `${path}: icon still points at WordPress (${src})`).not.toContain(wpHost());
  expect(src!, `${path}: icon is not a localized /wp-media/ path (${src})`).toMatch(/^\/wp-media\//);
});

test("the Icon Header does not overflow horizontally at mobile width", async ({ page }) => {
  const path = await pageWithIconHeader(page);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(path);

  // A full-width section is the easiest kind to get wrong on a phone: one stray fixed width
  // inside it and the whole document scrolls sideways.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, `${path} scrolls horizontally by ${overflow}px at 390px`).toBeLessThanOrEqual(1);
});
