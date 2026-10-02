/* eslint-disable no-console */
import React from 'react';
import ListingCard from './ListingCard';
import { createUser, createListing, createImage, fakeIntl } from '../../util/testData';
import { types as sdkTypes } from '../../util/sdkLoader';

const { LatLng, Money } = sdkTypes;

const listing = createListing('listing1', {}, { author: createUser('user1') });

const ListingCardWrapper = props => (
  <div style={{ maxWidth: '400px' }}>
    <ListingCard {...props} />
  </div>
);

export const ListingCardWrapped = {
  component: ListingCardWrapper,
  props: {
    intl: fakeIntl,
    listing,
  },
};

// Exercises the hyperlocal-card additions at once: distance (visitorPosition
// vs. the listing's own geolocation, ~900m apart), a photo carousel (4
// images), the delivery-method badge, the deposit badge + amount, and a
// self-reported rating badge on the author.
const enrichedListing = createListing(
  'listing2',
  {
    title: 'Luxe Cortenstaal Plancha BBQ (1m)',
    price: new Money(8000, 'EUR'),
    geolocation: new LatLng(51.061, 3.735),
    publicData: {
      listingType: 'daily-rental',
      transactionProcessAlias: 'default-booking/release-1',
      unitType: 'day',
      depositInSubunits: 10000,
      deliveryOptions: ['pickup'],
      location: {
        postalCode: '9000',
        city: 'Gent',
        neighborhood: 'Dampoort',
      },
    },
  },
  {
    author: createUser('user2', {
      profile: {
        displayName: 'Thomas P.',
        abbreviatedName: 'TP',
        publicData: { externalReview: { rating: 4.9, count: 8 } },
      },
    }),
    images: [createImage('img1'), createImage('img2'), createImage('img3'), createImage('img4')],
  }
);

export const ListingCardHyperlocal = {
  component: ListingCardWrapper,
  props: {
    intl: fakeIntl,
    listing: enrichedListing,
    // Gent center - close enough to enrichedListing's geolocation above to
    // land in the "X m van jou" (under 1km) branch.
    visitorPosition: { lat: 51.0543, lng: 3.7174 },
  },
};
