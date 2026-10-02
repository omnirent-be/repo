import React, { useState } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import {
  LISTING_STATE_DRAFT,
  STOCK_INFINITE_MULTIPLE_ITEMS,
  STOCK_MULTIPLE_ITEMS,
  propTypes,
} from '../../../../util/types';
import { displayDeliveryPickup, displayDeliveryShipping } from '../../../../util/configHelpers';
import { isBookingProcessAlias, isNegotiationProcessAlias } from '../../../../transactions/transaction';
import { types as sdkTypes } from '../../../../util/sdkLoader';

// Import shared components
import { H3, ListingLink } from '../../../../components';

// Import modules from this directory
import EditListingDeliveryForm from './EditListingDeliveryForm';
import css from './EditListingDeliveryPanel.module.css';

const { Money } = sdkTypes;

// Coarse Gent-area bucket for the "Locatie" search filter (see the
// injected 'region' listing field in configHelpers.js's mergeListingConfig)
// - Belgian postal codes in province East-Flanders all start with '9',
// and Gent city + its annexed districts (Gentbrugge, Sint-Amandsberg,
// Wondelgem, ...) all fall in the 9000-9052 range.
const regionFromPostalCode = postalCode => {
  if (!postalCode) {
    return null;
  }
  if (postalCode === '9000') {
    return 'gent-centrum';
  }
  const code = Number.parseInt(postalCode, 10);
  if (Number.isNaN(code)) {
    return null;
  }
  if (code >= 9000 && code <= 9052) {
    return 'groot-gent';
  }
  return code >= 9000 && code <= 9999 ? 'regio-oost-vlaanderen' : null;
};

const getInitialValues = props => {
  const { listing, listingTypes, marketplaceCurrency } = props;
  const { geolocation, publicData, price } = listing?.attributes || {};

  const listingType = publicData?.listingType;
  const listingTypeConfig = listingTypes.find(conf => conf.listingType === listingType);
  // Same reasoning as EditListingDeliveryForm.js: booking- and
  // negotiation-type listings always offer both delivery methods
  // regardless of Console's defaultListingFields.pickup/shipping (off for
  // both daily-rental and request-quote), while other listing types keep
  // respecting those Console flags.
  const isBooking = isBookingProcessAlias(listingTypeConfig?.transactionType?.alias);
  const isNegotiation = isNegotiationProcessAlias(listingTypeConfig?.transactionType?.alias);
  const displayShipping = isBooking || isNegotiation || displayDeliveryShipping(listingTypeConfig);
  const displayPickup = isBooking || isNegotiation || displayDeliveryPickup(listingTypeConfig);
  const displayMultipleDelivery = displayShipping && displayPickup;

  // Only render current search if full place object is available in the URL params
  // TODO bounds are missing - those need to be queried directly from Google Places
  const locationFieldsPresent = publicData?.location?.address && geolocation;
  const location = publicData?.location || {};
  const { address, building, postalCode, city, neighborhood } = location;
  const {
    shippingEnabled,
    pickupEnabled,
    shippingPriceInSubunitsOneItem,
    shippingPriceInSubunitsAdditionalItems,
    deliveryPricePerKmInSubunits,
  } = publicData;
  const deliveryOptions = [];

  if (shippingEnabled || (!displayMultipleDelivery && displayShipping)) {
    deliveryOptions.push('shipping');
  }
  if (pickupEnabled || (!displayMultipleDelivery && displayPickup)) {
    deliveryOptions.push('pickup');
  }

  const currency = price?.currency || marketplaceCurrency;
  const shippingOneItemAsMoney =
    shippingPriceInSubunitsOneItem != null
      ? new Money(shippingPriceInSubunitsOneItem, currency)
      : null;
  const shippingAdditionalItemsAsMoney =
    shippingPriceInSubunitsAdditionalItems != null
      ? new Money(shippingPriceInSubunitsAdditionalItems, currency)
      : null;
  const pricePerKmAsMoney =
    deliveryPricePerKmInSubunits != null ? new Money(deliveryPricePerKmInSubunits, currency) : null;

  // Initial values for the form
  return {
    building,
    location: locationFieldsPresent
      ? {
          search: address,
          // postalCode/city/neighborhood are carried along here too (not
          // just set on submit) so that resubmitting this form without
          // touching the address field doesn't wipe the previously saved
          // postcode/wijk label - see onSubmit below and
          // GeocoderMapbox.js's extractLocationLabelParts.
          selectedPlace: { address, origin: geolocation, postalCode, city, neighborhood },
        }
      : { search: undefined, selectedPlace: undefined },
    deliveryOptions,
    shippingPriceInSubunitsOneItem: shippingOneItemAsMoney,
    shippingPriceInSubunitsAdditionalItems: shippingAdditionalItemsAsMoney,
    deliveryPricePerKmInSubunits: pricePerKmAsMoney,
    // Not read from (or saved to) publicData anywhere - see
    // EditListingDeliveryForm.js's bookingMode radio buttons.
    bookingMode: 'request',
  };
};

/**
 * The EditListingDeliveryPanel component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.ownListing} props.listing - The listing object
 * @param {Array<Object>} props.listingTypes - The active listing types configs
 * @param {string} props.marketplaceCurrency - The marketplace currency (e.g. 'USD')
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {Function} props.onSubmit - The submit function
 * @param {string} props.submitButtonText - The submit button text
 * @param {boolean} props.panelUpdated - Whether the panel is updated
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {Object} props.errors - The errors object
 * @returns {JSX.Element}
 */
