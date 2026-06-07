import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  fetchHijriCalendarForYear,
  fetchHijriCalendarLatestUpdatedAt,
  type HijriCalendarRow,
} from '@/services/contentService';

type HijriCalendarCacheState = {
  syncedPortalVersion: string | null;
  lastVersionCheckedAt: number;
};

const HIJRI_CACHE_STATE_KEY = '@hijri_calendar_cache_state_v1';
const HIJRI_YEAR_CACHE_PREFIX = '@hijri_calendar_year_cache_v1:';
const VERSION_CHECK_TTL_MS = 15 * 60 * 1000;
const EMPTY_YEAR_RETRY_TTL_MS = 6 * 60 * 60 * 1000;

let warmupStarted = false;
let yearCacheMemory = new Map<number, HijriCalendarRow[]>();
let stateMemory: HijriCalendarCacheState | null = null;
let versionCheckInFlight: Promise<string | null> | null = null;
const yearFetchInFlight = new Map<number, Promise<HijriCalendarRow[]>>();
const emptyYearRetryMemory = new Map<number, { attemptedAt: number; portalVersion: string | null }>();

function buildYearCacheKey(year: number): string {
  return `${HIJRI_YEAR_CACHE_PREFIX}${year}`;
}

function sanitizeHijriRows(rows: unknown): HijriCalendarRow[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => {
      const gregorianDay = Number(row.gregorian_day);
      const gregorianMonth = Number(row.gregorian_month);
      const gregorianYear = Number(row.gregorian_year);
      const hijriDate = typeof row.hijri_date === 'string' ? row.hijri_date : '';
      const gregorianDate = typeof row.gregorian_date === 'string' ? row.gregorian_date : '';

      return {
        gregorian_day: Number.isFinite(gregorianDay) ? gregorianDay : 0,
        gregorian_month: Number.isFinite(gregorianMonth) ? gregorianMonth : 0,
        gregorian_year: Number.isFinite(gregorianYear) ? gregorianYear : 0,
        hijri_date: hijriDate,
        gregorian_date: gregorianDate,
      };
    })
    .filter((row) => (
      row.gregorian_year > 0
      && row.gregorian_month >= 1
      && row.gregorian_month <= 12
      && row.gregorian_day >= 1
      && row.gregorian_day <= 31
      && row.hijri_date.length > 0
    ));
}

async function readCacheState(): Promise<HijriCalendarCacheState> {
  if (stateMemory) return stateMemory;

  try {
    const raw = await AsyncStorage.getItem(HIJRI_CACHE_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HijriCalendarCacheState>;
      stateMemory = {
        syncedPortalVersion: typeof parsed.syncedPortalVersion === 'string' ? parsed.syncedPortalVersion : null,
        lastVersionCheckedAt: typeof parsed.lastVersionCheckedAt === 'number' ? parsed.lastVersionCheckedAt : 0,
      };
      return stateMemory;
    }
  } catch {
    // Ignore storage failures and return defaults.
  }

  stateMemory = {
    syncedPortalVersion: null,
    lastVersionCheckedAt: 0,
  };
  return stateMemory;
}

