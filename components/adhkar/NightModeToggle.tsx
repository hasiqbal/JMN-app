/**
 * NightModeToggle.tsx
 * Compact Day/Night pill button used in the Adhkar screen header.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface Props {
  nightMode: boolean;
  onToggle: () => void;
}

export function NightModeToggle({ nightMode, onToggle }: Props) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      style={[styles.btn, nightMode ? styles.btnNight : styles.btnDay]}
    >
      <MaterialIcons
        name={nightMode ? 'nights-stay' : 'wb-sunny'}
        size={15}
        color={nightMode ? '#C0D8FF' : Colors.textSubtle}
      />
      <Text style={[styles.label, { color: nightMode ? '#C0D8FF' : Colors.textSubtle }]}>
        {nightMode ? 'Night' : 'Day'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  btnNight: { backgroundColor: '#0D1E3C', borderColor: '#2A4A7A' },
  btnDay:   { backgroundColor: Colors.primarySoft, borderColor: Colors.border },
  label:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
