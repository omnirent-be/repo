import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import { NamedLink } from '../../components';

import css from './ListingPage.module.css';

// Resolves the listing's real category path (categoryLevel1/2/3) against
// the marketplace's actual category tree, e.g. Feest & Events > Tent &
// Structuren > Partytenten - nothing invented, straight from Console config
// and the listing's own public data.
const resolveCategoryPath = (publicData, categories) => {
  const path = [];
  let level = 1;
  let currentOptions = categories || [];

  while (level <= 3) {
    const key = `categoryLevel${level}`;
    const id = publicData?.[key];
    const found = currentOptions.find(c => c.id === id);
    if (!found) {
      break;
    }
    path.push({ id: found.id, name: found.name, level });
    currentOptions = found.subcategories || [];
    level += 1;
  }
  return path;
};

const SectionBreadcrumbs = props => {
  const { publicData, categories } = props;
  const path = resolveCategoryPath(publicData, categories);

  if (path.length === 0) {
    return null;
  }

  return (
    <nav className={css.breadcrumbs} aria-label="Breadcrumb">
      <NamedLink name="SearchPage" className={css.breadcrumbLink}>
        <FormattedMessage id="ListingPage.breadcrumbHome" />
      </NamedLink>
      {path.map((crumb, index) => {
        const isLast = index === path.length - 1;
        const search = path
          .slice(0, index + 1)
          .map((c, i) => `pub_categoryLevel${i + 1}=${c.id}`)
          .join('&');

        return (
          <React.Fragment key={crumb.id}>
            <span className={css.breadcrumbSep} aria-hidden="true">
              /
            </span>
            {isLast ? (
              <span className={css.breadcrumbCurrent}>{crumb.name}</span>
            ) : (
              <NamedLink
                name="SearchPage"
                to={{ search: `?${search}` }}
                className={css.breadcrumbLink}
              >
                {crumb.name}
              </NamedLink>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default SectionBreadcrumbs;
