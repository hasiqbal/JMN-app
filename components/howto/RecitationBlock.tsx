import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, type NativeSyntheticEvent, type TextLayoutEventData } from 'react-native';
import { Radius } from '@/constants/theme';
import { GuideType, pickPalette } from './palette';
import { shouldRenderAutoTransliteration, transliterationFromText } from './arabic';
import type { RecitationBlockData } from '@/howtoguides/types';

type GuideLearningMode = 'default' | 'salah-pilot';

const ARABIC_ORPHAN_WORD_THRESHOLD = 2;
const ARABIC_MAX_SHRINK_STEPS = 4;
const ARABIC_SHORT_LAST_LINE_RATIO = 0.42;
const ARABIC_VERY_SHORT_LAST_LINE_RATIO = 0.3;

const countWords = (value: string): number => value.trim().split(/\s+/).filter(Boolean).length;

const getArabicShrinkTarget = (lines: Array<{ text?: string; width?: number }>): number => {
  if (lines.length <= 1) return 0;

  const trailingLine = lines[lines.length - 1];
  const trailingText = trailingLine?.text?.trim() ?? '';
  const trailingWordCount = trailingText.length > 0 ? countWords(trailingText) : 0;
  if (trailingWordCount === 0) return 0;

  const widestLine = lines.reduce((maxWidth, line) => Math.max(maxWidth, line.width ?? 0), 0);
  const trailingWidthRatio = widestLine > 0 ? (trailingLine?.width ?? 0) / widestLine : 1;

  const orphanByWords = trailingWordCount <= ARABIC_ORPHAN_WORD_THRESHOLD;
  const orphanByWidth = trailingWidthRatio < ARABIC_SHORT_LAST_LINE_RATIO;
  if (!orphanByWords && !orphanByWidth) return 0;

  let target = 1;
  if (trailingWordCount === 1 || trailingWidthRatio < ARABIC_VERY_SHORT_LAST_LINE_RATIO) target += 1;
  if (lines.length >= 3) target += 1;
  if (lines.length >= 4) target += 1;

  return Math.min(target, ARABIC_MAX_SHRINK_STEPS);
};

const getArabicMinFontSize = (viewportWidth: number, denseLayout: boolean): number => {
  const baseFloor =
    viewportWidth <= 340
      ? 24
      : viewportWidth <= 380
        ? 25
        : viewportWidth <= 430
          ? 26
          : 27;
  return denseLayout ? baseFloor - 1 : baseFloor;
};

interface RecitationBlockProps extends Omit<RecitationBlockData, 'kind'> {
  nightMode: boolean;
  autoTransliteration?: boolean;
  learningMode?: GuideLearningMode;
}

