import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';

import css from './HomepageStepsSection.module.css';

const Icon = ({ children }) => (
  <svg
    className={css.benefitIcon}
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const ShieldIcon = () => (
  <Icon>
    <path d="M12 3 5 6v5c0 4.5 2.9 8.3 7 10 4.1-1.7 7-5.5 7-10V6l-7-3z" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

const AgreementIcon = () => (
  <Icon>
    <path d="M7 3h7l4 4v14H7z" />
    <path d="M14 3v4h4" />
    <path d="M10 12h5" />
    <path d="M10 16h5" />
  </Icon>
);

const TruckIcon = () => (
  <Icon>
    <path d="M2 6h11v10H2z" />
    <path d="M13 9h4l3 3v4h-7" />
    <circle cx="6.5" cy="17.5" r="1.75" />
    <circle cx="16.5" cy="17.5" r="1.75" />
  </Icon>
);

const LeafIcon = () => (
  <Icon>
    <path d="M5 19c0-8 5-13 15-14 0 10-5 15-13 15" />
    <path d="M5 19c2-4 5-7 9-9" />
  </Icon>
);

const BENEFITS = [
  { id: 'safe', Icon: ShieldIcon },
  { id: 'terms', Icon: AgreementIcon },
  { id: 'handover', Icon: TruckIcon },
  { id: 'reuse', Icon: LeafIcon },
];

const STEPS = ['find', 'request', 'confirm', 'party'];

/**
 * Four short reassurances ("Veilig geregeld", ...) followed by the
 * "Jouw feest in vier stappen" section. The steps follow the real
 * request-to-book flow: request (not charged yet), the provider accepts,
 * then payment via OmniRent and pickup or delivery.
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepageStepsSection = () => (
  <>
    <section className={css.benefits} aria-label="OmniRent">
      <ul className={css.benefitList}>
        {BENEFITS.map(({ id, Icon: BenefitIcon }) => (
          <li className={css.benefit} key={id}>
            <BenefitIcon />
            <div className={css.benefitBody}>
              <h3 className={css.benefitTitle}>
                <FormattedMessage id={`HomepageStepsSection.benefit.${id}.title`} />
              </h3>
              <p className={css.benefitText}>
                <FormattedMessage id={`HomepageStepsSection.benefit.${id}.text`} />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>

    <section className={css.steps}>
      <div className={css.stepsInner}>
        <p className={css.eyebrow}>
          <FormattedMessage id="HomepageStepsSection.eyebrow" />
        </p>
        <h2 className={css.heading}>
          <FormattedMessage id="HomepageStepsSection.heading" />
        </h2>
        <ol className={css.stepList}>
          {STEPS.map((step, index) => (
            <li className={css.step} key={step}>
              <span className={css.stepNumber}>{`0${index + 1}`}</span>
              <h3 className={css.stepTitle}>
                <FormattedMessage id={`HomepageStepsSection.step.${step}.title`} />
              </h3>
              <p className={css.stepText}>
                <FormattedMessage id={`HomepageStepsSection.step.${step}.text`} />
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  </>
);

export default HomepageStepsSection;
