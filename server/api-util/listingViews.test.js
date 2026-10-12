const { createViewCounter, isValidListingId, isBot } = require('./listingViews');

const LISTING_A = '11111111-1111-4111-8111-111111111111';
const LISTING_B = '22222222-2222-4222-8222-222222222222';
const BROWSER = 'Mozilla/5.0 (Macintosh) AppleWebKit/605 Safari/605';

const makeSdk = (stored = {}) => {
  const update = jest.fn(() => Promise.resolve());
  const show = jest.fn(({ id }) =>
    Promise.resolve({ data: { data: { attributes: { metadata: stored[id] || {} } } } })
  );
  return { listings: { show, update } };
};

describe('listingViews', () => {
  it('validates listing ids and detects bots', () => {
    expect(isValidListingId(LISTING_A)).toBe(true);
    expect(isValidListingId('nope')).toBe(false);
    expect(isValidListingId(undefined)).toBe(false);
    expect(isBot('Googlebot/2.1')).toBe(true);
    expect(isBot('HeadlessChrome/120')).toBe(true);
    expect(isBot(undefined)).toBe(true);
    expect(isBot(BROWSER)).toBe(false);
  });

  it('counts a view and ignores a repeat from the same visitor within an hour', () => {
    let time = 0;
    const counter = createViewCounter({ getSdk: () => makeSdk(), now: () => time });
    const view = { listingId: LISTING_A, visitor: '1.1.1.1', userAgent: BROWSER };

    expect(counter.recordView(view)).toBe(true);
    expect(counter.recordView(view)).toBe(false);
    time = 61 * 60 * 1000;
    expect(counter.recordView(view)).toBe(true);
  });

  it('ignores bots and invalid ids', () => {
    const counter = createViewCounter({ getSdk: () => makeSdk() });
    expect(counter.recordView({ listingId: LISTING_A, visitor: 'a', userAgent: 'Googlebot' })).toBe(
      false
    );
    expect(counter.recordView({ listingId: 'x', visitor: 'a', userAgent: BROWSER })).toBe(false);
  });

  it('adds batched views to the stored count on flush', async () => {
    const sdk = makeSdk({ [LISTING_A]: { viewCount: 10 } });
    const counter = createViewCounter({ getSdk: () => sdk });

    counter.recordView({ listingId: LISTING_A, visitor: 'a', userAgent: BROWSER });
    counter.recordView({ listingId: LISTING_A, visitor: 'b', userAgent: BROWSER });
    counter.recordView({ listingId: LISTING_B, visitor: 'a', userAgent: BROWSER });
    await counter.flush();

    expect(sdk.listings.update).toHaveBeenCalledWith({
      id: LISTING_A,
      metadata: { viewCount: 12 },
    });
    expect(sdk.listings.update).toHaveBeenCalledWith({
      id: LISTING_B,
      metadata: { viewCount: 1 },
    });
  });

  it('does nothing without an Integration SDK', async () => {
    const counter = createViewCounter({ getSdk: () => null });
    counter.recordView({ listingId: LISTING_A, visitor: 'a', userAgent: BROWSER });
    await expect(counter.flush()).resolves.toBeUndefined();
  });

  it('retries after a temporary failure but drops unknown listings', async () => {
    const sdk = makeSdk();
    sdk.listings.show.mockRejectedValueOnce({ status: 429, message: 'rate limited' });
    sdk.listings.show.mockRejectedValueOnce({ status: 404, message: 'not found' });
    const counter = createViewCounter({ getSdk: () => sdk });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    counter.recordView({ listingId: LISTING_A, visitor: 'a', userAgent: BROWSER });
    counter.recordView({ listingId: LISTING_B, visitor: 'a', userAgent: BROWSER });
    await counter.flush();
    expect(sdk.listings.update).not.toHaveBeenCalled();

    // Only the rate-limited listing is retried.
    await counter.flush();
    expect(sdk.listings.update).toHaveBeenCalledTimes(1);
    expect(sdk.listings.update).toHaveBeenCalledWith({
      id: LISTING_A,
      metadata: { viewCount: 1 },
    });
    console.error.mockRestore();
  });
});
