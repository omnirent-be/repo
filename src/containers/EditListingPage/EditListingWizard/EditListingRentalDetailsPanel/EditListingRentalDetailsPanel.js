import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../../util/reactIntl';
import { LISTING_STATE_DRAFT, EXTENDED_DATA_SCHEMA_TYPES } from '../../../../util/types';
import { types as sdkTypes } from '../../../../util/sdkLoader';
import { isFieldForCategory, isFieldForListingType, pickCategoryFields } from '../../../../util/fieldHelpers';

import { H3, ListingLink } from '../../../../components';

import EditListingRentalDetailsForm from './EditListingRentalDetailsForm';
import css from './EditListingRentalDetailsPanel.module.css';

const { Money } = sdkTypes;

// Same picking logic as EditListingDetailsPanel.js's own
// pickListingFieldsData/initialValuesForListingFields (duplicated - see
// EditListingRentalDetailsForm.js's file comment for why).
const pickListingFieldsData = (data, targetScope, targetListingType, targetCategories, listingFieldConfigs) => {
  const targetCategoryIds = Object.values(targetCategories);
  return listingFieldConfigs.reduce((fields, fieldConfig) => {
    const { key, scope = 'public', schemaType } = fieldConfig || {};
    const namespacePrefix = scope === 'public' ? `pub_` : `priv_`;
    const namespacedKey = `${namespacePrefix}${key}`;

    const isKnownSchemaType = EXTENDED_DATA_SCHEMA_TYPES.includes(schemaType);
    const isTargetScope = scope === targetScope;
    const isTargetListingType = isFieldForListingType(targetListingType, fieldConfig);
    const isTargetCategory = isFieldForCategory(targetCategoryIds, fieldConfig);

    if (isKnownSchemaType && isTargetScope && isTargetListingType && isTargetCategory) {
      const fieldValue = data[namespacedKey] != null ? data[namespacedKey] : null;
      return { ...fields, [key]: fieldValue };
    }
    return fields;
  }, {});
};

const initialValuesForListingFields = (data, targetScope, targetListingType, targetCategories, listingFieldConfigs) => {
  const targetCategoryIds = Object.values(targetCategories);
  return listingFieldConfigs.reduce((fields, fieldConfig) => {
    const { key, scope = 'public', schemaType, enumOptions } = fieldConfig || {};
    const namespacePrefix = scope === 'public' ? `pub_` : `priv_`;
    const namespacedKey = `${namespacePrefix}${key}`;

    const isKnownSchemaType = EXTENDED_DATA_SCHEMA_TYPES.includes(schemaType);
    const isEnumSchemaType = schemaType === 'enum';
    const shouldHaveValidEnumOptions =
      !isEnumSchemaType || (isEnumSchemaType && !!enumOptions?.find(conf => conf.option === data?.[key]));
    const isTargetScope = scope === targetScope;
    const isTargetListingType = isFieldForListingType(targetListingType, fieldConfig);
    const isTargetCategory = isFieldForCategory(targetCategoryIds, fieldConfig);

    if (isKnownSchemaType && isTargetScope && isTargetListingType && isTargetCategory && shouldHaveValidEnumOptions) {
      const fieldValue = data?.[key] != null ? data[key] : null;
      return { ...fields, [namespacedKey]: fieldValue };
    }
    return fields;
  }, {});
};

