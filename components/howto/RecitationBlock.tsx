import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius } from '@/constants/theme';
import { GuideType, pickPalette } from './palette';
import { shouldRenderAutoTransliteration, transliterationFromText } from './arabic';
import type { RecitationBlockData } from '@/howtoguides/types';

interface RecitationBlockProps extends Omit<RecitationBlockData, 'kind'> {
  nightMode: boolean;
  autoTransliteration?: boolean;
}

/**
 * Unified devotional block — the canonical rendering for any text the user recites.
 *
 * Vertical hierarchy (top → bottom):
 *   1. LABEL         short instruction, uppercase, letter-spaced ("Recite:", "At Istilam, recite:")
 *   2. INTRO         (optional) short prose shown above the Arabic
 *   3. ARABIC        honored center — large, centered, breathing room
 *   4. TRANSLITERATION (optional) softer tinted zone, readable but quieter than Arabic
 *   5. MEANING       (optional) quieter body text with its own mini-label
 *   6. REPEAT / SOURCE (optional) small footer strip
 */
export function RecitationBlock({
  label,
  intro,
  arabic,
  transliteration,
  meaning,
  repeat,
  source,
  nightMode,
  autoTransliteration = true,
}: RecitationBlockProps) {
  const P = pickPalette(nightMode);

  // If manual transliteration wasn't provided, synthesize one from the Arabic.
  const effectiveTranslit =
    transliteration && transliteration.length > 0
      ? transliteration
      : autoTransliteration
        ? arabic
          .map((line) => {
            const auto = transliterationFromText(line);
            return shouldRenderAutoTransliteration(line, auto) ? (auto ?? '') : '';
          })
          .filter(Boolean)
        : [];

  const resolvedLabel = label ?? 'Recitation';

  return (
    <View
      style={[
        styles.block,
        { backgroundColor: P.surface, borderColor: P.border },
      ]}
    >
      {/* 1. Label */}
      <View style={[styles.labelWrap, { borderBottomColor: P.border }]}>
        <Text style={[styles.label, { color: P.textMuted }]}>{resolvedLabel.toUpperCase()}</Text>
      </View>

      {/* 2. Intro prose (if any) */}
      {intro ? (
        <View style={[styles.introZone, { borderBottomColor: P.border }]}>
          <Text style={[styles.introText, { color: P.textSub }]}>{intro}</Text>
        </View>
      ) : null}

      {/* 3. Arabic — the honored center */}
      <View style={[styles.arabicZone, { backgroundColor: P.surface }]}>
        {arabic.map((line, idx) => (
          <Text key={`ar-${idx}`} style={[styles.arabicText, { color: P.text }]}>
            {line}
          </Text>
        ))}
      </View>

      {/* 4. Transliteration */}
      {effectiveTranslit.length > 0 ? (
        <View
          style={[
            styles.translitZone,
            { backgroundColor: P.surfaceAlt, borderTopColor: P.border },
          ]}
        >
          {effectiveTranslit.map((line, idx) => (
            <Text key={`tl-${idx}`} style={[styles.translitText, { color: P.textSub }]}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {/* 5. Meaning */}
      {meaning && meaning.length > 0 ? (
        <View style={[styles.meaningZone, { borderTopColor: P.border }]}>
          <Text style={[styles.meaningLabel, { color: P.textMuted }]}>MEANING</Text>
          {meaning.map((line, idx) => (
            <Text key={`mn-${idx}`} style={[styles.meaningText, { color: P.text }]}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {/* 6. Repeat / source footer */}
      {repeat || source ? (
        <View style={[styles.footerZone, { borderTopColor: P.border }]}>
          {repeat ? (
            <Text style={[styles.footerRepeat, { color: P.textSub }]}>{repeat}</Text>
          ) : null}
          {source ? (
            <Text style={[styles.footerSource, { color: P.textMuted }]}>{source}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  labelWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: GuideType.labelSize,
    fontWeight: '700',
    letterSpacing: GuideType.labelLetterSpacing,
  },
  introZone: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  introText: {
    fontSize: GuideType.bodySize,
    lineHeight: GuideType.bodyLineHeight,
  },
  arabicZone: {
    paddingHorizontal: 18,
    paddingVertical: 22,
    gap: 10,
  },
  arabicText: {
    fontFamily: 'IndopakNastaleeq',
    writingDirection: 'rtl',
    textAlign: 'center',
    fontSize: GuideType.arabicSize,
    lineHeight: GuideType.arabicLineHeight,
  },
  translitZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 4,
  },
  translitText: {
    fontSize: GuideType.transliterationSize,
    lineHeight: GuideType.transliterationLineHeight,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  meaningZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 4,
  },
  meaningLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  meaningText: {
    fontSize: GuideType.meaningSize,
    lineHeight: GuideType.meaningLineHeight,
    textAlign: 'left',
  },
  footerZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerRepeat: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footerSource: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'right',
  },
});

RecitationBlock.displayName = 'RecitationBlock';
