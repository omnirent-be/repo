import React from 'react';

// Category quick-nav chip icons, keyed by the category id as configured in
// Console (Build > Content > Categories). Line icons matching the homepage
// category bar. An id with no match here just renders the chip without an
// icon (see CategoryQuickNav in SearchPageWithGrid.js) rather than breaking.

const Svg = ({ children }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    width="24"
    height="24"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

/** 2×2 grid — "Alles ontdekken" */
export const AllCategoriesIcon = () => (
  <Svg>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </Svg>
);

const TentIcon = () => (
  <Svg>
    <path d="M3 21 12 4l9 17" />
    <path d="M12 4v17" />
    <path d="M9.5 21 12 15.5 14.5 21" />
  </Svg>
);

const FurnitureIcon = () => (
  <Svg>
    <path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
    <path d="M4 11h16v5a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 16v-5Z" />
    <path d="M6 17.5v2" />
    <path d="M18 17.5v2" />
  </Svg>
);

const CateringIcon = () => (
  <Svg>
    <path d="M12 4.5v1.5" />
    <path d="M8 8h8" />
    <path d="M6.5 8h-1A2.5 2.5 0 0 0 3 10.5V12" />
    <path d="M6 8c0 6 1.5 10 6 10s6-4 6-10" />
    <path d="M6 18h12" />
  </Svg>
);

const SoundIcon = () => (
  <Svg>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1.5" />
  </Svg>
);

const FunIcon = () => (
  <Svg>
    <path d="m5.5 16 5-2.5-2.5 5" />
    <path d="M10.5 13.5 8 18.5" />
    <path d="M14 5.5c.4 1.5 1.6 2.7 3.1 3.1" />
    <path d="M15.5 3.5c.2.9.8 1.6 1.7 1.8" />
    <circle cx="18.5" cy="8.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="16" cy="10.5" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="20" cy="11" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="7" r="0.7" fill="currentColor" stroke="none" />
  </Svg>
);

const DecorIcon = () => (
  <Svg>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 2a7 7 0 0 1 4 12.5V16a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-1.5A7 7 0 0 1 12 2Z" />
    <path d="M12 8v3" />
  </Svg>
);

const HeatIcon = () => (
  <Svg>
    <rect x="3" y="8" width="18" height="13" rx="2" />
    <path d="M7 11v7" />
    <path d="M10.5 11v7" />
    <path d="M14 11v7" />
    <path d="M17.5 11v7" />
    <path d="M6 5c.8.8.8 1.7 0 2.5" />
    <path d="M12 4c.8.8.8 1.7 0 2.5" />
    <path d="M18 5c.8.8.8 1.7 0 2.5" />
  </Svg>
);

const CameraIcon = () => (
  <Svg>
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="14" r="3.5" />
  </Svg>
);

export const CATEGORY_ICONS = {
  'tent-structuren': TentIcon,
  'Meubilair-Decoratie': FurnitureIcon,
  'Catering-Keuken': CateringIcon,
  'Geluid-Lichtdj': SoundIcon,
  'Springkastelen-Fun': FunIcon,
  'Trouwfotografie-apparatuur': CameraIcon,
  // Extra keys if Console labels/ids ever match the homepage bar copy.
  tenten: TentIcon,
  meubilair: FurnitureIcon,
  decoratie: DecorIcon,
  verwarming: HeatIcon,
};
