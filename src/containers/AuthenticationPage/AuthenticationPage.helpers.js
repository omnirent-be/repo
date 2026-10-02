import Cookies from 'js-cookie';

import { isEmpty } from '../../util/common';
import { pickUserFieldsData, addScopePrefix } from '../../util/userHelpers';
import { pickReferralData } from '../../util/webStorageHelpers';
import { getStoredReferralCode } from '../../util/referral';

// Returns full userType config based on selected userType
const getUserTypeConfig = (userType, userTypes) => {
  return userTypes.find(config => {
    return config.userType === userType;
  });
};

/**
 * Filters out configured user-field entries, returning only the remaining key/value pairs.
 *
 * The signup and IdP confirm flows destructure a set of known identity fields from the form submit
 * values and handles the remaining fields as `protectedData`.
 * This helper picks those key/value pairs that are not configured as user fields.
 *
 * @param {Object} values - submit values from the form
 * @param {Array<{ scope: string, key: string }>} userFieldConfigs - Configured user field definitions.
 * @returns {Object} Remaining key/value pairs (non-user-field entries).
 */
export const getNonUserFieldParams = (values, userFieldConfigs) => {
  const userFieldKeys = userFieldConfigs.map(({ scope, key }) => addScopePrefix(scope, key));

  return Object.entries(values).reduce((picked, [key, value]) => {
    const isUserFieldKey = userFieldKeys.includes(key);

    return isUserFieldKey
      ? picked
      : {
          ...picked,
          [key]: value,
        };
  }, {});
};

/**
 * Builds extended data (public/private/protected) for the created currentUser entity.
 *
 * Returns an empty object when no extended data is provided.
 *
 * @param {Object} submitValues - Unhandled form submit values
 * @param {string} userType - The user type
 * @param {Array} userFields - User field configurations
 * @returns {{ publicData: Object, privateData: Object, protectedData: Object } | {}}
 */
export const getExtendedDataMaybe = (submitValues, userType, userFields, extraData) => {
  const { publicData, privateData, protectedData } = extraData;

  return !isEmpty(submitValues)
    ? {
        publicData: {
          ...publicData,
          userType,
          ...pickUserFieldsData(submitValues, 'public', userType, userFields),
        },
        privateData: {
          ...privateData,
          ...pickUserFieldsData(submitValues, 'private', userType, userFields),
        },
        protectedData: {
          ...protectedData,
          ...pickUserFieldsData(submitValues, 'protected', userType, userFields),
          // If the form has any additional values, pass them forward as user's protected data
          ...getNonUserFieldParams(submitValues, userFields),
        },
      }
    : {};
};

/**
 * Creates a submit handler for the signup form.
 * I.e. the handler dispatches the signup thunk action.
 *
 * @param {Object} params
 * @param {Function} params.submitSignup
 * @param {Array} params.userFields
 * @returns {(values: Object) => void}
 */
