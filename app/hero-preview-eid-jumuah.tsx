import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrayerHeroCard, { type HeroCountdownInfo } from '@/components/prayer/PrayerHeroCard';
import { PRAYER_BG_IMAGES, PRAYER_GRADIENTS, PRAYER_ICONS } from '@/components/prayer/heroConfig';
import { fetchEidUlFitr } from '@/services/eidService';

type CombinedScenario = {
  id: string;
  title: string;
  kicker: string;
  heroKey: keyof typeof PRAYER_BG_IMAGES;
  countdownInfo: HeroCountdownInfo;
  progress: number;
  startLabel: string;
  startTime: string;
  endLabel: string;
  endTime: string;
  isForbidden?: boolean;
  forbiddenEndsAt?: string;
  isFridayJumuahHero?: boolean;
  isEidHero?: boolean;
  showJamaat?: boolean;
  jamaatValue?: string;
  nextPrayerJamaatValue?: string;
  j1?: string;
  j2?: string;
  eidJamaats?: string[];
  timelinePoints?: { label: string; position: number }[];
};

const FRIDAY_J1 = '1:30';
const FRIDAY_J2 = '2:30';
const EID_DATE = '1st Shawaal';
const JUMUAH_TIMELINE = [
  { label: 'Athan', position: 0 },
  { label: 'J1', position: 0.24 },
  { label: 'J2', position: 0.48 },
  { label: 'Asr', position: 1 },
];

function buildEidNote(jamaatTimes: string[]): string {
  return `Eid Prayers: ${jamaatTimes.map((time, index) => `${toOrdinal(index + 1)}: ${time}`).join(' · ')}`;
}

