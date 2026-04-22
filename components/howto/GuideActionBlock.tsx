import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius } from '@/constants/theme';
import { pickPalette } from './palette';
import { InlineArabicText } from './GuideBodyText';

interface GuideActionBlockProps {
  /** Optional short label such as "Action", "Do this", "Next". */
  label?: string;
  /** The instruction text (what to do, not what to say). */
  text: string;
  nightMode: boolean;
}

/**
 * Reusable action-instruction block. Use for pure "what to do" content that is not recitation
 * and not a highlighted fiqh note — e.g. "Make intention in the heart", "Face the Ka'bah".
 *
 * Styled as a quiet bordered card so it's visually distinct from RecitationBlock and GuideNote
 * but doesn't compete with them.
 */
export function GuideActionBlock({ label, text, nightMode }: GuideActionBlockProps) {
  const P = pickPalette(nightMode);

  return (
    <View
      style={[
        styles.block,
        { backgroundColor: P.surface, borderColor: P.border },
      ]}
    >
      {label ? (
        <Text style={[styles.label, { color: P.textMuted }]}>{label.toUpperCase()}</Text>
      ) : null}
      <InlineArabicText
        text={text}
        nightMode={nightMode}
        style={[styles.text, { color: P.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#B8C2CF',
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  text: {
    fontSize: 13.5,
    lineHeight: 20,
  },
});

GuideActionBlock.displayName = 'GuideActionBlock';
