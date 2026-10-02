import { validListingTypes } from './configHelpers';

describe('validListingTypes', () => {
  // OmniRent's Console config has availabilityType explicitly set to
  // 'oneSeat' for its booking-process listing types (confirmed live, not
  // just unset) - see the override in validListingTypes itself for why
  // this unconditionally forces 'multipleSeats' instead, since the seats/
  // quantity UI throughout the app (BookingDatesForm, OrderPanel, pricing)
  // is otherwise already fully built but gated on that one field, and
  // there's no Console write access this session to change 'oneSeat' at
  // the source.
  it('forces availabilityType to multipleSeats for booking-process listing types, even overriding an explicit Console value', () => {
    const listingTypesFromConsole = [
      {
        listingType: 'daily-rental',
        label: 'Dagelijkse huur',
        transactionType: {
          process: 'default-booking',
          alias: 'default-booking/release-1',
          unitType: 'day',
        },
        availabilityType: 'oneSeat',
      },
    ];

    const [dailyRental] = validListingTypes(listingTypesFromConsole);
    expect(dailyRental.availabilityType).toBe('multipleSeats');
  });

  it('also forces it when Console has not set availabilityType at all', () => {
    const listingTypesFromConsole = [
      {
        listingType: 'daily-rental',
        label: 'Dagelijkse huur',
        transactionType: {
          process: 'default-booking',
          alias: 'default-booking/release-1',
          unitType: 'day',
        },
      },
    ];

    const [dailyRental] = validListingTypes(listingTypesFromConsole);
    expect(dailyRental.availabilityType).toBe('multipleSeats');
  });

  it('does not set availabilityType for non-booking-process listing types', () => {
    const listingTypesFromConsole = [
      {
        listingType: 'request-quote',
        label: 'Offerte',
        transactionType: {
          process: 'default-negotiation',
          alias: 'default-negotiation/release-1',
          unitType: 'request',
        },
      },
    ];

    const [requestQuote] = validListingTypes(listingTypesFromConsole);
    expect(requestQuote.availabilityType).toBeUndefined();
  });
});
