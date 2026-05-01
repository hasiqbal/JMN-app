import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import type { NightPaletteType } from './types';

const SERIF_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

type Props = {
  title: string;
  subtitle: string;
  onBack: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  night: NightPaletteType | null;
};

export function QaseedahHeader({ title, subtitle, onBack, onRefresh, refreshing, night }: Props) {
  const goldHairline = night ? night.goldHairline : Colors.goldHairline;
  const goldColor = night ? night.gold : Colors.gold;
  const goldInk = night ? night.goldInk : Colors.goldInk;

  return (
    <View
      style={[
        styles.wrap,
        night && { backgroundColor: 'rgba(10, 16, 28, 0.92)', borderBottomColor: goldHairline },
      ]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={[styles.iconBtn, { borderColor: goldHairline }, night && { backgroundColor: 'rgba(255,253,247,0.06)' }]}
        activeOpacity={0.8}
        hitSlop={8}
      >
        <MaterialIcons name="arrow-back" size={16} color={night ? night.textSub : Colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.titleWrap}>
        <Text style={[styles.kicker, { color: goldInk }]} numberOfLines={1}>
          {subtitle}
        </Text>
        <View style={styles.titleRow}>
          <Text style={[styles.titleSideGlyph, { color: goldColor }]}>﹏</Text>
          <Text
            style={[styles.title, night && { color: night.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[styles.titleSideGlyph, { color: goldColor }]}>﹏</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onRefresh}
        style={[styles.iconBtn, { borderColor: goldHairline }, night && { backgroundColor: 'rgba(255,253,247,0.06)' }]}
        activeOpacity={0.8}
        disabled={refreshing}
        hitSlop={8}
      >
        {refreshing ? (
          <ActivityIndicator size="small" color={night ? night.accent : Colors.primary} />
        ) : (
          <MaterialIcons name="refresh" size={15} color={night ? night.accent : Colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 10,
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(252, 249, 240, 0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(184, 134, 11, 0.45)',
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    backgroundColor: 'rgba(255, 253, 247, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  kicker: {
    fontFamily: SERIF_FONT,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: Colors.goldInk,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleSideGlyph: {
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 1,
  },
  title: {
    fontFamily: SERIF_FONT,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
    maxWidth: 240,
  },
});
