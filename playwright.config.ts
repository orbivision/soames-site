import { defineConfig, devices } from "@playwright/test";

// ORBI-47: visual-regression tests for the built Astro site (soames-site).
// Baselines are rendered in the pinned Playwright Docker image (see tests/visual/
// README.md) so font/subpixel rendering matches CI — do NOT commit baselines
// generated on macOS/host, they will diff against Linux.
const PORT = 4321;

export default defineConfig({
  testDir: "./tests/visual",
  // No {platform} segment: we always render in the same Linux container, so
  // baselines are environment-stable and platform-agnostic in the path.
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{projectName}-{arg}{ext}",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",

  use: {
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: "reduce",
    trace: "on-first-retry",
  },

  // Lock the diff tolerance tight; chrome is static so this should be exact-ish.
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },

  projects: [
    {
      name: "desktop",
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    },
    {
      // Phone width — this is where the ORBI-45 mobile logo issue lives. The
      // navbar's max-width:991px rules apply below 992px CSS px.
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
    },
  ],

  // Build the real production site and serve it — closer to prod than `dev`,
  // and avoids the DEV-only in-body re-fetch. Build fetches WordPress content.
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --host`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
