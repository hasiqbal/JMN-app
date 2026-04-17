import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

export type PrayerData = {
  name: string;
  startTime: string;
  jamaatTime: string;
};

type Props = {
  prayers: PrayerData[];
  backgroundSource: any;
  progress: number;
  currentPrayerIndex: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function PrayerCompartmentHero({
  prayers,
  backgroundSource,
  progress,
  currentPrayerIndex,
}: Props) {
  const safeProgress = clamp(progress, 0, 1);

  return (
    <ImageBackground source={backgroundSource} style={styles.hero} imageStyle={styles.image}>
      <View style={styles.overlay}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${safeProgress * 100}%` }]} />
        </View>

        {prayers.map((prayer, index) => {
          const isCurrent = index === currentPrayerIndex;
          return (
            <View key={prayer.name} style={[styles.row, isCurrent && styles.currentRow]}>
              <Text style={[styles.name, isCurrent && styles.currentText]}>{prayer.name}</Text>
              <View style={styles.timesWrap}>
                <Text style={[styles.time, isCurrent && styles.currentText]}>{prayer.startTime}</Text>
                <Text style={[styles.time, isCurrent && styles.currentText]}>{prayer.jamaatTime}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 240,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  image: {
    resizeMode: 'contain',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    padding: 16,
    gap: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D8B449',
    borderRadius: 999,
  },
  row: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentRow: {
    borderColor: 'rgba(216,180,73,0.95)',
    backgroundColor: 'rgba(216,180,73,0.20)',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  currentText: {
    color: '#FFF5D0',
  },
  timesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  time: {
    color: '#E8E8E8',
    fontSize: 14,
    fontWeight: '600',
  },
});