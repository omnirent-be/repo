// "Slimme tags" - a handful of quick checkboxes offered once a category is
// known (see EditListingBasicsForm.js), so a provider doesn't have to type
// out obvious selling points by hand. Purely a shortlist of common,
// relevant claims per OmniRent category (see categorySuggestion.js for the
// real category tree these ids match) - stored as
// `publicData.smartTags: string[]`, shown as extra bullet points on the
// listing page.
//
// NOTE: same caveat as categorySuggestion.js - categories live in Console,
// not in this codebase, so this table needs a manual update if the
// category tree changes there.
const TAGS_BY_CATEGORY = {
  Springkastelen: ['waterdicht', 'omheining-inbegrepen', 'blower-inbegrepen', 'geschikt-buiten'],
  'party-tent': ['waterdicht', 'inclusief-haringen', 'makkelijk-op-te-zetten', 'zijwanden-inbegrepen'],
  'Paviljoen-gazebo': ['waterdicht', 'inclusief-haringen', 'makkelijk-op-te-zetten'],
  Parasols: ['waterdicht', 'stevige-voet-inbegrepen'],
  'Tafels-stoelen': ['stapelbaar', 'buiten-en-binnen', 'inclusief-hoezen'],
  Feestverlichting: ['dimbaar', 'buiten-geschikt', 'inclusief-verlengkabel'],
  Linnengoed: ['gestreken', 'gewassen-en-hygienisch'],
  Decoratiesets: ['herbruikbaar', 'thema-aanpasbaar'],
  'BBQ-kookapparatuur': ['gasfles-inbegrepen', 'gereinigd-geleverd', 'geschikt-groot-gezelschap'],
  'Servies-glaswerk': ['vaatwasserbestendig', 'per-set-te-huur'],
  'Koelboxen-dispensers': ['elektrisch', 'geschikt-buiten'],
  'Slush-cocktailmachines': ['inclusief-siroop', 'makkelijk-te-reinigen'],
  'PA-installatie': ['inclusief-microfoons', 'bluetooth', 'geschikt-buiten'],
  'DJ-installatie': ['inclusief-kabels', 'plug-and-play'],
  Feestlichten: ['geluidsgestuurd', 'afstandsbediening-inbegrepen'],
  'Games-sporten': ['geschikt-alle-leeftijden', 'snel-opgezet'],
  'Photo-booth': ['inclusief-props', 'inclusief-afdrukken'],
  'Trouwfotografie-apparatuur': ['professionele-uitrusting', 'inclusief-statief'],
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
