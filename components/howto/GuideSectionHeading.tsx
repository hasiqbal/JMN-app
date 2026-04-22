import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Radius } from '@/constants/theme';
import { pickPalette } from './palette';

interface GuideSectionHeadingProps {
  heading: string;
  accentColor: string;
  expanded: boolean;
  onToggle: () => void;
  nightMode: boolean;
}

/**
 * Reusable section heading used to group steps inside a guide.
 * Consistent uppercase-ish look, bullet accent, and expand/collapse affordance.
 */
export function GuideSectionHeading({
  heading,
  accentColor,
  expanded,
  onToggle,
  nightMode,
}: GuideSectionHeadingProps) {
  const P = pickPalette(nightMode);

  return (
    <TouchableOpacity
      style={[
        styles.header,
        { backgroundColor: P.surfaceAlt },
      ]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.bullet, { backgroundColor: accentColor }]} />
      <Text style={[styles.title, { color: P.text }]}>{heading}</Text>
      <MaterialIcons
        name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
        size={18}
        color={P.textMuted}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

GuideSectionHeading.displayName = 'GuideSectionHeading';
