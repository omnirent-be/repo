import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { CONSENT_COOKIE_NAME, getConsent } from '../../util/consent';

import CookieConsent from './CookieConsent';

const { waitFor, fireEvent } = testingLibrary;

const clearConsent = () => {
  document.cookie = `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

describe('CookieConsent', () => {
  beforeEach(clearConsent);
  afterAll(clearConsent);

  it('shows nothing when no tracking script is configured', () => {
    const { queryByRole } = render(<CookieConsent analytics={{}} />);
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks for consent and stores "granted" when accepted', async () => {
    const { getByRole, queryByRole } = render(
      <CookieConsent analytics={{ facebookPixelId: '123' }} />
    );
    await waitFor(() => expect(getByRole('dialog')).toBeInTheDocument());
    expect(getConsent()).toEqual('unset');

    fireEvent.click(getByRole('button', { name: 'CookieConsent.accept' }));

    expect(getConsent()).toEqual('granted');
    await waitFor(() => expect(queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('stores "denied" when declined', async () => {
    const { getByRole, queryByRole } = render(
      <CookieConsent analytics={{ googleAnalyticsId: 'G-ABC' }} />
    );
    await waitFor(() => expect(getByRole('dialog')).toBeInTheDocument());

    fireEvent.click(getByRole('button', { name: 'CookieConsent.decline' }));

    expect(getConsent()).toEqual('denied');
    await waitFor(() => expect(queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('stays hidden once a choice has been made', async () => {
    document.cookie = `${CONSENT_COOKIE_NAME}=granted; path=/`;
    const { queryByRole } = render(<CookieConsent analytics={{ facebookPixelId: '123' }} />);
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(queryByRole('dialog')).not.toBeInTheDocument();
  });
});
