import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { MUSHAF_TOTAL_PAGES, MushafLayout } from '@/constants/mushafJuzPages';

const DEFAULT_QURAN_15LINE_BASE_URL =
  'https://raw.githubusercontent.com/hasiqbal/JMN-app/main/assets/images/Quran%2015%20line%20indo-pak/Full';
const DEFAULT_QURAN_16LINE_BASE_URL =
  'https://raw.githubusercontent.com/hasiqbal/JMN-app/main/assets/images/Quran%2016%20line%20indo-pak/Full';

const QURAN_15LINE_BASE_URL =
  (process.env.EXPO_PUBLIC_QURAN_15LINE_BASE_URL || DEFAULT_QURAN_15LINE_BASE_URL).replace(/\/+$/, '');
const QURAN_16LINE_BASE_URL =
  (process.env.EXPO_PUBLIC_QURAN_16LINE_BASE_URL || DEFAULT_QURAN_16LINE_BASE_URL).replace(/\/+$/, '');

const QURAN_PRELOAD_STATE_STORAGE_KEY = '@quran_page_preload_state_v1';

export type QuranPreloadState = {
  totalPages: number;
  processedPages: number;
  completedPages: number;
  inProgress: boolean;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

let warmupPromise: Promise<void> | null = null;

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
  const base = mushaf === '16line' ? QURAN_16LINE_BASE_URL : QURAN_15LINE_BASE_URL;
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

async function savePreloadState(partial: Partial<QuranPreloadState>): Promise<void> {
  const existing = await getQuranPreloadState();
  const next: QuranPreloadState = {
    totalPages: existing?.totalPages ?? (MUSHAF_TOTAL_PAGES['15line'] + MUSHAF_TOTAL_PAGES['16line']),
    processedPages: existing?.processedPages ?? 0,
    completedPages: existing?.completedPages ?? 0,
    inProgress: existing?.inProgress ?? false,
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
  const existing = await FileSystem.getInfoAsync(target);
  if (existing.exists) {
    return target;
  }

  await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  await FileSystem.downloadAsync(getRemoteQuranPageUrl(mushaf, pageZeroBased), target);
  return target;
}

export function runInitialQuranPageWarmup(): Promise<void> {
  if (Platform.OS === 'web') {
    return Promise.resolve();
  }

  if (warmupPromise) {
    return warmupPromise;
  }

  warmupPromise = (async () => {
    const totalPages = MUSHAF_TOTAL_PAGES['15line'] + MUSHAF_TOTAL_PAGES['16line'];
    const state = await getQuranPreloadState();
    if (state?.completedAt) {
      return;
    }

    const startedAt = state?.startedAt ?? new Date().toISOString();
    let processedPages = state?.processedPages ?? 0;
    let completedPages = state?.completedPages ?? 0;

    await savePreloadState({
      totalPages,
      startedAt,
      inProgress: true,
      completedAt: null,
      processedPages,
      completedPages,
    });

    const saveCheckpoint = async () => {
      await savePreloadState({
        totalPages,
        startedAt,
        inProgress: true,
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

      await savePreloadState({
        totalPages,
        startedAt,
        inProgress: false,
        completedAt: new Date().toISOString(),
        processedPages,
        completedPages,
      });
    } catch {
      await savePreloadState({
        totalPages,
        startedAt,
        inProgress: false,
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
