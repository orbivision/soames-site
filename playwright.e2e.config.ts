import { defineConfig, devices } from "@playwright/test";

// ORBI-54: FUNCTIONAL e2e tests for the built Astro site — behaviour, not pixels.
//
// Deliberately a separate config from playwright.config.ts (the ORBI-47 visual
// suite). Two reasons:
//   1. These tests take no screenshots, so they need no baselines and none of the
//      pinned-Docker-image discipline the visual suite lives by. They run fine on
//      macOS and on a bare CI runner.
//   2. Keeping them out of the visual config means nothing here can perturb the
//      required `visual` check or its four committed baselines.
//
// Shares the same webServer contract: build the real production site (which fetches
// live WordPress content) and serve it, so what's asserted is what ships.
//
// PORT is deliberately NOT 4321 and reuseExistingServer is deliberately OFF. The
// visual suite gets away with `reuseExistingServer: !CI` because it only ever runs
// inside Docker, where nothing else is listening. These tests run on the host, where
// a leftover `astro dev` on 4321 would be silently reused — and then the whole suite
// asserts against a Vite dev server (HMR reloads mid-test → detached frames, aborted
// navigations, dev-only re-fetch behaviour) instead of the built site. That happened
// on the first run of this suite. Own port, always a fresh build.
const PORT = 4329;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",

  use: {
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: "reduce",
    trace: "on-first-retry",
  },

  // One project: these assertions are viewport-independent. The visual suite is
  // where desktop/mobile rendering differences are covered.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --host`,
    url: `http://localhost:${PORT}`,
    // Never reuse: see the PORT comment above.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
