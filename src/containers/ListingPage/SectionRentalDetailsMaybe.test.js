import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import SectionRentalDetailsMaybe from './SectionRentalDetailsMaybe';

const { screen } = testingLibrary;

describe('SectionRentalDetailsMaybe', () => {
  it('renders nothing when none of accessories/condition/totalQuantity are set', () => {
    const { container } = render(<SectionRentalDetailsMaybe publicData={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a Beschrijving section for accessories and a Kenmerken section for condition/quantity', () => {
    render(
      <SectionRentalDetailsMaybe
        publicData={{
          accessories: '4 zijwanden, grondzeil, haringen',
          condition: 'good',
          totalQuantity: 10,
        }}
      />
    );

    expect(screen.getByText('SectionRentalDetailsMaybe.descriptionHeading')).toBeInTheDocument();
    expect(screen.getByText('4 zijwanden, grondzeil, haringen')).toBeInTheDocument();
    expect(screen.getByText('SectionRentalDetailsMaybe.featuresHeading')).toBeInTheDocument();
    expect(screen.getByText('SectionRentalDetailsMaybe.conditionLabel')).toBeInTheDocument();
    expect(screen.getByText('SectionRentalDetailsMaybe.conditionGood')).toBeInTheDocument();
    expect(screen.getByText('SectionRentalDetailsMaybe.quantityLabel')).toBeInTheDocument();
    expect(screen.getByText('SectionRentalDetailsMaybe.quantityValue')).toBeInTheDocument();
  });

  it('shows only the Beschrijving section when only accessories are set', () => {
    render(<SectionRentalDetailsMaybe publicData={{ accessories: 'Grondzeil inbegrepen' }} />);

    expect(screen.getByText('SectionRentalDetailsMaybe.descriptionHeading')).toBeInTheDocument();
    expect(screen.getByText('Grondzeil inbegrepen')).toBeInTheDocument();
    expect(screen.queryByText('SectionRentalDetailsMaybe.featuresHeading')).not.toBeInTheDocument();
  });

  it('shows only the Kenmerken section when only condition is set', () => {
    render(<SectionRentalDetailsMaybe publicData={{ condition: 'new' }} />);

    expect(screen.getByText('SectionRentalDetailsMaybe.featuresHeading')).toBeInTheDocument();
    expect(screen.getByText('SectionRentalDetailsMaybe.conditionNew')).toBeInTheDocument();
    expect(
      screen.queryByText('SectionRentalDetailsMaybe.descriptionHeading')
    ).not.toBeInTheDocument();
  });

  it('does not render replacementValue or serialNumber (contract-only fields)', () => {
    render(
      <SectionRentalDetailsMaybe
        publicData={{
          accessories: 'Grondzeil inbegrepen',
          replacementValueInSubunits: 25000,
          serialNumber: 'SN-12345',
        }}
      />
    );

    expect(screen.queryByText('SN-12345')).not.toBeInTheDocument();
    expect(screen.queryByText(/250/)).not.toBeInTheDocument();
  });
});
