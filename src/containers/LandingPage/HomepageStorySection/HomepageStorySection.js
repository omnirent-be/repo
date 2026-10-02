import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { H2, NamedLink } from '../../../components';

import css from './HomepageStorySection.module.css';

const BEATS = ['problem', 'idea', 'promise'];

// Simple line icons instead of emoji - keeps this looking like a designed
// product page rather than a generic template. Same stroke style throughout
// so they read as one family.
const IconStar = props => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M12 3.5l2.6 5.6 6.1.6-4.6 4.2 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.2 6.1-.6L12 3.5z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const IconShieldCheck = props => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M12 3l7 3v5.2c0 4.8-3 8.2-7 9.3-4-1.1-7-4.5-7-9.3V6l7-3z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M9 12.2l2.1 2.1L15.3 10"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconMessage = props => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M4 5.5h16v10H9.5L5 19.5v-4H4v-10z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path d="M8 9.5h8M8 12.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconTag = props => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M20 12.6L12.6 20 4 11.4V4h7.4L20 12.6z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="8.3" cy="8.3" r="1.3" fill="currentColor" />
  </svg>
);

const TRUST_ITEMS = [
  {
    icon: IconStar,
    titleId: 'HomepageTrustSection.reviewsTitle',
    textId: 'HomepageTrustSection.reviewsText',
  },
  {
    icon: IconShieldCheck,
    titleId: 'HomepageTrustSection.paymentTitle',
    textId: 'HomepageTrustSection.paymentText',
  },
  {
    icon: IconMessage,
    titleId: 'HomepageTrustSection.contactTitle',
    textId: 'HomepageTrustSection.contactText',
  },
  {
    icon: IconTag,
    titleId: 'HomepageTrustSection.pricingTitle',
    textId: 'HomepageTrustSection.pricingText',
  },
];

/**
 * "Waarom OmniRent" told as a short story (problem -> idea -> promise)
 * instead of a list of claims, followed by the four things the platform
 * really does for trust. Rendered via PageBuilder's mainContentAppend.
 * All copy is the site's own "why we exist" text plus platform facts - no
 * invented numbers, people or dates.
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepageStorySection = () => {
  return (
    <div className={css.root}>
      <div className={css.story}>
        <div className={css.storyIntro}>
          <span className={css.eyebrow}>
            <FormattedMessage id="HomepageStorySection.eyebrow" />
          </span>
          <H2 as="h2" className={css.heading}>
            <FormattedMessage id="HomepageStorySection.heading" />
          </H2>
          <p className={css.lede}>
            <FormattedMessage id="HomepageStorySection.lede" />
          </p>
          <div className={css.ctas}>
            <NamedLink name="HowItWorksPage" className={css.ctaPrimary}>
              <FormattedMessage id="HomepageStorySection.ctaHow" />
            </NamedLink>
            <NamedLink name="ContactPage" className={css.ctaGhost}>
              <FormattedMessage id="HomepageStorySection.ctaContact" />
            </NamedLink>
          </div>
        </div>

        <ol className={css.beats}>
          {BEATS.map(beat => (
            <li className={css.beat} key={beat}>
              <span className={css.beatLabel}>
                <FormattedMessage id={`HomepageStorySection.${beat}.label`} />
              </span>
              <h3 className={css.beatTitle}>
                <FormattedMessage id={`HomepageStorySection.${beat}.title`} />
              </h3>
              <p className={css.beatText}>
                <FormattedMessage id={`HomepageStorySection.${beat}.text`} />
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className={css.trust}>
        <h3 className={css.trustHeading}>
          <FormattedMessage id="HomepageStorySection.trustHeading" />
        </h3>
        <div className={css.trustGrid}>
          {TRUST_ITEMS.map(item => (
            <div className={css.trustCard} key={item.titleId}>
              <span className={css.trustIcon}>
                <item.icon className={css.trustIconSvg} />
              </span>
              <h4 className={css.trustTitle}>
                <FormattedMessage id={item.titleId} />
              </h4>
              <p className={css.trustText}>
                <FormattedMessage id={item.textId} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomepageStorySection;
