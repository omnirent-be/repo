import React from 'react';
import { Form as FinalForm } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { required, composeValidators, numberAtLeast } from '../../../../util/validators';
import appSettings from '../../../../config/settings';
import { EXTENDED_DATA_SCHEMA_TYPES } from '../../../../util/types';
import { isFieldForCategory, isFieldForListingType } from '../../../../util/fieldHelpers';

import {
  Form,
  Button,
  FieldTextInput,
  FieldCurrencyInput,
  FieldRadioButton,
  H4,
  CustomExtendedDataField,
} from '../../../../components';

import css from './EditListingRentalDetailsForm.module.css';

export const CONDITION_NEW = 'new';
export const CONDITION_GOOD = 'good';
export const CONDITION_LIGHT_WEAR = 'light-wear';

// "Kofferbak-Index" - the transport drempel is the #1 logistical doubt for
// local renters (see ListingCard/ListingPage badge using the same values),
// so the provider picks it once here instead of a huurder having to guess
// from photos alone.
export const TRANSPORT_COMPACT = 'compact';
export const TRANSPORT_MEDIUM = 'medium';
export const TRANSPORT_LARGE = 'large';

// Custom per-category listing fields (Console-configured, e.g.
// "Amenities") - same rendering as EditListingDetailsForm.js's own
// AddListingFields, duplicated for the same reason as everything else in
// this new panel (see the file-level comment below): booking listings no
// longer go through the shared Details form at all, so this is the only
// place left that still renders them for a booking listing.
const AddListingFields = props => {
  const { listingType, listingFieldsConfig, selectedCategories, formId, intl } = props;
  const targetCategoryIds = Object.values(selectedCategories || {});

  const fields = (listingFieldsConfig || []).reduce((pickedFields, fieldConfig) => {
    const { key, schemaType, scope } = fieldConfig || {};
    const namespacedKey = scope === 'public' ? `pub_${key}` : `priv_${key}`;

    const isKnownSchemaType = EXTENDED_DATA_SCHEMA_TYPES.includes(schemaType);
    const isProviderScope = ['public', 'private'].includes(scope);
    const isTargetListingType = isFieldForListingType(listingType, fieldConfig);
    const isTargetCategory = isFieldForCategory(targetCategoryIds, fieldConfig);

    return isKnownSchemaType && isProviderScope && isTargetListingType && isTargetCategory
      ? [
          ...pickedFields,
          <CustomExtendedDataField
            key={namespacedKey}
            name={namespacedKey}
            fieldConfig={fieldConfig}
            defaultRequiredMessage={intl.formatMessage({
              id: 'EditListingRentalDetailsForm.defaultRequiredMessage',
            })}
            formId={formId}
          />,
        ]
      : pickedFields;
  }, []);

  return <>{fields}</>;
};

/**
 * Stap 2 ("Details & Contract") van de listing-wizard voor het
 * default-booking-proces - zie EditListingWizard.js. Enkel de velden die
 * rechtstreeks in de huurovereenkomst terechtkomen (zie
 * server/api-util/contractPdf.js, punten 3, 5 en 10): omschrijving,
 * toebehoren, vervangwaarde en staat.
 *
 * Bewust een apart, nieuw paneel i.p.v. het bestaande, gedeelde
 * EditListingDetailsForm in te korten - dat formulier wordt nog steeds
 * ongewijzigd gebruikt door de andere processen (purchase/negotiation/
 * inquiry/download), die geen aparte "Basis & Foto's"-stap hebben en dus
 * titel + categorie + omschrijving nog altijd samen nodig hebben.
 *
 * @component
 */
