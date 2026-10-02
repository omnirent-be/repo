/* eslint-disable no-console */
import { types as sdkTypes } from '../../../util/sdkLoader';
import { fakeIntl } from '../../../util/testData';
import MakeOfferForm from './MakeOfferForm';

const { Money } = sdkTypes;

export const Default = {
  component: MakeOfferForm,
  props: {
    intl: fakeIntl,
    config: { currency: 'EUR', listingMinimumPriceSubUnits: 0 },
    price: new Money(8000, 'EUR'),
    stripeConnected: true,
    errorMessageComponent: () => null,
    onSubmit: values => {
      console.log('Submit MakeOfferForm with (unformatted) values:', values);
    },
    authorDisplayName: 'Jan Janssens',
  },
  group: 'page:MakeOfferPage',
};
