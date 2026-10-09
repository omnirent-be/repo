import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { getListingsById } from '../../../ducks/marketplaceData.duck';
import { fetchHomepageRow } from '../../../ducks/homepageRows.duck';
import { fetchListingsCountThunk } from '../../../ducks/listingsCount.duck';
import { ListingCard, NamedLink } from '../../../components';
import { trackEvent } from '../../../util/analytics';

import css from './HomepageListingRows.module.css';

const POPULAR_ROW_ID = 'popular';

// One strict 2x4 grid ("Populair voor feesten in Gent") rather than
// several separate carousels - with 200+ real listings behind this, one
// well-curated shelf makes a stronger first impression than many thin
// ones. A category chip (HomepageCategorySlider) narrows this same grid
// to just that category instead of swapping in a different layout.
const HomepageListingRowsComponent = props => {
  const { rows, getListings, onFetchRow, categoryFilter } = props;
  const intl = useIntl();
  const dispatch = useDispatch();
  const config = useConfiguration();
  const categoryKey = config.categoryConfiguration?.key || 'categoryLevel';
  const topCategory = config.categoryConfiguration?.categories?.[0];
  const subcategories = topCategory?.subcategories || [];
  const listingImageConfig = useConfiguration().layout.listingImage;

  const [totalCount, setTotalCount] = useState(null);
  useEffect(() => {
    dispatch(fetchListingsCountThunk())
      .unwrap()
      .then(setTotalCount)
      .catch(() => setTotalCount(null));
  }, []);

  const rowId = categoryFilter ? `category:${categoryFilter.subCategoryId}` : POPULAR_ROW_ID;
  const title = categoryFilter
    ? subcategories.find(s => s.id === categoryFilter.subCategoryId)?.name || ''
    : intl.formatMessage({ id: 'HomepageListingRows.popular' });
  const searchParams = categoryFilter
    ? {
        sort: '-createdAt',
        [`pub_${categoryKey}1`]: categoryFilter.topCategoryId,
        [`pub_${categoryKey}2`]: categoryFilter.subCategoryId,
      }
    : { sort: '-createdAt' };

  useEffect(() => {
    if (!rows[rowId]) {
      onFetchRow({
        rowId,
        searchParams,
        listingImageConfig,
        diversify: !categoryFilter,
        categoryField: `${categoryKey}2`,
      });
    }
  }, [rowId]);

  const row = rows[rowId];
  const isLoading = !row || row.inProgress;
  const listings = row ? getListings(row.ids) : [];

  return (
    <div className={css.root}>
      <div className={css.inner}>
        <h2 className={css.rowTitle}>{title}</h2>

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
                    showAuthorInfo={false}
                  />
                </li>
              ))}
        </ul>

        {!isLoading && listings.length === 0 ? (
          <p className={css.emptyRow}>
            <FormattedMessage id="HomepageListingRows.emptyCategory" />
          </p>
        ) : null}

        <div className={css.viewAllRow}>
          <NamedLink
            name="SearchPage"
            to={{ search: '' }}
            className={css.viewAllButton}
            onClick={() => trackEvent('view_all_listings_clicked')}
          >
            {totalCount != null ? (
              <FormattedMessage id="HomepageListingRows.viewAllWithCount" values={{ count: totalCount }} />
            ) : (
              <FormattedMessage id="HomepageListingRows.viewAll" />
            )}
            <span className={css.viewAllArrow} aria-hidden="true">
              →
            </span>
          </NamedLink>
        </div>
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
