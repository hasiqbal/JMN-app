import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';
import type { NightPaletteType } from './types';

type Props = {
  text: string;
  scale: number;
  night: NightPaletteType | null;
};

export function TransliterationBlock({ text, scale, night }: Props) {
  const fontSize = Math.round(13 * scale);
  const lineHeight = Math.round(22 * scale);
  return (
    <Text
      style={[
        styles.text,
        { fontSize, lineHeight },
        night && { color: night.textMuted },
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
    color: Colors.textSubtle,
    letterSpacing: 0.3,
    fontWeight: '400',
  },
});
