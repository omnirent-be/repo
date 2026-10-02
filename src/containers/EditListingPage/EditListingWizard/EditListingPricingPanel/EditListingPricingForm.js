import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

// Import configs and util modules
import appSettings from '../../../../config/settings';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import * as validators from '../../../../util/validators';
import { formatMoney } from '../../../../util/currency';
import { types as sdkTypes } from '../../../../util/sdkLoader';
import { FIXED, isBookingProcess, isNegotiationProcess } from '../../../../transactions/transaction';

// Import shared components
import {
  Button,
  Form,
  FieldCurrencyInput,
  FieldCheckbox,
  FieldCheckboxGroup,
} from '../../../../components';

import BookingPriceVariants from './BookingPriceVariants';
import StartTimeInterval from './StartTimeInverval';

// Import modules from this directory
import css from './EditListingPricingForm.module.css';

const { Money } = sdkTypes;

// Live preview of what a multi-day booking would cost, computed from the
// day price + extra-day price the provider is already filling in. Helps
// them see the effect of their own numbers before publishing, instead of
// only finding out once a renter reaches checkout.
const MultiDayPricePreview = ({ price, extraDayPrice, marketplaceCurrency, intl }) => {
  const isValidMoney = value => value instanceof Money && Number.isInteger(value.amount);

  if (!isValidMoney(price)) {
    return null;
  }

  const extraDayAmount = isValidMoney(extraDayPrice) ? extraDayPrice.amount : price.amount;

  const totalFor = days => {
    const amount = price.amount + (days - 1) * extraDayAmount;
    return formatMoney(intl, new Money(amount, marketplaceCurrency));
  };

  return (
    <div className={css.multiDayPreview}>
      <span className={css.multiDayPreviewTitle}>
        <FormattedMessage id="EditListingPricingForm.multiDayPreviewTitle" />
      </span>
      <div className={css.multiDayPreviewRow}>
        <span><FormattedMessage id="EditListingPricingForm.multiDayPreview3Days" /></span>
        <span>{totalFor(3)}</span>
      </div>
      <div className={css.multiDayPreviewRow}>
        <span><FormattedMessage id="EditListingPricingForm.multiDayPreview7Days" /></span>
        <span>{totalFor(7)}</span>
      </div>
    </div>
  );
};

// Shows what similar, already-published listings in the same category charge, so the
// provider has a real reference point instead of guessing a price cold.
const ComparablePriceSuggestion = ({ comparablePrices, marketplaceCurrency, intl }) => {
  if (!comparablePrices || comparablePrices.count < 2) {
    return null;
  }

  const { count, min, max, avg, currency } = comparablePrices;
  const formatAmount = amount =>
    formatMoney(intl, new Money(amount, currency || marketplaceCurrency));

  return (
    <div className={css.comparablePrices}>
      <span className={css.comparablePricesTitle}>
        <FormattedMessage id="EditListingPricingForm.comparablePricesTitle" />
      </span>
      <div>
        <FormattedMessage
          id="EditListingPricingForm.comparablePricesText"
          values={{
            count,
            avg: formatAmount(avg),
            min: formatAmount(min),
            max: formatAmount(max),
          }}
        />
      </div>
    </div>
  );
};

// Belgian WER/FOD Economie compliance: a pure "prijs op aanvraag" isn't
// allowed towards consumers without an indicative basis - so a
// negotiation-process (quote-based) listing must always show a real
// "Vanaf €X" starting price on the frontend, not nothing. See
// getPriceValidators for the fixed-price case; this is the same idea, just
// its own message since "vanaf-prijs" is conceptually a minimum, not the
// final price.
const getStartingPriceValidators = (marketplaceCurrency, intl) => {
  const requiredMsg = intl.formatMessage({ id: 'EditListingPricingForm.startingPriceRequired' });
  return validators.required(requiredMsg);
};

const QUOTE_PRICE_VARIABLE_OPTIONS = [
  { key: 'eventDuration', labelId: 'EditListingPricingForm.quotePriceVariableEventDuration' },
  { key: 'distance', labelId: 'EditListingPricingForm.quotePriceVariableDistance' },
  { key: 'staffing', labelId: 'EditListingPricingForm.quotePriceVariableStaffing' },
  { key: 'headcount', labelId: 'EditListingPricingForm.quotePriceVariableHeadcount' },
];

const getPriceValidators = (listingMinimumPriceSubUnits, marketplaceCurrency, intl) => {
  const priceRequiredMsgId = { id: 'EditListingPricingForm.priceRequired' };
  const priceRequiredMsg = intl.formatMessage(priceRequiredMsgId);
  const priceRequired = validators.required(priceRequiredMsg);

  const minPriceRaw = new Money(listingMinimumPriceSubUnits, marketplaceCurrency);
  const minPrice = formatMoney(intl, minPriceRaw);
  const priceTooLowMsgId = { id: 'EditListingPricingForm.priceTooLow' };
  const priceTooLowMsg = intl.formatMessage(priceTooLowMsgId, { minPrice });
  const minPriceRequired = validators.moneySubUnitAmountAtLeast(
    priceTooLowMsg,
    listingMinimumPriceSubUnits
  );

  return listingMinimumPriceSubUnits
    ? validators.composeValidators(priceRequired, minPriceRequired)
    : priceRequired;
};

