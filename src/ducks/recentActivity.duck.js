import { createAsyncThunk } from '@reduxjs/toolkit';
import { isTestListing, isTestAuthor } from '../util/testListings';

const RECENT_ACTIVITY_COUNT = 6;
// Fetch extra so that filtering out test listings (see isTest below) still
// leaves enough real ones to fill the ticker.
const FETCH_COUNT = RECENT_ACTIVITY_COUNT * 4;

// Shows real recent listings in the Topbar's activity ticker (e.g. "Jan
// heeft net 'Partytent 6x10m' geplaatst"). Public read-only data only -
// listing titles and author display names are already public on listing
// pages, so this exposes nothing new.
//
// Test/seed listings are excluded via isTestListing() (see util/testListings.js -
// shared with homepageRows.duck.js and heroPhotos.duck.js).
export const fetchRecentActivityThunk = createAsyncThunk(
  'recentActivity/fetch',
  (_, { extra: sdk }) => {
    return sdk.listings
      .query({
        sort: '-createdAt',
        perPage: FETCH_COUNT,
        include: ['author'],
        'fields.listing': ['title', 'metadata.isTest'],
        'fields.user': ['profile.displayName', 'metadata.isTest'],
      })
      .then(response => {
        const included = response.data.included || [];
        return response.data.data
          .map(listing => {
            const authorRef = listing.relationships?.author?.data;
            const author = included.find(
              inc => inc.type === 'user' && inc.id.uuid === authorRef?.id?.uuid
            );
            return {
              id: listing.id.uuid,
              title: listing.attributes.title,
              authorName: author?.attributes?.profile?.displayName,
              isTest: isTestListing(listing) || isTestAuthor(author),
            };
          })
          .filter(item => item.authorName && item.title && !item.isTest)
          .slice(0, RECENT_ACTIVITY_COUNT);
      })
      .catch(() => []);
  }
);
