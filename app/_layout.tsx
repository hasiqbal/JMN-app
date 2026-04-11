import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { runInitialTranslationWarmup } from '@/services/translationWarmupService';

export default function RootLayout() {
  React.useEffect(() => {
    void runInitialTranslationWarmup();
  }, []);

  return (
    <AlertProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
