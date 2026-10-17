// Conversion landing pages: one page per category and region combination, for example
// /springkasteel-huren/temse. The data lives in src/config/rentalPages.js. This file is
// CommonJS on purpose, so the Express server (sitemap, redirects) can use it too.
const data = require('../config/rentalPages');

const buildPages = () =>
  data.pages.map(([categoryId, regionId]) => {
    const category = data.categories.find(c => c.id === categoryId);
    const region = data.regions.find(r => r.id === regionId);
    return {
      ...category,
      id: `${categoryId}-${regionId}`,
      categoryId,
      regionId,
      regionName: region.name,
      slug: `${category.pathBase}/${regionId}`,
      // The URL of the first version of these pages, kept as a permanent redirect.
      legacySlug: regionId === 'gent' ? `${category.pathBase}-gent` : null,
      routeName: `RentalLandingPage_${categoryId}_${regionId}`,
    };
  });

const rentalPages = buildPages();

module.exports = { rentalPages };
