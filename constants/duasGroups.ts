import type { AdhkarSelection } from '@/types/duasTypes';

// ════════════════════════════════════════════════════════════════════════════════
// GROUP ROUTING MAPS — BEFORE PRAYER
// ════════════════════════════════════════════════════════════════════════════════

// Click routing for Before Fajr cards
// Leave empty for DB-default behavior; add entries only for custom screens.
export const BEFORE_FAJR_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  // 'Example Group Name': 'selection-key',
};

// ════════════════════════════════════════════════════════════════════════════════
// GROUP ROUTING MAPS — AFTER PRAYER
// ════════════════════════════════════════════════════════════════════════════════

// Click routing for After Fajr cards: DB group name -> app selection key
export const FAJR_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  'Surah Yaseen': 'yaseen',
};

// Click routing for After Dhuhr cards
// Leave empty for DB-default behavior; add entries only for custom screens.
export const DHUHR_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  // 'Example Group Name': 'selection-key',
};

// Click routing for After Jumu'ah cards
export const JUMUAH_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  'Surah Al-Kahf': 'kahf-mushaf',
};

// Click routing for After Asr cards
export const ASR_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  'Surah Al-Waqiah': 'waqiah',
};

// Click routing for After Maghrib cards
// Leave empty for DB-default behavior; add entries only for custom screens.
export const MAGHRIB_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  // 'Example Group Name': 'selection-key',
};

// Click routing for After Isha cards
export const ISHA_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  'Surah As-Sajdah': 'sajdah-mushaf',
  'Surah Al-Mulk': 'mulk-mushaf',
};

// Optional card visuals for known After Fajr groups
export const KNOWN_FAJR_GROUPS: Record<
  string,
  {
    icon: string;
    color: string;
    badge: string;
  }
> = {};
// Optional card visuals for known Before Fajr groups
export const KNOWN_BEFORE_FAJR_GROUPS: Record<
  string,
  {
    icon: string;
    color: string;
    badge: string;
  }
> = {};
// Optional card visuals for known After Dhuhr groups
export const KNOWN_DHUHR_GROUPS: Record<string, { icon: string; color: string; badge: string }> = {};

// Fallback colors for After Dhuhr cards
export const DEFAULT_COLORS_DHUHR = [
  '#0A5C9E',
  '#1B8A5A',
  '#3949AB',
  '#00695C',
  '#E65100',
  '#6A1B9A',
  '#B8860B',
];

// Optional card visuals for known After Jumu'ah groups
export const KNOWN_JUMUAH_GROUPS: Record<
  string,
  {
    icon: string;
    color: string;
    badge: string;
  }
> = {};

// Optional card visuals for known After Asr groups
export const KNOWN_ASR_GROUPS: Record<
  string,
  {
    icon: string;
    color: string;
    badge: string;
  }
> = {};

// Optional card visuals for known After Maghrib groups
export const KNOWN_MAGHRIB_GROUPS: Record<
  string,
  {
    icon: string;
    color: string;
    badge: string;
  }
> = {};

// Optional card visuals for known After Isha groups
export const KNOWN_ISHA_GROUPS: Record<
  string,
  {
    icon: string;
    color: string;
    badge: string;
  }
> = {};



// Fallback colors for Before Fajr cards
export const DEFAULT_COLORS_BEFORE_FAJR = [
  '#3949AB',
  '#1B8A5A',
  '#6A1B9A',
  '#1565C0',
  '#E65100',
  '#B8860B',
  '#00695C',
];


// Fallback colors for After Fajr cards without KNOWN_FAJR_GROUPS metadata
export const DEFAULT_COLORS = [
  '#1B8A5A',
  '#3949AB',
  '#00695C',
  '#E65100',
  '#1565C0',
  '#6A1B9A',
  '#B8860B',
];


// Fallback colors for After Jumu'ah cards
export const DEFAULT_COLORS_JUMUAH = [
  '#B8860B',
  '#1B8A5A',
  '#3949AB',
  '#E65100',
  '#6A1B9A',
  '#1565C0',
  '#00695C',
];

// Fallback colors for After Asr cards
export const DEFAULT_COLORS_ASR = [
  '#E65100',
  '#1565C0',
  '#6A1B9A',
  '#1B8A5A',
  '#3949AB',
  '#B8860B',
  '#00695C',
];

// Fallback colors for After Maghrib cards
export const DEFAULT_COLORS_MAGHRIB = [
  '#6A1B9A',
  '#AD1457',
  '#1565C0',
  '#1B8A5A',
  '#E65100',
  '#3949AB',
  '#B8860B',
];

// Fallback colors for After Isha cards
export const DEFAULT_COLORS_ISHA = [
  '#1565C0',
  '#3949AB',
  '#6A1B9A',
  '#1B8A5A',
  '#00695C',
  '#AD1457',
  '#B8860B',
];

