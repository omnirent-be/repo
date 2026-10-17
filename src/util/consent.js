import { useSyncExternalStore } from 'react';

export const CONSENT_COOKIE_NAME = 'omnirent_cookie_consent';
export const CONSENT_GRANTED = 'granted';
export const CONSENT_DENIED = 'denied';
export const CONSENT_UNSET = 'unset';

const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const CONSENT_CHANGED_EVENT = 'omnirent-consent-changed';
export const OPEN_COOKIE_SETTINGS_EVENT = 'omnirent-open-cookie-settings';

// Cookies set by the marketing/analytics scripts that are only allowed after consent.
const TRACKING_COOKIE_PATTERNS = [/^_fb[pc]$/, /^_ga/, /^_gid$/, /^_gat/];

const isBrowser = () => typeof document !== 'undefined';

/**
 * Reads the visitor's cookie consent choice. Always `unset` on the server.
 *
 * @returns {'granted'|'denied'|'unset'}
 */
export const getConsent = () => {
  if (!isBrowser()) {
    return CONSENT_UNSET;
  }
  const match = document.cookie.split('; ').find(row => row.startsWith(`${CONSENT_COOKIE_NAME}=`));
  const value = match ? match.split('=')[1] : null;
  return value === CONSENT_GRANTED || value === CONSENT_DENIED ? value : CONSENT_UNSET;
};

export const clearTrackingCookies = () => {
  const hostParts = window.location.hostname.split('.');
  const domains = [null, window.location.hostname];
  if (hostParts.length > 2) {
    domains.push(`.${hostParts.slice(-2).join('.')}`);
  } else {
    domains.push(`.${window.location.hostname}`);
  }
  document.cookie.split('; ').forEach(row => {
    const name = row.split('=')[0];
    if (TRACKING_COOKIE_PATTERNS.some(pattern => pattern.test(name))) {
      domains.forEach(domain => {
        const domainPart = domain ? `; domain=${domain}` : '';
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainPart}`;
      });
    }
  });
};

/**
 * Stores the visitor's choice in a first-party cookie, so the server can also
 * check it (see server/api/meta-event.js). When consent is withdrawn after it
 * was granted, tracking cookies are removed and the page reloads, because
 * already loaded tracking scripts cannot be unloaded.
 *
 * @param {'granted'|'denied'} value
 */
export const setConsent = value => {
  if (!isBrowser()) {
    return;
  }
  const previous = getConsent();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; max-age=${CONSENT_MAX_AGE_SECONDS}; path=/; SameSite=Lax${secure}`;

  if (value === CONSENT_DENIED && previous === CONSENT_GRANTED) {
    clearTrackingCookies();
    window.location.reload();
    return;
  }
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
};

const subscribe = callback => {
  window.addEventListener(CONSENT_CHANGED_EVENT, callback);
  return () => window.removeEventListener(CONSENT_CHANGED_EVENT, callback);
};

/**
 * Hook returning the current consent choice and re-rendering when it changes.
 * Server and client snapshots use the same reader, so hydration stays stable.
 *
 * @returns {'granted'|'denied'|'unset'}
 */
export const useConsent = () => useSyncExternalStore(subscribe, getConsent, getConsent);

/** Asks the cookie banner to open again, e.g. from a footer link. */
export const openCookieSettings = () => {
  if (isBrowser()) {
    window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
  }
};
