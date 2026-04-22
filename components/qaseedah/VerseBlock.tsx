import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { ArabicTextBlock } from './ArabicTextBlock';
import { TransliterationBlock } from './TransliterationBlock';
import { TranslationBlock } from './TranslationBlock';
import { UrduBlock } from './UrduBlock';
import type { LayerVisibility, NightPaletteType, VerseRole } from './types';

type Props = {
  role: VerseRole;
  verseNumber?: number;
  chapterLabel?: string;
  arabic: string;
  transliteration?: string;
  translation?: string;
  urdu?: string;
  isAutoTranslated?: boolean;
  layers: LayerVisibility;
  scale: number;
  night: NightPaletteType | null;
};

function verseLabelFor(role: VerseRole, verseNumber?: number): string {
  if (role === 'opening-chorus') return 'Opening Chorus';
  if (role === 'closing-chorus') return 'Closing Chorus';
  if (verseNumber) return `Verse ${verseNumber}`;
  return 'Verse';
}

export function VerseBlock({
  role,
  verseNumber,
  chapterLabel,
  arabic,
  transliteration,
  translation,
  urdu,
  isAutoTranslated,
  layers,
  scale,
  night,
}: Props) {
  const isChorus = role !== 'verse';
  const nothingVisible =
    !layers.arabic && !layers.transliteration && !layers.english && !layers.urdu;

  return (
    <View style={[styles.wrap, isChorus && styles.chorusWrap, isChorus && night && { backgroundColor: `${night.accent}10` }]}>
      {chapterLabel ? (
        <Text
          style={[
            styles.chapterLabel,
            night && { color: night.textMuted },
          ]}
          numberOfLines={2}
        >
          {chapterLabel}
        </Text>
      ) : null}
      <Text
        style={[
          styles.label,
          isChorus && styles.chorusLabel,
          night && { color: night.textMuted },
          isChorus && night && { color: night.accent },
        ]}
      >
        {verseLabelFor(role, verseNumber)}
      </Text>

      {layers.arabic && arabic ? (
        <View style={styles.section}>
          <ArabicTextBlock text={arabic} scale={scale} night={night} />
        </View>
      ) : null}

      {layers.transliteration && transliteration ? (
        <View style={styles.section}>
          <TransliterationBlock text={transliteration} scale={scale} night={night} />
        </View>
      ) : null}

      {layers.english && translation ? (
        <View style={styles.section}>
          <TranslationBlock text={translation} scale={scale} night={night} />
        </View>
      ) : null}

      {layers.urdu && urdu ? (
        <View style={styles.section}>
          <UrduBlock text={urdu} scale={scale} night={night} />
        </View>
      ) : null}

      {isAutoTranslated ? (
        <Text style={[styles.hint, night && { color: night.textMuted }]}>auto-assisted translation</Text>
      ) : null}

      {nothingVisible ? (
        <Text style={[styles.hint, night && { color: night.textMuted }]}>
          All layers are hidden. Enable one from the preferences above.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 6,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 14,
  },
  chorusWrap: {
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 10,
    marginHorizontal: -4,
    backgroundColor: '#F4FAF6',
  },
  label: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  chapterLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
    color: Colors.textSubtle,
    textAlign: 'center',
    opacity: 0.75,
    marginBottom: -6,
  },
  chorusLabel: {
    color: Colors.primary,
  },
  section: {
    width: '100%',
    alignItems: 'center',
  },
  hint: {
    fontSize: 11,
    color: Colors.textSubtle,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
