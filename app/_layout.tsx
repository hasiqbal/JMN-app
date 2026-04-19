import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { AlertProvider } from '@/template';
import { runInitialTranslationWarmup } from '@/services/translationWarmupService';

export default function RootLayout() {
  useFonts({
    UrduNastaliqBold: require('@/assets/fonts/UrduNastaliqBold.ttf'),
  });

  React.useEffect(() => {
    void runInitialTranslationWarmup();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AlertProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </SafeAreaProvider>
      </AlertProvider>
    </GestureHandlerRootView>
  );
}
