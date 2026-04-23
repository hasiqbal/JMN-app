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
  return (
    <View style={[styles.wrap, night && { backgroundColor: night.surface, borderBottomColor: night.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8} hitSlop={8}>
        <MaterialIcons name="arrow-back" size={22} color={night ? night.text : Colors.textPrimary} />
      </TouchableOpacity>

      <View style={styles.titleWrap}>
        <Text
          style={[styles.kicker, night && { color: night.textMuted }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
        <Text
          style={[styles.title, night && { color: night.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onRefresh}
        style={[styles.refreshBtn, night && { borderColor: night.border, backgroundColor: night.surfaceAlt }]}
        activeOpacity={0.8}
        disabled={refreshing}
        hitSlop={8}
      >
        {refreshing ? (
          <ActivityIndicator size="small" color={night ? night.accent : Colors.primary} />
        ) : (
          <MaterialIcons name="refresh" size={18} color={night ? night.accent : Colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 12,
    paddingHorizontal: Spacing.md,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.textSubtle,
    fontWeight: '700',
  },
  title: {
    fontFamily: SERIF_FONT,
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
});
