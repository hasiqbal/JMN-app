const FETCH_TIMEOUT_MS = 10000;
const CACHE_KEY = '@daily_quran_v2';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const BASE_URL = 'https://api.quran.com/api/v4';
const DEFAULT_TRANSLATION_IDS = [20, 131]; // Sahih International primary, fallback to legacy id
const TOTAL_MUSHAF_PAGES = 604;

type CachePayload = {
  updatedAt: number;
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
};

function stripHtml(value: string): string {
  return value
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dayOfYearUtc(): number {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

async function readCache(): Promise<DailyQuranResult | null> {
  if (memoryCache && Date.now() - memoryCache.updatedAt < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const payload: CachePayload = JSON.parse(raw);
    if (Date.now() - payload.updatedAt < CACHE_TTL_MS) {
      memoryCache = payload;
      return payload.data;
    }
  } catch {
    // ignore cache read issues
  }

  return null;
}

async function writeCache(data: DailyQuranResult): Promise<void> {
  const payload: CachePayload = { updatedAt: Date.now(), data };
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

export async function fetchDailyQuranReminder(): Promise<DailyQuranResult | null> {
  const cached = await readCache();
  if (cached) return cached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const day = Math.max(1, dayOfYearUtc());
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

    const verseIndex = (day * 7) % candidates.length;
    const selected = candidates[verseIndex];
    const verseKey = String(selected?.verse_key ?? '');
    const [surahRaw, verseRaw] = verseKey.split(':');
    const surahNumber = Number(surahRaw);
    const verseNumber = Number(verseRaw);

    const translation = await fetchTranslationForVerse(
      Number.isFinite(surahNumber) ? surahNumber : 1,
      verseKey,
      controller.signal,
    );

    clearTimeout(timeoutId);

    const englishTranslation = translation || 'Open full Verse to read the reminder.';
    const preview = englishTranslation.length > 120
      ? `${englishTranslation.slice(0, 120).trimEnd()}…`
      : englishTranslation;

    const result: DailyQuranResult = {
      arabic: String(selected?.text_uthmani ?? '').trim(),
      englishTranslation,
      // Keep text for compatibility with existing consumers.
      text: englishTranslation,
      preview,
      ref: verseKey ? `Quran ${verseKey}` : 'Quran Reminder',
      verseKey,
      pageNumber,
      juzNumber: Number(selected?.juz_number ?? 0),
      surahNumber: Number.isFinite(surahNumber) ? surahNumber : 0,
      verseNumber: Number.isFinite(verseNumber) ? verseNumber : 0,
    };

    await writeCache(result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[quranReminderService] fetch failed:', err);
    return null;
  }
}
