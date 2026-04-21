import React from 'react';
import { Stack } from 'expo-router';
import { LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { AlertProvider, InAppBannerProvider } from '@/template';
import { runInitialTranslationWarmup } from '@/services/translationWarmupService';

type ExpoNotificationsModule = typeof import('expo-notifications');

const Notifications: ExpoNotificationsModule | null =
  Platform.OS === 'web' ? null : require('expo-notifications');

if (Platform.OS !== 'web' && Notifications) {
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
    IndopakNastaleeq: require('@/assets/fonts/IndopakNastaleeq.ttf'),
    UrduNastaliq: require('@/assets/fonts/UrduNastaliq.ttf'),
    UrduNastaliqBold: require('@/assets/fonts/UrduNastaliqBold.ttf'),
  });

  React.useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const html = document.documentElement;
    const body = document.body;

    html.setAttribute('translate', 'no');
    html.classList.add('notranslate');

    if (body) {
      body.setAttribute('translate', 'no');
      body.classList.add('notranslate');
    }

    let meta = document.querySelector('meta[name="google"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'google');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'notranslate');
  }, []);

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
