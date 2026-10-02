import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';

import { Heading, NamedLink, IconEmailSent, InlineTextButton, IconClose } from '../../components';

import css from './AuthenticationPage.module.css';

const WEBMAIL_BY_DOMAIN = {
  'gmail.com': ['Gmail', 'https://mail.google.com'],
  'googlemail.com': ['Gmail', 'https://mail.google.com'],
  'outlook.com': ['Outlook', 'https://outlook.live.com/mail'],
  'outlook.be': ['Outlook', 'https://outlook.live.com/mail'],
  'hotmail.com': ['Outlook', 'https://outlook.live.com/mail'],
  'hotmail.be': ['Outlook', 'https://outlook.live.com/mail'],
  'live.com': ['Outlook', 'https://outlook.live.com/mail'],
  'live.be': ['Outlook', 'https://outlook.live.com/mail'],
  'msn.com': ['Outlook', 'https://outlook.live.com/mail'],
  'yahoo.com': ['Yahoo Mail', 'https://mail.yahoo.com'],
  'icloud.com': ['iCloud Mail', 'https://www.icloud.com/mail'],
  'me.com': ['iCloud Mail', 'https://www.icloud.com/mail'],
  'telenet.be': ['Telenet Webmail', 'https://webmail.telenet.be'],
};

const getWebmail = email => {
  const domain = typeof email === 'string' ? email.split('@')[1]?.toLowerCase() : null;
  return domain ? WEBMAIL_BY_DOMAIN[domain] : null;
};

const EmailVerificationInfo = props => {
  const {
    name,
    email,
    onResendVerificationEmail,
    resendErrorMessage,
    sendVerificationEmailInProgress,
    emailAddress,
  } = props;

  const webmail = getWebmail(emailAddress);

  const resendEmailLink = (
    <InlineTextButton rootClassName={css.modalHelperLink} onClick={onResendVerificationEmail}>
      <FormattedMessage id="AuthenticationPage.resendEmailLinkText" />
    </InlineTextButton>
  );

  const fixEmailLink = (
    <NamedLink className={css.modalHelperLink} name="ContactDetailsPage">
      <FormattedMessage id="AuthenticationPage.fixEmailLinkText" />
    </NamedLink>
  );

  return (
    <div className={css.content}>
      <NamedLink className={css.verifyClose} name="ProfileSettingsPage">
        <span className={css.closeText}>
          <FormattedMessage id="AuthenticationPage.verifyEmailClose" />
        </span>
        <IconClose rootClassName={css.closeIcon} />
      </NamedLink>
      <IconEmailSent className={css.modalIcon} />
      <Heading as="h1" rootClassName={css.modalTitle}>
        <FormattedMessage id="AuthenticationPage.verifyEmail.title" values={{ name }} />
      </Heading>
      <p className={css.modalMessage}>
        <FormattedMessage id="AuthenticationPage.verifyEmail.text" values={{ email }} />
      </p>
      <ol className={css.verifySteps}>
        {[1, 2, 3].map(n => (
          <li key={n} className={css.verifyStep}>
            <span className={css.verifyStepNumber}>{n}</span>
            <FormattedMessage id={`AuthenticationPage.verifyEmail.step${n}`} />
          </li>
        ))}
      </ol>
      {webmail ? (
        <a className={css.openMailbox} href={webmail[1]} target="_blank" rel="noopener noreferrer">
          <FormattedMessage id="AuthenticationPage.verifyEmail.openMailbox" values={{ provider: webmail[0] }} />
        </a>
      ) : null}
      {resendErrorMessage}

      <div className={css.bottomWrapper}>
        <p className={css.modalHelperText}>
          {sendVerificationEmailInProgress ? (
            <FormattedMessage id="AuthenticationPage.sendingEmail" />
          ) : (
            <FormattedMessage id="AuthenticationPage.resendEmail" values={{ resendEmailLink }} />
          )}
        </p>
        <p className={css.modalHelperText}>
          <FormattedMessage id="AuthenticationPage.fixEmail" values={{ fixEmailLink }} />
        </p>
      </div>
    </div>
  );
};

export default EmailVerificationInfo;
