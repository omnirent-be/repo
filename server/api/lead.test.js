jest.mock('../api-util/sendgrid', () => ({
  sendLeadEmail: jest.fn(),
}));

const { sendLeadEmail } = require('../api-util/sendgrid');
const lead = require('./lead');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const validBody = {
  name: 'Sarah Peeters',
  contact: '0471 23 45 67',
  date: '2026-06-20',
  pageTitle: 'Springkasteel huren in Temse',
  pageUrl: 'https://omnirent.be/springkasteel-huren/temse',
};

describe('lead', () => {
  beforeEach(() => {
    sendLeadEmail.mockReset();
  });

  it('sends the lead with a phone number', async () => {
    sendLeadEmail.mockResolvedValue();
    const res = mockRes();
    await lead({ body: validBody }, res);
    expect(sendLeadEmail).toHaveBeenCalledWith({
      name: 'Sarah Peeters',
      contact: '0471 23 45 67',
      contactIsEmail: false,
      date: '2026-06-20',
      pageTitle: 'Springkasteel huren in Temse',
      pageUrl: 'https://omnirent.be/springkasteel-huren/temse',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('accepts an e-mail address as contact', async () => {
    sendLeadEmail.mockResolvedValue();
    const res = mockRes();
    await lead({ body: { ...validBody, contact: 'sarah@example.com' } }, res);
    expect(sendLeadEmail).toHaveBeenCalledWith(
      expect.objectContaining({ contact: 'sarah@example.com', contactIsEmail: true })
    );
  });

  it.each([
    ['name', { name: '' }],
    ['contact (not a phone or e-mail)', { contact: 'bel me maar' }],
    ['contact (too short phone)', { contact: '12345' }],
    ['date', { date: 'morgen' }],
    ['pageTitle', { pageTitle: '' }],
  ])('returns 400 for an invalid %s', async (label, override) => {
    const res = mockRes();
    await lead({ body: { ...validBody, ...override } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendLeadEmail).not.toHaveBeenCalled();
  });

  it('silently ignores honeypot submissions', async () => {
    const res = mockRes();
    await lead({ body: { ...validBody, website: 'http://spam.example' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(sendLeadEmail).not.toHaveBeenCalled();
  });

  it('passes on the SendGrid status when sending fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    sendLeadEmail.mockRejectedValue(Object.assign(new Error('not configured'), { status: 503 }));
    const res = mockRes();
    await lead({ body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(503);
    jest.restoreAllMocks();
  });
});
