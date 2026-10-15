// Suggests a category (all the way down to the deepest applicable level)
// from a listing's title, so a provider typing "Springkasteel XL" doesn't
// have to separately click through Feest & Events > Springkastelen & Fun >
// Springkastelen by hand - see EditListingDetailsForm.js's
// useEffect that calls suggestCategoryFromTitle as the title changes.
//
// This mirrors OmniRent's actual category tree (it's Console-hosted, in
// /listings/listing-categories.json, so there is no copy in this codebase).
// Paths that don't exist in the categories passed to suggestCategoryFromTitle
// are skipped, so a stale entry here can never fill in a wrong category. Each entry's `keywords` are matched as case-insensitive
// substrings against the title; the first entry with a hit wins, so more
// specific/distinctive keywords should come before generic ones that could
// falsely match many titles.
//
// NOTE: if the category tree changes in Console (renamed/added/removed
// categories), this table needs a matching update - there's no way to keep
// it in sync automatically since categories aren't in this codebase.
// Keyword-list conventions (learned the hard way - see the "tent" fix this
// covers): matching is `title.includes(keyword)`, so a keyword only ever
// catches titles that CONTAIN it, never the reverse.
// - Prefer singular/root forms over plurals: a regular Dutch plural just
//   appends letters (tafel -> tafels), so the singular already matches
//   both. Only irregular plurals (vowel changes, e.g. springkasteel ->
//   springkastelen) need their own separate entry.
// - Compound/spaced/hyphenated terms need EVERY form a provider might
//   actually type: joined ("photobooth"), spaced ("photo booth"/"foto
//   booth"), and hyphenated ("pa-installatie") are all real, common
//   spellings - listing only one silently drops the others.
const CATEGORY_SUGGESTIONS = [
  {
    path: ['event-feest', 'Entertainment-Kinderanimatie', 'springkasteel'],
    keywords: [
      'springkasteel',
      'springkastelen',
      'springkussen',
      'hupfburg',
      'hüpfburg',
      'bouncy castle',
      'jumping castle',
      'springtent',
    ],
  },
  {
    path: ['event-feest', 'Entertainment-Kinderanimatie', 'Photo-booth'],
    keywords: [
      'photobooth',
      'photo booth',
      'foto booth',
      'fotobooth',
      'fotohokje',
      'foto hokje',
      'photobox',
      'foto box',
      'selfiehokje',
      'selfie hokje',
    ],
  },
  {
    path: ['event-feest', 'Entertainment-Kinderanimatie', 'kermisattracties'],
    keywords: ['kermisattractie', 'kermis', 'draaimolen', 'schiettent', 'botsauto'],
  },
  {
    path: ['event-feest', 'Entertainment-Kinderanimatie', 'games-sporten'],
    keywords: [
      'cornhole',
      'reuzejenga',
      'reuze jenga',
      'zeskamp',
      'spelletje',
      'gezelschapsspel',
      'sumopak',
      'boksbal',
      'reuzespel',
      'levensgroot spel',
      'kubb',
      'darts',
    ],
  },
  {
    path: ['event-feest', 'geluid-licht-av', 'Microfoons-Statieven'],
    keywords: ['microfoon', 'microfoonstatief'],
  },
  {
    path: ['event-feest', 'geluid-licht-av', 'DJ-apparatuur'],
    keywords: [
      'dj-installatie',
      'dj installatie',
      'djinstallatie',
      'draaitafel',
      'mengpaneel',
      'mengtafel',
      'dj-set',
      'dj set',
      'djset',
      'dj booth',
      'cdj',
    ],
  },
  {
    path: ['event-feest', 'geluid-licht-av', 'Geluidsinstallaties'],
    keywords: [
      'geluidsinstallatie',
      'geluids installatie',
      'pa-installatie',
      'pa installatie',
      'geluidsbox',
      'luidspreker',
      'speaker',
      'sound system',
      'karaoke',
    ],
  },
  {
    path: ['event-feest', 'geluid-licht-av', 'LED-schermen'],
    keywords: ['led-scherm', 'led scherm', 'ledscherm', 'videowall', 'projector', 'beamer'],
  },
  {
    path: ['event-feest', 'geluid-licht-av', 'Verlichting-effecten'],
    keywords: [
      'discolamp',
      'discolicht',
      'discoverlichting',
      'disco verlichting',
      'lichtshow',
      'feestlicht',
      'partylight',
      'party light',
      'led-lamp',
      'led lamp',
      'ledlamp',
      'movinghead',
      'moving head',
      'lichteffect',
      'stroboscoop',
    ],
  },
  {
    path: ['event-feest', 'Bar-Catering', 'barbecue'],
    keywords: [
      'bbq',
      'barbecue',
      'plancha',
      'grill',
      'frituur',
      'friteuse',
      'gasfles',
      'kookplaat',
      'warmhoudplaat',
    ],
  },
  {
    path: ['event-feest', 'Bar-Catering', 'foodtruck'],
    keywords: ['foodtruck', 'food truck', 'frietkraam', 'foodkraam'],
  },
  {
    path: ['event-feest', 'Bar-Catering', 'borden-servies'],
    keywords: ['servies', 'glaswerk', 'bord', 'bestek', 'wijnglas', 'champagneglas', 'porselein'],
  },
  {
    path: ['event-feest', 'Bar-Catering', 'Koeling'],
    keywords: ['koelbox', 'koeler', 'koelcel', 'koeltoog', 'koelkast', 'koeling', 'biervat'],
  },
  {
    path: ['event-feest', 'Bar-Catering', 'Bars'],
    keywords: [
      'cocktailbar',
      'mobiele bar',
      'biertap',
      'tapinstallatie',
      'tapkraan',
      'tapwagen',
      'slushmachine',
      'slush ice',
      'slushice',
      'slush puppy',
      'cocktailmachine',
      'cocktailshaker',
    ],
  },
  {
    path: ['event-feest', 'Decoratie', 'Thema-Drapering'],
    keywords: [
      'tafellaken',
      'tafelkleed',
      'servet',
      'linnengoed',
      'drapering',
      'draperie',
      'decoratieset',
      'versiering',
      'ballonnenboog',
      'ballonboog',
      'ballondecoratie',
      'photobackdrop',
      'photo backdrop',
      'backdrop',
    ],
  },
  {
    path: ['event-feest', 'Meubilair', 'Lounge'],
    keywords: ['lounge', 'chesterfield'],
  },
  {
    path: ['event-feest', 'Meubilair', 'Stoelen-Zitmeubilair'],
    keywords: ['stoel', 'vouwstoel', 'bankje', 'barkruk', 'zitbank', 'kruk', 'zitzak'],
  },
  {
    path: ['event-feest', 'Meubilair', 'Tafels'],
    keywords: ['tafel', 'statafel', 'klaptafel'],
  },
  {
    path: ['event-feest', 'vloeren', 'Dansvloer'],
    keywords: ['dansvloer', 'dans vloer', 'danspaneel'],
  },
  {
    path: ['event-feest', 'vloeren', 'Cassettevloer'],
    keywords: ['cassettevloer', 'cassette vloer'],
  },
  {
    path: ['event-feest', 'vloeren', 'houten-vloer'],
    keywords: ['houten vloer', 'houtenvloer', 'parketvloer'],
  },
  {
    path: ['event-feest', 'Decoratie', 'verlichting-sfeer'],
    keywords: [
      'lichtketting',
      'feestverlichting',
      'prikkabel',
      'sfeerverlichting',
      'lichtslinger',
      'lichtsnoer',
      'fairy light',
    ],
  },
  {
    path: ['event-feest', 'Decoratie', 'Buitendecor'],
    keywords: ['buitendecor', 'buitendecoratie', 'bloembak', 'plantenbak'],
  },
  {
    path: ['event-feest', 'Verwarming', 'Verwarmingsblazers'],
    keywords: ['heteluchtkanon', 'heteluchtblazer', 'verwarmingsblazer'],
  },
  {
    path: ['event-feest', 'Verwarming', 'Verwarmingselementen'],
    keywords: [
      'terrasverwarmer',
      'patioheater',
      'heater',
      'kachel',
      'verwarming',
      'infraroodstraler',
    ],
  },
  {
    path: ['event-feest', 'Sanitair', 'WC-wagens'],
    keywords: [
      'wc-wagen',
      'wc wagen',
      'toiletwagen',
      'dixi',
      'mobiel toilet',
      'toiletcabine',
      'toilet',
    ],
  },
  {
    path: ['event-feest', 'Podium-Constructie', 'Podiumwagens'],
    keywords: ['podiumwagen'],
  },
  {
    path: ['event-feest', 'Podium-Constructie', 'Steigerpodia'],
    keywords: ['steigerpodium'],
  },
  {
    path: ['event-feest', 'Podium-Constructie', 'Steigertorens'],
    keywords: ['steigertoren', 'rolsteiger', 'steiger'],
  },
  {
    path: ['event-feest', 'Podium-Constructie', 'Steigerpodia'],
    keywords: ['podium'],
  },
  {
    path: ['event-feest', 'Accessoires-Toebehoren', 'Gewichten'],
    keywords: ['tentgewicht', 'ballastgewicht', 'ballast', 'gewicht'],
  },
  {
    path: ['event-feest', 'Accessoires-Toebehoren', 'Verlengkabels'],
    keywords: ['verlengkabel', 'kabelhaspel', 'stekkerdoos', 'verdeelkast'],
  },
  {
    path: ['event-feest', 'tent-structuren', 'Parasols'],
    keywords: ['parasol'],
  },
  {
    path: ['event-feest', 'tent-structuren', 'slaaptent'],
    keywords: ['slaaptent', 'tipitent', 'tipi', 'belltent', 'bell tent', 'glamping', 'safaritent'],
  },
  {
    path: ['event-feest', 'tent-structuren', 'feesttent'],
    keywords: ['feesttent'],
  },
  {
    path: ['event-feest', 'tent-structuren', 'party-tent'],
    // Bare 'tent' (no trailing space) on purpose - Dutch tent product names
    // are almost always compounds ending in "tent" (stretchtent,
    // koepeltent, pagodetent, ...). It stays last so the more specific
    // tent-like entries above (slaaptent, tentgewicht, schiettent) win.
    keywords: [
      'partytent',
      'stretchtent',
      'koepeltent',
      'pagodetent',
      'paviljoen',
      'gazebo',
      'tent',
    ],
  },
];

