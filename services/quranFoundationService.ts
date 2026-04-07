/**
 * Quran Foundation Content API — Client-side token manager
 *
 * Responsibilities:
 *  - Fetches tokens from the `get-quran-token` edge function (server-side only,
 *    credentials never exposed to the client).
 *  - Caches token + expiry in memory; re-requests ~30 s before it expires.
 *  - Ensures only one token request is in-flight at a time (stampede prevention).
 *  - On 401 from the Content API: clears the cache, fetches once, retries once.
 *  - No refresh_token logic (Client Credentials only).
 *  - No retry loops.
 */

import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Client-side page cache (AsyncStorage) ─────────────────────────────────
// Pages are static Quranic content — cache for 7 days.

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PAGE_CACHE_PREFIX = '@qf_pages_v2_';

interface PageCacheEntry {
  pages: QFMushafPage[];
  cachedAt: number;
}

async function readPageCache(key: string): Promise<QFMushafPage[] | null> {
  try {
    const raw = await AsyncStorage.getItem(PAGE_CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: PageCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      // Expired — remove silently
      AsyncStorage.removeItem(PAGE_CACHE_PREFIX + key).catch(() => {});
      return null;
    }
    return entry.pages;
  } catch {
    return null;
  }
}

async function writePageCache(key: string, pages: QFMushafPage[]): Promise<void> {
  try {
    const entry: PageCacheEntry = { pages, cachedAt: Date.now() };
    await AsyncStorage.setItem(PAGE_CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

// ── Internal cache ────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  clientId: string;
  baseUrl: string;
  /** Unix ms timestamp; already accounts for the 30-second early-refresh buffer */
  expiresAt: number;
}

const REFRESH_BUFFER_MS = 30_000; // re-request 30 s before expiry

let _cache: TokenCache | null = null;
let _inflightRequest: Promise<TokenCache> | null = null;

// ── API base URLs ─────────────────────────────────────────────────────────

const API_BASE: Record<string, string> = {
  prelive:    'https://apis-prelive.quran.foundation',
  production: 'https://apis.quran.foundation',
};

// ── Token fetch (calls the backend edge function) ─────────────────────────

async function _fetchTokenFromEdge(): Promise<TokenCache> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke('get-quran-token', {
    body: {},
  });

  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const status = error.context?.status ?? 500;
        const text   = await error.context?.text();
        msg = `[${status}] ${text || error.message || 'Unknown error'}`;
      } catch {
        msg = error.message || 'Failed to read edge function response';
      }
    }
    throw new Error(`QF token fetch failed: ${msg}`);
  }

  if (!data?.access_token) {
    throw new Error('QF token fetch: no access_token in response');
  }

  const expiresIn: number = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  const env:       string = data.env ?? 'prelive';
  const clientId:  string = data.client_id ?? '';

  const cache: TokenCache = {
    token:     data.access_token,
    clientId,
    baseUrl:   API_BASE[env] ?? API_BASE['prelive'],
    expiresAt: Date.now() + expiresIn * 1_000 - REFRESH_BUFFER_MS,
  };

  _cache = cache;
  return cache;
}

// ── Public: get a valid token (with stampede guard) ───────────────────────

async function _getTokenCache(): Promise<TokenCache> {
  // Fast path: valid cached token
  if (_cache && Date.now() < _cache.expiresAt) {
    return _cache;
  }

  // Stampede prevention: return the in-flight promise if one exists
  if (_inflightRequest) {
    return _inflightRequest;
  }

  // Start a new fetch
  _inflightRequest = _fetchTokenFromEdge().finally(() => {
    _inflightRequest = null;
  });

  return _inflightRequest;
}

/**
 * Returns a valid QF Content API access token string.
 * Fetches/caches automatically; safe to call from multiple places simultaneously.
 */
export async function getQFToken(): Promise<string> {
  const cache = await _getTokenCache();
  return cache.token;
}

/**
 * Clears the in-memory token cache, forcing a fresh fetch on the next call.
 * Called automatically on 401.
 */
export function clearQFTokenCache(): void {
  _cache = null;
}

// ── Public: authenticated fetch wrapper ──────────────────────────────────

/**
 * Fetches from the Quran Foundation Content API.
 *
 * - Injects `x-auth-token` and `x-client-id` headers automatically.
 * - On 401: clears cache, fetches a fresh token, retries exactly once.
 * - Does NOT retry in a loop.
 *
 * @param path   Path relative to the API base (e.g. `/content/api/v4/chapters`)
 * @param options Standard fetch options (headers are merged, not replaced)
 */
