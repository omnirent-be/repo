import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { H3, Page, LayoutSingleColumn, Button } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './ReferralPage.module.css';

/**
 * ReferralPage - lets the current user share their personal referral link.
 *
 * The EUR 5 referral reward for successfully inviting a friend is NOT
 * credited here automatically - it's paid out manually by the operator via
 * bank transfer, based on server/api/referral/admin-report.js.
 *
 * @component
 * @returns {JSX.Element}
 */
export const ReferralPageComponent = () => {
  const intl = useIntl();
  const [copied, setCopied] = useState(false);
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));
  const currentUser = useSelector(state => state.user?.currentUser);

  const userId = currentUser?.id?.uuid;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const referralLink = userId ? `${origin}/signup?ref=${userId}` : '';

  const handleCopy = () => {
    if (!referralLink || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Page
      title={intl.formatMessage({ id: 'ReferralPage.title' })}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.content}>
          <H3 as="h1" className={css.heading}>
            <FormattedMessage id="ReferralPage.heading" />
          </H3>

          <p className={css.description}>
            <FormattedMessage id="ReferralPage.description" />
          </p>

          <div className={css.linkRow}>
            <input
              className={css.linkInput}
              type="text"
              readOnly
              value={referralLink}
              onFocus={e => e.target.select()}
            />
            <Button className={css.copyButton} onClick={handleCopy} type="button">
              <FormattedMessage
                id={copied ? 'ReferralPage.copied' : 'ReferralPage.copyLink'}
              />
            </Button>
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default ReferralPageComponent;
