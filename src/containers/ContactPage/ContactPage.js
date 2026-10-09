import React, { useState } from 'react';
import { Form as FinalForm } from 'react-final-form';
import { useSelector } from 'react-redux';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { composeValidators, emailFormatValid, required } from '../../util/validators';
import { sendContactMessage } from '../../util/api';

import {
  FieldSelect,
  FieldTextInput,
  Form,
  H1,
  H3,
  IconMail,
  IconSocialMediaFacebook,
  IconSocialMediaInstagram,
  LayoutSingleColumn,
  NamedLink,
  Page,
  PrimaryButton,
} from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './ContactPage.module.css';

const CONTACT_EMAIL = 'info@omnirent.be';
const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61590675847159';
const INSTAGRAM_URL = 'https://www.instagram.com/omnirent.be/';

const TOPICS = ['general', 'rent', 'list', 'booking', 'payment', 'other'];

const CHANNELS = [
  {
    key: 'email',
    icon: IconMail,
    href: `mailto:${CONTACT_EMAIL}`,
    value: CONTACT_EMAIL,
    external: false,
  },
  {
    key: 'facebook',
    icon: IconSocialMediaFacebook,
    href: FACEBOOK_URL,
    valueId: 'ContactPage.channel.facebook.value',
    external: true,
  },
  {
    key: 'instagram',
    icon: IconSocialMediaInstagram,
    href: INSTAGRAM_URL,
    value: '@omnirent.be',
    external: true,
  },
];

