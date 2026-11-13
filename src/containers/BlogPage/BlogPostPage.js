import React from 'react';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  blogPosts,
  getBlogPostBySlug,
  getRentalPageForCategory,
} from '../../util/blogPosts';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { H1, LayoutSingleColumn, NamedLink, Page } from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import NotFoundPage from '../NotFoundPage/NotFoundPage';

import css from './BlogPage.module.css';

const MAX_RELATED_POSTS = 2;

const RentalPageLink = ({ category, className, children }) => {
  const page = getRentalPageForCategory(category);
  return page ? (
    <NamedLink name={page.routeName} className={className}>
      {children}
    </NamedLink>
  ) : null;
};

const Block = ({ block }) => {
  switch (block.type) {
    case 'h2':
      return <h2 className={css.bodyHeading}>{block.text}</h2>;
    case 'ul':
      return (
        <ul className={css.bodyList}>
          {block.items.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'tip':
      return (
        <aside className={css.tip}>
          <strong className={css.tipLabel}>
            <FormattedMessage id="BlogPostPage.tipLabel" />
          </strong>
          <p className={css.tipText}>{block.text}</p>
        </aside>
      );
    case 'cta':
      return (
        <p className={css.ctaRow}>
          <RentalPageLink category={block.category} className={css.ctaLink}>
            {block.text} →
          </RentalPageLink>
        </p>
      );
    default:
      return <p className={css.bodyText}>{block.text}</p>;
  }
};

/**
 * One blog article (/blog/:slug). Articles live in src/config/blogPosts.js.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.params route params, contains the article slug
 * @returns {JSX.Element}
 */
export const BlogPostPageComponent = props => {
  const { params, staticContext } = props;
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const post = getBlogPostBySlug(params?.slug);
  if (!post) {
    return <NotFoundPage staticContext={staticContext} />;
  }

  const rootURL = config.marketplaceRootURL?.replace(/\/$/, '') || '';
  const postUrl = `${rootURL}/blog/${post.slug}`;
  const formatDate = date =>
    intl.formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' });

  const relatedPosts = blogPosts
    .filter(p => p.slug !== post.slug)
    .filter(p => p.categories.some(c => post.categories.includes(c)))
    .slice(0, MAX_RELATED_POSTS);

  const schema = [
    {
      '@context': 'http://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.metaDescription,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      mainEntityOfPage: postUrl,
      url: postUrl,
      inLanguage: 'nl-BE',
      author: { '@type': 'Organization', name: 'OmniRent', url: rootURL },
      publisher: { '@type': 'Organization', name: 'OmniRent', url: rootURL },
    },
    {
      '@context': 'http://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: rootURL || '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${rootURL}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: postUrl },
      ],
    },
  ];

  return (
    <Page
      title={post.metaTitle}
      description={post.metaDescription}
      scrollingDisabled={scrollingDisabled}
      schema={schema}
      openGraphType="article"
      published={post.publishedAt}
      updated={post.updatedAt}
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <article className={css.content}>
          <nav className={css.breadcrumb} aria-label="Breadcrumb">
            <NamedLink name="BlogIndexPage">
              <FormattedMessage id="BlogPostPage.backToBlog" />
            </NamedLink>
          </nav>

          <H1 as="h1" className={css.heading}>
            {post.title}
          </H1>
          <p className={css.postMeta}>
            {formatDate(post.publishedAt)}
            {' · '}
            <FormattedMessage id="BlogPage.readMinutes" values={{ minutes: post.readMinutes }} />
          </p>

          <div className={css.body}>
            {post.body.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </div>

          <aside className={css.rentalLinks}>
            <h2 className={css.asideHeading}>
              <FormattedMessage id="BlogPostPage.rentNearby" />
            </h2>
            <ul className={css.rentalLinkList}>
              {post.categories.map(category => {
                const page = getRentalPageForCategory(category);
                return page ? (
                  <li key={category}>
                    <NamedLink name={page.routeName} className={css.rentalLink}>
                      <FormattedMessage
                        id={`RentalPage.${category}.h1`}
                        values={{ region: page.regionName }}
                      />
                    </NamedLink>
                  </li>
                ) : null;
              })}
            </ul>
          </aside>

          {relatedPosts.length > 0 ? (
            <aside className={css.related}>
              <h2 className={css.asideHeading}>
                <FormattedMessage id="BlogPostPage.relatedPosts" />
              </h2>
              <ul className={css.postList}>
                {relatedPosts.map(related => (
                  <li key={related.slug}>
                    <NamedLink
                      name="BlogPostPage"
                      params={{ slug: related.slug }}
                      className={css.postCard}
                    >
                      <h3 className={css.postCardTitle}>{related.title}</h3>
                      <p className={css.postCardExcerpt}>{related.excerpt}</p>
                    </NamedLink>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </article>
      </LayoutSingleColumn>
    </Page>
  );
};

export default BlogPostPageComponent;
