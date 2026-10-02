import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../../util/errors';
import { createImageVariantConfig } from '../../util/sdkLoader';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { fetchCurrentUser, getFavoriteListingIds } from '../../ducks/user.duck';

// ================ Async Thunks ================ //

const queryFavoriteListingsPayloadCreator = (
  listingIds,
  { extra: sdk, dispatch, rejectWithValue }
) => {
  if (!listingIds || listingIds.length === 0) {
    return Promise.resolve({ data: { data: [] } });
  }

  return sdk.listings
    .query({
      ids: listingIds,
      include: ['author', 'author.profileImage', 'images'],
      'fields.listing': ['title', 'price', 'publicData', 'state'],
      'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'profile.publicData'],
      'fields.image': ['variants.listing-card', 'variants.listing-card-2x'],
      ...createImageVariantConfig('listing-card', 400, 1),
      ...createImageVariantConfig('listing-card-2x', 800, 1),
      'limit.images': 1,
    })
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      return response;
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const queryFavoriteListingsThunk = createAsyncThunk(
  'app/FavoriteListingsPage/queryFavoriteListings',
  queryFavoriteListingsPayloadCreator
);

// Backward compatible wrapper for the thunk
export const queryFavoriteListings = listingIds => (dispatch, getState, sdk) => {
  return dispatch(queryFavoriteListingsThunk(listingIds)).unwrap();
};

// ================ Slice ================ //

const resultIds = data => data.data.map(l => l.id);

const favoriteListingsPageSlice = createSlice({
  name: 'FavoriteListingsPage',
  initialState: {
    currentPageResultIds: [],
    queryInProgress: false,
    queryListingsError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(queryFavoriteListingsThunk.pending, state => {
        state.queryInProgress = true;
        state.queryListingsError = null;
      })
      .addCase(queryFavoriteListingsThunk.fulfilled, (state, action) => {
        state.currentPageResultIds = resultIds(action.payload.data);
        state.queryInProgress = false;
      })
      .addCase(queryFavoriteListingsThunk.rejected, (state, action) => {
        console.error(action.payload || action.error);
        state.queryInProgress = false;
        state.queryListingsError = action.payload;
      });
  },
});

export default favoriteListingsPageSlice.reducer;

// ================ Load data ================ //

export const loadData = () => (dispatch, getState, sdk) => {
  return dispatch(fetchCurrentUser()).then(currentUser => {
    const favoriteListingIds = getFavoriteListingIds(currentUser);
    return dispatch(queryFavoriteListings(favoriteListingIds));
  });
};
