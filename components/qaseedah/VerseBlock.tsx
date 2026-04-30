import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { ArabicTextBlock } from './ArabicTextBlock';
import { TransliterationBlock } from './TransliterationBlock';
import { TranslationBlock } from './TranslationBlock';
import { UrduBlock } from './UrduBlock';
import type {
  LanguageFontScales,
  LayerVisibility,
  NightPaletteType,
  PrimaryLanguage,
  VerseRole,
} from './types';

type VerseLanguageKey = 'arabic' | 'transliteration' | 'english' | 'urdu';

type Props = {
  role: VerseRole;
  verseNumber?: number;
  chapterLabel?: string;
  isPoem?: boolean;
  primaryLanguage?: PrimaryLanguage;
  arabic: string;
  transliteration?: string;
  translation?: string;
  urdu?: string;
  isAutoTranslated?: boolean;
  layers: LayerVisibility;
  scale: number;
  languageScales?: LanguageFontScales;
  night: NightPaletteType | null;
};

function verseLabelFor(role: VerseRole, verseNumber?: number): string {
  if (role === 'opening-chorus') return 'Opening Chorus';
  if (role === 'closing-chorus') return 'Closing Chorus';
  if (verseNumber) return `Verse ${verseNumber}`;
  return 'Verse';
}

function primaryToLanguageKey(primaryLanguage?: PrimaryLanguage): VerseLanguageKey | null {
  if (primaryLanguage === 'arabic') return 'arabic';
  if (primaryLanguage === 'transliteration') return 'transliteration';
  if (primaryLanguage === 'english') return 'english';
  if (primaryLanguage === 'urdu') return 'urdu';
  return null;
}

export function VerseBlock({
  role,
  verseNumber,
  chapterLabel,
  isPoem,
  primaryLanguage,
  arabic,
  transliteration,
  translation,
  urdu,
  isAutoTranslated,
  layers,
  scale,
  languageScales,
  night,
}: Props) {
  const isChorus = role !== 'verse';
  const showChapterLabel = Boolean(chapterLabel && !isPoem);
  const primaryKey = primaryToLanguageKey(primaryLanguage);
  const defaultOrder: VerseLanguageKey[] = ['arabic', 'transliteration', 'english', 'urdu'];
  const languageOrder = primaryKey
    ? [primaryKey, ...defaultOrder.filter((key) => key !== primaryKey)]
    : defaultOrder;
  const nothingVisible =
    !layers.arabic && !layers.transliteration && !layers.english && !layers.urdu;
  const perLanguageScale: LanguageFontScales = {
    arabic: languageScales?.arabic ?? 1,
    transliteration: languageScales?.transliteration ?? 1,
    english: languageScales?.english ?? 1,
    urdu: languageScales?.urdu ?? 1,
  };

  const languageBlocks: Record<VerseLanguageKey, React.ReactNode> = {
    arabic: layers.arabic && arabic ? (
      <View key="arabic" style={styles.section}>
        <ArabicTextBlock text={arabic} scale={scale * perLanguageScale.arabic} night={night} />
      </View>
    ) : null,
    transliteration: layers.transliteration && transliteration ? (
      <View key="transliteration" style={styles.section}>
        <TransliterationBlock
          text={transliteration}
          scale={scale * perLanguageScale.transliteration}
          night={night}
        />
      </View>
    ) : null,
    english: layers.english && translation ? (
      <View key="english" style={styles.section}>
        <TranslationBlock text={translation} scale={scale * perLanguageScale.english} night={night} />
      </View>
    ) : null,
    urdu: layers.urdu && urdu ? (
      <View key="urdu" style={styles.section}>
        <UrduBlock text={urdu} scale={scale * perLanguageScale.urdu} night={night} />
      </View>
    ) : null,
  };

  return (
    <View style={[styles.wrap, isChorus && styles.chorusWrap, isChorus && night && { backgroundColor: night.chorusBg ?? `${night.accent}10` }]}>
      {showChapterLabel ? (
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
      {isChorus ? (
        <Text style={[styles.chorusOrnament, night && { color: night.gold ?? night.accent }]}>۞</Text>
      ) : null}
      <Text
        style={[
          styles.label,
          isChorus && styles.chorusLabel,
          night && { color: night.textMuted },
          isChorus && night && { color: night.gold ?? night.accent },
        ]}
      >
        {verseLabelFor(role, verseNumber)}
      </Text>

      {languageOrder.map((key) => languageBlocks[key])}

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
    paddingVertical: 12,
    alignItems: 'center',
    gap: 10,
  },
  chorusWrap: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginHorizontal: -4,
    backgroundColor: Colors.chorusBg,
  },
  chorusOrnament: {
    fontSize: 14,
    color: Colors.gold,
    opacity: 0.75,
    marginBottom: -6,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  chapterLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontWeight: '600',
    color: Colors.textSubtle,
    textAlign: 'center',
    opacity: 0.75,
    marginBottom: -3,
  },
  chorusLabel: {
    color: Colors.gold,
  },
  section: {
    width: '100%',
    alignItems: 'center',
  },
  hint: {
    fontSize: 10,
    color: Colors.textSubtle,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
