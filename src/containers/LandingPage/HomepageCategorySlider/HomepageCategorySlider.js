import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { trackEvent } from '../../../util/analytics';
import { NamedLink } from '../../../components';
import { iconForCategory } from '../../SearchPage/CategoryIcons';

import css from './HomepageCategorySlider.module.css';

// The homepage only shows the strongest categories, in this order, to keep the
// page focused on searching and converting. The remaining categories (floors,
// sanitation, stage, accessories, ...) stay available on the search page via
// the "Bekijk alle categorieën" link. Ids are compared lowercased since the
// Console ids are not consistently cased (e.g. 'Meubilair', 'Bar-Catering').
const HOMEPAGE_CATEGORY_IDS = [
  'tent-structuren',
  'meubilair',
  'bar-catering',
  'geluid-licht-av',
  'entertainment-kinderanimatie',
  'decoratie',
  'verwarming',
];
const MAX_HOMEPAGE_CATEGORIES = 8;

/**
 * Picks the homepage categories from the full list of subcategories, in the
 * order of HOMEPAGE_CATEGORY_IDS. If none of them exist in the configuration
 * (e.g. renamed in Console), falls back to the first few subcategories.
 *
 * @param {Array<{id: string, name: string}>} subcategories
 * @returns {Array<{id: string, name: string}>}
 */
const pickHomepageCategories = subcategories => {
  const picked = HOMEPAGE_CATEGORY_IDS.map(id =>
    subcategories.find(sub => sub.id?.toLowerCase() === id)
  ).filter(Boolean);
  return picked.length > 0 ? picked : subcategories.slice(0, MAX_HOMEPAGE_CATEGORIES);
};

/**
 * Title, a single row of the main category icons and a link to the full
 * category overview. Each chip toggles the homepage product grid's category
 * filter via client state (see LandingPage.js's selectedCategory) rather than
 * navigating away to SearchPage - a single click should narrow the listing
 * grid in place, with no page reload. Clicking the active chip again shows
 * all listings.
 *
 * @component
 * @param {Object} props
 * @param {{topCategoryId: string, subCategoryId: string}|null} props.selected currently active category, or null for "all"
 * @param {Function} props.onSelect ({topCategoryId, subCategoryId}|null) => void
 * @returns {JSX.Element}
 */
const HomepageCategorySlider = ({ selected, onSelect }) => {
  const config = useConfiguration();
  const intl = useIntl();
  const topCategory = config.categoryConfiguration?.categories?.[0];
  const subcategories = topCategory?.subcategories || [];

  if (!topCategory || subcategories.length === 0) {
    return null;
  }

  const homepageCategories = pickHomepageCategories(subcategories);

  return (
    <section className={css.root} aria-labelledby="homepageCategoriesTitle">
      <h2 id="homepageCategoriesTitle" className={css.title}>
        <FormattedMessage id="HomepageCategorySlider.title" />
      </h2>
      <div
        className={css.track}
        role="group"
        aria-label={intl.formatMessage({ id: 'HomepageCategorySlider.ariaLabel' })}
      >
        {homepageCategories.map(sub => {
          const CategoryIcon = iconForCategory(sub.id, sub.name);
          const isActive = selected?.subCategoryId === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              className={classNames(css.chip, { [css.chipActive]: isActive })}
              aria-pressed={isActive}
              onClick={() => {
                if (!isActive) {
                  trackEvent('category_clicked', { category: sub.id });
                }
                onSelect(
                  isActive ? null : { topCategoryId: topCategory.id, subCategoryId: sub.id }
                );
              }}
            >
              {CategoryIcon ? (
                <span className={css.chipIcon} aria-hidden="true">
                  <CategoryIcon />
                </span>
              ) : null}
              <span className={css.chipLabel}>{sub.name}</span>
            </button>
          );
        })}
      </div>
      <div className={css.viewAllRow}>
        <NamedLink
          name="SearchPage"
          to={{ search: '' }}
          className={css.viewAllLink}
          onClick={() => trackEvent('view_all_categories_clicked')}
        >
          <FormattedMessage id="HomepageCategorySlider.viewAll" />
          <span className={css.viewAllArrow} aria-hidden="true">
            →
          </span>
        </NamedLink>
      </div>
    </section>
  );
};

export default HomepageCategorySlider;
