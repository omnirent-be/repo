import React, { Component } from 'react';
import { compose } from 'redux';
import { Field, Form as FinalForm } from 'react-final-form';
import isEqual from 'lodash/isEqual';
import classNames from 'classnames';
import arrayMutators from 'final-form-arrays';

import { FormattedMessage, injectIntl, intlShape } from '../../../util/reactIntl';
import { ensureCurrentUser } from '../../../util/data';
import { propTypes } from '../../../util/types';
import * as validators from '../../../util/validators';
import { isUploadImageOverLimitError } from '../../../util/errors';
import { getPropsForCustomUserFieldInputs } from '../../../util/userHelpers';

import {
  Form,
  Avatar,
  Button,
  ImageFromFile,
  IconSpinner,
  FieldTextInput,
  FieldSelect,
  H4,
  CustomExtendedDataField,
} from '../../../components';

import css from './ProfileSettingsForm.module.css';

const ACCEPT_IMAGES = 'image/*';
const UPLOAD_CHANGE_DELAY = 2000; // Show spinner so that browser has time to load img srcset

// The rating is optional (a provider might not have any external reviews
// yet), so this only validates the range once a value has been entered.
const validateOptionalRating = message => value => {
  if (value === '' || value === undefined || value === null) {
    return undefined;
  }
  const num = Number(value);
  return Number.isNaN(num) || num < 1 || num > 5 ? message : undefined;
};

const MINIMUM_RENTER_AGE_YEARS = 18;

// These contact-detail fields (phone, birth date, address) aren't required
// to save THIS form - CheckoutPage.js is what actually enforces them,
// right before booking, since that's the only place they're consequential.
// Requiring them here too would block saving unrelated changes (bio,
// avatar, ...) for every existing user who hasn't filled them in yet - so
// each validator below only fires once something invalid is actually
// typed, never on an empty field.

// A rental contract's signer needs to be an adult - `type="date"` gives a
// plain 'YYYY-MM-DD' string, so this uses the shared isAtLeastYearsOldFromDateString
// helper rather than the (year/month/day)-shaped ageAtLeast in validators.js.
// The same helper is re-checked at the checkout gate itself (see
// CheckoutPageTransactionHelpers.js's isCustomerProfileCompleteForCheckout),
// since a saved birth date could in principle predate this validator.
const validateBirthDate = message => value => {
  if (!value) {
    return undefined;
  }
  return validators.isAtLeastYearsOldFromDateString(value, MINIMUM_RENTER_AGE_YEARS)
    ? undefined
    : message;
};

const DisplayNameMaybe = props => {
  const { userTypeConfig, intl } = props;

  const isDisabled = userTypeConfig?.defaultUserFields?.displayName === false;
  if (isDisabled) {
    return null;
  }

  const { required } = userTypeConfig?.displayNameSettings || {};
  const isRequired = required === true;

  const validateMaybe = isRequired
    ? {
        validate: validators.required(
          intl.formatMessage({
            id: 'ProfileSettingsForm.displayNameRequired',
          })
        ),
      }
    : {};

  return (
    <div className={css.sectionContainer}>
      <H4 as="h2" className={css.sectionTitle}>
        <FormattedMessage id="ProfileSettingsForm.displayNameHeading" />
      </H4>
      <FieldTextInput
        className={css.row}
        type="text"
        id="displayName"
        name="displayName"
        label={intl.formatMessage({
          id: 'ProfileSettingsForm.displayNameLabel',
        })}
        placeholder={intl.formatMessage({
          id: 'ProfileSettingsForm.displayNamePlaceholder',
        })}
        {...validateMaybe}
      />
      <p className={css.extraInfo}>
        <FormattedMessage id="ProfileSettingsForm.displayNameInfo" />
      </p>
    </div>
  );
};

