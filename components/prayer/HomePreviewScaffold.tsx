import React, { useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import PrayerHeroCard from '@/components/prayer/PrayerHeroCard';
import { PRAYER_BG_IMAGES, PRAYER_GRADIENTS, PRAYER_ICONS, getInterpolatedPrayerOverlay } from '@/components/prayer/heroConfig';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { type SharedPreviewScenario } from '@/components/prayer/previewScenarios';

type PreviewMode = 'jumuah' | 'eid-fitr-jumuah' | 'eid-adha' | 'eid-adha-jumuah';

export type HomePreviewScenario = SharedPreviewScenario & {
  mode: PreviewMode;
  previewLabel: string;
  previewTime: string;
  dayName: string;
  dateShort: string;
  hijriLabel: string;
};

function toTimeParts(value: string): { localTime: string; ampm: string } {
  const raw = value.trim();
  const meridian = raw.match(/(am|pm)$/i);
  if (meridian) {
    const clean = raw.replace(/\s*(am|pm)$/i, '');
    const [hour, minute] = clean.split(':').map(Number);
    let hour24 = hour;
    if (/pm/i.test(meridian[1]) && hour24 !== 12) hour24 += 12;
    if (/am/i.test(meridian[1]) && hour24 === 12) hour24 = 0;
    return {
      localTime: `${String(hour24).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}`,
      ampm: meridian[1].toUpperCase(),
    };
  }

  const [hour, minute] = raw.split(':').map(Number);
  return {
    localTime: `${String(hour || 0).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}`,
    ampm: (hour || 0) >= 12 ? 'PM' : 'AM',
  };
}

function buildForYouChips(scenario: HomePreviewScenario): string[] {
  if (scenario.mode === 'jumuah') {
    if (scenario.title === 'Jumuah') return ['Surah Al-Kahf', 'Salawat', 'Arrive early'];
    if (scenario.title === 'Isha') return ['Set Jummah intention', 'Prepare clothes', 'Sleep early'];
    return ['Morning adhkar', 'Quran portion', 'Masjid updates'];
  }

  if (scenario.mode === 'eid-fitr-jumuah') {
    if (scenario.isEidHero) return ['Takbirat', 'Family greetings', 'Charity'];
    if (scenario.title === 'Jumuah') return ['Salawat', 'Khutbah focus', 'Community meet'];
    return ['Eid planning', 'Takbirat', 'Jummah timings'];
  }

  if (scenario.mode === 'eid-adha') {
    if (scenario.isEidHero) return ['Takbirat', 'Qurbani reminder', 'Family visit'];
    return ['Eid prep', 'Qurbani intention', 'Community check-ins'];
  }

  if (scenario.isEidHero) return ['Takbirat', 'Qurbani reminder', 'Family visit'];
  if (scenario.title === 'Jumuah') return ['Salawat', 'Khutbah focus', 'Dua'];
  return ['Eid prep', 'Qurbani intention', 'Jummah timings'];
}

function buildAppealCopy(mode: PreviewMode): { eyebrow: string; title: string; body: string } {
  if (mode === 'eid-fitr-jumuah') {
    return {
      eyebrow: 'Seasonal Focus',
      title: 'Support Eid Day Hosting',
      body: 'Help cover extra prayer logistics, family refreshments, and community welcome costs.',
    };
  }

  if (mode === 'eid-adha-jumuah') {
    return {
      eyebrow: 'Seasonal Focus',
      title: 'Support Eid ul Adha Operations',
      body: 'Help manage the masjid day flow for Eid prayers, guests, and Jummah turnout.',
    };
  }

  if (mode === 'eid-adha') {
    return {
      eyebrow: 'Seasonal Focus',
      title: 'Support Eid ul Adha Hosting',
      body: 'Help manage Eid prayer operations, visitor flow, and family support services on the day.',
    };
  }

  return {
    eyebrow: 'Priority Appeal',
    title: 'Support the Rebuild',
    body: 'Your sadaqah helps complete the masjid project and keep Friday operations strong.',
  };
}

function buildPrayerList(scenario: HomePreviewScenario) {
  const defaultRows = [
    { name: 'Fajr', time: '05:00', iqamah: '05:30' },
    { name: 'Dhuhr', time: '13:10', iqamah: '14:00' },
    { name: 'Asr', time: '17:56', iqamah: '18:25' },
    { name: 'Maghrib', time: '19:48', iqamah: '19:58' },
    { name: 'Isha', time: '21:15', iqamah: '21:45' },
  ];

  if (scenario.mode === 'eid-fitr-jumuah') {
    return [
      { name: 'Fajr', time: '05:00', iqamah: '05:30' },
      { name: 'Dhuhr', time: '13:10', iqamah: '14:00' },
      { name: 'Asr', time: '17:56', iqamah: '18:25' },
      { name: 'Maghrib', time: '19:48', iqamah: '19:58' },
      { name: 'Isha', time: '21:15', iqamah: '21:45' },
    ];
  }

  if (scenario.mode === 'eid-adha-jumuah') {
    return [
      { name: 'Fajr', time: '03:58', iqamah: '05:00' },
      { name: 'Dhuhr', time: '13:08', iqamah: '14:00' },
      { name: 'Asr', time: '18:06', iqamah: '18:35' },
      { name: 'Maghrib', time: '20:11', iqamah: '20:21' },
      { name: 'Isha', time: '21:46', iqamah: '22:05' },
    ];
  }

  if (scenario.mode === 'eid-adha') {
    return [
      { name: 'Fajr', time: '03:58', iqamah: '05:00' },
      { name: 'Dhuhr', time: '13:08', iqamah: '14:00' },
      { name: 'Asr', time: '18:06', iqamah: '18:35' },
      { name: 'Maghrib', time: '20:11', iqamah: '20:21' },
      { name: 'Isha', time: '21:46', iqamah: '22:05' },
    ];
  }

  return defaultRows;
}

function PreviewBody({ scenario }: { scenario: HomePreviewScenario }) {
  const appeal = buildAppealCopy(scenario.mode);
  const chips = buildForYouChips(scenario);

  return (
    <View style={styles.bodyWrap}>
      <LinearGradient
        colors={['#0E5C42', '#0B3F30']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.appealCard}
      >
        <View style={styles.appealTopRow}>
          <Text style={styles.appealEyebrow}>{appeal.eyebrow}</Text>
          <View style={styles.appealChip}>
            <MaterialIcons name="volunteer-activism" size={11} color="#F6E7A8" />
            <Text style={styles.appealChipText}>Live on Home</Text>
          </View>
        </View>
        <Text style={styles.appealTitle}>{appeal.title}</Text>
        <Text style={styles.appealBody}>{appeal.body}</Text>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.quickRow}>
        {[
          { icon: 'campaign', label: 'Events & News' },
          { icon: 'menu-book', label: 'How To Pray' },
        ].map((item) => (
          <View key={item.label} style={styles.quickCard}>
            <View style={styles.quickIcon}>
              <MaterialIcons name={item.icon as any} size={18} color="#0D6B45" />
            </View>
            <Text style={styles.quickText}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>For You Today</Text>
      <View style={styles.chipRow}>
        {chips.map((chip) => (
          <View key={chip} style={styles.reminderChip}>
            <Text style={styles.reminderChipText}>{chip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.eventsCard}>
        <View style={styles.eventsIcon}>
          <MaterialIcons name="event" size={18} color="#0D6B45" />
        </View>
        <View style={styles.eventsContent}>
          <Text style={styles.eventsTitle}>Events & Announcements</Text>
          <Text style={styles.eventsBody}>This preview keeps the same lower-home layout while the top state shifts for the selected scenario.</Text>
        </View>
      </View>
    </View>
  );
}

export default function HomePreviewScaffold({
  title,
  subtitle,
  scenarios,
}: {
  title: string;
  subtitle: string;
  scenarios: HomePreviewScenario[];
}) {
  const flashAnim = useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {scenarios.map((scenario) => {
          const timeParts = toTimeParts(scenario.previewTime);

          return (
            <View key={scenario.id} style={styles.block}>
              <View style={styles.blockHeader}>
                <View>
                  <Text style={styles.blockTitle}>{scenario.previewLabel}</Text>
                  <Text style={styles.blockMeta}>{scenario.dayName} · {scenario.dateShort} · {scenario.hijriLabel}</Text>
                </View>
                <View style={styles.timePill}>
                  <Text style={styles.timePillText}>{scenario.previewTime}</Text>
                </View>
              </View>

              <View style={styles.phoneShell}>
                <View style={styles.heroHeader}>
                  <PrayerHeroCard
                    visible
                    embedded
                    backgroundSource={PRAYER_BG_IMAGES[scenario.heroKey]}
                    gradientColors={getInterpolatedPrayerOverlay(scenario.heroKey, scenario.progress) ?? PRAYER_GRADIENTS[scenario.heroKey]}
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
                    midMarker={scenario.midMarker ?? null}
                    startLabel={scenario.startLabel}
                    startTime={scenario.startTime}
                    endLabel={scenario.endLabel}
                    endTime={scenario.endTime}
                    midLabel={scenario.midLabel ?? ''}
                    midTime={scenario.midTime ?? ''}
                    timelinePoints={scenario.timelinePoints ?? []}
                    hasNext
                    nextPrayerName={scenario.endLabel}
                    nextPrayerTime={scenario.endTime}
                    nextPrayerJamaatValue={scenario.nextPrayerJamaatValue ?? ''}
                    prayerIcons={PRAYER_ICONS}
                    localTime={timeParts.localTime}
                    ampm={timeParts.ampm}
                    seconds="00"
                    hijriLabel={scenario.hijriLabel}
                    loadingHijri={false}
                    dayName={scenario.dayName}
                    dateShort={scenario.dateShort}
                    allPrayers={buildPrayerList(scenario)}
                  />
                </View>
                <PreviewBody scenario={scenario} />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF4F0',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 30,
    gap: 18,
  },
  header: {
    gap: 4,
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#102A1D',
  },
  subtitle: {
    fontSize: 14,
    color: '#587062',
    lineHeight: 20,
  },
  block: {
    gap: 10,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A1D',
  },
  blockMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#64806F',
  },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#DCECE3',
    borderWidth: 1,
    borderColor: '#C5DED0',
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D5E43',
  },
  phoneShell: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#F3F7F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  heroHeader: {
    backgroundColor: '#0C3152',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 10,
    gap: 10,
  },
  bodyWrap: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: '#F3F7F5',
  },
  appealCard: {
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
  },
  appealTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  appealEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C6F0DD',
    letterSpacing: 0.3,
  },
  appealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(246,231,168,0.38)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  appealChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F6E7A8',
  },
  appealTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFF1B5',
    marginBottom: 5,
  },
  appealBody: {
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.88)',
  },
  sectionTitle: {
    ...Typography.titleSmall,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  quickCard: {
    flex: 1,
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 8,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#193024',
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  reminderChip: {
    borderRadius: 999,
    backgroundColor: '#E7F1EB',
    borderWidth: 1,
    borderColor: '#D5E7DC',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reminderChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2F5544',
  },
  eventsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  eventsIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF5EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsContent: {
    flex: 1,
    gap: 4,
  },
  eventsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#163022',
  },
  eventsBody: {
    fontSize: 11,
    lineHeight: 16,
    color: '#5A7163',
  },
});