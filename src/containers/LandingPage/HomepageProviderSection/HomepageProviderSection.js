import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';
import { trackEvent } from '../../../util/analytics';

import css from './HomepageProviderSection.module.css';

const WalletIcon = () => (
  <svg
    className={css.eyebrowIcon}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
    <path d="M16 13h2" />
  </svg>
);

const ArrowIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

/**
 * Full-width banner for the supply side (providers): a light green band with
 * a short pitch and a single "Word verhuurder" call to action. Sits after the
 * renter flow so it reads as a secondary route, not a 50/50 choice.
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepageProviderSection = () => (
  <section className={css.root}>
    <div className={css.inner}>
      <div className={css.text}>
        <p className={css.eyebrow}>
          <WalletIcon />
          <FormattedMessage id="HomepageProviderSection.eyebrow" />
        </p>
        <h2 className={css.heading}>
          <FormattedMessage id="HomepageProviderSection.heading" />
        </h2>
        <p className={css.lede}>
          <FormattedMessage id="HomepageProviderSection.lede" />
        </p>
      </div>
      <div className={css.actions}>
        <NamedLink
          name="NewListingPage"
          className={css.primaryButton}
          onClick={() => trackEvent('provider_cta_clicked', { cta_location: 'provider_section' })}
        >
          <FormattedMessage id="HomepageProviderSection.cta" />
          <ArrowIcon />
        </NamedLink>
        <p className={css.note}>
          <FormattedMessage id="HomepageProviderSection.note" />
        </p>
      </div>
    </div>
  </section>
);

export default HomepageProviderSection;
