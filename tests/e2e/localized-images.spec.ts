import { test, expect } from "@playwright/test";
import { internalLinks, wpHost } from "./helpers";

// ORBI-51 regression guard: after a build, NO image may still be served from the
// WordPress host — every WP-origin image should have been downloaded into
// /wp-media/ and rewritten. That property is invisible short of reading the HTML,
// which is exactly why it deserves a test: a change to the URL matcher (e.g. the
// escaped-slash handling in block `data-items` JSON) could silently re-couple the
// live site to WordPress for images, and everything would still look correct.
//
// Note this asserts nothing about Gravatar. Gravatar is a different host with no
// image extension, so localizeUrl deliberately passes it through — and until the
// ORBI-53 plugin picker is in use, the author avatar IS a Gravatar URL.

test("no built page references WordPress-hosted images", async ({ page }) => {
  const host = wpHost();

  const pages = new Set<string>(["/"]);
  for (const path of ["/", "/blog/", "/docs/"]) {
    await page.goto(path);
    for (const url of await internalLinks(page)) pages.add(new URL(url).pathname);
  }

  const offenders: Array<{ page: string; attr: string; value: string }> = [];

  for (const path of [...pages].slice(0, 30)) {
    await page.goto(path);

    // <img src> / <img srcset> / <source srcset>
    const refs = await page.locator("img, source").evaluateAll((els) =>
      els.flatMap((el) => {
        const out: Array<{ attr: string; value: string }> = [];
        const src = el.getAttribute("src");
        const srcset = el.getAttribute("srcset");
        if (src) out.push({ attr: "src", value: src });
        if (srcset) out.push({ attr: "srcset", value: srcset });
        return out;
      })
    );
    for (const r of refs) {
      if (r.value.includes(host)) offenders.push({ page: path, ...r });
    }

    // Inline and injected CSS background images (the hero backdrop lives in a
    // <style> block, not an attribute).
    const cssRefs = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
        const s = el.getAttribute("style");
        if (s && s.includes("url(")) out.push(s);
      });
      document.querySelectorAll("style").forEach((el) => {
        const t = el.textContent ?? "";
        if (t.includes("url(")) out.push(t);
      });
      return out;
    });
    for (const css of cssRefs) {
      if (css.includes(host)) {
        offenders.push({ page: path, attr: "css-url", value: css.slice(0, 200) });
      }
    }
  }

  expect(
    offenders,
    `images still served from ${host}: ${JSON.stringify(offenders, null, 2)}`
  ).toEqual([]);
});

test("localized images actually resolve", async ({ page, request }) => {
  // A rewritten /wp-media/ path that 404s would be worse than not localizing at
  // all, so spot-check that the emitted files are really there.
  await page.goto("/");
  const srcs = await page.locator('img[src^="/wp-media/"]').evaluateAll((els) =>
    els.map((el) => (el as HTMLImageElement).getAttribute("src")!)
  );

  // The home hero backdrop is a CSS background, so also pull /wp-media/ URLs out of
  // style blocks to make this meaningful even when no <img> is localized.
  const cssSrcs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("style"))
      .flatMap((el) => Array.from((el.textContent ?? "").matchAll(/url\((\/wp-media\/[^)"']+)\)/g)))
      .map((m) => m[1])
  );

  const all = [...new Set([...srcs, ...cssSrcs])];
  test.skip(all.length === 0, "no localized images on the home page to check");

  for (const src of all) {
    const res = await request.get(src, { failOnStatusCode: false });
    expect(res.status(), `localized asset ${src}`).toBe(200);
  }
});
