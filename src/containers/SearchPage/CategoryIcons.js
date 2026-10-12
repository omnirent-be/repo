import React from 'react';

// Category chip icons. Keyed by Console category id, with a name fallback
// so a renamed id still gets the matching pictogram. Stroke icons match the
// homepage category bar (tent, sofa, pot, speaker, party popper, camera).

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
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </Svg>
);

const TentIcon = () => (
  <Svg>
    <path d="M3.5 21 14 3" />
    <path d="M20.5 21 10 3" />
    <path d="M15.5 21 12 15l-3.5 6" />
    <path d="M2 21h20" />
  </Svg>
);

const FurnitureIcon = () => (
  <Svg>
    <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
    <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z" />
    <path d="M4 18v2" />
    <path d="M20 18v2" />
  </Svg>
);

const CateringIcon = () => (
  <Svg>
    <path d="M12 2v3" />
    <path d="M8 6h8" />
    <path d="M4 10h16" />
    <path d="M6 10v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" />
    <path d="M4 10a2 2 0 0 1-2 2" />
  </Svg>
);

const SoundIcon = () => (
  <Svg>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </Svg>
);

const FunIcon = () => (
  <Svg>
    <path d="M5.8 11.3 2 22l10.7-3.79" />
    <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" />
    <path d="M14 8s.8-1.4 2.2-1.6c1.2-.2 2 .6 2.3 1.6" />
    <path d="M17 4s.5-.9 1.4-1" />
    <circle cx="19" cy="9" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="21" cy="12" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="16" cy="11" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="6" r="0.7" fill="currentColor" stroke="none" />
  </Svg>
);

const DecorIcon = () => (
  <Svg>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </Svg>
);

const HeatIcon = () => (
  <Svg>
    <rect x="3" y="8" width="18" height="13" rx="2" />
    <path d="M7 11v7" />
    <path d="M10.5 11v7" />
    <path d="M14 11v7" />
    <path d="M17.5 11v7" />
    <path d="M7 4c1 1 1 2 0 3" />
    <path d="M12 3c1 1 1 2 0 3" />
    <path d="M17 4c1 1 1 2 0 3" />
  </Svg>
);

const CameraIcon = () => (
  <Svg>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
    <circle cx="12" cy="13" r="3" />
  </Svg>
);

export const CATEGORY_ICONS = {
  'tent-structuren': TentIcon,
  'Meubilair-Decoratie': FurnitureIcon,
  'Catering-Keuken': CateringIcon,
  'Geluid-Lichtdj': SoundIcon,
  'Springkastelen-Fun': FunIcon,
  'Trouwfotografie-apparatuur': CameraIcon,
};

/**
 * Resolve the pictogram for a category by Console id, then by name.
 *
 * @param {string} id category id from Console
 * @param {string} [name] display name, used if the id is unknown
 * @returns {React.ComponentType|null}
 */
export const iconForCategory = (id, name = '') => {
  if (CATEGORY_ICONS[id]) {
    return CATEGORY_ICONS[id];
  }
  const n = name.toLowerCase();
  if (n.includes('tent')) {
    return TentIcon;
  }
  if (n.includes('meubel')) {
    return FurnitureIcon;
  }
  if (n.includes('cater') || n.includes('keuken') || n.includes('bar')) {
    return CateringIcon;
  }
  if (n.includes('geluid') || n.includes('licht') || n.includes('dj')) {
    return SoundIcon;
  }
  if (n.includes('fun') || n.includes('spring') || n.includes('entertain')) {
    return FunIcon;
  }
  if (n.includes('foto') || n.includes('video') || n.includes('camera')) {
    return CameraIcon;
  }
  if (n.includes('decor')) {
    return DecorIcon;
  }
  if (n.includes('verwarm')) {
    return HeatIcon;
  }
  return null;
};
