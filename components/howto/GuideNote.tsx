import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Radius } from '@/constants/theme';
import type { GuideNoteVariant } from '@/howtoguides/types';
import { pickPalette } from './palette';
import { InlineArabicText } from './GuideBodyText';

type GuideLearningMode = 'default' | 'salah-pilot';

interface GuideNoteProps {
  variant: GuideNoteVariant;
  text: string;
  nightMode: boolean;
  learningMode?: GuideLearningMode;
}

const VARIANT_ICON: Record<GuideNoteVariant, keyof typeof MaterialIcons.glyphMap> = {
  note: 'sticky-note-2',
  tip: 'lightbulb-outline',
  important: 'priority-high',
  reminder: 'notifications-none',
  safety: 'shield',
  warning: 'warning-amber',
  hanafi: 'menu-book',
  fasting: 'no-food',
  key: 'star-outline',
};

const VARIANT_LABEL: Record<GuideNoteVariant, string> = {
  note: 'NOTE',
  tip: 'TIP',
  important: 'IMPORTANT',
  reminder: 'REMINDER',
  safety: 'SAFETY',
  warning: 'WARNING',
  hanafi: 'HANAFI NOTE',
  fasting: 'FASTING NOTE',
  key: 'KEY REMINDER',
};

const VARIANT_ACCENT: Record<GuideNoteVariant, { border: string; tint: string; iconBg: string }> = {
  note:      { border: '#6A8AAE', tint: '#F1F5FA', iconBg: '#FFFFFF' },
  tip:       { border: '#8A9E4A', tint: '#F3F6EA', iconBg: '#FFFFFF' },
  important: { border: '#C48A3E', tint: '#FBF2E4', iconBg: '#FFFFFF' },
  reminder:  { border: '#6A8AAE', tint: '#F1F5FA', iconBg: '#FFFFFF' },
  safety:    { border: '#3E9A7B', tint: '#E9F5EF', iconBg: '#FFFFFF' },
  warning:   { border: '#C0534E', tint: '#FBEBE9', iconBg: '#FFFFFF' },
  hanafi:    { border: '#6A6AAE', tint: '#EEEFFA', iconBg: '#FFFFFF' },
  fasting:   { border: '#8A6A4E', tint: '#F5EEE6', iconBg: '#FFFFFF' },
  key:       { border: '#A88A2E', tint: '#FAF3DE', iconBg: '#FFFFFF' },
};

const COMPACT_NOTE_VARIANTS = new Set<GuideNoteVariant>(['tip', 'hanafi', 'fasting', 'key']);

/**
 * Reusable note / fiqh-guidance callout.
 *
 * Visually separates practical instructions like "If reaching Hajar al-Aswad is unsafe…"
 * or fiqh rulings like "Hanafi note: walking behind is Sunnah" from recitation content.
 */
export function GuideNote({ variant, text, nightMode, learningMode = 'default' }: GuideNoteProps) {
  const P = pickPalette(nightMode);
  const accent = VARIANT_ACCENT[variant];
  const iconName = VARIANT_ICON[variant];
  const compact = COMPACT_NOTE_VARIANTS.has(variant);
  const pilotSecondary = learningMode === 'salah-pilot' && compact;
  const pilotSecondaryTone = pilotSecondary
    ? (nightMode
      ? { backgroundColor: '#101C30', borderColor: '#2A4568', borderLeftColor: '#4D79A7' }
      : { backgroundColor: '#F2F8F4', borderColor: '#C9DCCB', borderLeftColor: '#4D8864' })
    : null;

  return (
    <View
      style={[
        styles.callout,
        compact ? styles.calloutCompact : styles.calloutRegular,
        pilotSecondary && styles.calloutPilotSecondary,
        nightMode
          ? { backgroundColor: P.surfaceAlt, borderColor: P.border, borderLeftColor: P.accent }
          : { backgroundColor: accent.tint, borderColor: '#D9E3EE', borderLeftColor: accent.border },
        pilotSecondaryTone,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          nightMode
            ? { backgroundColor: P.surface }
            : { backgroundColor: accent.iconBg },
        ]}
      >
        <MaterialIcons
          name={iconName}
          size={14}
          color={nightMode ? P.accent : accent.border}
        />
      </View>
      <View style={styles.contentWrap}>
        <Text
          style={[
            styles.label,
            compact ? styles.labelCompact : styles.labelRegular,
            { color: nightMode ? P.accent : accent.border },
          ]}
        >
          {VARIANT_LABEL[variant]}
        </Text>
        <InlineArabicText
          text={text}
          nightMode={nightMode}
          style={[styles.body, compact ? styles.bodyCompact : styles.bodyRegular, { color: P.text }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  callout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: Radius.sm,
  },
  calloutRegular: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  calloutCompact: {
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  calloutPilotSecondary: {
    borderLeftWidth: 2,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  contentWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontWeight: '800',
  },
  labelRegular: {
    fontSize: 10,
    letterSpacing: 1,
  },
  labelCompact: {
    fontSize: 9,
    letterSpacing: 0.8,
  },
  body: {
  },
  bodyRegular: {
    fontSize: 13,
    lineHeight: 19,
  },
  bodyCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
});

GuideNote.displayName = 'GuideNote';
