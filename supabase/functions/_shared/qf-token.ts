/**
 * Shared Quran Foundation token helper for Edge Functions.
 *
 * Provides:
 *   - getQFToken()  — returns a valid access_token string
 *   - qfApiGet()    — authenticated GET against the QF Content API
 *
 * Token is cached in-memory for the lifetime of the Deno isolate (typically
 * the duration of one Edge Function invocation or a warm reuse window).
 * Re-requested automatically 30 s before expiry.
 * Stampede-safe: only one in-flight token request at a time.
 * On 401: cache is cleared, token re-fetched, request retried once.
 */

// ── Environment-to-URL maps ───────────────────────────────────────────────

const OAUTH2_BASE: Record<string, string> = {
  prelive:    'https://prelive-oauth2.quran.foundation',
  production: 'https://oauth2.quran.foundation',
};

const API_BASE: Record<string, string> = {
  prelive:    'https://apis-prelive.quran.foundation',
  production: 'https://apis.quran.foundation',
};

// ── In-memory token cache ─────────────────────────────────────────────────

interface TokenEntry {
  token:    string;
  clientId: string;
  apiBase:  string;
  /** Unix ms: when this entry should be treated as expired (30 s early) */
  expiresAt: number;
}

const REFRESH_BUFFER_MS = 30_000;

let _cached:   TokenEntry | null = null;
let _inflight: Promise<TokenEntry> | null = null;

// ── Private: fetch a fresh token from the OAuth2 server ───────────────────

async function _fetchToken(): Promise<TokenEntry> {
  const clientId     = Deno.env.get('QF_CLIENT_ID');
  const clientSecret = Deno.env.get('QF_CLIENT_SECRET');
  const env          = Deno.env.get('QF_ENV') ?? 'prelive';

  if (!clientId || !clientSecret) {
    throw new Error('QF_CLIENT_ID or QF_CLIENT_SECRET not configured');
  }

  const authBase = OAUTH2_BASE[env] ?? OAUTH2_BASE['prelive'];
  const apiBase  = API_BASE[env]    ?? API_BASE['prelive'];

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${authBase}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
      'Accept':        'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope:      'content',
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`QF OAuth2 error [${res.status}]: ${body || res.statusText}`);
  }

  const json = await res.json();
  if (!json.access_token) {
    throw new Error('QF OAuth2: no access_token in response');
  }

  const expiresIn: number = typeof json.expires_in === 'number' ? json.expires_in : 3600;

  const entry: TokenEntry = {
    token:     json.access_token,
    clientId,
    apiBase,
    expiresAt: Date.now() + expiresIn * 1_000 - REFRESH_BUFFER_MS,
  };

  _cached = entry;
  console.log(`qf-token: token fetched, expires_in=${expiresIn}s, env=${env}`);
  return entry;
}

// ── Public: get a valid token entry (with stampede guard) ─────────────────

async function _getTokenEntry(): Promise<TokenEntry> {
  // Fast path: cached and not expiring soon
  if (_cached && Date.now() < _cached.expiresAt) return _cached;

  // Stampede prevention: share the in-flight promise
  if (!_inflight) {
    _inflight = _fetchToken().finally(() => { _inflight = null; });
  }
  return _inflight;
}

/** Returns a valid QF Content API access token string. */
export async function getQFToken(): Promise<string> {
  return (await _getTokenEntry()).token;
}

/** Clears the cached token, forcing a re-fetch on the next call. */
export function clearQFToken(): void {
  _cached = null;
}

// ── Public: authenticated GET against the QF Content API ─────────────────

/**
 * Makes an authenticated GET request to the QF Content API.
 *
 * - Injects x-auth-token and x-client-id automatically.
 * - On 401: clears cache, re-fetches token, retries once.
 * - Does NOT retry in a loop.
 *
 * @param path  API path, e.g. `/content/api/v4/chapters`
 * @returns Parsed JSON response body
 * @throws  Error if response is not ok after the optional retry
 */
export async function qfApiGet<T = unknown>(path: string): Promise<T> {
  let entry = await _getTokenEntry();

  const doRequest = async (e: TokenEntry): Promise<Response> => {
    return fetch(`${e.apiBase}${path}`, {
      method: 'GET',
      headers: {
        'x-auth-token': e.token,
        'x-client-id':  e.clientId,
        'Accept':        'application/json',
      },
    });
  };

  let res = await doRequest(entry);

  // 401 → clear cache, re-fetch, retry once
  if (res.status === 401) {
    console.warn(`qf-token: 401 on ${path}, clearing cache and retrying once`);
    clearQFToken();
    entry = await _getTokenEntry();
    res   = await doRequest(entry);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`QF Content API error [${res.status}] on ${path}${body ? `: ${body}` : ''}`);
  }

  return res.json() as Promise<T>;
}
