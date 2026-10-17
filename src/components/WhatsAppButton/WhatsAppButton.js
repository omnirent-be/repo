import React from 'react';
import classNames from 'classnames';

import { useIntl } from '../../util/reactIntl';
import { trackEvent } from '../../util/analytics';
import IconWhatsApp from '../IconWhatsApp/IconWhatsApp';

import css from './WhatsAppButton.module.css';

// OmniRent's business WhatsApp number, international format without the
// leading '+' - this is the exact format wa.me's Click-to-Chat links require.
const WHATSAPP_NUMBER = '32489851854';
const DEFAULT_MESSAGE = 'Hallo OmniRent, ik zoek feestmateriaal voor een feest in Gent.';

const buildWhatsAppUrl = message => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

/**
 * A WhatsApp Click-to-Chat link, tracked as both a GA4 event (click_whatsapp)
 * and a Meta Pixel custom event (ClickWhatsApp) on click. Two variants:
 * 'floating' is the site-wide button fixed to the bottom-right corner of
 * every page; 'inline' is a plain button meant to sit next to a page's own
 * call-to-action (e.g. on a landing page, next to the search/request
 * button), with its own prefilled message tailored to that page.
 *
 * @component
 * @param {Object} props
 * @param {'floating'|'inline'} [props.variant] defaults to 'floating'
 * @param {string} props.ctaLocation sent as the `cta_location` event param, e.g. 'floating_button' or 'partytent_gent_landing'
 * @param {string} [props.message] prefilled WhatsApp message, defaults to the generic feestmateriaal/Gent message
 * @param {string} [props.className]
 * @returns {JSX.Element}
 */
const WhatsAppButton = props => {
  const intl = useIntl();
  const { variant = 'floating', ctaLocation, message = DEFAULT_MESSAGE, className } = props;

  const handleClick = () => {
    trackEvent(
      'click_whatsapp',
      {
        page_location: typeof window !== 'undefined' ? window.location.href : null,
        cta_location: ctaLocation,
      },
      'ClickWhatsApp'
    );
  };

  const isFloating = variant === 'floating';
  const rootClass = classNames(isFloating ? css.floatingRoot : css.inlineRoot, className);
  const label = intl.formatMessage({
    id: isFloating ? 'WhatsAppButton.floatingLabel' : 'WhatsAppButton.inlineLabel',
  });

  return (
    <a
      href={buildWhatsAppUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={rootClass}
      aria-label={intl.formatMessage({ id: 'WhatsAppButton.ariaLabel' })}
      onClick={handleClick}
    >
      <IconWhatsApp className={css.icon} />
      <span className={css.label}>{label}</span>
    </a>
  );
};

export default WhatsAppButton;
