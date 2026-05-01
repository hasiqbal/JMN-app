import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';
import type { NightPaletteType } from './types';
import { addSoftWrapOpportunities } from './softWrap';

type Props = {
  text: string;
  scale: number;
  night: NightPaletteType | null;
};

export function ArabicTextBlock({ text, scale, night }: Props) {
  const fontSize = Math.round(23 * scale);
  const lineHeight = Math.round(43 * scale);
  const wrappedText = React.useMemo(() => addSoftWrapOpportunities(text), [text]);
  return (
    <Text
      style={[
        styles.text,
        { fontSize, lineHeight },
        night && { color: night.text },
      ]}
    >
      {wrappedText}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
    color: Colors.textPrimary,
    fontFamily: 'IndopakNastaleeq',
    letterSpacing: 0.2,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 4,
    flexShrink: 1,
  },
});