async function writeCacheState(next: HijriCalendarCacheState): Promise<void> {
  stateMemory = next;
  try {
    await AsyncStorage.setItem(HIJRI_CACHE_STATE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort persistence.
  }
}

async function readYearCache(year: number): Promise<HijriCalendarRow[]> {
  const fromMemory = yearCacheMemory.get(year);
  if (fromMemory) return fromMemory;

  try {
    const raw = await AsyncStorage.getItem(buildYearCacheKey(year));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    const sanitized = sanitizeHijriRows(parsed);
    if (sanitized.length > 0) {
      yearCacheMemory.set(year, sanitized);
    }
    return sanitized;
  } catch {
    return [];
  }
}

async function writeYearCache(year: number, rows: HijriCalendarRow[]): Promise<void> {
  const sanitized = sanitizeHijriRows(rows);
  yearCacheMemory.set(year, sanitized);
  try {
    await AsyncStorage.setItem(buildYearCacheKey(year), JSON.stringify(sanitized));
  } catch {
    // Best-effort persistence.
  }
}

async function getPortalVersion(force = false): Promise<string | null> {
  const state = await readCacheState();
  const now = Date.now();
  const isRecent = now - state.lastVersionCheckedAt <= VERSION_CHECK_TTL_MS;

  if (!force && isRecent) {
    return state.syncedPortalVersion;
  }

  if (versionCheckInFlight) return versionCheckInFlight;

  versionCheckInFlight = (async () => {
    const latest = await fetchHijriCalendarLatestUpdatedAt();
    const current = await readCacheState();

    await writeCacheState({
      syncedPortalVersion: current.syncedPortalVersion,
      lastVersionCheckedAt: Date.now(),
    });

    return latest;
  })().finally(() => {
    versionCheckInFlight = null;
  });

  return versionCheckInFlight;
}

async function ensureYearHydrated(year: number, options?: { forceVersionCheck?: boolean }): Promise<HijriCalendarRow[]> {
  const inFlight = yearFetchInFlight.get(year);
  if (inFlight) return inFlight;

  const task = (async () => {
    const cachedRows = await readYearCache(year);
    const stateBefore = await readCacheState();
    const latestPortalVersion = await getPortalVersion(options?.forceVersionCheck ?? false);

    const hasCachedRows = cachedRows.length > 0;
    const hasKnownSyncedVersion = typeof stateBefore.syncedPortalVersion === 'string' && stateBefore.syncedPortalVersion.length > 0;
    const latestPortalVersionOrNull = latestPortalVersion ?? null;
    const portalChanged = Boolean(
      latestPortalVersion
      && hasKnownSyncedVersion
      && latestPortalVersion !== stateBefore.syncedPortalVersion,
    );

    if (!hasCachedRows) {
      const emptyAttempt = emptyYearRetryMemory.get(year);
      const withinRetryWindow = Boolean(
        emptyAttempt
        && (Date.now() - emptyAttempt.attemptedAt) < EMPTY_YEAR_RETRY_TTL_MS,
      );
      const sameVersion = emptyAttempt?.portalVersion === latestPortalVersionOrNull;
      if (withinRetryWindow && sameVersion) {
        return cachedRows;
      }
    }

    const shouldRefresh = !hasCachedRows || portalChanged;
    if (!shouldRefresh) {
      return cachedRows;
    }

    const freshRows = await fetchHijriCalendarForYear(year);
    if (freshRows.length > 0) {
      emptyYearRetryMemory.delete(year);
      await writeYearCache(year, freshRows);
      const stateNow = await readCacheState();
      await writeCacheState({
        syncedPortalVersion: latestPortalVersion ?? stateNow.syncedPortalVersion,
        lastVersionCheckedAt: Date.now(),
      });
      return freshRows;
    }

    if (!hasCachedRows) {
      emptyYearRetryMemory.set(year, {
        attemptedAt: Date.now(),
        portalVersion: latestPortalVersionOrNull,
      });
    }

    if (latestPortalVersion) {
      const stateNow = await readCacheState();
      await writeCacheState({
        syncedPortalVersion: latestPortalVersion,
        lastVersionCheckedAt: Date.now(),
      });
    }

    // Network/source failed; fallback to cache if available.
    return cachedRows;
  })().finally(() => {
    yearFetchInFlight.delete(year);
  });

  yearFetchInFlight.set(year, task);
  return task;
}

async function forceRefreshYear(year: number): Promise<HijriCalendarRow[]> {
  const inFlight = yearFetchInFlight.get(year);
  if (inFlight) return inFlight;

  const task = (async () => {
    const latestPortalVersion = await getPortalVersion(true);
    const latestPortalVersionOrNull = latestPortalVersion ?? null;
    const freshRows = await fetchHijriCalendarForYear(year);

    if (freshRows.length > 0) {
      emptyYearRetryMemory.delete(year);
      await writeYearCache(year, freshRows);
      const stateNow = await readCacheState();
      await writeCacheState({
        syncedPortalVersion: latestPortalVersion ?? stateNow.syncedPortalVersion,
        lastVersionCheckedAt: Date.now(),
      });
      return freshRows;
    }

    emptyYearRetryMemory.set(year, {
      attemptedAt: Date.now(),
      portalVersion: latestPortalVersionOrNull,
    });

    return readYearCache(year);
  })().finally(() => {
    yearFetchInFlight.delete(year);
  });

  yearFetchInFlight.set(year, task);
  return task;
}

export async function getHijriCalendarForYearCached(year: number): Promise<HijriCalendarRow[]> {
  return ensureYearHydrated(year, { forceVersionCheck: true });
}

export async function forceRefreshHijriCalendarYearCache(year: number): Promise<HijriCalendarRow[]> {
  return forceRefreshYear(year);
}

export async function getHijriCalendarForMonthCached(year: number, month: number): Promise<HijriCalendarRow[]> {
  const monthNumber = Number(month);
  if (!Number.isFinite(monthNumber) || monthNumber < 1 || monthNumber > 12) return [];

  const rows = await ensureYearHydrated(year, { forceVersionCheck: false });
  return rows
    .filter((row) => row.gregorian_month === monthNumber)
    .sort((a, b) => a.gregorian_day - b.gregorian_day);
}

export async function runInitialHijriCalendarWarmup(): Promise<void> {
  if (Platform.OS === 'web' || warmupStarted) return;
  warmupStarted = true;

  const now = new Date();
  const currentYear = now.getFullYear();

  void ensureYearHydrated(currentYear, { forceVersionCheck: true }).catch(() => {});
}
