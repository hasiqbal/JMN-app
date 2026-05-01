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

export function TransliterationBlock({ text, scale, night }: Props) {
  const fontSize = Math.round(13 * scale);
  const lineHeight = Math.round(22 * scale);
  const wrappedText = React.useMemo(() => addSoftWrapOpportunities(text), [text]);
  return (
    <Text
      style={[
        styles.text,
        { fontSize, lineHeight },
        night && { color: night.textMuted },
      ]}
    >
      {wrappedText}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    fontWeight: '400',
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 4,
    flexShrink: 1,
  },
});
