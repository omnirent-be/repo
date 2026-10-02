import React, { useEffect, useState } from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { stringifyDateToISO8601 } from '../../../util/dates';
import { OutsideClickHandler, FieldDateRangeController, IconSearch } from '../../../components';

import css from './SearchCapsule.module.css';

// Same 3 buckets as the 'region' listing field injected in
// configHelpers.js's mergeListingConfig - kept as a plain constant here
// rather than read from config, since this is just display text for a
// fixed, known set of options (adding a 4th option means updating both
// places, same as any other hardcoded UI copy).
const REGION_OPTIONS = [
  { key: 'gent-centrum', label: 'Gent Centrum (9000)' },
  { key: 'groot-gent', label: 'Groot-Gent (< 10 km)' },
  { key: 'regio-oost-vlaanderen', label: 'Regio Oost-Vlaanderen' },
];

// Quick-fill shortcuts for the keyword segment's expanded popover - the
// same kind of thing a "popular searches" list would show, but there's no
// real search-term tracking to draw that from yet, so this is a fixed set
// of OmniRent's actual, common categories rather than invented copy.
const QUICK_KEYWORDS = ['Partytent', 'Cortenstaal BBQ', 'Biertafels', 'Mobiele tapbar'];

const formatDateRangeLabel = (intl, startDate, endDate) => {
  if (!startDate || !endDate) {
    return null;
  }
  const format = { month: 'short', day: 'numeric' };
  return `${intl.formatDate(startDate, format)} - ${intl.formatDate(endDate, format)}`;
};

/**
 * A single combined search bar for the search results page: keywords,
 * location (region), and a date range, submitted together. Reuses the
 * exact same URL query params as the sidebar's own keyword/Locatie/Datums
 * filters (keywords, pub_region, dates) via the same onSubmit handler
 * (getHandleChangedValueFn from SearchPage.shared.js), so this is just a
 * second, faster entry point to the same filters - not a parallel
 * filtering mechanism.
 *
 * Desktop behaviour (the "expanding pill" pattern): at rest it's a
 * compact, centered pill showing the current values as plain text; a
 * click on any segment expands it in place (with a dimmed page backdrop)
 * into a larger bar where that segment's own editable control/popover is
 * shown, and the other two segments stay visible as smaller tabs that
 * switch which popover is active. Collapses on an outside click or
 * Escape. The mobile variant (isMobile) skips all of this - it's always
 * "expanded" (full-height stacked fields), since there's no spare space
 * for a resting/expanded distinction on a phone screen.
 *
 * @component
 * @param {Object} props
 * @param {boolean} [props.isMobile] - use the stacked, always-visible layout
 *   (Topbar's mobile search modal) instead of the default pill shape, which
 *   is hidden below the viewportMedium breakpoint
 * @param {Object} props.initialValues - { keywords, pub_region, dates } from the current URL
 * @param {Function} props.onSubmit - called with the updated URL params object
 * @returns {JSX.Element}
 */
const SearchCapsule = props => {
  const { className, rootClassName, isMobile, initialValues = {}, onSubmit } = props;
  const intl = useIntl();
  // Which segment's popover is currently showing. On mobile every segment
  // is always "active" at once (they're just stacked, see .mobileRoot), so
  // this only matters for the desktop pill.
  const [activeSegment, setActiveSegment] = useState(null);
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

  const initialDates = initialValues.dates
    ? (() => {
        const [start, end] = initialValues.dates.split(',');
        return start && end ? { startDate: new Date(start), endDate: new Date(end) } : null;
      })()
    : null;

  const handleSubmit = values => {
    const { keywords, region, dates } = values;
    const { startDate, endDate } = dates || {};
    const datesParam =
      startDate && endDate
        ? `${stringifyDateToISO8601(startDate)},${stringifyDateToISO8601(endDate)}`
        : null;

    collapse();
    onSubmit({
      keywords: keywords || null,
      pub_region: region || null,
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
          keywords: initialValues.keywords || '',
          region: initialValues.pub_region || '',
          dates: initialDates,
        }}
        render={({ handleSubmit: formHandleSubmit, values }) => {
          const dateLabel = formatDateRangeLabel(
            intl,
            values.dates?.startDate,
            values.dates?.endDate
          );
          const regionLabel = values.region
            ? REGION_OPTIONS.find(opt => opt.key === values.region)?.label
            : intl.formatMessage({ id: 'SearchCapsule.regionAny' });

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
                  className={segmentClasses('keywords')}
                  onClick={() => !isMobile && setActiveSegment('keywords')}
                >
                  <label className={css.segmentLabel} htmlFor="searchCapsuleKeywords">
                    <FormattedMessage id="SearchCapsule.keywordsLabel" />
                  </label>
                  <Field name="keywords">
                    {({ input }) =>
                      isMobile || activeSegment === 'keywords' ? (
                        <input
                          {...input}
                          id="searchCapsuleKeywords"
                          className={css.segmentInput}
                          type="text"
                          autoFocus={!isMobile}
                          placeholder={intl.formatMessage({
                            id: 'SearchCapsule.keywordsPlaceholder',
                          })}
                        />
                      ) : (
                        <span className={css.segmentValue}>
                          {input.value ||
                            intl.formatMessage({ id: 'SearchCapsule.keywordsPlaceholder' })}
                        </span>
                      )
                    }
                  </Field>
                  {!isMobile && activeSegment === 'keywords' ? (
                    <div className={css.popover}>
                      <div className={css.quickOptions}>
                        {QUICK_KEYWORDS.map(keyword => (
                          <Field name="keywords" key={keyword}>
                            {({ input }) => (
                              <button
                                type="button"
                                className={css.quickOptionButton}
                                onClick={() => input.onChange(keyword)}
                              >
                                {keyword}
                              </button>
                            )}
                          </Field>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className={css.divider} />

                <div
                  className={segmentClasses('region')}
                  onClick={() => !isMobile && setActiveSegment('region')}
                >
                  <label className={css.segmentLabel} htmlFor="searchCapsuleRegionToggle">
                    <FormattedMessage id="SearchCapsule.regionLabel" />
                  </label>
                  {isMobile ? (
                    <Field name="region">
                      {({ input }) => (
                        <select {...input} id="searchCapsuleRegionToggle" className={css.segmentSelect}>
                          <option value="">
                            {intl.formatMessage({ id: 'SearchCapsule.regionAny' })}
                          </option>
                          {REGION_OPTIONS.map(opt => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                  ) : (
                    <span id="searchCapsuleRegionToggle" className={css.segmentValue}>
                      {regionLabel}
                    </span>
                  )}
                  {!isMobile && activeSegment === 'region' ? (
                    <div className={css.popover}>
                      <Field name="region">
                        {({ input }) => (
                          <div className={css.optionList}>
                            <button
                              type="button"
                              className={classNames(css.optionListItem, {
                                [css.optionListItemActive]: !input.value,
                              })}
                              onClick={() => input.onChange('')}
                            >
                              {intl.formatMessage({ id: 'SearchCapsule.regionAny' })}
                            </button>
                            {REGION_OPTIONS.map(opt => (
                              <button
                                type="button"
                                key={opt.key}
                                className={classNames(css.optionListItem, {
                                  [css.optionListItemActive]: input.value === opt.key,
                                })}
                                onClick={() => input.onChange(opt.key)}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </Field>
                    </div>
                  ) : null}
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

                <button type="submit" className={css.submitButton} aria-label="Search">
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
