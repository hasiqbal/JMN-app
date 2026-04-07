import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';

const NIGHT = {
  bg: '#0A0F1E',
  text: '#EEF3FC',
  textSub: '#93B4D8',
};

export default function QuranScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const N = nightMode ? NIGHT : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: N ? N.bg : Colors.background }]}>
      <Text style={[styles.title, N && { color: N.text }]}>Quran</Text>
      <Text style={[styles.sub, N && { color: N.textSub }]}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    color: Colors.textSubtle,
  },
});
