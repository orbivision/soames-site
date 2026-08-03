import { test, expect } from "@playwright/test";
import { internalLinks } from "./helpers";

// ORBI-59 — built-in WordPress blocks must sit in the Soames content column.
//
// The theme's page transform (Shortcodes.tsx) wrapped only headings and paragraphs in a
// Bootstrap container. Every other core block — lists, tables, buttons, images, quotes —
// fell through as raw HTML into `.soames-gatsby-content`, which sets padding but no
// max-width. On a real page that meant lists and tables spanning the entire viewport while
// the text beside them sat in a column, rendered at the browser's default 16px instead of
// the Soames 1.2rem body size.
//
// House rule applies: assert STRUCTURE, never COPY. These tests find whatever core blocks
// happen to exist by class name and never mention a heading or a sentence, so editing the
// page in WordPress can't turn them red.

/** Pages that carry WP block content, discovered from the nav rather than hardcoded. */
async function contentPages(page: any): Promise<string[]> {
  await page.goto("/");
  const links = await internalLinks(page);
  const paths = links
    .map((href: string) => new URL(href).pathname)
    .filter((p: string) => !p.startsWith("/blog") && !p.startsWith("/docs"));
  return Array.from(new Set(["/", ...paths])).slice(0, 12);
}

test("no built-in block escapes the content column", async ({ page }) => {
  const paths = await contentPages(page);
  const offenders: string[] = [];

  for (const path of paths) {
    await page.goto(path);
    // A core block is "escaped" if it is a DIRECT child of the transform's output wrapper:
    // that is precisely the position that gets no container. Soames blocks are exempt —
    // they are full-width sections by design and bring their own containers.
    const escaped = await page.evaluate(() => {
      const wrapper = document.querySelector("#soames-gatsby-content-container > div");
      if (!wrapper) return [];
      return Array.from(wrapper.children)
        .filter((el) => {
          const cls = Array.from(el.classList);
          if (cls.some((c) => c.startsWith("wp-block-soames-"))) return false;
          if (cls.includes("alignfull") || cls.includes("alignwide")) return false;
          return cls.some((c) => c.startsWith("wp-block-"));
        })
        .map((el) => el.tagName.toLowerCase() + "." + Array.from(el.classList)[0]);
    });
    for (const e of escaped) offenders.push(`${path} → ${e}`);
  }

  expect(offenders, `core blocks rendered outside the content column:\n${offenders.join("\n")}`)
    .toEqual([]);
});

test("built-in blocks match the body column width and font size", async ({ page }) => {
  const paths = await contentPages(page);
  let checked = 0;

  for (const path of paths) {
    await page.goto(path);

    const sample = await page.evaluate(() => {
      // Compare against a paragraph on the SAME page rather than a hardcoded pixel value:
      // the column width is Bootstrap's and changes with the viewport, so a literal would
      // be both brittle and meaningless.
      // Must be a TOP-LEVEL paragraph. A `p.block-text` nested inside a columns block is only
      // as wide as its column (169px on /blocks/), which makes the comparison nonsense — that
      // mistake failed this test on its first run.
      const ref = document.querySelector(
        "#soames-gatsby-content-container > div > section.soames-article p.block-text"
      );
      if (!ref) return null;
      const refBox = ref.getBoundingClientRect();
      const refFont = parseFloat(getComputedStyle(ref).fontSize);

      const blocks = Array.from(
        document.querySelectorAll<HTMLElement>(
          "#soames-gatsby-content-container [class*='wp-block-']"
        )
      ).filter((el) => {
        if (Array.from(el.classList).some((c) => c.startsWith("wp-block-soames-"))) return false;
        // Only outermost core blocks: an inner .wp-block-button is laid out by its parent.
        return !el.parentElement?.closest("[class*='wp-block-']");
      });

      return {
        refWidth: Math.round(refBox.width),
        refFont,
        blocks: blocks.map((el) => ({
          name: el.tagName.toLowerCase() + "." + Array.from(el.classList)[0],
          width: Math.round(el.getBoundingClientRect().width),
          font: parseFloat(getComputedStyle(el).fontSize),
        })),
      };
    });

    if (!sample || sample.blocks.length === 0) continue;
    checked += sample.blocks.length;

    for (const b of sample.blocks) {
      // The invariant is "must not exceed the column", not "must equal it": a block is
      // allowed to be narrower (an image at its intrinsic size, a short button row), and
      // asserting equality would fail on those for no good reason. Overflow is the bug.
      expect(
        b.width,
        `${path} ${b.name} is ${b.width}px wide, past the ${sample.refWidth}px body column`
      ).toBeLessThanOrEqual(sample.refWidth + 1);

      // Font is inherited from the wrapper, so it must not be smaller than body text.
      // >= rather than == because some blocks legitimately scale up (button links use 1.125em).
      expect(b.font, `${path} ${b.name} font ${b.font} < body ${sample.refFont}`)
        .toBeGreaterThanOrEqual(sample.refFont);
    }
  }

  // Guard against the suite quietly passing because it found nothing to measure.
  expect(checked, "no built-in blocks found on any page — this test proved nothing").toBeGreaterThan(0);
});

test("content does not overflow horizontally at mobile width", async ({ page }) => {
  // NOT a regression test for ORBI-59 — verified: it passes against the unfixed theme too,
  // because an unconstrained block fills the viewport without exceeding it. It's a forward
  // guard for the neighbouring failure: a wide table or a long button row that pushes the
  // document past the viewport and makes the page scroll sideways on a phone.
  await page.setViewportSize({ width: 390, height: 900 });
  for (const path of await contentPages(page)) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `${path} scrolls horizontally by ${overflow}px at 390px`).toBeLessThanOrEqual(1);
  }
});
