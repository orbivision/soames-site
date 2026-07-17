# Visual regression tests (ORBI-47)

Playwright screenshot tests over the **built** Astro site. They guard the site's
chrome (header/logo, footer) against unintended visual changes — e.g. a theme bump
that shifts the header logo at desktop or mobile widths.

## The one rule: baselines are Linux/Docker-rendered

Font and subpixel rendering differ across operating systems. Baselines committed
here are rendered in the pinned Playwright Docker image and **must** be generated
and compared in that same image, or you'll get spurious diffs. Never commit
snapshots produced by running `playwright test` directly on macOS/Windows.

Pinned image: `mcr.microsoft.com/playwright:v1.61.1-noble` (matches `@playwright/test`
in package.json — bump both together).

## Commands

```bash
# Run the tests in the pinned container (build + serve + screenshot + compare):
npm run test:visual:docker

# Update/regenerate baselines after an INTENTIONAL UI change, then review the diff:
npm run test:visual:docker:update

# Raw runners (used inside the container / CI — don't run these directly on macOS):
npm run test:visual
npm run test:visual:update
```

`test:visual:docker` runs `npm ci` inside the container first (installs Linux-native
deps), so the first run is slow (~1–2 min). The build fetches live WordPress content,
so network is required.

## When a test fails

- **Unintended change:** open `playwright-report/` (CI uploads it as an artifact) to
  see expected/actual/diff, and fix the regression.
- **Intended change:** run the `:update` command, commit the new PNGs under
  `__screenshots__/`, and the diff will be visible/reviewable in the PR.

## CI

`.github/workflows/visual.yml` runs these on PRs to `main` inside the same container.
To make it *block* merges, add it as a required status check in the repo's branch
protection settings. It's independent of Netlify, so it never blocks a deploy from
`main`.

## Scope

Phase 1 = chrome only (header, footer) at desktop (1440) and mobile (390). Full-page
/ WordPress-content snapshots are deferred until we have a pinned or seeded data
source (live content would make them flaky). Phase 2 (separate project) = plugin
admin UI via `@wordpress/env`.
