import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrayerHeroCard from '@/components/prayer/PrayerHeroCard';
import { PRAYER_BG_IMAGES, PRAYER_GRADIENTS, PRAYER_ICONS, getInterpolatedPrayerOverlay } from '@/components/prayer/heroConfig';
import { fetchEidUlAdha } from '@/services/eidService';
import { buildAdhaJumuahScenarios } from '../components/prayer/previewScenarios';

const EID_DATE = '10th Dhul Hijjah';

export default function HeroPreviewEidAdhaJumuahScreen() {
  const flashAnim = useRef(new Animated.Value(1)).current;
  const [eidJamaats, setEidJamaats] = useState<string[]>(['06:40', '07:10', '07:40']);

  useEffect(() => {
    const load = async () => {
      const eidData = await fetchEidUlAdha();
      const times = eidData?.jamaats?.map((entry) => entry.time).filter((time): time is string => !!time) ?? [];
      if (times.length > 0) setEidJamaats(times);
    };
    void load();
  }, []);

  const cards = useMemo(() => buildAdhaJumuahScenarios(eidJamaats), [eidJamaats]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Eid ul Adha + Jummah Same Day</Text>
        <Text style={styles.subtitle}>Preview when 10th Dhul Hijjah falls on Friday</Text>

        {cards.map((scenario) => (
          <View key={scenario.id} style={styles.block}>
            <Text style={styles.blockTitle}>{scenario.id.replace(/-/g, ' ')}</Text>
            <PrayerHeroCard
              visible
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
