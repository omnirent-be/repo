import React from 'react';
import { Field } from 'react-final-form';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { createSlug } from '../../../util/urlHelpers';
import { formatMoney } from '../../../util/currency';
import { types as sdkTypes } from '../../../util/sdkLoader';

import { FieldSelect } from '../../../components';

import css from './PriceVariantPicker.module.css';

const { Money } = sdkTypes;

// Formats a price variant's option label as "name (€amount)", so a customer
// can tell the options apart without guessing blind and picking dates first.
// Falls back to just the name if the variant is missing a usable price.
const priceVariantOptionLabel = (pv, marketplaceCurrency, intl) => {
  const trimmedName = pv?.name?.trim() || pv?.name;
  const hasPrice = Number.isInteger(pv?.priceInSubunits) && marketplaceCurrency;
  if (!hasPrice) {
    return trimmedName;
  }
  try {
    const formattedPrice = formatMoney(intl, new Money(pv.priceInSubunits, marketplaceCurrency));
    return `${trimmedName} (${formattedPrice})`;
  } catch (e) {
    return trimmedName;
  }
};

const DEFAULT_PRICE_VARIANT_NAME = 'default-variant-name';

const VariantNameMaybe = props => {
  const { className, priceVariant } = props;
  return priceVariant?.name ? (
    <div className={className}>
      <FormattedMessage
        id="PriceVariantPicker.onePriceVariantOnly"
        values={{ priceVariantName: priceVariant?.name }}
      />
    </div>
  ) : null;
};

const FieldHidden = props => {
  const { name, ...rest } = props;
  return (
    <Field id={name} name={name} type="hidden" className={css.hidden} {...rest}>
      {fieldRenderProps => <input {...fieldRenderProps?.input} />}
    </Field>
  );
};

const PriceVariantPicker = props => {
  const intl = useIntl();
  const { priceVariants, onPriceVariantChange, disabled, marketplaceCurrency } = props;
  const hasMultiplePriceVariants = priceVariants?.length > 1;
  const hasOnePriceVariant = priceVariants?.length === 1;

  return hasMultiplePriceVariants ? (
    <FieldSelect
      name="priceVariantName"
      id="priceVariant"
      className={css.priceVariantFieldSelect}
      selectClassName={css.priceVariantSelect}
      label={intl.formatMessage({ id: 'PriceVariantPicker.priceVariantLabel' })}
      onChange={onPriceVariantChange}
      disabled={disabled}
      showLabelAsDisabled={disabled}
    >
      <option disabled value="" key="unselected">
        {intl.formatMessage({ id: 'PriceVariantPicker.priceVariantUnselected' })}
      </option>
      {priceVariants.map(pv => (
        <option value={pv.name} key={pv.name} data-slug={createSlug(pv.name)}>
          {priceVariantOptionLabel(pv, marketplaceCurrency, intl)}
        </option>
      ))}
    </FieldSelect>
  ) : hasOnePriceVariant ? (
    <>
      <VariantNameMaybe priceVariant={priceVariants?.[0]} className={css.priceVariantName} />
      <FieldHidden
        name="priceVariantName"
        format={value => {
          return value == null ? DEFAULT_PRICE_VARIANT_NAME : value;
        }}
        parse={value => {
          const response = value === DEFAULT_PRICE_VARIANT_NAME ? null : value;
          return response;
        }}
      />
    </>
  ) : null;
};

export default PriceVariantPicker;
