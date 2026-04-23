export const Colors = {
  // Brand
  primary: '#3FAE5A',
  primaryLight: '#6FC285',
  primarySoft: '#E6F4EA',
  accent: '#3FAE5A',
  headerBg: '#F5F7F5',

  // Surface
  background: '#F5F7F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F7F3',
  surfaceElevated: '#FBF8F1', // cream parchment for devotional modals/cards
  border: '#E3E8E4',

  // Text
  textPrimary: '#1F2A24',
  textSecondary: '#6B7A72',
  textSubtle: '#9AA09A',
  textInverse: '#FFFFFF',

  // Semantic
  success: '#3FAE5A',
  warning: '#E9A840',
  error: '#C0392B',

  // Prayer time specific
  prayerActive: '#3FAE5A',
  prayerNext: '#E6F4EA',
  prayerPassed: '#E3E8E4',

  // Devotional / spiritual accents — used for Qaseedah & Naat ornaments,
  // chorus labels, modal chrome, and the "illuminated" feel throughout the
  // devotional reader. Deliberately kept out of CTAs so the signal stays sacred.
  gold: '#B8860B',
  goldSoft: '#F3E6B8',
  goldInk: '#8A6A1F',
  goldHairline: 'rgba(184, 134, 11, 0.28)',

  // Rich-text highlight (portal ==highlight== spans).
  highlight: '#FEF3C7',
  highlightInk: '#78350F',

  // Chorus / verse accents.
  chorusBg: '#F4FAF6',

  // Type tint tokens for qaseedah vs naat badges & rails.
  qaseedahChip: '#DCFCE7',
  qaseedahInk: '#0F766E',
  qaseedahInkDark: '#12713B',
  naatChip: '#E0F2FE',
  naatInk: '#0369A1',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Typography = {
  displayLarge: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  displayMedium: { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  titleLarge: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  titleMedium: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  titleSmall: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 26 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
  labelLarge: { fontSize: 14, fontWeight: '600' as const },
  labelMedium: { fontSize: 12, fontWeight: '600' as const },
  arabic: { fontSize: 22, fontWeight: '400' as const, lineHeight: 38 },
};
