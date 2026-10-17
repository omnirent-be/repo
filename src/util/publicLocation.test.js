import { fetchAreaNames, getPublicLocationLabel, getPublicPlaceName } from './publicLocation';

describe('getPublicPlaceName', () => {
  it('keeps only the place from a Google style address', () => {
    expect(getPublicPlaceName('Brusselsesteenweg 329, 9050 Gent, Oost-Vlaanderen, België')).toEqual(
      'Gent'
    );
    expect(getPublicPlaceName('Brusselsesteenweg 329, 9050 Gent, België')).toEqual('Gent');
  });

  it('handles a Mapbox style address with the postcode after the province', () => {
    expect(getPublicPlaceName('Brusselsesteenweg 329, Gent, Oost-Vlaanderen 9050, België')).toEqual(
      'Gent'
    );
  });

  it('handles a street without a house number and a trailing house number format', () => {
    expect(getPublicPlaceName('Korenmarkt, 9000 Gent, België')).toEqual('Gent');
    expect(getPublicPlaceName('Dorpsstraat 12 bus 3, 9140 Temse, België')).toEqual('Temse');
  });

  it('keeps a place that is already just a place', () => {
    expect(getPublicPlaceName('Gent')).toEqual('Gent');
    expect(getPublicPlaceName('9000 Gent')).toEqual('Gent');
  });

  it('never returns a street or number', () => {
    expect(getPublicPlaceName('Brusselsesteenweg 329')).toBeNull();
    expect(getPublicPlaceName('')).toBeNull();
    expect(getPublicPlaceName(undefined)).toBeNull();
    expect(getPublicPlaceName(null)).toBeNull();
  });
});

describe('getPublicLocationLabel', () => {
  it('shows the sub-municipality with its municipality', () => {
    expect(getPublicLocationLabel({ neighborhood: 'Gentbrugge', city: 'Gent' })).toEqual(
      'Gentbrugge, Gent'
    );
  });

  it('does not repeat the municipality', () => {
    expect(getPublicLocationLabel({ neighborhood: 'Gent Centrum', city: 'Gent' })).toEqual(
      'Gent Centrum'
    );
    expect(getPublicLocationLabel({ neighborhood: 'Temse', city: 'Temse' })).toEqual('Temse');
  });

  it('shows only the sub-municipality when the city is unknown', () => {
    expect(getPublicLocationLabel({ neighborhood: 'Ledeberg' })).toEqual('Ledeberg');
  });

  it('falls back to the city and then to the place in the address, never the street', () => {
    expect(
      getPublicLocationLabel({ city: 'Gent', address: 'Brusselsesteenweg 329, Gent' })
    ).toEqual('Gent');
    expect(getPublicLocationLabel({ address: 'Brusselsesteenweg 329, 9050 Gent, België' })).toEqual(
      'Gent'
    );
    expect(getPublicLocationLabel({ address: 'Brusselsesteenweg 329' })).toBeNull();
    expect(getPublicLocationLabel(undefined)).toBeNull();
  });
});

describe('fetchAreaNames', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    window.sessionStorage.clear();
  });

  it('returns the sub-municipality and municipality from Mapbox', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { place_type: ['locality'], text: 'Gentbrugge' },
          { place_type: ['place'], text: 'Gent' },
        ],
      }),
    });
    const result = await fetchAreaNames({ lat: 51.0405, lng: 3.76, accessToken: 'pk.test' });
    expect(result).toEqual({ neighborhood: 'Gentbrugge', city: 'Gent' });
    expect(global.fetch.mock.calls[0][0]).toContain('/3.76,51.0405.json');

    // Second call is answered from the session cache.
    await fetchAreaNames({ lat: 51.0405, lng: 3.76, accessToken: 'pk.test' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns null without a token, on a failed request and on an empty result', async () => {
    global.fetch = jest.fn();
    expect(await fetchAreaNames({ lat: 1, lng: 2, accessToken: null })).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    expect(await fetchAreaNames({ lat: 1, lng: 2, accessToken: 'pk.test' })).toBeNull();

    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    expect(await fetchAreaNames({ lat: 1, lng: 2, accessToken: 'pk.test' })).toBeNull();

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });
    expect(await fetchAreaNames({ lat: 1, lng: 2, accessToken: 'pk.test' })).toBeNull();
  });
});
