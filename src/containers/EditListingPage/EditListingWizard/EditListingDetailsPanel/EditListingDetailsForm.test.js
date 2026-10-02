import React, { act } from 'react';
import '@testing-library/jest-dom';

import { pickCategoryFields } from '../../../../util/fieldHelpers';
import { fakeIntl } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import EditListingDetailsForm from './EditListingDetailsForm';

const { screen, userEvent } = testingLibrary;

const noop = () => null;

describe('EditListingDetailsForm', () => {
  it('Check that shipping fees can be given and submit button activates', async () => {
    const user = userEvent.setup();
    const saveActionMsg = 'Save details';

    const selectableListingTypes = [
      {
        listingType: 'sell-bicycles',
        transactionProcessAlias: 'default-purchase/release-1',
        unitType: 'item',
      },
    ];

    const listingFieldsConfig = [
      {
        key: 'clothing',
        scope: 'public',
        listingTypeConfig: {
          limitToListingTypeIds: true,
          listingTypeIds: ['sell-bicycles'],
        },
        schemaType: 'enum',
        enumOptions: [
          { option: 'men', label: 'Men' },
          { option: 'women', label: 'Women' },
          { option: 'kids', label: 'Kids' },
        ],
        filterConfig: {
          showFilter: true,
          label: 'Clothing',
        },
        showConfig: {
          label: 'Clothing',
          isDetail: true,
        },
        saveConfig: {
          label: 'Clothing',
        },
      },
      {
        key: 'amenities',
        scope: 'public',
        listingTypeConfig: {
          limitToListingTypeIds: true,
          listingTypeIds: ['rent-bicycles-daily', 'rent-bicycles-nightly', 'rent-bicycles-hourly'],
        },
        schemaType: 'multi-enum',
        enumOptions: [
          { option: 'towels', label: 'Towels' },
          { option: 'bathroom', label: 'Bathroom' },
          { option: 'swimming_pool', label: 'Swimming pool' },
          { option: 'barbeque', label: 'Barbeque' },
        ],
        filterConfig: {
          showFilter: true,
          label: 'Amenities',
        },
        showConfig: {
          label: 'Amenities',
        },
        saveConfig: {
          label: 'Amenities',
        },
      },
    ];

    render(
      <EditListingDetailsForm
        intl={fakeIntl}
        dispatch={noop}
        onListingTypeChange={noop}
        onSubmit={v => v}
        saveActionMsg={saveActionMsg}
        updated={false}
        updateInProgress={false}
        disabled={false}
        ready={false}
        listingFieldsConfig={listingFieldsConfig}
        categoryPrefix="categoryLevel"
        selectableCategories={[]}
        pickSelectedCategories={values => pickCategoryFields(values, 'categoryLevel', 1, [])}
        selectableListingTypes={selectableListingTypes}
        hasExistingListingType={true}
        initialValues={selectableListingTypes[0]}
        marketplaceCurrency="EUR"
      />
    );

    // Pickup fields
    const title = 'EditListingDetailsForm.title';
    expect(screen.getByText(title)).toBeInTheDocument();

    const description = 'EditListingDetailsForm.description';
    expect(screen.getByText(description)).toBeInTheDocument();

    // Test that save button is disabled at first
    expect(screen.getByRole('button', { name: saveActionMsg })).toBeDisabled();

    // Fill mandatory attributes
    await user.type(screen.getByRole('textbox', { name: title }), 'My Listing');
    await user.type(screen.getByRole('textbox', { name: description }), 'Lorem ipsum');

    // Fill custom listing field
    await user.selectOptions(screen.getByLabelText('Clothing'), 'kids');

    // Test that save button is enabled
    expect(screen.getByRole('button', { name: saveActionMsg })).toBeEnabled();
  });

  it('suggests a category from the title, but backs off once the provider picks one themselves', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const user = userEvent.setup({ delay: null });
    const saveActionMsg = 'Save details';

    const selectableListingTypes = [
      {
        listingType: 'rent-party-equipment',
        transactionProcessAlias: 'default-booking/release-1',
        unitType: 'day',
      },
    ];

    // A trimmed-down version of OmniRent's real category tree (see
    // categorySuggestion.js) - enough to exercise a 3-level suggestion.
    const selectableCategories = [
      {
        id: 'event-feest',
        name: 'Feest & Events',
        subcategories: [
          {
            id: 'Springkastelen-Fun',
            name: 'Springkastelen & Fun',
            subcategories: [{ id: 'Springkastelen', name: 'Springkastelen' }],
          },
          {
            id: 'tent-structuren',
            name: 'Tent & Structuren',
            subcategories: [{ id: 'party-tent', name: 'Partytenten' }],
          },
        ],
      },
    ];

    render(
      <EditListingDetailsForm
        intl={fakeIntl}
        dispatch={noop}
        onListingTypeChange={noop}
        onSubmit={v => v}
        saveActionMsg={saveActionMsg}
        updated={false}
        updateInProgress={false}
        disabled={false}
        ready={false}
        listingFieldsConfig={[]}
        categoryPrefix="categoryLevel"
        selectableCategories={selectableCategories}
        pickSelectedCategories={values =>
          pickCategoryFields(values, 'categoryLevel', 1, selectableCategories)
        }
        selectableListingTypes={selectableListingTypes}
        hasExistingListingType={true}
        initialValues={selectableListingTypes[0]}
        marketplaceCurrency="EUR"
      />
    );

    // Title is visible right away - it no longer waits for category
    // selection to complete first, since it's what drives it now.
    const title = 'EditListingDetailsForm.title';
    expect(screen.getByRole('textbox', { name: title })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: title }), 'Springkasteel XL');
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    // All 3 category levels got auto-filled, and the description/listing
    // fields (gated on allCategoriesChosen) became visible as a result.
    await screen.findByText('EditListingDetailsForm.description');
    expect(screen.getByText('EditListingDetailsForm.categorySuggested')).toBeInTheDocument();

    // Manually overriding categoryLevel1 stops the auto-suggestion - typing
    // more into the title afterwards must not overwrite that choice. All 3
    // category <select>s share the same (fakeIntl) label text, so target
    // this one by its unique id instead of getByLabelText.
    await user.selectOptions(document.getElementById('categoryLevel1'), 'event-feest');
    expect(
      screen.queryByText('EditListingDetailsForm.categorySuggested')
    ).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: title }), ' partytent');
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(
      screen.queryByText('EditListingDetailsForm.categorySuggested')
    ).not.toBeInTheDocument();

    jest.useRealTimers();
  });
});
