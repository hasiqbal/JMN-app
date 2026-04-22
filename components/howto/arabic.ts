// Shared Arabic / transliteration utilities for the guide rendering system.
//
// All Arabic-aware rendering in the How-To system should go through these helpers so that
// detection and transliteration stay consistent across recitation blocks, notes, and inline text.

export const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
export const ARABIC_SEGMENT_REGEX = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u0640\u064B-\u065F\u0670\u06D6-\u06ED]*)/g;
export const ARABIC_SEGMENT_MATCH_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u0640\u064B-\u065F\u0670\u06D6-\u06ED]*/g;

const ARABIC_TO_LATIN: Record<string, string> = {
  ا: 'a', أ: 'a', إ: 'i', آ: 'aa', ٱ: 'a', ء: "'", ؤ: "'u", ئ: "'i",
  ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh', د: 'd', ذ: 'dh', ر: 'r',
  ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: "'", غ: 'gh',
  ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', ة: 'h', و: 'w', ي: 'y',
  ى: 'a', ـ: '',
};

const TASHKEEL_TO_LATIN: Record<string, string> = {
  '\u064B': 'an',
  '\u064C': 'un',
  '\u064D': 'in',
  '\u064E': 'a',
  '\u064F': 'u',
  '\u0650': 'i',
  '\u0652': '',
  '\u0670': 'a',
};

export const hasArabic = (text: string) => ARABIC_CHAR_REGEX.test(text);

export const stripArabicDiacritics = (text: string) =>
  text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');

const extractArabicSegments = (text: string) => {
  const matches = text.match(ARABIC_SEGMENT_MATCH_REGEX) ?? [];
  return matches.map((m) => m.trim()).filter(Boolean);
};

const transliterateArabic = (text: string) => {
  const normalizedArabic = stripArabicDiacritics(text).replace(/\s+/g, ' ').trim();
  if (normalizedArabic === 'الله أكبر' || normalizedArabic === 'الله اكبر') {
    return 'allahu akbar';
  }

  let out = '';
  let prevLatin = '';

  for (const ch of Array.from(text)) {
    if (ch === 'ّ') {
      out += prevLatin;
      continue;
    }

    if (ch === ' ') {
      out += ' ';
      prevLatin = '';
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(TASHKEEL_TO_LATIN, ch)) {
      out += TASHKEEL_TO_LATIN[ch] ?? '';
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(ARABIC_TO_LATIN, ch)) {
      const latin = ARABIC_TO_LATIN[ch] ?? '';
      out += latin;
      prevLatin = latin;
      continue;
    }

    if (/[.,;:!?()\[\]{}"'\-]/.test(ch)) {
      out += ch;
      continue;
    }
  }

  return out.replace(/\s+/g, ' ').trim();
};

export const transliterationFromText = (text: string): string | null => {
  const segments = extractArabicSegments(text);
  const translits = segments.map((segment) => transliterateArabic(segment)).filter(Boolean);
  if (translits.length === 0) return null;
  return translits.join(' | ');
};

const hasRecitationLikeArabicDensity = (sourceText: string) => {
  const compact = sourceText.replace(/\s+/g, ' ').trim();
  if (!compact) return false;

  // Explicit labeled recitation content should keep transliteration enabled.
  if (/(^|\n)\s*(dua|arabic|transliteration|translation)\s*:/i.test(compact)) {
    return true;
  }

  const arabicSegments = extractArabicSegments(compact);
  if (arabicSegments.length === 0) return false;

  const arabicChars = arabicSegments.join('').replace(/\s+/g, '').length;
  const totalChars = compact.replace(/\s+/g, '').length;
  const arabicWords = arabicSegments
    .flatMap((segment) => segment.split(/\s+/))
    .filter(Boolean).length;

  const arabicRatio = totalChars > 0 ? arabicChars / totalChars : 0;

  // Show transliteration for recitation-like text, not for tiny inline Arabic snippets.
  return arabicRatio >= 0.35 || arabicChars >= 18 || arabicWords >= 3;
};

const normalizeLatin = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** True when the source text already contains a manual transliteration matching the auto one. */
export const hasManualTransliteration = (sourceText: string, autoTransliteration: string | null) => {
  if (!autoTransliteration) return false;
  if (/transliteration\s*:/i.test(sourceText)) return true;

  const sourceLatin = normalizeLatin(sourceText.replace(ARABIC_SEGMENT_MATCH_REGEX, ' '));
  const translitLatin = normalizeLatin(autoTransliteration);
  if (!sourceLatin || !translitLatin) return false;

  const sourceTokens = new Set(sourceLatin.split(' ').filter((token) => token.length > 1));
  const translitTokens = translitLatin.split(' ').filter((token) => token.length > 1);

  if (translitTokens.length < 3) {
    return sourceLatin.includes(translitLatin);
  }

  const overlapCount = translitTokens.filter((token) => sourceTokens.has(token)).length;
  return overlapCount >= Math.min(6, Math.ceil(translitTokens.length * 0.45));
};

export const shouldRenderAutoTransliteration = (
  sourceText: string,
  autoTransliteration: string | null,
) => (
  Boolean(autoTransliteration)
  && hasRecitationLikeArabicDensity(sourceText)
  && !hasManualTransliteration(sourceText, autoTransliteration)
);
