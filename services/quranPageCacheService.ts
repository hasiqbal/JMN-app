import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { MUSHAF_TOTAL_PAGES, MushafLayout } from '@/constants/mushafJuzPages';

const LEGACY_QURAN_15LINE_BASE_URL =
  'https://raw.githubusercontent.com/hasiqbal/JMN-app/main/assets/images/Quran%2015%20line%20indo-pak/Full';
const LEGACY_QURAN_16LINE_BASE_URL =
  'https://raw.githubusercontent.com/hasiqbal/JMN-app/main/assets/images/Quran%2016%20line%20indo-pak/Full';

const QURAN_PRELOAD_STATE_STORAGE_KEY = '@quran_page_preload_state_v1';
type WarmupMode = 'auto' | 'manual';

export type QuranPreloadState = {
  totalPages: number;
  processedPages: number;
  completedPages: number;
  inProgress: boolean;
  autoWarmupAttempted: boolean;
  autoWarmupAttemptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

let warmupPromise: Promise<void> | null = null;
let hasLoggedLegacySourceWarning = false;
const inFlightPageDownloads = new Map<string, Promise<string>>();
const ensuredCacheDirectories = new Set<string>();

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function getQuranPagesBaseUrl(mushaf: MushafLayout): string {
  const directBase =
    mushaf === '16line'
      ? process.env.EXPO_PUBLIC_QURAN_16LINE_BASE_URL
      : process.env.EXPO_PUBLIC_QURAN_15LINE_BASE_URL;

  if (directBase?.trim()) {
    return trimTrailingSlash(directBase.trim());
  }

  const sharedCdnBase = process.env.EXPO_PUBLIC_QURAN_PAGES_CDN_BASE_URL?.trim();
  if (sharedCdnBase) {
    return `${trimTrailingSlash(sharedCdnBase)}/${mushaf}`;
  }

  if (__DEV__) {
    if (!hasLoggedLegacySourceWarning) {
      hasLoggedLegacySourceWarning = true;
      console.warn(
        '[QuranPageCache] Falling back to legacy GitHub raw URLs in development. Configure EXPO_PUBLIC_QURAN_PAGES_CDN_BASE_URL or EXPO_PUBLIC_QURAN_15LINE_BASE_URL/EXPO_PUBLIC_QURAN_16LINE_BASE_URL before release.',
      );
    }
    return mushaf === '16line' ? LEGACY_QURAN_16LINE_BASE_URL : LEGACY_QURAN_15LINE_BASE_URL;
  }

  throw new Error(
    'Quran pages source is not configured. Set EXPO_PUBLIC_QURAN_PAGES_CDN_BASE_URL or EXPO_PUBLIC_QURAN_15LINE_BASE_URL/EXPO_PUBLIC_QURAN_16LINE_BASE_URL.',
  );
}

function getMushafPageFileNumber(mushaf: MushafLayout, pageZeroBased: number): number {
  const pageOneBased = pageZeroBased + 1;
  if (mushaf === '15line' && pageOneBased <= 2) {
    // Preserve the existing special mapping where pages 1 and 2 both use 2.jpg.
    return 2;
  }
  return pageOneBased;
}

function getRemoteQuranPageUrl(mushaf: MushafLayout, pageZeroBased: number): string {
  const fileNumber = getMushafPageFileNumber(mushaf, pageZeroBased);
  const base = getQuranPagesBaseUrl(mushaf);
  return `${base}/${fileNumber}.jpg`;
}

function getRootDirectory(): string {
  const root = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!root) {
    throw new Error('No writable filesystem directory available for Quran page cache.');
  }
  return root;
}

function getCachedPagePath(mushaf: MushafLayout, pageZeroBased: number): string {
  const root = getRootDirectory();
  const fileNumber = getMushafPageFileNumber(mushaf, pageZeroBased);
  return `${root}quran-pages/${mushaf}/${fileNumber}.jpg`;
}

function getPageDownloadKey(mushaf: MushafLayout, pageZeroBased: number): string {
  return `${mushaf}:${getMushafPageFileNumber(mushaf, pageZeroBased)}`;
}

async function getLocalCachedPageCount(): Promise<{ totalPages: number; cachedPages: number }> {
  let cachedPages = 0;
  const layouts: MushafLayout[] = ['15line', '16line'];
  const totalPages = MUSHAF_TOTAL_PAGES['15line'] + MUSHAF_TOTAL_PAGES['16line'];

  for (const layout of layouts) {
    for (let page = 0; page < MUSHAF_TOTAL_PAGES[layout]; page += 1) {
      const target = getCachedPagePath(layout, page);
      try {
        const info = await FileSystem.getInfoAsync(target);
        if (info.exists) {
          cachedPages += 1;
        }
      } catch {
        // Ignore per-file filesystem errors and continue counting.
      }
    }
  }

  return { totalPages, cachedPages };
}

async function ensureCacheDirectory(dirPath: string): Promise<void> {
  if (ensuredCacheDirectories.has(dirPath)) return;
  await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  ensuredCacheDirectories.add(dirPath);
}

async function savePreloadState(partial: Partial<QuranPreloadState>): Promise<void> {
  const existing = await getQuranPreloadState();
  const next: QuranPreloadState = {
    totalPages: existing?.totalPages ?? (MUSHAF_TOTAL_PAGES['15line'] + MUSHAF_TOTAL_PAGES['16line']),
    processedPages: existing?.processedPages ?? 0,
    completedPages: existing?.completedPages ?? 0,
    inProgress: existing?.inProgress ?? false,
    autoWarmupAttempted: existing?.autoWarmupAttempted ?? false,
    autoWarmupAttemptedAt: existing?.autoWarmupAttemptedAt ?? null,
    startedAt: existing?.startedAt ?? null,
    completedAt: existing?.completedAt ?? null,
    updatedAt: new Date().toISOString(),
    ...partial,
  };

  await AsyncStorage.setItem(QURAN_PRELOAD_STATE_STORAGE_KEY, JSON.stringify(next));
}