const buildMailto = (values, intl) => {
  const topicLabel = intl.formatMessage({ id: `ContactPage.topic.${values.topic}` });
  const subject = `[${topicLabel}] ${values.name}`;
  const body = `${values.message}\n\nGroetjes,\n${values.name} (${values.email})`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    body
  )}`;
};

/**
 * ContactPage - channels (real e-mail + social links) and a message form.
 * The form is sent server-side via SendGrid (see server/api/contact.js,
 * server/api-util/sendgrid.js) when configured; if that isn't set up yet,
 * or the request fails for any other reason, it falls back to opening the
 * visitor's own mail client with everything filled in, so a message is
 * never silently lost either way.
 *
 * @component
 * @returns {JSX.Element}
 */
export const ContactPageComponent = () => {
  const intl = useIntl();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentViaMailto, setSentViaMailto] = useState(false);

  const onSubmit = async values => {
    setSending(true);
    const topicLabel = intl.formatMessage({ id: `ContactPage.topic.${values.topic}` });
    try {
      await sendContactMessage({
        name: values.name,
        email: values.email,
        topicLabel,
        message: values.message,
      });
      setSent(true);
    } catch (error) {
      // Not configured yet (no SendGrid account set up), or the request
      // failed for some other reason - fall back to the visitor's own mail
      // client so the message is never silently lost.
      setSentViaMailto(true);
      window.location.href = buildMailto(values, intl);
    } finally {
      setSending(false);
    }
  };

  const requiredMessage = id => intl.formatMessage({ id });

  return (
    <Page title={intl.formatMessage({ id: 'ContactPage.title' })} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.hero}>
          <div className={css.heroInner}>
            <span className={css.eyebrow}>
              <FormattedMessage id="ContactPage.eyebrow" />
            </span>
            <H1 as="h1" className={css.heading}>
              <FormattedMessage id="ContactPage.heading" />
            </H1>
            <p className={css.lede}>
              <FormattedMessage id="ContactPage.lede" />
            </p>
          </div>
        </div>

        <div className={css.content}>
          <div className={css.channels}>
            {CHANNELS.map(channel => (
              <a
                key={channel.key}
                className={css.channel}
                href={channel.href}
                {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <span className={css.channelIcon} aria-hidden="true">
                  <channel.icon className={css.channelIconSvg} />
                </span>
                <span className={css.channelLabel}>
                  <FormattedMessage id={`ContactPage.channel.${channel.key}.label`} />
                </span>
                <span className={css.channelValue}>
                  {channel.valueId ? <FormattedMessage id={channel.valueId} /> : channel.value}
                </span>
              </a>
            ))}
          </div>

          <div className={css.columns}>
            <div className={css.formCard}>
              <H3 as="h2" className={css.cardTitle}>
                <FormattedMessage id="ContactPage.form.title" />
              </H3>
              <p className={css.cardText}>
                <FormattedMessage id="ContactPage.form.intro" />
              </p>

              <FinalForm
                onSubmit={onSubmit}
                initialValues={{ topic: 'general' }}
                render={({ handleSubmit, invalid }) => (
                  <Form onSubmit={handleSubmit} className={css.form}>
                    <div className={css.formRow}>
                      <FieldTextInput
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        label={intl.formatMessage({ id: 'ContactPage.form.name' })}
                        placeholder={intl.formatMessage({ id: 'ContactPage.form.namePlaceholder' })}
                        validate={required(requiredMessage('ContactPage.form.nameRequired'))}
                      />
                      <FieldTextInput
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        label={intl.formatMessage({ id: 'ContactPage.form.email' })}
                        placeholder={intl.formatMessage({ id: 'ContactPage.form.emailPlaceholder' })}
                        validate={composeValidators(
                          required(requiredMessage('ContactPage.form.emailRequired')),
                          emailFormatValid(requiredMessage('ContactPage.form.emailInvalid'))
                        )}
                      />
                    </div>

                    <FieldSelect
                      id="contact-topic"
                      name="topic"
                      label={intl.formatMessage({ id: 'ContactPage.form.topic' })}
                    >
                      {TOPICS.map(topic => (
                        <option key={topic} value={topic}>
                          {intl.formatMessage({ id: `ContactPage.topic.${topic}` })}
                        </option>
                      ))}
                    </FieldSelect>

                    <FieldTextInput
                      id="contact-message"
                      name="message"
                      type="textarea"
                      label={intl.formatMessage({ id: 'ContactPage.form.message' })}
                      placeholder={intl.formatMessage({ id: 'ContactPage.form.messagePlaceholder' })}
                      validate={required(requiredMessage('ContactPage.form.messageRequired'))}
                    />

                    <PrimaryButton
                      type="submit"
                      inProgress={sending}
                      ready={sent}
                      disabled={invalid || sending}
                      className={css.submit}
                    >
                      <FormattedMessage id="ContactPage.form.submit" />
                    </PrimaryButton>

                    <p className={css.formNote}>
                      {sent ? (
                        <FormattedMessage id="ContactPage.form.sentNote" />
                      ) : sentViaMailto ? (
                        <FormattedMessage
                          id="ContactPage.form.sentViaMailtoNote"
                          values={{
                            email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>,
                          }}
                        />
                      ) : (
                        <FormattedMessage id="ContactPage.form.note" />
                      )}
                    </p>
                  </Form>
                )}
              />
            </div>

            <div className={css.side}>
              <div className={css.sideCard}>
                <H3 as="h2" className={css.cardTitle}>
                  <FormattedMessage id="ContactPage.faster.title" />
                </H3>
                <p className={css.cardText}>
                  <FormattedMessage id="ContactPage.faster.text" />
                </p>
                <ul className={css.links}>
                  <li>
                    <NamedLink name="FaqPage" className={css.link}>
                      <FormattedMessage id="ContactPage.faster.faq" />
                    </NamedLink>
                  </li>
                  <li>
                    <NamedLink name="HowItWorksPage" className={css.link}>
                      <FormattedMessage id="ContactPage.faster.howItWorks" />
                    </NamedLink>
                  </li>
                  <li>
                    <NamedLink name="InboxPage" params={{ tab: 'orders' }} className={css.link}>
                      <FormattedMessage id="ContactPage.faster.inbox" />
                    </NamedLink>
                  </li>
                </ul>
              </div>

              <div className={css.sideCardAccent}>
                <H3 as="h2" className={css.cardTitleLight}>
                  <FormattedMessage id="ContactPage.list.title" />
                </H3>
                <p className={css.cardTextLight}>
                  <FormattedMessage id="ContactPage.list.text" />
                </p>
                <NamedLink name="NewListingPage" className={css.accentCta}>
                  <FormattedMessage id="ContactPage.list.cta" />
                </NamedLink>
              </div>
            </div>
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default ContactPageComponent;
