import React, { useEffect, useState } from 'react';
import loadable from '@loadable/component';

import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useIntl } from '../../util/reactIntl';
import { camelize } from '../../util/string';
import { propTypes } from '../../util/types';
import { trackEvent } from '../../util/analytics';

import FallbackPage from './FallbackPage';
import { ASSET_NAME } from './LandingPage.duck';
import { fetchFeaturedListings } from '../../ducks/featuredListings.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';
import { getFeaturedListingsProps } from '../../util/data';
import LandingPageHero from './LandingPageHero/LandingPageHero';
import AccountSetupChecklist from './AccountSetupChecklist/AccountSetupChecklist';
import HomepageListingRows from './HomepageListingRows/HomepageListingRows';
import HomepageCategorySlider from './HomepageCategorySlider/HomepageCategorySlider';
import HomepageTrustSteps from './HomepageTrustSteps/HomepageTrustSteps';
import HomepageReviewsSection from './HomepageReviewsSection/HomepageReviewsSection';
import HomepageProviderSection from './HomepageProviderSection/HomepageProviderSection';
// HomepagePartyCalculator, HomepageEarningsCalculator, HomepageHowItWorksSection
// and HomepageStorySection used to render here too - not shown on the
// homepage for now, to keep the page compact (just the compact 3-step bar
// below the offer, files still exist, not deleted).

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

export const LandingPageComponent = props => {
  const { pageAssetsData, inProgress, error } = props;

  // Lifted here (rather than owned by HomepageListingRows) since the
  // category bar and the product grid are separate components that both
  // need it - the bar sets it, the grid reads it.
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    trackEvent('homepage_view');
  }, []);

  const intl = useIntl();
  const data = pageAssetsData?.[camelize(ASSET_NAME)]?.data;
  const metaTitle = intl.formatMessage({ id: 'LandingPage.metaTitle' });
  const metaDescription = intl.formatMessage({ id: 'LandingPage.metaDescription' });
  // The hosted "hero", "how it works" and "listings" sections are all
  // filtered out: hero and listings are replaced by the code-defined
  // LandingPageHero/HomepageListingRows (mainContentPrepend below), and
  // "how it works" is not shown on the homepage at all right now - still
  // filtered here so the hosted fallback can't reappear. It has no explicit
  // sectionId set in Console (it's blank), so it's matched by sectionType
  // ('columns') instead - the only 'columns' section on this page.
  const dataWithoutHostedSections = data
    ? {
        ...data,
        // The hosted meta still holds Console placeholders ("Home Page",
        // "Change Me ..."), which show up in Google and link previews.
        meta: {
          ...data.meta,
          pageTitle: { ...data.meta?.pageTitle, content: metaTitle },
          pageDescription: { ...data.meta?.pageDescription, content: metaDescription },
          socialSharing: {
            ...data.meta?.socialSharing,
            title: metaTitle,
            description: metaDescription,
          },
        },
        sections: (data.sections || []).filter(
          section =>
            section.sectionId !== 'hero' &&
            section.sectionType !== 'columns' &&
            section.sectionType !== 'listings'
        ),
      }
    : data;

  return (
    <PageBuilder
      pageAssetsData={dataWithoutHostedSections}
      inProgress={inProgress}
      error={error}
      fallbackPage={<FallbackPage error={error} />}
      featuredListings={getFeaturedListingsProps(camelize(ASSET_NAME), props)}
      mainContentPrepend={
        <>
          {/* 1. Hero (koptekst + zoekmodule + visual) + Social Proof Ticker
              (rendered inside LandingPageHero, right below the hero) */}
          <LandingPageHero />
          {/* 2. Categoriebalk - filtert het grid hieronder via client state,
              geen page reload (zie selectedCategory hierboven) */}
          <HomepageCategorySlider selected={selectedCategory} onSelect={setSelectedCategory} />
          {/* 3. "Populair voor feesten in Gent" - strak 2x4-grid i.p.v. de
              eerdere losse carrousels per categorie */}
          <HomepageListingRows categoryFilter={selectedCategory} />
          {/* 4. "Zo werkt huren" - de 4 echte stappen van de request-to-book flow */}
          <HomepageTrustSteps />
          {/* 5. Echte, publieke reviews - rendert niets zolang er nog geen
              echte zijn (zie recentReviews.duck.js), nooit verzonnen quotes. */}
          <HomepageReviewsSection />
          {/* 6. Aparte, volwaardige route voor de aanbodzijde (verhuurders) -
              niet langer gelijkwaardig met de huurdersflow bovenaan, maar
              een eigen sectie met het echte voordeel en een duidelijke CTA. */}
          <HomepageProviderSection />
          {/* Profile-completion nudge - only ever shown to an authenticated
              user with an incomplete profile, so it never displaces listings
              for the anonymous visitors this order is optimized for. */}
          <AccountSetupChecklist />
        </>
      }
    />
  );
};

LandingPageComponent.propTypes = {
  pageAssetsData: object,
  inProgress: bool,
  error: propTypes.error,
};

const mapStateToProps = state => {
  const { pageAssetsData, inProgress, error } = state.hostedAssets || {};
  const featuredListingData = state.featuredListings || {};

  const getListingEntitiesById = listingIds => getListingsById(state, listingIds);

  return { pageAssetsData, featuredListingData, getListingEntitiesById, inProgress, error };
};

const mapDispatchToProps = dispatch => ({
  onFetchFeaturedListings: (sectionId, parentPage, listingImageConfig, allSections) =>
    dispatch(fetchFeaturedListings({ sectionId, parentPage, listingImageConfig, allSections })),
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const LandingPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(LandingPageComponent);

export default LandingPage;
