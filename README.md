<p align="center">
  <a href="https://soames.app">
    <img alt="Soames" src="https://raw.githubusercontent.com/orbivision/soames-astro-theme/main/assets/soames-mark.svg" width="60" />
  </a>
</p>
<h1 align="center">
  soames-site
</h1>

**This repo is [soames.app](https://soames.app)** — the Soames project's own website. It's a
real, deployed implementation of Soames: a static [Astro](https://astro.build) front end
built from WordPress content via [WPGraphQL](https://www.wpgraphql.com/), using the
[`soames-astro-theme`](https://www.npmjs.com/package/soames-astro-theme) package.

> ### Don't start a new project from this repo
>
> It isn't a starter, and it won't behave like one. What's here is specific to soames.app:
> ~300 lines of site-specific CSS overrides, committed visual-regression baselines of *this*
> site's chrome, and a Netlify configuration bound to one Netlify site. Cloning it means
> deleting your way out of somebody else's website.
>
> **Start from [`soames-astro-starter`](https://github.com/orbivision/soames-astro-starter)
> instead** — click *Use this template*. It's the same theme with none of soames.app in it.
>
> Read this repo if you want to see how a finished Soames site is put together.

## What's actually in here

Almost nothing, by design — the theme provides all routes, layouts, and components:

| | |
|---|---|
| `astro.config.mjs` | Registers the theme integration, pointed at the WordPress endpoint |
| `src/overrides/styles/site-overrides.css` | soames.app's own CSS, shadowing the theme's empty placeholder |
| `tests/visual/` | Pixel baselines for the site chrome (**required CI check** — see below) |
| `tests/e2e/` | Functional tests over the built site |
| `netlify.toml` | Build command, publish dir, Node version |

## Local development

```bash
nvm use              # Node 22, from .nvmrc
npm install
npm run dev          # http://localhost:4321
```

You need a `.env` with the WordPress GraphQL endpoint — copy `.env.example`:

```
WORDPRESS_GRAPHQL_URL=https://your-wordpress.example.com/graphql
```

`.env` is git-ignored. Netlify supplies the same value as a build environment variable, so
`astro.config.mjs` loads the file only when it exists.

Content edits in WordPress show up on refresh. **Adding or removing** pages or posts changes
the set of routes, so restart `npm run dev` for those.

```bash
npm run build        # static output in dist/
npm run preview      # serve the production build locally
```

## Tests

Two suites with deliberately different rules — `tests/README.md` explains the split, and
read `tests/visual/README.md` before touching baselines.

```bash
npm run test:e2e                     # behaviour: links resolve, markup structure, hydration
npm run test:visual:docker           # pixels, in the pinned Playwright container
npm run test:visual:docker:update    # refresh the baselines
```

### `main` is gated by the visual check

`.github/workflows/visual.yml` is a **required check** on `main`. Any intentional rendering
change — a theme bump, a CSS override, new layout work — needs refreshed baselines committed
**in the same PR**, or the check fails and the PR can't merge.

Two rules that save time:

- Generate baselines **only** in the pinned Docker image (`npm run test:visual:docker:update`).
  Font and subpixel rendering differ per OS, so macOS-rendered snapshots diff against CI's.
- Run the update **after** the WordPress content has settled, or the snapshots capture
  in-flight content and you'll be regenerating them again tomorrow.

## Deployment

Netlify site **`soames`** (team `orbivision`), deployed by Git CD from `main`:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 22 |
| Environment | `WORDPRESS_GRAPHQL_URL` |

Cloudflare sits in front in **Full (strict)** SSL mode.

Because the output is static, publishing in WordPress doesn't change the live site until it
rebuilds. The Soames plugin POSTs to a Netlify build hook whenever content is published
(~1 minute, via wp-cron); *Soames → Settings → Deploy now* in wp-admin triggers one by hand.

## The rest of the ecosystem

| Repo | What it is |
|---|---|
| [`soames-astro-starter`](https://github.com/orbivision/soames-astro-starter) | **Start new sites here** — minimal template on the theme |
| [`soames-astro-theme`](https://github.com/orbivision/soames-astro-theme) | The theme itself; published to npm |
| [`soames-wordpress-plugin`](https://github.com/orbivision/soames-wordpress-plugin) | The WordPress side — blocks, settings, Knowledge Base, previews |

Setup and authoring guides live in the [Knowledge Base](https://soames.app/docs/); the
plugin download is at [soames.app/download/](https://soames.app/download/).
