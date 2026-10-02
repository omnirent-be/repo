import { createAsyncThunk } from '@reduxjs/toolkit';

// A real, live count of active listings, shown as a small trust badge on the
// homepage hero (e.g. "195 advertenties in België"). Fetched with the
// smallest possible query (perPage 1, no extra fields) - the API returns the
// total match count in the response meta regardless of page size, so this is
// cheap. Never falls back to a made-up number: if the request fails, the
// caller gets null and simply doesn't render the badge.
export const fetchListingsCountThunk = createAsyncThunk(
  'listingsCount/fetch',
  (_, { extra: sdk }) => {
    return sdk.listings
      .query({ perPage: 1, page: 1, 'fields.listing': ['title'] })
      .then(response => response.data.meta?.totalItems ?? null)
      .catch(() => null);
  }
);