const getInitialValues = props => {
  const { listing, marketplaceCurrency, config } = props;
  const { description, price, publicData, privateData } = listing?.attributes || {};
  const {
    accessories,
    condition,
    transportSize,
    replacementValueInSubunits,
    serialNumber,
    totalQuantity,
    listingType,
  } = publicData || {};
  const currency = price?.currency || marketplaceCurrency;
  const replacementValueMaybe =
    replacementValueInSubunits != null
      ? { replacementValue: new Money(replacementValueInSubunits, currency) }
      : {};

  const listingFields = config?.listing?.listingFields || [];
  const categoryKey = config?.categoryConfiguration?.key;
  const listingCategories = config?.categoryConfiguration?.categories;
  const nestedCategories = categoryKey
    ? pickCategoryFields(publicData, categoryKey, 1, listingCategories)
    : {};

  return {
    description,
    accessories,
    condition,
    transportSize,
    serialNumber,
    totalQuantity,
    ...replacementValueMaybe,
    ...initialValuesForListingFields(publicData, 'public', listingType, nestedCategories, listingFields),
    ...initialValuesForListingFields(privateData, 'private', listingType, nestedCategories, listingFields),
  };
};

/**
 * Stap 2 ("Details & Contract") - zie EditListingRentalDetailsForm.js.
 *
 * @component
 * @param {Object} props
 * @returns {JSX.Element}
 */
const EditListingRentalDetailsPanel = props => {
  const {
    className,
    rootClassName,
    listing,
    disabled,
    ready,
    onSubmit,
    submitButtonText,
    panelUpdated,
    updateInProgress,
    errors,
    marketplaceCurrency,
    config,
    updatePageTitle: UpdatePageTitle,
    intl,
  } = props;

  const classes = classNames(rootClassName || css.root, className);
  const publicData = listing?.attributes?.publicData || {};
  const listingType = publicData.listingType;
  const listingFields = config?.listing?.listingFields || [];
  const categoryKey = config?.categoryConfiguration?.key;
  const listingCategories = config?.categoryConfiguration?.categories;
  const nestedCategories = categoryKey
    ? pickCategoryFields(publicData, categoryKey, 1, listingCategories)
    : {};
  const isPublished = listing?.id && listing?.attributes?.state !== LISTING_STATE_DRAFT;

  const panelHeadingProps = isPublished
    ? {
        id: 'EditListingRentalDetailsPanel.title',
        values: { listingTitle: <ListingLink listing={listing} />, lineBreak: <br /> },
        messageProps: { listingTitle: listing.attributes.title },
      }
    : {
        id: 'EditListingRentalDetailsPanel.createListingTitle',
        values: { lineBreak: <br /> },
        messageProps: {},
      };

  return (
    <main className={classes}>
      <UpdatePageTitle
        panelHeading={intl.formatMessage({ id: panelHeadingProps.id }, { ...panelHeadingProps.messageProps })}
      />
      <H3 as="h1">
        <FormattedMessage id={panelHeadingProps.id} values={{ ...panelHeadingProps.values }} />
      </H3>

      <EditListingRentalDetailsForm
        className={css.form}
        initialValues={getInitialValues(props)}
        saveActionMsg={submitButtonText}
        disabled={disabled}
        ready={ready}
        fetchErrors={errors}
        marketplaceCurrency={marketplaceCurrency}
        listingType={listingType}
        listingFieldsConfig={listingFields}
        selectedCategories={nestedCategories}
        onSubmit={values => {
          const {
            description,
            accessories,
            condition,
            transportSize,
            replacementValue,
            serialNumber,
            totalQuantity,
            ...rest
          } = values;
          const publicListingFields = pickListingFieldsData(
            rest,
            'public',
            listingType,
            nestedCategories,
            listingFields
          );
          const privateListingFields = pickListingFieldsData(
            rest,
            'private',
            listingType,
            nestedCategories,
            listingFields
          );
          const updateValues = {
            description,
            publicData: {
              accessories,
              condition,
              transportSize,
              replacementValueInSubunits: replacementValue?.amount ?? null,
              serialNumber: serialNumber?.trim() || null,
              totalQuantity: totalQuantity ?? null,
              ...publicListingFields,
            },
            privateData: privateListingFields,
          };
          onSubmit(updateValues);
        }}
        updated={panelUpdated}
        updateInProgress={updateInProgress}
        intl={intl}
      />
    </main>
  );
};

export default EditListingRentalDetailsPanel;
