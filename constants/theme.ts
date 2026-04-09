// Jami' Masjid Noorani — Design System (Green theme matching logo)
export const Colors = {
  // Brand — emerald green palette
  primary: '#4FE948',        // Primary green
  primaryLight: '#8FF28A',   // Complementary light tint
  primarySoft: '#ECFAEC',    // Soft tint for chips/cards
  accent: '#1B5E34',         // Dark forest green
  headerBg: '#4FE948',       // Header green

  // Surface
  background: '#F4FAF6',     // Light green-white
  surface: '#FFFFFF',
  surfaceAlt: '#F4FBF2',     // Light green tint
  border: '#CFE8CF',

  // Text
  textPrimary: '#0D2118',    // Deep dark green-black
  textSecondary: '#2C5F3A',
  textSubtle: '#7BAF92',
  textInverse: '#FFFFFF',

  // Semantic
  success: '#4FE948',
  warning: '#E9A840',
  error: '#C0392B',

  // Prayer time specific
  prayerActive: '#4FE948',
  prayerNext: '#9ED59B',
  prayerPassed: '#B0D4BC',
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
