import React from 'react';
import { Tent, Table2, Flame, Speaker, Castle, Camera } from 'lucide-react';

// Category quick-nav chip icons, keyed by the category id as configured in
// Console (Build > Content > Categories). Real lucide-react components
// (not hand-drawn approximations) for crisp, consistent line icons. An id
// with no match here just renders the chip without an icon (see
// CategoryQuickNav in SearchPageWithGrid.js) rather than breaking.
const ICON_SIZE = 20;
const ICON_STROKE_WIDTH = 1.75;

const TentIcon = () => <Tent size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />;
const FurnitureIcon = () => <Table2 size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />;
const CateringIcon = () => <Flame size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />;
const SoundIcon = () => <Speaker size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />;
const FunIcon = () => <Castle size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />;
const CameraIcon = () => <Camera size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />;

export const CATEGORY_ICONS = {
  'tent-structuren': TentIcon,
  'Meubilair-Decoratie': FurnitureIcon,
  'Catering-Keuken': CateringIcon,
  'Geluid-Lichtdj': SoundIcon,
  'Springkastelen-Fun': FunIcon,
  'Trouwfotografie-apparatuur': CameraIcon,
};
