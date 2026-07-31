import { test, expect } from "@playwright/test";

// The Knowledge Base surfaces: the /docs/ card grid, an article's sidebar and
// breadcrumb (ORBI-40), and the ORBI-50 client-side search island — which is the
// piece most likely to break silently, since it's the only hydrated component here
// and a build that emits a bad index still renders a perfectly fine-looking input.

const INDEX_URL = "/docs/search-index.json";

test("docs landing renders a card grid", async ({ page }) => {
  await page.goto("/docs/");
  const cards = page.locator(".card-wrapper .card-title, .card .card-title");
  expect(await cards.count()).toBeGreaterThan(0);
});

test("docs article has a sidebar and a breadcrumb trail", async ({ page }) => {
  await page.goto("/docs/");
  const first = page.locator('a[href^="/docs/"]').first();
  await first.click();
  await page.waitForURL(/\/docs\/.+/);

  await expect(page.locator("nav.soames-docs-nav, .soames-docs-menu").first()).toHaveCount(1);

  const crumbs = page.locator('nav[aria-label="Breadcrumb"] .soames-breadcrumb-item');
  expect(await crumbs.count()).toBeGreaterThan(1);

  // ORBI-40: the current page is the last crumb and is deliberately not a link.
  await expect(crumbs.last().locator("a")).toHaveCount(0);
});

test("search index endpoint is a non-empty array of records", async ({ request }) => {
  const res = await request.get(INDEX_URL);
  expect(res.status()).toBe(200);
  const records = await res.json();
  expect(Array.isArray(records)).toBe(true);
  expect(records.length).toBeGreaterThan(0);
  // The shape DocsSearch indexes and stores.
  for (const key of ["id", "title", "uri"]) {
    expect(records[0], `record.${key}`).toHaveProperty(key);
  }
});

test("docs search hydrates, returns results, and Enter navigates", async ({ page }) => {
  await page.goto("/docs/");

  // Derive the query from real content instead of hard-coding one: take a word from
  // the first card title. Keeps the test honest without coupling it to any article.
  const title = (await page.locator(".card-title").first().innerText()).trim();
  const term = title.split(/\s+/).find((w) => w.replace(/\W/g, "").length >= 4) ?? title;
  const query = term.replace(/\W/g, "").slice(0, 6);
  expect(query.length).toBeGreaterThanOrEqual(3);

  const input = page.locator("input.soames-docs-search-input").first();
  await expect(input).toBeVisible();

  // The island fetches the index on FIRST FOCUS and only re-runs the search on a
  // subsequent keystroke — so typing before the fetch resolves yields no results
  // until another character is typed. Wait for the index, then type. (That
  // cold-index gap is a real UX wrinkle in the component, noted as a follow-up;
  // the test waits deliberately rather than papering over a flake.)
  const indexLoaded = page.waitForResponse(
    (r) => r.url().includes("search-index.json") && r.ok()
  );
  await input.click();
  await indexLoaded;

  await input.fill(query);

  const results = page.locator("ul.soames-docs-search-results li.soames-docs-search-result");
  await expect(results.first()).toBeVisible();
  expect(await results.count()).toBeGreaterThan(0);

  // First hit is pre-selected, so Enter should navigate to it.
  await input.press("Enter");
  await page.waitForURL(/\/docs\/.+/);
  expect(new URL(page.url()).pathname).toMatch(/^\/docs\/.+/);
  await expect(page.locator("h1").first()).toBeVisible();
});
