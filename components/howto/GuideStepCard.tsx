import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius } from '@/constants/theme';
import type { GuideBlock } from '@/howtoguides/types';
import { pickPalette } from './palette';
import { GuideBlockList } from './GuideBlockList';
import { hasArabic } from './arabic';
import { InlineArabicText } from './GuideBodyText';

interface GuideStepCardProps {
  step: number;
  title: string;
  /** Typed blocks (preferred). */
  blocks?: GuideBlock[];
  /** Legacy freeform detail string; parsed automatically when blocks is absent. */
  detail?: string;
  /** Optional small footer note shown under the content (e.g. hadith reference). */
  note?: string;
  accentColor: string;
  isLast: boolean;
  nightMode: boolean;
  contentLanguage?: 'en' | 'ur';
  /** Optional extra content (e.g. step image list) rendered below the blocks. */
  children?: React.ReactNode;
}

/**
 * Canonical step container.
 *
 * Handles:
 *   - numbered badge (red for "Warning: …" titles, guide-accent otherwise)
 *   - title (red for warning, theme text otherwise)
 *   - content via GuideBlockList
 *   - optional footer note band
 *   - bottom divider unless it's the last step in the section
 */
export function GuideStepCard({
  step,
  title,
  blocks,
  detail,
  note,
  accentColor,
  isLast,
  nightMode,
  contentLanguage = 'en',
  children,
}: GuideStepCardProps) {
  const P = pickPalette(nightMode);
  const isWarning = /^warning[:\s]/i.test(title);
  const hasUrduTitle = hasArabic(title);
  const warningColor = nightMode ? '#FF7B7B' : '#D32F2F';
  const effectiveAccent = isWarning ? warningColor : accentColor;

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: P.border },
        isLast && styles.rowLast,
      ]}
    >
      <View style={[styles.stepNum, { backgroundColor: effectiveAccent }]}>
        <Text style={styles.stepNumText}>{step}</Text>
      </View>
      <View style={styles.contentCol}>
        {hasUrduTitle ? (
          <InlineArabicText
            text={title}
            nightMode={nightMode}
            style={[
              styles.title,
              styles.titleUrdu,
              { color: isWarning ? effectiveAccent : P.text },
            ]}
          />
        ) : (
          <Text
            style={[
              styles.title,
              { color: isWarning ? effectiveAccent : P.text },
            ]}
          >
            {title}
          </Text>
        )}
        <View
          style={[
            styles.detailWrap,
            isWarning && {
              borderWidth: 1,
              borderRadius: Radius.sm,
              padding: 10,
              backgroundColor: nightMode ? 'rgba(255,123,123,0.12)' : '#FDECEC',
              borderColor: nightMode ? 'rgba(255,123,123,0.38)' : '#F3B8B8',
            },
          ]}
        >
          <GuideBlockList
            blocks={blocks}
            detail={detail}
            nightMode={nightMode}
            contentLanguage={contentLanguage}
          />
        </View>
        {note ? (
          <View
            style={[
              styles.noteBand,
              {
                borderLeftColor: effectiveAccent + '80',
                backgroundColor: nightMode ? effectiveAccent + '12' : '#EFF5F0',
              },
            ]}
          >
            <Text style={[styles.noteText, { color: effectiveAccent }]}>{note}</Text>
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contentCol: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  titleUrdu: {
    fontFamily: 'UrduNastaliq',
    fontWeight: '400',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 24,
    letterSpacing: 0,
  },
  detailWrap: {
    gap: 8,
  },
  noteBand: {
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  noteText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
});

GuideStepCard.displayName = 'GuideStepCard';
