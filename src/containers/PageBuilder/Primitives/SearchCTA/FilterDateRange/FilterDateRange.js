import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';

import { useIntl } from '../../../../../util/reactIntl';

import { OutsideClickHandler, IconDate, FieldDateRangeController } from '../../../../../components';

import css from './FilterDateRange.module.css';

const handleKeyDown = (isOpen, setIsOpen) => e => {
  const toggleButton = e.currentTarget.getElementsByClassName(css.toggleButton)[0];
  if ((e.target === toggleButton && e.key === 'Enter') || e.key === ' ') {
    e.preventDefault();
    setIsOpen(prevState => !prevState);
    return;
  } else if (!isOpen && e.key === 'ArrowDown') {
    e.preventDefault();
    setIsOpen(true);
    return;
  } else if (isOpen && e.key === 'Escape') {
    e.preventDefault();
    toggleButton.focus();
    setIsOpen(false);
    return;
  }
};
/**
 * FilterDateRange displays a toggleable date range picker.
 *
 * @component
 * @param {Object} props Component properties.
 * @param {Object} props.config Marketplace configuration object
 * @param {string?} props.className e add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @returns {JSX.Element} The FilterDateRange component.
 */
const FilterDateRange = props => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState(null);
  const toggleButtonRef = useRef(null);
  const { className, rootClassName, config, alignLeft } = props;
  const intl = useIntl();

  useEffect(() => {
    if (FieldDateRangeController.preload) {
      FieldDateRangeController.preload();
    }
  }, []);

  // Positions the calendar itself, fixed to the viewport, directly under
  // the toggle button - rather than relying on the page scrolling to make
  // room for it (which depends on window.scrollBy actually taking effect,
  // unreliable across browsers/setups). Its max-height is capped to
  // whatever room is actually left below the toggle button on screen, so
  // it can never extend past the bottom of the viewport: if the calendar
  // is taller than that, it scrolls internally instead. It's expected and
  // fine for this to overlap whatever page content sits below the search
  // bar (e.g. the category icons) - it's a floating popover, not something
  // that needs to make room for itself in the page layout.
  const [popoverStyle, setPopoverStyle] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setPopoverStyle(null);
      return undefined;
    }

    const updatePosition = () => {
      const btn = toggleButtonRef.current;
      if (!btn) {
        return;
      }
      const rect = btn.getBoundingClientRect();
      const margin = 8;
      const maxHeight = Math.max(160, window.innerHeight - rect.bottom - margin);
      setPopoverStyle({
        position: 'fixed',
        top: rect.bottom + margin,
        ...(alignLeft
          ? { left: rect.left }
          : { right: Math.max(8, window.innerWidth - rect.right) }),
        maxHeight,
        overflowY: 'auto',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, alignLeft]);

  const classes = classNames(rootClassName || css.root, className);

  const formatDateRange = (start, end) => {
    const formattedDate = intl.formatDateTimeRange(start, end, {
      day: 'numeric',
      month: 'short',
    });
    return formattedDate;
  };

  const handleDateRangeChange = value => {
    if (!value) {
      setSelectedDates(null);
      return;
    }

    const { startDate, endDate } = value;
    if (startDate && endDate) {
      setSelectedDates(formatDateRange(startDate, endDate));
      toggleButtonRef.current?.focus();
      setIsOpen(false);
    } else {
      setSelectedDates(null);
    }
  };

  const handleClick = () => {
    setIsOpen(prevState => !prevState);
  };

  const datesFilter = config.search.defaultFilters.find(f => f.key === 'dates');
  const { dateRangeMode } = datesFilter || {};
  const isNightlyMode = dateRangeMode === 'night';

  // Compute the CSS class for the label with an "active" modifier if there is a selection or if the picker is open.
  const labelClasses = classNames(css.label, {
    [css.active]: selectedDates || isOpen,
  });

  return (
    <OutsideClickHandler
      className={classes}
      onOutsideClick={() => setIsOpen(false)}
      onKeyDown={handleKeyDown(isOpen, setIsOpen)}
    >
      <div
        role="button"
        ref={toggleButtonRef}
        className={css.toggleButton}
        onClick={handleClick}
        tabIndex={0}
        aria-controls={isOpen ? 'dateRange' : ''}
        aria-expanded={isOpen}
      >
        <IconDate rootClassName={css.iconDate} />
        <span className={labelClasses}>
          {selectedDates
            ? selectedDates
            : intl.formatMessage({ id: 'PageBuilder.SearchCTA.dateFilterPlaceholder' })}
        </span>
      </div>
      {isOpen && popoverStyle ? (
        <div className={css.datePickerPositioner} style={popoverStyle}>
          <FieldDateRangeController
            onChange={handleDateRangeChange}
            showClearButton
            className={css.datePicker}
            name="dateRange"
            id="dateRange"
            minimumNights={isNightlyMode ? 1 : 0}
          />
        </div>
      ) : null}
    </OutsideClickHandler>
  );
};
export default FilterDateRange;
