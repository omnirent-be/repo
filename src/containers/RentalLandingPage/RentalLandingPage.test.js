import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import rentalPages from '../../config/rentalPages.json';

import { RentalLandingPageComponent } from './RentalLandingPage';

const { waitFor } = testingLibrary;

describe('RentalLandingPage', () => {
  it('has unique slugs that end in "-huren-gent"', () => {
    const slugs = rentalPages.map(page => page.slug);
    expect(new Set(slugs).size).toEqual(slugs.length);
    slugs.forEach(slug => expect(slug).toMatch(/-huren-gent$/));
  });

  it('renders the H1, FAQ and links to the other rental pages', async () => {
    const { getByRole } = render(
      <RentalLandingPageComponent location={{ pathname: '/springkasteel-huren-gent' }} />,
      { initialState: { homepageRows: { rows: {} } } }
    );

    await waitFor(() => {
      expect(
        getByRole('heading', { level: 1, name: 'RentalPage.springkasteel.h1' })
      ).toBeInTheDocument();
    });

    expect(getByRole('link', { name: /RentalPage\.partytent\.short/ })).toHaveAttribute(
      'href',
      '/partytent-huren-gent'
    );
    expect(getByRole('link', { name: /RentalPage\.bbq\.short/ })).toHaveAttribute(
      'href',
      '/bbq-huren-gent'
    );
  });
});
