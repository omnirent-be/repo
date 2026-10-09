import { trackEvent, trackStandardEvent, getDeviceType, getTrafficSource } from './analytics';

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
  it('does nothing when neither gtag nor fbq is available', () => {
    expect(() => trackEvent('category_clicked', { category: 'tent-structuren' })).not.toThrow();
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

  it('sends a custom event to fbq', () => {
    window.fbq = jest.fn();
    trackEvent('category_clicked', { category: 'tent-structuren' });
    expect(window.fbq).toHaveBeenCalledWith(
      'trackCustom',
      'category_clicked',
      expect.objectContaining({ category: 'tent-structuren' })
    );
    delete window.fbq;
  });

  it('never sends a Standard Event itself - that is handlers.js MetaPixelHandler\'s job', () => {
    window.fbq = jest.fn();
    trackEvent('listing_clicked', { listing_id: 'abc' });
    expect(window.fbq).not.toHaveBeenCalledWith('track', expect.anything(), expect.anything());
    delete window.fbq;
  });
});

describe('trackStandardEvent', () => {
  it('does nothing when fbq is not available', () => {
    expect(() => trackStandardEvent('Contact')).not.toThrow();
  });

  it('sends the Standard Event straight to fbq', () => {
    window.fbq = jest.fn();
    trackStandardEvent('Contact', { topic: 'support' });
    expect(window.fbq).toHaveBeenCalledWith('track', 'Contact', { topic: 'support' });
    delete window.fbq;
  });
});
