import { createAsyncThunk } from '@reduxjs/toolkit';
import { isTestListing, isTestAuthor, hasUsableTitle } from '../util/testListings';

const CANDIDATE_COUNT = 20;
const ITEMS_WANTED = 10;

// Real, recent listing activity for the homepage's activity ticker - only
// ever real listings from real authors (see util/testListings.js), never
// invented events. The caller (LandingPageHero.js) falls back to its own
// clearly-generic copy when this comes up short, rather than show a ticker
// with only 1-2 real items.
export const fetchRecentActivityThunk = createAsyncThunk(
  'recentActivity/fetch',
  (_, { extra: sdk }) => {
    return sdk.listings
      .query({
        perPage: CANDIDATE_COUNT,
        page: 1,
        sort: '-createdAt',
        include: ['author'],
        'fields.listing': ['title', 'createdAt', 'metadata.isTest'],
        'fields.user': ['profile.displayName', 'metadata.isTest'],
      })
      .then(response => {
        const included = response.data.included || [];
        return response.data.data
          .map(listing => {
            const authorId = listing.relationships?.author?.data?.id?.uuid;
            const author = included.find(inc => inc.type === 'user' && inc.id.uuid === authorId);
            return {
              id: listing.id.uuid,
              title: listing.attributes?.title,
              authorName: author?.attributes?.profile?.displayName,
              createdAt: listing.attributes?.createdAt,
              usable:
                hasUsableTitle(listing) && !isTestListing(listing) && !isTestAuthor(author),
            };
          })
          .filter(item => item.usable && item.authorName)
          .slice(0, ITEMS_WANTED);
      })
      .catch(() => []);
  }
);
