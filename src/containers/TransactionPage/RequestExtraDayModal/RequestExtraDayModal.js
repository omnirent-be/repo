import React, { useMemo } from 'react';
import classNames from 'classnames';
import { Form as FinalForm } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { getStartOf, stringifyDateToISO8601 } from '../../../util/dates';
import { timeSlotsPerDate } from '../../../util/generators';

import { FieldTextInput, FieldDateRangeController, Form, Modal, Button } from '../../../components';

import IconPriceTag from './IconPriceTag';
import css from './RequestExtraDayModal.module.css';

// Flatten the monthlyTimeSlots state slice (keyed by "YYYY-MM") into a
// single array of raw TimeSlot entities.
const flattenTimeSlots = monthlyTimeSlots => {
  return Object.values(monthlyTimeSlots || {}).reduce((picked, monthData) => {
    return [...picked, ...(monthData?.timeSlots || [])];
  }, []);
};

// The first extra day is fixed (it must be contiguous with the current
// booking), so the only thing the customer actually chooses is the last
// extra day. Everything from the first already-unavailable day onwards is
// blocked, so the selected range can never jump over a day someone else
// already booked.
//
// Dates are compared as "YYYY-MM-DD" strings in the listing's own timezone,
// not as raw instants: the calendar widget hands back Date objects at
// midnight in the *browser's* local timezone, which is a different instant
// than midnight in the listing's timezone whenever the two differ - a plain
// isDateSameOrAfter() instant comparison would then wrongly exclude the
// fixed start day itself.
const useExtraDayCalendarPredicates = (fixedStartDate, maxEndDate, monthlyTimeSlots, timeZone) => {
  return useMemo(() => {
    if (!fixedStartDate || !timeZone) {
      return { isDayBlocked: () => false, isOutsideRange: () => true };
    }
    const timeSlots = flattenTimeSlots(monthlyTimeSlots);
    const perDate = timeSlotsPerDate(fixedStartDate, maxEndDate, timeSlots, timeZone);

    const startId = stringifyDateToISO8601(fixedStartDate, timeZone);
    const maxId = stringifyDateToISO8601(maxEndDate, timeZone);

    let firstUnavailableDateId = null;
    let cursor = fixedStartDate;
    let cursorId = startId;
    while (cursorId <= maxId) {
      const hasAvailability = perDate[cursorId]?.hasAvailability;
      if (cursorId !== startId && hasAvailability === false) {
        firstUnavailableDateId = cursorId;
        break;
      }
      cursor = getStartOf(cursor, 'day', timeZone, 1, 'days');
      cursorId = stringifyDateToISO8601(cursor, timeZone);
    }

    const isDayBlocked = day => {
      const dayId = stringifyDateToISO8601(day, timeZone);
      return firstUnavailableDateId ? dayId >= firstUnavailableDateId : false;
    };
    const isOutsideRange = day => {
      const dayId = stringifyDateToISO8601(day, timeZone);
      return dayId < startId || dayId > maxId;
    };

    return { isDayBlocked, isOutsideRange, firstUnavailableDateId };
  }, [fixedStartDate, maxEndDate, monthlyTimeSlots, timeZone]);
};

const dateRangeRequired = message => value => {
  return value?.startDate && value?.endDate ? undefined : message;
};

const RequestExtraDayForm = props => (
  <FinalForm
    {...props}
    render={fieldRenderProps => {
      const {
        className,
        rootClassName,
        disabled,
        handleSubmit,
        intl,
        formId,
        invalid,
        values,
        fixedStartDate,
        maxEndDate,
        isDayBlocked,
        isOutsideRange,
        firstUnavailableDateId,
        timeZone,
        requestExtraDaySubmitted,
        requestExtraDayError,
        requestExtraDayInProgress,
      } = fieldRenderProps;

      const errorMessageMaybe = requestExtraDayError ? (
        <FormattedMessage id="RequestExtraDayForm.submitFailed" />
      ) : null;

      const classes = classNames(rootClassName || css.formRoot, className);
      const submitInProgress = requestExtraDayInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;

      const selectedRange = values?.dateRange;
      const dayCount =
        selectedRange?.startDate && selectedRange?.endDate
          ? Math.round((selectedRange.endDate - selectedRange.startDate) / (1000 * 60 * 60 * 24)) +
            1
          : null;

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          <div className={css.dateRangeWrapper}>
            <FieldDateRangeController
              // The underlying calendar keeps its currently displayed month
              // in local state that only initializes on mount. Since the
              // fixed start date shifts every time an extra day is
              // requested and paid, the calendar must remount (not just
              // re-render) whenever that happens, or it keeps showing
              // whatever month was last displayed - which can end up
              // entirely outside the newly valid range (all days blocked).
              key={fixedStartDate ? fixedStartDate.getTime() : 'no-date'}
              name="dateRange"
              isDayBlocked={isDayBlocked}
              isOutsideRange={isOutsideRange}
              minimumNights={0}
              validate={dateRangeRequired(
                intl.formatMessage({ id: 'RequestExtraDayForm.dateRangeRequired' })
              )}
            />
            {firstUnavailableDateId ? (
              <p className={css.unavailableNotice}>
                <FormattedMessage
                  id="RequestExtraDayForm.unavailableFromDate"
                  values={{
                    date: intl.formatDate(new Date(`${firstUnavailableDateId}T00:00:00.000Z`), {
                      month: 'long',
                      day: 'numeric',
                      timeZone: 'UTC',
                    }),
                  }}
                />
              </p>
            ) : null}
            {dayCount ? (
              <p className={css.selectedRangeSummary}>
                <FormattedMessage
                  id="RequestExtraDayForm.selectedRangeSummary"
                  values={{
                    dayCount,
                    startDate: intl.formatDate(selectedRange.startDate, {
                      month: 'long',
                      day: 'numeric',
                    }),
                    endDate: intl.formatDate(selectedRange.endDate, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }),
                  }}
                />
              </p>
            ) : null}
          </div>
          <FieldTextInput
            className={css.counterOffer}
            id={formId ? `${formId}.note` : 'note'}
            name="note"
            type="textarea"
            label={intl.formatMessage({ id: 'RequestExtraDayForm.noteLabel' })}
            placeholder={intl.formatMessage({ id: 'RequestExtraDayForm.notePlaceholder' })}
          />
          <p className={css.errorPlaceholder}>{errorMessageMaybe}</p>
          <Button
            className={css.submitButton}
            type="submit"
            inProgress={requestExtraDayInProgress}
            disabled={submitDisabled}
            ready={requestExtraDaySubmitted}
          >
            {intl.formatMessage({ id: 'RequestExtraDayForm.submit' })}
          </Button>
        </Form>
      );
    }}
  />
);

