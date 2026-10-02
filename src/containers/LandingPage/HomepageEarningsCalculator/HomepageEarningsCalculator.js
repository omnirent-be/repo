import React, { useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { H2, NamedLink } from '../../../components';

import css from './HomepageEarningsCalculator.module.css';

// Indicative per-item earnings, assuming ~6 weekend bookings a year at a
// realistic market day-rate for that item type on OmniRent today - visible,
// checkable assumptions rather than a single made-up total, since this
// number feeds a real financial decision for the visitor.
const RENTABLE_ITEMS = [
  { id: 'tent', icon: '⛺', labelId: 'HomepageEarningsCalculator.item.tent', yearlyEstimate: 480 },
  { id: 'bbq', icon: '🔥', labelId: 'HomepageEarningsCalculator.item.bbq', yearlyEstimate: 240 },
  {
    id: 'furniture',
    icon: '🪑',
    labelId: 'HomepageEarningsCalculator.item.furniture',
    yearlyEstimate: 180,
  },
  { id: 'sound', icon: '🎧', labelId: 'HomepageEarningsCalculator.item.sound', yearlyEstimate: 210 },
  {
    id: 'bouncy',
    icon: '🏰',
    labelId: 'HomepageEarningsCalculator.item.bouncy',
    yearlyEstimate: 360,
  },
];

/**
 * "Verdien met je garage" - a rough, transparent earnings estimate to
 * nudge visitors who have unused party gear toward listing it. The total
 * is explicitly framed as an indicative estimate (see
 * HomepageEarningsCalculator.disclaimer) built from visible per-item
 * assumptions, not a guarantee.
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepageEarningsCalculator = () => {
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleItem = id => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));
  };

  const totalEstimate = RENTABLE_ITEMS.filter(item => selectedIds.includes(item.id)).reduce(
    (sum, item) => sum + item.yearlyEstimate,
    0
  );

  return (
    <div className={css.root}>
      <div className={css.inner}>
        <div className={css.textColumn}>
          <span className={css.eyebrow}>
            <FormattedMessage id="HomepageEarningsCalculator.eyebrow" />
          </span>
          <H2 as="h2" className={css.heading}>
            <FormattedMessage id="HomepageEarningsCalculator.heading" />
          </H2>
          <p className={css.intro}>
            <FormattedMessage id="HomepageEarningsCalculator.intro" />
          </p>

          <div className={css.itemGrid}>
            {RENTABLE_ITEMS.map(item => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={classNames(css.itemButton, { [css.itemButtonSelected]: isSelected })}
                  onClick={() => toggleItem(item.id)}
                  aria-pressed={isSelected}
                >
                  <span className={css.itemIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <FormattedMessage id={item.labelId} />
                </button>
              );
            })}
          </div>

          <div className={css.resultCard}>
            {totalEstimate > 0 ? (
              <p className={css.resultText}>
                <FormattedMessage
                  id="HomepageEarningsCalculator.resultText"
                  values={{ amount: <strong className={css.resultAmount}>€{totalEstimate}</strong> }}
                />
              </p>
            ) : (
              <p className={css.resultTextEmpty}>
                <FormattedMessage id="HomepageEarningsCalculator.resultTextEmpty" />
              </p>
            )}
            <p className={css.disclaimer}>
              <FormattedMessage id="HomepageEarningsCalculator.disclaimer" />
            </p>
          </div>

          <NamedLink name="NewListingPage" className={css.cta}>
            <FormattedMessage id="HomepageEarningsCalculator.cta" />
          </NamedLink>
        </div>
      </div>
    </div>
  );
};

export default HomepageEarningsCalculator;
