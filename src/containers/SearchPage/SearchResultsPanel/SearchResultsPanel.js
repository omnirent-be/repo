import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import { ListingCard, IconSpinner } from '../../../components';
import useVisitorPosition from '../../../hooks/useVisitorPosition';

import css from './SearchResultsPanel.module.css';

/**
 * SearchResultsPanel component
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that extends the default class for the root element
 * @param {Array<propTypes.listing>} props.listings - The listings
 * @param {propTypes.pagination} props.pagination - The pagination
 * @param {Function} props.setActiveListing - The function to handle the active listing
 * @param {boolean} [props.isMapVariant] - Whether the map variant is enabled
 * @param {propTypes.currentUser} [props.currentUser] - Pass together with onToggleFavoriteListing to show favorite buttons on the cards
 * @param {Array<string>} [props.favoriteListingIds] - Listing ids currentUser has favorited
 * @param {Function} [props.onToggleFavoriteListing] - (listingId) => Promise
 * @param {string} [props.favoriteListingIdInProgress] - the listing id currently being toggled
 * @param {Function} [props.onLoadMore] - Called (with no args) when the "load more" button is clicked, to fetch the next page of results
 * @param {boolean} [props.loadMoreInProgress] - Whether the next page is currently being fetched
 * @returns {JSX.Element}
 */
const SearchResultsPanel = props => {
  const {
    className,
    rootClassName,
    listings = [],
    pagination,
    setActiveListing,
    isMapVariant = true,
    currentUser,
    favoriteListingIds = [],
    onToggleFavoriteListing,
    favoriteListingIdInProgress,
    onLoadMore,
    loadMoreInProgress = false,
  } = props;
  const classes = classNames(rootClassName || css.root, className);
  const hasMore = !!pagination && pagination.page < pagination.totalPages;
  // Asked once per page load (not per card) - see useVisitorPosition.js.
  const visitorPosition = useVisitorPosition();

  const cardRenderSizes = isMapVariant => {
    if (isMapVariant) {
      // Panel width relative to the viewport
      const panelMediumWidth = 50;
      const panelLargeWidth = 62.5;
      return [
        '(max-width: 767px) 100vw',
        `(max-width: 1023px) ${panelMediumWidth}vw`,
        `(max-width: 1920px) ${panelLargeWidth / 2}vw`,
        `${panelLargeWidth / 3}vw`,
      ].join(', ');
    } else {
      // Panel width relative to the viewport
      const panelMediumWidth = 50;
      const panelLargeWidth = 62.5;
      return [
        '(max-width: 549px) 100vw',
        '(max-width: 767px) 50vw',
        `(max-width: 1439px) 26vw`,
        `(max-width: 1920px) 18vw`,
        `14vw`,
      ].join(', ');
    }
  };

  return (
    <div className={classes}>
      <ul className={isMapVariant ? css.listingCardsMapVariant : css.listingCards}>
        {listings.map(l => (
          <li key={l.id.uuid} className={css.resultItem}>
            <ListingCard
              className={css.listingCard}
              listing={l}
              renderSizes={cardRenderSizes(isMapVariant)}
              setActiveListing={setActiveListing}
              currentUser={currentUser}
              isFavorite={favoriteListingIds.includes(l.id.uuid)}
              onToggleFavoriteListing={onToggleFavoriteListing}
              favoriteListingIdInProgress={favoriteListingIdInProgress}
              visitorPosition={visitorPosition}
            />
          </li>
        ))}
        {props.children}
      </ul>
      {hasMore ? (
        <div className={css.loadMoreRow}>
          <button
            type="button"
            className={css.loadMoreButton}
            onClick={onLoadMore}
            disabled={loadMoreInProgress}
          >
            {loadMoreInProgress ? (
              <>
                <IconSpinner className={css.loadMoreSpinner} />
                <FormattedMessage id="SearchResultsPanel.loadingMore" />
              </>
            ) : (
              <FormattedMessage id="SearchResultsPanel.loadMore" />
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default SearchResultsPanel;
