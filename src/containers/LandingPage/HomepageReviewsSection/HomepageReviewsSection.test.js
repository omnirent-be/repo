import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';
import HomepageReviewsSection from './HomepageReviewsSection';

const { waitFor } = testingLibrary;

describe('HomepageReviewsSection', () => {
  it('renders nothing when there are no real reviews to show', async () => {
    const { container } = render(<HomepageReviewsSection />);

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});
