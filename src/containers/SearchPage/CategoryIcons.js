import React from 'react';

// Small line-art icons for the category quick-nav chips, keyed by the
// category id as configured in Console (Build > Content > Categories).
// Deliberately simple/geometric (not photorealistic) so they stay legible
// at the chip's small size and are easy to keep consistent with each
// other. An id with no match here just renders the chip without an icon
// (see CategoryQuickNav in SearchPageWithGrid.js) rather than breaking.
const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const TentIcon = () => (
  <svg {...iconProps}>
    <path d="M8 1.5 14 12.5H2L8 1.5Z" />
    <path d="M8 1.5V12.5" />
    <path d="M2 12.5H14" />
  </svg>
);

const FurnitureIcon = () => (
  <svg {...iconProps}>
    <path d="M3.5 7V4.5a1.5 1.5 0 0 1 1.5-1.5h6a1.5 1.5 0 0 1 1.5 1.5V7" />
    <path d="M2.5 7h11a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
    <path d="M3 11v2" />
    <path d="M13 11v2" />
  </svg>
);

const CateringIcon = () => (
  <svg {...iconProps}>
    <path d="M4 1.5v5a1.5 1.5 0 0 0 1.5 1.5v6" />
    <path d="M4 1.5v3M5.5 1.5v3" />
    <path d="M11.5 1.5c-1 0-1.5 1-1.5 2.5s.5 2.5 1.5 2.5v7.5" />
  </svg>
);

const SoundIcon = () => (
  <svg {...iconProps}>
    <rect x="4.5" y="1.5" width="7" height="13" rx="2" />
    <circle cx="8" cy="5" r="1.2" />
    <circle cx="8" cy="10.5" r="2" />
  </svg>
);

const FunIcon = () => (
  <svg {...iconProps}>
    <path d="M8 1.5 9.7 5.6l4.3.3-3.3 2.9 1 4.2L8 10.8l-3.7 2.2 1-4.2-3.3-2.9 4.3-.3L8 1.5Z" />
  </svg>
);

const CameraIcon = () => (
  <svg {...iconProps}>
    <path d="M1.5 5h2l1-1.5h3l1 1.5h2A1.5 1.5 0 0 1 12 6.5v6A1.5 1.5 0 0 1 10.5 14h-8A1.5 1.5 0 0 1 1 12.5v-6A1.5 1.5 0 0 1 1.5 5Z" />
    <circle cx="6.5" cy="9" r="2.2" />
  </svg>
);

export const CATEGORY_ICONS = {
  'tent-structuren': TentIcon,
  'Meubilair-Decoratie': FurnitureIcon,
  'Catering-Keuken': CateringIcon,
  'Geluid-Lichtdj': SoundIcon,
  'Springkastelen-Fun': FunIcon,
  'Trouwfotografie-apparatuur': CameraIcon,
};
