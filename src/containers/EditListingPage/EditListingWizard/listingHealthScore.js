// Computes a rough "how complete is this listing" percentage, shown above
// the wizard tabs as a motivational nudge (see ListingHealthScoreBar.js) -
// e.g. "Zoekertje is 60% compleet - voeg nog 2 foto's toe voor meer
// boekingen!". Purely informational: it never gates submission or
// publishing, which already have their own, stricter per-step
// required-field validation.
const MIN_RECOMMENDED_PHOTOS = 3;

// Each check's `tipId` is only ever shown for the single biggest gap (the
// first failing, highest-weight check) - see getListingHealthScore below -
// so order matters: put the checks that matter most for getting a booking
// (photos, price) before smaller/administrative ones.
const CHECKS = [
  {
    key: 'images',
    weight: 3,
    tipId: 'ListingHealthScore.tipImages',
    check: listing => (listing?.images?.length || 0) >= MIN_RECOMMENDED_PHOTOS,
  },
  {
    key: 'title',
    weight: 2,
    tipId: 'ListingHealthScore.tipTitle',
    check: listing => !!listing?.attributes?.title,
  },
  {
    key: 'price',
    weight: 2,
    tipId: 'ListingHealthScore.tipPrice',
    check: listing => listing?.attributes?.price?.amount != null,
  },
  {
    key: 'description',
    weight: 1,
    tipId: 'ListingHealthScore.tipDescription',
    check: listing => !!listing?.attributes?.description,
  },
  {
    key: 'accessories',
    weight: 1,
    tipId: 'ListingHealthScore.tipAccessories',
    check: listing => !!listing?.attributes?.publicData?.accessories,
  },
  {
    key: 'replacementValue',
    weight: 1,
    tipId: 'ListingHealthScore.tipReplacementValue',
    check: listing => listing?.attributes?.publicData?.replacementValueInSubunits != null,
  },
  {
    key: 'condition',
    weight: 1,
    tipId: 'ListingHealthScore.tipCondition',
    check: listing => !!listing?.attributes?.publicData?.condition,
  },
  {
    key: 'deposit',
    weight: 1,
    tipId: 'ListingHealthScore.tipDeposit',
    check: listing => listing?.attributes?.publicData?.depositInSubunits != null,
  },
  {
    key: 'location',
    weight: 1,
    tipId: 'ListingHealthScore.tipLocation',
    check: listing => !!listing?.attributes?.publicData?.location?.address,
  },
];

const TOTAL_WEIGHT = CHECKS.reduce((sum, c) => sum + c.weight, 0);

/**
 * @param {Object} listing - the listing entity (as used throughout the
 *   wizard - attributes.title/description/price/publicData, plus the
 *   denormalized images array)
 * @returns {{percentage: number, tipId: string|null}} percentage rounded to
 *   the nearest 10 (a jump from e.g. 62% to 71% after one field feels more
 *   like real progress than a jittery exact number), and the translation id
 *   for the single most impactful missing field, or null once everything
 *   checked here is filled in.
 */
export const getListingHealthScore = listing => {
  let scoredWeight = 0;
  let firstGapTipId = null;

  CHECKS.forEach(({ weight, check, tipId }) => {
    const passed = check(listing);
    if (passed) {
      scoredWeight += weight;
    } else if (!firstGapTipId) {
      firstGapTipId = tipId;
    }
  });

  const rawPercentage = (scoredWeight / TOTAL_WEIGHT) * 100;
  const percentage = Math.min(100, Math.round(rawPercentage / 10) * 10);

  return { percentage, tipId: firstGapTipId };
};