export async function getQuranPreloadState(): Promise<QuranPreloadState | null> {
  try {
    const raw = await AsyncStorage.getItem(QURAN_PRELOAD_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuranPreloadState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCachedQuranPageUri(mushaf: MushafLayout, pageZeroBased: number): Promise<string> {
  const dirPath = `${getRootDirectory()}quran-pages/${mushaf}`;
  const target = getCachedPagePath(mushaf, pageZeroBased);
  const downloadKey = getPageDownloadKey(mushaf, pageZeroBased);

  const existing = await FileSystem.getInfoAsync(target);
  if (existing.exists) {
    ensuredCacheDirectories.add(dirPath);
    return target;
  }

  const activeDownload = inFlightPageDownloads.get(downloadKey);
  if (activeDownload) {
    return activeDownload;
  }

  const nextDownload = (async () => {
    await ensureCacheDirectory(dirPath);

    // Re-check after awaiting directory setup to avoid duplicate downloads when
    // another caller completed the same file while this request was waiting.
    const latest = await FileSystem.getInfoAsync(target);
    if (latest.exists) {
      return target;
    }

    await FileSystem.downloadAsync(getRemoteQuranPageUrl(mushaf, pageZeroBased), target);
    return target;
  })();

  inFlightPageDownloads.set(downloadKey, nextDownload);

  try {
    return await nextDownload;
  } finally {
    if (inFlightPageDownloads.get(downloadKey) === nextDownload) {
      inFlightPageDownloads.delete(downloadKey);
    }
  }
}

export function runInitialQuranPageWarmup(mode: WarmupMode = 'manual'): Promise<void> {
  if (Platform.OS === 'web') {
    return Promise.resolve();
  }

  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = (async () => {
    const totalPages = MUSHAF_TOTAL_PAGES['15line'] + MUSHAF_TOTAL_PAGES['16line'];
    const state = await getQuranPreloadState();
    const isAlreadyComplete = Boolean(state?.completedAt) && (state?.completedPages ?? 0) >= totalPages;
    if (isAlreadyComplete) {
      return;
    }

    // If all files already exist locally, mark warmup complete without entering
    // in-progress download mode.
    const local = await getLocalCachedPageCount();
    if (local.cachedPages >= local.totalPages) {
      const completedAt = new Date().toISOString();
      await savePreloadState({
        totalPages: local.totalPages,
        processedPages: local.totalPages,
        completedPages: local.totalPages,
        inProgress: false,
        autoWarmupAttempted: mode === 'auto' ? true : (state?.autoWarmupAttempted ?? false),
        autoWarmupAttemptedAt: mode === 'auto'
          ? (state?.autoWarmupAttemptedAt ?? completedAt)
          : (state?.autoWarmupAttemptedAt ?? null),
        startedAt: state?.startedAt ?? completedAt,
        completedAt,
      });
      return;
    }

    // Auto-warmup should run only once after install to avoid repeated startup network load.
    if (mode === 'auto' && state?.autoWarmupAttempted) {
      return;
    }

    const startedAt = new Date().toISOString();
    let processedPages = 0;
    let completedPages = 0;

    await savePreloadState({
      totalPages,
      startedAt,
      inProgress: true,
      autoWarmupAttempted: mode === 'auto' ? true : (state?.autoWarmupAttempted ?? false),
      autoWarmupAttemptedAt: mode === 'auto' ? startedAt : (state?.autoWarmupAttemptedAt ?? null),
      completedAt: null,
      processedPages,
      completedPages,
    });

    const saveCheckpoint = async () => {
      await savePreloadState({
        totalPages,
        startedAt,
        inProgress: true,
        autoWarmupAttempted: mode === 'auto' ? true : (state?.autoWarmupAttempted ?? false),
        autoWarmupAttemptedAt: mode === 'auto' ? startedAt : (state?.autoWarmupAttemptedAt ?? null),
        completedAt: null,
        processedPages,
        completedPages,
      });
    };

    try {
      const layouts: MushafLayout[] = ['15line', '16line'];

      for (const layout of layouts) {
        for (let page = 0; page < MUSHAF_TOTAL_PAGES[layout]; page += 1) {
          try {
            await getCachedQuranPageUri(layout, page);
            completedPages += 1;
          } catch {
            // Keep warmup resilient; individual pages can still lazy-download later.
          } finally {
            processedPages += 1;
            if (processedPages % 10 === 0) {
              await saveCheckpoint();
            }
          }
        }
      }

      const completedAt = completedPages >= totalPages ? new Date().toISOString() : null;
      await savePreloadState({
        totalPages,
        startedAt,
        inProgress: false,
        autoWarmupAttempted: mode === 'auto' ? true : (state?.autoWarmupAttempted ?? false),
        autoWarmupAttemptedAt: mode === 'auto' ? startedAt : (state?.autoWarmupAttemptedAt ?? null),
        completedAt,
        processedPages,
        completedPages,
      });
    } catch {
      await savePreloadState({
        totalPages,
        startedAt,
        inProgress: false,
        autoWarmupAttempted: mode === 'auto' ? true : (state?.autoWarmupAttempted ?? false),
        autoWarmupAttemptedAt: mode === 'auto' ? startedAt : (state?.autoWarmupAttemptedAt ?? null),
        completedAt: null,
        processedPages,
        completedPages,
      });
    }
  })().finally(() => {
    warmupPromise = null;
  });

  return warmupPromise;
}
