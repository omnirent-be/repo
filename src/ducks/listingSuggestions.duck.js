import { createAsyncThunk } from '@reduxjs/toolkit';

// Live "did you mean this listing" suggestions for the unified search bar's
// product/keyword field (ProductSearchField) - real titles from real,
// published listings, never invented copy. Capped small (5) since this is a
// typeahead dropdown, not a results page.
export const fetchListingSuggestionsThunk = createAsyncThunk(
  'listingSuggestions/fetch',
  ({ keywords }, { extra: sdk }) => {
    return sdk.listings
      .query({ keywords, perPage: 5, page: 1, 'fields.listing': ['title'] })
      .then(response =>
        response.data.data.map(listing => ({
          id: listing.id.uuid,
          title: listing.attributes.title,
        }))
      )
      .catch(() => []);
  }
);
