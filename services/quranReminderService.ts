const FETCH_TIMEOUT_MS = 10000;
const CACHE_KEY = '@daily_quran_v5';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const BASE_URL = 'https://api.quran.com/api/v4';
const DEFAULT_TRANSLATION_IDS = [20, 131]; // Sahih International primary, fallback to legacy id
const TOTAL_MUSHAF_PAGES = 604;

// Verse restrictions for the daily reminder.
// Empty arrays mean "no restriction".
const INCLUDED_SURAHS: number[] = [];
const EXCLUDED_SURAHS: number[] = [];
const EXCLUDED_AYAH_RANGES: Array<{ surah: number; from: number; to: number }> = [];

// Preferred reminder themes requested by content policy.
const THEME_KEYWORDS: string[] = [
  // Faith and belief
  'believe', 'belief', 'faith', 'iman', 'righteous', 'piety', 'taqwa',
  // Character and conduct
  'patience', 'patient', 'truthful', 'truth', 'justice', 'forgive', 'forgiveness',
  'mercy', 'kindness', 'charity', 'humble', 'humility', 'good deeds',
  // Warnings from Allah
  'warning', 'warn', 'punishment', 'torment', 'hell', 'hellfire', 'fire',
  'disbelieve', 'disbelievers', 'hypocrite', 'hypocrites',
  // Day of Judgment / Akhirah
  'day of judgment', 'day of resurrection', 'last day', 'the hour',
  'account', 'reckoning', 'hereafter',
];

// Context behavior: on some days, include nearby verses in the full text.
const INCLUDE_CONTEXT_EVERY_N_DAYS = 3;
const CONTEXT_BEFORE_VERSES = 1;
const CONTEXT_AFTER_VERSES = 1;

type CachePayload = {
  updatedAt: number;
  dayStamp: string;
  data: DailyQuranResult;
};

let memoryCache: CachePayload | null = null;

export type DailyQuranResult = {
  arabic: string;
  englishTranslation: string;
  text: string;
  preview: string;
  ref: string;
  verseKey: string;
  pageNumber: number;
  juzNumber: number;
  surahNumber: number;
  verseNumber: number;
  contextVerseKeys: string[];
};

type ChapterVerse = {
  verseNumber: number;
  verseKey: string;
  arabic: string;
  english: string;
};

function stripHtml(value: string): string {
  return value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForThemeMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesPreferredTheme(englishText: string): boolean {
  const normalized = normalizeForThemeMatch(englishText);
  if (!normalized) return false;

  return THEME_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function formatContextVerseBlock(rows: ChapterVerse[]): string {
  return rows
    .map((row) => [row.verseKey, row.arabic, row.english].filter(Boolean).join('\n'))
    .join('\n\n');
}

function getLocalDayStamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayOfYearLocal(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

function shouldIncludeVerse(surahNumber: number, verseNumber: number): boolean {
  if (INCLUDED_SURAHS.length > 0 && !INCLUDED_SURAHS.includes(surahNumber)) {
    return false;
  }

  if (EXCLUDED_SURAHS.includes(surahNumber)) {
    return false;
  }

  for (const range of EXCLUDED_AYAH_RANGES) {
    if (
      range.surah === surahNumber
      && verseNumber >= range.from
      && verseNumber <= range.to
    ) {
      return false;
    }
  }

  return true;
}

async function readCache(): Promise<DailyQuranResult | null> {
  const todayStamp = getLocalDayStamp();
  if (
    memoryCache
    && memoryCache.dayStamp === todayStamp
    && Date.now() - memoryCache.updatedAt < CACHE_TTL_MS
  ) {
    return memoryCache.data;
  }

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as Partial<CachePayload>;
    if (
      payload?.data
      && payload.dayStamp === todayStamp
      && typeof payload.updatedAt === 'number'
      && Date.now() - payload.updatedAt < CACHE_TTL_MS
    ) {
      const normalizedPayload: CachePayload = {
        updatedAt: payload.updatedAt,
        dayStamp: payload.dayStamp,
        data: payload.data,
      };
      memoryCache = normalizedPayload;
      return normalizedPayload.data;
    }
  } catch {
    // ignore cache read issues
  }

  return null;
}

async function writeCache(data: DailyQuranResult): Promise<void> {
  const payload: CachePayload = {
    updatedAt: Date.now(),
    dayStamp: getLocalDayStamp(),
    data,
  };
  memoryCache = payload;

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache write issues
  }
}

async function fetchJson(url: string, signal: AbortSignal): Promise<any> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`quran.com API error: ${res.status}`);
  }
  return await res.json();
}

