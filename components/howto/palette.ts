import { Colors } from '@/constants/theme';

/**
 * Shared palette for the How-To / guide content system.
 *
 * Two parallel tokens: `light` and `night`. Consumers pass `nightMode: boolean` and pick the
 * matching set. Keeping both in one file means every guide component agrees on the exact
 * colors, spacing, and type scale so the whole guide system looks unified.
 */

export const GUIDE_NIGHT_PALETTE = {
  bg: '#06090F',
  surface: '#0C1220',
  surfaceAlt: '#111C32',
  border: '#1B2E4A',
  text: '#EEF3FC',
  textSub: '#93B4D8',
  textMuted: '#5A7A9E',
  accent: '#6AAEFF',
  primary: '#4FE948',
} as const;

export type GuideNightPalette = typeof GUIDE_NIGHT_PALETTE;

export const GUIDE_LIGHT_PALETTE = {
  bg: Colors.background,
  surface: '#FFFFFF',
  surfaceAlt: '#F3F5F9',
  border: '#D8DEE7',
  text: Colors.textPrimary,
  textSub: Colors.textSecondary,
  textMuted: Colors.textSubtle,
  accent: '#4A6A8A',
} as const;

export const pickPalette = (nightMode: boolean) =>
  (nightMode ? GUIDE_NIGHT_PALETTE : GUIDE_LIGHT_PALETTE) as typeof GUIDE_NIGHT_PALETTE;

/** Type scale specific to the guide system. Kept separate from global theme to avoid churn. */
export const GuideType = {
  arabicSize: 30,
  arabicLineHeight: 46,
  arabicInlineSize: 23,
  arabicInlineLineHeight: 36,
  transliterationSize: 13,
  transliterationLineHeight: 21,
  meaningSize: 13.5,
  meaningLineHeight: 21,
  bodySize: 13,
  bodyLineHeight: 20,
  labelSize: 10.5,
  labelLetterSpacing: 1.2,
} as const;
