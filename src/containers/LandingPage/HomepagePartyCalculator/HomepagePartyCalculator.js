import React, { useState } from 'react';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { H2, NamedLink } from '../../../components';

import css from './HomepagePartyCalculator.module.css';

const MIN_GUESTS = 10;
const MAX_GUESTS = 150;
const DEFAULT_GUESTS = 30;

// Guest-count breakpoints -> suggested real subcategories to browse. Not a
// bundled checkout (OmniRent has no cross-listing package pricing/discount
// mechanism - see the session's own plan notes on why that's deferred),
// just an honest "here's what people this size usually need" pointer into
// real search results, so the CTA never promises a price we can't back up.
const GUEST_BREAKPOINTS = [
  { maxGuests: 20, categoryIds: ['tent-structuren', 'Catering-Keuken'] },
  {
    maxGuests: 50,
    categoryIds: ['tent-structuren', 'Meubilair-Decoratie', 'Catering-Keuken', 'Geluid-Lichtdj'],
  },
  {
    maxGuests: Infinity,
    categoryIds: [
      'tent-structuren',
      'Meubilair-Decoratie',
      'Catering-Keuken',
      'Geluid-Lichtdj',
      'Springkastelen-Fun',
    ],
  },
];

const SUGGESTION_COPY = {
  'tent-structuren': { icon: '⛺', labelId: 'HomepagePartyCalculator.item.tent' },
  'Meubilair-Decoratie': { icon: '🪑', labelId: 'HomepagePartyCalculator.item.furniture' },
  'Catering-Keuken': { icon: '🍴', labelId: 'HomepagePartyCalculator.item.catering' },
  'Geluid-Lichtdj': { icon: '🎧', labelId: 'HomepagePartyCalculator.item.sound' },
  'Springkastelen-Fun': { icon: '🏰', labelId: 'HomepagePartyCalculator.item.fun' },
};

const suggestionForGuestCount = guestCount =>
  GUEST_BREAKPOINTS.find(b => guestCount <= b.maxGuests)?.categoryIds || [];

/**
 * "Feest Calculator" - a guest-count slider that suggests which real
 * subcategories to browse for a party that size. Purely a discovery aid
 * (links into SearchPage pre-filtered), not an automated bundle/discount
 * flow - OmniRent has no cross-listing checkout to back that with yet.
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepagePartyCalculator = () => {
  const [guestCount, setGuestCount] = useState(DEFAULT_GUESTS);
  const config = useConfiguration();
  const intl = useIntl();
  const categoryKey = config.categoryConfiguration?.key || 'categoryLevel';
  const topLevelCategoryId = config.categoryConfiguration?.categories?.[0]?.id;

  const suggestedCategoryIds = suggestionForGuestCount(guestCount);

  const searchQueryFor = categoryId =>
    topLevelCategoryId
      ? `?pub_${categoryKey}1=${encodeURIComponent(topLevelCategoryId)}&pub_${categoryKey}2=${encodeURIComponent(
          categoryId
        )}`
      : '';

  return (
    <div className={css.root}>
      <div className={css.inner}>
        <span className={css.eyebrow}>
          <FormattedMessage id="HomepagePartyCalculator.eyebrow" />
        </span>
        <H2 as="h2" className={css.heading}>
          <FormattedMessage id="HomepagePartyCalculator.heading" />
        </H2>
        <p className={css.intro}>
          <FormattedMessage id="HomepagePartyCalculator.intro" />
        </p>

        <div className={css.card}>
          <label className={css.sliderLabel} htmlFor="partyCalculatorGuests">
            <FormattedMessage id="HomepagePartyCalculator.sliderLabel" values={{ guestCount }} />
          </label>
          <input
            id="partyCalculatorGuests"
            className={css.slider}
            type="range"
            min={MIN_GUESTS}
            max={MAX_GUESTS}
            step={5}
            value={guestCount}
            onChange={e => setGuestCount(Number(e.target.value))}
            aria-valuetext={intl.formatMessage(
              { id: 'HomepagePartyCalculator.sliderLabel' },
              { guestCount }
            )}
          />
          <div className={css.sliderScale}>
            <span>{MIN_GUESTS}</span>
            <span>{MAX_GUESTS}+</span>
          </div>

          <p className={css.suggestionIntro}>
            <FormattedMessage id="HomepagePartyCalculator.suggestionIntro" />
          </p>
          <ul className={css.suggestionList}>
            {suggestedCategoryIds.map(categoryId => {
              const copy = SUGGESTION_COPY[categoryId];
              if (!copy) {
                return null;
              }
              return (
                <li key={categoryId}>
                  <NamedLink
                    name="SearchPage"
                    to={{ search: searchQueryFor(categoryId) }}
                    className={css.suggestionPill}
                  >
                    <span className={css.suggestionIcon} aria-hidden="true">
                      {copy.icon}
                    </span>
                    <FormattedMessage id={copy.labelId} />
                  </NamedLink>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HomepagePartyCalculator;
