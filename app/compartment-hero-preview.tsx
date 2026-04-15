import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import PrayerCompartmentHero, { type PrayerData } from '@/components/prayer/PrayerCompartmentHero';
import { PRAYER_BG_IMAGES } from '@/components/prayer/heroConfig';

const PRAYER_DATA: PrayerData[] = [
  { name: 'Fajr', startTime: '05:10', jamaatTime: '06:00' },
  { name: 'Dhuhr', startTime: '13:10', jamaatTime: '14:00' },
  { name: 'Asr', startTime: '17:57', jamaatTime: '18:30' },
  { name: 'Maghrib', startTime: '19:45', jamaatTime: '19:50' },
  { name: 'Isha', startTime: '21:00', jamaatTime: '21:30' },
];

export default function CompartmentHeroPreviewScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Compartment Hero Preview</Text>
        <Text style={styles.subtitle}>Prayer times compartmentalized layout</Text>

        {/* Dhuhr as current prayer (progress 0.36) */}
        <View style={styles.heroWrap}>
          <Text style={styles.scenarioLabel}>Dhuhr (Current Prayer)</Text>
          <PrayerCompartmentHero
            prayers={PRAYER_DATA}
            backgroundSource={PRAYER_BG_IMAGES.Dhuhr}
            progress={0.36}
            currentPrayerIndex={1}
          />
        </View>

        {/* Asr as current prayer (progress 0.65) */}
        <View style={styles.heroWrap}>
          <Text style={styles.scenarioLabel}>Asr (Current Prayer)</Text>
          <PrayerCompartmentHero
            prayers={PRAYER_DATA}
            backgroundSource={PRAYER_BG_IMAGES.Asr}
            progress={0.65}
            currentPrayerIndex={2}
          />
        </View>

        {/* Fajr as current prayer (progress 0.24) */}
        <View style={styles.heroWrap}>
          <Text style={styles.scenarioLabel}>Fajr (Current Prayer)</Text>
          <PrayerCompartmentHero
            prayers={PRAYER_DATA}
            backgroundSource={PRAYER_BG_IMAGES.Fajr}
            progress={0.24}
            currentPrayerIndex={0}
          />
        </View>

        {/* Maghrib as current prayer (progress 0.22) */}
        <View style={styles.heroWrap}>
          <Text style={styles.scenarioLabel}>Maghrib (Current Prayer)</Text>
          <PrayerCompartmentHero
            prayers={PRAYER_DATA}
            backgroundSource={PRAYER_BG_IMAGES.Maghrib}
            progress={0.22}
            currentPrayerIndex={3}
          />
        </View>

        {/* Isha as current prayer (progress 0.4) */}
        <View style={styles.heroWrap}>
          <Text style={styles.scenarioLabel}>Isha (Current Prayer)</Text>
          <PrayerCompartmentHero
            prayers={PRAYER_DATA}
            backgroundSource={PRAYER_BG_IMAGES.Isha}
            progress={0.4}
            currentPrayerIndex={4}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  heroWrap: {
    marginBottom: 24,
  },
  scenarioLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