/**
 * ProfileSettingsForm
 * TODO: change to functional component
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.formId] - The form id
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {Object} props.userTypeConfig - The user type config
 * @param {string} props.userTypeConfig.userType - The user type
 * @param {Array<Object>} props.userFields - The user fields
 * @param {Object} [props.profileImage] - The profile image
 * @param {string} props.marketplaceName - The marketplace name
 * @param {Function} props.onImageUpload - The function to handle image upload
 * @param {Function} props.onSubmit - The function to handle form submission
 * @param {boolean} props.uploadInProgress - Whether the upload is in progress
 * @param {propTypes.error} [props.uploadImageError] - The upload image error
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {propTypes.error} [props.updateProfileError] - The update profile error
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
class ProfileSettingsFormComponent extends Component {
  constructor(props) {
    super(props);

    this.uploadDelayTimeoutId = null;
    this.state = { uploadDelay: false };
    this.submittedValues = {};
  }

  componentDidUpdate(prevProps) {
    // Upload delay is additional time window where Avatar is added to the DOM,
    // but not yet visible (time to load image URL from srcset)
    if (prevProps.uploadInProgress && !this.props.uploadInProgress) {
      this.setState({ uploadDelay: true });
      this.uploadDelayTimeoutId = window.setTimeout(() => {
        this.setState({ uploadDelay: false });
      }, UPLOAD_CHANGE_DELAY);
    }
  }

  componentWillUnmount() {
    window.clearTimeout(this.uploadDelayTimeoutId);
  }

  render() {
    return (
      <FinalForm
        {...this.props}
        mutators={{ ...arrayMutators }}
        render={fieldRenderProps => {
          const {
            className,
            currentUser,
            handleSubmit,
            intl,
            invalid,
            onImageUpload,
            pristine,
            profileImage,
            rootClassName,
            updateInProgress,
            updateProfileError,
            uploadImageError,
            uploadInProgress,
            form,
            formId,
            marketplaceName,
            values,
            userFields,
            userTypeConfig,
          } = fieldRenderProps;

          const user = ensureCurrentUser(currentUser);

          // First name
          const firstNameLabel = intl.formatMessage({
            id: 'ProfileSettingsForm.firstNameLabel',
          });
          const firstNamePlaceholder = intl.formatMessage({
            id: 'ProfileSettingsForm.firstNamePlaceholder',
          });
          const firstNameRequiredMessage = intl.formatMessage({
            id: 'ProfileSettingsForm.firstNameRequired',
          });
          // A rental contract needs a real name - minLength alone can't
          // catch "aa"/"xx"-style placeholders, so validRealName (shared
          // with StripeConnectAccountForm.js) rejects those too.
          const firstNameRequired = validators.composeValidators(
            validators.required(firstNameRequiredMessage),
            validators.minLength(
              intl.formatMessage({ id: 'ProfileSettingsForm.firstNameTooShort' }),
              2
            ),
            validators.validRealName(intl.formatMessage({ id: 'ProfileSettingsForm.firstNameInvalid' }))
          );

          // Last name
          const lastNameLabel = intl.formatMessage({
            id: 'ProfileSettingsForm.lastNameLabel',
          });
          const lastNamePlaceholder = intl.formatMessage({
            id: 'ProfileSettingsForm.lastNamePlaceholder',
          });
          const lastNameRequiredMessage = intl.formatMessage({
            id: 'ProfileSettingsForm.lastNameRequired',
          });
          const lastNameRequired = validators.composeValidators(
            validators.required(lastNameRequiredMessage),
            validators.minLength(
              intl.formatMessage({ id: 'ProfileSettingsForm.lastNameTooShort' }),
              2
            ),
            validators.validRealName(intl.formatMessage({ id: 'ProfileSettingsForm.lastNameInvalid' }))
          );

          // Bio
          const bioLabel = intl.formatMessage({
            id: 'ProfileSettingsForm.bioLabel',
          });
          const bioPlaceholder = intl.formatMessage({
            id: 'ProfileSettingsForm.bioPlaceholder',
          });

          const uploadingOverlay =
            uploadInProgress || this.state.uploadDelay ? (
              <div className={css.uploadingImageOverlay}>
                <IconSpinner />
              </div>
            ) : null;

          const hasUploadError = !!uploadImageError && !uploadInProgress;
          const errorClasses = classNames({ [css.avatarUploadError]: hasUploadError });
          const transientUserProfileImage = profileImage.uploadedImage || user.profileImage;
          const transientUser = { ...user, profileImage: transientUserProfileImage };

          // Ensure that file exists if imageFromFile is used
          const fileExists = !!profileImage.file;
          const fileUploadInProgress = uploadInProgress && fileExists;
          const delayAfterUpload = profileImage.imageId && this.state.uploadDelay;
          const imageFromFile =
            fileExists && (fileUploadInProgress || delayAfterUpload) ? (
              <ImageFromFile
                id={profileImage.id}
                className={errorClasses}
                rootClassName={css.uploadingImage}
                aspectWidth={1}
                aspectHeight={1}
                file={profileImage.file}
              >
                {uploadingOverlay}
              </ImageFromFile>
            ) : null;

          // Avatar is rendered in hidden during the upload delay
          // Upload delay smoothes image change process:
          // responsive img has time to load srcset stuff before it is shown to user.
          const avatarClasses = classNames(errorClasses, css.avatar, {
            [css.avatarInvisible]: this.state.uploadDelay,
          });
          const avatarComponent =
            !fileUploadInProgress && profileImage.imageId ? (
              <Avatar
                className={avatarClasses}
                renderSizes="(max-width: 767px) 96px, 240px"
                user={transientUser}
                disableProfileLink
              />
            ) : null;

          const chooseAvatarLabel =
            profileImage.imageId || fileUploadInProgress ? (
              <div className={css.avatarContainer}>
                {imageFromFile}
                {avatarComponent}
                <div className={css.changeAvatar}>
                  <FormattedMessage id="ProfileSettingsForm.changeAvatar" />
                </div>
              </div>
            ) : (
              <div className={css.avatarPlaceholder}>
                <div className={css.avatarPlaceholderText}>
                  <FormattedMessage id="ProfileSettingsForm.addYourProfilePicture" />
                </div>
                <div className={css.avatarPlaceholderTextMobile}>
                  <FormattedMessage id="ProfileSettingsForm.addYourProfilePictureMobile" />
                </div>
              </div>
            );

          const submitError = updateProfileError ? (
            <div className={css.error}>
              <FormattedMessage id="ProfileSettingsForm.updateProfileFailed" />
            </div>
          ) : null;

          const classes = classNames(rootClassName || css.root, className);
          const submitInProgress = updateInProgress;
          const submittedOnce = Object.keys(this.submittedValues).length > 0;
          const pristineSinceLastSubmit = submittedOnce && isEqual(values, this.submittedValues);
          const submitDisabled =
            invalid || pristine || pristineSinceLastSubmit || uploadInProgress || submitInProgress;

          const userFieldProps = getPropsForCustomUserFieldInputs(
            userFields,
            userTypeConfig?.userType,
            false
          );

          return (
            <Form
              className={classes}
              onSubmit={e => {
                this.submittedValues = values;
                handleSubmit(e);
              }}
            >
              <div className={css.sectionContainer}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.yourProfilePicture" />
                </H4>
                <Field
                  accept={ACCEPT_IMAGES}
                  id="profileImage"
                  name="profileImage"
                  label={chooseAvatarLabel}
                  type="file"
                  form={null}
                  uploadImageError={uploadImageError}
                  disabled={uploadInProgress}
                >
                  {fieldProps => {
                    const { accept, id, input, label, disabled, uploadImageError } = fieldProps;
                    const { name, type } = input;
                    const onChange = e => {
                      const file = e.target.files[0];
                      form.change(`profileImage`, file);
                      form.blur(`profileImage`);
                      if (file != null) {
                        const tempId = `${file.name}_${Date.now()}`;
                        onImageUpload({ id: tempId, file });
                      }
                    };

                    let error = null;

                    if (isUploadImageOverLimitError(uploadImageError)) {
                      error = (
                        <div className={css.error}>
                          <FormattedMessage id="ProfileSettingsForm.imageUploadFailedFileTooLarge" />
                        </div>
                      );
                    } else if (uploadImageError) {
                      error = (
                        <div className={css.error}>
                          <FormattedMessage id="ProfileSettingsForm.imageUploadFailed" />
                        </div>
                      );
                    }

                    return (
                      <div className={css.uploadAvatarWrapper}>
                        <label className={css.label} htmlFor={id}>
                          {label}
                        </label>
                        <input
                          accept={accept}
                          id={id}
                          name={name}
                          className={css.uploadAvatarInput}
                          disabled={disabled}
                          onChange={onChange}
                          type={type}
                        />
                        {error}
                      </div>
                    );
                  }}
                </Field>
                <div className={css.tip}>
                  <FormattedMessage id="ProfileSettingsForm.tip" />
                </div>
                <div className={css.fileInfo}>
                  <FormattedMessage id="ProfileSettingsForm.fileInfo" />
                </div>
              </div>
              <div className={css.sectionContainer}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.yourName" />
                </H4>
                <div className={css.nameContainer}>
                  <FieldTextInput
                    className={css.firstName}
                    type="text"
                    id="firstName"
                    name="firstName"
                    label={firstNameLabel}
                    placeholder={firstNamePlaceholder}
                    validate={firstNameRequired}
                  />
                  <FieldTextInput
                    className={css.lastName}
                    type="text"
                    id="lastName"
                    name="lastName"
                    label={lastNameLabel}
                    placeholder={lastNamePlaceholder}
                    validate={lastNameRequired}
                  />
                </div>
              </div>

              <DisplayNameMaybe userTypeConfig={userTypeConfig} intl={intl} />

              <div className={css.sectionContainer}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.contactDetailsHeading" />
                </H4>
                <p className={css.extraInfo}>
                  <FormattedMessage id="ProfileSettingsForm.contactDetailsInfo" />
                </p>
                <FieldTextInput
                  className={css.row}
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  label={intl.formatMessage({ id: 'ProfileSettingsForm.phoneNumberLabel' })}
                  placeholder={intl.formatMessage({
                    id: 'ProfileSettingsForm.phoneNumberPlaceholder',
                  })}
                  validate={validators.validPhoneNumber(
                    intl.formatMessage({ id: 'ProfileSettingsForm.phoneNumberInvalid' })
                  )}
                />
                <FieldTextInput
                  className={css.row}
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  label={intl.formatMessage({ id: 'ProfileSettingsForm.birthDateLabel' })}
                  validate={validateBirthDate(
                    intl.formatMessage(
                      { id: 'ProfileSettingsForm.birthDateInvalid' },
                      { minAge: MINIMUM_RENTER_AGE_YEARS }
                    )
                  )}
                />
                <FieldTextInput
                  className={css.row}
                  type="text"
                  id="addressLine1"
                  name="addressLine1"
                  label={intl.formatMessage({ id: 'ProfileSettingsForm.addressLine1Label' })}
                  placeholder={intl.formatMessage({
                    id: 'ProfileSettingsForm.addressLine1Placeholder',
                  })}
                />
                <div className={css.nameContainer}>
                  <FieldTextInput
                    className={css.firstName}
                    type="text"
                    id="addressPostalCode"
                    name="addressPostalCode"
                    label={intl.formatMessage({ id: 'ProfileSettingsForm.addressPostalCodeLabel' })}
                    placeholder={intl.formatMessage({
                      id: 'ProfileSettingsForm.addressPostalCodePlaceholder',
                    })}
                  />
                  <FieldTextInput
                    className={css.lastName}
                    type="text"
                    id="addressCity"
                    name="addressCity"
                    label={intl.formatMessage({ id: 'ProfileSettingsForm.addressCityLabel' })}
                    placeholder={intl.formatMessage({
                      id: 'ProfileSettingsForm.addressCityPlaceholder',
                    })}
                  />
                </div>
              </div>

              <div className={classNames(css.sectionContainer)}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.bioHeading" />
                </H4>
                <FieldTextInput
                  type="textarea"
                  id="bio"
                  name="bio"
                  label={bioLabel}
                  placeholder={bioPlaceholder}
                />
                <p className={css.extraInfo}>
                  <FormattedMessage id="ProfileSettingsForm.bioInfo" values={{ marketplaceName }} />
                </p>
              </div>
              <div className={classNames(css.sectionContainer)}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.externalReviewHeading" />
                </H4>
                <p className={css.extraInfo}>
                  <FormattedMessage
                    id="ProfileSettingsForm.externalReviewInfo"
                    values={{ marketplaceName }}
                  />
                </p>
                <FieldSelect
                  id="externalReviewSource"
                  name="externalReviewSource"
                  label={intl.formatMessage({ id: 'ProfileSettingsForm.externalReviewSourceLabel' })}
                >
                  <option value="">
                    {intl.formatMessage({ id: 'ProfileSettingsForm.externalReviewSourceNone' })}
                  </option>
                  <option value="google">Google</option>
                  <option value="facebook">Facebook</option>
                  <option value="trustpilot">Trustpilot</option>
                  <option value="other">
                    {intl.formatMessage({ id: 'ProfileSettingsForm.externalReviewSourceOther' })}
                  </option>
                </FieldSelect>
                <FieldTextInput
                  type="number"
                  id="externalReviewRating"
                  name="externalReviewRating"
                  step="0.1"
                  min="1"
                  max="5"
                  label={intl.formatMessage({ id: 'ProfileSettingsForm.externalReviewRatingLabel' })}
                  placeholder="4.8"
                  validate={validateOptionalRating(
                    intl.formatMessage({ id: 'ProfileSettingsForm.externalReviewRatingInvalid' })
                  )}
                />
                <FieldTextInput
                  type="number"
                  id="externalReviewCount"
                  name="externalReviewCount"
                  min="0"
                  step="1"
                  label={intl.formatMessage({ id: 'ProfileSettingsForm.externalReviewCountLabel' })}
                  placeholder="27"
                />
                <FieldTextInput
                  type="text"
                  id="externalReviewUrl"
                  name="externalReviewUrl"
                  label={intl.formatMessage({ id: 'ProfileSettingsForm.externalReviewUrlLabel' })}
                  placeholder="https://g.page/..."
                  validate={value =>
                    value
                      ? validators.validBusinessURL(
                          intl.formatMessage({ id: 'ProfileSettingsForm.externalReviewUrlInvalid' })
                        )(value)
                      : undefined
                  }
                />
              </div>
              <div className={classNames(css.sectionContainer, css.lastSection)}>
                {userFieldProps.map(({ key, ...fieldProps }) => (
                  <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
                ))}
              </div>
              {submitError}
              <Button
                className={css.submitButton}
                type="submit"
                inProgress={submitInProgress}
                disabled={submitDisabled}
                ready={pristineSinceLastSubmit}
              >
                <FormattedMessage id="ProfileSettingsForm.saveChanges" />
              </Button>
            </Form>
          );
        }}
      />
    );
  }
}

const ProfileSettingsForm = compose(injectIntl)(ProfileSettingsFormComponent);

ProfileSettingsForm.displayName = 'ProfileSettingsForm';

export default ProfileSettingsForm;
