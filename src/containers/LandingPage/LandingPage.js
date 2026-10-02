import React from 'react';
import loadable from '@loadable/component';

import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useIntl } from '../../util/reactIntl';
import { camelize } from '../../util/string';
import { propTypes } from '../../util/types';

import FallbackPage from './FallbackPage';
import { ASSET_NAME } from './LandingPage.duck';
import { fetchFeaturedListings } from '../../ducks/featuredListings.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';
import { getFeaturedListingsProps } from '../../util/data';
import LandingPageHero from './LandingPageHero/LandingPageHero';
import AccountSetupChecklist from './AccountSetupChecklist/AccountSetupChecklist';
import HomepageListingRows from './HomepageListingRows/HomepageListingRows';
import HomepageCategorySlider from './HomepageCategorySlider/HomepageCategorySlider';
// HomepageStorySection, HomepageHowItWorksSection, HomepagePartyCalculator
// and HomepageEarningsCalculator used to render here too - deliberately
// removed from the homepage (not deleted) to keep the page to search ->
// categories -> offer. Re-import them if/when they get their own subpage
// (e.g. /hoe-het-werkt, /over-ons, /verhuren).

const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

export const LandingPageComponent = props => {
  const { pageAssetsData, inProgress, error } = props;

  const intl = useIntl();
  const data = pageAssetsData?.[camelize(ASSET_NAME)]?.data;
  const metaTitle = intl.formatMessage({ id: 'LandingPage.metaTitle' });
  const metaDescription = intl.formatMessage({ id: 'LandingPage.metaDescription' });
  // The hosted "hero", "how it works" and "listings" sections are all
  // filtered out: hero and listings are replaced by the code-defined
  // LandingPageHero/HomepageListingRows (mainContentPrepend below), and
  // "how it works" is deliberately not shown on the homepage at all
  // anymore (see the import comment above) - still filtered here so the
  // hosted fallback can't reappear. It has no explicit sectionId set in
  // Console (it's blank), so it's matched by sectionType ('columns')
  // instead - the only 'columns' section on this page.
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
          {/* 1. Hero (koptekst + zoekmodule + visual) */}
          <LandingPageHero />
          {/* 2. Categoriebalk */}
          <HomepageCategorySlider />
          {/* 3. HET AANBOD - the main body of the page. FeaturedListings
              ("Populair in regio Gent") + RecentListings ("Nieuw toegevoegd
              in de buurt"), both real listings. PartyCalculator,
              HowItWorks, EarningsCalculator and the "Ons verhaal"/trust
              story section (HomepageStorySection) are deliberately not
              rendered here anymore - per the decision to strip the
              homepage down to search -> categories -> offer, matching
              Airbnb/Vinted. Those components still exist (imports removed
              below, not the files) and can be placed on their own
              subpages (/hoe-het-werkt, /over-ons, /verhuren) later. */}
          <HomepageListingRows />
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
