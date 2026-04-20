import React from 'react';
import { Stack } from 'expo-router';
import { LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { AlertProvider, InAppBannerProvider } from '@/template';
import { runInitialTranslationWarmup } from '@/services/translationWarmupService';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

LogBox.ignoreLogs([
  'props.pointerEvents is deprecated. Use style.pointerEvents',
  '"shadow*" style props are deprecated. Use "boxShadow".',
  '"textShadow*" style props are deprecated. Use "textShadow".',
  'Cannot pipe to a closed or destroyed stream',
]);

export default function RootLayout() {
  useFonts({
    UrduNastaliq: require('@/assets/fonts/UrduNastaliq.ttf'),
    UrduNastaliqBold: require('@/assets/fonts/UrduNastaliqBold.ttf'),
  });

  React.useEffect(() => {
    void runInitialTranslationWarmup();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AlertProvider>
        <SafeAreaProvider>
          <InAppBannerProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
            </Stack>
          </InAppBannerProvider>
        </SafeAreaProvider>
      </AlertProvider>
    </GestureHandlerRootView>
  );
}
