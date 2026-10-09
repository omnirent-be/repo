import React from 'react';
import '@testing-library/jest-dom';

import { fakeIntl } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import EditListingRentalDetailsForm from './EditListingRentalDetailsForm';

const { screen } = testingLibrary;

const noop = () => null;

describe('EditListingRentalDetailsForm', () => {
  const baseProps = {
    intl: fakeIntl,
    onSubmit: v => v,
    saveActionMsg: 'Save',
    updated: false,
    updateInProgress: false,
    disabled: false,
    ready: false,
    fetchErrors: {},
    marketplaceCurrency: 'EUR',
    listingType: 'daily-rental',
    selectedCategories: {},
  };

  it('renders its own fields (description, accessories, replacement value, condition)', () => {
    render(
      <EditListingRentalDetailsForm {...baseProps} listingFieldsConfig={[]} onManageDisableScrolling={noop} />
    );

    expect(screen.getByText('EditListingRentalDetailsForm.description')).toBeInTheDocument();
    expect(screen.getByText('EditListingRentalDetailsForm.accessoriesLabel')).toBeInTheDocument();
    expect(screen.getByText('EditListingRentalDetailsForm.replacementValueLabel')).toBeInTheDocument();
    expect(screen.getByText('EditListingRentalDetailsForm.conditionHeading')).toBeInTheDocument();
  });

  it('never renders the search-only deliveryOptions/region listing fields as inputs', () => {
    // Same shape as the synthetic fields injected in configHelpers.js's
    // mergeListingConfig (omniRentFiltersMaybe) - these must never show up
    // as a second, independently-editable input here, since
    // EditListingDeliveryForm.js already owns these exact publicData keys.
    const listingFieldsConfig = [
      {
        key: 'deliveryOptions',
        scope: 'public',
        schemaType: 'multi-enum',
        enumOptions: [
          { option: 'pickup', label: 'Ophalen bij verhuurder' },
          { option: 'shipping', label: 'Levering aan huis mogelijk' },
        ],
        showConfig: { label: 'Overdrachtsmethode' },
        saveConfig: { label: 'Overdrachtsmethode' },
      },
      {
        key: 'region',
        scope: 'public',
        schemaType: 'enum',
        enumOptions: [{ option: 'gent-centrum', label: 'Gent Centrum (9000)' }],
        showConfig: { label: 'Locatie' },
        saveConfig: { label: 'Locatie' },
      },
    ];

    render(
      <EditListingRentalDetailsForm
        {...baseProps}
        listingFieldsConfig={listingFieldsConfig}
      />
    );

    expect(screen.queryByText('Overdrachtsmethode')).not.toBeInTheDocument();
    expect(screen.queryByText('Locatie')).not.toBeInTheDocument();
  });
});
