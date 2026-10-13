import { fetchHomepageRow } from '../../ducks/homepageRows.duck';

export const RENTAL_PAGE_LISTING_COUNT = 12;
const DEFAULT_SORT = 'createdAt';

/**
 * Row ids for the two listing rows of a rental landing page. The rows live in the
 * shared `homepageRows` slice, so they are keyed per page.
 *
 * @param {string} pageId
 * @returns {{mainRowId: string, moreRowId: string}}
 */
export const getRentalRowIds = pageId => ({
  mainRowId: `rental:${pageId}`,
  moreRowId: `rental:${pageId}:more`,
});

/**
 * Creates a route `loadData` function for one rental landing page (for example
 * "springkasteel huren in Temse"). It fetches the page's listings, plus the optional
 * fallback listings that fill the page when only a few listings match exactly.
 * It runs on the server for SSR and on the client when navigating to the page.
 *
 * @param {Object} page entry of `rentalPages` in `src/util/rentalPages.js`
 * @returns {Function} (params, search, config) => thunk
 */
export const createLoadData = page => (params, search, config) => dispatch => {
  const categoryKey = config?.categoryConfiguration?.key || 'categoryLevel';
  const categoryField = `${categoryKey}2`;
  const listingImageConfig = config?.layout?.listingImage || {};
  const { mainRowId, moreRowId } = getRentalRowIds(page.id);

  const mainRequest = dispatch(
    fetchHomepageRow({
      rowId: mainRowId,
      searchParams: { sort: DEFAULT_SORT, ...page.query },
      listingImageConfig,
      diversify: !!page.diversify,
      categoryField,
      count: RENTAL_PAGE_LISTING_COUNT,
      titlePattern: page.titlePattern,
    })
  );

  const moreRequest = page.fallbackQuery
    ? dispatch(
        fetchHomepageRow({
          rowId: moreRowId,
          searchParams: { sort: DEFAULT_SORT, ...page.fallbackQuery },
          listingImageConfig,
          diversify: false,
          categoryField,
          count: RENTAL_PAGE_LISTING_COUNT,
        })
      )
    : Promise.resolve();

  return Promise.all([mainRequest, moreRequest]);
};
