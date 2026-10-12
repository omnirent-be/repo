import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import SearchCapsule from './SearchCapsule';

const { screen, fireEvent } = testingLibrary;

describe('SearchCapsule', () => {
  it('keeps the typed product text when another segment is opened', () => {
    render(<SearchCapsule initialValues={{}} onSubmit={() => {}} />);

    fireEvent.click(screen.getByText('SearchCapsule.productLabel'));
    const input = screen.getByPlaceholderText('ProductSearchField.placeholder');
    fireEvent.change(input, { target: { value: 'tent' } });
    expect(input).toHaveValue('tent');

    fireEvent.click(screen.getByText('SearchCapsule.locationLabel'));

    expect(screen.getByText('tent')).toBeInTheDocument();

    fireEvent.click(screen.getByText('SearchCapsule.productLabel'));
    expect(screen.getByPlaceholderText('ProductSearchField.placeholder')).toHaveValue('tent');
  });
});
