/**
 * sunnahReminderService.ts
 * Fetches the daily hadith from the daily-sunnah Supabase Edge Function.
 * Source data: AhmedBaset/hadith-json (Nawawi 40, pinned v1.2.0)
 */

const FETCH_TIMEOUT_MS = 8000;
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
  options?: {
    forceRefresh?: boolean;
    onTrace?: (event: string, payload?: Record<string, unknown>) => void;
  },
): Promise<DailySunnahResult | null> {
  const forceRefresh = options?.forceRefresh === true;
  const trace = (event: string, payload?: Record<string, unknown>) => {
    if (options?.onTrace) {
      options.onTrace(event, payload);
    }
  };
  const fallbackCached = await readLastSuccessfulCache();
  trace('start', {
    forceRefresh,
    hasMemoryCache: !!memoryCache?.data,
    hasFallbackCached: !!fallbackCached,
  });
  if (__DEV__) {
    console.log('[sunnahReminderService][trace] start', {
      forceRefresh,
      hasMemoryCache: !!memoryCache?.data,
      hasFallbackCached: !!fallbackCached,
    });
  }

  if (!forceRefresh) {
    const cached = await readCache();
    if (cached) {
      trace('hit-today-cache', {
        previewLen: cached.preview?.length ?? 0,
        textLen: cached.text?.length ?? 0,
        source: cached.ref,
      });
      if (__DEV__) {
        console.log('[sunnahReminderService][trace] hit-today-cache', {
          previewLen: cached.preview?.length ?? 0,
          textLen: cached.text?.length ?? 0,
          source: cached.ref,
        });
      }
      return cached;
    }
  }

  const { url, publishableKey, anonKey } = getSupabaseEnv();
  if (!url) {
    trace('missing-url');
    if (__DEV__) {
      console.warn('[sunnahReminderService][trace] missing EXPO_PUBLIC_SUPABASE_URL');
    }
    return fallbackCached;
  }

  const apiKey = publishableKey || anonKey;
  const authToken = anonKey || (apiKey && isLikelyJwt(apiKey) ? apiKey : undefined);
  if (!apiKey || !authToken) {
    trace('missing-auth-credentials', {
      hasApiKey: !!apiKey,
      hasAuthToken: !!authToken,
      authTokenLooksJwt: !!authToken && isLikelyJwt(authToken),
    });
    if (__DEV__) {
      console.warn('[sunnahReminderService][trace] missing auth credentials', {
        hasApiKey: !!apiKey,
        hasAuthToken: !!authToken,
        authTokenLooksJwt: !!authToken && isLikelyJwt(authToken),
      });
    }
    return fallbackCached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const cacheKey = forceRefresh
      ? `${getUtcSlotStamp()}-${Date.now()}`
      : getUtcSlotStamp();
    const requestUrl = `${url}/functions/v1/daily-sunnah?cache_bust=${encodeURIComponent(cacheKey)}`;
    trace('request', { requestUrl, method: 'POST' });

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
      if (__DEV__) {
        const body = await response.text().catch(() => '');
        trace('non-200-response', { status: response.status, body });
        console.warn('[sunnahReminderService][trace] non-200 response body:', body);
      }
      return fallbackCached;
    }

    const parsed = await response.json() as DailySunnahResult | { noCandidate?: boolean };
    if ('noCandidate' in parsed && parsed.noCandidate) {
      trace('noCandidate', parsed as Record<string, unknown>);
      if (__DEV__) {
        console.warn('[sunnahReminderService][trace] noCandidate payload', parsed);
      }
      const lastSuccessful = await readLastSuccessfulCache();
      return lastSuccessful;
    }

    const data: DailySunnahResult = parsed as DailySunnahResult;
    if (!isSunnahScrapePayload(data)) {
      trace('rejected-non-scrape-payload', {
        sourceApi: data.sourceApi ?? null,
        sourceUrl: data.sourceUrl ?? null,
        ref: data.ref,
        bookTitle: data.bookTitle,
      });
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

    trace('fetch-success', {
      previewLen: data.preview?.length ?? 0,
      textLen: data.text?.length ?? 0,
      source: data.ref,
      bookTitle: data.bookTitle,
      sourceApi: data.sourceApi ?? null,
      sourceUrl: data.sourceUrl ?? null,
    });
    if (__DEV__) {
      console.log('[sunnahReminderService][trace] fetch-success', {
        previewLen: data.preview?.length ?? 0,
        textLen: data.text?.length ?? 0,
        source: data.ref,
        bookTitle: data.bookTitle,
      });
    }
    await writeCache(data);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (isAbortError(err)) {
      trace('request-aborted-timeout');
      if (__DEV__) {
        console.warn('[sunnahReminderService][trace] request aborted (timeout)');
      }
      return fallbackCached;
    }
    trace('fetch-exception', {
      message: err instanceof Error ? err.message : String(err),
    });
    console.warn('[sunnahReminderService] fetch failed:', err);
    return fallbackCached;
  }
}
