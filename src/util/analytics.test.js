import { trackEvent, getDeviceType, getTrafficSource } from './analytics';

describe('getDeviceType', () => {
  const setWidth = width => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  };

  it('returns mobile under the mobile breakpoint', () => {
    setWidth(400);
    expect(getDeviceType()).toBe('mobile');
  });

  it('returns tablet between the mobile and desktop breakpoints', () => {
    setWidth(900);
    expect(getDeviceType()).toBe('tablet');
  });

  it('returns desktop above the tablet breakpoint', () => {
    setWidth(1200);
    expect(getDeviceType()).toBe('desktop');
  });
});

describe('getTrafficSource', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
    Object.defineProperty(document, 'referrer', { writable: true, configurable: true, value: '' });
  });

  it('prefers an explicit utm_source query param', () => {
    window.history.replaceState({}, '', '/?utm_source=facebook');
    expect(getTrafficSource()).toBe('facebook');
  });

  it('falls back to the referrer hostname', () => {
    Object.defineProperty(document, 'referrer', {
      writable: true,
      configurable: true,
      value: 'https://www.google.com/search?q=feestmateriaal',
    });
    expect(getTrafficSource()).toBe('www.google.com');
  });

  it('falls back to "direct" with no utm_source and no referrer', () => {
    expect(getTrafficSource()).toBe('direct');
  });
});

describe('trackEvent', () => {
  it('does nothing when gtag is not available', () => {
    const original = window.gtag;
    delete window.gtag;
    expect(() => trackEvent('category_clicked', { category: 'tent-structuren' })).not.toThrow();
    window.gtag = original;
  });

  it('calls gtag with the event name and merged params', () => {
    window.gtag = jest.fn();
    trackEvent('category_clicked', { category: 'tent-structuren' });
    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'category_clicked',
      expect.objectContaining({ category: 'tent-structuren' })
    );
    delete window.gtag;
  });
});