export async function qfFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  let tc = await _getTokenCache();

  const buildHeaders = (cache: TokenCache): HeadersInit => ({
    ...(options.headers as Record<string, string> | undefined),
    'x-auth-token': cache.token,
    ...(cache.clientId ? { 'x-client-id': cache.clientId } : {}),
    Accept: 'application/json',
  });

  const doFetch = (cache: TokenCache) =>
    fetch(`${cache.baseUrl}${path}`, {
      ...options,
      headers: buildHeaders(cache),
    });

  const response = await doFetch(tc);

  if (response.status === 401) {
    // Treat token as invalid — clear cache, get a fresh token, retry once.
    clearQFTokenCache();
    tc = await _getTokenCache();
    return doFetch(tc);
  }

  return response;
}

/**
 * Convenience: calls qfFetch and parses the JSON body.
 * Throws if the response is not ok (after the possible 401 retry).
 */
export async function qfGet<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await qfFetch(path, options);

  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch { /* ignore */ }
    throw new Error(
      `QF Content API error [${response.status}] on ${path}${detail ? `: ${detail}` : ''}`,
    );
  }

  return response.json() as Promise<T>;
}

// ── Backend-proxied helpers (credentials never touch the client) ──────────

// ── QF Mushaf page types ─────────────────────────────────────────────────

export interface QFWord {
  text: string;
  charType: string;
  verseKey: string;
}

export interface QFLine {
  lineNumber: number;
  words: QFWord[];
  isBismillah: boolean;
  isCentered: boolean;
}

export interface QFVerseSummary {
  verseKey: string;
  verseNumber: number;
  textIndopak: string;
  translation: string;
  juzNumber: number;
}

export interface QFMushafPage {
  pageNumber: number;
  juzNumber: number;
  lines: QFLine[];
  verses: QFVerseSummary[];
  verseRange: [number, number];
}

/**
 * Fetches Mushaf page data for a chapter via the `quran-surah-pages` Edge Function.
 * Uses IndoPak script (mushaf=3) by default.
 * Credentials stay on the server — only page/line/word data is returned.
 */
export async function fetchQFSurahPages(
  chapterNumber: number,
  mushaf = 3,
): Promise<QFMushafPage[]> {
  const cacheKey = `ch${chapterNumber}_m${mushaf}`;

  // ── 1. Try cache first ───────────────────────────────────────────────
  const cached = await readPageCache(cacheKey);
  if (cached && cached.length > 0) {
    console.log(`fetchQFSurahPages: cache hit for ${cacheKey} (${cached.length} pages)`);
    return cached;
  }

  // ── 2. Fetch from edge function ──────────────────────────────────────
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke('quran-surah-pages', {
    body: { chapter_number: chapterNumber, mushaf },
  });

  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const status = error.context?.status ?? 500;
        const text   = await error.context?.text();
        msg = `[${status}] ${text || error.message || 'Unknown error'}`;
      } catch {
        msg = error.message || 'Failed to read edge function response';
      }
    }
    throw new Error(`fetchQFSurahPages: ${msg}`);
  }

  if (!Array.isArray(data?.pages)) {
    throw new Error('fetchQFSurahPages: response missing pages array');
  }

  const pages = data.pages as QFMushafPage[];

  // ── 3. Persist to cache (fire-and-forget) ────────────────────────────
  writePageCache(cacheKey, pages).catch(() => {});

  return pages;
}

// ── Legacy section heading (keep for clarity) ─────────────────────────────

export interface QFChapter {
  id:               number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre:    boolean;
  name_simple:      string;
  name_complex:     string;
  name_arabic:      string;
  verses_count:     number;
  pages:            [number, number];
  translated_name:  { language_name: string; name: string };
}

/**
 * Fetches the full chapter list via the `quran-chapters` Edge Function.
 *
 * All credentials stay on the server — only the chapters payload is
 * returned to the client. Throws on error.
 */
export async function fetchQFChapters(): Promise<QFChapter[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke('quran-chapters', {
    body: {},
  });

  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const status = error.context?.status ?? 500;
        const text   = await error.context?.text();
        msg = `[${status}] ${text || error.message || 'Unknown error'}`;
      } catch {
        msg = error.message || 'Failed to read edge function response';
      }
    }
    throw new Error(`fetchQFChapters: ${msg}`);
  }

  if (!Array.isArray(data?.chapters)) {
    throw new Error('fetchQFChapters: response missing chapters array');
  }

  return data.chapters as QFChapter[];
}