async function fetchTranslationForVerse(
  surahNumber: number,
  verseKey: string,
  signal: AbortSignal,
): Promise<string> {
  for (const translationId of DEFAULT_TRANSLATION_IDS) {
    const perPage = 50;
    for (let page = 1; page <= 12; page += 1) {
      const url =
        `${BASE_URL}/verses/by_chapter/${surahNumber}` +
        `?per_page=${perPage}` +
        `&page=${page}` +
        `&translations=${translationId}` +
        `&fields=verse_key,verse_number` +
        `&language=en`;

      const data = await fetchJson(url, signal);
      const verses: any[] = data?.verses ?? [];

      const hit = verses.find((v) => String(v?.verse_key ?? '') === verseKey);
      if (hit) {
        const translated = stripHtml(String(hit?.translations?.[0]?.text ?? ''));
        if (translated) return translated;
      }

      if (verses.length < perPage) break;
    }
  }

  return '';
}

async function fetchChapterVerseMap(
  surahNumber: number,
  signal: AbortSignal,
): Promise<Map<number, ChapterVerse>> {
  for (const translationId of DEFAULT_TRANSLATION_IDS) {
    const result = new Map<number, ChapterVerse>();
    const perPage = 50;

    for (let page = 1; page <= 12; page += 1) {
      const url =
        `${BASE_URL}/verses/by_chapter/${surahNumber}` +
        `?per_page=${perPage}` +
        `&page=${page}` +
        `&translations=${translationId}` +
        `&fields=verse_key,verse_number,text_uthmani` +
        `&language=en`;

      const data = await fetchJson(url, signal);
      const verses: any[] = data?.verses ?? [];

      for (const verse of verses) {
        const verseNumber = Number(verse?.verse_number);
        if (!Number.isFinite(verseNumber)) continue;

        const verseKey = String(verse?.verse_key ?? `${surahNumber}:${verseNumber}`);
        const arabic = String(verse?.text_uthmani ?? '').trim();
        const english = stripHtml(String(verse?.translations?.[0]?.text ?? ''));

        result.set(verseNumber, {
          verseNumber,
          verseKey,
          arabic,
          english,
        });
      }

      if (verses.length < perPage) break;
    }

    if (result.size > 0) {
      return result;
    }
  }

  return new Map<number, ChapterVerse>();
}

