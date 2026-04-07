/**
 * PrayerTimeChipBar.tsx
 * Horizontal scrollable chip bar for selecting a prayer time in the Adhkar screen.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { NIGHT_PALETTE } from '@/constants/nightPalette';
import { PrayerTimeId, PRAYER_TIMES } from '@/types/duasTypes';

interface Props {
  selected: PrayerTimeId;
  onSelect: (t: PrayerTimeId) => void;
  nightMode: boolean;
}

export function PrayerTimeChipBar({ selected, onSelect, nightMode }: Props) {
  const N = nightMode ? NIGHT_PALETTE : null;
  return (
    <View style={[styles.wrap, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {PRAYER_TIMES.map((pt) => {
          const isActive = selected === pt.id;
          return (
            <TouchableOpacity
              key={pt.id}
              style={[
                styles.chip,
                N && { backgroundColor: N.surfaceAlt, borderColor: N.border },
                isActive && { backgroundColor: pt.color, borderColor: pt.color },
              ]}
              onPress={() => onSelect(pt.id)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={pt.icon as any}
                size={13}
                color={isActive ? '#fff' : (N ? N.textSub : Colors.textSubtle)}
              />
              <Text
                style={[
                  styles.chipText,
                  N && { color: N.textSub },
                  isActive && { color: '#fff' },
                ]}
              >
                {pt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
});
