// Conversion landing pages: one page per category and region combination, for example
// /springkasteel-huren/temse. The data lives in src/config/rentalPages.js. This file is
// CommonJS on purpose, so the Express server (sitemap, redirects) can use it too.
const data = require('../config/rentalPages');

const buildPages = () =>
  data.pages.map(([categoryId, regionId]) => {
    const category = data.categories.find(c => c.id === categoryId);
    const region = data.regions.find(r => r.id === regionId);
    // Every URL this page used to live at, kept as permanent redirects to the
    // current slug: the original dash-joined format (gent only), and - if the
    // category itself was later renamed/broadened - its old pathBase(s) too.
    const legacySlugs = [
      regionId === 'gent' ? `${category.pathBase}-gent` : null,
      ...(category.legacyPathBases || []).flatMap(legacyBase => [
        `${legacyBase}/${regionId}`,
        regionId === 'gent' ? `${legacyBase}-gent` : null,
      ]),
    ].filter(Boolean);
    return {
      ...category,
      id: `${categoryId}-${regionId}`,
      categoryId,
      regionId,
      regionName: region.name,
      regionBounds: region.bounds,
      slug: `${category.pathBase}/${regionId}`,
      legacySlugs,
      routeName: `RentalLandingPage_${categoryId}_${regionId}`,
    };
  });

const rentalPages = buildPages();

module.exports = { rentalPages };
