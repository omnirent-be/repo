import { useEffect, useRef } from 'react';

import { isPubliclyPresentableListing } from '../util/testListings';

// A results page can legitimately end up near-empty after SearchResultsPanel
// filters out test/placeholder listings (see testListings.js's
// isPubliclyPresentableListing) - the API's own page size (e.g. 24) counts
// raw listings, not ones that pass that bar, and in a catalog where test
// data is still a large share of everything, a single API page can be
// almost entirely filtered away. Rather than showing a near-empty grid
// under a "39 resultaten" heading, this keeps calling onLoadMore (the exact
// same thunk the manual "Load more" button uses, already self-guarding
// against concurrent/out-of-range calls) until either enough presentable
// listings have accumulated or the API itself runs out of pages - bounded
// by pagination.totalPages, so this can never loop more than that many
// times regardless of how much of the catalog is test data.
const TARGET_PRESENTABLE_COUNT = 24;

/**
 * @param {Object} params
 * @param {Array} params.listings - raw (unfiltered) listings currently loaded for this search
 * @param {Object} params.pagination - SearchPage.duck.js's pagination meta ({ page, totalPages, ... })
 * @param {boolean} params.searchInProgress - true during a fresh search (not infinite-scroll)
 * @param {boolean} params.loadMoreInProgress - true while a loadMore request is in flight
 * @param {Function} params.onLoadMore - dispatches loadMoreSearchResults(config)
 */
const useAutoLoadMorePresentableResults = ({
  listings,
  pagination,
  searchInProgress,
  loadMoreInProgress,
  onLoadMore,
}) => {
  // Avoids calling onLoadMore again for the same pagination.page while its
  // response is still in flight - loadMoreInProgress already guards the
  // thunk itself, but it only flips true *after* this effect's dispatch
  // call returns, so without this a fast double-render could still fire
  // two calls for the same page.
  const requestedPageRef = useRef(null);

  useEffect(() => {
    if (searchInProgress || loadMoreInProgress || !pagination) {
      return;
    }
    const hasMore = pagination.page < pagination.totalPages;
    if (!hasMore) {
      return;
    }
    const presentableCount = (listings || []).filter(isPubliclyPresentableListing).length;
    if (presentableCount >= TARGET_PRESENTABLE_COUNT) {
      return;
    }
    if (requestedPageRef.current === pagination.page) {
      return;
    }
    requestedPageRef.current = pagination.page;
    onLoadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, pagination, searchInProgress, loadMoreInProgress]);
};

export default useAutoLoadMorePresentableResults;
