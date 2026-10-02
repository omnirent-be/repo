//////////////////////////////////////////////////////////////////////
// Keyword search synonyms                                          //
//////////////////////////////////////////////////////////////////////
//
// Sharetribe's keyword search matches a listing if it contains ANY of
// the words in the search query (it's an OR, not an AND) - see
// https://www.sharetribe.com/docs/concepts/listings/how-the-listing-search-works/
//
// That means we can broaden a search to related products simply by
// appending synonym words to the query before it's sent to the API.
// E.g. searching "wijnton" also searches for "wijnvaatje", "wijnvat",
// so a listing titled "Wijnvaatje te huur" shows up too.
//
// Each group is a list of words that mean (roughly) the same rental
// product. Add new groups/words here as OmniRent's catalogue grows -
// no code changes needed elsewhere.
export const keywordSynonymGroups = [
  ['wijnton', 'wijnvaatje', 'wijnvat', 'wijnfust'],
  ['partytent', 'feesttent', 'tuintent'],
  ['springkasteel', 'luchtkussen'],
  ['statafel', 'cocktailtafel'],
  ['klapstoel', 'vouwstoel'],
];
