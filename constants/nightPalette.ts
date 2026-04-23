/**
 * nightPalette.ts
 * Shared night-mode colour tokens used across Adhkar and Prayer screens.
 */

export const NIGHT_PALETTE = {
  bg:         '#06090F',
  surface:    '#0C1220',
  surfaceAlt: '#111C32',
  surfaceElevated: '#10182C', // devotional modal surface for night mode
  border:     '#1B2E4A',
  text:       '#EEF3FC',
  textSub:    '#93B4D8',
  textMuted:  '#5A7A9E',
  accent:     '#6AAEFF',
  primary:    '#4FE948',
  primarySoft:'#A4F2A0',
  primaryGlow:'rgba(79,233,72,0.16)',
  chip:       '#0A1A35',

  // Spiritual accents — warmer muted gold reads well against deep navy.
  gold:       '#E6C270',
  goldSoft:   'rgba(230, 194, 112, 0.18)',
  goldInk:    '#E6C270',
  goldHairline: 'rgba(230, 194, 112, 0.32)',

  // Rich-text highlight.
  highlight:  'rgba(250, 204, 21, 0.22)',
  highlightInk: '#FDE68A',

  // Chorus accent.
  chorusBg:   'rgba(106, 174, 255, 0.08)',

  // Type tints.
  qaseedahChip: 'rgba(52, 211, 153, 0.18)',
  qaseedahInk:  '#6EE7B7',
  naatChip:     'rgba(125, 211, 252, 0.18)',
  naatInk:      '#93C5FD',
} as const;

export type NightPalette = typeof NIGHT_PALETTE;
