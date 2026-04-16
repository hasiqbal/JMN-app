import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { DrawerPrayerRow } from '@/components/prayer/prayerDrawerState';

type PrayerTimeRowProps = {
  row: DrawerPrayerRow;
  nightMode: boolean;
  showDivider: boolean;
};

const NIGHT = {
  text: '#ECF5F1',
  muted: '#8CA498',
  divider: 'rgba(214, 236, 223, 0.11)',
  currentBg: 'rgba(111, 214, 130, 0.22)',
  currentBorder: 'rgba(141, 229, 157, 0.34)',
  nextBg: 'rgba(126, 211, 143, 0.08)',
};

function resolveTextColor(state: DrawerPrayerRow['state'], nightMode: boolean): string {
  if (state === 'past') return nightMode ? NIGHT.muted : '#77867E';
  if (nightMode) return NIGHT.text;
  return '#1C3025';
}

export default function PrayerTimeRow({ row, nightMode, showDivider }: PrayerTimeRowProps) {
  const isCurrent = row.state === 'current';
  const isNext = row.state === 'next';

  return (
    <>
      <View
        style={[
          styles.row,
          isCurrent && (nightMode ? styles.rowCurrentNight : styles.rowCurrent),
          isNext && (nightMode ? styles.rowNextNight : styles.rowNext),
        ]}
      >
        <View style={styles.prayerCell}>
          <Text style={[styles.prayerText, { color: resolveTextColor(row.state, nightMode) }]}>{row.name}</Text>
          {isNext ? (
            <MaterialIcons
              name="fiber-manual-record"
              size={8}
              color={nightMode ? '#9BE5A8' : '#2D8B5F'}
              style={styles.nextDot}
            />
          ) : null}
        </View>
        <Text style={[styles.timeText, { color: resolveTextColor(row.state, nightMode) }]}>{row.begins}</Text>
        {row.jamaat2 ? (
          <View style={[styles.jamaatCell]}>
            <Text style={[styles.jamaatDualText, { color: resolveTextColor(row.state, nightMode) }]}>{row.jamaat}</Text>
            <Text style={[styles.jamaatDualText, styles.jamaatSecond, { color: resolveTextColor(row.state, nightMode) }]}>{row.jamaat2}</Text>
          </View>
        ) : (
          <Text style={[styles.timeText, styles.jamaatText, { color: resolveTextColor(row.state, nightMode) }]}>{row.jamaat}</Text>
        )}
      </View>
      {showDivider ? <View style={[styles.divider, nightMode && { backgroundColor: NIGHT.divider }]} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  rowCurrent: {
    backgroundColor: 'rgba(74, 172, 112, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(52, 132, 85, 0.26)',
  },
  rowCurrentNight: {
    backgroundColor: NIGHT.currentBg,
    borderWidth: 1,
    borderColor: NIGHT.currentBorder,
  },
  rowNext: {
    backgroundColor: 'rgba(84, 162, 113, 0.07)',
  },
  rowNextNight: {
    backgroundColor: NIGHT.nextBg,
  },
  prayerCell: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  prayerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nextDot: {
    marginTop: 0,
    opacity: 0.7,
  },
  timeText: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  jamaatText: {
    flex: 0.95,
  },
  jamaatCell: {
    flex: 0.95,
    alignItems: 'flex-end',
    gap: 1,
  },
  jamaatDualText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  jamaatSecond: {
    opacity: 0.72,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(52, 111, 79, 0.12)',
    marginHorizontal: 12,
  },
});
