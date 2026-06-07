require('dotenv').config({ path: `.env.development` });

console.log("GraphQL URL from .env:", process.env.GATSBY_WORDPRESS_URL);

/** @type {import('gatsby').GatsbyConfig} */
module.exports = {
  siteMetadata: {
    title: 'Soames Gatsby Starter',
  },
  plugins: [
    {
      resolve: 'soames-gatsby-theme',
      options: {
        url: process.env.GATSBY_WORDPRESS_URL,
      },
    },
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    {
      // See https://www.gatsbyjs.com/plugins/gatsby-plugin-manifest/?=gatsby-plugin-manifest
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Soames Gatsby Starter WordPress Blog`,
        short_name: `GatsbyJS & WP`,
        start_url: `/`,
        background_color: `#ffffff`,
        theme_color: `#663399`,
        display: `minimal-ui`,
        icon: `content/assets/gatsby-icon.png`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `assets`,
        path: `content/assets`,
      },
    },
    // See https://www.gatsbyjs.com/plugins/gatsby-plugin-react-helmet/?=gatsby-plugin-react-helmet
    `gatsby-plugin-react-helmet`,
  ],
};