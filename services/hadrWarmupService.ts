import { setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

let hadrWarmupStarted = false;

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

  // Hadr uses remote URLs, so there are no bundled local Juz assets to warm here.
}
