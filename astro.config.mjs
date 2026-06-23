import { defineConfig } from 'astro/config';
import soamesTheme from 'soames-astro-theme';

// Load .env into process.env so the integration can read WORDPRESS_GRAPHQL_URL.
process.loadEnvFile?.('.env'); // Node 20.12+/22+

export default defineConfig({
  output: 'static',
  integrations: [
    soamesTheme({
      wordpressUrl:
        process.env.WORDPRESS_GRAPHQL_URL || 'http://soames.orbivision.net/graphql',
    }),
  ],
});