const RequestExtraDayInfo = props => {
  const { onRequestExtraDay, fixedStartDate, ...restOfProps } = props;

  return (
    <>
      <p className={css.modalTitle}>
        <FormattedMessage id="RequestExtraDayModal.title" />
      </p>
      <p className={css.modalMessage}>
        <FormattedMessage id="RequestExtraDayModal.description" />
      </p>
      <RequestExtraDayForm
        onSubmit={onRequestExtraDay}
        initialValues={{ dateRange: { startDate: fixedStartDate } }}
        fixedStartDate={fixedStartDate}
        {...restOfProps}
      />
    </>
  );
};

/**
 * Modal for a customer to request one or more extra days on an already
 * accepted booking. The first extra day is fixed (the day right after the
 * current booking end, since the extension must be contiguous) - shown
 * pre-selected in the calendar. The customer only picks the last extra day,
 * via a real calendar that greys out days already booked by someone else.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @param {string} props.id
 * @param {boolean} props.isOpen
 * @param {Function} props.onCloseModal
 * @param {Function} props.onManageDisableScrolling
 * @param {Function} props.onRequestExtraDay
 * @param {Date} props.extraDayDate - the fixed first extra day (current booking end date)
 * @param {number} props.dayCountAvailableForBooking
 * @param {string} props.timeZone
 * @param {Object} props.monthlyTimeSlots
 * @param {boolean} props.requestExtraDaySubmitted
 * @param {boolean} props.requestExtraDayInProgress
 * @param {propTypes.error} props.requestExtraDayError
 * @returns {JSX.Element}
 */
const RequestExtraDayModal = props => {
  const intl = useIntl();
  const {
    className,
    rootClassName,
    id,
    isOpen = false,
    onCloseModal,
    focusElementId,
    onManageDisableScrolling,
    onRequestExtraDay,
    extraDayDate,
    dayCountAvailableForBooking,
    timeZone,
    monthlyTimeSlots,
    requestExtraDaySubmitted = false,
    requestExtraDayInProgress = false,
    requestExtraDayError,
  } = props;
  const classes = classNames(rootClassName || css.root, className);

  const maxEndDate = extraDayDate
    ? getStartOf(extraDayDate, 'day', timeZone, dayCountAvailableForBooking, 'days')
    : null;

  const { isDayBlocked, isOutsideRange, firstUnavailableDateId } = useExtraDayCalendarPredicates(
    extraDayDate,
    maxEndDate,
    monthlyTimeSlots,
    timeZone
  );

  return (
    <Modal
      id={id}
      containerClassName={classes}
      contentClassName={css.modalContent}
      isOpen={isOpen}
      onClose={onCloseModal}
      onManageDisableScrolling={onManageDisableScrolling}
      focusElementId={focusElementId}
      usePortal
    >
      <IconPriceTag className={css.modalIcon} />
      <RequestExtraDayInfo
        onRequestExtraDay={onRequestExtraDay}
        requestExtraDayInProgress={requestExtraDayInProgress}
        requestExtraDayError={requestExtraDayError}
        requestExtraDaySubmitted={requestExtraDaySubmitted}
        fixedStartDate={extraDayDate}
        maxEndDate={maxEndDate}
        isDayBlocked={isDayBlocked}
        isOutsideRange={isOutsideRange}
        firstUnavailableDateId={firstUnavailableDateId}
        timeZone={timeZone}
        intl={intl}
      />
    </Modal>
  );
};

export default RequestExtraDayModal;
