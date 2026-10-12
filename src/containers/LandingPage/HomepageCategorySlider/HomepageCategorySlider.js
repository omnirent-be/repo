import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { trackEvent } from '../../../util/analytics';
import { AllCategoriesIcon, CATEGORY_ICONS } from '../../SearchPage/CategoryIcons';

import css from './HomepageCategorySlider.module.css';

/**
 * Horizontal row of category icons right under the hero. Each chip toggles
 * the homepage product grid's category filter via client state (see
 * LandingPage.js's selectedCategory) rather than navigating away to
 * SearchPage - a single click should narrow the listing grid in place,
 * with no page reload.
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

  const isAllActive = !selected;

  return (
    <div className={css.root}>
      <div
        className={css.track}
        role="tablist"
        aria-label={intl.formatMessage({ id: 'HomepageCategorySlider.ariaLabel' })}
      >
        <button
          type="button"
          className={classNames(css.chip, { [css.chipActive]: isAllActive })}
          aria-pressed={isAllActive}
          onClick={() => onSelect(null)}
        >
          <span className={css.chipIcon} aria-hidden="true">
            <AllCategoriesIcon />
          </span>
          <span className={css.chipLabel}>
            <FormattedMessage id="HomepageCategorySlider.all" />
          </span>
        </button>
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
