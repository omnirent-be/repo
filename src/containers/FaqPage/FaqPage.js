import React, { useState } from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { useSelector } from 'react-redux';

import { H1, H3, Page, LayoutSingleColumn, IconArrowHead, NamedLink } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './FaqPage.module.css';

const FAQ_SECTIONS = [
  {
    titleId: 'FaqPage.section.general',
    items: [
      { qId: 'FaqPage.q.whatIsOmnirent', aId: 'FaqPage.a.whatIsOmnirent' },
      { qId: 'FaqPage.q.whereActive', aId: 'FaqPage.a.whereActive' },
      { qId: 'FaqPage.q.howItWorks', aId: 'FaqPage.a.howItWorks' },
    ],
  },
  {
    titleId: 'FaqPage.section.renting',
    items: [
      { qId: 'FaqPage.q.howToBook', aId: 'FaqPage.a.howToBook' },
      { qId: 'FaqPage.q.deposit', aId: 'FaqPage.a.deposit' },
      { qId: 'FaqPage.q.extraDay', aId: 'FaqPage.a.extraDay' },
      { qId: 'FaqPage.q.priceOnRequest', aId: 'FaqPage.a.priceOnRequest' },
      { qId: 'FaqPage.q.cancel', aId: 'FaqPage.a.cancel' },
      { qId: 'FaqPage.q.damage', aId: 'FaqPage.a.damage' },
    ],
  },
  {
    titleId: 'FaqPage.section.quotes',
    items: [
      { qId: 'FaqPage.q.quoteHow', aId: 'FaqPage.a.quoteHow' },
      { qId: 'FaqPage.q.quoteCost', aId: 'FaqPage.a.quoteCost' },
      { qId: 'FaqPage.q.quoteWithdraw', aId: 'FaqPage.a.quoteWithdraw' },
      { qId: 'FaqPage.q.quoteWhere', aId: 'FaqPage.a.quoteWhere' },
    ],
  },
  {
    titleId: 'FaqPage.section.renting_out',
    items: [
      { qId: 'FaqPage.q.howToList', aId: 'FaqPage.a.howToList' },
      { qId: 'FaqPage.q.payout', aId: 'FaqPage.a.payout' },
      { qId: 'FaqPage.q.fees', aId: 'FaqPage.a.fees' },
      { qId: 'FaqPage.q.setExtraDayPrice', aId: 'FaqPage.a.setExtraDayPrice' },
      { qId: 'FaqPage.q.respondToRequest', aId: 'FaqPage.a.respondToRequest' },
    ],
  },
  {
    titleId: 'FaqPage.section.account',
    items: [
      { qId: 'FaqPage.q.verification', aId: 'FaqPage.a.verification' },
      { qId: 'FaqPage.q.platformOnly', aId: 'FaqPage.a.platformOnly' },
      { qId: 'FaqPage.q.favorites', aId: 'FaqPage.a.favorites' },
    ],
  },
  {
    titleId: 'FaqPage.section.referral',
    items: [
      { qId: 'FaqPage.q.signupBonus', aId: 'FaqPage.a.signupBonus' },
      { qId: 'FaqPage.q.referral', aId: 'FaqPage.a.referral' },
    ],
  },
];

const FaqItem = ({ qId, aId }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={css.item}>
      <button
        className={css.question}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        type="button"
      >
        <span><FormattedMessage id={qId} /></span>
        <IconArrowHead direction={isOpen ? 'up' : 'down'} size="small" />
      </button>
      {isOpen ? (
        <p className={css.answer}>
          <FormattedMessage id={aId} />
        </p>
      ) : null}
    </div>
  );
};

/**
 * FaqPage - a static, self-contained FAQ page with a per-item accordion.
 * Not driven by a hosted CMS asset (unlike TermsOfServicePage etc.) since
 * the content-editor's block system has no native accordion/collapsible
 * block - all copy lives in translations/en.json under the FaqPage.* keys.
 *
 * @component
 * @returns {JSX.Element}
 */
export const FaqPageComponent = () => {
  const intl = useIntl();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  return (
    <Page
      title={intl.formatMessage({ id: 'FaqPage.title' })}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.content}>
          <H1 as="h1" className={css.heading}>
            <FormattedMessage id="FaqPage.heading" />
          </H1>

          {FAQ_SECTIONS.map(section => (
            <div key={section.titleId} className={css.section}>
              <H3 as="h2" className={css.sectionTitle}>
                <FormattedMessage id={section.titleId} />
              </H3>
              <div className={css.itemList}>
                {section.items.map(item => (
                  <FaqItem key={item.qId} qId={item.qId} aId={item.aId} />
                ))}
              </div>
            </div>
          ))}

          <div className={css.contactCta}>
            <p className={css.contactCtaText}>
              <FormattedMessage id="FaqPage.contactCta.text" />
            </p>
            <NamedLink name="ContactPage" className={css.contactCtaLink}>
              <FormattedMessage id="FaqPage.contactCta.link" />
            </NamedLink>
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default FaqPageComponent;
