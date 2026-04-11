/**
 * quranApiService.ts
 * Fetches Quranic content from api.quran.com v4.
 * Uses Indo-Pak (Nastaleeq-compatible) script for Arabic text.
 * No API key required for public content endpoints.
 */

export interface QuranAyah {
  number: number;
  numberInSurah: number;
  arabic: string;
  transliteration: string;
  translation: string;
}

/** A single line of text on a Mushaf page, with words composing the line */
export interface MushafLine {
  lineNumber: number;
  /** Concatenated Indo-Pak text for all words on this line */
  text: string;
  /** Whether this line is a Bismillah line */
  isBismillah: boolean;
  /** Whether this line is an ayah-end-only line (surah opening etc.) */
  isCentered: boolean;
}

export interface MushafPage {
  pageNumber: number;
  /** Juz number (1-30) */
  juzNumber: number;
  /** Manzil number (1-7) */
  manzilNumber: number;
  lines: MushafLine[];
  /** Verse numbers that start on this page */
  verseRange: [number, number];
  /** Verse objects for translation panel */
  verses: QuranAyahFull[];
}

export interface QuranAyahFull extends QuranAyah {
  pageNumber: number;
}

export interface QuranTranslationResource {
  id: number;
  name: string;
  translatedName?: string;
  languageName?: string;
  authorName?: string;
}

const URDU_TRANSLATOR_NAME_OVERRIDES: Record<number, string> = {
  819: 'مولانا وحید الدین خان',
};

const BASE_URL = 'https://api.quran.com/api/v4';
const TRANSLATION_ID = 131; // Saheeh International

async function fetchVersePage(
  surahNumber: number,
  apiPage: number,
  perPage: number
): Promise<any[]> {
  const url =
    `${BASE_URL}/verses/by_chapter/${surahNumber}` +
    `?words=true` +
    `&word_fields=text_indopak,transliteration,line_number,page_number,char_type_name` +
    `&per_page=${perPage}` +
    `&page=${apiPage}` +
    `&translations=${TRANSLATION_ID}` +
    `&fields=text_indopak,verse_number,verse_key,page_number,juz_number,manzil_number` +
    `&language=en`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`quran.com API error: ${res.status}`);
  const json = await res.json();
  return json?.verses ?? [];
}

/** Convert Western digit to Arabic-Indic digit */
function toArabicIndic(n: number): string {
  return n.toString().split('').map(d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]).join('');
}

/** Format an ayah-end marker as traditional ﴿١﴾ circle marker */
function ayahMarker(verseNumber: number): string {
  return `\u06DD${toArabicIndic(verseNumber)}`;
}

function buildTransliteration(words: any[]): string {
  return words
    .filter((w: any) => w.char_type_name === 'word' && w.transliteration?.text)
    .map((w: any) => w.transliteration.text)
    .join(' ');
}

function extractTranslation(verse: any): string {
  const translations: any[] = verse.translations ?? [];
  if (translations.length === 0) return '';
  return (translations[0]?.text ?? '').replace(/<[^>]+>/g, '').trim();
}

/** Fetch available translation resources from quran.com (defaults to English). */
export async function fetchTranslationResources(language = 'en'): Promise<QuranTranslationResource[]> {
  try {
    const url = `${BASE_URL}/resources/translations?language=${encodeURIComponent(language)}&per_page=100`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`quran.com API error: ${res.status}`);
    const json = await res.json();
    const rows: any[] = json?.translations ?? [];
    return rows
      .map((r: any) => {
        const preferredName = language === 'ur'
          ? (r.translated_name?.name ?? r.name ?? `Translation ${r.id}`)
          : (r.name ?? r.translated_name?.name ?? `Translation ${r.id}`);
        const translatedName = URDU_TRANSLATOR_NAME_OVERRIDES[Number(r.id)]
          ?? (r.translated_name?.name ? String(r.translated_name.name).replace(/<[^>]+>/g, '').trim() : undefined);
        return {
          id: Number(r.id),
          name: String(preferredName).replace(/<[^>]+>/g, '').trim(),
          translatedName,
          languageName: r.language_name ? String(r.language_name) : undefined,
          authorName: r.author_name ? String(r.author_name) : undefined,
        };
      })
      .filter((r) => Number.isFinite(r.id));
  } catch {
    return [];
  }
}

