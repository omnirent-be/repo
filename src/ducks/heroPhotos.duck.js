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

// A per-day rental price above this is almost certainly a typo (an extra
// zero, cents entered as whole euros, ...) rather than a real listing - see
// "audiobook telefoon" at EUR 100 100/day in the live catalog. Keeps those
// out of the hero without needing an operator to notice and flag them.
const MAX_REASONABLE_PRICE_SUBUNITS = 100000; // EUR 1000

// Deterministic (not Math.random(), which isn't seedable) so the server
// render and the client hydration of the same page agree, and so the
// selection only changes once a day instead of on every request/reload.
const dailySeed = () => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  let hash = 0;
  for (let i = 0; i < today.length; i += 1) {
    hash = (hash * 31 + today.charCodeAt(i)) | 0;
  }
  return hash;
};

// Small seedable PRNG (mulberry32).
const mulberry32 = seed => {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = (array, random) => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Rotates which listings are featured once a day, instead of the same
// handful forever - curation (CURATED_LISTING_IDS / the "Toon op
// homepage" Console flag) still earns a listing the "Uitgelicht" badge
// when it's picked, but no longer guarantees it fills a slot every single
// day, since with only a few curated listings that would just reorder the
// same set rather than actually showing different ones.
const dailyPick = (pool, count) => shuffle(pool, mulberry32(dailySeed())).slice(0, count);

// Hand-picked listings with strong real photos, spread over barbecue, kids'
// entertainment, glamping, photobooth and food - included in the daily
// rotation pool (see dailyPick above) and get the "Uitgelicht" badge
// whenever picked. If one is unpublished or loses its photo it is skipped.
// Replace the ids to change the selection.
const CURATED_LISTING_IDS = [
  '6a9ea99a-1f13-4ac2-abe6-fb73f74807c8', // BBQ cortenstaal
  '6aa0633c-7e88-4b43-a4a9-7f72fd6c0780', // Wit springkasteel met ballenbad
  '6a4d74e3-352d-49c8-b289-fdc6027ee7b7', // Luxe Glampingtent met Houten Vloer
  '6abbb208-fa01-4a22-b843-a8447d211296', // photo booth
  '6aa51453-9655-4486-9560-21c98461c3d9', // Foodtruck
];

// Real photos from real, recent listings for the homepage hero - instead of
// one fixed stock-style photo, and different ones each day (see dailyPick)
// instead of the same handful forever. Falls back to an empty array (caller
// keeps its own static fallback image) if nothing has a usable photo yet,
// which can happen early on when few listings have uploaded images.
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
        const hasSanePrice = price && price.amount > 0 && price.amount <= MAX_REASONABLE_PRICE_SUBUNITS;
        const isUsable = variant && hasUsableTitle(listing) && hasSanePrice && !isTestListing(listing);
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

    return dailyPick(usable, PHOTOS_WANTED);
  }
);
