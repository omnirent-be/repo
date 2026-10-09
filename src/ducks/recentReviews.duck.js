import { createAsyncThunk } from '@reduxjs/toolkit';
import { types as sdkTypes } from '../util/sdkLoader';
import { isTestListing, isTestAuthor, hasUsableTitle } from '../util/testListings';
import { formatPostcodeDistrictLabel } from '../util/maps';

const { UUID } = sdkTypes;

const CANDIDATE_LISTINGS = 15;
const REVIEWS_WANTED = 3;

// Real, recent public reviews for the homepage - only ever reviews a renter
// left ABOUT a provider ('ofProvider'; the other direction, 'ofCustomer', is
// a provider rating a renter and isn't meaningful public trust copy here),
// only 'public' state, and never from a test listing/author (see
// util/testListings.js). The caller (HomepageReviewsSection.js) renders
// nothing at all when this comes up empty - no fabricated reviews, ever.
//
// Every review in Sharetribe's system is only ever created via a
// transaction transition (reviewRating/reviewContent params on a real
// completed/in-progress transaction - see TransactionPage.js), so every
// review returned here is inherently tied to a real booking. A "Geverifieerde
// boeking" badge can be shown unconditionally on each one.
//
// There is no marketplace-wide "all reviews" query: `sdk.reviews.query`
// rejects a request with no `listing_id`/`subject_id` scope
// (validation-invalid-params / too-many-parameters, confirmed live) and
// `listing_id` only accepts a single UUID, not a list - so this fetches a
// batch of recent real listings first, then queries each one's reviews in
// parallel and merges the results. More API calls than a single query would
// be, but bounded (CANDIDATE_LISTINGS) and only run once per homepage load.
export const fetchRecentReviewsThunk = createAsyncThunk(
  'recentReviews/fetch',
  (_, { extra: sdk }) => {
    return sdk.listings
      .query({
        perPage: CANDIDATE_LISTINGS,
        page: 1,
        sort: '-createdAt',
        'fields.listing': ['title', 'metadata.isTest', 'publicData.location'],
      })
      .then(response => {
        const listings = response.data.data.filter(
          listing => hasUsableTitle(listing) && !isTestListing(listing)
        );

        return Promise.all(
          listings.map(listing =>
            sdk.reviews
              .query({
                listing_id: new UUID(listing.id.uuid),
                state: 'public',
                include: ['author'],
              })
              .then(reviewResponse => {
                const included = reviewResponse.data.included || [];
                return reviewResponse.data.data
                  .filter(review => review.attributes?.type === 'ofProvider')
                  .map(review => {
                    const authorId = review.relationships?.author?.data?.id?.uuid;
                    const author = included.find(
                      inc => inc.type === 'user' && inc.id.uuid === authorId
                    );
                    return {
                      id: review.id.uuid,
                      rating: review.attributes?.rating,
                      content: review.attributes?.content,
                      createdAt: review.attributes?.createdAt,
                      authorName: author?.attributes?.profile?.displayName,
                      listingTitle: listing.attributes?.title,
                      district: formatPostcodeDistrictLabel(
                        listing.attributes?.publicData?.location
                      ),
                      usable: !!author && !isTestAuthor(author),
                    };
                  });
              })
              .catch(() => [])
          )
        );
      })
      .then(resultsPerListing => {
        const allReviews = resultsPerListing.flat();
        return allReviews
          .filter(review => review.usable && review.rating && review.content && review.authorName)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, REVIEWS_WANTED);
      })
      .catch(() => []);
  }
);
