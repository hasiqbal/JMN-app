import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { HADR_JUZ_TRACKS } from '@/components/stream/streamConfig';

let hadrWarmupStarted = false;
let hadrPreloadPromise: Promise<void> | null = null;

const HADR_PRELOAD_STATE_STORAGE_KEY = '@hadr_juz_preload_state_v1';

type HadrPreloadState = {
  completedAt: string | null;
  completedCount: number;
  updatedAt: string;
};

function getHadrCacheDirectory(): string | null {
  if (!FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}hadr-juz-cache`;
}

function buildHadrCacheFileUri(cacheDir: string, juz: number): string {
  return `${cacheDir}/juz-${String(juz).padStart(2, '0')}.mp3`;
}

async function readPreloadState(): Promise<HadrPreloadState | null> {
  try {
    const raw = await AsyncStorage.getItem(HADR_PRELOAD_STATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HadrPreloadState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writePreloadState(next: HadrPreloadState): Promise<void> {
  await AsyncStorage.setItem(HADR_PRELOAD_STATE_STORAGE_KEY, JSON.stringify(next));
}

async function runInitialHadrFileWarmup(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (hadrPreloadPromise) return hadrPreloadPromise;

  hadrPreloadPromise = (async () => {
    const cacheDir = getHadrCacheDirectory();
    if (!cacheDir) return;

    const remoteJuz = Array.from({ length: 30 }, (_, index) => index + 1)
      .map((juz) => ({ juz, source: HADR_JUZ_TRACKS[juz] }))
      .filter((row): row is { juz: number; source: string } => typeof row.source === 'string');

    if (!remoteJuz.length) return;

    const state = await readPreloadState();
    if (state?.completedAt && state.completedCount >= remoteJuz.length) {
      return;
    }

    await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

    let completedCount = 0;
    for (const row of remoteJuz) {
      const target = buildHadrCacheFileUri(cacheDir, row.juz);

      try {
        const info = await FileSystem.getInfoAsync(target);
        if (info.exists) {
          completedCount += 1;
          continue;
        }

        const download = await FileSystem.downloadAsync(row.source, target);
        if (download.status >= 200 && download.status < 300) {
          completedCount += 1;
        }
      } catch {
        // Keep startup resilient; stream screen can retry per Juz later.
      }
    }

    const isComplete = completedCount >= remoteJuz.length;
    await writePreloadState({
      completedAt: isComplete ? new Date().toISOString() : null,
      completedCount,
      updatedAt: new Date().toISOString(),
    });
  })().finally(() => {
    hadrPreloadPromise = null;
  });

  return hadrPreloadPromise;
}

export async function runInitialHadrWarmup(): Promise<void> {
  if (Platform.OS === 'web' || hadrWarmupStarted) return;
  hadrWarmupStarted = true;

  // Pre-configure audio once so first playback starts faster when the stream screen opens.
  void setAudioModeAsync({
    allowsRecording: false,
    shouldPlayInBackground: true,
    playsInSilentMode: true,
    shouldRouteThroughEarpiece: false,
    interruptionModeAndroid: 'doNotMix',
  }).catch(() => {});

  // Warm up remote Hadr Juz files into local cache in background on first run.
  void runInitialHadrFileWarmup().catch(() => {});
}
