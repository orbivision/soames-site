<p align="center">
  <a href="https://www.gatsbyjs.com">
    <img alt="Gatsby" src="https://www.gatsbyjs.com/Gatsby-Monogram.svg" width="60" />
  </a>
</p>
<h1 align="center">
  Soames Gatsby Starter
</h1>

A minimal starter for building a personal website using the [Soames Gatsby Theme](https://github.com/orbivision/soames-gatsby-theme) and WordPress as a headless CMS.

## Features

- WordPress content via gatsby-source-wordpress
- Built-in layout and styling from Soames Theme
- Shadow components for customization

## Quick Start

```bash
git clone https://github.com/orbivision/gatsby-starter-soames.git my-soames-site
cd my-soames-site
npm install
# Edit your WordPress GraphQL URL in the .env.development file
npm gatsby develop
```

## Using This Starter for Your Own Site

To use this starter as a base for your own Gatsby website:

1. Clone the repo:

```bash
git clone https://github.com/orbivision/gatsby-starter-soames.git new-soames-site
cd new-soames-site
```

2. Edit your WordPress GraphQL URL in the .env.development file.

3. Remove the existing git history to start fresh:

```bash
rm -rf .git
```

3. Create a new repository on GitHub (e.g., new-soames-site) at https://github.com/new.
Leave “Initialize this repository with a README” unchecked.

4. Link your local project to the new repository:

```bash
git init           # Initialize a new Git repository
git remote add origin https://github.com/your-username/new-soames-site.git
git add .
git commit -m "Initial commit from Soames starter"
git push -u origin main
```

Now you're ready to customize your new site using the Soames theme!