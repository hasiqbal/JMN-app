import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrayerHeroCard, { type HeroCountdownInfo } from '@/components/prayer/PrayerHeroCard';
import { PRAYER_BG_IMAGES, PRAYER_GRADIENTS, PRAYER_ICONS } from '@/components/prayer/heroConfig';
import { fetchEidUlFitr } from '@/services/eidService';

type EidScenario = {
  id: string;
  title: string;
  kicker: string;
  isForbidden?: boolean;
  forbiddenEndsAt?: string;
  isEidHero?: boolean;
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
  eidJamaats?: string[];
  eidTomorrowJamaats?: string[];
  eidTomorrowLabel?: string;
  timelinePoints?: { label: string; position: number }[];
  heroKey: keyof typeof PRAYER_BG_IMAGES;
};

// Will be fetched from database
const EID_DATE = '1st Shawaal';

function buildEidNote(jamaatTimes: string[]): string {
  return jamaatTimes.map((time, index) => `${toOrdinal(index + 1)}: ${time}`).join(' · ');
}

function toOrdinal(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value}st`;
  if (mod10 === 2 && mod100 !== 12) return `${value}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${value}rd`;
  return `${value}th`;
}

function buildEidScenarios(jamaatTimes: string[]): EidScenario[] {
  const resolvedJamaats = jamaatTimes.length > 0 ? jamaatTimes : ['06:30'];
  const firstJamaat = resolvedJamaats[0] ?? '06:30';
  const eidTimelinePoints = [
    ...resolvedJamaats.map((time, index) => ({
      label: `J${index + 1}`,
      position: resolvedJamaats.length === 1 ? 0.2 : 0.12 + ((0.56 / Math.max(1, resolvedJamaats.length - 1)) * index),
    })),
    { label: 'Zawaal', position: 1 },
  ];
  const eidHeroScenarios = resolvedJamaats.map((time, index) => {
    const currentLabel = `${toOrdinal(index + 1)} Eid`;
    const nextLabel = `${toOrdinal(index + 2)} Eid`;

    return {
      id: `eid-jamaat-${index + 1}`,
      title: 'Eid Prayer',
      kicker: 'Eid ul Fitr',
      isEidHero: true,
      heroKey: 'Eid' as const,
      countdownInfo: {
        label: currentLabel,
        value: index < resolvedJamaats.length - 1 ? '00:18:00' : '01:35:00',
        note: '',
        flash: false,
      },
      progress: Math.min(0.18 + (index * 0.18), 0.78),
      startLabel: currentLabel,
      startTime: time,
      endLabel: index < resolvedJamaats.length - 1 ? nextLabel : 'Zawaal',
      endTime: index < resolvedJamaats.length - 1 ? resolvedJamaats[index + 1] : '12:58',
      showJamaat: false,
      nextPrayerJamaatValue: '',
      eidJamaats: resolvedJamaats,
      timelinePoints: eidTimelinePoints,
    };
  });
  
  return [
  {
    id: 'maghrib-ramadan-eve',
    title: 'Maghrib',
    kicker: 'Evening before Eid',
    heroKey: 'Maghrib',
    countdownInfo: {
      label: 'Until Eid',
      value: '11:30:00',
      note: '',
      flash: false,
    },
    progress: 0.22,
    startLabel: 'Start',
    startTime: '19:48',
    endLabel: 'Eid Prayer',
    endTime: firstJamaat,
    showJamaat: true,
    jamaatValue: '19:58',
    nextPrayerJamaatValue: '',
    eidTomorrowJamaats: resolvedJamaats,
    eidTomorrowLabel: 'Eid ul Fitr · Tomorrow',
    timelinePoints: [{ label: 'Eid', position: 1 }],
  },
  {
    id: 'isha-ramadan-eve',
    title: 'Isha',
    kicker: 'Last prayer before Eid',
    heroKey: 'Isha',
    countdownInfo: {
      label: 'Until Eid',
      value: '09:45:00',
      note: '',
      flash: false,
    },
    progress: 0.4,
    startLabel: 'Start',
    startTime: '21:20',
    endLabel: 'Eid Prayer',
    endTime: firstJamaat,
    showJamaat: true,
    jamaatValue: '21:45',
    nextPrayerJamaatValue: '',
    eidTomorrowJamaats: resolvedJamaats,
    eidTomorrowLabel: 'Eid ul Fitr · Tomorrow',
    timelinePoints: [{ label: 'Eid', position: 1 }],
  },
  {
    id: 'fajr-eid-day',
    title: 'Fajr',
    kicker: 'Eid Day',
    heroKey: 'Fajr',
    countdownInfo: {
      label: 'Until Eid',
      value: '01:15:00',
      note: '',
      flash: false,
    },
    progress: 0.24,
    startLabel: 'Start',
    startTime: '05:00',
    endLabel: 'Eid Prayer',
    endTime: firstJamaat,
    showJamaat: true,
    jamaatValue: '05:30',
    nextPrayerJamaatValue: '',
    eidTomorrowJamaats: resolvedJamaats,
    eidTomorrowLabel: 'Eid ul Fitr · Today',
    timelinePoints: [{ label: 'Eid', position: 1 }],
  },
  {
    id: 'sunrise-eid-day',
    title: 'Sunrise',
    kicker: 'Eid Day',
    isForbidden: true,
    forbiddenEndsAt: '06:27',
    heroKey: 'Sunrise',
    countdownInfo: {
      label: 'Until Eid',
      value: '00:38:00',
      note: '',
      flash: false,
    },
    progress: 0.55,
    startLabel: 'Sunrise',
    startTime: '06:07',
    endLabel: 'Eid Prayer',
    endTime: firstJamaat,
    showJamaat: false,
    nextPrayerJamaatValue: '',
    eidTomorrowJamaats: resolvedJamaats,
    eidTomorrowLabel: 'Eid ul Fitr · Today',
    timelinePoints: [{ label: 'Eid', position: 1 }],
  },
  ...eidHeroScenarios,
  {
    id: 'zawaal-after-final-eid-jamaat',
    title: 'Zawaal',
    kicker: 'Prayer Pause Window',
    isForbidden: true,
    forbiddenEndsAt: '12:58',
    heroKey: 'Zawaal',
    countdownInfo: {
      label: 'Until Zawaal',
      value: '00:45:00',
      note: 'The final eid prayer has been',
      flash: false,
    },
    progress: 0.94,
    startLabel: `${toOrdinal(resolvedJamaats.length)} Jamaat`,
    startTime: resolvedJamaats[resolvedJamaats.length - 1] ?? '07:00',
    endLabel: 'Zawaal',
    endTime: '12:58',
    showJamaat: false,
    nextPrayerJamaatValue: '',
    timelinePoints: eidTimelinePoints,
  },
  {
    id: 'dhuhr-after-eid',
    title: 'Dhuhr',
    kicker: 'Current Prayer',
    heroKey: 'Dhuhr',
    countdownInfo: {
      label: 'Jamaat',
      value: '00:08:25',
      note: '',
      flash: false,
    },
    progress: 0.36,
    startLabel: 'Start',
    startTime: '13:10',
    endLabel: 'Asr',
    endTime: '17:56',
    showJamaat: true,
    jamaatValue: '14:00',
    nextPrayerJamaatValue: '18:25',
    timelinePoints: [
      { label: 'Jamaat', position: 0.22 },
      { label: 'Asr', position: 1 },
    ],
  },
];
}

export default function HeroPreviewEidScreen() {
  const flashAnim = useRef(new Animated.Value(1)).current;
  const [eidJamaatTimes, setEidJamaatTimes] = useState<string[]>(['06:30']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eidData = await fetchEidUlFitr();
        if (eidData) {
          if (eidData?.jamaats?.length) {
            const times = eidData.jamaats
              .map((entry) => entry.time)
              .filter((time): time is string => !!time);
            if (times.length > 0) setEidJamaatTimes(times);
          }
        }
      } catch (err) {
        console.error('Error fetching Eid data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const cards = useMemo(() => buildEidScenarios(eidJamaatTimes), [eidJamaatTimes]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Eid ul Fitr Preview</Text>
        <Text style={styles.subtitle}>30 Ramadan Maghrib to Eid Prayer to Zawaal</Text>
        {loading && <Text style={styles.loadingText}>Loading Eid times from database...</Text>}
        <Text style={styles.timesLabel}>Eid Prayers: {buildEidNote(eidJamaatTimes)}</Text>

        {cards.map((s) => (
          <View key={s.id} style={styles.block}>
            <Text style={styles.blockTitle}>{s.id.replace(/-/g, ' ')}</Text>
            <PrayerHeroCard
              visible
              backgroundSource={PRAYER_BG_IMAGES[s.heroKey]}
              gradientColors={PRAYER_GRADIENTS[s.heroKey]}

              backgroundImageOpacity={0.82}
              heroWide={false}
              kicker={s.kicker}
              title={s.title}
              isForbidden={!!s.isForbidden}
              forbiddenEndsAt={s.forbiddenEndsAt ?? '--:--'}
              isFridayJumuahHero={false}
              isEidHero={!!s.isEidHero}
              athanValue={s.startTime}
              j1=""
              j2=""
              eidJamaats={s.eidJamaats ?? []}
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
              timelinePoints={s.timelinePoints ?? []}
              eidTomorrowJamaats={s.eidTomorrowJamaats}
              eidTomorrowLabel={s.eidTomorrowLabel}
              hasNext
              nextPrayerName={s.endLabel}
              nextPrayerTime={s.endTime}
              nextPrayerJamaatValue={s.nextPrayerJamaatValue ?? ''}
              prayerIcons={PRAYER_ICONS}
              localTime='13:12'
              ampm='PM'
              seconds='00'
              hijriLabel={`${EID_DATE} 1447 AH`}
              loadingHijri={false}
              dayName='Saturday'
              dateShort='20 Apr 2026'
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
  loadingText: {
    color: 'rgba(255,200,100,0.9)',
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  timesLabel: {
    color: 'rgba(100,200,255,0.9)',
    fontSize: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    fontWeight: '600',
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
