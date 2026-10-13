jest.mock('../api-util/metaConversions', () => {
  const actual = jest.requireActual('../api-util/metaConversions');
  return { ...actual, sendEvents: jest.fn() };
});

const { sendEvents } = require('../api-util/metaConversions');
const metaEvent = require('./meta-event');

const mockRes = () => ({ status: jest.fn().mockReturnThis(), end: jest.fn() });

const req = {
  body: {
    eventName: 'PageView',
    eventId: 'evt-1',
    eventSourceUrl: 'https://omnirent.be/',
  },
  ip: '203.0.113.5',
  cookies: {},
  get: () => 'Mozilla/5.0',
};

describe('meta-event', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    sendEvents.mockReset();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it('does nothing but answers 204 when the access token is not configured', () => {
    process.env.REACT_APP_FACEBOOK_PIXEL_ID = '123';
    delete process.env.META_CAPI_ACCESS_TOKEN;
    const res = mockRes();
    metaEvent(req, res);
    expect(sendEvents).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('forwards a valid event to Meta and answers 204', () => {
    process.env.REACT_APP_FACEBOOK_PIXEL_ID = '123';
    process.env.META_CAPI_ACCESS_TOKEN = 'token';
    process.env.META_CAPI_TEST_EVENT_CODE = 'TEST1';
    sendEvents.mockResolvedValue({ ok: true });
    const res = mockRes();
    metaEvent(req, res);
    expect(sendEvents).toHaveBeenCalledTimes(1);
    const args = sendEvents.mock.calls[0][0];
    expect(args).toMatchObject({ pixelId: '123', accessToken: 'token', testEventCode: 'TEST1' });
    expect(args.events[0]).toMatchObject({ event_name: 'PageView', event_id: 'evt-1' });
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('does not call Meta for an invalid event, and still answers 204', () => {
    process.env.REACT_APP_FACEBOOK_PIXEL_ID = '123';
    process.env.META_CAPI_ACCESS_TOKEN = 'token';
    const res = mockRes();
    metaEvent({ ...req, body: { eventName: 'Nope' } }, res);
    expect(sendEvents).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('survives a failing Meta request', async () => {
    process.env.REACT_APP_FACEBOOK_PIXEL_ID = '123';
    process.env.META_CAPI_ACCESS_TOKEN = 'token';
    sendEvents.mockRejectedValue(new Error('network'));
    const res = mockRes();
    expect(() => metaEvent(req, res)).not.toThrow();
    await Promise.resolve();
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
