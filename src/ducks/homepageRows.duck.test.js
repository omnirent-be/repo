import { diversifyByCategory } from './homepageRows.duck';

const listing = (id, category) => ({
  id,
  attributes: { publicData: { category } },
});

describe('diversifyByCategory', () => {
  it('round-robins one listing per category before repeating any category', () => {
    const listings = [
      listing('tent-1', 'tent'),
      listing('tent-2', 'tent'),
      listing('tent-3', 'tent'),
      listing('bbq-1', 'bbq'),
      listing('sound-1', 'sound'),
    ];
    const result = diversifyByCategory(listings, 'category', 4);
    expect(result.map(l => l.id)).toEqual(['tent-1', 'bbq-1', 'sound-1', 'tent-2']);
  });

  it('returns fewer than count when there are not enough listings', () => {
    const listings = [listing('a', 'tent'), listing('b', 'bbq')];
    const result = diversifyByCategory(listings, 'category', 8);
    expect(result.map(l => l.id)).toEqual(['a', 'b']);
  });

  it('groups listings with a missing category field together under "none"', () => {
    const listings = [listing('a', undefined), listing('b', undefined), listing('c', 'tent')];
    const result = diversifyByCategory(listings, 'category', 3);
    expect(result.map(l => l.id)).toEqual(['a', 'c', 'b']);
  });

  it('returns an empty array for an empty input', () => {
    expect(diversifyByCategory([], 'category', 8)).toEqual([]);
  });
});
