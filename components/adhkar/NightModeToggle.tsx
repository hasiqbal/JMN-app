/**
 * NightModeToggle.tsx
 * Switch-style Day/Night toggle used in headers.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
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
      style={[styles.container, nightMode ? styles.containerNight : styles.containerDay]}
    >
      <Text style={[styles.sideLabel, !nightMode ? styles.sideLabelActiveDay : styles.sideLabelInactive]}>Day</Text>

      <View style={[styles.switchTrack, nightMode ? styles.trackNight : styles.trackDay]}>
        <View style={[styles.thumb, nightMode ? styles.thumbNight : styles.thumbDay]}>
          <MaterialIcons
            name={nightMode ? 'nights-stay' : 'wb-sunny'}
            size={13}
            color={nightMode ? '#C0D8FF' : '#8A6A08'}
          />
        </View>
      </View>

      <Text style={[styles.sideLabel, nightMode ? styles.sideLabelActiveNight : styles.sideLabelInactive]}>Night</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  containerNight: {
    backgroundColor: '#0D1E3C',
    borderColor: '#2A4A7A',
  },
  containerDay: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.border,
  },
  sideLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sideLabelActiveDay: {
    color: '#1D4D2A',
  },
  sideLabelActiveNight: {
    color: '#C0D8FF',
  },
  sideLabelInactive: {
    color: Colors.textSubtle,
    opacity: 0.8,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  trackDay: {
    backgroundColor: '#FFF7D6',
    borderColor: '#E8D8A2',
    alignItems: 'flex-start',
  },
  trackNight: {
    backgroundColor: '#13294E',
    borderColor: '#35558B',
    alignItems: 'flex-end',
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbDay: {
    backgroundColor: '#FFF1B3',
  },
  thumbNight: {
    backgroundColor: '#0D1E3C',
  },
});
