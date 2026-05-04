/**
 * sunnahReminderService.ts
 * Fetches the daily hadith from the daily-sunnah Supabase Edge Function.
 * Source data: AhmedBaset/hadith-json (Nawawi 40, pinned v1.2.0)
 */

const FETCH_TIMEOUT_MS = 6000;
const CACHE_KEY = '@daily_sunnah_v5';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export type DailySunnahResult = {
  arabic: string;
  narrator: string;
  preview: string;
  text: string;
  ref: string;
  idInBook: number;
  bookTitle: string;
  chapterNumber?: number;
  hadithNumber?: number;
  sourceLabel?: string;
  sourceApi?: string;
  sourceUrl?: string;
};

type CachePayload = {
  updatedAt: number;
  dayStamp: string;
  data: DailySunnahResult;
};

let memoryCache: CachePayload | null = null;

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { name?: string; message?: string };
  return maybeError.name === 'AbortError' || maybeError.message === 'Aborted';
}

function getSupabaseEnv() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return { url, publishableKey, anonKey };
}

function isLikelyJwt(value: string): boolean {
  const parts = value.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function isSunnahScrapePayload(data: DailySunnahResult): boolean {
  const sourceApi = (data.sourceApi ?? '').toLowerCase();
  const sourceUrl = (data.sourceUrl ?? '').toLowerCase();
  if (sourceApi === 'sunnah.com') return true;
  return sourceUrl.includes('sunnah.com/');
}

function getLocalDayStamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getUtcSlotStamp(date = new Date()): string {
  const dayStamp = date.toISOString().slice(0, 10);
  const slotIndex = Math.floor(date.getUTCHours() / 8);
  return `${dayStamp}-slot-${slotIndex}`;
}

async function readCache(): Promise<DailySunnahResult | null> {
  const todayStamp = getUtcSlotStamp();
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
    // ignore cache errors
  }

  return null;
}

async function readLastSuccessfulCache(): Promise<DailySunnahResult | null> {
  if (memoryCache?.data) return memoryCache.data;

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const payload: CachePayload = JSON.parse(raw);
    memoryCache = payload;
    return payload.data;
  } catch {
    return null;
  }
}

export async function getDailySunnahCached(): Promise<DailySunnahResult | null> {
  return readLastSuccessfulCache();
}

async function writeCache(data: DailySunnahResult): Promise<void> {
  const payload: CachePayload = {
    updatedAt: Date.now(),
    dayStamp: getUtcSlotStamp(),
    data,
  };
  memoryCache = payload;

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache errors
  }
}

export async function fetchDailySunnah(
  options?: { forceRefresh?: boolean },
): Promise<DailySunnahResult | null> {
  const forceRefresh = options?.forceRefresh === true;
  const fallbackCached = await readLastSuccessfulCache();

  if (!forceRefresh) {
    const cached = await readCache();
    if (cached) {
      return cached;
    }
  }

  const { url, publishableKey, anonKey } = getSupabaseEnv();
  if (!url) {
    return fallbackCached;
  }

  const apiKey = publishableKey || anonKey;
  const authToken = anonKey || (apiKey && isLikelyJwt(apiKey) ? apiKey : undefined);
  if (!apiKey || !authToken) {
    return fallbackCached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const cacheKey = forceRefresh
      ? `${getUtcSlotStamp()}-${Date.now()}`
      : getUtcSlotStamp();
    const requestUrl = `${url}/functions/v1/daily-sunnah?cache_bust=${encodeURIComponent(cacheKey)}`;

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
      },
      body: '{}',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[sunnahReminderService] edge function error:', response.status);
      return fallbackCached;
    }

    const parsed = await response.json() as DailySunnahResult | { noCandidate?: boolean };
    if ('noCandidate' in parsed && parsed.noCandidate) {
      const lastSuccessful = await readLastSuccessfulCache();
      return lastSuccessful;
    }

    const data: DailySunnahResult = parsed as DailySunnahResult;
    if (!isSunnahScrapePayload(data)) {
      if (__DEV__) {
        console.warn('[sunnahReminderService][trace] rejected non-scrape payload', {
          sourceApi: data.sourceApi ?? null,
          sourceUrl: data.sourceUrl ?? null,
          ref: data.ref,
          bookTitle: data.bookTitle,
        });
      }
      return fallbackCached;
    }

    await writeCache(data);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (isAbortError(err)) {
      return fallbackCached;
    }
    console.warn('[sunnahReminderService] fetch failed:', err);
    return fallbackCached;
  }
}
