import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as log from '../util/log';
import { storableError } from '../util/errors';
import { addMarketplaceEntities } from './marketplaceData.duck';
import { createImageVariantConfig } from '../util/sdkLoader';
import { hasUsableTitle } from '../util/testListings';

const ROW_LISTING_COUNT = 8;
// Sharetribe's search API has no "has images"/"has price" filter to query
// server-side, so this over-fetches and filters client-side instead - this
// is the production-facing "Populair voor feesten in Gent" grid, so a card
// with no photo, no price or a one-letter title (looks broken) is dropped
// rather than shown. Fetches the API's max page size rather than a small
// multiple of ROW_LISTING_COUNT - on a catalog where "good" listings (real
// photo + price + title) are a minority of what's been created, a small
// over-fetch can come up short of 8 even though enough exist overall,
// leaving a half-empty row.
const ROW_FETCH_COUNT = 100;

// Picks up to ROW_LISTING_COUNT listings with good category spread, rather
// than just the N most recent - a visitor should see the breadth of the
// marketplace on the one homepage grid, not (for example) 8 tents in a row
// just because that category happened to get a recent batch of listings.
// Round-robins one listing per subcategory at a time (each group keeping
// its own recency order), then tops up with whatever's left over if there
// aren't enough distinct subcategories to fill every slot.
export const diversifyByCategory = (listings, categoryField, count) => {
  const groups = new Map();
  const order = [];
  listings.forEach(listing => {
    const key = listing.attributes?.publicData?.[categoryField] || 'none';
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(listing);
  });

  const picked = [];
  let round = 0;
  while (picked.length < count) {
    let addedThisRound = false;
    for (const key of order) {
      const group = groups.get(key);
      if (group[round]) {
        picked.push(group[round]);
        addedThisRound = true;
        if (picked.length === count) {
          break;
        }
      }
    }
    if (!addedThisRound) {
      break;
    }
    round += 1;
  }
  return picked;
};

export const fetchHomepageRow = createAsyncThunk(
  'homepageRows/fetchHomepageRow',
  async (
    { rowId, searchParams, listingImageConfig, diversify, categoryField },
    { extra: sdk, dispatch, rejectWithValue }
  ) => {
    const { aspectWidth = 1, aspectHeight = 1, variantPrefix = 'listing-card' } = listingImageConfig;
    const aspectRatio = aspectHeight / aspectWidth;

    try {
      const response = await sdk.listings.query({
        ...searchParams,
        perPage: ROW_FETCH_COUNT,
        page: searchParams.page || 1,
        minStock: 1,
        stockMode: 'match-undefined',
        include: ['images', 'author'],
        'fields.listing': [
          'title',
          'geolocation',
          'price',
          'deleted',
          'state',
          'publicData.listingType',
          'publicData.transactionProcessAlias',
          'publicData.unitType',
          'publicData.cardStyle',
          'publicData.pickupEnabled',
          'publicData.shippingEnabled',
          'publicData.priceVariationsEnabled',
          'publicData.priceVariants',
          `publicData.${categoryField}`,
        ],
        'fields.user': ['profile.displayName', 'metadata.isTest'],
        'fields.image': [
          'variants.listing-card',
          'variants.listing-card-2x',
          'variants.scaled-small',
          'variants.scaled-medium',
        ],
        ...createImageVariantConfig(variantPrefix, 400, aspectRatio),
        ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
        'limit.images': 1,
      });
      dispatch(addMarketplaceEntities(response));
      const goodListings = response.data.data.filter(
        listing =>
          listing.relationships?.images?.data?.length > 0 &&
          listing.attributes?.price != null &&
          hasUsableTitle(listing)
      );
      const listings = diversify
        ? diversifyByCategory(goodListings, categoryField, ROW_LISTING_COUNT)
        : goodListings.slice(0, ROW_LISTING_COUNT);
      const totalCount = response.data.meta?.totalItems ?? listings.length;
      return { rowId, ids: listings.map(l => l.id), totalCount };
    } catch (error) {
      log.error(error, 'homepage-row-fetch-failed', { rowId });
      return rejectWithValue({ rowId, error: storableError(error) });
    }
  }
);

const homepageRowsSlice = createSlice({
  name: 'homepageRows',
  initialState: { rows: {} },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchHomepageRow.pending, (state, action) => {
        const { rowId } = action.meta.arg;
        state.rows[rowId] = { ids: [], inProgress: true, fetched: false, error: null };
      })
      .addCase(fetchHomepageRow.fulfilled, (state, action) => {
        const { rowId, ids, totalCount } = action.payload;
        state.rows[rowId] = { ids, totalCount, inProgress: false, fetched: true, error: null };
      })
      .addCase(fetchHomepageRow.rejected, (state, action) => {
        const { rowId } = action.meta.arg;
        state.rows[rowId] = {
          ids: [],
          inProgress: false,
          fetched: true,
          error: action.payload?.error || true,
        };
      });
  },
});

export default homepageRowsSlice.reducer;
