import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';

import css from './HomepageTrustSteps.module.css';

const STEPS = ['choose', 'request', 'accept', 'handover'];

/**
 * Compact 4-step reassurance block under the listings grid, for visitors
 * who scrolled past the offer but still hesitate to book. Each step maps
 * 1:1 onto the real request-to-book transaction process (see
 * ext/transaction-processes/default-booking/process.edn): request →
 * (card authorized, not charged) → provider accepts (card captured) →
 * pickup/delivery. Copy here must stay in sync with that process and with
 * BookingDatesForm's own fine print - see the conversation this was
 * corrected in (a conversion audit flagged the previous 3-step copy for
 * claiming payment methods and an app that don't exist, and for citing a
 * specific Belgian legal article as a conversion argument without legal
 * review).
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepageTrustSteps = () => (
  <section className={css.root}>
    <div className={css.inner}>
      <h2 className={css.heading}>
        <FormattedMessage id="HomepageTrustSteps.heading" />
      </h2>
      <p className={css.lede}>
        <FormattedMessage id="HomepageTrustSteps.lede" />
      </p>
      <ol className={css.steps}>
        {STEPS.map((step, index) => (
          <li className={css.step} key={step}>
            <span className={css.stepNumber}>{index + 1}</span>
            <div className={css.stepBody}>
              <h3 className={css.stepTitle}>
                <FormattedMessage id={`HomepageTrustSteps.${step}.title`} />
              </h3>
              <p className={css.stepText}>
                <FormattedMessage id={`HomepageTrustSteps.${step}.text`} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HomepageTrustSteps;
