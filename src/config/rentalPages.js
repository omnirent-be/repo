// Conversion landing pages: one page per category and region combination, for example
// /springkasteel-huren/temse. See src/util/rentalPages.js for how the pages are built.
// This is a CommonJS JavaScript file (not JSON) on purpose: the Express server reads it too,
// and webpack strips nested data from JSON files that are loaded through require().
module.exports = {
  regions: [
    {
      id: 'gent',
      name: 'Gent',
    },
    {
      id: 'temse',
      name: 'Temse',
    },
    {
      id: 'antwerpen',
      name: 'Antwerpen',
    },
    {
      id: 'waasland',
      name: 'het Waasland',
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
      id: 'bbq',
      query: {
        keywords: 'bbq',
      },
      titlePattern: 'bbq|barbecue|grill',
      fallbackQuery: {
        pub_categoryLevel1: 'event-feest',
        pub_categoryLevel2: 'Bar-Catering',
      },
      searchQuery: {
        pub_categoryLevel1: 'event-feest',
        pub_categoryLevel2: 'Bar-Catering',
      },
      pathBase: 'bbq-huren',
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
    ['bbq', 'gent'],
    ['bbq', 'waasland'],
    ['feestmateriaal', 'gent'],
  ],
};
