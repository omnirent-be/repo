// Blog articles, see src/config/blogPosts.js. CommonJS so the Express server
// (sitemap) can use it too.
const data = require('../config/blogPosts');
const { rentalPages } = require('./rentalPages');

const DEFAULT_REGION = 'gent';

const blogPosts = [...data.posts].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

const getBlogPostBySlug = slug => blogPosts.find(post => post.slug === slug) || null;

const getBlogPostsForCategory = categoryId =>
  blogPosts.filter(post => (post.categories || []).includes(categoryId));

// Articles link to one landing page per category: the Gent one when there is
// one, otherwise the first region the category has a page for.
const getRentalPageForCategory = categoryId => {
  const pages = rentalPages.filter(page => page.categoryId === categoryId);
  return pages.find(page => page.regionId === DEFAULT_REGION) || pages[0] || null;
};

module.exports = {
  blogPosts,
  getBlogPostBySlug,
  getBlogPostsForCategory,
  getRentalPageForCategory,
};
