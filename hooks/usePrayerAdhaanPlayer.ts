import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import {
  IQAMAH_SOUND_FILE,
  DEFAULT_ADHAAN_OPTION_ID,
  getAdhaanOptionById,
  type AdhaanOption,
} from '@/constants/prayerNotifications';

type ExpoAudioModule = typeof import('expo-audio');
type VolumeManagerModule = typeof import('react-native-volume-manager');
type AudioPlayer = ReturnType<ExpoAudioModule['createAudioPlayer']>;

let activeAdhaanPlayer: AudioPlayer | null = null;
let previewStopTimer: ReturnType<typeof setTimeout> | null = null;
let volumeStopSubscription: { remove: () => void } | null = null;
const bundledAdhaanUrisByFile = new Map<string, string | null>();
const PREVIEW_PLAYBACK_MS = 10_000;
const ADHAAN_DEBUG_TAG = '[ADHAAN_DEBUG]';
let expoAudioModulePromise: Promise<ExpoAudioModule | null> | null = null;
let volumeManagerModulePromise: Promise<VolumeManagerModule | null> | null = null;

function logAdhaanDebug(stage: string, payload: Record<string, unknown> = {}): void {
  const event = {
    ts: new Date().toISOString(),
    stage,
    ...payload,
  };

  try {
    console.log(`${ADHAAN_DEBUG_TAG} ${JSON.stringify(event)}`);
  } catch {
    console.log(ADHAAN_DEBUG_TAG, stage);
  }
}

function resolveAudioModule(soundFile: string) {
  switch (soundFile) {
    case 'adhaan_1.mp3':
      return require('../assets/audio/adhaan_1.mp3');
    case 'adhaan_1_v2.mp3':
      return require('../assets/audio/adhaan_1_v2.mp3');
    case 'adhaan_2.mp3':
      return require('../assets/audio/adhaan_2.mp3');
    case 'adhaan_2_v2.mp3':
      return require('../assets/audio/adhaan_2_v2.mp3');
    case 'adhaan_3.mp3':
      return require('../assets/audio/adhaan_3.mp3');
    case 'adhaan_3_v2.mp3':
      return require('../assets/audio/adhaan_3_v2.mp3');
    case 'iqamah_new.mp3':
      return require('../assets/audio/iqamah_new.mp3');
    default:
      return require('../assets/audio/adhaan_1.mp3');
  }
}

async function getExpoAudioModule(): Promise<ExpoAudioModule | null> {
  if (Platform.OS === 'web') return null;

  if (!expoAudioModulePromise) {
    expoAudioModulePromise = import('expo-audio')
      .then((module) => module)
      .catch(() => null);
  }

  return expoAudioModulePromise;
}

async function getVolumeManagerModule(): Promise<VolumeManagerModule | null> {
  if (Platform.OS === 'web') return null;

  if (!volumeManagerModulePromise) {
    volumeManagerModulePromise = import('react-native-volume-manager')
      .then((module) => module)
      .catch(() => null);
  }

  return volumeManagerModulePromise;
}

async function loadBundledAdhaanUri(soundFile: string): Promise<string | null> {
  if (bundledAdhaanUrisByFile.has(soundFile)) {
    return bundledAdhaanUrisByFile.get(soundFile) ?? null;
  }

  try {
    const moduleAsset = resolveAudioModule(soundFile);
    const asset = Asset.fromModule(moduleAsset);
    if (!asset.downloaded) {
      await asset.downloadAsync();
    }

    const uri = asset.localUri ?? asset.uri ?? null;
    bundledAdhaanUrisByFile.set(soundFile, uri);
    return uri;
  } catch {
    bundledAdhaanUrisByFile.set(soundFile, null);
    return null;
  }
}

async function attachVolumeButtonStopListener(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (volumeStopSubscription) return;

  const volumeManagerModule = await getVolumeManagerModule();
  const addVolumeListener = volumeManagerModule?.VolumeManager?.addVolumeListener;
  if (typeof addVolumeListener !== 'function') return;

  try {
    volumeStopSubscription = addVolumeListener(() => {
      void stopPrayerStartAdhaan();
    });
  } catch {
    volumeStopSubscription = null;
  }
}

export async function stopPrayerStartAdhaan(): Promise<void> {
  if (previewStopTimer) {
    clearTimeout(previewStopTimer);
    previewStopTimer = null;
  }

  if (volumeStopSubscription) {
    try {
      volumeStopSubscription.remove();
    } catch {
      // Ignore listener cleanup failures.
    }
    volumeStopSubscription = null;
  }

  const player = activeAdhaanPlayer;
  activeAdhaanPlayer = null;
  if (!player) return;

  try {
    player.pause();
  } catch {
    // Ignore pause failures and continue cleanup.
  }

  try {
    player.remove();
  } catch {
    // Ignore cleanup failures on unsupported devices.
  }
}

async function playAdhaanByOption(optionId: AdhaanOption['id'], maxDurationMs?: number): Promise<boolean> {
  const option = getAdhaanOptionById(optionId);
  return await playPrayerAudioBySoundFile(option.soundFile, maxDurationMs);
}

async function playPrayerAudioBySoundFile(soundFile: string, maxDurationMs?: number): Promise<boolean> {
  const uri = await loadBundledAdhaanUri(soundFile);
  if (!uri) {
    logAdhaanDebug('audio-uri-missing', { soundFile });
    return false;
  }

  const expoAudio = await getExpoAudioModule();
  if (!expoAudio) {
    logAdhaanDebug('audio-module-missing', { soundFile });
    return false;
  }

  logAdhaanDebug('audio-resolved', {
    soundFile,
    uri,
    maxDurationMs: typeof maxDurationMs === 'number' ? maxDurationMs : null,
  });

  try {
    await expoAudio.setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    });
  } catch {
    logAdhaanDebug('audio-mode-config-failed', { soundFile });
    return false;
  }

  await stopPrayerStartAdhaan();

  try {
    const player = expoAudio.createAudioPlayer({ uri }, { updateInterval: 400 });
    activeAdhaanPlayer = player;
    void attachVolumeButtonStopListener();

    player.addListener('playbackStatusUpdate', (status) => {
      if (activeAdhaanPlayer !== player) return;
      if (!(status as { didJustFinish?: boolean }).didJustFinish) return;

      try {
        player.remove();
      } catch {
        // Ignore cleanup failures during natural completion.
      }

      if (activeAdhaanPlayer === player) {
        activeAdhaanPlayer = null;
      }
    });

    player.play();
    logAdhaanDebug('audio-play-started', { soundFile, uri });

    if (typeof maxDurationMs === 'number' && maxDurationMs > 0) {
      previewStopTimer = setTimeout(() => {
        if (activeAdhaanPlayer !== player) return;
        void stopPrayerStartAdhaan();
      }, maxDurationMs);
    }

    return true;
  } catch {
    logAdhaanDebug('audio-play-failed', { soundFile });
    await stopPrayerStartAdhaan();
    return false;
  }
}

export async function playPrayerStartAdhaan(optionId: AdhaanOption['id'] = DEFAULT_ADHAAN_OPTION_ID): Promise<boolean> {
  return await playAdhaanByOption(optionId);
}

export async function playIqamah(): Promise<boolean> {
  return await playPrayerAudioBySoundFile(IQAMAH_SOUND_FILE);
}

export async function previewAdhaanOption(optionId: AdhaanOption['id']): Promise<boolean> {
  return await playAdhaanByOption(optionId, PREVIEW_PLAYBACK_MS);
}
