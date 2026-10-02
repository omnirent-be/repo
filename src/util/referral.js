/**
 * Lightweight referral-code capture, independent of the Console-hosted
 * userType.referralSources pipeline (webStorageHelpers.js), which only
 * takes effect if userTypes are configured in Sharetribe Console - not
 * something this codebase can verify. This module stores the referrer's
 * user id from a `?ref=<userId>` signup link in localStorage so it can be
 * attached to the new user's privateData at signup, regardless of userType
 * config.
 */
const STORAGE_KEY = 'omnirent_referral_code';
const EXPIRY_MS = 90 * 24 * 60 * 60 * 1000; // 90 days, matches referralSources convention

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

export const storeReferralCode = code => {
  if (!isBrowser() || !code) {
    return;
  }
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code, expiresAt: Date.now() + EXPIRY_MS })
    );
  } catch (e) {
    // Ignore storage errors (e.g. private browsing quota)
  }
};

export const getStoredReferralCode = () => {
  if (!isBrowser()) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const { code, expiresAt } = JSON.parse(raw);
    return code && expiresAt > Date.now() ? code : null;
  } catch (e) {
    return null;
  }
};

export const clearReferralCode = () => {
  if (!isBrowser()) {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore storage errors
  }
};