const ErrorMessages = props => {
  const { fetchErrors } = props;
  const { updateListingError, showListingsError } = fetchErrors || {};

  return (
    <>
      {updateListingError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingPricingForm.updateFailed" />
        </p>
      ) : null}
      {showListingsError ? (
        <p className={css.error}>
          <FormattedMessage id="EditListingPricingForm.showListingFailed" />
        </p>
      ) : null}
    </>
  );
};

/**
 * The EditListingPricingForm component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.formId] - The form id
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} props.unitType - The unitType from listing.attributes.publicData
 * @param {Object} [props.listingTypeConfig] - The listing type config that matches with listingType on publicData.
 * @param {Object} [props.listingTypeConfig.priceVariations] - The price variations config.
 * @param {boolean} props.listingTypeConfig.priceVariations.enabled - Whether the price variations are enabled.
 * @param {Object} [props.listingTypeConfig.transactionType] - The transaction type config.
 * @param {string} props.listingTypeConfig.transactionType.process - The transaction process config.
 * @param {string} props.marketplaceCurrency - The marketplace currency
 * @param {number} [props.listingMinimumPriceSubUnits] - The listing minimum price sub units
 * @param {boolean} [props.autoFocus] - Whether the input should be focused
 * @param {boolean} [props.disabled] - Whether the form is disabled
 * @param {boolean} [props.ready] - Whether the form is ready
 * @param {Function} props.onSubmit - The submit function
 * @param {boolean} [props.invalid] - Whether the form is invalid
 * @param {boolean} [props.pristine] - Whether the form is pristine
 * @param {string} props.saveActionMsg - The save action message
 * @param {boolean} [props.updated] - Whether the form is updated
 * @param {boolean} [props.updateInProgress] - Whether the form is updating
 * @param {Object} [props.fetchErrors] - The fetch errors
 * @returns {JSX.Element}
 */
