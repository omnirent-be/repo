jest.mock('../api-util/sendgrid', () => ({
  sendContactEmail: jest.fn(),
}));

const { sendContactEmail } = require('../api-util/sendgrid');
const contact = require('./contact');

const mockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const validBody = {
  name: 'Sarah Peeters',
  email: 'sarah@example.com',
  topicLabel: 'Boeking',
  message: 'Ik wil graag een partytent huren voor 20 juni.',
};

describe('contact', () => {
  beforeEach(() => {
    sendContactEmail.mockReset();
  });

  it('sends the email and returns 200 for a valid request', async () => {
    sendContactEmail.mockResolvedValue();
    const res = mockRes();

    await contact({ body: validBody }, res);

    expect(sendContactEmail).toHaveBeenCalledWith({
      name: 'Sarah Peeters',
      email: 'sarah@example.com',
      topicLabel: 'Boeking',
      message: 'Ik wil graag een partytent huren voor 20 juni.',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('returns 400 when name is missing', async () => {
    const res = mockRes();
    await contact({ body: { ...validBody, name: '  ' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when email is invalid', async () => {
    const res = mockRes();
    await contact({ body: { ...validBody, email: 'not-an-email' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when message is missing', async () => {
    const res = mockRes();
    await contact({ body: { ...validBody, message: '' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(sendContactEmail).not.toHaveBeenCalled();
  });

  it('propagates the error status when sending fails (e.g. not configured)', async () => {
    const error = new Error('Contact form email is not configured.');
    error.status = 503;
    sendContactEmail.mockRejectedValue(error);
    const res = mockRes();

    await contact({ body: validBody }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: error.message });
  });
});
