import React, { Component, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { parse } from '../../util/urlHelpers';
import { parseSelectFilterOptions } from '../../util/search';
import { useConfiguration } from '../../context/configurationContext';
import { makeGetListingsByIdSelector } from '../../ducks/marketplaceData.duck';
import { manageDisableScrolling, isScrollingDisabled } from '../../ducks/ui.duck';
import { toggleFavoriteListing, getFavoriteListingIds } from '../../ducks/user.duck';
import { loadMoreSearchResults } from './SearchPage.duck';

import { Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import {
  initialValues,
  validUrlQueryParamsFromProps,
  getDerivedRenderData,
  onResetAll,
  createFilterValueChangeHandler,
  onSortBy,
} from './SearchPage.shared';

import { CATEGORY_ICONS } from './CategoryIcons';
import FilterComponent from './FilterComponent';
import SearchFiltersMobile from './SearchFiltersMobile/SearchFiltersMobile';
import SortBy from './SortBy/SortBy';
import SearchResultsPanel from './SearchResultsPanel/SearchResultsPanel';
import NoSearchResultsMaybe from './NoSearchResultsMaybe/NoSearchResultsMaybe';
import SearchPageAccessWrapper from './SearchPageAccessWrapper';
import SearchErrors from './SearchErrors';

import css from './SearchPage.module.css';

// Quick-filter chips for the top-level category's subcategories, e.g. the
// six subcategories under "Feest & Events" (Tent & Structuren, Catering &
// Keuken, ...). Lets a visitor jump straight into a subcategory without
// opening the full filter panel first.
const CategoryQuickNav = props => {
  const { listingCategories, location, history } = props;
  const topCategory = listingCategories?.[0];
  const subcategories = topCategory?.subcategories || [];

  if (!topCategory || subcategories.length === 0) {
    return null;
  }

  const activeCategoryLevel2 = parse(location.search)?.pub_categoryLevel2;

  const handleClick = (e, sub) => {
    e.preventDefault();
    const isActive = activeCategoryLevel2 === sub.id;
    const search = isActive ? '' : `?pub_categoryLevel1=${topCategory.id}&pub_categoryLevel2=${sub.id}`;
    history.push(`/s${search}`);
  };

  return (
    <div className={css.categoryQuickNav}>
      {subcategories.map(sub => {
        const isActive = activeCategoryLevel2 === sub.id;
        const CategoryIcon = CATEGORY_ICONS[sub.id];
        return (
          <a
            key={sub.id}
            href={`/s?pub_categoryLevel1=${topCategory.id}&pub_categoryLevel2=${sub.id}`}
            className={classNames(css.categoryChip, { [css.categoryChipActive]: isActive })}
            onClick={e => handleClick(e, sub)}
          >
            {CategoryIcon ? (
              <span className={css.categoryChipIcon}>
                <CategoryIcon />
              </span>
            ) : null}
            {sub.name}
          </a>
        );
      })}
    </div>
  );
};

// Icon-tile quick filters shown at the top of the mobile filters panel
// (the six subcategories, same data/icons as CategoryQuickNav above, just
// styled as a tile grid instead of a chip row). Unlike CategoryQuickNav's
// raw history.push (which replaces the whole query string), this goes
// through onChangeCategory so it merges with - rather than discards -
// whatever other filters (price, dates, ...) are already active in the
// panel.
const CategoryFilterTiles = props => {
  const { listingCategories, activeCategoryLevel2, onChangeCategory } = props;
  const topCategory = listingCategories?.[0];
  const subcategories = topCategory?.subcategories || [];

  if (!topCategory || subcategories.length === 0) {
    return null;
  }

  return (
    <div className={css.categoryTilesSection}>
      <h3 className={css.filterSectionHeading}>
        <FormattedMessage id="SearchFiltersMobile.categoryTilesHeading" />
      </h3>
      <div className={css.categoryTilesGrid}>
        {subcategories.map(sub => {
          const isActive = activeCategoryLevel2 === sub.id;
          const CategoryIcon = CATEGORY_ICONS[sub.id];
          return (
            <button
              key={sub.id}
              type="button"
              className={classNames(css.categoryTile, { [css.categoryTileActive]: isActive })}
              onClick={() => onChangeCategory(isActive ? null : sub, topCategory)}
            >
              {CategoryIcon ? (
                <span className={css.categoryTileIcon}>
                  <CategoryIcon />
                </span>
              ) : null}
              <span className={css.categoryTileLabel}>{sub.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Segmented Ophalen/Levering control for the mobile filters panel, replacing
// the generic checkbox-list rendering of the 'deliveryOptions' multi-enum
// filter with 3 mutually-exclusive options - simpler to scan than
// checkboxes for a field that in practice is used as either/or/both.
const DELIVERY_SEGMENTS = [
  { key: 'all', value: null },
  { key: 'pickup', value: 'pickup' },
  { key: 'shipping', value: 'shipping' },
];

const DeliveryMethodSegmented = props => {
  const { activeValue, onChange } = props;

  return (
    <div className={css.deliveryFilterSection}>
      <h3 className={css.filterSectionHeading}>
        <FormattedMessage id="SearchFiltersMobile.deliveryMethodHeading" />
      </h3>
      <div className={css.segmentedControl}>
        {DELIVERY_SEGMENTS.map(segment => {
          const isActive = activeValue === segment.value;
          return (
            <button
              key={segment.key}
              type="button"
              className={classNames(css.segmentedButton, {
                [css.segmentedButtonActive]: isActive,
              })}
              onClick={() => onChange(segment.value)}
            >
              <FormattedMessage id={`SearchFiltersMobile.deliveryMethod.${segment.key}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ModalInMobile has 3 view states, chosen by comparing viewport.width to
// this value: below it, the filters panel is a real overlay (Modal, with
// its own backdrop/close button); above it, it falls back to "just an
// extra wrapper" rendered inline - a desktop-sidebar-shaped filter list was
// what originally sat there. Now that the sidebar is gone (see
// .layoutWrapperFilterColumn), Infinity keeps this always in the "mobile"
// (real overlay) state, at every width, so pressing "Filters" opens the
// same centered, backdropped dialog on desktop too.
const MODAL_BREAKPOINT = Infinity;

// SortBy component has its content in dropdown-popup.
// With this offset we move the dropdown a few pixels on desktop layout.
const FILTER_DROPDOWN_OFFSET = -14;

// Nested category selections arrive as several params (categoryLevel1, 2, 3)
// but are one filter for the user, so count them once.
const activeFilterCount = queryParams =>
  new Set(
    Object.keys(queryParams || {})
      .filter(key => key !== 'keywords')
      .map(key => (/categoryLevel\d+$/.test(key) ? 'category' : key))
  ).size;

export class SearchPageComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isMobileModalOpen: false,
      currentQueryParams: validUrlQueryParamsFromProps(props),
    };

    this.onOpenMobileModal = this.onOpenMobileModal.bind(this);
    this.onCloseMobileModal = this.onCloseMobileModal.bind(this);

    // Filter functions
    this.resetAll = this.resetAll.bind(this);
    this.getHandleChangedValueFn = this.getHandleChangedValueFn.bind(this);

    // SortBy
    this.handleSortBy = this.handleSortBy.bind(this);
  }

  // Invoked when a modal is opened from a child component,
  // for example when a filter modal is opened in mobile view
  onOpenMobileModal() {
    this.setState({ isMobileModalOpen: true });
  }

  // Invoked when a modal is closed from a child component,
  // for example when a filter modal is opened in mobile view
  onCloseMobileModal() {
    this.setState({ isMobileModalOpen: false });
  }

  // Reset all filter query parameters
  resetAll(e) {
    const { history, routeConfiguration, config, location } = this.props;
    onResetAll({
      history,
      routeConfiguration,
      config,
      location,
      urlQueryParams: validUrlQueryParamsFromProps(this.props),
      setState: this.setState.bind(this),
    });
  }

  getHandleChangedValueFn(useHistoryPush) {
    const {
      history,
      routeConfiguration,
      config,
      location,
      params: currentPathParams = {},
    } = this.props;

    return createFilterValueChangeHandler(
      {
        history,
        routeConfiguration,
        config,
        location,
        currentPathParams,
        urlQueryParams: validUrlQueryParamsFromProps(this.props),
        setState: this.setState.bind(this),
        getState: () => this.state,
      },
      useHistoryPush
    );
  }

  handleSortBy(urlParam, values) {
    const { history, routeConfiguration, location } = this.props;
    onSortBy({
      history,
      routeConfiguration,
      location,
      urlQueryParams: validUrlQueryParamsFromProps(this.props),
      urlParam,
      values,
    });
  }

  // Reset all filter query parameters
  handleResetAll(e) {
    this.resetAll(e);

    // blur event target if event is passed
    if (e && e.currentTarget) {
      e.currentTarget.blur();
    }
  }

  render() {
    const {
      intl,
      listings = [],
      location,
      onManageDisableScrolling,
      pagination,
      scrollingDisabled,
      searchInProgress,
      searchListingsError,
      searchParams = {},
      routeConfiguration,
      config,
      params: currentPathParams = {},
      currentUser,
      onToggleFavoriteListing,
      favoriteListingIdInProgress,
      onLoadMore,
      loadMoreInProgress,
    } = this.props;

    const favoriteListingIds = getFavoriteListingIds(currentUser);

    const {
      listingTypePathParam,
      sortConfig,
      validQueryParams,
      availableFilters,
      selectedFilters,
      isValidDatesFilter,
      selectedFiltersCountForMobile,
      totalItems,
      listingsAreLoaded,
      conflictingFilterActive,
      showCreateListingsLink,
      title,
      description,
      schema,
      marketplaceCurrency,
      listingCategories,
    } = getDerivedRenderData({
      intl,
      location,
      config,
      routeConfiguration,
      searchParams,
      pagination,
      listings,
      searchInProgress,
      currentPathParams,
      currentUser,
    });

    const sortBy = mode => {
      return sortConfig.active ? (
        <SortBy
          sort={validQueryParams[sortConfig.queryParamName]}
          isConflictingFilterActive={!!conflictingFilterActive}
          hasConflictingFilters={!!(sortConfig.conflictingFilters?.length > 0)}
          selectedFilters={selectedFilters}
          onSelect={this.handleSortBy}
          showAsPopup
          mode={mode}
          labelId={`${mode}-search-page-sort-by`}
          contentPlacementOffset={FILTER_DROPDOWN_OFFSET}
        />
      ) : null;
    };
    const noResultsInfo = (
      <NoSearchResultsMaybe
        listingsAreLoaded={listingsAreLoaded}
        totalItems={totalItems}
        location={location}
        resetAll={this.resetAll}
        showCreateListingsLink={showCreateListingsLink}
      />
    );

    // Set topbar class based on if a modal is open in
    // a child component
    const topbarClasses = this.state.isMobileModalOpen
      ? classNames(css.topbarBehindModal, css.topbar)
      : css.topbar;

    // N.B. openMobileMap button is sticky.
    // For some reason, stickyness doesn't work on Safari, if the element is <button>
    return (
      <Page
        scrollingDisabled={scrollingDisabled}
        description={description}
        title={title}
        schema={schema}
      >
        <TopbarContainer rootClassName={topbarClasses} currentSearchParams={validQueryParams} />
        <div className={css.layoutWrapperContainer}>
          <aside className={css.layoutWrapperFilterColumn} data-testid="filterColumnAside">
            <div className={css.filterColumnContent}>
              {availableFilters.map(filterConfig => {
                const key = `SearchFiltersDesktop.${filterConfig.scope || 'built-in'}.${
                  filterConfig.key
                }`;
                const filterId = `SearchFiltersDesktop.${filterConfig.key.toLowerCase()}`;
                return (
                  <FilterComponent
                    key={key}
                    id={filterId}
                    className={css.filter}
                    config={filterConfig}
                    containerId="SearchPageWithGrid_DesktopFilters"
                    listingCategories={listingCategories}
                    marketplaceCurrency={marketplaceCurrency}
                    urlQueryParams={validQueryParams}
                    initialValues={initialValues(this.props, this.state.currentQueryParams)}
                    getHandleChangedValueFn={this.getHandleChangedValueFn}
                    intl={intl}
                    liveEdit
                    showAsPopup={false}
                    isDesktop
                  />
                );
              })}
              {selectedFiltersCountForMobile > 0 ? (
                <button className={css.resetAllButton} onClick={e => this.handleResetAll(e)}>
                  <FormattedMessage id={'SearchFiltersMobile.resetAll'} />
                  <span className={css.resetAllCount}>{activeFilterCount(validQueryParams)}</span>
                </button>
              ) : null}
            </div>
          </aside>

          <div id="main-content" className={css.layoutWrapperMain} role="main">
            <div className={css.searchResultContainer}>
              <CategoryQuickNav
                listingCategories={listingCategories}
                location={location}
                history={this.props.history}
              />
              <SearchFiltersMobile
                className={css.searchFiltersMobileList}
                urlQueryParams={validQueryParams}
                sortByComponent={sortBy('mobile')}
                listingsAreLoaded={listingsAreLoaded}
                resultsCount={totalItems}
                searchInProgress={searchInProgress}
                searchListingsError={searchListingsError}
                showAsModalMaxWidth={MODAL_BREAKPOINT}
                onManageDisableScrolling={onManageDisableScrolling}
                onOpenModal={this.onOpenMobileModal}
                onCloseModal={this.onCloseMobileModal}
                resetAll={this.resetAll}
                selectedFiltersCount={selectedFiltersCountForMobile}
                isMapVariant={false}
                noResultsInfo={noResultsInfo}
                location={location}
              >
                <CategoryFilterTiles
                  listingCategories={listingCategories}
                  activeCategoryLevel2={validQueryParams.pub_categoryLevel2}
                  onChangeCategory={(sub, topCategory) =>
                    this.getHandleChangedValueFn(true)({
                      pub_categoryLevel1: sub ? topCategory.id : null,
                      pub_categoryLevel2: sub ? sub.id : null,
                    })
                  }
                />
                {availableFilters.map(filterConfig => {
                  const key = `SearchFiltersMobile.${filterConfig.scope || 'built-in'}.${
                    filterConfig.key
                  }`;
                  const filterId = `SearchFiltersMobile.${filterConfig.key.toLowerCase()}`;

                  // Rendered separately as a segmented control (see
                  // DeliveryMethodSegmented) instead of through the generic
                  // checkbox-list FilterComponent dispatch.
                  if (filterConfig.key === 'deliveryOptions') {
                    // The resolved filterConfig defaults searchMode to
                    // 'has_all' (see validSearchMode in configHelpers.js),
                    // so the query param round-trips as e.g.
                    // "has_all:pickup" - same format SelectMultipleFilter's
                    // own format() function would produce/expect.
                    const selectedDeliveryOptions = validQueryParams.pub_deliveryOptions
                      ? parseSelectFilterOptions(validQueryParams.pub_deliveryOptions)
                      : [];
                    return (
                      <DeliveryMethodSegmented
                        key={key}
                        activeValue={selectedDeliveryOptions[0] || null}
                        onChange={value =>
                          this.getHandleChangedValueFn(true)({
                            pub_deliveryOptions: value ? `has_all:${value}` : null,
                          })
                        }
                      />
                    );
                  }

                  return (
                    <FilterComponent
                      key={key}
                      id={filterId}
                      config={filterConfig}
                      containerId="SearchPage_MobileFilters"
                      listingCategories={listingCategories}
                      marketplaceCurrency={marketplaceCurrency}
                      urlQueryParams={validQueryParams}
                      initialValues={initialValues(this.props, this.state.currentQueryParams)}
                      getHandleChangedValueFn={this.getHandleChangedValueFn}
                      intl={intl}
                      liveEdit
                      showAsPopup={false}
                    />
                  );
                })}
              </SearchFiltersMobile>
              <div
                className={classNames(css.listingsForGridVariant, {
                  [css.newSearchInProgress]: !(listingsAreLoaded || searchListingsError),
                })}
              >
                <SearchErrors
                  searchListingsError={searchListingsError}
                  isValidDatesFilter={isValidDatesFilter}
                />
                <SearchResultsPanel
                  className={css.searchListingsPanel}
                  listings={listings}
                  pagination={listingsAreLoaded ? pagination : null}
                  search={parse(location.search)}
                  isMapVariant={false}
                  listingTypeParam={listingTypePathParam}
                  intl={intl}
                  currentUser={currentUser}
                  favoriteListingIds={favoriteListingIds}
                  onToggleFavoriteListing={onToggleFavoriteListing}
                  favoriteListingIdInProgress={favoriteListingIdInProgress}
                  onLoadMore={onLoadMore}
                  loadMoreInProgress={loadMoreInProgress}
                />
              </div>
            </div>
          </div>
        </div>
        <FooterContainer />
      </Page>
    );
  }
}

/**
 * SearchPage "container" (grid layout): selects Redux state and dispatch handlers, then passes the
 * same prop surface as before to `SearchPageComponent` via `SearchPageAccessWrapper`.
 *
 * @param {Object} props - Router / route props from `routeConfiguration.js` and `Routes.js`
 * @returns {JSX.Element}
 */
const SearchPage = props => {
  const dispatch = useDispatch();
  const config = useConfiguration();
  const selectListingsById = useMemo(makeGetListingsByIdSelector, []);

  const currentUser = useSelector(state => state.user?.currentUser);
  const {
    pagination,
    searchInProgress,
    loadMoreInProgress,
    searchListingsError,
    searchParams,
  } = useSelector(state => state.SearchPage);
  const listings = useSelector(state =>
    selectListingsById(state, state.SearchPage.currentPageResultIds)
  );
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));
  const favoriteListingIdInProgress = useSelector(
    state => state.user?.favoriteListingIdInProgress
  );

  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) =>
      dispatch(manageDisableScrolling(componentId, disableScrolling)),
    [dispatch]
  );
  const onToggleFavoriteListing = useCallback(
    listingId => dispatch(toggleFavoriteListing(listingId)),
    [dispatch]
  );
  const onLoadMore = useCallback(() => dispatch(loadMoreSearchResults(config)), [
    dispatch,
    config,
  ]);

  return (
    <SearchPageAccessWrapper
      {...props}
      PageComponent={SearchPageComponent}
      currentUser={currentUser}
      listings={listings}
      pagination={pagination}
      scrollingDisabled={scrollingDisabled}
      favoriteListingIdInProgress={favoriteListingIdInProgress}
      onToggleFavoriteListing={onToggleFavoriteListing}
      searchInProgress={searchInProgress}
      loadMoreInProgress={loadMoreInProgress}
      onLoadMore={onLoadMore}
      searchListingsError={searchListingsError}
      searchParams={searchParams}
      onManageDisableScrolling={onManageDisableScrolling}
    />
  );
};

export default SearchPage;
