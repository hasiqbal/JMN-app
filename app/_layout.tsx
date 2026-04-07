import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { NightModeProvider } from '@/contexts/NightModeContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <NightModeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </NightModeProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