const normalize = title => (title || '').toLowerCase();

const pathExists = (categories, path) => {
  let level = categories;
  return path.every(id => {
    const found = (level || []).find(category => category.id === id);
    level = found?.subcategories;
    return !!found;
  });
};

/**
 * @param {string} title - the listing title as currently typed
 * @param {Array<Object>} [selectableCategories] - the marketplace's category tree; when given,
 *   only suggestions whose full path exists in it are returned
 * @returns {{categoryLevel1: string, categoryLevel2: string, categoryLevel3?: string}|null}
 *   a complete category path (down to the deepest matched level, since
 *   every entry above is already a leaf), or null when nothing matches.
 */
export const suggestCategoryFromTitle = (title, selectableCategories) => {
  const normalizedTitle = normalize(title);
  if (normalizedTitle.trim().length < 3) {
    return null;
  }

  const match = CATEGORY_SUGGESTIONS.find(
    ({ keywords, path }) =>
      keywords.some(keyword => normalizedTitle.includes(keyword)) &&
      (!selectableCategories || pathExists(selectableCategories, path))
  );

  if (!match) {
    return null;
  }

  const [categoryLevel1, categoryLevel2, categoryLevel3] = match.path;
  return categoryLevel3
    ? { categoryLevel1, categoryLevel2, categoryLevel3 }
    : { categoryLevel1, categoryLevel2 };
};
