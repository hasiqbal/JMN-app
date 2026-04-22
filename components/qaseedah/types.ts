import type { NIGHT_PALETTE } from '@/constants/nightPalette';

export type NightPaletteType = typeof NIGHT_PALETTE;

export type ReadingMode = 'arabic' | 'translit' | 'translation' | 'urdu' | 'full' | 'custom';

export type LayerVisibility = {
  arabic: boolean;
  transliteration: boolean;
  english: boolean;
  urdu: boolean;
};

export type VerseLine = {
  heading: string;
  arabic: string;
  transliteration?: string;
  translation?: string;
  urdu_translation?: string;
};

export type QaseedahChapter = {
  id: string;
  chapter: string;
  entryTitle: string;
  lines: VerseLine[];
};

export type VerseRole = 'opening-chorus' | 'closing-chorus' | 'verse';
