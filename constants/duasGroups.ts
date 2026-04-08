import type { AdhkarSelection } from '@/types/duasTypes';

function normalizeGroupRouteKey(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\b(al|as|ar|ad|an|ash|at|az)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveGroupSelection(
  routeMap: Record<string, AdhkarSelection>,
  groupName: string | null | undefined
): AdhkarSelection | undefined {
  if (!groupName) return undefined;

  const directMatch = routeMap[groupName];
  if (directMatch) return directMatch;

  const normalizedInput = normalizeGroupRouteKey(groupName);
  for (const [key, value] of Object.entries(routeMap)) {
    if (normalizeGroupRouteKey(key) === normalizedInput) {
      return value;
    }
  }

  const fuzzySelection = resolveFuzzySurahSelection(normalizedInput);
  if (fuzzySelection && Object.values(routeMap).includes(fuzzySelection)) {
    return fuzzySelection;
  }

  return undefined;
}

function resolveFuzzySurahSelection(normalizedInput: string): AdhkarSelection | undefined {
  const compactInput = normalizedInput.replace(/\s+/g, '');

  if (/(kahf|kaaf|kahaf|kahff|kahef|kafh|khaf|khf)/.test(compactInput)) {
    return 'kahf-mushaf';
  }

  if (/(yaseen|yasin|yasean|yaseenh|yasinsharif|yasinshareef|yaseensharif|yaseenshareef|yasin|yasin|yaseen)/.test(compactInput)) {
    return 'yaseen';
  }

  if (/(waqiah|waqia|waqea|waqeah|wakia)/.test(compactInput)) {
    return 'waqiah';
  }

  if (/(sajdah|sajda|sajadah|sujdah)/.test(compactInput)) {
    return 'sajdah-mushaf';
  }

  if (/(mulk)/.test(compactInput)) {
    return 'mulk-mushaf';
  }

  return undefined;
}

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
  'Surah 36': 'yaseen',
  'Surah 36 - Ya Seen': 'yaseen',
  'Surah Yaseen (36)': 'yaseen',
  'Surah Yasin (36)': 'yaseen',
  'Surah Al-Yaseen': 'yaseen',
  'Surah Al Yaseen': 'yaseen',
  'Surah Ya Seen': 'yaseen',
  'Surah Ya-Sin': 'yaseen',
  'Surah Ya Sin': 'yaseen',
  'Surah Yā Sīn': 'yaseen',
  'Surah Yasin': 'yaseen',
  'Surah Yaasin': 'yaseen',
  'Surah Yaseen Sharif': 'yaseen',
  'Surah Yaseen Shareef': 'yaseen',
  'Surah Yasin Sharif': 'yaseen',
  'Surah Yasin Shareef': 'yaseen',
  'Surah Yaseen شریف': 'yaseen',
  'سورة يس': 'yaseen',
  'Surah Yaseenh': 'yaseen',
  'Surah Yasean': 'yaseen',
  'Sura Yaseen': 'yaseen',
  'Sura Yasin': 'yaseen',
  'Surat Yaseen': 'yaseen',
  'Surat Yasin': 'yaseen',
  'Yaseen': 'yaseen',
  'Ya Seen': 'yaseen',
  'Ya Sin': 'yaseen',
  'Yasin': 'yaseen',
  'Yaasin': 'yaseen',
};

// Click routing for After Dhuhr cards
// Leave empty for DB-default behavior; add entries only for custom screens.
export const DHUHR_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  // 'Example Group Name': 'selection-key',
};

