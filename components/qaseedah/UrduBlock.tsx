import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { NightPaletteType } from './types';

type Props = {
  text: string;
  scale: number;
  night: NightPaletteType | null;
};

export function UrduBlock({ text, scale, night }: Props) {
  const fontSize = Math.round(19 * scale);
  const lineHeight = Math.round(36 * scale);
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, night && { color: night.textMuted }]}>اردو</Text>
      <Text
        style={[
          styles.text,
          { fontSize, lineHeight },
          night && { color: night.text },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.4,
    fontWeight: '600',
    color: Colors.textSubtle,
    fontFamily: 'UrduNastaliq',
  },
  text: {
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: 'UrduNastaliq',
    writingDirection: 'rtl',
    maxWidth: 560,
  },
});
