import { buildPhoneHref, buildWhatsAppHref, getContactChannels } from './contactChannels';

describe('buildPhoneHref', () => {
  it('builds a tel: link and keeps the international plus', () => {
    expect(buildPhoneHref('+32 471 23 45 67')).toEqual('tel:+32471234567');
    expect(buildPhoneHref('0471/23.45.67')).toEqual('tel:0471234567');
  });

  it('returns null without a number', () => {
    expect(buildPhoneHref('')).toBeNull();
    expect(buildPhoneHref(undefined)).toBeNull();
  });
});

describe('buildWhatsAppHref', () => {
  it('builds a click-to-chat link with an encoded message', () => {
    expect(buildWhatsAppHref('+32 471 23 45 67', 'Hallo & dag')).toEqual(
      'https://wa.me/32471234567?text=Hallo%20%26%20dag'
    );
  });

  it('handles a 00 prefix and a missing message', () => {
    expect(buildWhatsAppHref('0032471234567')).toEqual('https://wa.me/32471234567');
  });

  it('returns null without a number', () => {
    expect(buildWhatsAppHref('', 'hoi')).toBeNull();
  });
});

describe('getContactChannels', () => {
  const env = process.env;
  afterEach(() => {
    process.env = env;
  });

  it('only returns phone, WhatsApp and promise when they are configured', () => {
    process.env = { ...env };
    delete process.env.REACT_APP_CONTACT_PHONE;
    delete process.env.REACT_APP_WHATSAPP_NUMBER;
    delete process.env.REACT_APP_RESPONSE_PROMISE;
    const channels = getContactChannels('hoi');
    expect(channels.phoneHref).toBeNull();
    expect(channels.whatsAppHref).toBeNull();
    expect(channels.responsePromise).toBeNull();
    expect(channels.instagramHref).toEqual('https://ig.me/m/omnirent.be');
  });

  it('uses the configured values', () => {
    process.env = {
      ...env,
      REACT_APP_CONTACT_PHONE: '+32 9 123 45 67',
      REACT_APP_WHATSAPP_NUMBER: '+32471234567',
      REACT_APP_RESPONSE_PROMISE: 'Antwoord binnen een uur.',
    };
    const channels = getContactChannels('hoi');
    expect(channels.phoneHref).toEqual('tel:+3291234567');
    expect(channels.whatsAppHref).toEqual('https://wa.me/32471234567?text=hoi');
    expect(channels.responsePromise).toEqual('Antwoord binnen een uur.');
  });
});
