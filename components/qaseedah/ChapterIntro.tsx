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
  isOpen: boolean;
  onToggle: () => void;
  night: NightPaletteType | null;
};

export function ChapterIntro({ chapter, chapterUrdu, chapterArabic, entryTitle, lineCount, isOpen, onToggle, night }: Props) {
  const accent = night ? night.accent : Colors.primary;
  return (
    <TouchableOpacity
      style={styles.wrap}
      activeOpacity={0.85}
      onPress={onToggle}
    >
      <View style={styles.ornament}>
        <View style={[styles.ornamentLine, night && { backgroundColor: night.border }]} />
        <Text style={[styles.ornamentDot, { color: accent }]}>۞</Text>
        <View style={[styles.ornamentLine, night && { backgroundColor: night.border }]} />
      </View>

      <Text style={[styles.chapter, night && { color: night.text }]}>{chapter}</Text>
      {chapterArabic ? (
        <Text style={[styles.chapterArabic, night && { color: night.text }]}>{chapterArabic}</Text>
      ) : null}
      {chapterUrdu ? (
        <Text style={[styles.chapterUrdu, night && { color: night.text }]}>{chapterUrdu}</Text>
      ) : null}
      <Text style={[styles.meta, night && { color: night.textMuted }]}>
        {entryTitle} · {lineCount} verses
      </Text>

      <View style={styles.actionRow}>
        <Text style={[styles.action, { color: accent }]}>{isOpen ? 'Close chapter' : 'Open chapter'}</Text>
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
    backgroundColor: Colors.border,
  },
  ornamentDot: {
    fontSize: 18,
    color: Colors.primary,
  },
  chapter: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
