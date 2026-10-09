import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { trackEvent } from '../../../util/analytics';
import { CATEGORY_ICONS } from '../../SearchPage/CategoryIcons';

import css from './HomepageCategorySlider.module.css';

/**
 * Horizontal, swipeable row of category chips right under the hero. Each
 * chip toggles the homepage product grid's category filter via client
 * state (see LandingPage.js's selectedCategory) rather than navigating
 * away to SearchPage - a single click should narrow "HET AANBOD" in
 * place, with no page reload.
 *
 * @component
 * @param {Object} props
 * @param {{topCategoryId: string, subCategoryId: string}|null} props.selected currently active category, or null for "all"
 * @param {Function} props.onSelect ({topCategoryId, subCategoryId}|null) => void
 * @returns {JSX.Element}
 */
const HomepageCategorySlider = ({ selected, onSelect }) => {
  const config = useConfiguration();
  const topCategory = config.categoryConfiguration?.categories?.[0];
  const subcategories = topCategory?.subcategories || [];

  if (!topCategory || subcategories.length === 0) {
    return null;
  }

  return (
    <div className={css.root}>
      <div className={css.track}>
        {subcategories.map(sub => {
          const CategoryIcon = CATEGORY_ICONS[sub.id];
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
    </div>
  );
};

export default HomepageCategorySlider;
