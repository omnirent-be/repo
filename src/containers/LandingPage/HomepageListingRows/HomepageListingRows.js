import React, { useEffect } from 'react';
import { connect } from 'react-redux';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { getListingsById } from '../../../ducks/marketplaceData.duck';
import { fetchHomepageRow } from '../../../ducks/homepageRows.duck';
import { ListingCard, NamedLink } from '../../../components';

import css from './HomepageListingRows.module.css';

const FEATURED_ROW_ID = 'featured';
const RECENT_ROW_ID = 'recent';

// "HET AANBOD" is the main body of the homepage now, so this renders as a
// real wrapping grid (see .track in the CSS module) instead of the
// single-row horizontal carousel it used to be - no scroll arrows needed
// for a grid, and "view all" is a plain button below it rather than a
// tile inside it.
const ListingRow = ({ title, searchQuery, listings, isLoading }) => {
  return (
    <section className={css.row}>
      <div className={css.rowHeader}>
        <h2 className={css.rowTitle}>{title}</h2>
      </div>

      <ul className={css.track}>
        {isLoading
          ? [0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <li key={i} className={css.item}>
                <div className={css.skeleton} />
              </li>
            ))
          : listings.map(listing => (
              <li key={listing.id.uuid} className={css.item}>
                <ListingCard
                  listing={listing}
                  renderSizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                  lazyLoadImage
                />
              </li>
            ))}
      </ul>

      {!isLoading ? (
        <div className={css.viewAllRow}>
          <NamedLink name="SearchPage" to={{ search: searchQuery }} className={css.viewAllButton}>
            <FormattedMessage id="HomepageListingRows.viewAll" />
            <span className={css.viewAllArrow} aria-hidden="true">
              →
            </span>
          </NamedLink>
        </div>
      ) : null}
    </section>
  );
};

const HomepageListingRowsComponent = props => {
  const { rows, getListings, onFetchRow } = props;
  const intl = useIntl();

  const listingImageConfig = useConfiguration().layout.listingImage;

  // Exactly two rows, both real listings sorted by newest - "Featured"
  // takes page 1, "Recent" takes page 2 of the same sort, so the two never
  // show the same listing twice (see homepageRows.duck.js's page support).
  // No separate "popularity" signal exists yet (no view/booking counts
  // tracked), so "Populair in regio Gent" is, honestly, "newest" today -
  // revisit once that data exists.
  const rowDefs = [
    {
      id: FEATURED_ROW_ID,
      title: intl.formatMessage({ id: 'HomepageListingRows.featured' }),
      searchQuery: '',
      searchParams: { sort: '-createdAt', page: 1 },
    },
    {
      id: RECENT_ROW_ID,
      title: intl.formatMessage({ id: 'HomepageListingRows.recent' }),
      searchQuery: '',
      searchParams: { sort: '-createdAt', page: 2 },
    },
  ];

  const rowKey = rowDefs.map(def => def.id).join('|');
  useEffect(() => {
    rowDefs.forEach(def => {
      if (!rows[def.id]) {
        onFetchRow({ rowId: def.id, searchParams: def.searchParams, listingImageConfig });
      }
    });
  }, [rowKey]);

  return (
    <div className={css.root}>
      <div className={css.inner}>
        {rowDefs.map(def => {
          const row = rows[def.id];
          const isLoading = !row || row.inProgress;
          const listings = row ? getListings(row.ids) : [];
          // Only show a row once we know it has something in it
          if (!isLoading && listings.length === 0) {
            return null;
          }
          return (
            <ListingRow
              key={def.id}
              title={def.title}
              searchQuery={def.searchQuery}
              listings={listings}
              isLoading={isLoading}
            />
          );
        })}
      </div>
    </div>
  );
};

const mapStateToProps = state => ({
  rows: state.homepageRows.rows,
  getListings: ids => getListingsById(state, ids),
});

const mapDispatchToProps = dispatch => ({
  onFetchRow: params => dispatch(fetchHomepageRow(params)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HomepageListingRowsComponent);
