import React from 'react';

// Category chip icons, one per top-level subcategory configured in Console
// (Build > Content > Categories). Matched on the real Console id first, then
// on the display name, so a renamed id still gets a pictogram. Line icons in
// the same style as the homepage category bar.

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

/** 2x2 grid - "Alles ontdekken" */
export const AllCategoriesIcon = () => (
  <Svg>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </Svg>
);

/** Tenten */
const TentIcon = () => (
  <Svg>
    <path d="M3.5 21 14 3" />
    <path d="M20.5 21 10 3" />
    <path d="M15.5 21 12 15l-3.5 6" />
    <path d="M2 21h20" />
  </Svg>
);

/** Meubilair */
const FurnitureIcon = () => (
  <Svg>
    <path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3" />
    <path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z" />
    <path d="M4 18v2" />
    <path d="M20 18v2" />
  </Svg>
);

/** Vloeren - tile / parquet pattern */
const FloorIcon = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 12h18" />
    <path d="M9 4v8" />
    <path d="M15 12v8" />
  </Svg>
);

/** Bar & Catering - cooking pot */
const CateringIcon = () => (
  <Svg>
    <path d="M12 2v3" />
    <path d="M8 6h8" />
    <path d="M4 10h16" />
    <path d="M6 10v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" />
    <path d="M4 10a2 2 0 0 1-2 2" />
  </Svg>
);

/** Decoratie - light bulb */
const DecorIcon = () => (
  <Svg>
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" />
    <path d="M10 22h4" />
  </Svg>
);

/** Geluid, Licht & AV-techniek - mixing console with faders */
const SoundIcon = () => (
  <Svg>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M7 8.5v7" />
    <path d="M12 8.5v7" />
    <path d="M17 8.5v7" />
    <path d="M5.5 11h3" />
    <path d="M10.5 14h3" />
    <path d="M15.5 10h3" />
  </Svg>
);

/** Verwarming - radiator with heat */
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

/** Entertainment & Kinderanimatie - party popper */
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

/** Sanitair - toilet */
const SanitationIcon = () => (
  <Svg>
    <rect x="7" y="3" width="10" height="5" rx="1" />
    <path d="M5 11h14c0 4-2 7-5 7h-4c-3 0-5-3-5-7Z" />
    <path d="M9 18v3h6v-3" />
  </Svg>
);

/** Podium & Constructie - stage platform on legs */
const StageIcon = () => (
  <Svg>
    <rect x="2" y="7" width="20" height="4" rx="1" />
    <path d="M5 11v9" />
    <path d="M12 11v9" />
    <path d="M19 11v9" />
    <path d="M5 15l7 5" />
    <path d="M12 15l7 5" />
  </Svg>
);

/** Accessoires & Toebehoren - plug */
const AccessoryIcon = () => (
  <Svg>
    <path d="M12 22v-5" />
    <path d="M9 8V2" />
    <path d="M15 8V2" />
    <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
  </Svg>
);

/** Fotografie & Video - camera */
const CameraIcon = () => (
  <Svg>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
    <circle cx="12" cy="13" r="3" />
  </Svg>
);

// Keyed by the Console category id, lowercased (ids have mixed casing).
export const CATEGORY_ICONS = {
  'tent-structuren': TentIcon,
  meubilair: FurnitureIcon,
  vloeren: FloorIcon,
  'bar-catering': CateringIcon,
  decoratie: DecorIcon,
  'geluid-licht-av': SoundIcon,
  verwarming: HeatIcon,
  'entertainment-kinderanimatie': FunIcon,
  sanitair: SanitationIcon,
  'podium-constructie': StageIcon,
  'accessoires-toebehoren': AccessoryIcon,
  // Older category ids, kept so nothing loses its icon.
  'meubilair-decoratie': FurnitureIcon,
  'catering-keuken': CateringIcon,
  'geluid-lichtdj': SoundIcon,
  'springkastelen-fun': FunIcon,
  'trouwfotografie-apparatuur': CameraIcon,
};

// Fallback on the visible name, most specific first.
const NAME_ICONS = [
  ['sanitair', SanitationIcon],
  ['podium', StageIcon],
  ['accessoire', AccessoryIcon],
  ['vloer', FloorIcon],
  ['verwarm', HeatIcon],
  ['entertainment', FunIcon],
  ['animatie', FunIcon],
  ['geluid', SoundIcon],
  ['av-techniek', SoundIcon],
  ['decor', DecorIcon],
  ['cater', CateringIcon],
  ['keuken', CateringIcon],
  ['bar', CateringIcon],
  ['meubel', FurnitureIcon],
  ['foto', CameraIcon],
  ['video', CameraIcon],
  ['tent', TentIcon],
];

/**
 * Resolve the pictogram for a category: by Console id, then by name.
 *
 * @param {string} id category id from Console
 * @param {string} [name] display name, used if the id is unknown
 * @returns {React.ComponentType|null}
 */
export const iconForCategory = (id, name = '') => {
  const byId = CATEGORY_ICONS[String(id || '').toLowerCase()];
  if (byId) {
    return byId;
  }
  const lowerName = String(name || '').toLowerCase();
  const match = NAME_ICONS.find(([needle]) => lowerName.includes(needle));
  return match ? match[1] : null;
};
