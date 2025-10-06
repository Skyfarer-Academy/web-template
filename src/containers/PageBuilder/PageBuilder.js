import React, {useEffect, useState} from 'react';
import { useSelector } from 'react-redux';
import { currentUserSelector } from '../../ducks/user.duck.js';
import { useLocation } from 'react-router-dom/cjs/react-router-dom.js';

import { IconSpinner, LayoutComposer } from '../../components/index.js';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer.js';
import FooterContainer from '../FooterContainer/FooterContainer.js';

import { validProps } from './Field';

import SectionBuilder from './SectionBuilder/SectionBuilder.js';
import StaticPage from './StaticPage.js';

import css from './PageBuilder.module.css';

const getMetadata = (meta, schemaType, fieldOptions) => {
  const { pageTitle, pageDescription, socialSharing } = meta;

  // pageTitle is used for <title> tag in addition to page schema for SEO
  const title = validProps(pageTitle, fieldOptions)?.content;
  // pageDescription is used for different <meta> tags in addition to page schema for SEO
  const description = validProps(pageDescription, fieldOptions)?.content;
  // Data used when the page is shared in social media services
  const openGraph = validProps(socialSharing, fieldOptions);
  // We add OpenGraph image as schema image if it exists.
  const schemaImage = openGraph?.images1200?.[0]?.url;
  const schemaImageMaybe = schemaImage ? { image: [schemaImage] } : {};
  const isArticle = ['Article', 'NewsArticle', 'TechArticle'].includes(schemaType);
  const schemaHeadlineMaybe = isArticle ? { headline: title } : {};

  // Schema for search engines (helps them to understand what this page is about)
  // http://schema.org (This template uses JSON-LD format)
  //
  // In addition to this schema data for search engines, src/components/Page/Page.js adds some extra schemas
  // Read more about schema:
  // - https://schema.org/
  // - https://developers.google.com/search/docs/advanced/structured-data/intro-structured-data
  const pageSchemaForSEO = {
    '@context': 'http://schema.org',
    '@type': schemaType || 'WebPage',
    description: description,
    name: title,
    ...schemaHeadlineMaybe,
    ...schemaImageMaybe,
  };

  return {
    title,
    description,
    schema: pageSchemaForSEO,
    socialSharing: openGraph,
  };
};

// Add a bar at the top to display the Monday form link
const AnnouncementBar = () => {
  const [showModal, setShowModal] = useState(false);
  const [ formType, setFormType] = useState(null);

  // Form URLs

  const mondayformlinks = {
    request: "https://forms.monday.com/forms/embed/e84e8aefa14ef0f5d78bccf3a4ab3c75?r=use1",
    question: "https://forms.monday.com/forms/ed66dd220397ba244f5f8263ea14576e?r=use1",
  };

  const openForm = (type) => {
    setFormType(type);
    setShowModal(true);
  };

  return (
    <>
      <div className={css.announcementBar}>
        Concierge:{" "}
        <span className={css.announcementBar1}>
          Need help finding?{" "}
          <span
            className={css.announcementLink}
            onClick={() => openForm("request")}
          >
            Submit your request
          </span>{" "}
          or{" "}
          <span
            className={css.announcementLink}
            onClick={() => openForm("question")}
          >
            ask a question
          </span>
        </span>
      </div>

      {showModal && (
        <div className={css.modalOverlay} onClick={() => setShowModal(false)}>
          <div
            className={css.modalContent}
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <button
              className={css.closeBtn}
              onClick={() => setShowModal(false)}
            >
              &times;
            </button>
            <iframe
              src={mondayformlinks[formType]}
              title={
                formType === "request" ? "Submit Your Request" : "Ask a Question"
              }
            >
            </iframe>
          </div>
        </div>
      )}
    </>
  );
};

const LoadingSpinner = () => {
  return (
    <div className={css.loading}>
      <IconSpinner delay={600} />
    </div>
  );
};

//////////////////
// Page Builder //
//////////////////

/**
 * @typedef {Object} FieldComponentConfig
 * @property {ReactNode} component
 * @property {Function} pickValidProps
 */

/**
 * PageBuilder can be used to build content pages using page-asset.json.
 *
 * Note: props can include a lot of things that depend on
 * - pageAssetsData: json asset that contains instructions how to build the page content
 *   - asset should contain an array of _sections_, which might contain _fields_ and an array of _blocks_
 *     - _blocks_ can also contain _fields_
 * - fallbackPage: component. If asset loading fails, this is used instead.
 * - options: extra mapping of 3 level of sub components
 *   - sectionComponents: { ['my-section-type']: { component: MySection } }
 *   - blockComponents: { ['my-component-type']: { component: MyBlock } }
 *   - fieldComponents: { ['my-field-type']: { component: MyField, pickValidProps: data => Number.isInteger(data.content) ? { content: data.content } : {} }
 *     - fields have this pickValidProps as an extra requirement for data validation.
 * - pageProps: props that are passed to src/components/Page/Page.js component
 *
 * @param {Object} props
 * @param {Object} props.pageAssetsData
 * @param {Array<Object>} props.pageAssetsData.sections
 * @param {Object} props.pageAssetsData.meta
 * @param {Object} props.pageAssetsData.meta.pageTitle
 * @param {Object} props.pageAssetsData.meta.pageDescription
 * @param {Object} props.pageAssetsData.meta.socialSharing
 * @param {boolean?} props.inProgress
 * @param {Object?} props.error
 * @param {ReactNode?} props.fallbackPage
 * @param {string} props.schemaType type from schema.org (e.g. 'Article', 'Website')
 * @param {string?} props.currentPage name of the current page based on route configuration
 * @param {Object} props.options
 * @param {Object<string,FieldComponentConfig>} props.options.fieldComponents custom field components
 * @returns {JSX.Element} page component
 */
const PageBuilder = props => {
  const {
    pageAssetsData,
    inProgress,
    error,
    fallbackPage,
    schemaType,
    options,
    currentPage,
    ...pageProps
  } = props;

  const currentUser = useSelector(currentUserSelector);
  const location = useLocation();

  if (!pageAssetsData && fallbackPage && !inProgress && error) {
    return fallbackPage;
  }

  // Page asset contains UI info and metadata related to it.
  // - "sections" (data that goes inside <body>)
  // - "meta" (which is data that goes inside <head>)
  const { sections = [], meta = {} } = pageAssetsData || {};
  const pageMetaProps = getMetadata(meta, schemaType, options?.fieldComponents);

  const layoutAreas = `
    topbar
    main
    footer
  `;

  const isLoggedOut = !currentUser;
  const isHomePage = location.pathname === '/';

  console.log('DEBUG PageBuilder', {
    currentUser,
    pathname: location.pathname,
    isLoggedOut,
    isHomePage,
  });

  return (
    <StaticPage {...pageMetaProps} {...pageProps}>
      <LayoutComposer areas={layoutAreas} className={css.layout}>
        {props => {
          const { Topbar, Main, Footer } = props;
          return (
            <>
              <Topbar as="header" className={css.topbar}>
                {isLoggedOut && isHomePage ? <AnnouncementBar /> : null}
                <TopbarContainer currentPage={currentPage} />
              </Topbar>
              <Main as="main" className={css.main}>
                {sections.length === 0 && inProgress ? (
                  <LoadingSpinner />
                ) : (
                  <SectionBuilder sections={sections} options={options} />
                )}
              </Main>
              <Footer>
                <FooterContainer />
              </Footer>
            </>
          );
        }}
      </LayoutComposer>
    </StaticPage>
  );
};

export { LayoutComposer, StaticPage, SectionBuilder };

export default PageBuilder;
