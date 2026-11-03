import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';
import soamesTheme from 'soames-astro-theme';

// Local dev/build: load .env into process.env so the integration can read
// WORDPRESS_GRAPHQL_URL / WORDPRESS_BASE_URL. On Netlify there is no .env (it's
// untracked) — the values come from the site's build environment variables, so
// only load the file when it actually exists (loadEnvFile throws otherwise).
if (existsSync('.env')) process.loadEnvFile?.('.env'); // Node 20.12+/22+

export default defineConfig({
  output: 'static',
  integrations: [
    soamesTheme({
      wordpressUrl:
        process.env.WORDPRESS_GRAPHQL_URL || 'http://soames.orbivision.net/graphql',
      // ORBI-88: the public origin, so blog posts can share an absolute og:image. It also
      // turns on a self-referencing canonical + og:url on every page (ORBI-82).
      siteUrl: 'https://soames.app',
    }),
  ],
});