/**
 * Fetch chapter translation text keyed by verse number for a selected translation resource.
 */
export async function fetchChapterTranslationById(
  surahNumber: number,
  translationId: number,
  language = 'en',
): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  try {
    const PER_PAGE = 50;
    for (let page = 1; page <= 10; page += 1) {
      const url =
        `${BASE_URL}/verses/by_chapter/${surahNumber}` +
        `?per_page=${PER_PAGE}` +
        `&page=${page}` +
        `&translations=${translationId}` +
        `&fields=verse_number` +
        `&language=${encodeURIComponent(language)}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`quran.com API error: ${res.status}`);
      const json = await res.json();
      const verses: any[] = json?.verses ?? [];

      for (const v of verses) {
        const verseNumber = Number(v?.verse_number);
        if (!Number.isFinite(verseNumber)) continue;
        out[verseNumber] = (v?.translations?.[0]?.text ?? '').replace(/<[^>]+>/g, '').trim();
      }

      if (verses.length < PER_PAGE) break;
    }
    return out;
  } catch {
    return {};
  }
}

/** Fetch all raw verses for a surah, handling pagination */
async function fetchAllVerses(surahNumber: number): Promise<any[]> {
  const PER_PAGE = 50;
  const page1 = await fetchVersePage(surahNumber, 1, PER_PAGE);
  if (page1.length < PER_PAGE) return page1;

  const page2 = await fetchVersePage(surahNumber, 2, PER_PAGE);
  if (page2.length < PER_PAGE) return [...page1, ...page2];

  const page3 = await fetchVersePage(surahNumber, 3, PER_PAGE);
  if (page3.length < PER_PAGE) return [...page1, ...page2, ...page3];

  const page4 = await fetchVersePage(surahNumber, 4, PER_PAGE);
  if (page4.length < PER_PAGE) return [...page1, ...page2, ...page3, ...page4];

  const page5 = await fetchVersePage(surahNumber, 5, PER_PAGE);
  if (page5.length < PER_PAGE) return [...page1, ...page2, ...page3, ...page4, ...page5];

  const page6 = await fetchVersePage(surahNumber, 6, PER_PAGE);
  return [...page1, ...page2, ...page3, ...page4, ...page5, ...page6];
}

/**
 * Fetch all ayahs as flat array (original API for compatibility).
 */
export async function fetchSurah(surahNumber: number): Promise<QuranAyah[]> {
  try {
    const allVerses = await fetchAllVerses(surahNumber);
    return allVerses.map((v: any) => ({
      number: v.id,
      numberInSurah: v.verse_number,
      arabic: v.text_indopak ?? '',
      transliteration: buildTransliteration(v.words ?? []),
      translation: extractTranslation(v),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch surah as authentic Mushaf pages.
 * Groups word-level data by Mushaf page number → line number.
 * Each page has exactly the lines from the actual printed Mushaf.
 */
export async function fetchSurahPages(surahNumber: number): Promise<MushafPage[]> {
  try {
    const allVerses = await fetchAllVerses(surahNumber);
    if (allVerses.length === 0) return [];

    // ── Step 1: Collect all words with page/line metadata ──────────────
    interface WordEntry {
      pageNumber: number;
      lineNumber: number;
      text: string;
      charType: string;
      verseNumber: number;
      juzNumber: number;
      manzilNumber: number;
    }

    const allWords: WordEntry[] = [];

    for (const verse of allVerses) {
      const words: any[] = verse.words ?? [];
      for (const w of words) {
        const charType = w.char_type_name ?? 'word';
        // Replace end-of-ayah marker with traditional ﴿١﴾ Unicode format
        const text =
          charType === 'end'
            ? ayahMarker(verse.verse_number)
            : (w.text_indopak ?? '');
        allWords.push({
          pageNumber: w.page_number ?? verse.page_number ?? 0,
          lineNumber: w.line_number ?? 1,
          text,
          charType,
          verseNumber: verse.verse_number,
          juzNumber: verse.juz_number ?? 0,
          manzilNumber: verse.manzil_number ?? 0,
        });
      }
    }

    // ── Step 2: Group by page → line ───────────────────────────────────
    const pageMap = new Map<number, Map<number, WordEntry[]>>();

    for (const word of allWords) {
      if (!pageMap.has(word.pageNumber)) {
        pageMap.set(word.pageNumber, new Map());
      }
      const lineMap = pageMap.get(word.pageNumber)!;
      if (!lineMap.has(word.lineNumber)) {
        lineMap.set(word.lineNumber, []);
      }
      lineMap.get(word.lineNumber)!.push(word);
    }

    // ── Step 3: Build verse lookup for translations ────────────────────
    const verseLookup = new Map<number, any>();
    for (const v of allVerses) {
      verseLookup.set(v.verse_number, v);
    }

    // ── Step 4: Assemble MushafPage objects ────────────────────────────
    const mushafPages: MushafPage[] = [];
    const sortedPageNums = Array.from(pageMap.keys()).sort((a, b) => a - b);

    for (const pageNum of sortedPageNums) {
      const lineMap = pageMap.get(pageNum)!;
      const sortedLineNums = Array.from(lineMap.keys()).sort((a, b) => a - b);

      // Get juz/manzil from the first word on this page
      const firstWords = lineMap.get(sortedLineNums[0])!;
      const juzNumber = firstWords[0]?.juzNumber ?? 0;
      const manzilNumber = firstWords[0]?.manzilNumber ?? 0;

      // Collect verse numbers on this page
      const verseNums = new Set<number>();
      for (const words of lineMap.values()) {
        for (const w of words) {
          if (w.charType === 'word') verseNums.add(w.verseNumber);
        }
      }
      const sortedVerseNums = Array.from(verseNums).sort((a, b) => a - b);
      const verseRange: [number, number] = [
        sortedVerseNums[0] ?? 0,
        sortedVerseNums[sortedVerseNums.length - 1] ?? 0,
      ];

      // Build lines
      const lines: MushafLine[] = sortedLineNums.map((lineNum) => {
        const words = lineMap.get(lineNum)!;
        // Concatenate all word texts — they already include ayah markers
        const text = words.map((w) => w.text).join(' ').trim();

        // Detect Bismillah line (first line of surah)
        const isBismillah =
          text.includes('بِسۡمِ') ||
          text.includes('بِسْمِ') ||
          text.includes('ﰈ'); // QPC font bismillah glyph

        // Detect centered lines — typically first 1-2 lines of surah (surah name, bismillah)
        // or lines with very few words
        const wordCount = words.filter((w) => w.charType === 'word').length;
        const isCentered = isBismillah || wordCount <= 2;

        return {
          lineNumber: lineNum,
          text,
          isBismillah,
          isCentered,
        };
      });

      // Full verse objects for translation panel
      const verses: QuranAyahFull[] = sortedVerseNums
        .map((vn) => {
          const v = verseLookup.get(vn);
          if (!v) return null;
          return {
            number: v.id,
            numberInSurah: v.verse_number,
            arabic: v.text_indopak ?? '',
            transliteration: buildTransliteration(v.words ?? []),
            translation: extractTranslation(v),
            pageNumber: pageNum,
          } as QuranAyahFull;
        })
        .filter(Boolean) as QuranAyahFull[];

      mushafPages.push({
        pageNumber: pageNum,
        juzNumber,
        manzilNumber,
        lines,
        verseRange,
        verses,
      });
    }

    return mushafPages;
  } catch {
    return [];
  }
}
