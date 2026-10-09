import { matchFunnelEvent } from './handlers';

describe('matchFunnelEvent', () => {
  it('matches a search results page, carrying keywords and category as event params', () => {
    expect(matchFunnelEvent('/s?keywords=tent&pub_categoryLevel1=tenten')).toEqual({
      name: 'search',
      params: { search_term: 'tent', category: 'tenten' },
    });
  });

  it('matches a bare search results page with no params', () => {
    expect(matchFunnelEvent('/s')).toEqual({ name: 'search', params: {} });
  });

  it('matches a listing page (slug already stripped by canonicalRoutePath)', () => {
    expect(matchFunnelEvent('/l/abc123')).toEqual({ name: 'view_item', params: {} });
  });

  it('matches a checkout page', () => {
    expect(matchFunnelEvent('/l/mijn-tent/abc123/checkout')).toEqual({
      name: 'booking_request_started',
      params: {},
    });
  });

  it('matches an order details page reached right after checkout', () => {
    expect(matchFunnelEvent('/order/xyz789', '/l/mijn-tent/abc123/checkout')).toEqual({
      name: 'booking_request_sent',
      params: {},
    });
  });

  it('does not treat an order details page as a funnel event when not coming from checkout', () => {
    expect(matchFunnelEvent('/order/xyz789', '/inbox/orders')).toBeNull();
  });

  it('ignores unrelated routes', () => {
    expect(matchFunnelEvent('/about')).toBeNull();
    expect(matchFunnelEvent('/profile/abc123')).toBeNull();
  });
});
