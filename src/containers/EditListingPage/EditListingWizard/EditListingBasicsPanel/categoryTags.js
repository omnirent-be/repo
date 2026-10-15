// "Slimme tags" - a handful of quick checkboxes offered once a category is
// known (see EditListingBasicsForm.js), so a provider doesn't have to type
// out obvious selling points by hand. Purely a shortlist of common,
// relevant claims per OmniRent category (see categorySuggestion.js for the
// real category tree these ids match) - stored as
// `publicData.smartTags: string[]`, shown as extra bullet points on the
// listing page.
//
// NOTE: same caveat as categorySuggestion.js - categories live in Console
// (/listings/listing-categories.json), not in this codebase, so this table
// needs a manual update if the category tree changes there.
const TAGS_BY_CATEGORY = {
  springkasteel: ['waterdicht', 'omheining-inbegrepen', 'blower-inbegrepen', 'geschikt-buiten'],
  'party-tent': [
    'waterdicht',
    'inclusief-haringen',
    'makkelijk-op-te-zetten',
    'zijwanden-inbegrepen',
  ],
  feesttent: ['waterdicht', 'inclusief-haringen', 'makkelijk-op-te-zetten', 'zijwanden-inbegrepen'],
  slaaptent: ['waterdicht', 'inclusief-haringen', 'makkelijk-op-te-zetten'],
  Parasols: ['waterdicht', 'stevige-voet-inbegrepen'],
  Tafels: ['stapelbaar', 'buiten-en-binnen', 'inclusief-hoezen'],
  'Stoelen-Zitmeubilair': ['stapelbaar', 'buiten-en-binnen', 'inclusief-hoezen'],
  Lounge: ['buiten-en-binnen'],
  'verlichting-sfeer': ['dimbaar', 'geschikt-buiten', 'inclusief-verlengkabel'],
  'Thema-Drapering': ['herbruikbaar', 'thema-aanpasbaar'],
  barbecue: ['gasfles-inbegrepen', 'gereinigd-geleverd', 'geschikt-groot-gezelschap'],
  'borden-servies': ['vaatwasserbestendig', 'per-set-te-huur'],
  Koeling: ['elektrisch', 'geschikt-buiten'],
  Geluidsinstallaties: ['inclusief-microfoons', 'bluetooth', 'geschikt-buiten'],
  'DJ-apparatuur': ['inclusief-kabels', 'plug-and-play'],
  'Verlichting-effecten': ['geluidsgestuurd', 'afstandsbediening-inbegrepen'],
  'games-sporten': ['geschikt-alle-leeftijden', 'snel-opgezet'],
  'Photo-booth': ['inclusief-props', 'inclusief-afdrukken'],
};

/**
 * @param {string} categoryLevel3 - the deepest selected category id (falls
 *   back to categoryLevel2 for the one category with no level-3, see
 *   categorySuggestion.js's Trouwfotografie-apparatuur entry)
 * @param {string} [categoryLevel2]
 * @returns {string[]} tag option ids, or [] when nothing is configured for
 *   that category
 */
export const tagOptionsForCategory = (categoryLevel3, categoryLevel2) => {
  return TAGS_BY_CATEGORY[categoryLevel3] || TAGS_BY_CATEGORY[categoryLevel2] || [];
};
