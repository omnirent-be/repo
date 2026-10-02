/* eslint-disable no-console */
import { createCurrentUser } from '../../util/testData';
import StripeConnectAccountForm from './StripeConnectAccountForm';

export const NewAccount = {
  component: StripeConnectAccountForm,
  props: {
    currentUser: createCurrentUser('user-1'),
    disabled: false,
    inProgress: false,
    ready: false,
    stripeConnected: false,
    stripeAccountFetched: false,
    submitButtonText: 'Save payout details',
    onChange: () => console.log('onChange called'),
    onSubmit: (values, isUpdate) => {
      console.log('Submit StripeConnectAccountForm with values:', values, 'isUpdate:', isUpdate);
    },
    onGetStripeConnectAccountLink: () => () => console.log('onGetStripeConnectAccountLink called'),
  },
  group: 'page:StripePayoutPage',
};
