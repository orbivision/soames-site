import React from 'react';
import { useStaticQuery, graphql } from "gatsby";
import { Helmet } from "react-helmet";
import Header from 'soames-gatsby-theme/src/components/header';
import Footer from 'soames-gatsby-theme/src/components/footer';

// Import the full theme CSS (previously loaded by the theme's Layout)
import 'soames-gatsby-theme/src/styles/theme.css';
import '../../styles/overrides.css';

interface LayoutProps {
  children: React.ReactNode;
  isHomePage?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, isHomePage = false }) => {
  const data = useStaticQuery(graphql`
    query StarterLayoutQuery {
      wp {
        generalSettings {
          title
        }
      }
      soamesSettings {
        faviconUrl
        contactBlurb
      }
    }
  `);

  const siteTitle = data.wp?.generalSettings?.title || 'Site Title';
  const faviconUrl = data.soamesSettings?.faviconUrl ?? null;
  const contactBlurb = data.soamesSettings?.contactBlurb ?? null;

  return (
    <div className="global-wrapper" data-is-root-path={isHomePage}>
      <Helmet>
        {faviconUrl && (
          <link rel="icon" href={faviconUrl} type="image/png" />
        )}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300;0,400;0,500;0,700;0,900;1,300;1,400;1,500;1,700;1,900&display=swap"
        />
      </Helmet>
      <Header title={siteTitle} isHomePage={isHomePage} />
      <main>
        {children}
        <Footer title={siteTitle} contactBlurb={contactBlurb} />
      </main>
    </div>
  );
};

export default Layout;
