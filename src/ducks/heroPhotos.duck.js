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

// Hand-picked listings for the hero, shown first and in this order: strong
// real photos, spread over barbecue, kids' entertainment, glamping, photobooth and food.
// If one is unpublished or loses its photo it is skipped and the next
// candidate takes its place. Replace the ids to change the selection.
const CURATED_LISTING_IDS = [
  '6a9ea99a-1f13-4ac2-abe6-fb73f74807c8', // BBQ cortenstaal
  '6aa0633c-7e88-4b43-a4a9-7f72fd6c0780', // Wit springkasteel met ballenbad
  '6a4d74e3-352d-49c8-b289-fdc6027ee7b7', // Luxe Glampingtent met Houten Vloer
  '6abbb208-fa01-4a22-b843-a8447d211296', // photo booth
  '6aa51453-9655-4486-9560-21c98461c3d9', // Foodtruck
];

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
      sort: 'createdAt',
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

    const { sort, ...curatedBaseParams } = baseParams;
    const [curated, candidates] = await Promise.all([
      fetchCandidates(sdk, {
        ...curatedBaseParams,
        ids: CURATED_LISTING_IDS,
        perPage: CURATED_LISTING_IDS.length,
      }),
      fetchCandidates(sdk, baseParams),
    ]);
    const curatedIds = new Set(CURATED_LISTING_IDS);
    const data = [
      ...curated.data,
      ...candidates.data.filter(listing => !curatedIds.has(listing.id.uuid)),
    ];
    const included = [...curated.included, ...candidates.included];

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
              isFeatured:
                curatedIds.has(listing.id.uuid) ||
                listing.attributes?.metadata?.featuredOnHomepage === 'yes',
            }
          : null;
      })
      .filter(Boolean);

    // Curated listings first, in the order of CURATED_LISTING_IDS, then any
    // listings flagged in Console, then the newest ones.
    const rank = photo => {
      const curatedIndex = CURATED_LISTING_IDS.indexOf(photo.id);
      if (curatedIndex !== -1) {
        return curatedIndex;
      }
      return photo.isFeatured ? CURATED_LISTING_IDS.length : CURATED_LISTING_IDS.length + 1;
    };
    const featuredFirst = [...usable].sort((a, b) => rank(a) - rank(b));
    return featuredFirst.slice(0, PHOTOS_WANTED);
  }
);
