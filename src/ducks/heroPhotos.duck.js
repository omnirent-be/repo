import { createAsyncThunk } from '@reduxjs/toolkit';
import { createImageVariantConfig } from '../util/sdkLoader';
import { isTestListing, hasUsableTitle } from '../util/testListings';

// Like homepageRows.duck.js's ROW_FETCH_COUNT: on a catalog where "good"
// listings (real photo + price + title, not test data) are a minority of
// what's been created, looking only at the handful most-recent ones can
// come up with zero usable candidates even though plenty exist overall -
// so this fetches the API's max page size to search through instead.
const CANDIDATE_COUNT = 100;
const PHOTOS_WANTED = 5;
const VARIANT = 'hero-photo';

// Real photos from real, recent listings for the homepage hero - instead of
// one fixed stock-style photo. Falls back to an empty array (caller keeps
// its own static fallback image) if nothing has a usable photo yet, which
// can happen early on when few listings have uploaded images.
//
// Listings the operator explicitly approved for the hero - set via the
// "Toon op homepage" metadata field in Console - are preferred (and get
// the "Uitgelicht" badge) when any exist, since that's a deliberate
// curation signal. But requiring it isn't realistic before an operator has
// actually gone through and flagged listings one by one, so this doesn't
// hard-filter on it: it fetches ordinary recent, real listings and simply
// sorts any curated ones first.
const fetchCandidates = (sdk, params) =>
  sdk.listings
    .query(params)
    .then(response => ({ data: response.data.data, included: response.data.included || [] }))
    .catch(() => ({ data: [], included: [] }));

export const fetchHeroPhotosThunk = createAsyncThunk(
  'heroPhotos/fetch',
  async ({ aspectRatio = 1 } = {}, { extra: sdk }) => {
    const baseParams = {
      sort: '-createdAt',
      perPage: CANDIDATE_COUNT,
      include: ['images'],
      'fields.listing': [
        'title',
        'price',
        'metadata.isTest',
        'metadata.featuredOnHomepage',
        'publicData.listingType',
        'publicData.unitType',
        'publicData.transactionProcessAlias',
      ],
      'fields.image': ['variants.hero-photo', 'variants.hero-photo-2x'],
      'limit.images': 1,
      // Requested at the same aspect ratio the hero frame actually renders
      // at (matching the site-wide listing image ratio), instead of a
      // fixed square - so the server crop and the CSS `object-fit: cover`
      // crop agree, and photos aren't cropped twice.
      ...createImageVariantConfig(VARIANT, 1200, aspectRatio),
      ...createImageVariantConfig(`${VARIANT}-2x`, 2000, aspectRatio),
    };

    const { data, included } = await fetchCandidates(sdk, baseParams);

    const usable = data
      .map(listing => {
        const imageRef = listing.relationships?.images?.data?.[0];
        const image = included.find(
          inc => inc.type === 'image' && inc.id.uuid === imageRef?.id?.uuid
        );
        const variant = image?.attributes?.variants?.[VARIANT];
        const variant2x = image?.attributes?.variants?.[`${VARIANT}-2x`];
        const title = listing.attributes?.title || '';
        const price = listing.attributes?.price || null;
        const isUsable = variant && hasUsableTitle(listing) && price && !isTestListing(listing);
        return isUsable
          ? {
              id: listing.id.uuid,
              url: variant.url,
              url2x: variant2x?.url,
              alt: title,
              price,
              publicData: listing.attributes?.publicData || {},
              isFeatured: listing.attributes?.metadata?.featuredOnHomepage === 'yes',
            }
          : null;
      })
      .filter(Boolean);

    const featuredFirst = [...usable].sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    return featuredFirst.slice(0, PHOTOS_WANTED);
  }
);
