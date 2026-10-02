/* eslint-disable no-console */
import ListingPublishSuccessScreen from './ListingPublishSuccessScreen';

const fakeImage = {
  id: { uuid: 'fake-image-id' },
  type: 'image',
  attributes: {
    variants: {
      'scaled-large': {
        url: 'https://picsum.photos/seed/omnirent-party-tent/1200/900',
        width: 1200,
        height: 900,
      },
    },
  },
};

export const WithPhoto = {
  component: ListingPublishSuccessScreen,
  props: {
    listing: {
      id: { uuid: '11111111-1111-1111-1111-111111111111' },
      attributes: { title: 'Partytent 5x8m met houten vloer' },
      images: [fakeImage],
    },
    onContinue: () => console.log('ListingPublishSuccessScreen: onContinue called'),
  },
  group: 'page:EditListingPage',
};

export const NoPhoto = {
  component: ListingPublishSuccessScreen,
  props: {
    listing: {
      id: { uuid: '22222222-2222-2222-2222-222222222222' },
      attributes: { title: 'Springkasteel Kids XL' },
      images: [],
    },
    onContinue: () => console.log('ListingPublishSuccessScreen: onContinue called'),
  },
  group: 'page:EditListingPage',
};
