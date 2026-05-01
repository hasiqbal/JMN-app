import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import type { NightPaletteType } from './types';

type Props = {
  night: NightPaletteType | null;
  variant?: 'dot' | 'line';
};

export function VerseDivider({ night, variant = 'dot' }: Props) {
  const goldColor = night ? (night.gold ?? night.accent) : Colors.gold;
  const hairlineColor = night ? (night.goldHairline ?? night.border) : Colors.goldHairline;

  if (variant === 'line') {
    return <View style={[styles.line, { backgroundColor: hairlineColor }]} />;
  }
  return (
    <View style={styles.wrap}>
      <View style={[styles.hair, { backgroundColor: hairlineColor }]} />
      <View style={[styles.glyphCluster]}>
        <Text style={[styles.glyphSide, { color: goldColor }]}>❖</Text>
        <Text style={[styles.glyph, { color: goldColor }]}>❀</Text>
        <Text style={[styles.glyphSide, { color: goldColor }]}>❖</Text>
      </View>
      <View style={[styles.hair, { backgroundColor: hairlineColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: '84%',
    paddingVertical: 14,
    gap: 8,
  },
  hair: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.goldHairline,
  },
  glyphCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  glyph: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '700',
    opacity: 0.86,
  },
  glyphSide: {
    fontSize: 8,
    color: Colors.gold,
    opacity: 0.7,
  },
  line: {
    alignSelf: 'center',
    width: '60%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.goldHairline,
    marginVertical: 16,
  },
});
