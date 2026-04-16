import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PrayerTimeRow from '@/components/prayer/PrayerTimeRow';
import type { DrawerPrayerRow } from '@/components/prayer/prayerDrawerState';

type PrayerTimesTableProps = {
  rows: DrawerPrayerRow[];
  nightMode: boolean;
};

const NIGHT = {
  text: '#EAF4F0',
  heading: '#97B9A8',
  divider: 'rgba(214, 236, 223, 0.14)',
};

export default function PrayerTimesTable({ rows, nightMode }: PrayerTimesTableProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.headRow, nightMode && { borderBottomColor: NIGHT.divider }]}>
        <Text style={[styles.headText, styles.headPrayer, nightMode && { color: NIGHT.heading }]}>Prayer</Text>
        <Text style={[styles.headText, styles.headTime, nightMode && { color: NIGHT.heading }]}>Begins</Text>
        <Text style={[styles.headText, styles.headTime, nightMode && { color: NIGHT.heading }]}>Jamaat</Text>
      </View>
      <View style={styles.body}>
        {rows.map((row, index) => (
          <PrayerTimeRow
            key={row.name}
            row={row}
            nightMode={nightMode}
            showDivider={index < rows.length - 1}
          />
        ))}
      </View>
      {rows.length === 0 ? (
        <Text style={[styles.fallback, nightMode && { color: NIGHT.text }]}>Adhkar coming soon.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 111, 79, 0.12)',
    paddingBottom: 7,
    paddingHorizontal: 12,
  },
  headText: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#577164',
  },
  headPrayer: {
    flex: 1.25,
    textAlign: 'left',
  },
  headTime: {
    flex: 1,
    textAlign: 'right',
  },
  body: {
    marginTop: 4,
  },
  fallback: {
    marginTop: 10,
    fontSize: 12,
    color: '#6A7A72',
  },
});
