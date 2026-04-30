import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius } from '@/constants/theme';
import { GuideType, pickPalette, GUIDE_NIGHT_PALETTE } from './palette';
import {
  ARABIC_SEGMENT_REGEX,
  hasArabic,
  shouldRenderAutoTransliteration,
  transliterationFromText,
} from './arabic';

type GuideLearningMode = 'default' | 'salah-pilot';

interface InlineArabicTextProps {
  text: string;
  style?: any;
  nightMode?: boolean;
}

/** Render a string that may contain mixed Arabic + Latin, keeping Arabic visually honored inline. */
export function InlineArabicText({ text, style, nightMode }: InlineArabicTextProps) {
  const N = nightMode ? GUIDE_NIGHT_PALETTE : null;
  const chunks = text.split(ARABIC_SEGMENT_REGEX);

  return (
    <Text style={style}>
      {chunks.map((chunk, idx) => {
        if (!chunk) return null;
        if (hasArabic(chunk)) {
          return (
            <Text key={`ar-${idx}`} style={[styles.arabicInline, N && { color: N.text }]}>
              {chunk}
            </Text>
          );
        }
        return <React.Fragment key={`tx-${idx}`}>{chunk}</React.Fragment>;
      })}
    </Text>
  );
}

interface GuideBodyTextProps {
  text: string;
  nightMode: boolean;
  /** Auto-render detected Arabic token transliterations below the text. Defaults to true. */
  autoTransliteration?: boolean;
  learningMode?: GuideLearningMode;
}

/**
 * Plain guide body text. Renders inline Arabic in Nastaleeq and shows an auto-transliteration
 * footer when the line contains Arabic that isn't already transliterated.
 */
export function GuideBodyText({
  text,
  nightMode,
  autoTransliteration = true,
  learningMode = 'default',
}: GuideBodyTextProps) {
  const P = pickPalette(nightMode);
  const translit = autoTransliteration ? transliterationFromText(text) : null;
  const showTranslit = Boolean(translit) && shouldRenderAutoTransliteration(text, translit);

  return (
    <View style={styles.bodyWrap}>
      <InlineArabicText
        text={text}
        nightMode={nightMode}
        style={[styles.bodyText, learningMode === 'salah-pilot' && styles.bodyTextPilot, { color: P.textSub }]}
      />
      {showTranslit ? (
        <Text style={[styles.bodyTransliteration, { color: P.textSub }]}>{translit}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bodyWrap: {
    gap: 4,
  },
  bodyText: {
    fontSize: GuideType.bodySize,
    lineHeight: GuideType.bodyLineHeight,
    fontWeight: '400',
  },
  bodyTextPilot: {
    fontSize: GuideType.bodySize + 0.3,
    lineHeight: GuideType.bodyLineHeight + 1,
  },
  bodyTransliteration: {
    fontSize: 12,
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  arabicInline: {
    fontFamily: 'UrduNastaliq',
    fontWeight: '400',
    fontSize: GuideType.arabicInlineSize,
    lineHeight: GuideType.arabicInlineLineHeight,
  },
});

InlineArabicText.displayName = 'InlineArabicText';
GuideBodyText.displayName = 'GuideBodyText';

// Local radii kept implicit via Radius import for consumers if needed.
export { Radius };
