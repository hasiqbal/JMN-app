/**
 * sunnahReminderService.ts
 * Fetches the daily hadith from the daily-sunnah Supabase Edge Function.
 * Source data: AhmedBaset/hadith-json (Nawawi 40, pinned v1.2.0)
 */

const FETCH_TIMEOUT_MS = 8000;
const CACHE_KEY = '@daily_sunnah_v4';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export type DailySunnahResult = {
  arabic: string;
  narrator: string;
  preview: string;
  text: string;
  ref: string;
  idInBook: number;
  bookTitle: string;
};

type CachePayload = {
  updatedAt: number;
  dayStamp: string;
  data: DailySunnahResult;
};

let memoryCache: CachePayload | null = null;

function getSupabaseEnv() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

function getLocalDayStamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function readCache(): Promise<DailySunnahResult | null> {
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

async function writeCache(data: DailySunnahResult): Promise<void> {
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
    if (cached) return cached;
  }

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return fallbackCached;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}/functions/v1/daily-sunnah`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
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
    await writeCache(data);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[sunnahReminderService] fetch failed:', err);
    return fallbackCached;
  }
}