// Click routing for After Jumu'ah cards
export const JUMUAH_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  'Surah Al-Kahf': 'kahf-mushaf',
  'Surah Kahf': 'kahf-mushaf',
  'Surah Al Kahf': 'kahf-mushaf',
  'Surah Khf': 'kahf-mushaf',
  'Surah Kaaf': 'kahf-mushaf',
  'Surah Al-Kaaf': 'kahf-mushaf',
  'Surah Al Kaaf': 'kahf-mushaf',
  'Surah Kahaf': 'kahf-mushaf',
  'Surah Kafh': 'kahf-mushaf',
  'Surah Kahf Sharif': 'kahf-mushaf',
  'Surah Kahf Shareef': 'kahf-mushaf',
  'Surah Kahff': 'kahf-mushaf',
  'Surah Kahafh': 'kahf-mushaf',
  'Surah Kahef': 'kahf-mushaf',
  'Surah Khaf': 'kahf-mushaf',
  'Sura Kahf': 'kahf-mushaf',
  'Surat Kahf': 'kahf-mushaf',
  'Kahf': 'kahf-mushaf',
  'Al Kahf': 'kahf-mushaf',
};

// Click routing for After Asr cards
export const ASR_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  'Surah Al-Waqiah': 'waqiah',
  'Surah Al Waqiah': 'waqiah',
  'Surah Al-Waqia': 'waqiah',
  'Surah Al Waqia': 'waqiah',
  'Surah Waqiah': 'waqiah',
  'Surah Waqia': 'waqiah',
  'Surah Waqea': 'waqiah',
  'Surah Waqi ah': 'waqiah',
  'Surah Waqi-ah': 'waqiah',
  'Surah Waqiah Sharif': 'waqiah',
  'Surah Waqiah Shareef': 'waqiah',
  'Surah Waqeah': 'waqiah',
  'Surah Wakia': 'waqiah',
  'Sura Waqiah': 'waqiah',
  'Sura Waqia': 'waqiah',
  'Surat Waqiah': 'waqiah',
  'Surat Waqia': 'waqiah',
  'Waqiah': 'waqiah',
  'Waqia': 'waqiah',
  'Al Waqiah': 'waqiah',
  'Al-Waqiah': 'waqiah',
};

// Click routing for After Maghrib cards
// Leave empty for DB-default behavior; add entries only for custom screens.
export const MAGHRIB_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  // 'Example Group Name': 'selection-key',
};

// Click routing for After Isha cards
export const ISHA_GROUP_TO_SELECTION: Record<string, AdhkarSelection> = {
  'Surah As-Sajdah': 'sajdah-mushaf',
  'Surah As Sajdah': 'sajdah-mushaf',
  'Surah As-Sajda': 'sajdah-mushaf',
  'Surah As Sajda': 'sajdah-mushaf',
  'Surah Sajdah': 'sajdah-mushaf',
  'Surah Sajda': 'sajdah-mushaf',
  'Surah Al-Sajdah': 'sajdah-mushaf',
  'Surah Al Sajdah': 'sajdah-mushaf',
  'Surah Sajdah Sharif': 'sajdah-mushaf',
  'Surah Sajda Sharif': 'sajdah-mushaf',
  'Surah Sajdah Shareef': 'sajdah-mushaf',
  'Surah Sajda Shareef': 'sajdah-mushaf',
  'Surah Sajadah': 'sajdah-mushaf',
  'Surah Sujdah': 'sajdah-mushaf',
  'Sura Sajdah': 'sajdah-mushaf',
  'Sura Sajda': 'sajdah-mushaf',
  'Surat Sajdah': 'sajdah-mushaf',
  'Surat Sajda': 'sajdah-mushaf',
  'Sajdah': 'sajdah-mushaf',
  'Sajda': 'sajdah-mushaf',
  'Surah Al-Mulk': 'mulk-mushaf',
  'Surah Al Mulk': 'mulk-mushaf',
  'Surah Mulk': 'mulk-mushaf',
  'Surah Mulk Sharif': 'mulk-mushaf',
  'Surah Mulk Shareef': 'mulk-mushaf',
  'Surah Al-Mulk Sharif': 'mulk-mushaf',
  'Surah Al Mulk Sharif': 'mulk-mushaf',
  'Sura Mulk': 'mulk-mushaf',
  'Surat Mulk': 'mulk-mushaf',
  'Mulk': 'mulk-mushaf',
  'Al Mulk': 'mulk-mushaf',
  'Al-Mulk': 'mulk-mushaf',
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

