import React from 'react';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { blogPosts } from '../../util/blogPosts';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { H1, LayoutSingleColumn, NamedLink, Page } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './BlogPage.module.css';

/**
 * Overview of all blog articles (/blog). Articles live in src/config/blogPosts.js.
 *
 * @component
 * @returns {JSX.Element}
 */
export const BlogIndexPageComponent = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const rootURL = config.marketplaceRootURL?.replace(/\/$/, '') || '';
  const schema = {
    '@context': 'http://schema.org',
    '@type': 'Blog',
    name: intl.formatMessage({ id: 'BlogIndexPage.heading' }),
    url: `${rootURL}/blog`,
    blogPost: blogPosts.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${rootURL}/blog/${post.slug}`,
      datePublished: post.publishedAt,
    })),
  };

  return (
    <Page
      title={intl.formatMessage({ id: 'BlogIndexPage.metaTitle' })}
      description={intl.formatMessage({ id: 'BlogIndexPage.metaDescription' })}
      scrollingDisabled={scrollingDisabled}
      schema={schema}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.content}>
          <H1 as="h1" className={css.heading}>
            <FormattedMessage id="BlogIndexPage.heading" />
          </H1>
          <p className={css.lead}>
            <FormattedMessage id="BlogIndexPage.lead" />
          </p>

          <ul className={css.postList}>
            {blogPosts.map(post => (
              <li key={post.slug}>
                <NamedLink
                  name="BlogPostPage"
                  params={{ slug: post.slug }}
                  className={css.postCard}
                >
                  <h2 className={css.postCardTitle}>{post.title}</h2>
                  <p className={css.postCardExcerpt}>{post.excerpt}</p>
                  <span className={css.postMeta}>
                    {intl.formatDate(post.publishedAt, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {' · '}
                    <FormattedMessage
                      id="BlogPage.readMinutes"
                      values={{ minutes: post.readMinutes }}
                    />
                  </span>
                </NamedLink>
              </li>
            ))}
          </ul>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default BlogIndexPageComponent;
