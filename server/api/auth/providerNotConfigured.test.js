describe('social login without client id', () => {
  const makeRes = () => {
    const res = { cookie: jest.fn(() => res), redirect: jest.fn(() => res) };
    return res;
  };

  beforeEach(() => {
    jest.resetModules();
    process.env.REACT_APP_MARKETPLACE_ROOT_URL = 'https://omnirent.be/';
    delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
    delete process.env.REACT_APP_FACEBOOK_APP_ID;
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('redirects to the login page instead of failing for Google', () => {
    const { authenticateGoogle } = require('./google');
    const res = makeRes();
    authenticateGoogle({ query: {} }, res, jest.fn());
    expect(res.redirect).toHaveBeenCalledWith('https://omnirent.be/login#');
  });

  it('redirects to the login page instead of failing for Facebook callback', () => {
    const { authenticateFacebookCallback } = require('./facebook');
    const res = makeRes();
    authenticateFacebookCallback({ query: {} }, res, jest.fn());
    expect(res.redirect).toHaveBeenCalledWith('https://omnirent.be/login#');
  });

  it('builds the callback URL without a double slash', () => {
    process.env.REACT_APP_GOOGLE_CLIENT_ID = 'id';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    const passport = require('passport');
    const spy = jest.spyOn(passport, 'use');
    require('./google');
    expect(spy.mock.calls[0][0]._callbackURL).toEqual(
      'https://omnirent.be/api/auth/google/callback'
    );
  });
});
