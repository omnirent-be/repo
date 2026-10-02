import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { makeGetListingsByIdSelector } from '../../ducks/marketplaceData.duck';
import { toggleFavoriteListing, getFavoriteListingIds } from '../../ducks/user.duck';

import { H3, Page, ListingCard, LayoutSingleColumn, NamedLink } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './FavoriteListingsPage.module.css';

/**
 * The FavoriteListingsPage component - shows all listings the current user
 * has saved as favorites (see FavoriteButton / user.duck.js's
 * favoriteListingIds privateData field).
 *
 * @component
 * @returns {JSX.Element}
 */
export const FavoriteListingsPageComponent = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const selectListingsById = useMemo(makeGetListingsByIdSelector, []);

  const currentUser = useSelector(state => state.user?.currentUser);
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));
  const { currentPageResultIds, queryInProgress, queryListingsError } = useSelector(
    state => state.FavoriteListingsPage
  );
  const favoriteListingIdInProgress = useSelector(
    state => state.user?.favoriteListingIdInProgress
  );
  const listings = useSelector(state => selectListingsById(state, currentPageResultIds));

  const onToggleFavoriteListing = listingId => dispatch(toggleFavoriteListing(listingId));

  const favoriteListingIds = getFavoriteListingIds(currentUser);
  const hasFavorites = currentPageResultIds.length > 0;
  const listingsAreLoaded = !queryInProgress && !queryListingsError;

  const panelWidth = 62.5;
  const renderSizes = [
    `(max-width: 767px) 100vw`,
    `(max-width: 1920px) ${panelWidth / 2}vw`,
    `${panelWidth / 3}vw`,
  ].join(', ');

  return (
    <Page
      title={intl.formatMessage({ id: 'FavoriteListingsPage.title' })}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.content}>
          <H3 as="h1" className={css.heading}>
            <FormattedMessage id="FavoriteListingsPage.heading" />
          </H3>

          {queryInProgress ? (
            <p className={css.messagePanel}>
              <FormattedMessage id="FavoriteListingsPage.loading" />
            </p>
          ) : queryListingsError ? (
            <p className={css.messagePanel}>
              <FormattedMessage id="FavoriteListingsPage.queryError" />
            </p>
          ) : listingsAreLoaded && !hasFavorites ? (
            <div className={css.noResultsContainer}>
              <p className={css.noResults}>
                <FormattedMessage id="FavoriteListingsPage.noResults" />
              </p>
              <NamedLink className={css.browseLink} name="SearchPage">
                <FormattedMessage id="FavoriteListingsPage.browseListings" />
              </NamedLink>
            </div>
          ) : (
            <ul className={css.listingCards}>
              {listings.map(l => (
                <li key={l.id.uuid} className={css.listingCard}>
                  <ListingCard
                    listing={l}
                    renderSizes={renderSizes}
                    currentUser={currentUser}
                    isFavorite={favoriteListingIds.includes(l.id.uuid)}
                    onToggleFavoriteListing={onToggleFavoriteListing}
                    favoriteListingIdInProgress={favoriteListingIdInProgress}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default FavoriteListingsPageComponent;
