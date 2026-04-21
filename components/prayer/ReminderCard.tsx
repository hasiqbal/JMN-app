import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';

export type ReminderCardTone = 'hadith' | 'verse';

type ReminderCardPalette = {
  title: string;
  text: string;
  source: string;
  switchText: string;
  switchActiveText: string;
  switchBorder: string;
  switchBg: string;
  switchActiveBg: string;
  ctaText: string;
};

export type ReminderCardProps = {
  title: string;
  titleUrdu?: string;
  textEn: string;
  textUr?: string;
  source: string;
  tone: ReminderCardTone;
  accentTint: string;
  readMoreLabel?: string;
  onPressReadMore: () => void;
  palette: ReminderCardPalette;
};

type LanguageCode = 'en' | 'ur';

export function ReminderCard({
  title,
  titleUrdu,
  textEn,
  textUr,
  source,
  tone,
  accentTint,
  readMoreLabel = 'Read more',
  onPressReadMore,
  palette,
}: ReminderCardProps) {
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');

  const englishText = (textEn || '').trim();
  const urduText = (textUr || '').trim();
  const sourceText = (source || '').trim() || 'Source pending';

  const activeText = useMemo(() => {
    if (activeLanguage === 'ur') return urduText || englishText;
    return englishText || urduText;
  }, [activeLanguage, englishText, urduText]);

  const activeTitle = useMemo(() => {
    if (activeLanguage === 'ur') return (titleUrdu || '').trim() || title;
    return title;
  }, [activeLanguage, title, titleUrdu]);

  return (
    <View style={[styles.card, { backgroundColor: accentTint }]}>
      <Text
        style={[styles.title, { color: palette.title }]}
        numberOfLines={1}
      >
        {activeTitle}
      </Text>

      <View style={styles.translationFrame}>
        <Text
          style={[styles.translation, { color: palette.text }]}
          numberOfLines={3}
        >
          {activeText || 'Content unavailable.'}
        </Text>
      </View>

      <Text style={[styles.source, { color: palette.source }]} numberOfLines={1}>
        {sourceText}
      </Text>

      <View style={styles.footerRow}>
        <View
          style={[
            styles.segmented,
            {
              borderColor: palette.switchBorder,
              backgroundColor: palette.switchBg,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show English translation"
            onPress={() => setActiveLanguage('en')}
            style={[
              styles.segment,
              activeLanguage === 'en' && {
                backgroundColor: palette.switchActiveBg,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: palette.switchText },
                activeLanguage === 'en' && {
                  color: palette.switchActiveText,
                },
              ]}
            >
              EN
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show Urdu translation"
            onPress={() => setActiveLanguage('ur')}
            style={[
              styles.segment,
              activeLanguage === 'ur' && {
                backgroundColor: palette.switchActiveBg,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: palette.switchText },
                activeLanguage === 'ur' && {
                  color: palette.switchActiveText,
                },
              ]}
            >
              UR
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${readMoreLabel}`}
          onPress={onPressReadMore}
          style={({ pressed }) => [styles.readMore, pressed && styles.readMorePressed]}
        >
          <Text style={[styles.readMoreText, { color: palette.ctaText }]}>{readMoreLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  translationFrame: {
    minHeight: 86,
    justifyContent: 'flex-start',
  },
  translation: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  source: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
  footerRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  segmented: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.full,
    padding: 2,
  },
  segment: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  segmentText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  readMore: {
    borderRadius: Radius.full,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  readMorePressed: {
    opacity: 0.72,
  },
  readMoreText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
