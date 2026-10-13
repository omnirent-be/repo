import React, { useEffect, useState } from 'react';

import { FormattedMessage } from '../../util/reactIntl';
import {
  CONSENT_DENIED,
  CONSENT_GRANTED,
  CONSENT_UNSET,
  OPEN_COOKIE_SETTINGS_EVENT,
  setConsent,
  useConsent,
} from '../../util/consent';

import NamedLink from '../NamedLink/NamedLink';

import css from './CookieConsent.module.css';

/**
 * Cookie banner for the marketing/analytics scripts (Meta Pixel, Google Analytics).
 * Those scripts are only loaded after "accept" (see util/includeScripts.js), and the
 * server only forwards Conversions API events when the consent cookie is granted.
 * Shows nothing when no such script is configured. "Accept" and "Decline" are
 * deliberately equally prominent. The banner can be reopened with
 * `openCookieSettings()` (util/consent.js), e.g. from the footer.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.analytics analytics config (googleAnalyticsId, facebookPixelId)
 * @returns {JSX.Element|null}
 */
const CookieConsent = props => {
  const { analytics } = props;
  const consent = useConsent();
  const [mounted, setMounted] = useState(false);
  const [reopened, setReopened] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onOpen = () => setReopened(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen);
  }, []);

  const hasTrackingScripts = !!(analytics?.facebookPixelId || analytics?.googleAnalyticsId);
  const visible = mounted && hasTrackingScripts && (consent === CONSENT_UNSET || reopened);
  if (!visible) {
    return null;
  }

  const choose = value => {
    setReopened(false);
    setConsent(value);
  };

  return (
    <section className={css.root} role="dialog" aria-labelledby="cookie-consent-title">
      <h2 id="cookie-consent-title" className={css.title}>
        <FormattedMessage id="CookieConsent.title" />
      </h2>
      <p className={css.text}>
        <FormattedMessage
          id="CookieConsent.text"
          values={{
            privacyLink: chunks => (
              <NamedLink name="PrivacyPolicyPage" className={css.link}>
                {chunks}
              </NamedLink>
            ),
          }}
        />
      </p>
      <div className={css.actions}>
        <button type="button" className={css.button} onClick={() => choose(CONSENT_DENIED)}>
          <FormattedMessage id="CookieConsent.decline" />
        </button>
        <button
          type="button"
          className={css.button}
          onClick={() => choose(CONSENT_GRANTED)}
          data-primary="true"
        >
          <FormattedMessage id="CookieConsent.accept" />
        </button>
      </div>
    </section>
  );
};

export default CookieConsent;
