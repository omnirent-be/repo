describe('sendgrid', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    global.fetch = jest.fn();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('isConfigured is false when SENDGRID_API_KEY or SENDGRID_CONTACT_FROM_EMAIL is missing', () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_CONTACT_FROM_EMAIL;
    // eslint-disable-next-line global-require
    const { isConfigured } = require('./sendgrid');
    expect(isConfigured()).toBe(false);
  });

  it('isConfigured is true when both env vars are set', () => {
    process.env.SENDGRID_API_KEY = 'key';
    process.env.SENDGRID_CONTACT_FROM_EMAIL = 'from@omnirent.be';
    // eslint-disable-next-line global-require
    const { isConfigured } = require('./sendgrid');
    expect(isConfigured()).toBe(true);
  });

  it('sendContactEmail rejects with a 503 when not configured', async () => {
    delete process.env.SENDGRID_API_KEY;
    delete process.env.SENDGRID_CONTACT_FROM_EMAIL;
    // eslint-disable-next-line global-require
    const { sendContactEmail } = require('./sendgrid');

    await expect(
      sendContactEmail({ name: 'Sarah', email: 'sarah@example.com', message: 'Hoi' })
    ).rejects.toMatchObject({ status: 503 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sendContactEmail posts to the SendGrid API with the expected payload', async () => {
    process.env.SENDGRID_API_KEY = 'key';
    process.env.SENDGRID_CONTACT_FROM_EMAIL = 'from@omnirent.be';
    process.env.SENDGRID_CONTACT_TO_EMAIL = 'to@omnirent.be';
    global.fetch.mockResolvedValue({ ok: true, json: jest.fn() });
    // eslint-disable-next-line global-require
    const { sendContactEmail } = require('./sendgrid');

    await sendContactEmail({
      name: 'Sarah',
      email: 'sarah@example.com',
      topicLabel: 'Boeking',
      message: 'Hoi, ik heb een vraag.',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.sendgrid.com/v3/mail/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer key' }),
      })
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.personalizations[0].to[0].email).toBe('to@omnirent.be');
    expect(body.from.email).toBe('from@omnirent.be');
    expect(body.reply_to).toEqual({ email: 'sarah@example.com', name: 'Sarah' });
    expect(body.subject).toContain('Boeking');
    expect(body.content[0].value).toContain('Hoi, ik heb een vraag.');
  });

  it('sendContactEmail rejects when SendGrid responds with an error', async () => {
    process.env.SENDGRID_API_KEY = 'key';
    process.env.SENDGRID_CONTACT_FROM_EMAIL = 'from@omnirent.be';
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn().mockResolvedValue({ errors: [{ message: 'Unauthorized' }] }),
    });
    // eslint-disable-next-line global-require
    const { sendContactEmail } = require('./sendgrid');

    await expect(
      sendContactEmail({ name: 'Sarah', email: 'sarah@example.com', message: 'Hoi' })
    ).rejects.toMatchObject({ status: 401, message: 'Unauthorized' });
  });
});
