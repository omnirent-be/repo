import defaultConfig from '../../../../config/configDefault';

import EditListingBasicsForm from './EditListingBasicsForm';

const noop = () => {};

const selectableListingTypes = [
  {
    listingType: 'daily-rental',
    label: 'Dagelijkse huur',
    transactionProcessAlias: 'default-booking/release-1',
    unitType: 'day',
  },
  {
    listingType: 'request-quote',
    label: 'Offerte',
    transactionProcessAlias: 'default-negotiation/release-1',
    unitType: 'request',
  },
];

const selectableCategories = [
  {
    id: 'event-feest',
    name: 'Feest & Events',
    subcategories: [{ id: 'tent-structuren', name: 'Tent & Structuren' }],
  },
];

const fakeImageUpload = () =>
  new Promise(resolve =>
    setTimeout(
      () =>
        resolve({
          data: { id: 'fake-image-id', imageId: 'fake-image-id', type: 'image', attributes: {} },
        }),
      600
    )
  );

// "List First, Sign Up Later": lets an anonymous visitor fill in this whole
// step, including photos, and only asks to sign up/in when they submit -
// see CompleteAccountModal.js. This example renders that anonymous state
// without needing a real (logged-out) browser session.
export const AnonymousVisitor = {
  component: EditListingBasicsForm,
  props: {
    formId: 'AnonymousVisitor',
    onSubmit: values => {
      console.log('Submit EditListingBasicsForm with (unformatted) values:', values);
    },
    saveActionMsg: 'Volgende',
    disabled: false,
    ready: false,
    updated: false,
    updateInProgress: false,
    fetchErrors: {},
    onImageUpload: fakeImageUpload,
    onRemoveImage: noop,
    listingImageConfig: defaultConfig.layout.listingImage,
    images: [],
    selectableListingTypes,
    hasPredefinedListingType: false,
    selectableCategories,
    categoryPrefix: 'categoryLevel',
    onListingTypeChange: noop,
    onManageDisableScrolling: noop,
    isAuthenticated: false,
    onSignup: params => {
      console.log('onSignup called with:', params);
      return new Promise(resolve => setTimeout(resolve, 600));
    },
    onLogin: (email, password) => {
      console.log('onLogin called with:', email, password);
      return new Promise(resolve => setTimeout(resolve, 600));
    },
    signupInProgress: false,
    signupError: null,
    loginInProgress: false,
    loginError: null,
  },
  group: 'page:EditListingPage',
};

export const AlreadyAuthenticated = {
  component: EditListingBasicsForm,
  props: {
    ...AnonymousVisitor.props,
    formId: 'AlreadyAuthenticated',
    isAuthenticated: true,
  },
  group: 'page:EditListingPage',
};
