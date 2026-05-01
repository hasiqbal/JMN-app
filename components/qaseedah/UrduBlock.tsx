import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { NightPaletteType } from './types';
import { addSoftWrapOpportunities } from './softWrap';

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

function restoreCollapsedUrduLineBreaks(value: string): string {
  if (!value.trim()) return value;
  if (value.includes('\n')) return value;

  const markerMatches = value.match(/[۞٭❁✽✦•]/g) ?? [];
  if (markerMatches.length < 2) return value;

  return value
    .replace(/\s*([۞٭❁✽✦•])\s*/g, ' $1\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function UrduBlock({ text, scale, night }: Props) {
  const normalizedText = React.useMemo(() => {
    const glyphs = normalizeUrduGlyphs(text);
    const restored = restoreCollapsedUrduLineBreaks(glyphs);
    return addSoftWrapOpportunities(restored);
  }, [text]);
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
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
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
    fontWeight: '400',
    fontStyle: 'normal',
    writingDirection: 'rtl',
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 4,
    flexShrink: 1,
    includeFontPadding: false,
  },
});
