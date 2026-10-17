import React from 'react';

import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './HomepageFaqSection.module.css';

// The most important questions, shown on the homepage. All questions live on the FAQ page.
const FAQ_IDS = ['free', 'delivery', 'depositCancel', 'availability', 'rentOut'];

const ArrowIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

/**
 * The most important questions of the FAQ page as an accordion, with a call to action to the
 * full FAQ page below it. Uses native details elements so it works without JavaScript.
 *
 * @component
 * @returns {JSX.Element}
 */
const HomepageFaqSection = () => (
  <section className={css.root} aria-labelledby="homepageFaqTitle">
    <div className={css.inner}>
      <div className={css.intro}>
        <p className={css.eyebrow}>
          <FormattedMessage id="HomepageFaqSection.eyebrow" />
        </p>
        <h2 id="homepageFaqTitle" className={css.title}>
          <FormattedMessage id="HomepageFaqSection.title" />
        </h2>
        <p className={css.lede}>
          <FormattedMessage id="HomepageFaqSection.lede" />
        </p>
        <NamedLink name="ContactPage" className={css.contactLink}>
          <FormattedMessage id="HomepageFaqSection.contact" />
          <ArrowIcon />
        </NamedLink>
      </div>

      <div className={css.list}>
        {FAQ_IDS.map((id, index) => (
          <details key={id} className={css.item} open={index === 0}>
            <summary className={css.question}>
              <FormattedMessage id={`HomepageFaqSection.${id}.q`} />
            </summary>
            <p className={css.answer}>
              <FormattedMessage id={`HomepageFaqSection.${id}.a`} />
            </p>
          </details>
        ))}
      </div>
    </div>

    <div className={css.allRow}>
      <NamedLink name="FaqPage" className={css.allButton}>
        <FormattedMessage id="HomepageFaqSection.viewAll" />
        <ArrowIcon />
      </NamedLink>
    </div>
  </section>
);

export default HomepageFaqSection;
