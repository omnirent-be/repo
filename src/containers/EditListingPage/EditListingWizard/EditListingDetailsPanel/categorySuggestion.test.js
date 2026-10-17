import { suggestCategoryFromTitle } from './categorySuggestion';

const categories = [
  {
    id: 'event-feest',
    subcategories: [
      {
        id: 'tent-structuren',
        subcategories: [{ id: 'slaaptent' }, { id: 'party-tent' }, { id: 'Parasols' }],
      },
      {
        id: 'Entertainment-Kinderanimatie',
        subcategories: [{ id: 'springkasteel' }, { id: 'Photo-booth' }],
      },
      { id: 'Meubilair', subcategories: [{ id: 'Tafels' }] },
      { id: 'Decoratie', subcategories: [{ id: 'Thema-Drapering' }] },
    ],
  },
];

describe('suggestCategoryFromTitle', () => {
  it('suggests the full path for a bouncy castle, not a tent', () => {
    expect(suggestCategoryFromTitle('Springkasteel', categories)).toEqual({
      categoryLevel1: 'event-feest',
      categoryLevel2: 'Entertainment-Kinderanimatie',
      categoryLevel3: 'springkasteel',
    });
  });

  it('prefers specific tent types over the generic tent keyword', () => {
    expect(suggestCategoryFromTitle('Tipitent 10 personen', categories).categoryLevel3).toEqual(
      'slaaptent'
    );
    expect(suggestCategoryFromTitle('Stretchtent 6x12', categories).categoryLevel3).toEqual(
      'party-tent'
    );
  });

  it('matches table cloths to decoration instead of tables', () => {
    expect(suggestCategoryFromTitle('Tafelkleed wit', categories).categoryLevel3).toEqual(
      'Thema-Drapering'
    );
    expect(suggestCategoryFromTitle('Klaptafel', categories).categoryLevel3).toEqual('Tafels');
  });

  it('skips suggestions whose category does not exist in the given tree', () => {
    expect(suggestCategoryFromTitle('Dansvloer 4x4', categories)).toBeNull();
    expect(suggestCategoryFromTitle('Springkasteel', [])).toBeNull();
  });

  it('returns null for short or unknown titles', () => {
    expect(suggestCategoryFromTitle('ab', categories)).toBeNull();
    expect(suggestCategoryFromTitle('iets onbekends', categories)).toBeNull();
  });
});
