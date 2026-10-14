import { getPublicPlaceName } from './publicLocation';

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
