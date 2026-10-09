import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';
import { trackEvent } from '../../../util/analytics';

import css from './HomepageProviderSection.module.css';

/**
 * A full, dedicated section for the supply side (providers) - not a toggle
 * competing for equal weight with the renter's hero anymore (see the
 * conversation this replaced LandingPageHero's RoleTabs/QuickListForm in).
 * Sits after "Zo werkt huren" rather than at the very top, so a visitor
 * with rental intent sees the renter flow first and this reads as a
 * genuine secondary route, not a 50/50 choice.
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepageProviderSection = () => (
  <section className={css.root}>
    <div className={css.inner}>
      <div className={css.text}>
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
        </NamedLink>
        <NamedLink name="HowItWorksPage" className={css.secondaryLink}>
          <FormattedMessage id="HomepageProviderSection.secondaryCta" />
        </NamedLink>
      </div>
    </div>
  </section>
);

export default HomepageProviderSection;
