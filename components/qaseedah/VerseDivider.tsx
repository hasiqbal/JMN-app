import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { NightPaletteType } from './types';

type Props = {
  night: NightPaletteType | null;
  variant?: 'dot' | 'line';
};

export function VerseDivider({ night, variant = 'dot' }: Props) {
  if (variant === 'line') {
    return (
      <View style={[styles.line, night && { backgroundColor: night.border }]} />
    );
  }
  return (
    <View style={styles.wrap}>
      <Text style={[styles.dots, night && { color: night.gold ?? night.textMuted }]}>﹏ ۞ ﹏</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  dots: {
    fontSize: 12,
    letterSpacing: 4,
    color: Colors.gold,
    opacity: 0.75,
  },
  line: {
    alignSelf: 'center',
    width: '45%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.goldHairline,
    marginVertical: 12,
  },
});
