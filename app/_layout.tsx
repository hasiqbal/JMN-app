import React from 'react';
import { Stack } from 'expo-router';
import { LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { AlertProvider, InAppBannerProvider } from '@/template';
import { runInitialTranslationWarmup } from '@/services/translationWarmupService';
import { prewarmQaseedahAndHowToCaches } from '@/services/contentService';
import { runInitialHadrWarmup } from '@/services/hadrWarmupService';
import { NightModeProvider } from '@/contexts/NightModeContext';
import { AppThemeProvider } from '@/contexts/AppThemeContext';
import { PRAYER_NOTIFICATION_SCOPE } from '@/constants/prayerNotifications';

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
    void prewarmQaseedahAndHowToCaches();
    void runInitialHadrWarmup();
  }, []);

  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;

    const configureNotificationHandler = async () => {
      try {
        const notifications = await import('expo-notifications');
        if (cancelled) return;

        notifications.setNotificationHandler({
          handleNotification: async (notification) => {
            const data = notification.request.content.data as Record<string, unknown> | undefined;
            const scope = typeof data?.scope === 'string' ? data.scope : '';
            const type = typeof data?.type === 'string' ? data.type : '';
            const suppressForegroundSound = scope === PRAYER_NOTIFICATION_SCOPE
              && (
                type === 'prayer-start'
                || type === 'iqamah-start'
                || type === 'jamaat-10'
                || type === 'jamaat-start'
              );

            return {
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: !suppressForegroundSound,
              shouldSetBadge: false,
              shouldVibrate: true,
            };
          },
        });

        if (Platform.OS === 'android') {
          await notifications.setNotificationChannelAsync('jmn-general-v2', {
            name: 'JMN General Alerts',
            importance: notifications.AndroidImportance.HIGH,
            enableVibrate: true,
            vibrationPattern: [0, 250, 150, 250],
            lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
            sound: 'default',
          }).catch(() => {});
        }
      } catch {
        // Keep app startup resilient when notifications module is unavailable.
      }
    };

    void configureNotificationHandler();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AlertProvider>
        <SafeAreaProvider>
          <AppThemeProvider>
            <NightModeProvider>
              <InAppBannerProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </InAppBannerProvider>
            </NightModeProvider>
          </AppThemeProvider>
        </SafeAreaProvider>
      </AlertProvider>
    </GestureHandlerRootView>
  );
}
