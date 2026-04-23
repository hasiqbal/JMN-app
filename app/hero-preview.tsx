import React, { useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrayerHeroCard, { type HeroCountdownInfo } from '@/components/prayer/PrayerHeroCard';
import { PRAYER_BG_IMAGES, PRAYER_GRADIENTS, PRAYER_ICONS, getInterpolatedPrayerOverlay } from '@/components/prayer/heroConfig';

type Scenario = {
  key: keyof typeof PRAYER_BG_IMAGES;
  title: string;
  kicker: string;
  isFridayJumuahHero?: boolean;
  isForbidden?: boolean;
  forbiddenEndsAt?: string;
  countdownInfo: HeroCountdownInfo;
  progress: number;
  showJamaat: boolean;
  startLabel: string;
  startTime: string;
  jamaatValue: string;
  endLabel: string;
  endTime: string;
  nextPrayerName: string;
  nextPrayerTime: string;
  nextPrayerJamaatValue?: string;
  midLabel?: string;
  midTime?: string;
  midMarker?: number | null;
};

const JUMMAH_STRIP_NOTE = 'Jummah Prayers: 1st: 1:30 · 2nd: 2:30';

const SCENARIOS: Scenario[] = [
  {
    key: 'Fajr',
    title: 'Fajr',
    kicker: 'Current Prayer',
    countdownInfo: { label: 'Jamaat', value: '01:20:00', note: '', flash: false },
    progress: 0.24,
    showJamaat: true,
    startLabel: 'Start',
    startTime: '04:12',
    jamaatValue: '05:30',
    endLabel: 'Sunrise',
    endTime: '06:07',
    nextPrayerName: 'Sunrise',
    nextPrayerTime: '06:07',
    nextPrayerJamaatValue: '',
  },
  {
    key: 'Sunrise',
    title: 'Sunrise',
    kicker: 'Prayer Pause Window',
    isForbidden: true,
    forbiddenEndsAt: '06:27',
    countdownInfo: { label: 'Until Ishraq', value: '00:11:00', note: 'Forbidden Window', flash: false },
    progress: 0.52,
    showJamaat: false,
    startLabel: 'Sunrise',
    startTime: '06:07',
    jamaatValue: '--:--',
    endLabel: 'Ishraq',
    endTime: '06:27',
    nextPrayerName: 'Ishraq',
    nextPrayerTime: '06:27',
    nextPrayerJamaatValue: '',
  },
  {
    key: 'Ishraq',
    title: 'Ishraq',
    kicker: 'Up Next Prayer',
    countdownInfo: { label: 'Until Zawaal', value: '03:34:00', note: '', flash: false },
    progress: 0.18,
    showJamaat: false,
    startLabel: 'Ishraq',
    startTime: '06:27',
    jamaatValue: '--:--',
    endLabel: 'Dhuhr',
    endTime: '13:10',
    nextPrayerName: 'Dhuhr',
    nextPrayerTime: '13:10',
    nextPrayerJamaatValue: '14:00',
    midLabel: 'Zawaal',
    midTime: '12:40',
    midMarker: 0.82,
  },
  {
    key: 'Zawaal',
    title: 'Zawaal',
    kicker: 'Prayer Pause Window',
    isForbidden: true,
    forbiddenEndsAt: '13:10',
    countdownInfo: { label: 'Until Dhuhr', value: '00:08:00', note: 'Forbidden Window', flash: false },
    progress: 0.9,
    showJamaat: false,
    startLabel: 'Zawaal',
    startTime: '12:40',
    jamaatValue: '--:--',
    endLabel: 'Dhuhr',
    endTime: '13:10',
    nextPrayerName: 'Dhuhr',
    nextPrayerTime: '13:10',
    nextPrayerJamaatValue: '14:00',
  },
  {
    key: 'Dhuhr',
    title: 'Dhuhr',
    kicker: 'Current Prayer',
    countdownInfo: { label: 'Jamaat', value: '00:19:40', note: '', flash: false },
    progress: 0.36,
    showJamaat: true,
    startLabel: 'Start',
    startTime: '13:10',
    jamaatValue: '14:00',
    endLabel: 'Asr',
    endTime: '17:56',
    nextPrayerName: 'Asr',
    nextPrayerTime: '17:56',
    nextPrayerJamaatValue: '18:25',
  },
  {
    key: 'Asr',
    title: 'Asr',
    kicker: 'Current Prayer',
    countdownInfo: { label: 'Ends In', value: '00:18:20', note: '', flash: false },
    progress: 0.65,
    showJamaat: true,
    startLabel: 'Start',
    startTime: '17:56',
    jamaatValue: '18:25',
    endLabel: 'Maghrib',
    endTime: '19:48',
    nextPrayerName: 'Maghrib',
    nextPrayerTime: '19:48',
    nextPrayerJamaatValue: '19:58',
  },
  {
    key: 'Maghrib',
    title: 'Maghrib',
    kicker: 'Current Prayer',
    countdownInfo: { label: 'Jamaat', value: '00:07:20', note: '', flash: false },
    progress: 0.22,
    showJamaat: true,
    startLabel: 'Start',
    startTime: '19:48',
    jamaatValue: '19:58',
    endLabel: 'Isha',
    endTime: '21:20',
    nextPrayerName: 'Isha',
    nextPrayerTime: '21:20',
    nextPrayerJamaatValue: '21:45',
  },
  {
    key: 'Jumuah',
    title: 'Jumuah',
    kicker: 'Current Prayer',
    isFridayJumuahHero: true,
    countdownInfo: { label: '2nd Jummah', value: '00:18:00', note: JUMMAH_STRIP_NOTE, flash: false },
    progress: 0.54,
    showJamaat: true,
    startLabel: 'Start',
    startTime: '13:15',
    jamaatValue: '13:30',
    endLabel: 'Asr',
    endTime: '17:56',
    nextPrayerName: 'Asr',
    nextPrayerTime: '17:56',
    nextPrayerJamaatValue: '18:25',
    midLabel: 'J2',
    midTime: '14:30',
    midMarker: 0.64,
  },
  {
    key: 'Isha',
    title: 'Isha',
    kicker: 'Current Prayer',
    countdownInfo: { label: 'Ends In', value: '00:08:40', note: '', flash: false },
    progress: 0.4,
    showJamaat: true,
    startLabel: 'Start',
    startTime: '21:20',
    jamaatValue: '21:45',
    endLabel: 'Fajr',
    endTime: '04:12',
    nextPrayerName: 'Fajr',
    nextPrayerTime: '04:12',
    nextPrayerJamaatValue: '05:30',
  },
];

export default function HeroPreviewScreen() {
  const flashAnim = useRef(new Animated.Value(1)).current;
  const cards = useMemo(() => SCENARIOS, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Hero Preview Test</Text>
        <Text style={styles.subtitle}>All prayer-time hero states + urgency thresholds in one scroll</Text>

        {cards.map((s) => (
          <View key={`${s.key}-${s.title}`} style={styles.cardWrap}>
            <Text style={styles.cardLabel}>{s.key}</Text>
            <PrayerHeroCard
              visible
              backgroundSource={PRAYER_BG_IMAGES[s.key]}
              gradientColors={getInterpolatedPrayerOverlay(s.key, s.progress) ?? PRAYER_GRADIENTS[s.key]}

              backgroundImageOpacity={0.8}
              heroWide={false}
              kicker={s.kicker}
              title={s.title}
              isForbidden={!!s.isForbidden}
              forbiddenEndsAt={s.forbiddenEndsAt ?? '--:--'}
              isFridayJumuahHero={!!s.isFridayJumuahHero}
              athanValue={s.startTime}
              j1={s.isFridayJumuahHero ? '13:30' : ''}
              j2={s.isFridayJumuahHero ? '14:30' : ''}
              showJamaat={s.showJamaat}
              jamaatValue={s.jamaatValue}
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
              nextPrayerName={s.nextPrayerName}
              nextPrayerTime={s.nextPrayerTime}
              nextPrayerJamaatValue={s.nextPrayerJamaatValue ?? ''}
              prayerIcons={PRAYER_ICONS}
              localTime="13:21"
              ampm="PM"
              seconds="00"
              hijriLabel="24 Shawwal 1447 AH"
              loadingHijri={false}
              dayName="Monday"
              dateShort="13 Apr 2026"
              allPrayers={[
                { name: 'Fajr', time: '03:49', iqamah: '05:15' },
                { name: 'Dhuhr', time: '13:10', iqamah: '14:00' },
                { name: 'Asr', time: '17:57', iqamah: '19:00' },
                { name: 'Maghrib', time: '20:09', iqamah: '20:09' },
                { name: 'Isha', time: '22:01', iqamah: '22:30' },
              ]}
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
    backgroundColor: '#051126',
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
    marginTop: 3,
    marginBottom: 10,
  },
  cardWrap: {
    marginBottom: 12,
  },
  cardLabel: {
    color: '#CFE5FF',
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 20,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
