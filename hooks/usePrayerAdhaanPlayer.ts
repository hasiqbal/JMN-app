import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

let activeAdhaanPlayer: AudioPlayer | null = null;
let bundledAdhaanUri: string | null = null;

async function loadBundledAdhaanUri(): Promise<string | null> {
  if (bundledAdhaanUri) return bundledAdhaanUri;

  try {
    const moduleAsset = require('../assets/audio/adhaan_1.mp3');
    const asset = Asset.fromModule(moduleAsset);
    if (!asset.downloaded) {
      await asset.downloadAsync();
    }

    bundledAdhaanUri = asset.localUri ?? asset.uri ?? null;
    return bundledAdhaanUri;
  } catch {
    return null;
  }
}

export async function stopPrayerStartAdhaan(): Promise<void> {
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

export async function playPrayerStartAdhaan(): Promise<boolean> {
  const uri = await loadBundledAdhaanUri();
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
    return true;
  } catch {
    await stopPrayerStartAdhaan();
    return false;
  }
}
