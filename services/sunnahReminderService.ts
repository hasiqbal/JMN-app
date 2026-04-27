/**
 * sunnahReminderService.ts
 * Fetches the daily hadith from the daily-sunnah Supabase Edge Function.
 * Source data: AhmedBaset/hadith-json (Nawawi 40, pinned v1.2.0)
 */

const FETCH_TIMEOUT_MS = 8000;
const CACHE_KEY = '@daily_sunnah_v2';
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

async function readCache(): Promise<DailySunnahResult | null> {
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
  const payload: CachePayload = { updatedAt: Date.now(), data };
  memoryCache = payload;

  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache errors
  }
}

export async function fetchDailySunnah(): Promise<DailySunnahResult | null> {
  const cached = await readCache();
  if (cached) return cached;

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return null;

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
      return null;
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
    return null;
  }
}