const EditListingDeliveryPanel = props => {
  // State is needed since LocationAutocompleteInput doesn't have internal state
  // and therefore re-rendering would overwrite the values during XHR call.
  const [state, setState] = useState({ initialValues: getInitialValues(props) });

  const {
    className,
    rootClassName,
    listing,
    listingTypes,
    marketplaceCurrency,
    disabled,
    ready,
    onSubmit,
    submitButtonText,
    panelUpdated,
    updateInProgress,
    errors,
    updatePageTitle: UpdatePageTitle,
    intl,
  } = props;

  const classes = classNames(rootClassName || css.root, className);
  const isPublished = listing?.id && listing?.attributes.state !== LISTING_STATE_DRAFT;
  const priceCurrencyValid = listing?.attributes?.price?.currency === marketplaceCurrency;
  const listingType = listing?.attributes?.publicData?.listingType;
  const listingTypeConfig = listingTypes.find(conf => conf.listingType === listingType);
  const allowOrdersOfMultipleItems = [STOCK_MULTIPLE_ITEMS, STOCK_INFINITE_MULTIPLE_ITEMS].includes(
    listingTypeConfig?.stockType
  );

  const panelHeadingProps = isPublished
    ? {
        id: 'EditListingDeliveryPanel.title',
        values: { listingTitle: <ListingLink listing={listing} />, lineBreak: <br /> },
        messageProps: { listingTitle: listing.attributes.title },
      }
    : {
        id: 'EditListingDeliveryPanel.createListingTitle',
        values: { lineBreak: <br /> },
        messageProps: {},
      };

  return (
    <main className={classes}>
      <UpdatePageTitle
        panelHeading={intl.formatMessage(
          { id: panelHeadingProps.id },
          { ...panelHeadingProps.messageProps }
        )}
      />
      <H3 as="h1">
        <FormattedMessage id={panelHeadingProps.id} values={{ ...panelHeadingProps.values }} />
      </H3>
      {priceCurrencyValid ? (
        <EditListingDeliveryForm
          className={css.form}
          initialValues={state.initialValues}
          onSubmit={values => {
            const {
              building = '',
              location,
              shippingPriceInSubunitsOneItem,
              shippingPriceInSubunitsAdditionalItems,
              deliveryPricePerKmInSubunits,
              deliveryOptions,
            } = values;

            const shippingEnabled = deliveryOptions.includes('shipping');
            const pickupEnabled = deliveryOptions.includes('pickup');
            const address = location?.selectedPlace?.address || null;
            const origin = location?.selectedPlace?.origin || null;
            const postalCode = location?.selectedPlace?.postalCode || null;
            const city = location?.selectedPlace?.city || null;
            const neighborhood = location?.selectedPlace?.neighborhood || null;

            const pickupDataMaybe =
              pickupEnabled && address
                ? { location: { address, building, postalCode, city, neighborhood } }
                : {};

            // Search filters: see the injected 'deliveryOptions' and
            // 'region' listing fields in configHelpers.js's
            // mergeListingConfig - region can only be derived when we
            // actually have a postal code, i.e. pickup is enabled.
            const regionMaybe = pickupEnabled
              ? { region: regionFromPostalCode(postalCode) }
              : {};

            const shippingDataMaybe =
              shippingEnabled && shippingPriceInSubunitsOneItem != null
                ? {
                    // Note: we only save the "amount" because currency should not differ from listing's price.
                    // Money is always dealt in subunits (e.g. cents) to avoid float calculations.
                    shippingPriceInSubunitsOneItem: shippingPriceInSubunitsOneItem.amount,
                    shippingPriceInSubunitsAdditionalItems:
                      shippingPriceInSubunitsAdditionalItems?.amount,
                  }
                : {};

            // Optional: takes priority over the flat shipping price above
            // when set (see getDeliveryLineItems in server/api-util/lineItems.js) -
            // needs the listing's own geolocation (from the pickup address
            // above) to actually compute a distance, so it's a no-op
            // without one.
            const pricePerKmDataMaybe =
              shippingEnabled && deliveryPricePerKmInSubunits != null
                ? { deliveryPricePerKmInSubunits: deliveryPricePerKmInSubunits.amount }
                : {};

            // New values for listing attributes
            const updateValues = {
              geolocation: origin,
              publicData: {
                pickupEnabled,
                ...pickupDataMaybe,
                shippingEnabled,
                ...shippingDataMaybe,
                ...pricePerKmDataMaybe,
                deliveryOptions,
                ...regionMaybe,
              },
            };

            // Save the initialValues to state
            // LocationAutocompleteInput doesn't have internal state
            // and therefore re-rendering would overwrite the values during XHR call.
            setState({
              initialValues: {
                building,
                location: {
                  search: address,
                  selectedPlace: { address, origin, postalCode, city, neighborhood },
                },
                shippingPriceInSubunitsOneItem,
                shippingPriceInSubunitsAdditionalItems,
                deliveryPricePerKmInSubunits,
                deliveryOptions,
                bookingMode: 'request',
              },
            });
            onSubmit(updateValues);
          }}
          listingTypeConfig={listingTypeConfig}
          marketplaceCurrency={marketplaceCurrency}
          allowOrdersOfMultipleItems={allowOrdersOfMultipleItems}
          saveActionMsg={submitButtonText}
          disabled={disabled}
          ready={ready}
          updated={panelUpdated}
          updateInProgress={updateInProgress}
          fetchErrors={errors}
          autoFocus
        />
      ) : (
        <div className={css.priceCurrencyInvalid}>
          <FormattedMessage
            id="EditListingPricingPanel.listingPriceCurrencyInvalid"
            values={{ marketplaceCurrency }}
          />
        </div>
      )}
    </main>
  );
};

export default EditListingDeliveryPanel;