function toOrdinal(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function buildCombinedScenarios(eidJamaats: string[]): CombinedScenario[] {
  const resolvedEidJamaats = eidJamaats.length > 0 ? eidJamaats : ['07:00', '08:00'];
  const firstEidJamaat = resolvedEidJamaats[0] ?? '07:00';
  const eidNote = buildEidNote(resolvedEidJamaats);
  const jummahNote = `Jummah Prayers: 1st: ${FRIDAY_J1} · 2nd: ${FRIDAY_J2}`;
  const sharedNote = `${eidNote} · ${jummahNote}`;
  const eidTimelinePoints = [
    ...resolvedEidJamaats.map((time, index) => ({
      label: `J${index + 1}`,
      position: resolvedEidJamaats.length === 1 ? 0.2 : 0.12 + ((0.56 / Math.max(1, resolvedEidJamaats.length - 1)) * index),
    })),
    { label: 'Zawaal', position: 1 },
  ];

  const eidHeroScenarios: CombinedScenario[] = resolvedEidJamaats.map((time, index) => ({
    id: `eid-jamaat-${index + 1}`,
    title: 'Eid Prayer',
    kicker: 'Eid ul Fitr + Jummah',
    heroKey: 'Eid',
    isEidHero: true,
    countdownInfo: {
      label: `${toOrdinal(index + 1)} Eid`,
      value: index < resolvedEidJamaats.length - 1 ? '00:20:00' : '01:20:00',
      note: sharedNote,
      flash: false,
    },
    progress: Math.min(0.18 + (index * 0.18), 0.78),
    startLabel: `${toOrdinal(index + 1)} Eid`,
    startTime: time,
    endLabel: index < resolvedEidJamaats.length - 1 ? `${toOrdinal(index + 2)} Eid` : 'Zawaal',
    endTime: index < resolvedEidJamaats.length - 1 ? resolvedEidJamaats[index + 1] : '12:58',
    showJamaat: false,
    nextPrayerJamaatValue: '',
    eidJamaats: resolvedEidJamaats,
    timelinePoints: eidTimelinePoints,
  }));

  return [
    {
      id: 'maghrib-eve',
      title: 'Maghrib',
      kicker: 'Evening before Eid + Jummah',
      heroKey: 'Maghrib',
      countdownInfo: { label: 'Jamaat', value: '00:09:00', note: sharedNote, flash: false },
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
      id: 'isha-eve',
      title: 'Isha',
      kicker: 'Night before Eid + Jummah',
      heroKey: 'Isha',
      countdownInfo: { label: 'Until Fajr', value: '07:45:00', note: sharedNote, flash: false },
      progress: 0.88,
      startLabel: 'Isha',
      startTime: '21:15',
      endLabel: 'Fajr',
      endTime: '05:00',
      showJamaat: true,
      jamaatValue: '21:45',
      nextPrayerJamaatValue: '05:30',
    },
    {
      id: 'sunrise-friday-eid',
      title: 'Sunrise',
      kicker: 'Eid Day + Friday',
      heroKey: 'Sunrise',
      isForbidden: true,
      forbiddenEndsAt: '06:27',
      countdownInfo: { label: 'Until Eid', value: '00:38:00', note: sharedNote, flash: false },
      progress: 0.55,
      startLabel: 'Sunrise',
      startTime: '06:07',
      endLabel: 'Eid Prayer',
      endTime: firstEidJamaat,
      showJamaat: false,
      nextPrayerJamaatValue: '',
      timelinePoints: [{ label: 'Eid', position: 1 }],
    },
    ...eidHeroScenarios,
    {
      id: 'zawaal-friday',
      title: 'Zawaal',
      kicker: 'Forbidden prayer window',
      heroKey: 'Zawaal',
      isForbidden: true,
      forbiddenEndsAt: '13:10',
      countdownInfo: {
        label: 'Until Jummah',
        value: '00:12:00',
        note: `The final eid prayer has been · ${jummahNote}`,
        flash: false,
      },
      progress: 0.93,
      startLabel: 'Start',
      startTime: '12:58',
      endLabel: 'Jummah Athan',
      endTime: '13:10',
      showJamaat: false,
      nextPrayerJamaatValue: '',
      timelinePoints: [{ label: 'Jummah', position: 1 }],
    },
    {
      id: 'jumuah-pre-j1',
      title: 'Jumuah',
      kicker: 'After Eid on Friday',
      heroKey: 'Jumuah',
      isFridayJumuahHero: true,
      countdownInfo: { label: '1st Jummah', value: '00:18:00', note: jummahNote, flash: false },
      progress: 0.24,
      startLabel: 'First Athan',
      startTime: '13:10',
      endLabel: 'Asr Start',
      endTime: '17:56',
      showJamaat: false,
      nextPrayerJamaatValue: '18:25',
      j1: FRIDAY_J1,
      j2: FRIDAY_J2,
      timelinePoints: JUMUAH_TIMELINE,
    },
    {
      id: 'jumuah-between',
      title: 'Jumuah',
      kicker: 'After Eid on Friday',
      heroKey: 'Jumuah',
      isFridayJumuahHero: true,
      countdownInfo: { label: '2nd Jummah', value: '00:22:00', note: jummahNote, flash: false },
      progress: 0.48,
      startLabel: 'First Athan',
      startTime: '13:10',
      endLabel: 'Asr Start',
      endTime: '17:56',
      showJamaat: false,
      nextPrayerJamaatValue: '18:25',
      j1: FRIDAY_J1,
      j2: FRIDAY_J2,
      timelinePoints: JUMUAH_TIMELINE,
    },
  ];
}

export default function HeroPreviewEidJumuahScreen() {
  const flashAnim = useRef(new Animated.Value(1)).current;
  const [eidJamaats, setEidJamaats] = useState<string[]>(['07:00', '08:00', '09:00']);

  useEffect(() => {
    const load = async () => {
      const eidData = await fetchEidUlFitr();
      const times = eidData?.jamaats?.map((entry) => entry.time).filter((time): time is string => !!time) ?? [];
      if (times.length > 0) setEidJamaats(times);
    };
    void load();
  }, []);

  const cards = useMemo(() => buildCombinedScenarios(eidJamaats), [eidJamaats]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Eid + Jummah Same Day</Text>
        <Text style={styles.subtitle}>Preview when 1st Shawaal falls on Friday</Text>

        {cards.map((scenario) => (
          <View key={scenario.id} style={styles.block}>
            <Text style={styles.blockTitle}>{scenario.id.replace(/-/g, ' ')}</Text>
            <PrayerHeroCard
              visible
              backgroundSource={PRAYER_BG_IMAGES[scenario.heroKey]}
              gradientColors={PRAYER_GRADIENTS[scenario.heroKey]}

              backgroundImageOpacity={0.82}
              heroWide={false}
              kicker={scenario.kicker}
              title={scenario.title}
              isForbidden={!!scenario.isForbidden}
              forbiddenEndsAt={scenario.forbiddenEndsAt ?? '--:--'}
              isFridayJumuahHero={!!scenario.isFridayJumuahHero}
              isEidHero={!!scenario.isEidHero}
              athanValue={scenario.startTime}
              j1={scenario.j1 ?? ''}
              j2={scenario.j2 ?? ''}
              eidJamaats={scenario.eidJamaats ?? []}
              showJamaat={!!scenario.showJamaat}
              jamaatValue={scenario.jamaatValue ?? ''}
              countdownInfo={scenario.countdownInfo}
              flashAnim={flashAnim}
              progress={scenario.progress}
              athanMarker={0}
              jamaatMarker={scenario.showJamaat ? 0.22 : null}
              endMarker={1}
              midMarker={null}
              startLabel={scenario.startLabel}
              startTime={scenario.startTime}
              endLabel={scenario.endLabel}
              endTime={scenario.endTime}
              midLabel=""
              midTime=""
              timelinePoints={scenario.timelinePoints ?? []}
              hasNext
              nextPrayerName={scenario.endLabel}
              nextPrayerTime={scenario.endTime}
              nextPrayerJamaatValue={scenario.nextPrayerJamaatValue ?? ''}
              prayerIcons={PRAYER_ICONS}
              localTime="13:12"
              ampm="PM"
              seconds="00"
              hijriLabel={`${EID_DATE} 1447 AH`}
              loadingHijri={false}
              dayName="Friday"
              dateShort="20 Apr 2026"
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