const wrapLinesForDisplay = (lines: string[] | undefined, maxChars: number): string[] | undefined => {
  if (!lines || lines.length === 0) return undefined;
  return lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    return trimmed.length > maxChars ? trimmed.replace(/\s+/g, ' ') : trimmed;
  }).filter(Boolean);
};

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
  flags,
  nightMode,
  autoTransliteration = true,
  learningMode = 'default',
}: RecitationBlockProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const P = pickPalette(nightMode);
  const pilotMode = learningMode === 'salah-pilot';
  const blockTone = pilotMode
    ? {
      backgroundColor: nightMode ? '#0D1A2E' : '#F7FBF8',
      borderColor: nightMode ? '#2B476A' : '#C8DDCD',
    }
    : { backgroundColor: P.surface, borderColor: P.border };
  const labelTone = pilotMode
    ? { color: nightMode ? '#9CCBFF' : '#2F6B50' }
    : { color: P.textMuted };
  const translitTone = pilotMode
    ? {
      backgroundColor: nightMode ? '#11243C' : '#EDF5EF',
      borderTopColor: nightMode ? '#2B476A' : '#C8DDCD',
    }
    : { backgroundColor: P.surfaceAlt, borderTopColor: P.border };
  const footerBadgeTone = pilotMode
    ? {
      borderColor: nightMode ? '#35587D' : '#BFD4C3',
      backgroundColor: nightMode ? '#152A45' : '#EAF4ED',
    }
    : { borderColor: P.border, backgroundColor: P.surfaceAlt };

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

  const displayTransliteration = wrapLinesForDisplay(effectiveTranslit, 280) ?? [];
  const displayMeaning = wrapLinesForDisplay(meaning, 62);
  const denseLayout =
    arabic.length >= 4
    || arabic.join(' ').length >= 140
    || displayTransliteration.length >= 2
    || (displayMeaning?.length ?? 0) >= 5;

  const resolvedLabel = label ?? 'Recitation';
  const normalizedFlags = Array.isArray(flags)
    ? flags
    : typeof (flags as unknown) === 'string'
      ? String(flags).split(/[\n,]/)
      : [];
  const metadataBadges = [
    ...(repeat && repeat.trim().length > 0 ? [`Repeat: ${repeat.trim()}`] : []),
    ...(source && source.trim().length > 0 ? [`Source: ${source.trim()}`] : []),
    ...(normalizedFlags
      .map((flag) => flag.trim())
      .filter((flag, index, list) => flag.length > 0 && list.findIndex((item) => item.toLowerCase() === flag.toLowerCase()) === index)),
  ];
  const translitVeryLong = displayTransliteration.some((line) => line.length >= 92);
  const [arabicLineShrink, setArabicLineShrink] = React.useState<Record<number, number>>({});

  React.useEffect(() => {
    setArabicLineShrink({});
  }, [arabic, denseLayout, pilotMode]);

  const baseArabicFontSize = GuideType.arabicSize + (pilotMode ? 2 : 0) + (denseLayout ? -2 : 0);
  const baseArabicLineHeight = GuideType.arabicLineHeight + (pilotMode ? 4 : 0) + (denseLayout ? -6 : 0);
  const minArabicFontSize = getArabicMinFontSize(viewportWidth, denseLayout);
  const maxAllowedShrink = Math.max(baseArabicFontSize - minArabicFontSize, 0);

  const resolveArabicShrinkStyle = React.useCallback(
    (lineIndex: number) => {
      const requestedShrink = arabicLineShrink[lineIndex] ?? 0;
      const effectiveShrink = Math.min(requestedShrink, maxAllowedShrink);
      if (effectiveShrink <= 0) return null;

      const fontSize = baseArabicFontSize - effectiveShrink;
      return {
        fontSize,
        lineHeight: Math.max(
          baseArabicLineHeight - (effectiveShrink * 2),
          fontSize + 7,
        ),
      };
    },
    [arabicLineShrink, baseArabicFontSize, baseArabicLineHeight, maxAllowedShrink],
  );

  const handleArabicTextLayout = React.useCallback(
    (lineIndex: number) => (event: NativeSyntheticEvent<TextLayoutEventData>) => {
      const measuredLines = event.nativeEvent.lines ?? [];
      const targetShrink = Math.min(getArabicShrinkTarget(measuredLines), maxAllowedShrink);
      if (targetShrink === 0) return;

      setArabicLineShrink((prev) => {
        const currentShrink = prev[lineIndex] ?? 0;
        if (currentShrink === targetShrink) return prev;
        return { ...prev, [lineIndex]: targetShrink };
      });
    },
    [maxAllowedShrink],
  );

  return (
    <View
      style={[
        styles.block,
        pilotMode && styles.blockPilot,
        blockTone,
      ]}
    >
      {/* 1. Label */}
      <View style={[
        styles.labelWrap,
        pilotMode && styles.labelWrapPilot,
        denseLayout && styles.labelWrapDense,
        { borderBottomColor: blockTone.borderColor },
      ]}>
        <Text style={[styles.label, labelTone]}>{resolvedLabel.toUpperCase()}</Text>
      </View>

      {/* 2. Intro prose (if any) */}
      {intro ? (
        <View style={[styles.introZone, { borderBottomColor: blockTone.borderColor }]}> 
          <Text style={[styles.introText, { color: P.textSub }]}>{intro}</Text>
        </View>
      ) : null}

      {/* 3. Arabic — the honored center */}
      <View style={[
        styles.arabicZone,
        pilotMode && styles.arabicZonePilot,
        denseLayout && styles.arabicZoneDense,
        { backgroundColor: blockTone.backgroundColor },
      ]}>
        {arabic.map((line, idx) => (
          <Text
            key={`ar-${idx}`}
            onTextLayout={handleArabicTextLayout(idx)}
            style={[
              styles.arabicText,
              pilotMode && styles.arabicTextPilot,
              denseLayout && styles.arabicTextDense,
              resolveArabicShrinkStyle(idx),
              { color: P.text },
            ]}
          >
            {line}
          </Text>
        ))}
      </View>

      {/* 4. Transliteration */}
      {displayTransliteration.length > 0 ? (
        <View
          style={[
            styles.translitZone,
            denseLayout && styles.translitZoneDense,
            translitVeryLong && styles.translitZoneLong,
            translitTone,
          ]}
        >
          {displayTransliteration.map((line, idx) => (
            <Text
              key={`tl-${idx}`}
              style={[
                styles.translitText,
                denseLayout && styles.translitTextDense,
                translitVeryLong && styles.translitTextLong,
                { color: P.textSub },
              ]}
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {/* 5. Meaning */}
      {displayMeaning && displayMeaning.length > 0 ? (
        <View style={[styles.meaningZone, denseLayout && styles.meaningZoneDense, { borderTopColor: blockTone.borderColor }]}> 
          <Text style={[styles.meaningLabel, pilotMode && styles.meaningLabelPilot, labelTone]}>MEANING</Text>
          {displayMeaning.map((line, idx) => (
            <Text key={`mn-${idx}`} style={[styles.meaningText, denseLayout && styles.meaningTextDense, { color: P.text }]}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {/* 6. Repeat / source / flag footer */}
      {metadataBadges.length > 0 ? (
        <View style={[styles.footerZone, pilotMode && styles.footerZonePilot, denseLayout && styles.footerZoneDense, { borderTopColor: blockTone.borderColor }]}> 
          {metadataBadges.map((badge, index) => (
            <View key={`badge-${index}`} style={[styles.footerBadge, pilotMode && styles.footerBadgePilot, footerBadgeTone]}> 
              <Text style={[styles.footerBadgeText, { color: P.textSub }]}>{badge}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  blockPilot: {
    borderRadius: Radius.sm,
    marginHorizontal: 0,
  },
  labelWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelWrapPilot: {
    paddingTop: 12,
    paddingBottom: 9,
  },
  labelWrapDense: {
    paddingTop: 9,
    paddingBottom: 7,
    paddingHorizontal: 12,
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
  arabicZonePilot: {
    paddingVertical: 24,
    gap: 12,
  },
  arabicZoneDense: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  arabicText: {
    fontFamily: 'IndopakNastaleeq',
    writingDirection: 'rtl',
    textAlign: 'center',
    fontSize: GuideType.arabicSize,
    lineHeight: GuideType.arabicLineHeight,
  },
  arabicTextPilot: {
    fontSize: GuideType.arabicSize + 2,
    lineHeight: GuideType.arabicLineHeight + 4,
  },
  arabicTextDense: {
    fontSize: GuideType.arabicSize - 2,
    lineHeight: GuideType.arabicLineHeight - 6,
  },
  translitZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 4,
  },
  translitZoneDense: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 3,
  },
  translitZoneLong: {
    paddingHorizontal: 12,
  },
  translitText: {
    fontSize: GuideType.transliterationSize,
    lineHeight: GuideType.transliterationLineHeight,
    fontStyle: 'italic',
    textAlign: 'center',
    alignSelf: 'stretch',
    width: '100%',
    paddingHorizontal: 2,
  },
  translitTextDense: {
    fontSize: GuideType.transliterationSize - 1.5,
    lineHeight: GuideType.transliterationLineHeight - 1,
  },
  translitTextLong: {
    lineHeight: GuideType.transliterationLineHeight,
  },
  meaningZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 4,
  },
  meaningZoneDense: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 3,
  },
  meaningLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  meaningLabelPilot: {
    letterSpacing: 1.3,
  },
  meaningText: {
    fontSize: GuideType.meaningSize,
    lineHeight: GuideType.meaningLineHeight,
    textAlign: 'left',
  },
  meaningTextDense: {
    fontSize: GuideType.meaningSize - 0.5,
    lineHeight: GuideType.meaningLineHeight - 3,
  },
  footerZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  footerZonePilot: {
    gap: 7,
  },
  footerZoneDense: {
    paddingVertical: 7,
    gap: 5,
  },
  footerBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  footerBadgePilot: {
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  footerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

RecitationBlock.displayName = 'RecitationBlock';
