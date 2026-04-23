import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import type { NightPaletteType } from './types';

const SERIF_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

type Props = {
  chapter: string;
  chapterUrdu?: string;
  chapterArabic?: string;
  entryTitle: string;
  lineCount: number;
  isOpen: boolean;
  onToggle: () => void;
  isPoem?: boolean;
  night: NightPaletteType | null;
};

export function ChapterIntro({ chapter, chapterUrdu, chapterArabic, entryTitle, lineCount, isOpen, onToggle, isPoem, night }: Props) {
  const accent = night ? night.accent : Colors.primary;
  const goldColor = night ? (night.gold ?? night.accent) : Colors.gold;
  const hairlineColor = night ? (night.goldHairline ?? night.border) : Colors.goldHairline;
  const unitLabel = isPoem ? (lineCount === 1 ? 'verse' : 'verses') : (lineCount === 1 ? 'line' : 'verses');
  const actionLabel = isPoem ? (isOpen ? 'Close poem' : 'Open poem') : (isOpen ? 'Close chapter' : 'Open chapter');
  return (
    <TouchableOpacity
      style={styles.wrap}
      activeOpacity={0.85}
      onPress={onToggle}
    >
      <View style={styles.ornament}>
        <View style={[styles.ornamentLine, { backgroundColor: hairlineColor }]} />
        <Text style={[styles.ornamentCluster, { color: goldColor }]}>﹏ ۞ ﹏</Text>
        <View style={[styles.ornamentLine, { backgroundColor: hairlineColor }]} />
      </View>

      <Text style={[styles.chapter, night && { color: night.text }]}>{chapter}</Text>
      {isOpen ? (
        <View style={[styles.chapterUnderline, { backgroundColor: hairlineColor }]} />
      ) : null}
      {chapterArabic ? (
        <Text style={[styles.chapterArabic, night && { color: night.text }]}>{chapterArabic}</Text>
      ) : null}
      {chapterUrdu ? (
        <Text style={[styles.chapterUrdu, night && { color: night.text }]}>{chapterUrdu}</Text>
      ) : null}
      <Text style={[styles.meta, night && { color: night.textMuted }]}>
        {entryTitle} · {lineCount} {unitLabel}
      </Text>

      <View style={styles.actionRow}>
        <Text style={[styles.action, { color: accent }]}>{actionLabel}</Text>
        <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={18} color={accent} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: 6,
  },
  ornament: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    width: '70%',
  },
  ornamentLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.goldHairline,
  },
  ornamentCluster: {
    fontSize: 15,
    color: Colors.gold,
    letterSpacing: 3,
  },
  chapter: {
    fontFamily: SERIF_FONT,
    fontSize: 21,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  chapterUnderline: {
    height: StyleSheet.hairlineWidth,
    width: 56,
    backgroundColor: Colors.goldHairline,
    marginTop: 2,
    marginBottom: 4,
  },
  chapterUrdu: {
    fontFamily: 'UrduNastaliq',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  chapterArabic: {
    fontFamily: 'IndopakNastaleeq',
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  meta: {
    fontSize: 11,
    color: Colors.textSubtle,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  action: {
    fontFamily: SERIF_FONT,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
