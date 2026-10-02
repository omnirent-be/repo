import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { H2, NamedLink, IconSearch, IconDate, IconKeysSuccess, IconAdd, IconInquiry, IconSuccess } from '../../../components';

import css from './HomepageHowItWorksSection.module.css';

const RENT_STEPS = [
  {
    Icon: IconSearch,
    titleId: 'HomepageHowItWorksSection.rent.step1.title',
    textId: 'HomepageHowItWorksSection.rent.step1.text',
  },
  {
    Icon: IconDate,
    titleId: 'HomepageHowItWorksSection.rent.step2.title',
    textId: 'HomepageHowItWorksSection.rent.step2.text',
  },
  {
    Icon: IconKeysSuccess,
    titleId: 'HomepageHowItWorksSection.rent.step3.title',
    textId: 'HomepageHowItWorksSection.rent.step3.text',
  },
];

const LIST_STEPS = [
  {
    Icon: IconAdd,
    titleId: 'HomepageHowItWorksSection.list.step1.title',
    textId: 'HomepageHowItWorksSection.list.step1.text',
  },
  {
    Icon: IconInquiry,
    titleId: 'HomepageHowItWorksSection.list.step2.title',
    textId: 'HomepageHowItWorksSection.list.step2.text',
  },
  {
    Icon: IconSuccess,
    titleId: 'HomepageHowItWorksSection.list.step3.title',
    textId: 'HomepageHowItWorksSection.list.step3.text',
  },
];

const FlowCard = ({ modifierClass, eyebrowId, headingId, steps, ctaNamedLinkName, ctaTextId }) => (
  <div className={`${css.card} ${modifierClass}`}>
    <span className={css.cardEyebrow}>
      <FormattedMessage id={eyebrowId} />
    </span>
    <h3 className={css.cardHeading}>
      <FormattedMessage id={headingId} />
    </h3>

    <ol className={css.steps}>
      {steps.map((step, index) => {
        const { Icon } = step;
        return (
          <li className={css.step} key={step.titleId}>
            <span className={css.stepIcon} aria-hidden="true">
              <Icon className={css.stepIconSvg} />
            </span>
            <span className={css.stepBody}>
              <span className={css.stepNumber}>{index + 1}</span>
              <strong className={css.stepTitle}>
                <FormattedMessage id={step.titleId} />
              </strong>
              <span className={css.stepText}>
                <FormattedMessage id={step.textId} />
              </span>
            </span>
          </li>
        );
      })}
    </ol>

    <NamedLink name={ctaNamedLinkName} className={css.cardCta}>
      <FormattedMessage id={ctaTextId} />
    </NamedLink>
  </div>
);

/**
 * A rich, code-defined "how it works" section for the homepage, replacing
 * the hosted (CMS) "Columns" section of the same content (filtered out of
 * pageAssetsData by LandingPage.js) - rendered via PageBuilder's
 * mainContentPrepend, right after the hero. Two real flows side by side
 * (huren / verhuren), each with the same honest 3-step copy already used on
 * HowItWorksPage and in the hero's "verhuren" panel.
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepageHowItWorksSection = () => {
  return (
    <div className={css.root}>
      <div className={css.inner}>
        <span className={css.eyebrow}>
          <FormattedMessage id="HomepageHowItWorksSection.eyebrow" />
        </span>
        <H2 as="h2" className={css.heading}>
          <FormattedMessage id="HomepageHowItWorksSection.heading" />
        </H2>
        <p className={css.intro}>
          <FormattedMessage id="HomepageHowItWorksSection.intro" />
        </p>

        <div className={css.grid}>
          <FlowCard
            modifierClass={css.cardRent}
            eyebrowId="HomepageHowItWorksSection.rent.eyebrow"
            headingId="HomepageHowItWorksSection.rent.heading"
            steps={RENT_STEPS}
            ctaNamedLinkName="SearchPage"
            ctaTextId="HomepageHowItWorksSection.rent.cta"
          />
          <FlowCard
            modifierClass={css.cardList}
            eyebrowId="HomepageHowItWorksSection.list.eyebrow"
            headingId="HomepageHowItWorksSection.list.heading"
            steps={LIST_STEPS}
            ctaNamedLinkName="NewListingPage"
            ctaTextId="HomepageHowItWorksSection.list.cta"
          />
        </div>
      </div>
    </div>
  );
};

export default HomepageHowItWorksSection;
