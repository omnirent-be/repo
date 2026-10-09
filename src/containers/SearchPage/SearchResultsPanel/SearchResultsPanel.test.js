import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render } from '../../../util/testHelpers';
import { createListing, createImage, createUser } from '../../../util/testData';

import SearchResultsPanel from './SearchResultsPanel';

const listingWithImage = (id, attributesOverride = {}, author = createUser(`${id}-author`)) =>
  createListing(
    id,
    { title: `${id} title`, ...attributesOverride },
    { images: [createImage(`${id}-image`)], author }
  );

describe('SearchResultsPanel', () => {
  it('shows a presentable listing', () => {
    const listings = [listingWithImage('l1')];
    const { getByText } = render(<SearchResultsPanel listings={listings} />);
    expect(getByText('l1 title')).toBeInTheDocument();
  });

  it('hides a listing with no images', () => {
    const noImageListing = createListing(
      'l2',
      { title: 'l2 title' },
      { author: createUser('l2-author') }
    );
    const { queryByText } = render(<SearchResultsPanel listings={[noImageListing]} />);
    expect(queryByText('l2 title')).not.toBeInTheDocument();
  });

  it('hides a listing flagged as test data', () => {
    const testListing = listingWithImage('l3', { metadata: { isTest: true } });
    const { queryByText } = render(<SearchResultsPanel listings={[testListing]} />);
    expect(queryByText('l3 title')).not.toBeInTheDocument();
  });

  it('hides a listing with "safe to delete" in the title', () => {
    const testListing = listingWithImage('l4', { title: 'Spike test listing - safe to delete' });
    const { queryByText } = render(<SearchResultsPanel listings={[testListing]} />);
    expect(queryByText('Spike test listing - safe to delete')).not.toBeInTheDocument();
  });

  it('hides a listing with a too-short title', () => {
    const testListing = listingWithImage('l5', { title: 'a a' });
    const { queryByText } = render(<SearchResultsPanel listings={[testListing]} />);
    expect(queryByText('a a')).not.toBeInTheDocument();
  });

  it('hides a listing from a test author even if the listing itself looks fine', () => {
    const testAuthor = createUser('l6-author', {
      profile: { displayName: 'Wizard T', abbreviatedName: 'WT' },
    });
    const listing = listingWithImage('l6', {}, testAuthor);
    const { queryByText } = render(<SearchResultsPanel listings={[listing]} />);
    expect(queryByText('l6 title')).not.toBeInTheDocument();
  });
});
