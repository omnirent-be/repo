import React, { useEffect, useState } from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { useConfiguration } from '../../../context/configurationContext';
import { stringifyDateToISO8601, parseDateFromISO8601 } from '../../../util/dates';
import { isOriginInUse } from '../../../util/search';
import defaultLocations from '../../../config/configDefaultLocationSearches';
import {
  OutsideClickHandler,
  FieldDateRangeController,
  IconSearch,
  ProductSearchField,
} from '../../../components';
import FilterLocation from '../../PageBuilder/Primitives/SearchCTA/FilterLocation/FilterLocation';

import css from './SearchCapsule.module.css';

const GENT_DEFAULT = defaultLocations.find(l => l.id === 'default-gent');

const formatDateRangeLabel = (intl, startDate, endDate) => {
  if (!startDate || !endDate) {
    return null;
  }
  const format = { month: 'short', day: 'numeric' };
  return `${intl.formatDate(startDate, format)} - ${intl.formatDate(endDate, format)}`;
};

/**
 * The single unified search module (homepage conversion audit, Oct 2026),
 * used as the Topbar's search form everywhere: Product ("Wat zoek je?",
 * autocomplete over categories and real listings), Locatie ("Gent of
 * postcode", prefilled but editable) and Datum, submitted together -
 * exactly the same three fields and the same URL query params
 * (keywords/pub_categoryLevel1/pub_categoryLevel2, bounds/address/origin,
 * dates) as the hero's own UnifiedSearchForm and the SearchPage sidebar's
 * own filters, so this is one predictable search model, not a second,
 * parallel one.
 *
 * Desktop behaviour (the "expanding pill" pattern): at rest it's a
 * compact, centered pill showing the current values as plain text; a
 * click on any segment expands it in place (with a dimmed page backdrop)
 * into a larger bar where that segment's own editable control is shown,
 * and the other two segments stay visible as smaller tabs that switch
 * which one is active. Collapses on an outside click or Escape. The
 * mobile variant (isMobile) skips all of this - it's always "expanded"
 * (full-height stacked fields), since there's no spare space for a
 * resting/expanded distinction on a phone screen.
 *
 * @component
 * @param {Object} props
 * @param {boolean} [props.isMobile] - use the stacked, always-visible layout
 *   (Topbar's mobile search modal) instead of the default pill shape, which
 *   is hidden below the viewportMedium breakpoint
 * @param {Object} props.initialValues - { keywords, pub_categoryLevel1,
 *   pub_categoryLevel2, address, bounds, origin, dates } from the current URL
 * @param {Function} props.onSubmit - called with the updated URL params object
 * @returns {JSX.Element}
 */
