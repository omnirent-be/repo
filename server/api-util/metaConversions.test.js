const { buildEvent } = require('./metaConversions');

const validBody = {
  eventName: 'ViewContent',
  eventId: 'abc-123',
  eventSourceUrl: 'https://omnirent.be/l/partytent/1',
  customData: { search_term: 'tent', nested: { a: 1 }, count: 2 },
};

describe('buildEvent', () => {
  it('builds a Conversions API event with the browser event id for deduplication', () => {
    const event = buildEvent({
      body: validBody,
      ip: '203.0.113.5',
      userAgent: 'Mozilla/5.0',
      cookies: { _fbp: 'fb.1.123.456', _fbc: 'fb.1.123.abc' },
      nowSeconds: 1700000000,
    });
    expect(event).toEqual({
      event_name: 'ViewContent',
      event_time: 1700000000,
      event_id: 'abc-123',
      event_source_url: 'https://omnirent.be/l/partytent/1',
      action_source: 'website',
      user_data: {
        client_ip_address: '203.0.113.5',
        client_user_agent: 'Mozilla/5.0',
        fbp: 'fb.1.123.456',
        fbc: 'fb.1.123.abc',
      },
      custom_data: { search_term: 'tent', count: 2 },
    });
  });

  it('omits user data that is not available', () => {
    const event = buildEvent({ body: validBody });
    expect(event.user_data).toEqual({});
  });

  it('rejects event names outside the allow-list', () => {
    expect(buildEvent({ body: { ...validBody, eventName: 'Purchase' } })).toBeNull();
    expect(buildEvent({ body: { ...validBody, eventName: undefined } })).toBeNull();
  });

  it('rejects a missing event id or an invalid source url', () => {
    expect(buildEvent({ body: { ...validBody, eventId: '' } })).toBeNull();
    expect(
      buildEvent({ body: { ...validBody, eventSourceUrl: 'javascript:alert(1)' } })
    ).toBeNull();
    expect(buildEvent({ body: { ...validBody, eventSourceUrl: 'nope' } })).toBeNull();
  });

  it('returns null for a missing body', () => {
    expect(buildEvent({ body: undefined })).toBeNull();
  });
});