export async function fetchDailyQuranReminder(): Promise<DailyQuranResult | null> {
  const cached = await readCache();
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const day = Math.max(1, dayOfYearLocal());
    const pageNumber = ((day - 1) % TOTAL_MUSHAF_PAGES) + 1;

    const versesUrl =
      `${BASE_URL}/verses/by_page/${pageNumber}` +
      `?per_page=50` +
      `&page=1` +
      `&fields=verse_key,verse_number,text_uthmani,juz_number,page_number` +
      `&language=en`;

    const pageData = await fetchJson(versesUrl, controller.signal);
    const verses: any[] = pageData?.verses ?? [];
    const candidates = verses.filter((v) =>
      String(v?.verse_key ?? '').length > 0 && String(v?.text_uthmani ?? '').trim().length > 0,
    );

    if (candidates.length === 0) {
      clearTimeout(timeoutId);
      return null;
    }

    const startIndex = (day * 7) % candidates.length;
    const chapterVerseMapCache = new Map<number, Map<number, ChapterVerse>>();

    const getChapterVerseMap = async (candidateSurah: number): Promise<Map<number, ChapterVerse>> => {
      const cachedMap = chapterVerseMapCache.get(candidateSurah);
      if (cachedMap) return cachedMap;

      const map = await fetchChapterVerseMap(candidateSurah, controller.signal);
      chapterVerseMapCache.set(candidateSurah, map);
      return map;
    };

    let selected: any | null = null;
    let surahNumber = 0;
    let verseNumber = 0;
    let verseKey = '';
    let selectedEnglish = '';
    let selectedChapterVerseMap: Map<number, ChapterVerse> | null = null;

    for (let offset = 0; offset < candidates.length; offset += 1) {
      const candidate = candidates[(startIndex + offset) % candidates.length];
      const candidateKey = String(candidate?.verse_key ?? '');
      const [candidateSurahRaw, candidateVerseRaw] = candidateKey.split(':');
      const candidateSurah = Number(candidateSurahRaw);
      const candidateVerse = Number(candidateVerseRaw);

      if (!Number.isFinite(candidateSurah) || !Number.isFinite(candidateVerse)) continue;
      if (!shouldIncludeVerse(candidateSurah, candidateVerse)) continue;

      const chapterVerseMap = await getChapterVerseMap(candidateSurah);
      const chapterRow = chapterVerseMap.get(candidateVerse);
      const chapterEnglish = chapterRow?.english ?? '';
      const candidateEnglish = chapterEnglish || await fetchTranslationForVerse(
        candidateSurah,
        candidateKey,
        controller.signal,
      );

      if (!matchesPreferredTheme(candidateEnglish)) continue;

      selected = candidate;
      verseKey = candidateKey;
      surahNumber = candidateSurah;
      verseNumber = candidateVerse;
      selectedEnglish = candidateEnglish;
      selectedChapterVerseMap = chapterVerseMap;
      break;
    }

    if (!selected) {
      clearTimeout(timeoutId);
      return null;
    }

    const chapterVerseMap = selectedChapterVerseMap
      ?? await fetchChapterVerseMap(surahNumber, controller.signal);
    const directTranslation = chapterVerseMap.get(verseNumber)?.english ?? '';
    const translation = selectedEnglish || directTranslation || await fetchTranslationForVerse(
      surahNumber,
      verseKey,
      controller.signal,
    );

    const shouldIncludeContext = day % INCLUDE_CONTEXT_EVERY_N_DAYS === 0;
    const contextVerseNumbers = [verseNumber];

    if (shouldIncludeContext) {
      for (let i = CONTEXT_BEFORE_VERSES; i >= 1; i -= 1) {
        const n = verseNumber - i;
        if (n >= 1) contextVerseNumbers.unshift(n);
      }
      for (let i = 1; i <= CONTEXT_AFTER_VERSES; i += 1) {
        contextVerseNumbers.push(verseNumber + i);
      }
    }

    const contextRows = contextVerseNumbers
      .filter((n) => shouldIncludeVerse(surahNumber, n))
      .map((n) => chapterVerseMap.get(n))
      .filter((row): row is ChapterVerse => (
        !!row
        && row.english.length > 0
        && matchesPreferredTheme(row.english)
      ));

    clearTimeout(timeoutId);

    const englishTranslation = translation || 'Open full Verse to read the reminder.';
    const preview = englishTranslation.length > 120
      ? `${englishTranslation.slice(0, 120).trimEnd()}…`
      : englishTranslation;

    const result: DailyQuranResult = {
      arabic: String(selected?.text_uthmani ?? '').trim(),
      englishTranslation,
      // Keep text for compatibility with existing consumers.
      text: contextRows.length > 1
        ? formatContextVerseBlock(contextRows)
        : englishTranslation,
      preview,
      ref: verseKey ? `Quran ${verseKey}` : 'Quran Reminder',
      verseKey,
      pageNumber,
      juzNumber: Number(selected?.juz_number ?? 0),
      surahNumber: Number.isFinite(surahNumber) ? surahNumber : 0,
      verseNumber: Number.isFinite(verseNumber) ? verseNumber : 0,
      contextVerseKeys: contextRows.length > 0
        ? contextRows.map((row) => row.verseKey)
        : verseKey
          ? [verseKey]
          : [],
    };

    await writeCache(result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[quranReminderService] fetch failed:', err);
    return null;
  }
}
