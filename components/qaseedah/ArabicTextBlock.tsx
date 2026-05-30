import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';
import type { NightPaletteType } from './types';

type Props = {
  text: string;
  scale: number;
  night: NightPaletteType | null;
};

export function ArabicTextBlock({ text, scale, night }: Props) {
  const fontSize = Math.round(23 * scale);
  const lineHeight = Math.round(43 * scale);
  const safeText = React.useMemo(() => {
    // Strip invisible break markers that can disturb Arabic shaping on iOS.
    let next = text.replace(/[\u200B\uFEFF\u00AD]/g, '');
    try {
      next = next.normalize('NFC');
    } catch {
      // Keep original if runtime does not support Unicode normalization.
    }
    return next;
  }, [text]);
  return (
    <Text
      style={[
        styles.text,
        { fontSize, lineHeight },
        night && { color: night.text },
      ]}
    >
      {safeText}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'right',
    color: Colors.textPrimary,
    fontFamily: 'IndopakNastaleeq',
    letterSpacing: 0,
    writingDirection: 'rtl',
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 4,
    flexShrink: 1,
    includeFontPadding: false,
  },
});
