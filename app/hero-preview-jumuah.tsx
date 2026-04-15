import React, { useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import PrayerHeroCard from '@/components/prayer/PrayerHeroCard';
import { PRAYER_BG_IMAGES, PRAYER_GRADIENTS, PRAYER_ICONS } from '@/components/prayer/heroConfig';
import { FRIDAY_SCENARIOS } from '../components/prayer/previewScenarios';

export default function HeroPreviewJumuahScreen() {
  const flashAnim = useRef(new Animated.Value(1)).current;
  const cards = useMemo(() => FRIDAY_SCENARIOS, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Jummah Info Strip Preview</Text>
        <Text style={styles.subtitle}>Thu Asr → Maghrib → Isha → Fri Fajr → Sunrise → Ishraq → Zawaal → Jumuah → Asr</Text>

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
              timelinePoints={s.timelinePoints ?? []}
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
