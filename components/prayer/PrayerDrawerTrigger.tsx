import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';

type PrayerDrawerTriggerProps = {
  nightMode: boolean;
  onPress: () => void;
};

const NIGHT = {
  panel: '#122034',
  panelBorder: 'rgba(170, 225, 196, 0.16)',
  text: '#EAF4F0',
  sub: '#A9C4B8',
  icon: '#9BE5A8',
  handle: 'rgba(229, 243, 236, 0.5)',
};

export default function PrayerDrawerTrigger({ nightMode, onPress }: PrayerDrawerTriggerProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open today's salah drawer"
        activeOpacity={0.9}
        onPress={onPress}
        style={[
          styles.panel,
          nightMode ? styles.panelNight : styles.panelDay,
        ]}
      >
        <View style={[styles.handle, nightMode && { backgroundColor: NIGHT.handle }]} />
        <View style={styles.row}>
          <View style={styles.leftMeta}>
            <MaterialIcons name="mosque" size={16} color={nightMode ? NIGHT.icon : '#2C7B57'} />
            <Text style={[styles.title, nightMode && { color: NIGHT.text }]}>Today&apos;s Salah</Text>
          </View>
          <View style={styles.rightMeta}>
            <Text style={[styles.hint, nightMode && { color: NIGHT.sub }]}>View times</Text>
            <MaterialIcons name="keyboard-arrow-up" size={17} color={nightMode ? NIGHT.sub : '#6C8C7A'} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 9,
    paddingBottom: 11,
    minHeight: 62,
  },
  panelDay: {
    backgroundColor: 'rgba(236, 246, 239, 0.98)',
    borderColor: 'rgba(43, 117, 76, 0.13)',
    shadowColor: '#0A3F28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
    elevation: 1,
  },
  panelNight: {
    backgroundColor: NIGHT.panel,
    borderColor: NIGHT.panelBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 9,
    elevation: 2,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(43, 117, 76, 0.26)',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 30,
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.15,
  },
  rightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  hint: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6D8577',
    letterSpacing: 0.1,
  },
});
