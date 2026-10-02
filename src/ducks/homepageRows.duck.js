import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as log from '../util/log';
import { storableError } from '../util/errors';
import { addMarketplaceEntities } from './marketplaceData.duck';
import { createImageVariantConfig } from '../util/sdkLoader';
import { isTestListing, hasUsableTitle, isTestAuthor } from '../util/testListings';

const ROW_LISTING_COUNT = 8;
// Sharetribe's search API has no "has images"/"has price"/"is test" filter
// to query server-side, so this over-fetches and filters client-side
// instead (same pattern as recentActivity.duck.js's test-listing
// filtering) - a homepage row card with no photo, no price, a one-letter
// title, or test/seed data looks broken and kills trust, so those are
// dropped rather than shown.
const ROW_FETCH_COUNT = ROW_LISTING_COUNT * 3;

export const fetchHomepageRow = createAsyncThunk(
  'homepageRows/fetchHomepageRow',
  async ({ rowId, searchParams, listingImageConfig }, { extra: sdk, dispatch, rejectWithValue }) => {
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
          'metadata.isTest',
          'publicData.listingType',
          'publicData.transactionProcessAlias',
          'publicData.unitType',
          'publicData.cardStyle',
          'publicData.pickupEnabled',
          'publicData.shippingEnabled',
          'publicData.priceVariationsEnabled',
          'publicData.priceVariants',
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
      const included = response.data.included || [];
      const trustworthyListings = response.data.data
        .filter(listing => {
          const authorRef = listing.relationships?.author?.data;
          const author = included.find(
            inc => inc.type === 'user' && inc.id.uuid === authorRef?.id?.uuid
          );
          return (
            listing.relationships?.images?.data?.length > 0 &&
            listing.attributes?.price != null &&
            hasUsableTitle(listing) &&
            !isTestListing(listing) &&
            !isTestAuthor(author)
          );
        })
        .slice(0, ROW_LISTING_COUNT);
      return { rowId, ids: trustworthyListings.map(l => l.id) };
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
        const { rowId, ids } = action.payload;
        state.rows[rowId] = { ids, inProgress: false, fetched: true, error: null };
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
