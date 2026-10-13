import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { sendLead } from '../../util/api';

import RentalLeadForm from './RentalLeadForm';

const { fireEvent, waitFor } = testingLibrary;

jest.mock('../../util/api', () => ({
  ...jest.requireActual('../../util/api'),
  sendLead: jest.fn(),
  sendMetaEvent: jest.fn(() => Promise.resolve()),
}));

const page = { id: 'springkasteel-temse', categoryId: 'springkasteel' };

const renderForm = () =>
  render(<RentalLeadForm page={page} pageTitle="Springkasteel huren in Temse" />);

const fill = (getByLabelText, { name, contact, date }) => {
  fireEvent.change(getByLabelText('RentalPage.form.name'), { target: { value: name } });
  fireEvent.change(getByLabelText('RentalPage.form.contact'), { target: { value: contact } });
  fireEvent.change(getByLabelText('RentalPage.form.date'), { target: { value: date } });
};

describe('RentalLeadForm', () => {
  beforeEach(() => {
    sendLead.mockReset();
  });

  it('does not send an empty form and shows what is missing', async () => {
    const { getByRole, findByText } = renderForm();
    fireEvent.click(getByRole('button', { name: 'RentalPage.form.submit' }));
    expect(await findByText('RentalPage.form.nameRequired')).toBeInTheDocument();
    expect(sendLead).not.toHaveBeenCalled();
  });

  it('rejects a contact that is neither a phone number nor an e-mail address', async () => {
    const { getByRole, getByLabelText, findByText } = renderForm();
    fill(getByLabelText, { name: 'Sarah', contact: 'bel me', date: '2099-06-20' });
    fireEvent.click(getByRole('button', { name: 'RentalPage.form.submit' }));
    expect(await findByText('RentalPage.form.contactInvalid')).toBeInTheDocument();
    expect(sendLead).not.toHaveBeenCalled();
  });

  it('sends a lead with a phone number and shows the confirmation', async () => {
    sendLead.mockResolvedValue({});
    const { getByRole, getByLabelText, findByText } = renderForm();
    fill(getByLabelText, { name: 'Sarah', contact: '0471 23 45 67', date: '2099-06-20' });
    fireEvent.click(getByRole('button', { name: 'RentalPage.form.submit' }));

    expect(await findByText('RentalPage.form.successTitle')).toBeInTheDocument();
    expect(sendLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Sarah',
        contact: '0471 23 45 67',
        date: '2099-06-20',
        pageTitle: 'Springkasteel huren in Temse',
      })
    );
  });

  it('accepts an e-mail address as contact', async () => {
    sendLead.mockResolvedValue({});
    const { getByRole, getByLabelText, findByText } = renderForm();
    fill(getByLabelText, { name: 'Sarah', contact: 'sarah@example.com', date: '2099-06-20' });
    fireEvent.click(getByRole('button', { name: 'RentalPage.form.submit' }));
    await waitFor(async () => {
      expect(await findByText('RentalPage.form.successTitle')).toBeInTheDocument();
    });
  });
});
