import React, { useState } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { H1, H3, Page, LayoutSingleColumn, NamedLink } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './HowItWorksPage.module.css';

const DISCOUNT_STEPS = [
  { titleId: 'HowItWorksPage.discount.step1.title', textId: 'HowItWorksPage.discount.step1.text' },
  { titleId: 'HowItWorksPage.discount.step2.title', textId: 'HowItWorksPage.discount.step2.text' },
  { titleId: 'HowItWorksPage.discount.step3.title', textId: 'HowItWorksPage.discount.step3.text' },
];

const LIST_STEPS = [
  { titleId: 'HowItWorksPage.list.step1.title', textId: 'HowItWorksPage.list.step1.text' },
  { titleId: 'HowItWorksPage.list.step2.title', textId: 'HowItWorksPage.list.step2.text' },
  { titleId: 'HowItWorksPage.list.step3.title', textId: 'HowItWorksPage.list.step3.text' },
];

const REFERRAL_STEPS = [
  { titleId: 'HowItWorksPage.referral.step1.title', textId: 'HowItWorksPage.referral.step1.text' },
  { titleId: 'HowItWorksPage.referral.step2.title', textId: 'HowItWorksPage.referral.step2.text' },
  { titleId: 'HowItWorksPage.referral.step3.title', textId: 'HowItWorksPage.referral.step3.text' },
  { titleId: 'HowItWorksPage.referral.step4.title', textId: 'HowItWorksPage.referral.step4.text' },
];

const RoleTabs = ({ isListMode, setIsListMode }) => (
  <div className={css.roleTabs} data-mode={isListMode ? 'list' : 'rent'}>
    <span className={css.roleTabsPill} />
    <button
      type="button"
      className={classNames(css.roleTab, { [css.roleTabActive]: !isListMode })}
      onClick={() => setIsListMode(false)}
    >
      <FormattedMessage id="HowItWorksPage.tab.rent" />
    </button>
    <button
      type="button"
      className={classNames(css.roleTab, { [css.roleTabActive]: isListMode })}
      onClick={() => setIsListMode(true)}
    >
      <FormattedMessage id="HowItWorksPage.tab.list" />
    </button>
  </div>
);

const StepList = ({ steps }) => (
  <ol className={css.stepList}>
    {steps.map((step, index) => (
      <li key={step.titleId} className={css.step}>
        <div className={css.stepNumber}>{index + 1}</div>
        <div>
          <H3 as="h3" className={css.stepTitle}>
            <FormattedMessage id={step.titleId} />
          </H3>
          <p className={css.stepText}>
            <FormattedMessage id={step.textId} />
          </p>
        </div>
      </li>
    ))}
  </ol>
);

/**
 * HowItWorksPage - static, step-by-step explainer for the launch campaign's
 * two incentives (signup discount + referral bonus). Linked from the promo
 * banner in the topbar. All copy lives in translations/en.json under
 * HowItWorksPage.* keys, same pattern as FaqPage.
 *
 * @component
 * @returns {JSX.Element}
 */
export const HowItWorksPageComponent = () => {
  const intl = useIntl();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));
  const [isListMode, setIsListMode] = useState(false);

  return (
    <Page
      title={intl.formatMessage({ id: 'HowItWorksPage.title' })}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.content}>
          <H1 as="h1" className={css.heading}>
            <FormattedMessage id="HowItWorksPage.heading" />
          </H1>
          <p className={css.intro} key={`intro-${isListMode}`}>
            <FormattedMessage id={isListMode ? 'HowItWorksPage.intro.list' : 'HowItWorksPage.intro.rent'} />
          </p>

          <RoleTabs isListMode={isListMode} setIsListMode={setIsListMode} />

          {isListMode ? (
            <div className={css.section} key="list">
              <H3 as="h2" className={css.sectionTitle}>
                <FormattedMessage id="HowItWorksPage.list.title" />
              </H3>
              <StepList steps={LIST_STEPS} />
              <NamedLink name="NewListingPage" className={css.ctaButton}>
                <FormattedMessage id="HowItWorksPage.list.cta" />
              </NamedLink>
            </div>
          ) : (
            <div className={css.section} key="rent">
              <H3 as="h2" className={css.sectionTitle}>
                <FormattedMessage id="HowItWorksPage.discount.title" />
              </H3>
              <StepList steps={DISCOUNT_STEPS} />
              <NamedLink name="SearchPage" className={css.ctaButton}>
                <FormattedMessage id="HowItWorksPage.discount.cta" />
              </NamedLink>
            </div>
          )}

          <div className={css.section}>
            <H3 as="h2" className={css.sectionTitle}>
              <FormattedMessage id="HowItWorksPage.referral.title" />
            </H3>
            <StepList steps={REFERRAL_STEPS} />
            <NamedLink name="ReferralPage" className={css.ctaButton}>
              <FormattedMessage id="HowItWorksPage.referral.cta" />
            </NamedLink>
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default HowItWorksPageComponent;
