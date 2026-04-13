import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import PrayerHeroCard, { type HeroCountdownInfo } from '@/components/prayer/PrayerHeroCard';
import { PRAYER_BG_IMAGES, PRAYER_GRADIENTS, PRAYER_ICONS } from '@/components/prayer/heroConfig';
import { fetchEidUlAdha } from '@/services/eidService';

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

const EID_DATE = '10th Dhul Hijjah';
const FIVE_JAMAAT_PRESET = ['06:40', '07:10', '07:40', '08:10', '08:40'];

function buildEidNote(jamaatTimes: string[]): string {
  return jamaatTimes.map((time, index) => `J${index + 1}: ${time}`).join(' · ');
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
  const resolvedJamaats = jamaatTimes.length > 0 ? jamaatTimes : ['06:40'];
  const firstJamaat = resolvedJamaats[0] ?? '06:40';
  const eidTimelinePoints = [
    ...resolvedJamaats.map((time, index) => ({
      label: `J${index + 1}`,
      position: resolvedJamaats.length === 1 ? 0.2 : 0.12 + ((0.56 / Math.max(1, resolvedJamaats.length - 1)) * index),
    })),
    { label: 'Zawaal', position: 1 },
  ];

  const eidHeroScenarios = resolvedJamaats.map((time, index) => {
    const currentLabel = `${toOrdinal(index + 1)} Jamaat`;
    const nextLabel = `${toOrdinal(index + 2)} Jamaat`;

    return {
      id: `eid-adha-jamaat-${index + 1}`,
      title: 'Eid Prayer',
      kicker: 'Eid ul Adha',
      isEidHero: true,
      heroKey: 'EidAdha' as const,
      countdownInfo: {
        label: currentLabel,
        value: index < resolvedJamaats.length - 1 ? '00:18:00' : '01:20:00',
        note: '',
        flash: false,
      },
      progress: Math.min(0.16 + (index * 0.14), 0.82),
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
      id: 'maghrib-9-dhul-hijjah',
      title: 'Maghrib',
      kicker: 'Evening before Eid ul Adha',
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
      eidTomorrowLabel: 'Eid ul Adha · Tomorrow',
      timelinePoints: [{ label: 'Eid', position: 1 }],
    },
    {
      id: 'isha-9-dhul-hijjah',
      title: 'Isha',
      kicker: 'Night before Eid ul Adha',
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
      eidTomorrowLabel: 'Eid ul Adha · Tomorrow',
      timelinePoints: [{ label: 'Eid', position: 1 }],
    },
    {
      id: 'fajr-10-dhul-hijjah',
      title: 'Fajr',
      kicker: 'Eid ul Adha Day',
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
      eidTomorrowLabel: 'Eid ul Adha · Today',
      timelinePoints: [{ label: 'Eid', position: 1 }],
    },
    {
      id: 'sunrise-10-dhul-hijjah',
      title: 'Sunrise',
      kicker: 'Eid ul Adha Day',
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
      eidTomorrowLabel: 'Eid ul Adha · Today',
      timelinePoints: [{ label: 'Eid', position: 1 }],
    },
    ...eidHeroScenarios,
    {
      id: 'zawaal-after-final-eid-adha-jamaat',
      title: 'Zawaal',
      kicker: 'Prayer Pause Window',
      isForbidden: true,
      forbiddenEndsAt: '12:58',
      heroKey: 'Zawaal',
      countdownInfo: {
        label: 'Until Zawaal',
        value: '00:45:00',
        note: `The final eid prayer has been · Eid Prayers: ${buildEidNote(resolvedJamaats)}`,
        flash: false,
      },
      progress: 0.94,
      startLabel: `${toOrdinal(resolvedJamaats.length)} Jamaat`,
      startTime: resolvedJamaats[resolvedJamaats.length - 1] ?? '08:40',
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
        value: '00:50:00',
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

export default function HeroPreviewEidAdhaScreen() {
  const flashAnim = useRef(new Animated.Value(1)).current;
  const [eidJamaatTimes, setEidJamaatTimes] = useState<string[]>(['06:40']);
  const [loading, setLoading] = useState(true);
  const [previewFiveJamaats, setPreviewFiveJamaats] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const eidData = await fetchEidUlAdha();
        if (eidData?.jamaats?.length) {
          const times = eidData.jamaats
            .map((entry) => entry.time)
            .filter((time): time is string => !!time);
          if (times.length > 0) setEidJamaatTimes(times);
        }
      } catch (err) {
        console.error('Error fetching Eid ul Adha data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const displayedJamaats = previewFiveJamaats ? FIVE_JAMAAT_PRESET : eidJamaatTimes;
  const cards = useMemo(() => buildEidScenarios(displayedJamaats), [displayedJamaats]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Eid ul Adha Preview</Text>
        <Text style={styles.subtitle}>9 Dhul Hijjah Maghrib to Eid Prayer to Zawaal</Text>

        <View style={styles.switchRow}>
          <TouchableOpacity
            style={[styles.modeChip, previewFiveJamaats && styles.modeChipActive]}
            onPress={() => setPreviewFiveJamaats(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeChipText, previewFiveJamaats && styles.modeChipTextActive]}>5 Jamaats Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, !previewFiveJamaats && styles.modeChipActive]}
            onPress={() => setPreviewFiveJamaats(false)}
            activeOpacity={0.8}
          >
            <Text style={[styles.modeChipText, !previewFiveJamaats && styles.modeChipTextActive]}>Database Times</Text>
          </TouchableOpacity>
        </View>

        {loading && <Text style={styles.loadingText}>Loading Eid ul Adha times from database...</Text>}
        <Text style={styles.timesLabel}>Eid Prayers: {buildEidNote(displayedJamaats)}</Text>

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
              isFridayJumuahHero={false}
              isEidHero={!!s.isEidHero}
              athanValue={s.startTime}
              j1=""
              j2=""
                  eidJamaats={s.eidJamaats ?? []}
                  eidTomorrowJamaats={s.eidTomorrowJamaats}
                  eidTomorrowLabel={s.eidTomorrowLabel}
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
              hasNext
              nextPrayerName={s.endLabel}
              nextPrayerTime={s.endTime}
              nextPrayerJamaatValue={s.nextPrayerJamaatValue ?? ''}
              prayerIcons={PRAYER_ICONS}
              localTime="13:12"
              ampm="PM"
              seconds="00"
              hijriLabel={`${EID_DATE} 1447 AH`}
              loadingHijri={false}
              dayName="Saturday"
              dateShort="20 Apr 2026"
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
  switchRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  modeChip: {
    backgroundColor: 'rgba(19,56,110,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(100,184,255,0.35)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeChipActive: {
    backgroundColor: 'rgba(80,170,255,0.28)',
    borderColor: 'rgba(100,200,255,0.82)',
  },
  modeChipText: {
    color: 'rgba(210,232,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: '#FFFFFF',
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
