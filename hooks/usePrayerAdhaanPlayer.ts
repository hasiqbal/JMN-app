import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import {
  DEFAULT_ADHAAN_OPTION_ID,
  getAdhaanOptionById,
  type AdhaanOption,
} from '@/constants/prayerNotifications';

let activeAdhaanPlayer: AudioPlayer | null = null;
let previewStopTimer: ReturnType<typeof setTimeout> | null = null;
const bundledAdhaanUrisByFile = new Map<string, string | null>();
const PREVIEW_PLAYBACK_MS = 10_000;

function resolveAdhaanModule(soundFile: string) {
  switch (soundFile) {
    case '1.mp3':
      return require('../assets/audio/1.mp3');
    case '2.mp3':
      return require('../assets/audio/2.mp3');
    case '3.mp3':
      return require('../assets/audio/3.mp3');
    default:
      return require('../assets/audio/1.mp3');
  }
}

async function loadBundledAdhaanUri(soundFile: string): Promise<string | null> {
  if (bundledAdhaanUrisByFile.has(soundFile)) {
    return bundledAdhaanUrisByFile.get(soundFile) ?? null;
  }

  try {
    const moduleAsset = resolveAdhaanModule(soundFile);
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

export async function stopPrayerStartAdhaan(): Promise<void> {
  if (previewStopTimer) {
    clearTimeout(previewStopTimer);
    previewStopTimer = null;
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
  const uri = await loadBundledAdhaanUri(option.soundFile);
  if (!uri) return false;

  try {
    await setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    });
  } catch {
    return false;
  }

  await stopPrayerStartAdhaan();

  try {
    const player = createAudioPlayer({ uri }, { updateInterval: 400 });
    activeAdhaanPlayer = player;

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

    if (typeof maxDurationMs === 'number' && maxDurationMs > 0) {
      previewStopTimer = setTimeout(() => {
        if (activeAdhaanPlayer !== player) return;
        void stopPrayerStartAdhaan();
      }, maxDurationMs);
    }

    return true;
  } catch {
    await stopPrayerStartAdhaan();
    return false;
  }
}

export async function playPrayerStartAdhaan(optionId: AdhaanOption['id'] = DEFAULT_ADHAAN_OPTION_ID): Promise<boolean> {
  return await playAdhaanByOption(optionId);
}

export async function previewAdhaanOption(optionId: AdhaanOption['id']): Promise<boolean> {
  return await playAdhaanByOption(optionId, PREVIEW_PLAYBACK_MS);
}
