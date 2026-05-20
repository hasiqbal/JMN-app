import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import type { NightPaletteType } from './types';

type Props = {
  title: string;
  onBack: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  night: NightPaletteType | null;
};

export function QaseedahHeader({ title, onBack, onRefresh, refreshing, night }: Props) {
  const borderColor = night ? night.border : 'rgba(36, 50, 61, 0.16)';
  const subtleSurface = night ? 'rgba(255,253,247,0.05)' : 'rgba(255, 255, 255, 0.75)';

  return (
    <View
      style={[
        styles.wrap,
        night && { backgroundColor: 'rgba(10, 16, 28, 0.92)', borderBottomColor: borderColor },
      ]}
    >
      <TouchableOpacity
        onPress={onBack}
        style={[styles.iconBtn, { borderColor, backgroundColor: subtleSurface }]}
        activeOpacity={0.8}
        hitSlop={8}
      >
        <MaterialIcons name="arrow-back" size={16} color={night ? night.textSub : Colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.titleWrap}>
        <Text style={[styles.title, night && { color: night.text }]} numberOfLines={1}>{title}</Text>
      </View>

      <TouchableOpacity
        onPress={onRefresh}
        style={[styles.iconBtn, { borderColor, backgroundColor: subtleSurface }]}
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
    paddingTop: 8,
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(252, 252, 250, 0.96)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(36, 50, 61, 0.16)',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(36, 50, 61, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0,
    textAlign: 'center',
    maxWidth: 255,
  },
});
