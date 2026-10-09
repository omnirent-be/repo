import React from 'react';
import classNames from 'classnames';

import css from './IconMail.module.css';

/**
 * Mail/envelope icon.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @returns {JSX.Element} SVG icon
 */
const IconMail = props => {
  const { rootClassName, className } = props;
  const classes = classNames(rootClassName || css.root, className);
  return (
    <svg
      className={classes}
      width="20"
      height="16"
      viewBox="0 0 20 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g strokeWidth="1.5" fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="1" width="18" height="14" rx="2" />
        <path d="M1.5 2.5L10 9l8.5-6.5" />
      </g>
    </svg>
  );
};

export default IconMail;
