import React, { useEffect, useRef, useState } from 'react';
import { Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import * as validators from '../../../util/validators';
import { getPropsForCustomUserFieldInputs } from '../../../util/userHelpers';

import {
  Form,
  PrimaryButton,
  FieldSelect,
  FieldTextInput,
  CustomExtendedDataField,
} from '../../../components';

import FieldSelectUserType from '../FieldSelectUserType';
import UserFieldDisplayName from '../UserFieldDisplayName';
import UserFieldPhoneNumber from '../UserFieldPhoneNumber';

import css from './SignupForm.module.css';

const getSoleUserTypeMaybe = userTypes =>
  Array.isArray(userTypes) && userTypes.length === 1 ? userTypes[0].userType : null;

const isPasswordUsedMoreThanOnce = formValues => {
  const pw = formValues.password;
  const hasPasswordString = pw != null && pw.length >= validators.PASSWORD_MIN_LENGTH;

  if (hasPasswordString) {
    // confirmPassword is expected to equal password - only flag it if some
    // *other* field (e.g. email typed into the wrong box) also matches.
    const otherValues = Object.entries(formValues)
      .filter(([key]) => key !== 'confirmPassword')
      .map(([, value]) => value);
    const isPasswordRepeated = otherValues.filter(v => v === pw).length > 1;
    return isPasswordRepeated;
  }
  return false;
};

// Password input with a "Toon / Verberg" switch on the label line. Because
// the password can be revealed, no second "repeat password" field is needed.
const PasswordField = ({ formId, label, placeholder, validate, values, minLength, intl }) => {
  const [visible, setVisible] = useState(false);
  const length = values?.password?.length || 0;
  const isLongEnough = length >= minLength;

  return (
    <div className={css.passwordField}>
      <FieldTextInput
        className={css.password}
        type={visible ? 'text' : 'password'}
        id={formId ? `${formId}.password` : 'password'}
        name="password"
        autoComplete="new-password"
        label={label}
        placeholder={placeholder}
        validate={validate}
      />
      <button
        type="button"
        className={css.passwordToggle}
        onClick={() => setVisible(v => !v)}
        aria-pressed={visible}
      >
        {intl.formatMessage({
          id: visible ? 'SignupForm.passwordHide' : 'SignupForm.passwordShow',
        })}
      </button>
      <p className={classNames(css.passwordHint, { [css.passwordHintOk]: isLongEnough })}>
        <span className={css.passwordHintIcon} aria-hidden="true">
          {isLongEnough ? '✓' : '•'}
        </span>
        <FormattedMessage id="SignupForm.passwordHint" values={{ minLength }} />
      </p>
    </div>
  );
};

// Sliding-pill choice between the two account types.
const AccountTypeSwitch = ({ value, onChange, intl }) => {
  const options = ['individual', 'company'];
  const selectedIndex = Math.max(0, options.indexOf(value));
  return (
    <div className={css.accountTypeRow}>
      <span className={css.accountTypeLabel}>
        <FormattedMessage id="SignupForm.accountTypeLabel" />
      </span>
      <div className={css.accountTypeSwitch} role="group">
        <span
          className={css.accountTypePill}
          style={{ transform: `translateX(${selectedIndex * 100}%)` }}
          aria-hidden="true"
        />
        {options.map(option => (
          <button
            key={option}
            type="button"
            className={classNames(css.accountTypeOption, {
              [css.accountTypeOptionActive]: value === option,
            })}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {intl.formatMessage({
              id: option === 'company' ? 'SignupForm.accountTypeCompany' : 'SignupForm.accountTypeIndividual',
            })}
          </button>
        ))}
      </div>
    </div>
  );
};

const STEPS = ['login', 'about', 'finish'];
const STEP_FIELDS = [
  ['userType', 'email', 'password'],
  ['fname', 'lname', 'displayName', 'companyName', 'vatNumber'],
  [],
];
const REFERRAL_SOURCES = ['search', 'facebook', 'instagram', 'friend', 'event', 'other'];

const SignupFormComponent = props => {
  const [step, setStep] = useState(0);
  const stepsRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const firstInput = stepsRef.current?.querySelector(
      `[data-step="${step}"] input:not([type="hidden"]), [data-step="${step}"] select`
    );
    firstInput?.focus();
  }, [step]);

  return (
  <FinalForm
    {...props}
    mutators={{
      ...arrayMutators,
      touchFields: ([names], state) => {
        names.forEach(name => {
          if (state.fields[name]) {
            state.fields[name].touched = true;
          }
        });
      },
    }}
    initialValues={{
      userType: props.preselectedUserType || getSoleUserTypeMaybe(props.userTypes),
      accountType: 'individual',
    }}
    render={formRenderProps => {
      const {
        rootClassName,
        className,
        formId,
        handleSubmit,
        form,
        inProgress,
        invalid,
        intl,
        termsAndConditions,
        preselectedUserType,
        userTypes,
        userFields,
        values,
      } = formRenderProps;

      const { userType, accountType } = values || {};
      const isCompanyAccount = accountType === 'company';

      // email
      const emailRequired = validators.required(
        intl.formatMessage({
          id: 'SignupFlow.emailRequired',
        })
      );
      const emailValid = validators.emailFormatValid(
        intl.formatMessage({
          id: 'SignupFlow.emailInvalid',
        })
      );

      // password
      const passwordRequiredMessage = intl.formatMessage({
        id: 'SignupFlow.passwordRequired',
      });
      const passwordMinLengthMessage = intl.formatMessage(
        {
          id: 'SignupFlow.passwordTooShort',
        },
        {
          minLength: validators.PASSWORD_MIN_LENGTH,
        }
      );
      const passwordMaxLengthMessage = intl.formatMessage(
        {
          id: 'SignupFlow.passwordTooLong',
        },
        {
          maxLength: validators.PASSWORD_MAX_LENGTH,
        }
      );
      const passwordMinLength = validators.minLength(
        passwordMinLengthMessage,
        validators.PASSWORD_MIN_LENGTH
      );
      const passwordMaxLength = validators.maxLength(
        passwordMaxLengthMessage,
        validators.PASSWORD_MAX_LENGTH
      );
      const passwordRequired = validators.requiredStringNoTrim(passwordRequiredMessage);
      const passwordValidators = validators.composeValidators(
        passwordRequired,
        passwordMinLength,
        passwordMaxLength
      );

      // Company details are only required when "Bedrijf" is selected above -
      // these validators read isCompanyAccount from the outer scope, which
      // re-evaluates on every render as the radio selection changes.
      const companyNameValidator = value => {
        if (!isCompanyAccount) {
          return undefined;
        }
        return value
          ? undefined
          : intl.formatMessage({ id: 'SignupFlow.companyNameRequired' });
      };

      const vatNumberValidator = value => {
        if (!isCompanyAccount) {
          return undefined;
        }
        if (!value) {
          return intl.formatMessage({ id: 'SignupFlow.vatNumberRequired' });
        }
        const normalized = value.replace(/[\s.]/g, '').toUpperCase();
        const isValidBelgianVat = /^BE0\d{9}$/.test(normalized);
        return isValidBelgianVat
          ? undefined
          : intl.formatMessage({ id: 'SignupFlow.vatNumberInvalid' });
      };

      // Custom user fields. Since user types are not supported here,
      // only fields with no user type id limitation are selected.
      const userFieldProps = getPropsForCustomUserFieldInputs(userFields, userType);

      const noUserTypes = !userType && !(userTypes?.length > 0);
      const userTypeConfig = userTypes.find(config => config.userType === userType);
      const showDefaultUserFields = userType || noUserTypes;
      const showCustomUserFields = (userType || noUserTypes) && userFieldProps?.length > 0;

      const classes = classNames(rootClassName || css.root, className);
      const submitInProgress = inProgress;
      const submitDisabled = invalid || submitInProgress || isPasswordUsedMoreThanOnce(values);

      const isLastStep = step === STEPS.length - 1;

      // Show the errors of the current step's fields and only move on when
      // there are none. Every step stays mounted (just hidden), so all the
      // validators keep running.
      const goToNextStep = () => {
        const fields = STEP_FIELDS[step];
        form.mutators.touchFields(fields);
        const hasErrors = fields.some(name => form.getState().errors?.[name]);
        if (!hasErrors) {
          setStep(step + 1);
        }
      };

      const onFormSubmit = event => {
        if (!isLastStep) {
          event.preventDefault();
          goToNextStep();
          return;
        }
        handleSubmit(event);
      };

      return (
        <Form className={classes} onSubmit={onFormSubmit}>
          {step === 0 ? (
            <ul className={css.perks}>
              {['free', 'quick', 'oneAccount'].map(perk => (
                <li key={perk} className={css.perk}>
                  <span className={css.perkCheck} aria-hidden="true">
                    ✓
                  </span>
                  <FormattedMessage id={`SignupForm.perk.${perk}`} />
                </li>
              ))}
            </ul>
          ) : null}

          <div ref={stepsRef}>
            <div className={css.stepPanel} data-step="0" hidden={step !== 0}>
              <p className={css.stepIntro}>
                <FormattedMessage id="SignupFlow.intro.login" />
              </p>
              <FieldSelectUserType
                name="userType"
                userTypes={userTypes}
                hasExistingUserType={!!preselectedUserType}
                intl={intl}
              />
              {showDefaultUserFields ? (
                <>
                  <FieldTextInput
                    className={css.row}
                    type="email"
                    id={formId ? `${formId}.email` : 'email'}
                    name="email"
                    autoComplete="email"
                    label={intl.formatMessage({ id: 'SignupForm.emailLabel' })}
                    placeholder={intl.formatMessage({ id: 'SignupForm.emailPlaceholder' })}
                    validate={validators.composeValidators(emailRequired, emailValid)}
                  />
                  <PasswordField
                    formId={formId}
                    label={intl.formatMessage({ id: 'SignupForm.passwordLabel' })}
                    placeholder={intl.formatMessage({ id: 'SignupFlow.passwordPlaceholder' })}
                    validate={passwordValidators}
                    values={values}
                    minLength={validators.PASSWORD_MIN_LENGTH}
                    intl={intl}
                  />
                </>
              ) : null}
            </div>

            <div className={css.stepPanel} data-step="1" hidden={step !== 1}>
              <p className={css.stepIntro}>
                <FormattedMessage id="SignupFlow.intro.about" />
              </p>
              {showDefaultUserFields ? (
                <>
                  <div className={css.name}>
                    <FieldTextInput
                      className={css.firstNameRoot}
                      type="text"
                      id={formId ? `${formId}.fname` : 'fname'}
                      name="fname"
                      autoComplete="given-name"
                      label={intl.formatMessage({ id: 'SignupForm.firstNameLabel' })}
                      placeholder={intl.formatMessage({ id: 'SignupForm.firstNamePlaceholder' })}
                      validate={validators.required(
                        intl.formatMessage({ id: 'SignupFlow.firstNameRequired' })
                      )}
                    />
                    <FieldTextInput
                      className={css.lastNameRoot}
                      type="text"
                      id={formId ? `${formId}.lname` : 'lname'}
                      name="lname"
                      autoComplete="family-name"
                      label={intl.formatMessage({ id: 'SignupForm.lastNameLabel' })}
                      placeholder={intl.formatMessage({ id: 'SignupForm.lastNamePlaceholder' })}
                      validate={validators.required(
                        intl.formatMessage({ id: 'SignupFlow.lastNameRequired' })
                      )}
                    />
                  </div>

                  <UserFieldDisplayName
                    formName="SignupForm"
                    className={css.row}
                    userTypeConfig={userTypeConfig}
                    intl={intl}
                  />

                  <AccountTypeSwitch
                    value={accountType}
                    onChange={option => form.change('accountType', option)}
                    intl={intl}
                  />

                  {isCompanyAccount ? (
                    <div className={css.companyFields}>
                      <FieldTextInput
                        type="text"
                        id={formId ? `${formId}.companyName` : 'companyName'}
                        name="companyName"
                        label={intl.formatMessage({ id: 'SignupForm.companyNameLabel' })}
                        placeholder={intl.formatMessage({ id: 'SignupForm.companyNamePlaceholder' })}
                        validate={companyNameValidator}
                      />
                      <FieldTextInput
                        type="text"
                        id={formId ? `${formId}.vatNumber` : 'vatNumber'}
                        name="vatNumber"
                        label={intl.formatMessage({ id: 'SignupForm.vatNumberLabel' })}
                        placeholder={intl.formatMessage({ id: 'SignupForm.vatNumberPlaceholder' })}
                        validate={vatNumberValidator}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className={css.stepPanel} data-step="2" hidden={step !== 2}>
              <p className={css.stepIntro}>
                <FormattedMessage id="SignupFlow.intro.finish" />
              </p>
              {showDefaultUserFields ? (
                <>
                  <UserFieldPhoneNumber
                    formName="SignupForm"
                    className={css.row}
                    userTypeConfig={userTypeConfig}
                    intl={intl}
                  />

                  <FieldSelect
                    className={css.row}
                    id={formId ? `${formId}.referralSource` : 'referralSource'}
                    name="referralSource"
                    label={intl.formatMessage({ id: 'SignupForm.referralSourceLabel' })}
                  >
                    <option value="">
                      {intl.formatMessage({ id: 'SignupForm.referralSourcePlaceholder' })}
                    </option>
                    {REFERRAL_SOURCES.map(source => (
                      <option key={source} value={source}>
                        {intl.formatMessage({ id: `SignupForm.referralSource.${source}` })}
                      </option>
                    ))}
                  </FieldSelect>
                </>
              ) : null}

              {showCustomUserFields ? (
                <div className={css.customFields}>
                  {userFieldProps.map(({ key, ...fieldProps }) => (
                    <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className={css.bottomWrapper}>
            {isLastStep ? termsAndConditions : null}
            {isLastStep && isPasswordUsedMoreThanOnce(values) ? (
              <div className={css.error}>
                <FormattedMessage id="SignupFlow.passwordRepeated" />
              </div>
            ) : null}
            {isLastStep ? (
              <PrimaryButton type="submit" inProgress={submitInProgress} disabled={submitDisabled}>
                <FormattedMessage id="SignupFlow.submit" />
              </PrimaryButton>
            ) : (
              <PrimaryButton type="button" onClick={goToNextStep}>
                <FormattedMessage id="SignupFlow.next" />
              </PrimaryButton>
            )}
            {step > 0 ? (
              <button type="button" className={css.backButton} onClick={() => setStep(step - 1)}>
                <FormattedMessage id="SignupFlow.back" />
              </button>
            ) : null}
          </div>
        </Form>
      );
    }}
  />
  );
};

/**
 * A component that renders the signup form.
 *
 * @component
 * @param {Object} props
 * @param {string} props.rootClassName - The root class name that overrides the default class css.root
 * @param {string} props.className - The class that extends the root class
 * @param {string} props.formId - The form id
 * @param {boolean} props.inProgress - Whether the form is in progress
 * @param {ReactNode} props.termsAndConditions - The terms and conditions
 * @param {string} props.preselectedUserType - The preselected user type
 * @param {propTypes.userTypes} props.userTypes - The user types
 * @param {propTypes.listingFields} props.userFields - The user fields
 * @returns {JSX.Element}
 */
const SignupForm = props => {
  const intl = useIntl();
  return <SignupFormComponent {...props} intl={intl} />;
};

export default SignupForm;
