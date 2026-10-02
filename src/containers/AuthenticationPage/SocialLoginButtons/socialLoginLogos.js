import React from 'react';

// This is Facebook's logo, you are not allowed to change its color
export const FacebookLogo = ({ ariaLabelledBy }) => (
  <svg
    width="20"
    height="20"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby={ariaLabelledBy}
  >
    <path
      d="M7.89.214C4.055 1.047 1.005 4.13.205 7.947c-.734 3.45.533 7.283 3.166 9.6.967.85 3.2 2.033 4.15 2.183l.617.1v-6.883H5.806v-3h2.283l.083-1.633c.134-2.417.717-3.534 2.3-4.25.617-.284 1.034-.35 2.3-.334.85.017 1.617.084 1.7.134.1.05.167.7.167 1.433v1.317h-.983c-1.484 0-1.75.283-1.817 1.983l-.067 1.35h1.45c1.284 0 1.434.033 1.35.283-.05.167-.133.667-.2 1.134-.216 1.55-.25 1.583-1.483 1.583h-1.083V19.914l.866-.234c1.684-.433 2.984-1.216 4.4-2.633 2.067-2.067 2.9-4.1 2.9-7.017 0-3.166-1.2-5.75-3.616-7.766C14.106.38 10.772-.42 7.889.214z"
      fill="#1877F2"
      fillRule="nonzero"
    />
  </svg>
);

// This is Google's logo, you are not allowed to change its color
export const GoogleLogo = ({ ariaLabelledBy }) => (
  <svg
    width="20"
    height="20"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby={ariaLabelledBy}
  >
    <g fill="none" fillRule="evenodd">
      <path
        d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z"
        fill="#4285F4"
      />
      <path
        d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z"
        fill="#34A853"
      />
      <path
        d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z"
        fill="#FBBC05"
      />
      <path
        d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.192 5.736 7.396 3.977 10 3.977z"
        fill="#EA4335"
      />
      <path d="M0 0h20v20H0z" />
    </g>
  </svg>
);

// NOT itsme's real logo - just a generic placeholder mark (a shield/check,
// same idea as the app's own identity-verification glyph) for the disabled
// "coming soon" button in SocialLoginButtons.js. itsme's actual brand mark
// should replace this once there's a real OIDC partner account to wire up -
// don't use their trademark without that.
export const ItsmeMark = ({ ariaLabelledBy }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby={ariaLabelledBy}
  >
    <path
      d="M10 1l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V4l7-3z"
      fill="#F47D30"
      fillRule="nonzero"
    />
    <path
      d="M6.5 10l2.3 2.3L13.5 7.6"
      stroke="#fff"
      strokeWidth="1.6"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
