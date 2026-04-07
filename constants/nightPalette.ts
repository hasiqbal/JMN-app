/**
 * nightPalette.ts
 * Shared night-mode colour tokens used across Adhkar and Prayer screens.
 */

export const NIGHT_PALETTE = {
  bg:         '#06090F',
  surface:    '#0C1220',
  surfaceAlt: '#111C32',
  border:     '#1B2E4A',
  text:       '#EEF3FC',
  textSub:    '#93B4D8',
  textMuted:  '#5A7A9E',
  accent:     '#6AAEFF',
  primary:    '#4DCF88',
  chip:       '#0A1A35',
} as const;

export type NightPalette = typeof NIGHT_PALETTE;