export const getHandleSubmitSignup = ({ submitSignup, userFields, userTypes }) => values => {
  const {
    userType,
    email,
    password,
    confirmPassword, // eslint-disable-line no-unused-vars
    fname,
    lname,
    displayName,
    accountType,
    companyName,
    vatNumber,
    referralSource,
    terms,
    ...rest
  } = values;
  const displayNameMaybe = displayName ? { displayName: displayName.trim() } : {};

  // Set referral to user private data if it exists and is valid
  const userTypeConfig = getUserTypeConfig(userType, userTypes);
  const extraPrivateData = pickReferralData(userTypeConfig);

  // Referral program: who invited this user, if they signed up via a
  // referral link (?ref=<userId>). See util/referral.js.
  // Merged in separately (not via getExtendedDataMaybe's extraData param)
  // because that function returns {} entirely when submitValues is empty,
  // which would silently drop this even though we have real data to save.
  const referredByUserId = getStoredReferralCode();

  const accountTypeMaybe = accountType ? { accountType } : {};
  // Company details - only collected (and only meaningful) for accountType
  // 'company'. The VAT number is normalized to "BE0123456789" so it's
  // stored the same way regardless of how the user typed it (dots, spaces).
  const companyDetailsMaybe =
    accountType === 'company' && companyName && vatNumber
      ? { companyName: companyName.trim(), vatNumber: vatNumber.replace(/[\s.]/g, '').toUpperCase() }
      : {};
  // "Where did you hear about us?" - optional, used for marketing insight only.
  const referralSourceMaybe = referralSource ? { referralSource } : {};
  // Proof that the user confirmed being 18+ and accepted the terms
  // (one combined checkbox on the signup form).
  const consentMaybe = terms?.length > 0 ? { termsAcceptedAt: new Date().toISOString() } : {};
  const protectedDataExtrasMaybe = {
    ...consentMaybe,
    ...companyDetailsMaybe,
    ...referralSourceMaybe,
  };

  const extendedData = getExtendedDataMaybe(rest, userType, userFields, {
    privateData: extraPrivateData,
  });

  const submitParams = {
    email,
    password,
    firstName: fname.trim(),
    lastName: lname.trim(),
    ...displayNameMaybe,
    ...extendedData,
    ...(referredByUserId
      ? { privateData: { ...extendedData.privateData, referredByUserId } }
      : {}),
    // Merged in separately, same reason as referredByUserId above:
    // getExtendedDataMaybe short-circuits to {} when there are no other
    // extended-data fields on the form, which would otherwise drop these.
    ...(Object.keys(accountTypeMaybe).length > 0
      ? { publicData: { ...extendedData.publicData, ...accountTypeMaybe } }
      : {}),
    ...(Object.keys(protectedDataExtrasMaybe).length > 0
      ? { protectedData: { ...extendedData.protectedData, ...protectedDataExtrasMaybe } }
      : {}),
  };

  submitSignup(submitParams);
};

/**
 * Creates a submit handler for confirming signup data after SSO.
 * I.e. the handler dispatches the signupWithIdp thunk action.
 *
 * @param {Object} params
 * @param {Object} params.authInfo
 * @param {Function} params.submitSingupWithIdp
 * @param {Array} params.userFields
 * @returns {(values: Object) => void}
 */
export const getHandleSubmitConfirm = ({
  authInfo,
  submitSingupWithIdp,
  userFields,
  userTypes,
}) => values => {
  const { email, firstName, lastName } = authInfo;

  const {
    userType,
    email: newEmail,
    firstName: newFirstName,
    lastName: newLastName,
    displayName,
    ...rest
  } = values;

  const displayNameMaybe = displayName ? { displayName: displayName.trim() } : {};

  // Pass email, fistName or lastName to Marketplace API only if user has edited them
  // and they can't be fetched directly from idp provider (e.g. Facebook)
  const authParams = {
    ...(newEmail !== email && { email: newEmail }),
    ...(newFirstName !== firstName && { firstName: newFirstName }),
    ...(newLastName !== lastName && { lastName: newLastName }),
  };

  // Set referral to user private data if it exists and is valid
  const userTypeConfig = getUserTypeConfig(userType, userTypes);
  const extraPrivateData = pickReferralData(userTypeConfig);
  const referredByUserId = getStoredReferralCode();

  // Pass other values as extended data according to user field configuration
  const extendedDataMaybe = getExtendedDataMaybe(rest, userType, userFields, {
    privateData: extraPrivateData,
  });

  submitSingupWithIdp({
    ...authParams,
    ...displayNameMaybe,
    ...extendedDataMaybe,
    ...(referredByUserId
      ? { privateData: { ...extendedDataMaybe.privateData, referredByUserId } }
      : {}),
  });
};

/**
 * Reads authentication info persisted in `st-authinfo` cookie.
 *
 * @returns {Object | null}
 */
export const getAuthInfoFromCookies = () => {
  return Cookies.get('st-authinfo')
    ? JSON.parse(Cookies.get('st-authinfo').replace('j:', ''))
    : null;
};

/**
 * Reads authentication error persisted in `st-autherror` cookie.
 *
 * @returns {Object | null}
 */
export const getAuthErrorFromCookies = () => {
  return Cookies.get('st-autherror')
    ? JSON.parse(Cookies.get('st-autherror').replace('j:', ''))
    : null;
};
