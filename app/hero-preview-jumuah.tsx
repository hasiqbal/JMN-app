import React, { useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrayerHeroCard, { type HeroCountdownInfo } from '@/components/prayer/PrayerHeroCard';
import { PRAYER_BG_IMAGES, PRAYER_GRADIENTS, PRAYER_ICONS } from '@/components/prayer/heroConfig';

type FridayScenario = {
  id: string;
  title: string;
  kicker: string;
  isForbidden?: boolean;
  forbiddenEndsAt?: string;
  isFridayJumuahHero?: boolean;
  countdownInfo: HeroCountdownInfo;
  progress: number;
  startLabel: string;
  startTime: string;
  endLabel: string;
  endTime: string;
  midLabel?: string;
  midTime?: string;
  midMarker?: number | null;
  showJamaat?: boolean;
  jamaatValue?: string;
  nextPrayerJamaatValue?: string;
  j1?: string;
  j2?: string;
  heroKey: keyof typeof PRAYER_BG_IMAGES;
};

const FRIDAY_J1 = '1:30';
const FRIDAY_J2 = '2:30';
const FRIDAY_FAJR = '05:00';
const JUMMAH_NOTE = `1st Jummah: ${FRIDAY_J1} · 2nd Jummah: ${FRIDAY_J2}`;

const FRIDAY_SCENARIOS: FridayScenario[] = [
  {
    id: 'maghrib-thursday',
    title: 'Maghrib',
    kicker: 'Current Prayer',
    heroKey: 'Maghrib',
    countdownInfo: {
      label: 'Jamaat',
      value: '00:09:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.22,
    startLabel: 'Start',
    startTime: '19:48',
    endLabel: 'Isha',
    endTime: '21:20',
    showJamaat: true,
    jamaatValue: '19:58',
    nextPrayerJamaatValue: '21:45',
  },
  {
    id: 'isha-thursday',
    title: 'Isha',
    kicker: 'Current Prayer',
    heroKey: 'Isha',
    countdownInfo: {
      label: 'Until Fajr',
      value: '07:45:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.88,
    startLabel: 'Isha',
    startTime: '21:15',
    endLabel: 'Fajr',
    endTime: FRIDAY_FAJR,
    showJamaat: true,
    jamaatValue: '21:45',
    nextPrayerJamaatValue: '05:30',
  },
  {
    id: 'fajr-friday',
    title: 'Fajr',
    kicker: 'Current Prayer',
    heroKey: 'Fajr',
    countdownInfo: {
      label: 'Jamaat',
      value: '00:28:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.24,
    startLabel: 'Start',
    startTime: FRIDAY_FAJR,
    endLabel: 'Sunrise',
    endTime: '06:07',
    showJamaat: true,
    jamaatValue: '05:30',
    nextPrayerJamaatValue: '',
  },
  {
    id: 'sunrise-friday',
    title: 'Sunrise',
    kicker: 'Prayer Pause Window',
    isForbidden: true,
    forbiddenEndsAt: '06:27',
    heroKey: 'Sunrise',
    countdownInfo: {
      label: 'Until Ishraq',
      value: '00:14:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.55,
    startLabel: 'Sunrise',
    startTime: '06:07',
    endLabel: 'Ishraq',
    endTime: '06:27',
    showJamaat: false,
    nextPrayerJamaatValue: '',
  },
  {
    id: 'ishraq-friday',
    title: 'Ishraq',
    kicker: 'Up Next Prayer',
    heroKey: 'Ishraq',
    countdownInfo: {
      label: 'Until Zawaal',
      value: '03:12:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.35,
    startLabel: 'Ishraq',
    startTime: '06:27',
    endLabel: 'Zawaal',
    endTime: '12:40',
    showJamaat: false,
    nextPrayerJamaatValue: '',
  },
  {
    id: 'zawaal-friday',
    title: 'Zawaal',
    kicker: 'Prayer Pause Window',
    isForbidden: true,
    forbiddenEndsAt: '13:10',
    heroKey: 'Zawaal',
    countdownInfo: {
      label: 'Forbidden Window',
      value: '00:14:00',
      note: JUMMAH_NOTE,
      flash: false,
    },
    progress: 0.92,
    startLabel: 'Zawaal',
    startTime: '12:40',
    endLabel: 'Jummah Athan',
    endTime: '13:10',
    showJamaat: false,
    nextPrayerJamaatValue: '',
  },
  {
    id: 'jumuah-pre-j1',
    title: 'Jumuah',
    kicker: 'Current Prayer',
    isFridayJumuahHero: true,
    heroKey: 'Jumuah',
    countdownInfo: {
      label: '1st Jamaat',
      value: '00:18:00',
      note: '',
      flash: false,
    },
    progress: 0.24,
    startLabel: 'First Athan',
    startTime: '13:10',
    endLabel: 'Asr Start',
    endTime: '17:56',
    showJamaat: false,
    nextPrayerJamaatValue: '18:25',
    j1: FRIDAY_J1,
    j2: FRIDAY_J2,
  },
  {
    id: 'jumuah-between',
    title: 'Jumuah',
    kicker: 'Current Prayer',
    isFridayJumuahHero: true,
    heroKey: 'Jumuah',
    countdownInfo: {
      label: '2nd Jamaat',
      value: '00:22:00',
      note: '',
      flash: false,
    },
    progress: 0.48,
    startLabel: 'First Athan',
    startTime: '13:10',
    endLabel: 'Asr Start',
    endTime: '17:56',
    showJamaat: false,
    nextPrayerJamaatValue: '18:25',
    j1: FRIDAY_J1,
    j2: FRIDAY_J2,
  },
  {
    id: 'asr-friday',
    title: 'Asr',
    kicker: 'Current Prayer',
    heroKey: 'Asr',
    countdownInfo: {
      label: 'Jamaat',
      value: '00:28:00',
      note: '',
      flash: false,
    },
    progress: 0.15,
    startLabel: 'Start',
    startTime: '17:56',
    endLabel: 'Maghrib',
    endTime: '19:48',
    showJamaat: true,
    jamaatValue: '18:25',
    nextPrayerJamaatValue: '19:58',
  },
];

export default function HeroPreviewJumuahScreen() {
  const flashAnim = useRef(new Animated.Value(1)).current;
  const cards = useMemo(() => FRIDAY_SCENARIOS, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Jummah Info Strip Preview</Text>
        <Text style={styles.subtitle}>Thu Maghrib → Isha → Fri Fajr → Sunrise → Ishraq → Zawaal → Jumuah → Asr</Text>

        {cards.map((s) => (
          <View key={s.id} style={styles.block}>
            <Text style={styles.blockTitle}>{s.id.replace(/-/g, ' ')}</Text>
            <PrayerHeroCard
              visible
              backgroundSource={PRAYER_BG_IMAGES[s.heroKey]}
              gradientColors={PRAYER_GRADIENTS[s.heroKey]}
              ambientColors={['rgba(8,24,52,0.56)', 'rgba(6,14,34,0.45)']}
              backgroundImageOpacity={0.82}
              heroWide={false}
              kicker={s.kicker}
              title={s.title}
              isForbidden={!!s.isForbidden}
              forbiddenEndsAt={s.forbiddenEndsAt ?? '--:--'}
              isFridayJumuahHero={!!s.isFridayJumuahHero}
              athanValue={s.startTime}
              j1={s.j1 ?? ''}
              j2={s.j2 ?? ''}
              showJamaat={!!s.showJamaat}
              jamaatValue={s.jamaatValue ?? ''}
              countdownInfo={s.countdownInfo}
              flashAnim={flashAnim}
              progress={s.progress}
              athanMarker={0}
              jamaatMarker={s.showJamaat ? 0.22 : null}
              endMarker={1}
              midMarker={s.midMarker ?? null}
              startLabel={s.startLabel}
              startTime={s.startTime}
              endLabel={s.endLabel}
              endTime={s.endTime}
              midLabel={s.midLabel ?? ''}
              midTime={s.midTime ?? ''}
              hasNext
              nextPrayerName='Asr'
              nextPrayerTime='17:56'
              nextPrayerJamaatValue={s.nextPrayerJamaatValue ?? ''}
              prayerIcons={PRAYER_ICONS}
              localTime='13:12'
              ampm='PM'
              seconds='00'
              hijriLabel='24 Shawwal 1447 AH'
              loadingHijri={false}
              dayName='Friday'
              dateShort='18 Apr 2026'
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041024',
  },
  content: {
    paddingVertical: 14,
    paddingBottom: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginHorizontal: 16,
  },
  subtitle: {
    color: 'rgba(216,232,255,0.86)',
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  block: {
    marginBottom: 14,
  },
  blockTitle: {
    marginHorizontal: 20,
    marginBottom: 4,
    color: '#CFE5FF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
