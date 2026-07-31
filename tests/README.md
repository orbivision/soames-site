# Tests

Two suites with deliberately different rules. Know which one you're touching.

| | `tests/visual/` (ORBI-47) | `tests/e2e/` (ORBI-54) |
|---|---|---|
| Asserts | **Pixels** — screenshots of the site's chrome | **Behaviour** — links resolve, markup structure, hydration |
| Baselines | 4 committed PNGs under `__screenshots__/` | None |
| Where it may run | **Only** in the pinned Playwright container | Anywhere — macOS, bare CI runner |
| Config | `playwright.config.ts` | `playwright.e2e.config.ts` |
| Port | 4321 | 4329 |
| CI | `.github/workflows/visual.yml` — **required check** | `.github/workflows/e2e.yml` — not required (yet) |

```bash
npm run test:visual:docker           # pixels (see tests/visual/README.md first)
npm run test:e2e                     # behaviour
npm run test:e2e:ui                  # …with the Playwright UI
npx playwright install chromium      # once, for the e2e suite
```

## Why the e2e suite doesn't need Docker

The visual suite lives in a pinned container because font and subpixel rendering
differ per OS, so a macOS-rendered baseline diffs against a Linux one. The e2e suite
takes **no screenshots**, so it has nothing to match and runs natively. Don't "fix"
consistency by moving it into the container — that just makes it slower.

## Two rules for `tests/e2e/`

**1. Assert structure, never copy.** The site is built from live WordPress. A test
that hard-codes a post title, an author name, or a doc heading goes red the next time
someone edits content, and a suite that cries wolf gets ignored. Assert that the
byline has a non-empty `<strong>`, not that it says a particular name. Where a real
string is genuinely needed, derive it from the page at runtime — `docs.spec.ts` builds
its search query out of a card title it just read.

**2. Never reuse a running server.** `playwright.e2e.config.ts` pins its own port and
sets `reuseExistingServer: false`. A leftover `astro dev` on 4321 would otherwise be
silently reused, and the whole suite would assert against a Vite dev server — HMR
reloads mid-test, aborted navigations, dev-only re-fetch behaviour. That happened on
this suite's first run: a dev server that had been up for two days made ten tests fail
for reasons that had nothing to do with the site.

## What's covered

- `site.spec.ts` — home renders one `<h1>` and the hero; chrome on every top-level
  page; **every internal link on `/`, `/blog/` and `/docs/` returns 200** (catches
  broken menu/slug config); OG/Twitter meta populated.
- `blog.spec.ts` — archive lists posts; the ORBI-53 byline has an avatar and a
  non-empty display name; **no `twitter.com` link anywhere**; prev/next resolve.
- `docs.spec.ts` — card grid; sidebar and breadcrumb with a non-linked last crumb;
  the search index endpoint's shape; and the ORBI-50 search island genuinely
  hydrating, returning results, and navigating on Enter.
- `localized-images.spec.ts` — the ORBI-51 guard: **no page references a
  WordPress-hosted image**, and the `/wp-media/` paths that replaced them resolve.

## Known-failing, on purpose

`site.spec.ts` has a `test.fixme` for meta descriptions, recording two real defects
this suite found in the theme's SEO block:

1. `/` and every blog post emit **raw HTML** in the description
   (`content="<p>Soames connects…"`) — WP excerpts are HTML and nothing strips tags.
2. `/blog/` emits an **empty** description attribute.

It's written as an expectation rather than a bug report so it turns green the moment
the theme is fixed, without the suite being red in the meantime.
