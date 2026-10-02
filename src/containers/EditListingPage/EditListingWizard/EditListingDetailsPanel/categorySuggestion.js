// Suggests a category (all the way down to the deepest applicable level)
// from a listing's title, so a provider typing "Springkasteel XL" doesn't
// have to separately click through Feest & Events > Springkastelen & Fun >
// Springkastelen by hand - see EditListingDetailsForm.js's
// useEffect that calls suggestCategoryFromTitle as the title changes.
//
// This mirrors OmniRent's actual category tree (server/api-util/... has no
// copy of it - it's Console-hosted; pulled here via sdk.assetsByAlias while
// building this). Each entry's `keywords` are matched as case-insensitive
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
    path: ['event-feest', 'Springkastelen-Fun', 'Springkastelen'],
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
    path: ['event-feest', 'Springkastelen-Fun', 'Photo-booth'],
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
    path: ['event-feest', 'Springkastelen-Fun', 'Games-sporten'],
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
    path: ['event-feest', 'Geluid-Lichtdj', 'PA-installatie'],
    keywords: [
      'geluidsinstallatie',
      'geluids installatie',
      'pa-installatie',
      'pa installatie',
      'geluidsbox',
      'geluidsboxen',
      'luidspreker',
      'speaker',
      'sound system',
      'microfoon',
      'karaoke',
    ],
  },
  {
    path: ['event-feest', 'Geluid-Lichtdj', 'DJ-installatie'],
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
    path: ['event-feest', 'Geluid-Lichtdj', 'Feestlichten'],
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
    path: ['event-feest', 'Catering-Keuken', 'BBQ-kookapparatuur'],
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
    path: ['event-feest', 'Catering-Keuken', 'Servies-glaswerk'],
    keywords: [
      'servies',
      'glaswerk',
      'bord',
      'borden',
      'bestek',
      'bestekset',
      'wijnglas',
      'wijnglazen',
      'champagneglas',
      'champagneglazen',
      'porselein',
    ],
  },
  {
    path: ['event-feest', 'Catering-Keuken', 'Koelboxen-dispensers'],
    keywords: [
      'koelbox',
      'koeler',
      'dispenser',
      'drankdispenser',
      'tapinstallatie',
      'biertap',
      'tapkraan',
      'biervat',
      'koeltoog',
    ],
  },
  {
    path: ['event-feest', 'Catering-Keuken', 'Slush-cocktailmachines'],
    keywords: ['slushmachine', 'slush ice', 'slushice', 'slush puppy', 'cocktailmachine', 'cocktailshaker'],
  },
  {
    path: ['event-feest', 'Meubilair-Decoratie', 'Tafels-stoelen'],
    keywords: ['tafel', 'stoel', 'statafel', 'klaptafel', 'vouwstoel', 'bankje', 'barkruk', 'zitbank'],
  },
  {
    path: ['event-feest', 'Meubilair-Decoratie', 'Feestverlichting'],
    keywords: ['lichtketting', 'feestverlichting', 'prikkabel', 'sfeerverlichting', 'lichtslinger'],
  },
  {
    path: ['event-feest', 'Meubilair-Decoratie', 'Linnengoed'],
    keywords: ['tafellaken', 'servet', 'tafelkleed', 'linnengoed'],
  },
  {
    path: ['event-feest', 'Meubilair-Decoratie', 'Decoratiesets'],
    keywords: [
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
    path: ['event-feest', 'tent-structuren', 'party-tent'],
    // Bare 'tent' (no trailing space) on purpose - Dutch tent product names
    // are almost always compounds ending in "tent" (stretchtent,
    // koepeltent, safaritent, pagodetent, ...), not just "partytent"/
    // "feesttent" as separate words. A trailing-space-only match missed all
    // of those.
    keywords: [
      'partytent',
      'feesttent',
      'stretchtent',
      'koepeltent',
      'safaritent',
      'pagodetent',
      'tent',
    ],
  },
  {
    path: ['event-feest', 'tent-structuren', 'Paviljoen-gazebo'],
    keywords: ['paviljoen', 'gazebo'],
  },
  {
    path: ['event-feest', 'tent-structuren', 'Parasols'],
    keywords: ['parasol'],
  },
  {
    path: ['event-feest', 'Trouwfotografie-apparatuur'],
    keywords: [
      'fotograaf',
      'trouwfotografie',
      'videograaf',
      'camera',
      'fototoestel',
      'statief',
      'flitser',
    ],
  },
];

const normalize = title => (title || '').toLowerCase();

/**
 * @param {string} title - the listing title as currently typed
 * @returns {{categoryLevel1: string, categoryLevel2: string, categoryLevel3?: string}|null}
 *   a complete category path (down to the deepest matched level, since
 *   every entry above is already a leaf), or null when nothing matches.
 */
export const suggestCategoryFromTitle = title => {
  const normalizedTitle = normalize(title);
  if (normalizedTitle.trim().length < 3) {
    return null;
  }

  const match = CATEGORY_SUGGESTIONS.find(({ keywords }) =>
    keywords.some(keyword => normalizedTitle.includes(keyword))
  );

  if (!match) {
    return null;
  }

  const [categoryLevel1, categoryLevel2, categoryLevel3] = match.path;
  return categoryLevel3
    ? { categoryLevel1, categoryLevel2, categoryLevel3 }
    : { categoryLevel1, categoryLevel2 };
};
