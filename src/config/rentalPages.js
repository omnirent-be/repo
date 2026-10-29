// Conversion landing pages: one page per category and region combination, for example
// /springkasteel-huren/temse. See src/util/rentalPages.js for how the pages are built.
// This is a CommonJS JavaScript file (not JSON) on purpose: the Express server reads it too,
// and webpack strips nested data from JSON files that are loaded through require().
module.exports = {
  // `bounds` is a rough ~25km-radius box around the region's center, not a precise
  // administrative boundary - wide enough to also catch "omgeving" listings in nearby
  // towns (e.g. Eeklo, Deinze, Lochristi for Gent), used to filter the main listings row
  // in RentalLandingPage.duck.js so the page actually matches its own region name.
  regions: [
    {
      id: 'gent',
      name: 'Gent',
      bounds: { ne: { lat: 51.28, lng: 4.08 }, sw: { lat: 50.83, lng: 3.36 } },
    },
    {
      id: 'temse',
      name: 'Temse',
      bounds: { ne: { lat: 51.3, lng: 4.49 }, sw: { lat: 50.94, lng: 3.91 } },
    },
    {
      id: 'antwerpen',
      name: 'Antwerpen',
      bounds: { ne: { lat: 51.4, lng: 4.69 }, sw: { lat: 51.04, lng: 4.12 } },
    },
    {
      id: 'waasland',
      name: 'het Waasland',
      bounds: { ne: { lat: 51.35, lng: 4.43 }, sw: { lat: 50.99, lng: 3.86 } },
    },
  ],
  categories: [
    {
      id: 'springkasteel',
      query: {
        keywords: 'springkasteel',
      },
      titlePattern: 'springkas|springkussen|bouncy',
      fallbackQuery: {
        pub_categoryLevel1: 'event-feest',
        pub_categoryLevel2: 'Entertainment-Kinderanimatie',
      },
      searchQuery: {
        pub_categoryLevel1: 'event-feest',
        pub_categoryLevel2: 'Entertainment-Kinderanimatie',
      },
      pathBase: 'springkasteel-huren',
    },
    {
      id: 'partytent',
      query: {
        pub_categoryLevel1: 'event-feest',
        pub_categoryLevel2: 'tent-structuren',
      },
      searchQuery: {
        pub_categoryLevel1: 'event-feest',
        pub_categoryLevel2: 'tent-structuren',
      },
      pathBase: 'partytent-huren',
    },
    {
      id: 'geluidsinstallatie',
      query: {
        pub_categoryLevel1: 'event-feest',
        pub_categoryLevel2: 'geluid-licht-av',
      },
      searchQuery: {
        pub_categoryLevel1: 'event-feest',
        pub_categoryLevel2: 'geluid-licht-av',
      },
      pathBase: 'geluidsinstallatie-huren',
    },
    {
      id: 'barcatering',
      query: {
        pub_categoryLevel1: 'event-feest',
        pub_categoryLevel2: 'Bar-Catering',
      },
      searchQuery: {
        pub_categoryLevel1: 'event-feest',
        pub_categoryLevel2: 'Bar-Catering',
      },
      pathBase: 'bar-cateringmateriaal-huren',
      // The page's previous identity, before it broadened from BBQs alone to the
      // whole Bar & Catering category - kept as permanent redirects in server/index.js
      // so existing links/search results to /bbq-huren/... still work.
      legacyPathBases: ['bbq-huren'],
    },
    {
      id: 'feestmateriaal',
      query: {
        pub_categoryLevel1: 'event-feest',
      },
      diversify: true,
      searchQuery: {
        pub_categoryLevel1: 'event-feest',
      },
      pathBase: 'feestmateriaal-huren',
    },
  ],
  pages: [
    ['springkasteel', 'gent'],
    ['springkasteel', 'temse'],
    ['partytent', 'gent'],
    ['partytent', 'antwerpen'],
    ['geluidsinstallatie', 'gent'],
    ['barcatering', 'gent'],
    ['barcatering', 'waasland'],
    ['feestmateriaal', 'gent'],
  ],
};
