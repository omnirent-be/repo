import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage } from '../../util/reactIntl';
import { Heading, ListingCard } from '../../components';
import { fetchMoreFromProviderThunk } from './ListingPage.duck';

import css from './ListingPage.module.css';

/**
 * Shows a handful of the provider's other published listings, so a visitor
 * who likes this one doesn't have to leave the page to see what else this
 * provider has. Renders nothing while loading or if the provider has no
 * other listings, rather than showing an empty section.
 */
const SectionMoreFromProvider = props => {
  const { authorId, currentListingId } = props;
  const dispatch = useDispatch();
  const config = useConfiguration();
  const [listings, setListings] = useState([]);

  useEffect(() => {
    if (!authorId) {
      return;
    }
    dispatch(fetchMoreFromProviderThunk({ authorId, excludeListingId: currentListingId, config }))
      .unwrap()
      .then(setListings)
      .catch(() => setListings([]));
  }, [authorId, currentListingId]);

  if (listings.length === 0) {
    return null;
  }

  return (
    <section className={css.sectionReviews}>
      <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
        <FormattedMessage id="ListingPage.moreFromProviderTitle" />
      </Heading>
      <div className={css.moreFromProviderGrid}>
        {listings.map(l => (
          <div className={css.moreFromProviderCard} key={l.id.uuid}>
            <ListingCard listing={l} showAuthorInfo={false} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default SectionMoreFromProvider;
