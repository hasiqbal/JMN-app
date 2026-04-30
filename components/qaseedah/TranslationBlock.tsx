import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { NightPaletteType } from './types';

type Props = {
  text: string;
  scale: number;
  night: NightPaletteType | null;
  label?: string;
};

export function TranslationBlock({ text, scale, night, label = 'Meaning' }: Props) {
  const fontSize = Math.round(15 * scale);
  const lineHeight = Math.round(24 * scale);
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, night && { color: night.textMuted }]}>{label}</Text>
      <Text
        style={[
          styles.text,
          { fontSize, lineHeight },
          night && { color: night.textSub },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'stretch',
    gap: 4,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  text: {
    textAlign: 'center',
    color: Colors.textSecondary,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
});
