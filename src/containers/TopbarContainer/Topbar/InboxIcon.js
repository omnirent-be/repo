import React from 'react';
import classNames from 'classnames';

import css from './Topbar.module.css';

/**
 * Inbox icon (chat bubble) - the icon-only replacement for the old
 * "Postvak IN" text link, matching SearchIcon.js's stroke style.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @returns {JSX.Element} chat bubble icon
 */
const InboxIcon = props => {
  const { className, rootClassName } = props;
  const classes = classNames(rootClassName || css.rootInboxIcon, className);

  return (
    <svg
      className={classes}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 4.5h14a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H8.5L4 17.5V14H3a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default InboxIcon;
