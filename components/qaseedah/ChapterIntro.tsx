import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import type { NightPaletteType } from './types';

type Props = {
  chapter: string;
  chapterUrdu?: string;
  chapterArabic?: string;
  entryTitle: string;
  lineCount: number;
  contentType?: 'naat' | 'qaseedah';
  isOpen: boolean;
  onToggle: () => void;
  isPoem?: boolean;
  night: NightPaletteType | null;
};

export function ChapterIntro({ chapter, chapterUrdu, chapterArabic, entryTitle, lineCount, contentType = 'qaseedah', isOpen, onToggle, isPoem, night }: Props) {
  const isNaat = contentType === 'naat';
  const accent = night
    ? (isNaat ? 'rgba(130, 189, 237, 0.88)' : 'rgba(133, 204, 165, 0.88)')
    : (isNaat ? 'rgba(33, 102, 153, 0.74)' : 'rgba(40, 122, 77, 0.72)');
  const typeInk = night ? (isNaat ? '#cfe9ff' : '#d2f5de') : (isNaat ? '#1c5d8d' : '#1f6a43');
  const subtleText = night ? night.textMuted : Colors.textSubtle;
  const unitLabel = isPoem ? (lineCount === 1 ? 'verse' : 'verses') : (lineCount === 1 ? 'line' : 'verses');
  const actionLabel = isPoem ? (isOpen ? 'Close poem' : 'Open poem') : (isOpen ? 'Close chapter' : 'Open chapter');
  const normalizeLabel = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
  const showEntryTitleInMeta = normalizeLabel(chapter) !== normalizeLabel(entryTitle);
  const metaLabel = showEntryTitleInMeta
    ? `${entryTitle}  ·  ${lineCount} ${unitLabel}`
    : `${lineCount} ${unitLabel}`;
  return (
    <TouchableOpacity
      style={[
        styles.wrap,
        night && { backgroundColor: 'rgba(255, 253, 247, 0.02)' },
      ]}
      activeOpacity={0.85}
      onPress={onToggle}
    >
      <View style={styles.rowMain}>
        <View style={[styles.rowAccent, { backgroundColor: accent }]} />

        <View style={styles.contentWrap}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaType, { color: typeInk }]}>{isNaat ? 'NAAT' : 'QASEEDAH'}</Text>
            <Text style={[styles.metaDot, { color: subtleText }]}>•</Text>
            <Text style={[styles.metaCount, { color: subtleText }]}>{lineCount} {unitLabel}</Text>
          </View>

          <View style={styles.titleRow}>
            <Text style={[styles.chapter, night && { color: night.text }]}>{chapter}</Text>
            <MaterialIcons name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={21} color={subtleText} />
          </View>

          {chapterArabic ? (
            <Text style={[styles.chapterArabic, night && { color: night.text }]}>{chapterArabic}</Text>
          ) : null}
          {chapterUrdu ? (
            <Text style={[styles.chapterUrdu, night && { color: night.text }]}>{chapterUrdu}</Text>
          ) : null}

          <Text style={[styles.meta, { color: subtleText }]}>{metaLabel}</Text>
          <View style={styles.actionRow}>
            <Text style={[styles.action, { color: accent }]}>{actionLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowAccent: {
    width: 5,
    borderRadius: 999,
    minHeight: 58,
    marginTop: 2,
  },
  contentWrap: {
    flex: 1,
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metaType: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '800',
  },
  metaDot: {
    fontSize: 13,
    lineHeight: 14,
  },
  metaCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chapter: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
    textAlign: 'left',
  },
  chapterUrdu: {
    fontFamily: 'UrduNastaliq',
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'left',
    marginTop: 1,
    writingDirection: 'rtl',
  },
  chapterArabic: {
    fontFamily: 'IndopakNastaleeq',
    fontSize: 21,
    color: Colors.textPrimary,
    textAlign: 'left',
    marginTop: 1,
    writingDirection: 'rtl',
  },
  meta: {
    fontSize: 11,
    color: Colors.textSubtle,
    letterSpacing: 0.15,
    fontWeight: '500',
    marginTop: 1,
  },
  actionRow: {
    marginTop: 3,
  },
  action: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
