import React from 'react';
import { useConfiguration } from '../../../../context/configurationContext';
import { FormattedMessage } from '../../../../util/reactIntl';
import { openCookieSettings } from '../../../../util/consent';
import { LinkedLogo, NamedLink } from '../../../../components';

import Field from '../../Field';
import BlockBuilder from '../../BlockBuilder';

import SectionContainer from '../SectionContainer';
import css from './SectionFooter.module.css';

const MAX_MOBILE_SCREEN_WIDTH = 1024;

// Code-defined links, so key pages (incl. Contact) are always reachable from
// the footer without depending on what's configured in Console.
const DISCOVER_LINKS = [
  { name: 'HowItWorksPage', labelId: 'SectionFooter.link.howItWorks' },
  { name: 'FaqPage', labelId: 'SectionFooter.link.faq' },
  { name: 'ContactPage', labelId: 'SectionFooter.link.contact' },
  { name: 'NewListingPage', labelId: 'SectionFooter.link.becomeProvider' },
];

// Console footer blocks that are shown in the bottom row (privacy, terms, ...).
// The "general" block only repeats links that are already in the main nav.
const HIDDEN_BLOCK_IDS = ['general'];

/**
 * @typedef {Object} SocialMediaLinkConfig
 * @property {'socialMediaLink'} fieldType
 * @property {string} platform
 * @property {string} url
 */

/**
 * @typedef {Object} BlockConfig
 * @property {string} blockId
 * @property {string} blockName
 * @property {'defaultBlock' | 'footerBlock' | 'socialMediaLink'} blockType
 */

/**
 * @typedef {Object} FieldComponentConfig
 * @property {ReactNode} component
 * @property {Function} pickValidProps
 */

/**
 * Section component that's able to show blocks in multiple different columns (defined by "numberOfColumns" prop)
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {string} props.sectionId id of the section
 * @param {'footer'} props.sectionType
 * @param {Array<SocialMediaLinkConfig>?} props.socialMediaLinks array of social media link configs
 * @param {Object?} props.slogan
 * @param {Object?} props.copyright
 * @param {Object?} props.appearance
 * @param {Array<BlockConfig>?} props.blocks array of block configs
 * @param {Object} props.options extra options for the section component (e.g. custom fieldComponents)
 * @param {Object<string,FieldComponentConfig>?} props.options.fieldComponents custom fields
 * @returns {JSX.Element} Section for article content
 */
const SectionFooter = props => {
  const {
    sectionId,
    className,
    rootClassName,
    socialMediaLinks = [],
    slogan,
    appearance,
    blocks = [],
    options,
    linkLogoToExternalSite,
  } = props;

  // If external mapping has been included for fields
  // E.g. { h1: { component: MyAwesomeHeader } }
  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };
  const linksWithBlockId = socialMediaLinks?.map(sml => {
    return {
      ...sml,
      blockId: sml.link.platform,
    };
  });

  const config = useConfiguration();
  const hasTrackingScripts = !!(
    config?.analytics?.facebookPixelId || config?.analytics?.googleAnalyticsId
  );
  const bottomBlocks = blocks.filter(block => !HIDDEN_BLOCK_IDS.includes(block.blockId));
  const showSocialMediaLinks = socialMediaLinks?.length > 0;
  const hasMatchMedia = typeof window !== 'undefined' && window?.matchMedia;
  const isMobileLayout = hasMatchMedia
    ? window.matchMedia(`(max-width: ${MAX_MOBILE_SCREEN_WIDTH}px)`)?.matches
    : true;
  const logoLayout = isMobileLayout ? 'mobile' : 'desktop';

  // use block builder instead of mapping blocks manually

  return (
    <SectionContainer
      as="footer"
      id={sectionId}
      className={className || css.root}
      rootClassName={rootClassName}
      contentClassName={css.sectionContent}
      appearance={appearance}
      options={fieldOptions}
    >
      <div className={css.footer}>
        <div className={css.top}>
          <div className={css.brand}>
            <LinkedLogo
              rootClassName={css.logoLink}
              logoClassName={css.logoWrapper}
              logoImageClassName={css.logoImage}
              linkToExternalSite={linkLogoToExternalSite}
              layout={logoLayout}
            />
            <Field data={slogan} className={css.slogan} />
            {showSocialMediaLinks ? (
              <div className={css.icons}>
                <BlockBuilder blocks={linksWithBlockId} sectionId={sectionId} options={options} />
              </div>
            ) : null}
          </div>

          <nav className={css.discover} aria-label="OmniRent">
            <ul className={css.discoverList}>
              {DISCOVER_LINKS.map(link => (
                <li key={link.name}>
                  <NamedLink name={link.name} className={css.discoverLink}>
                    <FormattedMessage id={link.labelId} />
                  </NamedLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={css.bottom}>
          <span className={css.copyright}>
            <FormattedMessage
              id="SectionFooter.copyright"
              values={{ year: new Date().getFullYear() }}
            />
          </span>
          <div className={css.bottomLinks}>
            <div className={css.legal}>
              <BlockBuilder blocks={bottomBlocks} sectionId={sectionId} options={options} />
            </div>
            {hasTrackingScripts ? (
              <button type="button" className={css.cookieSettings} onClick={openCookieSettings}>
                <FormattedMessage id="SectionFooter.cookieSettings" />
              </button>
            ) : null}
            <span className={css.madeFor}>
              <FormattedMessage id="SectionFooter.madeFor" />
            </span>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
};

export default SectionFooter;
