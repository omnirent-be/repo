import React from 'react';

import { useConfiguration } from '../../../context/configurationContext';
import { NamedLink } from '../../../components';
import { CATEGORY_ICONS } from '../../SearchPage/CategoryIcons';

import css from './HomepageCategorySlider.module.css';

/**
 * Horizontal, swipeable row of category chips right under the hero - reuses
 * the same icon set and subcategory data as SearchPage's own
 * CategoryQuickNav (SearchPageWithGrid.js), just as plain NamedLinks
 * instead of imperative history.push, since this is an entry point into
 * search rather than a live filter already on the results page.
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepageCategorySlider = () => {
  const config = useConfiguration();
  const categoryKey = config.categoryConfiguration?.key || 'categoryLevel';
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
          return (
            <NamedLink
              key={sub.id}
              name="SearchPage"
              to={{
                search: `?pub_${categoryKey}1=${encodeURIComponent(
                  topCategory.id
                )}&pub_${categoryKey}2=${encodeURIComponent(sub.id)}`,
              }}
              className={css.chip}
            >
              {CategoryIcon ? (
                <span className={css.chipIcon} aria-hidden="true">
                  <CategoryIcon />
                </span>
              ) : null}
              <span className={css.chipLabel}>{sub.name}</span>
            </NamedLink>
          );
        })}
      </div>
    </div>
  );
};

export default HomepageCategorySlider;
