/**
 * @jest-environment node
 */

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { getHostedConfiguration } from './util/testHelpers';
import { ServerApp } from './app';
import configureStore from './store';

const render = (url, context) => {
  const store = configureStore({});

  const helmetContext = {};

  const body = ReactDOMServer.renderToString(
    <ServerApp
      url={url}
      context={context}
      helmetContext={helmetContext}
      store={store}
      hostedConfig={getHostedConfiguration()}
    />
  );

  const { helmet: head } = helmetContext;
  return { head, body };
};

describe('Application - node environment', () => {
  it('renders in the server without crashing', () => {
    render('/', {});
  });

  it('renders the styleguide without crashing', () => {
    render('/styleguide', {});
  });

  it('server renders redirects for pages that require authentication', () => {
    const loginPath = '/login';
    const signupPath = '/signup';
    const urlRedirects = {
      '/l/listing-title-slug/1234/checkout': signupPath,
      '/profile-settings': loginPath,
      '/inbox': loginPath,
      '/inbox/orders': loginPath,
      '/inbox/sales': loginPath,
      '/order/1234': loginPath,
      '/sale/1234': loginPath,
      '/listings': loginPath,
      '/account': loginPath,
      '/account/contact-details': loginPath,
      '/account/change-password': loginPath,
      '/account/payments': loginPath,
      '/verify-email': loginPath,
    };
    Object.entries(urlRedirects).forEach(([url, redirectPath]) => {
      const context = {};
      render(url, context);
      expect(context.url).toEqual(redirectPath);
    });
  });

  it('does not redirect anonymous visitors away from starting a new listing ("List First, Sign Up Later")', () => {
    // /l/new itself always redirects (NewListingPage's own component just
    // forwards to EditListingPage with a placeholder draft id/slug) - but
    // that redirect target is the wizard's Basics tab, not /signup, since
    // neither route is auth-gated anymore (see routeConfiguration.js and
    // EditListingPage.js's own currentUser?.id guard).
    const newListingContext = {};
    render('/l/new', newListingContext);
    expect(newListingContext.url).toEqual(
      '/l/draft/00000000-0000-0000-0000-000000000000/new/basics'
    );

    const editListingContext = {};
    render('/l/listing-title-slug/1234/new/basics', editListingContext);
    expect(editListingContext.url).toBeUndefined();
  });

  it('redirects to correct URLs', () => {
    const urlRedirects = { '/l': '/', '/u': '/' };
    Object.entries(urlRedirects).forEach(([url, redirectPath]) => {
      const context = {};
      render(url, context);
      expect(context.url).toEqual(redirectPath);
    });
  });
});
