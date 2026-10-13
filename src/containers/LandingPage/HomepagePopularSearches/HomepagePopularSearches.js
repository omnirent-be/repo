import React from 'react';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import { rentalPages } from '../../../util/rentalPages';

const HOMEPAGE_REGION_ID = 'gent';

import css from './HomepagePopularSearches.module.css';

/**
 * A row of links to the rental landing pages (e.g. "Springkasteel huren Gent"). It gives
 * visitors a shortcut and gives search engines internal links to those pages.
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepagePopularSearches = () => {
  const intl = useIntl();

  return (
    <section className={css.root} aria-labelledby="homepagePopularSearchesTitle">
      <div className={css.inner}>
        <h2 id="homepagePopularSearchesTitle" className={css.title}>
          <FormattedMessage id="HomepagePopularSearches.title" />
        </h2>
        <ul className={css.list}>
          {rentalPages
            .filter(page => page.regionId === HOMEPAGE_REGION_ID)
            .map(page => (
              <li key={page.id}>
                <NamedLink name={page.routeName} className={css.link}>
                  {intl.formatMessage({ id: `RentalPage.${page.categoryId}.short` })} Gent
                </NamedLink>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
};

export default HomepagePopularSearches;
