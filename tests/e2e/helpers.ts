import type { Page, APIRequestContext } from "@playwright/test";

// ORBI-54 shared helpers.
//
// House rule for everything in tests/e2e: assert STRUCTURE, never COPY. The site is
// built from live WordPress, so any test that hard-codes a post title, an author
// name, or a doc heading goes red the next time someone edits content — and a suite
// that cries wolf gets ignored. Where a test needs a real string, derive it from the
// page at runtime (see docs.spec.ts, which builds its search query from a card title).

// The WordPress host whose images ORBI-51 localization must eliminate from the build.
// Mirrors the theme's own default in src/lib/wp.ts.
export function wpHost(): string {
  const raw =
    process.env.WORDPRESS_BASE_URL ||
    process.env.WORDPRESS_GRAPHQL_URL ||
    "http://soames.orbivision.net";
  try {
    return new URL(raw).host;
  } catch {
    return "soames.orbivision.net";
  }
}

// Same-origin page links from the current DOM, normalized for crawling: absolute
// URLs only, hash/query stripped, deduped, and non-page targets dropped.
export async function internalLinks(page: Page): Promise<string[]> {
  const hrefs = await page.locator("a[href]").evaluateAll((els) =>
    els.map((el) => (el as HTMLAnchorElement).href)
  );
  const origin = new URL(page.url()).origin;
  const out = new Set<string>();
  for (const href of hrefs) {
    let u: URL;
    try {
      u = new URL(href);
    } catch {
      continue;
    }
    if (u.origin !== origin) continue; // external links aren't ours to guarantee
    if (!/^https?:$/.test(u.protocol)) continue; // mailto:, tel:, …
    u.hash = "";
    u.search = "";
    // Asset paths aren't navigable pages; /wp-media/ is ORBI-51 output.
    if (/\.(png|jpe?g|gif|webp|svg|avif|ico|css|js|json|xml|txt|pdf)$/i.test(u.pathname)) continue;
    out.add(u.toString());
  }
  return [...out];
}

// Fetch each URL and return the ones that didn't come back 200. Uses the request
// context rather than page navigations — an order of magnitude faster, and a status
// code is all that's being asserted.
export async function findBrokenLinks(
  request: APIRequestContext,
  urls: string[]
): Promise<Array<{ url: string; status: number }>> {
  const broken: Array<{ url: string; status: number }> = [];
  for (const url of urls) {
    // Astro's preview server doesn't answer HEAD for every route, so GET it is.
    const res = await request.get(url, { failOnStatusCode: false });
    if (res.status() !== 200) broken.push({ url, status: res.status() });
  }
  return broken;
}
