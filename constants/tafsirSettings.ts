export type TafsirScaleByLanguage = {
  en: number;
  ur: number;
};

export const TAFSIR_FONT_MIN = 0.85;
export const TAFSIR_FONT_MAX = 1.45;
export const TAFSIR_FONT_STEP = 0.1;
export const TAFSIR_FONT_SCALE_STORAGE_KEY = '@quran_tafsir_font_scale_by_lang_v1';

export function clampTafsirScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(TAFSIR_FONT_MAX, Math.max(TAFSIR_FONT_MIN, Number(value.toFixed(2))));
}
