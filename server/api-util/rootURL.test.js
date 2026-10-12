describe('getRootURL', () => {
  const load = (env = {}) => {
    jest.resetModules();
    process.env.REACT_APP_MARKETPLACE_ROOT_URL = env.root;
    process.env.REACT_APP_SHARETRIBE_USING_SSL = env.ssl || 'false';
    return require('./rootURL').getRootURL;
  };

  it('uses https when the root URL is https even if USING_SSL is not set', () => {
    expect(load({ root: 'https://omnirent.be' })()).toEqual('https://omnirent.be');
  });

  it('ignores a trailing slash', () => {
    expect(load({ root: 'https://omnirent.be/' })()).toEqual('https://omnirent.be');
  });

  it('keeps http for http root URLs', () => {
    expect(load({ root: 'http://localhost:3000' })()).toEqual('http://localhost:3000');
  });
});
