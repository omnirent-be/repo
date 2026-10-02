import { createAsyncThunk } from '@reduxjs/toolkit';
import { createImageVariantConfig } from '../util/sdkLoader';
import { isTestListing, hasUsableTitle } from '../util/testListings';

const CANDIDATE_COUNT = 8;
const PHOTOS_WANTED = 5;
const VARIANT = 'hero-photo';

// Real photos from real, recent listings for the homepage hero - instead of
// one fixed stock-style photo. Falls back to an empty array (caller keeps
// its own static fallback image) if nothing has a usable photo yet, which
// can happen early on when few listings have uploaded images.
export const fetchHeroPhotosThunk = createAsyncThunk(
  'heroPhotos/fetch',
  ({ aspectRatio = 1 } = {}, { extra: sdk }) => {
    return sdk.listings
      .query({
        sort: '-createdAt',
        perPage: CANDIDATE_COUNT,
        // Only listings the operator explicitly approved for the homepage -
        // set via the "Toon op homepage" metadata field in Console. This
        // keeps arbitrary provider photos (promo flyers, low quality, etc.)
        // out of the hero.
        meta_featuredOnHomepage: 'yes',
        include: ['images'],
        'fields.listing': [
          'title',
          'price',
          'metadata.isTest',
          'publicData.listingType',
          'publicData.unitType',
          'publicData.transactionProcessAlias',
        ],
        'fields.image': ['variants.hero-photo', 'variants.hero-photo-2x'],
        'limit.images': 1,
        // Requested at the same aspect ratio the hero frame actually
        // renders at (matching the site-wide listing image ratio), instead
        // of a fixed square - so the server crop and the CSS `object-fit:
        // cover` crop agree, and photos aren't cropped twice.
        ...createImageVariantConfig(VARIANT, 1200, aspectRatio),
        ...createImageVariantConfig(`${VARIANT}-2x`, 2000, aspectRatio),
      })
      .then(response => {
        const included = response.data.included || [];
        return response.data.data
          .map(listing => {
            const imageRef = listing.relationships?.images?.data?.[0];
            const image = included.find(
              inc => inc.type === 'image' && inc.id.uuid === imageRef?.id?.uuid
            );
            const variant = image?.attributes?.variants?.[VARIANT];
            const variant2x = image?.attributes?.variants?.[`${VARIANT}-2x`];
            const title = listing.attributes?.title || '';
            const price = listing.attributes?.price || null;
            const isUsable =
              variant && hasUsableTitle(listing) && price && !isTestListing(listing);
            return isUsable
              ? {
                  id: listing.id.uuid,
                  url: variant.url,
                  url2x: variant2x?.url,
                  alt: title,
                  price,
                  publicData: listing.attributes?.publicData || {},
                }
              : null;
          })
          .filter(Boolean)
          .slice(0, PHOTOS_WANTED);
      })
      .catch(() => []);
  }
);
