import { Asset } from 'expo-asset';
import { setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

const HADR_JUZ_ASSETS: number[] = [
  require('../assets/quran-hadr/juz-01.mp3'),
  require('../assets/quran-hadr/juz-02.mp3'),
  require('../assets/quran-hadr/juz-03.mp3'),
  require('../assets/quran-hadr/juz-04.mp3'),
  require('../assets/quran-hadr/juz-05.mp3'),
  require('../assets/quran-hadr/juz-06.mp3'),
  require('../assets/quran-hadr/juz-07.mp3'),
  require('../assets/quran-hadr/juz-08.mp3'),
  require('../assets/quran-hadr/juz-09.mp3'),
  require('../assets/quran-hadr/juz-10.mp3'),
  require('../assets/quran-hadr/juz-11.mp3'),
  require('../assets/quran-hadr/juz-12.mp3'),
  require('../assets/quran-hadr/juz-13.mp3'),
  require('../assets/quran-hadr/juz-14.mp3'),
  require('../assets/quran-hadr/juz-15.mp3'),
  require('../assets/quran-hadr/juz-16.mp3'),
  require('../assets/quran-hadr/juz-17.mp3'),
  require('../assets/quran-hadr/juz-18.mp3'),
  require('../assets/quran-hadr/juz-19.mp3'),
  require('../assets/quran-hadr/juz-20.mp3'),
  require('../assets/quran-hadr/juz-21.mp3'),
  require('../assets/quran-hadr/juz-22.mp3'),
  require('../assets/quran-hadr/juz-23.mp3'),
  require('../assets/quran-hadr/juz-24.mp3'),
  require('../assets/quran-hadr/juz-25.mp3'),
  require('../assets/quran-hadr/juz-26.mp3'),
  require('../assets/quran-hadr/juz-27.mp3'),
  require('../assets/quran-hadr/juz-28.mp3'),
  require('../assets/quran-hadr/juz-29.mp3'),
  require('../assets/quran-hadr/juz-30.mp3'),
];

let hadrWarmupStarted = false;

async function warmSingleAsset(source: number): Promise<void> {
  const asset = Asset.fromModule(source);
  if (asset.localUri) return;
  await asset.downloadAsync().catch(() => {});
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

  // Warm assets in small batches to avoid heavy startup contention on slower phones.
  const batchSize = 4;
  for (let i = 0; i < HADR_JUZ_ASSETS.length; i += batchSize) {
    const batch = HADR_JUZ_ASSETS.slice(i, i + batchSize);
    await Promise.allSettled(batch.map((source) => warmSingleAsset(source)));
  }
}
