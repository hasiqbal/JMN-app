import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { NightPaletteType } from './types';

type Props = {
  text: string;
  scale: number;
  night: NightPaletteType | null;
};

function normalizeUrduGlyphs(value: string): string {
  return value
    .replace(/\u064A/g, '\u06CC')
    .replace(/\u0649/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/\u0629/g, '\u06C1');
}

export function UrduBlock({ text, scale, night }: Props) {
  const normalizedText = React.useMemo(() => normalizeUrduGlyphs(text), [text]);
  const fontSize = Math.round(17 * scale);
  const lineHeight = Math.round(31 * scale);
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
        {normalizedText}
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
    textAlign: 'right',
    color: Colors.textPrimary,
    fontFamily: 'UrduNastaliq',
    fontWeight: '400',
    fontStyle: 'normal',
    writingDirection: 'rtl',
    maxWidth: 560,
    width: '100%',
    includeFontPadding: false,
  },
});