const SearchCapsule = props => {
  const { className, rootClassName, isMobile, initialValues = {}, onSubmit } = props;
  const intl = useIntl();
  const config = useConfiguration();
  // Which segment's popover is currently showing. On mobile every segment
  // is always "active" at once (they're just stacked, see .mobileRoot), so
  // this only matters for the desktop pill.
  const [activeSegment, setActiveSegment] = useState(null);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const isExpanded = isMobile || activeSegment != null;

  const collapse = () => setActiveSegment(null);

  useEffect(() => {
    if (isMobile || activeSegment == null) {
      return undefined;
    }
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        collapse();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, activeSegment]);

  // parseDateFromISO8601 (not `new Date(isoString)`) - a plain Date-only
  // string parses as UTC midnight, which shifts a day in any timezone
  // behind UTC once displayed locally.
  const initialDates = initialValues.dates
    ? (() => {
        const [start, end] = initialValues.dates.split(',');
        return start && end
          ? { startDate: parseDateFromISO8601(start), endDate: parseDateFromISO8601(end) }
          : null;
      })()
    : null;

  const topCategory = config.categoryConfiguration?.categories?.[0];
  const subcategories = topCategory?.subcategories || [];
  const initialCategory = initialValues.pub_categoryLevel2
    ? (() => {
        const sub = subcategories.find(s => s.id === initialValues.pub_categoryLevel2);
        return sub
          ? { topCategoryId: initialValues.pub_categoryLevel1, subCategoryId: sub.id, name: sub.name }
          : null;
      })()
    : null;
  const initialProduct = {
    text: initialCategory?.name || initialValues.keywords || '',
    category: initialCategory,
  };
  const initialLocation = initialValues.address
    ? {
        search: initialValues.address,
        predictions: [],
        selectedPlace: {
          address: initialValues.address,
          bounds: initialValues.bounds,
          origin: initialValues.origin,
        },
      }
    : GENT_DEFAULT
    ? {
        search: GENT_DEFAULT.predictionPlace.address,
        predictions: [],
        selectedPlace: GENT_DEFAULT.predictionPlace,
      }
    : undefined;

  const handleSubmit = values => {
    const { product, location, dates } = values;
    const { startDate, endDate } = dates || {};
    const datesParam =
      startDate && endDate
        ? `${stringifyDateToISO8601(startDate)},${stringifyDateToISO8601(endDate)}`
        : null;
    const hasOrigin =
      location?.selectedPlace?.origin && isOriginInUse(config) ? location.selectedPlace.origin : null;

    collapse();
    onSubmit({
      keywords: product?.category ? null : product?.text || null,
      pub_categoryLevel1: product?.category?.topCategoryId || null,
      pub_categoryLevel2: product?.category?.subCategoryId || null,
      address: location?.selectedPlace ? location.search : null,
      bounds: location?.selectedPlace ? location.selectedPlace.bounds : null,
      origin: hasOrigin ? `${hasOrigin.lat},${hasOrigin.lng}` : null,
      dates: datesParam,
    });
  };

  return (
    <>
      {/* Dims and blurs the rest of the page while expanded, so the search
          module is the only thing left to interact with - also the click
          target that collapses the capsule again. */}
      {isExpanded && !isMobile ? <div className={css.backdrop} onClick={collapse} /> : null}
      <FinalForm
        onSubmit={handleSubmit}
        initialValues={{
          product: initialProduct,
          location: initialLocation,
          dates: initialDates,
        }}
        render={({ handleSubmit: formHandleSubmit, values }) => {
          const dateLabel = formatDateRangeLabel(
            intl,
            values.dates?.startDate,
            values.dates?.endDate
          );

          const segmentClasses = (segment, extra) =>
            classNames(css.segment, extra, {
              [css.segmentActive]: !isMobile && activeSegment === segment,
            });

          return (
            <OutsideClickHandler
              rootClassName={isMobile ? css.mobileOutsideClickWrapper : css.outsideClickWrapper}
              onOutsideClick={collapse}
            >
              <form
                className={classNames(
                  rootClassName || (isMobile ? css.mobileRoot : css.root),
                  { [css.rootExpanded]: isExpanded && !isMobile },
                  className
                )}
                onSubmit={formHandleSubmit}
              >
                <div
                  className={segmentClasses('product')}
                  onClick={() => !isMobile && setActiveSegment('product')}
                >
                  <label className={css.segmentLabel} htmlFor="searchCapsuleProduct">
                    <FormattedMessage id="SearchCapsule.productLabel" />
                  </label>
                  {isMobile || activeSegment === 'product' ? (
                    <ProductSearchField name="product" alignLeft />
                  ) : (
                    <span id="searchCapsuleProduct" className={css.segmentValue}>
                      {values.product?.category?.name ||
                        values.product?.text ||
                        intl.formatMessage({ id: 'ProductSearchField.placeholder' })}
                    </span>
                  )}
                </div>

                <div className={css.divider} />

                <div
                  className={segmentClasses('location')}
                  onClick={() => !isMobile && setActiveSegment('location')}
                >
                  <label className={css.segmentLabel} htmlFor="searchCapsuleLocation">
                    <FormattedMessage id="SearchCapsule.locationLabel" />
                  </label>
                  {isMobile || activeSegment === 'location' ? (
                    <FilterLocation setSubmitDisabled={setSubmitDisabled} alignLeft />
                  ) : (
                    <span id="searchCapsuleLocation" className={css.segmentValue}>
                      {values.location?.search ||
                        intl.formatMessage({ id: 'UnifiedSearchForm.locationPlaceholder' })}
                    </span>
                  )}
                </div>

                <div className={css.divider} />

                <div
                  className={segmentClasses('dates')}
                  onClick={() =>
                    setActiveSegment(prev =>
                      isMobile ? (prev === 'dates' ? null : 'dates') : 'dates'
                    )
                  }
                >
                  <label className={css.segmentLabel} htmlFor="searchCapsuleDateToggle">
                    <FormattedMessage id="SearchCapsule.datesLabel" />
                  </label>
                  <span id="searchCapsuleDateToggle" className={css.segmentValue}>
                    {dateLabel || intl.formatMessage({ id: 'SearchCapsule.datesPlaceholder' })}
                  </span>
                  {/* Only mounted while active - this is now a global,
                      always-rendered part of the Topbar on every page, so
                      the heavy calendar DOM (month grids, day cells) must
                      not sit in every page's markup at all times. Final
                      Form keeps the field's value in form state on unmount
                      by default (destroyOnUnregister is false), so
                      closing/reopening the picker doesn't lose an
                      already-picked date range. */}
                  {activeSegment === 'dates' ? (
                    <div className={isMobile ? css.datePickerPopup : css.popover}>
                      <FieldDateRangeController name="dates" />
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className={css.submitButton}
                  aria-label="Search"
                  disabled={submitDisabled}
                >
                  <IconSearch rootClassName={css.submitIcon} />
                </button>
              </form>
            </OutsideClickHandler>
          );
        }}
      />
    </>
  );
};

export default SearchCapsule;
