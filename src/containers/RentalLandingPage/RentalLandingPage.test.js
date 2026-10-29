import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { rentalPages } from '../../util/rentalPages';

import { RentalLandingPageComponent } from './RentalLandingPage';

const { waitFor, within } = testingLibrary;

jest.mock('../../util/api', () => ({
  ...jest.requireActual('../../util/api'),
  sendLead: jest.fn(),
  sendMetaEvent: jest.fn(() => Promise.resolve()),
}));

jest.mock('../LandingPage/HomepageReviewsSection/HomepageReviewsSection', () => () => null);

describe('rentalPages', () => {
  it('has unique slugs of the form "<category>-huren/<region>"', () => {
    const slugs = rentalPages.map(page => page.slug);
    expect(new Set(slugs).size).toEqual(slugs.length);
    slugs.forEach(slug => expect(slug).toMatch(/^[a-z-]+-huren\/[a-z]+$/));
  });

  it('has unique route names and only keeps the dash-joined legacy slug for Ghent', () => {
    const names = rentalPages.map(page => page.routeName);
    expect(new Set(names).size).toEqual(names.length);
    rentalPages.forEach(page => {
      const dashJoined = page.legacySlugs.find(slug => slug === `${page.pathBase}-gent`);
      if (dashJoined) {
        expect(page.regionId).toEqual('gent');
      }
      page.legacySlugs.forEach(slug => expect(slug).toMatch(/^[a-z-]+-huren(-gent)?(\/[a-z]+)?$/));
    });
  });

  it('has a page for every example combination of the landing page plan', () => {
    const slugs = rentalPages.map(page => page.slug);
    [
      'springkasteel-huren/temse',
      'partytent-huren/antwerpen',
      'geluidsinstallatie-huren/gent',
      'bar-cateringmateriaal-huren/waasland',
    ].forEach(slug => expect(slugs).toContain(slug));
  });

  it('redirects the old bbq-huren URLs to the renamed bar-cateringmateriaal-huren page', () => {
    const page = rentalPages.find(p => p.categoryId === 'barcatering' && p.regionId === 'gent');
    expect(page.legacySlugs).toEqual(
      expect.arrayContaining(['bbq-huren-gent', 'bbq-huren/gent'])
    );
  });
});

describe('RentalLandingPage', () => {
  const renderPage = pathname =>
    render(<RentalLandingPageComponent location={{ pathname }} />, {
      initialState: { homepageRows: { rows: {} } },
    });

  it('shows the headline, the main call to action and the short lead form', async () => {
    const { getByRole, getAllByRole, getByLabelText } = renderPage('/springkasteel-huren/temse');

    await waitFor(() => {
      expect(
        getByRole('heading', { level: 1, name: /RentalPage\.springkasteel\.h1/ })
      ).toBeInTheDocument();
    });

    const ctas = getAllByRole('link', { name: 'RentalPage.ctaPrimary' });
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach(cta => expect(cta).toHaveAttribute('href', '#aanvraag'));

    expect(getByLabelText('RentalPage.form.name')).toBeInTheDocument();
    expect(getByLabelText('RentalPage.form.contact')).toBeInTheDocument();
    expect(getByLabelText('RentalPage.form.date')).toBeInTheDocument();
  });

  it('links the logo to the homepage', async () => {
    const { getByRole } = renderPage('/bar-cateringmateriaal-huren/gent');
    await waitFor(() => {
      expect(getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    const [logoLink] = within(getByRole('banner')).getAllByRole('link');
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('has no navigation to other pages besides the logo and the legal links', async () => {
    const { getByRole, queryByRole } = renderPage('/bar-cateringmateriaal-huren/waasland');
    await waitFor(() => {
      expect(getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    expect(queryByRole('link', { name: /RentalPage\.partytent\.short/ })).not.toBeInTheDocument();
    expect(getByRole('link', { name: 'RentalPage.footerPrivacy' })).toHaveAttribute(
      'href',
      '/privacy-policy'
    );
  });

  it('offers messenger and instagram DM links and hides phone and WhatsApp until configured', async () => {
    const { getByRole, queryByRole } = renderPage('/partytent-huren/antwerpen');
    await waitFor(() => {
      expect(getByRole('heading', { level: 1 })).toBeInTheDocument();
    });
    expect(getByRole('link', { name: 'RentalPage.instagramButton' })).toHaveAttribute(
      'href',
      'https://ig.me/m/omnirent.be'
    );
    expect(getByRole('link', { name: 'RentalPage.messengerButton' })).toBeInTheDocument();
    expect(queryByRole('link', { name: 'RentalPage.whatsAppButton' })).not.toBeInTheDocument();
    expect(queryByRole('link', { name: 'RentalPage.callButton' })).not.toBeInTheDocument();
  });
});