export const EditListingPricingForm = props => (
  <FinalForm
    mutators={{ ...arrayMutators }}
    {...props}
    render={formRenderProps => {
      const {
        formId = 'EditListingPricingForm',
        form: formApi,
        autoFocus,
        className,
        rootClassName,
        disabled,
        ready,
        handleSubmit,
        marketplaceCurrency,
        unitType,
        listingTypeConfig,
        isPriceVariationsInUse,
        comparablePrices,
        listingMinimumPriceSubUnits = 0,
        invalid,
        pristine,
        saveActionMsg,
        updated,
        updateInProgress = false,
        fetchErrors,
        initialValues: formInitialValues,
        values: formValues,
        replacementValueInSubunits,
      } = formRenderProps;

      const intl = useIntl();
      const priceValidators = getPriceValidators(
        listingMinimumPriceSubUnits,
        marketplaceCurrency,
        intl
      );

      const classes = classNames(rootClassName || css.root, className);
      const submitReady = (updated && pristine) || ready;
      const submitInProgress = updateInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;
      const { transactionType } = listingTypeConfig || {};
      const { process } = transactionType || {};
      const isBooking = isBookingProcess(process);
      const isNegotiation = isNegotiationProcess(process);
      const startingPriceValidators = getStartingPriceValidators(marketplaceCurrency, intl);

      const isFixedLengthBooking = isBooking && unitType === FIXED;
      const isBookingPriceVariationsInUse = isBooking && isPriceVariationsInUse;
      const isUsingPriceVariants = isFixedLengthBooking || isBookingPriceVariationsInUse;

      // 20% of the replacement value (set in the previous wizard step, see
      // EditListingRentalDetailsForm.js), min. €50 - just a suggestion text
      // next to the deposit field, never auto-filled into it, so a provider
      // who already typed their own amount never gets silently overridden.
      const MIN_SUGGESTED_DEPOSIT_SUBUNITS = 5000;
      const suggestedDepositMoney =
        replacementValueInSubunits != null
          ? new Money(
              Math.max(
                MIN_SUGGESTED_DEPOSIT_SUBUNITS,
                Math.round(replacementValueInSubunits * 0.2)
              ),
              marketplaceCurrency
            )
          : null;

      return (
        <Form onSubmit={handleSubmit} className={classes}>
          <ErrorMessages fetchErrors={fetchErrors} />

          {isUsingPriceVariants ? (
            <BookingPriceVariants
              formId={formId}
              formApi={formApi}
              autoFocus={autoFocus}
              className={css.input}
              marketplaceCurrency={marketplaceCurrency}
              unitType={unitType}
              isPriceVariationsInUse={isBookingPriceVariationsInUse}
              initialLengthOfPriceVariants={formInitialValues?.priceVariants?.length || 0}
              listingMinimumPriceSubUnits={listingMinimumPriceSubUnits}
            />
          ) : isNegotiation ? (
            <>
              <FieldCurrencyInput
                id={`${formId}price`}
                name="price"
                className={css.input}
                autoFocus={autoFocus}
                label={intl.formatMessage({ id: 'EditListingPricingForm.startingPriceLabel' })}
                placeholder={intl.formatMessage({
                  id: 'EditListingPricingForm.priceInputPlaceholder',
                })}
                currencyConfig={appSettings.getCurrencyFormatting(marketplaceCurrency)}
                validate={startingPriceValidators}
              />
              <p className={css.fieldHint}>
                <FormattedMessage id="EditListingPricingForm.startingPriceHint" />
              </p>

              <FieldCheckboxGroup
                id={`${formId}quotePriceVariables`}
                name="quotePriceVariables"
                className={css.input}
                label={intl.formatMessage({ id: 'EditListingPricingForm.quotePriceVariablesLabel' })}
                twoColumns
                options={QUOTE_PRICE_VARIABLE_OPTIONS.map(({ key, labelId }) => ({
                  key,
                  label: intl.formatMessage({ id: labelId }),
                }))}
              />
            </>
          ) : (
            <FieldCurrencyInput
              id={`${formId}price`}
              name="price"
              className={css.input}
              autoFocus={autoFocus}
              label={intl.formatMessage(
                { id: 'EditListingPricingForm.pricePerProduct' },
                { unitType }
              )}
              placeholder={intl.formatMessage({
                id: 'EditListingPricingForm.priceInputPlaceholder',
              })}
              currencyConfig={appSettings.getCurrencyFormatting(marketplaceCurrency)}
              validate={priceValidators}
            />
          )}

          {!isUsingPriceVariants && !isNegotiation ? (
            <ComparablePriceSuggestion
              comparablePrices={comparablePrices}
              marketplaceCurrency={marketplaceCurrency}
              intl={intl}
            />
          ) : null}

          {isBooking && !isUsingPriceVariants ? (
            <>
              <FieldCurrencyInput
                id={`${formId}extraDayPrice`}
                name="extraDayPrice"
                className={css.input}
                label={intl.formatMessage({ id: 'EditListingPricingForm.extraDayPriceLabel' })}
                placeholder={intl.formatMessage({
                  id: 'EditListingPricingForm.extraDayPricePlaceholder',
                })}
                currencyConfig={appSettings.getCurrencyFormatting(marketplaceCurrency)}
              />
              <p className={css.fieldHint}>
                <FormattedMessage id="EditListingPricingForm.extraDayPriceHint" />
              </p>
            </>
          ) : null}

          {isBooking && !isUsingPriceVariants ? (
            <MultiDayPricePreview
              price={formValues.price}
              extraDayPrice={formValues.extraDayPrice}
              marketplaceCurrency={marketplaceCurrency}
              intl={intl}
            />
          ) : null}

          {isBooking || isNegotiation ? (
            <>
              <FieldCurrencyInput
                id={`${formId}deposit`}
                name="deposit"
                className={css.input}
                label={intl.formatMessage({ id: 'EditListingPricingForm.depositLabel' })}
                placeholder={intl.formatMessage({
                  id: 'EditListingPricingForm.depositPlaceholder',
                })}
                currencyConfig={appSettings.getCurrencyFormatting(marketplaceCurrency)}
              />
              {suggestedDepositMoney ? (
                <p className={css.depositSuggestionHint}>
                  <FormattedMessage
                    id="EditListingPricingForm.depositSuggestionHint"
                    values={{ suggested: formatMoney(intl, suggestedDepositMoney) }}
                  />
                </p>
              ) : null}
            </>
          ) : null}

          {isBooking ? (
            <>
              <FieldCheckbox
                id={`${formId}weekendDiscountEnabled`}
                name="weekendDiscountEnabled"
                label={intl.formatMessage({ id: 'EditListingPricingForm.weekendDiscountLabel' })}
              />
              <p className={css.checkboxHint}>
                <FormattedMessage id="EditListingPricingForm.weekendDiscountHint" />
              </p>
            </>
          ) : null}

          {isFixedLengthBooking ? (
            <StartTimeInterval
              name="startTimeInterval"
              idPrefix={`${formId}_startTimeInterval`}
              formValues={formValues}
              pristine={pristine}
            />
          ) : null}

          <Button
            className={css.submitButton}
            type="submit"
            inProgress={submitInProgress}
            disabled={submitDisabled}
            ready={submitReady}
          >
            {saveActionMsg}
          </Button>
        </Form>
      );
    }}
  />
);

export default EditListingPricingForm;