export const EditListingRentalDetailsForm = props => (
  <FinalForm
    {...props}
    mutators={{ ...arrayMutators }}
    keepDirtyOnReinitialize
    render={formRenderProps => {
      const {
        className,
        disabled,
        ready,
        formId = 'EditListingRentalDetailsForm',
        handleSubmit,
        invalid,
        pristine,
        saveActionMsg,
        updated,
        updateInProgress,
        fetchErrors,
        marketplaceCurrency,
        listingType,
        listingFieldsConfig,
        selectedCategories,
      } = formRenderProps;
      const intl = useIntl();

      const { updateListingError, showListingsError } = fetchErrors || {};
      const currencyConfig = appSettings.getCurrencyFormatting(marketplaceCurrency);

      const classes = classNames(css.root, className);
      const submitReady = (updated && pristine) || ready;
      const submitInProgress = updateInProgress;
      const submitDisabled = invalid || disabled || submitInProgress;

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          {updateListingError ? (
            <p className={css.error}>
              <FormattedMessage id="EditListingRentalDetailsForm.updateFailed" />
            </p>
          ) : null}
          {showListingsError ? (
            <p className={css.error}>
              <FormattedMessage id="EditListingRentalDetailsForm.showListingFailed" />
            </p>
          ) : null}

          <FieldTextInput
            id={`${formId}description`}
            name="description"
            className={css.field}
            type="textarea"
            label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.description' })}
            placeholder={intl.formatMessage({
              id: 'EditListingRentalDetailsForm.descriptionPlaceholder',
            })}
            validate={required(
              intl.formatMessage({ id: 'EditListingRentalDetailsForm.descriptionRequired' })
            )}
          />

          <FieldTextInput
            id={`${formId}accessories`}
            name="accessories"
            className={css.field}
            type="textarea"
            label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.accessoriesLabel' })}
            placeholder={intl.formatMessage({
              id: 'EditListingRentalDetailsForm.accessoriesPlaceholder',
            })}
            validate={required(
              intl.formatMessage({ id: 'EditListingRentalDetailsForm.accessoriesRequired' })
            )}
          />
          <p className={css.fieldHint}>
            <FormattedMessage id="EditListingRentalDetailsForm.accessoriesHint" />
          </p>

          <FieldCurrencyInput
            id={`${formId}replacementValue`}
            name="replacementValue"
            className={css.field}
            label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.replacementValueLabel' })}
            placeholder={intl.formatMessage({
              id: 'EditListingRentalDetailsForm.replacementValuePlaceholder',
            })}
            currencyConfig={currencyConfig}
            validate={required(
              intl.formatMessage({ id: 'EditListingRentalDetailsForm.replacementValueRequired' })
            )}
          />
          <p className={css.fieldHint}>
            <FormattedMessage id="EditListingRentalDetailsForm.replacementValueHint" />
          </p>

          <FieldTextInput
            id={`${formId}serialNumber`}
            name="serialNumber"
            className={css.field}
            type="text"
            label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.serialNumberLabel' })}
            placeholder={intl.formatMessage({
              id: 'EditListingRentalDetailsForm.serialNumberPlaceholder',
            })}
          />
          <p className={css.fieldHint}>
            <FormattedMessage id="EditListingRentalDetailsForm.serialNumberHint" />
          </p>

          {/* Optional: "I have 30 of these" - huurders can then rent 1..N
              instead of the listing always being one indivisible booking.
              Left empty, a listing stays a single unit like today. When
              set, this becomes the default quantity for every day in the
              Beschikbaarheid step (see EditListingAvailabilityPanel.js) so
              a provider doesn't have to re-type the same number 7 times in
              the weekly schedule - they can still override individual days
              there afterwards if needed. */}
          <FieldTextInput
            id={`${formId}totalQuantity`}
            name="totalQuantity"
            className={css.field}
            type="number"
            min="1"
            step="1"
            parse={value => {
              const parsed = Number.parseInt(value, 10);
              return Number.isNaN(parsed) ? null : parsed;
            }}
            label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.totalQuantityLabel' })}
            placeholder={intl.formatMessage({
              id: 'EditListingRentalDetailsForm.totalQuantityPlaceholder',
            })}
            validate={value =>
              value == null
                ? undefined
                : composeValidators(
                    numberAtLeast(
                      intl.formatMessage({ id: 'EditListingRentalDetailsForm.totalQuantityInvalid' }),
                      1
                    )
                  )(value)
            }
          />
          <p className={css.fieldHint}>
            <FormattedMessage id="EditListingRentalDetailsForm.totalQuantityHint" />
          </p>

          <div className={css.field}>
            <H4 as="h3" className={css.conditionHeading}>
              <FormattedMessage id="EditListingRentalDetailsForm.conditionHeading" />
            </H4>
            <div className={css.conditionCards}>
              <FieldRadioButton
                id={`${formId}condition-new`}
                className={css.conditionCard}
                name="condition"
                value={CONDITION_NEW}
                label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.conditionNew' })}
              />
              <FieldRadioButton
                id={`${formId}condition-good`}
                className={css.conditionCard}
                name="condition"
                value={CONDITION_GOOD}
                label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.conditionGood' })}
              />
              <FieldRadioButton
                id={`${formId}condition-light-wear`}
                className={css.conditionCard}
                name="condition"
                value={CONDITION_LIGHT_WEAR}
                label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.conditionLightWear' })}
              />
            </div>
          </div>

          <div className={css.field}>
            <H4 as="h3" className={css.conditionHeading}>
              <FormattedMessage id="EditListingRentalDetailsForm.transportSizeHeading" />
            </H4>
            <div className={css.conditionCards}>
              <FieldRadioButton
                id={`${formId}transportSize-compact`}
                className={css.conditionCard}
                name="transportSize"
                value={TRANSPORT_COMPACT}
                label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.transportSizeCompact' })}
              />
              <FieldRadioButton
                id={`${formId}transportSize-medium`}
                className={css.conditionCard}
                name="transportSize"
                value={TRANSPORT_MEDIUM}
                label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.transportSizeMedium' })}
              />
              <FieldRadioButton
                id={`${formId}transportSize-large`}
                className={css.conditionCard}
                name="transportSize"
                value={TRANSPORT_LARGE}
                label={intl.formatMessage({ id: 'EditListingRentalDetailsForm.transportSizeLarge' })}
              />
            </div>
          </div>

          <AddListingFields
            listingType={listingType}
            listingFieldsConfig={listingFieldsConfig}
            selectedCategories={selectedCategories}
            formId={formId}
            intl={intl}
          />

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

export default EditListingRentalDetailsForm;
