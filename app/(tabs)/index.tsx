import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { useAlert } from '@/template';
import { formatCountdownSeconds, getNextPrayer, type PrayerTime } from '@/services/prayerService';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { useNightMode } from '@/hooks/useNightMode';
import { useSkyBackgroundCycle } from '@/hooks/useSkyBackgroundCycle';
import { MOCK_ANNOUNCEMENTS } from '@/services/eventsService';
import { fetchSunnahReminders, SunnahReminderRow } from '@/services/contentService';
import { fetchEidUlAdha, fetchEidUlFitr } from '@/services/eidService';
import { PRAYER_BG_IMAGES } from '@/components/prayer/heroConfig';
import { buildHeroState } from '@/components/prayer/heroState';
import { buildActivePrayerState } from '@/components/prayer/activePrayerState';
import PrayerDrawerTrigger from '@/components/prayer/PrayerDrawerTrigger';
import PrayerDrawerSheet from '@/components/prayer/PrayerDrawerSheet';
import { buildPrayerDrawerRows } from '@/components/prayer/prayerDrawerState';
import { createDonationCheckoutUrl } from '@/services/donationService';
import WebView from 'react-native-webview';


const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Time-of-day hero gradient ──────────────────────────────────────────────
function getHeroImageOpacity(hour: number, prayerName: string, isForbidden: boolean): number {
  if (isForbidden) return 0.84;
  if (prayerName === 'Fajr') return 1;
  if (prayerName === 'Sunrise' || prayerName === 'Ishraq') return 0.97;
  if (prayerName === 'Maghrib') return 0.98;
  if (prayerName === 'Isha') return 0.9;
  if (hour >= 22 || hour < 4) return 0.88;
  if (hour >= 17 && hour < 20) return 0.97;
  return 0.93;
}

function getFullDayTimelineProgress(
  prayers: { name: string; timeDate: Date }[] | undefined,
  now: Date,
): number | null {
  if (!prayers || prayers.length === 0) return null;

  const fajr = prayers.find((p) => p.name === 'Fajr')?.timeDate;
  const dhuhr = prayers.find((p) => p.name === 'Dhuhr')?.timeDate;
  const asr = prayers.find((p) => p.name === 'Asr')?.timeDate;
  const maghrib = prayers.find((p) => p.name === 'Maghrib')?.timeDate;
  const isha = prayers.find((p) => p.name === 'Isha')?.timeDate;

  if (!fajr || !dhuhr || !asr || !maghrib || !isha) return null;

  const totalSegments = 5;
  let segmentIndex = 0;
  let segmentStart = fajr;
  let segmentEnd = dhuhr;

  if (now < fajr) {
    segmentIndex = 4;
    segmentStart = new Date(isha);
    segmentStart.setDate(segmentStart.getDate() - 1);
    segmentEnd = fajr;
  } else if (now < dhuhr) {
    segmentIndex = 0;
    segmentStart = fajr;
    segmentEnd = dhuhr;
  } else if (now < asr) {
    segmentIndex = 1;
    segmentStart = dhuhr;
    segmentEnd = asr;
  } else if (now < maghrib) {
    segmentIndex = 2;
    segmentStart = asr;
    segmentEnd = maghrib;
  } else if (now < isha) {
    segmentIndex = 3;
    segmentStart = maghrib;
    segmentEnd = isha;
  } else {
    segmentIndex = 4;
    segmentStart = isha;
    segmentEnd = new Date(fajr);
    segmentEnd.setDate(segmentEnd.getDate() + 1);
  }

  const totalMs = Math.max(1, segmentEnd.getTime() - segmentStart.getTime());
  const elapsedMs = Math.max(0, Math.min(totalMs, now.getTime() - segmentStart.getTime()));
  const segmentProgress = elapsedMs / totalMs;

  return Math.max(0, Math.min(1, (segmentIndex + segmentProgress) / totalSegments));
}

// ── Night palette (refined) ───────────────────────────────────────────────
const NIGHT = {
  bg:           '#0B1220',
  surface:      '#111A2E',
  surfaceAlt:   '#16223A',
  border:       'rgba(255,255,255,0.05)',
  borderStrong: '#1E2D47',
  text:         '#FFFFFF',
  textSub:      '#B8C1D9',
  textMuted:    '#7C879F',
  cardBg:       '#111A2E',
  jumuahBg:     '#1F1A0A',
  jumuahBord:   '#3D2F00',
  accent:       '#4FE948',
  accentSoft:   '#A4F2A0',
  accentGlow:   'rgba(79,233,72,0.16)',
  gold:         '#FBBF24',
  cardShadow:   'rgba(0,0,0,0.30)',
};

// ── Premium Emerald Palette (Hero + Drawer Redesign) ────────────────────
const HERO_DESIGN_TOKENS = {
  // Colors: deep emerald + mint accents
  emeraldPrimary:     '#1B7547',  // deep emerald for next prayer highlight
  emeraldLight:       '#2D9D5C',  // medium emerald for accents
  mintAccent:         '#4FE948',  // bright mint (from NIGHT.accent)
  mintSoft:           '#A4F2A0',  // soft mint (from NIGHT.accentSoft)
  // Text: warm off-white
  textPrimary:        '#F5F3F1',  // warm off-white
  textSecondary:      '#E8E5E3',  // slightly darker warm white
  textTertiary:       '#D0CCC8',  // muted warm tone
  // Overlays & backgrounds
  overlayStrong:      'rgba(2,9,19,0.4)',  // slightly dark overlay for text clarity
  overlayMedium:      'rgba(2,9,19,0.3)',
  overlayLight:       'rgba(2,9,19,0.2)',
  // Night mode variants
  nightEmerald:       '#2D9D5C',  // softer green for calm appearance
  nightMint:          '#4FE948',
};

// ── Daily rotation helpers ─────────────────────────────────────────────────
const DAY_OF_YEAR = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);

const ARABIC_MONTHS_MAP: Record<string, string> = {
  'ذو القعدة': "Dhul Qa'dah",
  'ذو الحجّة': 'Dhul Hijjah',
  'ربيع الأوّل': "Rabi' al-Awwal",
  'ربيع الآخر': "Rabi' al-Akhir",
  'جمادى الأولى': 'Jumada al-Ula',
  'جمادى الآخرة': 'Jumada al-Akhirah',
  'محرّم': 'Muharram',
  'رجب': 'Rajab',
  'شعبان': "Sha'ban",
  'رمضان': 'Ramadan',
  'شوّال': 'Shawwal',
  'صفر': 'Safar',
};

function getHijriMonthEnglish(hijri: string): string {
  const sorted = Object.entries(ARABIC_MONTHS_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of sorted) {
    if (hijri.includes(ar)) return en;
  }
  return '';
}

function getHijriDayNumber(hijri: string): string {
  const match = hijri.match(/\b(\d{1,2})\b/);
  return match ? match[1] : '';
}

function buildEidJamaatNote(jamaatTimes: string[]): string {
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

function normalizeMonthKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function getHijriMonthFromAnyFormat(hijri: string): string {
  const arabicMonth = getHijriMonthEnglish(hijri);
  if (arabicMonth) return arabicMonth;

  const match = hijri.replace(/\bAH\b/gi, '').trim().match(/^\d{1,2}\s+(.+?)\s+\d{4}$/);
  return match?.[1]?.trim() ?? '';
}

function isDhulHijjahMonth(hijriMonth: string): boolean {
  const normalized = normalizeMonthKey(hijriMonth);
  return (
    normalized === 'dhulhijjah'
    || normalized === 'zulhijjah'
    || normalized === 'dhualhijjah'
    || normalized === 'dhilhijjah'
  );
}

function isShawwalMonth(hijriMonth: string): boolean {
  const normalized = normalizeMonthKey(hijriMonth);
  return (
    normalized === 'shawwal'
    || normalized === 'shawaal'
    || normalized === 'shawal'
  );
}

// ── Hadith of the Day ────────────────────────────────────────────────────
const HADITHS = [
  { text: "The best of you are those who learn the Quran and teach it.", ref: "Sahih al-Bukhari 5027" },
  { text: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.", ref: "Sahih al-Bukhari 6018" },
  { text: "Make things easy and do not make them difficult, cheer people up and do not drive them away.", ref: "Sahih al-Bukhari 69" },
  { text: "None of you truly believes until he loves for his brother what he loves for himself.", ref: "Sahih al-Bukhari 13" },
  { text: "The strong person is not the one who can overpower others, but the one who controls himself when angry.", ref: "Sahih al-Bukhari 6114" },
  { text: "Smiling in the face of your brother is charity.", ref: "Tirmidhi 1956" },
  { text: "Allah does not look at your appearance or wealth, but He looks at your hearts and deeds.", ref: "Sahih Muslim 2564" },
  { text: "The most beloved deeds to Allah are those done regularly, even if they are small.", ref: "Sahih al-Bukhari 6464" },
  { text: "Whoever prays Fajr is under the protection of Allah.", ref: "Sahih Muslim 657" },
  { text: "The prayer is the pillar of religion. Whoever establishes it has established the religion.", ref: "Bayhaqi" },
  { text: "Cleanliness is half of faith.", ref: "Sahih Muslim 223" },
  { text: "Pay the worker his wages before his sweat dries.", ref: "Ibn Majah 2443" },
  { text: "The best charity is that given when one is in need.", ref: "Sahih al-Bukhari 1426" },
  { text: "Every act of kindness is charity.", ref: "Sahih al-Bukhari 2989" },
];

// ── Quran Verses (Prayer & Masjid themed) ────────────────────────────────
const QURAN_VERSES = [
  { arabic: "إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا", translation: "Indeed, prayer has been decreed upon the believers a decree of specified times.", ref: "An-Nisa 4:103" },
  { arabic: "وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَارْكَعُوا مَعَ الرَّاكِعِينَ", translation: "And establish prayer and give zakah and bow with those who bow.", ref: "Al-Baqarah 2:43" },
  { arabic: "إِنَّمَا يَعْمُرُ مَسَاجِدَ اللَّهِ مَنْ آمَنَ بِاللَّهِ وَالْيَوْمِ الْآخِرِ", translation: "The mosques of Allah are only to be maintained by those who believe in Allah and the Last Day.", ref: "At-Tawbah 9:18" },
  { arabic: "حَافِظُوا عَلَى الصَّلَوَاتِ وَالصَّلَاةِ الْوُسْطَىٰ وَقُومُوا لِلَّهِ قَانِتِينَ", translation: "Maintain with care the [obligatory] prayers and the middle prayer and stand before Allah devoutly obedient.", ref: "Al-Baqarah 2:238" },
  { arabic: "وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ", translation: "And seek help through patience and prayer. Indeed, it is difficult except for the humbly submissive.", ref: "Al-Baqarah 2:45" },
  { arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ", translation: "O you who have believed, seek help through patience and prayer.", ref: "Al-Baqarah 2:153" },
  { arabic: "وَأَقِمِ الصَّلَاةَ لِذِكْرِي", translation: "And establish prayer for My remembrance.", ref: "Ta-Ha 20:14" },
  { arabic: "إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ", translation: "Indeed, prayer prohibits immorality and wrongdoing.", ref: "Al-Ankabut 29:45" },
  { arabic: "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي", translation: "My Lord, make me an establisher of prayer, and [many] from my descendants.", ref: "Ibrahim 14:40" },
  { arabic: "فِي بُيُوتٍ أَذِنَ اللَّهُ أَن تُرْفَعَ وَيُذْكَرَ فِيهَا اسْمُهُ", translation: "In houses which Allah has ordered to be raised and that His name be mentioned therein.", ref: "An-Nur 24:36" },
];

const todayHadith  = HADITHS[DAY_OF_YEAR % HADITHS.length];
const todayVerse   = QURAN_VERSES[DAY_OF_YEAR % QURAN_VERSES.length];

// ── Flipping Logo Card ────────────────────────────────────────────────────


type CardFace = 'sunnah' | 'hadith' | 'verse';
const FACE_SEQUENCE: CardFace[] = ['sunnah', 'hadith', 'verse'];
const FACE_DURATION = 5000;

// ── Prayer-time gradients & icons for Next Prayer card ─────────────────
const PRAYER_CARD_GRADIENTS: Record<string, readonly [string, string]> = {
  Fajr:    ['#141560', '#2C3A9E'],
  Sunrise: ['#8B3600', '#BE4E00'],
  Ishraq:  ['#7A2E00', '#B04600'],
  Zawaal:  ['#004638', '#006F60'],
  Dhuhr:   ['#0A3D88', '#155FBE'],
  Asr:     ['#8A1E00', '#C03600'],
  Maghrib: ['#4C005E', '#880090'],
  Isha:    ['#050B24', '#0B164A'],
  Jumuah:  ['#583600', '#925E00'],
};
const PRAYER_ICONS_HOME: Record<string, string> = {
  Fajr: 'bedtime', Sunrise: 'wb-sunny', Ishraq: 'flare',
  Zawaal: 'blur-on', Dhuhr: 'wb-sunny', Asr: 'wb-cloudy',
  Maghrib: 'nights-stay', Isha: 'nightlight-round', Jumuah: 'star',
};

// ── Small Next Prayer Flipping Card ──────────────────────────────────────
const JAMAAT_FLASH_DURATION_MS = 60 * 1000;

const PRAYER_ALERT_ICONS_MAP: Record<string, string> = {
  Fajr: 'wb-twilight', Dhuhr: 'wb-sunny', Asr: 'wb-cloudy',
  Maghrib: 'nights-stay', Isha: 'nightlight-round', Jumuah: 'star',
};

type PrayerCardFace = 'prayer' | 'donate';
const PRAYER_CARD_FACES: PrayerCardFace[] = ['prayer', 'donate'];
const PRAYER_CARD_DURATION = 6000;

export function SmallFlippingPrayerCard({
  nightMode, nextPrayerName, nextPrayerTime, nextPrayerIqamah, countdown, loading,
  prayers, currentTime, onDonatePress,
}: {
  nightMode: boolean;
  nextPrayerName: string;
  nextPrayerTime: string;
  nextPrayerIqamah: string;
  countdown: string;
  loading: boolean;
  prayers: { name: string; time: string; timeDate: Date; iqamah: string }[];
  currentTime: Date;
  onDonatePress: () => void;
}) {
  const router = useRouter();
  const [faceIndex, setFaceIndex] = useState(0);
  const [displayFace, setDisplayFace] = useState<PrayerCardFace>('prayer');
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const flashAnim = useRef(new Animated.Value(1)).current;
  const flashLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // ── Detect active prayer ───────────────────────────────────────────────
  const prayable = prayers.filter(p => !['Sunrise', 'Ishraq', 'Zawaal'].includes(p.name));
  let activePrayer: typeof prayable[0] | null = null;
  for (let i = 0; i < prayable.length; i++) {
    const cur = prayable[i];
    const next = prayable[i + 1];
    if (cur.timeDate <= currentTime && (!next || next.timeDate > currentTime)) {
      activePrayer = cur;
      break;
    }
  }

  const jamaatDate: Date | null = (() => {
    if (!activePrayer) return null;
    const iq = activePrayer.iqamah;
    if (!iq || iq === '-' || iq === '--:--') return null;
    const [h, m] = iq.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const d = new Date(currentTime);
    d.setHours(h, m, 0, 0);
    return d;
  })();

  const jamaatStarted = jamaatDate ? currentTime >= jamaatDate : false;
  const jamaatFlashOver = jamaatDate
    ? currentTime >= new Date(jamaatDate.getTime() + JAMAAT_FLASH_DURATION_MS)
    : false;
  const alertMode = activePrayer !== null && !jamaatFlashOver;

  const secondsToJamaat = jamaatDate && !jamaatStarted
    ? Math.max(0, Math.floor((jamaatDate.getTime() - currentTime.getTime()) / 1000))
    : 0;
  const jamaatCountdown = formatCountdownSeconds(secondsToJamaat);
  const hasJamaat = jamaatDate !== null;

  // ── Flash loop when jamaat starts ──────────────────────────────────────
  useEffect(() => {
    if (jamaatStarted && !jamaatFlashOver) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 0.2, duration: 400, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      flashLoopRef.current = loop;
      loop.start();
    } else {
      flashLoopRef.current?.stop();
      flashLoopRef.current = null;
      flashAnim.setValue(1);
    }
    return () => { flashLoopRef.current?.stop(); };
  }, [jamaatStarted, jamaatFlashOver, flashAnim]);

  // ── Normal flip (paused during alert mode) ──────────────────────────────
  const flipTo = useCallback((nextIndex: number) => {
    Animated.timing(rotateAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start(() => {
      setDisplayFace(PRAYER_CARD_FACES[nextIndex]);
      rotateAnim.setValue(-1);
      Animated.timing(rotateAnim, { toValue: 0, duration: 320, useNativeDriver: true }).start();
    });
  }, [rotateAnim]);

  useEffect(() => {
    if (alertMode) return;
    const id = setInterval(() => {
      setFaceIndex(prev => { const next = (prev + 1) % PRAYER_CARD_FACES.length; flipTo(next); return next; });
    }, PRAYER_CARD_DURATION);
    return () => clearInterval(id);
  }, [flipTo, alertMode]);

  const rotateZ = rotateAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-90deg', '0deg', '90deg'] });
  const prayerGrad: readonly [string, string] = PRAYER_CARD_GRADIENTS[nextPrayerName] ?? ['#0A3D88', '#155FBE'];
  const donateGrad: readonly [string, string] = ['#0B3B2C', '#165A40'];
  const alertGrad: readonly [string, string]  = PRAYER_CARD_GRADIENTS[activePrayer?.name ?? ''] ?? ['#0A3D88', '#155FBE'];
  const activeGrad = alertMode ? alertGrad : (displayFace === 'donate' ? donateGrad : prayerGrad);
  const prayerIcon = (PRAYER_ICONS_HOME[nextPrayerName] ?? 'access-time') as any;
  const alertIcon  = (PRAYER_ALERT_ICONS_MAP[activePrayer?.name ?? ''] ?? 'access-time') as any;

  return (
    <TouchableOpacity
      style={[styles.squareCard, { overflow: 'hidden', padding: 0, minHeight: 200 }]}
      onPress={() => router.push('/(tabs)/prayer')}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={activeGrad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={{ flex: 1, width: '100%', alignItems: 'center', paddingVertical: Spacing.sm, paddingHorizontal: 6 }}>

        {alertMode ? (
          // ── ALERT FACE: prayer has begun ──────────────────────────────────
          <View style={[smallFlipStyles.face, { gap: 6 }]}>
            <Animated.View style={[smallFlipStyles.prayerIconRing, { opacity: jamaatStarted ? flashAnim : 1 }]}>
              <MaterialIcons name={alertIcon} size={22} color="rgba(255,255,255,0.95)" />
            </Animated.View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.nextPrayerSquareLabel, { fontSize: 9 }]}>Time has begun</Text>
              <Text style={[styles.nextPrayerSquareName, { fontSize: 22, fontWeight: '900' }]}>
                {activePrayer!.name}
              </Text>
            </View>
            <View style={styles.squareDivider2} />
            {jamaatStarted ? (
              <Animated.View style={[smallAlertStyles.jamaatPill, { opacity: flashAnim }]}>
                <MaterialIcons name="group" size={13} color="#fff" />
                <Text style={smallAlertStyles.jamaatPillText}>Jamaat!</Text>
              </Animated.View>
            ) : hasJamaat ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={smallAlertStyles.jamaatLabel}>Jamaat in</Text>
                <Text style={smallAlertStyles.jamaatCountdown}>{jamaatCountdown}</Text>
              </View>
            ) : (
              <View style={smallAlertStyles.noJamaatRow}>
                <MaterialIcons name="check-circle" size={13} color="rgba(255,255,255,0.65)" />
                <Text style={smallAlertStyles.jamaatLabel}>No Jamaat set</Text>
              </View>
            )}
          </View>
        ) : (
          // ── NORMAL FLIP FACES ─────────────────────────────────────────────
          <Animated.View style={[smallFlipStyles.animView, { transform: [{ rotateZ }] }]}>
            {displayFace === 'prayer' ? (
              <View style={smallFlipStyles.face}>
                <View style={smallFlipStyles.prayerIconRing}>
                  <MaterialIcons name={prayerIcon} size={22} color="rgba(255,255,255,0.95)" />
                </View>
                <Text style={styles.nextPrayerSquareLabel}>Next Prayer</Text>
                {loading || !nextPrayerName ? (
                  <ActivityIndicator color="#fff" size="small" style={{ marginTop: 2 }} />
                ) : (
                  <>
                    <Text style={styles.nextPrayerSquareName}>{nextPrayerName}</Text>
                    <View style={styles.nextTimeRow}>
                      <MaterialIcons name="volume-up" size={9} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.nextTimeSub}>Athan</Text>
                      <Text style={styles.nextTimeVal}>{nextPrayerTime}</Text>
                    </View>
                    {nextPrayerIqamah ? (
                      <View style={styles.nextTimeRow}>
                        <MaterialIcons name="group" size={9} color="rgba(255,255,255,0.6)" />
                        <Text style={styles.nextTimeSub}>Iqamah</Text>
                        <Text style={styles.nextTimeIqamah}>{nextPrayerIqamah}</Text>
                      </View>
                    ) : null}
                    <View style={styles.squareDivider2} />
                    <Text style={styles.nextPrayerSquareCountdown}>{countdown}</Text>
                    <Text style={styles.nextPrayerSquareCountdownSub}>remaining</Text>
                  </>
                )}
              </View>
            ) : (
              <View style={[smallFlipStyles.face, { gap: 5, paddingHorizontal: 8, paddingVertical: 6 }]}>
                {/* JMN logo in gold ring */}
                <View style={rebuildStyles.iconRing}>
                  <Image
                    source={require('../../assets/images/masjid-logo.png')}
                    style={rebuildStyles.logoImg}
                    contentFit="contain"
                  />
                </View>
                <View style={{ alignItems: 'center', gap: 1 }}>
                  <Text style={rebuildStyles.label}>PROJECT</Text>
                  <Text style={rebuildStyles.title}>Rebuild</Text>
                </View>
                <View style={rebuildStyles.divider} />
                <Text style={rebuildStyles.tagline}>Jami{"'"}  Masjid Noorani</Text>
                <Text style={rebuildStyles.sub}>Halifax, UK</Text>
                <TouchableOpacity
                  onPress={onDonatePress}
                  style={rebuildStyles.btn}
                >
                  <MaterialIcons name="volunteer-activism" size={10} color="#0B3B2C" />
                  <Text style={rebuildStyles.btnText}>Donate Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}

        {!alertMode ? (
          <View style={smallFlipStyles.dots}>
            {PRAYER_CARD_FACES.map((_, i) => (
              <View key={i} style={[smallFlipStyles.dot, i === faceIndex && smallFlipStyles.dotActive]} />
            ))}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Project Rebuild card styles ─────────────────────────────────────────
const rebuildStyles = StyleSheet.create({
  iconRing: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.80)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 1,
    overflow: 'hidden',
  },
  logoImg: {
    width: 34, height: 34,
  },
  label: {
    fontSize: 8, fontWeight: '900', color: 'rgba(212,175,55,0.75)',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  title: {
    fontSize: 20, fontWeight: '900', color: '#E8D48B',
    letterSpacing: 0.5, lineHeight: 22, textTransform: 'uppercase',
  },
  divider: {
    width: 40, height: 1.5, backgroundColor: 'rgba(212,175,55,0.35)',
    borderRadius: 1,
  },
  tagline: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.90)',
    textAlign: 'center',
  },
  sub: {
    fontSize: 9, fontWeight: '500', color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', marginTop: -3,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#D4AF37',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    marginTop: 2,
  },
  btnText: { fontSize: 10, fontWeight: '900', color: '#0B3B2C', letterSpacing: 0.2 },
});

// ── Small alert face styles ───────────────────────────────────────────────
const smallAlertStyles = StyleSheet.create({
  jamaatLabel: {
    fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase', letterSpacing: 0.7, textAlign: 'center',
  },
  jamaatCountdown: {
    fontSize: 26, fontWeight: '900', color: '#fff',
    letterSpacing: 2, fontVariant: ['tabular-nums'] as any, lineHeight: 30,
  },
  jamaatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)',
  },
  jamaatPillText: {
    fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 1,
  },
  noJamaatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
  },
});

type SunnahEntry = { act: string; detail: string; ref: string; icon: string };

export function FlippingLogoCard({ nightMode, sunnah }: {
  nightMode: boolean;
  sunnah: SunnahEntry;
}) {
  const [faceIndex, setFaceIndex] = useState(0);
  const [displayFace, setDisplayFace] = useState<CardFace>('sunnah');
  const rotateAnim  = useRef(new Animated.Value(0)).current;

  const flipTo = useCallback((nextIndex: number) => {
    Animated.timing(rotateAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
      setDisplayFace(FACE_SEQUENCE[nextIndex]);
      rotateAnim.setValue(-1);
      Animated.timing(rotateAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    });
  }, [rotateAnim]);

  useEffect(() => {
    const id = setInterval(() => {
      setFaceIndex(prev => { const next = (prev + 1) % FACE_SEQUENCE.length; flipTo(next); return next; });
    }, FACE_DURATION);
    return () => clearInterval(id);
  }, [flipTo]);

  const rotateZ = rotateAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-90deg', '0deg', '90deg'] });

  const cardBg = nightMode ? NIGHT.surface : '#FFFFFF';
  const textCol = nightMode ? NIGHT.text : Colors.textPrimary;
  const subCol  = nightMode ? NIGHT.textSub : Colors.textSubtle;
  const borderC = nightMode ? NIGHT.borderStrong : Colors.border;

  const renderFace = () => {
    if (displayFace === 'sunnah') {
      const sunnahColor = nightMode ? '#4FE948' : Colors.primary;
      const accentBg    = nightMode ? 'rgba(79,233,72,0.12)' : 'rgba(79,233,72,0.08)';
      return (
        <View style={flipCard.face}>
          <View style={flipCard.faceHeader}>
            <MaterialIcons name="star" size={16} color={sunnahColor} />
            <Text style={[flipCard.faceLabel, { color: sunnahColor }]}>Daily Sunnah</Text>
          </View>
          <View style={[flipCard.sunnahActBox, { backgroundColor: accentBg, borderColor: sunnahColor + '40' }]}>
            <Text style={[flipCard.sunnahAct, { color: textCol }]}>{sunnah.act}</Text>
          </View>
          <Text style={[flipCard.sunnahDetail, { color: subCol }]}>{sunnah.detail}</Text>
          <Text style={[flipCard.refText, { color: sunnahColor }]}>{sunnah.ref}</Text>
        </View>
      );
    }
    if (displayFace === 'hadith') {
      const hadithColor = nightMode ? NIGHT.accentSoft : Colors.primary;
      const hadithBg    = nightMode ? NIGHT.accentGlow : 'rgba(79,233,72,0.07)';
      return (
        <View style={flipCard.face}>
          <View style={flipCard.faceHeader}>
            <MaterialIcons name="format-quote" size={16} color={hadithColor} />
            <Text style={[flipCard.faceLabel, { color: hadithColor }]}>Hadith of the Day</Text>
          </View>
          <Text style={[flipCard.bigQuote, { color: hadithColor }]}>❝</Text>
          <View style={[flipCard.hadithBox, { backgroundColor: hadithBg, borderColor: hadithColor + '30' }]}>
            <Text style={[flipCard.hadithTextImproved, { color: textCol }]}>{todayHadith.text}</Text>
          </View>
          <View style={[flipCard.refDivider, { backgroundColor: hadithColor + '40' }]} />
          <Text style={[flipCard.refText, { color: hadithColor }]}>— {todayHadith.ref}</Text>
        </View>
      );
    }
    if (displayFace === 'verse') {
      const verseCol = nightMode ? '#4FE948' : Colors.primary;
      const verseBg  = nightMode ? 'rgba(79,233,72,0.12)' : 'rgba(79,233,72,0.08)';
      return (
        <View style={flipCard.face}>
          <View style={flipCard.faceHeader}>
            <MaterialIcons name="menu-book" size={16} color={verseCol} />
            <Text style={[flipCard.faceLabel, { color: verseCol }]}>Verse of the Day</Text>
          </View>
          <View style={[flipCard.sunnahActBox, { backgroundColor: verseBg, borderColor: verseCol + '40', marginBottom: 2 }]}>
            <Text style={[flipCard.arabicText, { color: verseCol }]}>{todayVerse.arabic}</Text>
          </View>
          <Text style={[flipCard.translationText, { color: textCol }]}>{todayVerse.translation}</Text>
          <Text style={[flipCard.refText, { color: verseCol }]}>{todayVerse.ref}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.logoCard, { backgroundColor: cardBg }]}>
      <Animated.View style={[flipCard.animView, { transform: [{ rotateZ }] }]}>
        {renderFace()}
      </Animated.View>
      <View style={[flipCard.dots, { borderTopColor: borderC }]}>
        {FACE_SEQUENCE.map((_, i) => (
          <View key={i} style={[flipCard.dot, { backgroundColor: borderC }, i === faceIndex && { backgroundColor: nightMode ? '#69A8FF' : Colors.primary, width: 14 }]} />
        ))}
      </View>
    </View>
  );
}

// ── For You Today — Prayer-aware dismissible cards ──────────────────────
type FYCardData = {
  id: string;
  icon: string;
  color: string;
  title: string;
  sub: string;
  route?: string;
  badge?: string;
  // prayerTab controls which chip is pre-selected when navigating to Adhkar tab
  prayerTab?: string;
  // true when the prayer window has passed but adhkar wasn't completed
  isOverdue?: boolean;
};

const PRAYER_ADHKAR_CARDS: Record<string, FYCardData> = {
  Fajr: {
    id: 'adhkar-fajr', icon: 'wb-twilight', color: '#4FE948',
    title: 'Morning Adhkar', sub: 'Wird al-Latif · Yaseen · Dua of Yaseen',
    route: '/(tabs)/duas', badge: 'After Fajr', prayerTab: 'after-fajr',
  },
  Dhuhr: {
    id: 'adhkar-dhuhr', icon: 'wb-sunny', color: '#0A5C9E',
    title: 'Dhuhr Adhkar', sub: 'Tasbih · Salawat · Astaghfirullah',
    route: '/(tabs)/duas', badge: 'After Dhuhr', prayerTab: 'after-dhuhr',
  },
  Asr: {
    id: 'adhkar-asr', icon: 'wb-cloudy', color: '#E65100',
    title: 'Asr Adhkar', sub: 'Surah Al-Waqiah · Hizb ul Bahr',
    route: '/(tabs)/duas', badge: 'After Asr', prayerTab: 'after-asr',
  },
  Maghrib: {
    id: 'adhkar-maghrib', icon: 'bedtime', color: '#6A1B9A',
    title: 'Evening Adhkar', sub: 'Evening duas & protection dhikr',
    route: '/(tabs)/duas', badge: 'After Maghrib', prayerTab: 'after-maghrib',
  },
  Isha: {
    id: 'adhkar-isha', icon: 'nightlight', color: '#1565C0',
    title: 'Night Dhikr', sub: "Night remembrance & du'a before sleep",
    route: '/(tabs)/duas', badge: 'After Isha', prayerTab: 'after-isha',
  },
};

// ── Pre-Fajr adhkar card content ─────────────────────────────────────────
const PRE_FAJR_CARD_DATA: FYCardData = {
  id: 'adhkar-pre-fajr',
  icon: 'brightness-3',
  color: '#2C3A9E',
  title: 'Pre-Fajr Adhkar',
  sub: 'Tahajjud · Witr · Istighfar · Last-third-of-night duas',
  route: '/(tabs)/duas',
  badge: 'Before Fajr',
};

// ── Tahajjud card — unlocks 2 hours before Fajr ─────────────────────────
const TAHAJJUD_CARD_DATA: FYCardData = {
  id: 'adhkar-tahajjud',
  icon: 'nights-stay',
  color: '#1A237E',
  title: 'Tahajjud Adhkar',
  sub: 'Night prayer duas · Witr · Istighfar · Last-third-of-night supplications',
  route: '/(tabs)/duas',
  badge: 'Tahajjud Time',
  prayerTab: 'before-fajr',
};

// ── Post-Jumu'ah adhkar card content ─────────────────────────────────────
const POST_JUMUAH_CARD_DATA: Omit<FYCardData, 'id'> = {
  icon: 'star',
  color: '#8D6E0A',
  title: "Post-Jumu'ah Adhkar",
  sub: "Tasbih · Salawat · Du'a after Jumu'ah · 4 Sunnah Asr",
  route: '/(tabs)/duas',
  badge: "After Jumu'ah",
};

// ── Official Hafs mushaf page ranges (api.quran.com page_number field) ──
// Each Juz spans 20 pages (Juz 1 = 21 pages). Corrected per user verification.
const JUZ_START_PAGE: Record<number, number> = {
  1: 1,   2: 22,  3: 42,  4: 62,  5: 82,
  6: 102, 7: 122, 8: 142, 9: 162, 10: 182,
  11: 202, 12: 222, 13: 242, 14: 262, 15: 282,
  16: 302, 17: 322, 18: 342, 19: 362, 20: 382,
  21: 402, 22: 422, 23: 442, 24: 462, 25: 482,
  26: 502, 27: 522, 28: 542, 29: 562, 30: 582,
};
const JUZ_END_PAGE: Record<number, number> = {
  1: 21,  2: 41,  3: 61,  4: 81,  5: 101,
  6: 121, 7: 141, 8: 161, 9: 181, 10: 201,
  11: 221, 12: 241, 13: 261, 14: 281, 15: 301,
  16: 321, 17: 341, 18: 361, 19: 381, 20: 401,
  21: 421, 22: 441, 23: 461, 24: 481, 25: 501,
  26: 521, 27: 541, 28: 561, 29: 581, 30: 604,
};

// ── 30-Juz Daily Quran Portions ────────────────────────────────────────
const QURAN_PORTIONS = [
  { juz: 1,  surahs: 'Al-Fatihah · Al-Baqarah 1–141',    pages: '1–21'    },
  { juz: 2,  surahs: 'Al-Baqarah 142–252',               pages: '22–41'   },
  { juz: 3,  surahs: 'Al-Baqarah 253 · Al-Imran 1–91',  pages: '42–61'   },
  { juz: 4,  surahs: 'Al-Imran 92–200 · An-Nisa 1–23',  pages: '62–81'   },
  { juz: 5,  surahs: 'An-Nisa 24–147',                  pages: '82–101'  },
  { juz: 6,  surahs: 'An-Nisa 148 · Al-Maidah 81',      pages: '102–121' },
  { juz: 7,  surahs: 'Al-Maidah 82–120 · Al-Anam 1–110',pages: '122–141' },
  { juz: 8,  surahs: 'Al-Anam 111–165 · Al-Araf 1–87',  pages: '142–161' },
  { juz: 9,  surahs: 'Al-Araf 88–206 · Al-Anfal 1–40',  pages: '162–181' },
  { juz: 10, surahs: 'Al-Anfal 41–75 · At-Tawbah 1–92', pages: '182–201' },
  { juz: 11, surahs: 'At-Tawbah 93–129 · Hud 1–5',      pages: '202–221' },
  { juz: 12, surahs: 'Hud 6–123 · Yusuf 1–52',          pages: '222–241' },
  { juz: 13, surahs: 'Yusuf 53–111 · Ibrahim 1–52',     pages: '242–261' },
  { juz: 14, surahs: 'Al-Hijr · An-Nahl 1–128',         pages: '262–281' },
  { juz: 15, surahs: 'Al-Isra · Al-Kahf 1–74',          pages: '282–301' },
  { juz: 16, surahs: 'Al-Kahf 75–110 · Ta-Ha 1–135',    pages: '302–321' },
  { juz: 17, surahs: 'Al-Anbiya · Al-Hajj 1–78',        pages: '322–341' },
  { juz: 18, surahs: 'Al-Muminun · Al-Furqan 1–20',     pages: '342–361' },
  { juz: 19, surahs: 'Al-Furqan 21–77 · An-Naml 1–55',  pages: '362–381' },
  { juz: 20, surahs: 'An-Naml 56–93 · Al-Ankabut 1–44', pages: '382–401' },
  { juz: 21, surahs: 'Al-Ankabut 45 · Al-Ahzab 1–30',   pages: '402–421' },
  { juz: 22, surahs: 'Al-Ahzab 31–73 · Ya-Sin 1–27',    pages: '422–441' },
  { juz: 23, surahs: 'Ya-Sin 28–83 · Az-Zumar 1–31',    pages: '442–461' },
  { juz: 24, surahs: 'Az-Zumar 32–75 · Fussilat 1–46',  pages: '462–481' },
  { juz: 25, surahs: 'Fussilat 47–54 · Al-Jathiyah',    pages: '482–501' },
  { juz: 26, surahs: 'Al-Ahqaf · Ad-Dhariyat 1–30',     pages: '502–521' },
  { juz: 27, surahs: 'Ad-Dhariyat 31–60 · Al-Hadid',    pages: '522–541' },
  { juz: 28, surahs: 'Al-Mujadila · At-Tahrim',         pages: '542–561' },
  { juz: 29, surahs: 'Al-Mulk · Al-Mursalat',           pages: '562–581' },
  { juz: 30, surahs: 'An-Naba · An-Nas',                pages: '582–604' },
];

// ── Durood Levels ────────────────────────────────────────────────────────
// ── Quran Reading Levels ────────────────────────────────────────────────
const QURAN_READ_LEVELS = [
  { level: 1, label: 'Ayahs', desc: '3–5 Ayahs',  color: '#2E7D32', bg: '#E8F5E9' },
  { level: 2, label: '1 Page', desc: '~1 Page',   color: '#1565C0', bg: '#E3F2FD' },
  { level: 3, label: '½ Juz',  desc: '~10 Pages', color: '#6A1B9A', bg: '#F3E5F5' },
  { level: 4, label: 'Full Juz', desc: '~20 Pgs', color: '#B8860B', bg: '#FFF8E1' },
];

// ── Few-Ayah Daily Portions (Level 1) ────────────────────────────────────
const AYAH_PORTIONS = [
  { ref: 'Al-Fatihah 1:1–7',       surahs: 'The Opening — 7 ayahs',                pages: 'p. 1'        },
  { ref: 'Al-Baqarah 2:1–5',       surahs: 'Opening 5 ayahs of Al-Baqarah',        pages: 'p. 2'        },
  { ref: 'Al-Baqarah 2:255–257',   surahs: 'Ayat al-Kursi & the two after',        pages: 'p. 42'       },
  { ref: 'Al-Baqarah 2:284–286',   surahs: 'Closing ayahs of Al-Baqarah',          pages: 'p. 49'       },
  { ref: 'Al-Imran 3:1–5',         surahs: 'Opening of Al-Imran',                  pages: 'p. 50'       },
  { ref: 'Al-Imran 3:190–194',     surahs: 'Signs for those of understanding',     pages: 'p. 75'       },
  { ref: 'An-Nisa 4:36–38',        surahs: 'Rights of parents & neighbours',       pages: 'p. 84'       },
  { ref: 'Al-Maidah 5:1–3',        surahs: 'Lawful & unlawful — opening',          pages: 'p. 106'      },
  { ref: 'Al-Anam 6:1–3',          surahs: 'Praise of Allah, creation',            pages: 'p. 128'      },
  { ref: 'Al-Araf 7:54–56',        surahs: 'Allah the Creator, call to Him',       pages: 'p. 157'      },
  { ref: 'At-Tawbah 9:111–112',    surahs: 'The covenant of the believers',        pages: 'p. 204'      },
  { ref: 'Yunus 10:61–63',         surahs: 'Friends of Allah, no fear for them',   pages: 'p. 215'      },
  { ref: 'Hud 11:114–115',         surahs: 'Prayer removes evil deeds',            pages: 'p. 234'      },
  { ref: 'Yusuf 12:64–67',         surahs: "Ya'qub's trust in Allah",              pages: 'p. 243'      },
  { ref: 'Ibrahim 14:40–42',       surahs: 'Ibrahim prays for his offspring',      pages: 'p. 261'      },
  { ref: 'Al-Isra 17:23–27',       surahs: 'Rights of parents',                   pages: 'p. 284'      },
  { ref: 'Al-Kahf 18:1–5',         surahs: 'Opening of Al-Kahf',                  pages: 'p. 293'      },
  { ref: 'Al-Kahf 18:107–110',     surahs: 'Gardens of Paradise',                 pages: 'p. 304'      },
  { ref: 'Maryam 19:1–6',          surahs: 'Story of Zakariyya begins',           pages: 'p. 305'      },
  { ref: 'Ta-Ha 20:1–5',           surahs: 'Allah on the Throne',                 pages: 'p. 312'      },
  { ref: 'Al-Anbiya 21:87–90',     surahs: "Yunus's du'a & Allah's response",     pages: 'p. 329'      },
  { ref: 'Al-Muminun 23:1–11',     surahs: 'Qualities of the successful believers',pages: 'p. 342'      },
  { ref: 'An-Nur 24:35–38',        surahs: 'Verse of Light & the blessed houses', pages: 'p. 354'      },
  { ref: 'Al-Furqan 25:63–67',     surahs: 'Servants of the Most Merciful',       pages: 'p. 365'      },
  { ref: 'Luqman 31:12–15',        surahs: 'Wisdom of Luqman to his son',         pages: 'p. 411'      },
  { ref: 'Ya-Sin 36:77–83',        surahs: 'Power of Allah to resurrect',         pages: 'p. 445'      },
  { ref: 'Az-Zumar 39:53–55',      surahs: "Do not despair of Allah's mercy",     pages: 'p. 464'      },
  { ref: 'Al-Hujurat 49:11–13',    surahs: 'Brotherhood & avoiding assumptions',  pages: 'p. 517'      },
  { ref: 'Ar-Rahman 55:1–13',      surahs: 'Which of your Lord\'s favours?',       pages: 'p. 531'      },
  { ref: 'Al-Waqiah 56:77–80',     surahs: 'The noble Quran — protected scripture',pages: 'p. 536'     },
  { ref: 'Al-Mulk 67:1–5',         surahs: 'Opening of Al-Mulk — blessed is He',  pages: 'p. 562'      },
  { ref: 'Al-Insan 76:1–5',        surahs: 'The creation and trial of man',       pages: 'p. 578'      },
  { ref: 'An-Naba 78:1–16',        surahs: 'The Great News — creation of earth',  pages: 'p. 582'      },
  { ref: 'Abasa 80:1–16',          surahs: 'He frowned — admonition to the heart',pages: 'p. 585'      },
  { ref: 'Al-Inshirah 94:1–8',     surahs: 'Did We not expand your chest?',       pages: 'p. 596'      },
  { ref: 'Al-Qadr 97:1–5',         surahs: 'The Night of Power',                  pages: 'p. 598'      },
  { ref: 'Al-Zalzalah 99:1–8',     surahs: 'The earthquake of the Hour',          pages: 'p. 599'      },
  { ref: 'Al-Asr 103:1–3 + Al-Humazah 104:1–3', surahs: 'Time & the slanderer',  pages: 'p. 601'     },
  { ref: 'Al-Ikhlas + Al-Falaq + An-Nas', surahs: 'Three Quls — protection duas', pages: 'p. 603–604'  },
];

// ── 1-Page Daily Portions (Level 2) ─────────────────────────────────────
export const PAGE_PORTIONS = Array.from({ length: 60 }, (_, i) => {
  const page = (i * 10 + 1);
  return { page, ref: `Page ${page}`, surahs: `Mushaf page ${page}` };
});

const DUROOD_LEVELS = [
  { level: 1, target: 100,  label: 'L1',  color: '#2E7D32', bg: '#E8F5E9' },
  { level: 2, target: 300,  label: 'L2',  color: '#1565C0', bg: '#E3F2FD' },
  { level: 3, target: 500,  label: 'L3',  color: '#6A1B9A', bg: '#F3E5F5' },
  { level: 4, target: 1000, label: 'L4',  color: '#B8860B', bg: '#FFF8E1' },
];

export const DAILY_QURAN_REMINDERS = [
  { sub: 'Recite Surah Al-Kahf today — light shines between the two Fridays.' },
  { sub: '"The best of you are those who learn the Quran and teach it." — Bukhari 5027' },
  { sub: 'Read one page of Quran — even a small amount done consistently is beloved to Allah.' },
  { sub: 'Recite Surah Al-Mulk tonight — it intercedes for its reciter in the grave.' },
  { sub: 'Allah said: "Indeed the recitation of Fajr is ever witnessed (by angels)." — 17:78' },
  { sub: 'Recite Ayat al-Kursi after every Fard prayer for protection until the next prayer.' },
  { sub: '"Whoever reads one letter from the Book of Allah earns one good deed." — Tirmidhi' },
];

const PENDING_OPEN_KEY = 'quran_pending_open_v1';

// ── Juz → first Surah of that Juz (chapter ID) ─────────────────────────
export const JUZ_FIRST_SURAH: Record<number, number> = {
  1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
  11: 9, 12: 11, 13: 12, 14: 15, 15: 17, 16: 18, 17: 21, 18: 23,
  19: 25, 20: 27, 21: 29, 22: 33, 23: 36, 24: 39, 25: 41,
  26: 46, 27: 51, 28: 58, 29: 67, 30: 78,
};

// ── Surah first mushaf page — used to find which chapter contains a given page ──
const SURAH_START_PAGE: Record<number, number> = {
  1:1,   2:2,   3:50,  4:77,  5:106, 6:128, 7:151, 8:177, 9:187,
  10:208,11:221,12:235,13:249,14:255,15:262,16:267,17:282,18:293,
  19:305,20:312,21:322,22:333,23:342,24:350,25:359,26:367,27:377,
  28:385,29:396,30:404,31:411,32:415,33:418,34:428,35:434,36:440,
  37:446,38:453,39:458,40:467,41:477,42:483,43:489,44:496,45:499,
  46:502,47:507,48:511,49:515,50:518,51:520,52:523,53:526,54:528,
  55:531,56:534,57:537,58:542,59:545,60:549,61:551,62:553,63:554,
  64:556,65:558,66:560,67:562,68:564,69:566,70:568,71:570,72:572,
  73:574,74:575,75:577,76:578,77:580,78:582,79:583,80:585,81:586,
  82:587,83:587,84:589,85:590,86:591,87:591,88:592,89:593,90:594,
  91:595,92:595,93:596,94:596,95:597,96:597,97:598,98:598,99:599,
  100:599,101:600,102:600,103:601,104:601,105:601,106:602,107:602,
  108:602,109:603,110:603,111:603,112:604,113:604,114:604,
};

/** Returns the chapter (1–114) whose pages contain the given mushaf page */
function chapterForMushaPage(targetPage: number): number {
  let best = 1;
  for (let s = 1; s <= 114; s++) {
    if ((SURAH_START_PAGE[s] ?? 999) <= targetPage) best = s;
    else break;
  }
  return best;
}

// ── AYAH_PORTIONS surah ID map (for Level 1 open-in-app) ────────────────
const AYAH_SURAH_IDS: number[] = [
  1, 2, 2, 2, 3, 3, 4, 5, 6, 7, 9, 10, 11, 12, 14,
  17, 18, 18, 19, 20, 21, 23, 24, 25, 31, 36, 39, 49, 55, 56,
  67, 76, 78, 80, 94, 97, 99, 103, 112,
];

// ── Daily Quran Portion Card (with 4 levels + open-in-app) ───────────────
function QuranPortionCard({
  nightMode, todayKey, dismissed, onDismiss, hijriDay,
}: {
  nightMode: boolean;
  todayKey: string;
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
  hijriDay: number; // Hijri day of month (1-30) — drives Full Juz for monthly completion
}) {
  const id = `quran-portion-${todayKey}`;
  const levelKey = 'quran_read_level_persist';
  const N = nightMode ? NIGHT : null;

  const [levelIdx, setLevelIdx] = useState(3); // default: Full Juz
  const [levelLoaded, setLevelLoaded] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(levelKey).then(v => {
      if (v !== null) setLevelIdx(parseInt(v, 10) || 3);
      setLevelLoaded(true);
    }).catch(() => setLevelLoaded(true));
  }, []);

  const switchLevel = (i: number) => {
    setLevelIdx(i);
    AsyncStorage.setItem(levelKey, String(i)).catch(() => {});
  };

  const router = useRouter();
  const onIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 60 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40 }).start();

  if (!levelLoaded) return null;
  if (dismissed.has(id)) return null;

  // Determine the target chapter ID to open in the Quran tab
  const getTargetChapterId = (): number => {
    if (levelIdx === 0) {
      // Level 1: few Ayahs — map to specific surah
      const idx = DAY_OF_YEAR % AYAH_SURAH_IDS.length;
      return AYAH_SURAH_IDS[idx];
    } else if (levelIdx === 1) {
      // Level 2: 1 page — find chapter containing the target page
      const page = ((DAY_OF_YEAR - 1) % 604) + 1;
      return chapterForMushaPage(page);
    } else if (levelIdx === 2) {
      // Level 3: Half Juz — chapter containing the half-start page
      const portion = QURAN_PORTIONS[(DAY_OF_YEAR - 1) % 30];
      const isFirstHalf = DAY_OF_YEAR % 2 === 0;
      const startPg = JUZ_START_PAGE[portion.juz];
      const endPg   = JUZ_END_PAGE[portion.juz];
      const midPage = Math.round((startPg + endPg) / 2);
      return chapterForMushaPage(isFirstHalf ? startPg : midPage);
    } else if (levelIdx === 3) {
      // Level 4: Full Juz — keyed to Hijri day (1-30), completing Quran in one lunar month
      const juzNum = Math.max(1, Math.min(30, hijriDay));
      return chapterForMushaPage(JUZ_START_PAGE[juzNum]);
    }
    return 1;
  };

  const openInQuran = () => {
    const chapterId = getTargetChapterId();
    let targetPage: number | null = null;

    if (levelIdx === 0) {
      // Level 1: Few Ayahs — extract first page number from AYAH_PORTIONS pages string
      const a = AYAH_PORTIONS[DAY_OF_YEAR % AYAH_PORTIONS.length];
      const m = a.pages.match(/(\d+)/);
      targetPage = m ? parseInt(m[1], 10) : null;
    } else if (levelIdx === 1) {
      // Level 2: 1 Page — exact mushaf page
      targetPage = ((DAY_OF_YEAR - 1) % 604) + 1;
    } else if (levelIdx === 2) {
      // Level 3: Half Juz — jump to start of whichever half
      const portion = QURAN_PORTIONS[(DAY_OF_YEAR - 1) % 30];
      const isFirstHalf = DAY_OF_YEAR % 2 === 0;
      const startPg = JUZ_START_PAGE[portion.juz];
      const endPg   = JUZ_END_PAGE[portion.juz];
      const midPage = Math.round((startPg + endPg) / 2);
      targetPage = isFirstHalf ? startPg : midPage;
    } else {
      // Level 4: Full Juz — keyed to Hijri day for monthly Quran completion
      const juzNum = Math.max(1, Math.min(30, hijriDay));
      targetPage = JUZ_START_PAGE[juzNum];
    }

    const value = targetPage ? `${chapterId}|${targetPage}` : String(chapterId);
    AsyncStorage.setItem(PENDING_OPEN_KEY, value).catch(() => {});
    router.push('/(tabs)/quran' as any);
  };

  const lv = QURAN_READ_LEVELS[levelIdx];
  const accentColor = nightMode ? '#4FE948' : lv.color;
  const bgTint      = nightMode ? 'rgba(79,233,72,0.15)' : lv.bg;

  // ── Pick content based on level ────────────────────────────────────────
  let badge = '';
  let titleLine = '';
  let subLine = '';
  let pagesLine = '';

  if (levelIdx === 0) {
    // Level 1: Few Ayahs
    const a = AYAH_PORTIONS[DAY_OF_YEAR % AYAH_PORTIONS.length];
    badge     = '3–5 Ayahs';
    titleLine = a.ref;
    subLine   = a.surahs;
    pagesLine = a.pages;
  } else if (levelIdx === 1) {
    // Level 2: 1 Page — use official Juz page boundaries
    const page = ((DAY_OF_YEAR - 1) % 604) + 1;
    let juzForPage = 1;
    for (let j = 30; j >= 1; j--) { if (page >= JUZ_START_PAGE[j]) { juzForPage = j; break; } }
    badge     = '~1 Page';
    titleLine = `Mushaf Page ${page}`;
    subLine   = `Juz ${juzForPage}`;
    pagesLine = `p. ${page}`;
  } else if (levelIdx === 2) {
    // Level 3: Half Juz
    const portion = QURAN_PORTIONS[(DAY_OF_YEAR - 1) % 30];
    const half = (DAY_OF_YEAR % 2 === 0) ? 'First half' : 'Second half';
    const startPg = JUZ_START_PAGE[portion.juz];
    const endPg   = JUZ_END_PAGE[portion.juz];
    const midPage = Math.round((startPg + endPg) / 2);
    badge     = 'Half Juz';
    titleLine = `Juz ${portion.juz} — ${half}`;
    subLine   = portion.surahs;
    pagesLine = half === 'First half'
      ? `pp. ${startPg}–${midPage}`
      : `pp. ${midPage}–${endPg}`;
  } else {
    // Level 4: Full Juz — Hijri day maps to Juz number for monthly Quran completion
    const juzNum  = Math.max(1, Math.min(30, hijriDay));
    const portion = QURAN_PORTIONS[juzNum - 1];
    const startPg = JUZ_START_PAGE[juzNum];
    const endPg   = JUZ_END_PAGE[juzNum];
    badge     = `Juz ${juzNum}`;
    titleLine = portion.surahs;
    subLine   = `Day ${hijriDay} of month · p. ${startPg}`;
    pagesLine = `pp. ${startPg}–${endPg}`;
  }

  return (
    <TouchableOpacity onPressIn={onIn} onPressOut={onOut} activeOpacity={1}>
      <Animated.View style={[
        fyStyles.duroodCard, { width: 178 },
        N && { backgroundColor: N.surface, borderColor: N.border },
        { transform: [{ scale }] },
      ]}>
        {/* Header */}
        <View style={fyStyles.duroodHeader}>
          <MaterialIcons name="menu-book" size={13} color={accentColor} />
          <Text style={[fyStyles.duroodTitle, { color: accentColor }]}>Daily Quran</Text>
          <View style={[fyStyles.juzBadge, { backgroundColor: accentColor }]}>
            <Text style={fyStyles.juzBadgeText}>{badge}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={[fyStyles.duroodTapArea, { backgroundColor: bgTint, borderColor: accentColor + '44', paddingVertical: 8, paddingHorizontal: 8 }]}>
          <Text style={[fyStyles.cardTitle, { textAlign: 'center', fontSize: 11, lineHeight: 15 }, N && { color: N.text }]} numberOfLines={2}>
            {titleLine}
          </Text>
          {subLine ? (
            <Text style={[fyStyles.cardSub, { textAlign: 'center', marginTop: 2 }, N && { color: N.textSub }]} numberOfLines={2}>
              {subLine}
            </Text>
          ) : null}
          <View style={[fyStyles.badgeRow, { backgroundColor: accentColor + '20', marginTop: 5, alignSelf: 'center' }]}>
            <MaterialIcons name="import-contacts" size={9} color={accentColor} />
            <Text style={[fyStyles.badgeText, { color: accentColor }]}>{pagesLine}</Text>
          </View>
        </View>

        {/* Level selector */}
        <View style={fyStyles.duroodLevels}>
          {QURAN_READ_LEVELS.map((ql, i) => (
            <TouchableOpacity
              key={ql.level}
              onPress={() => switchLevel(i)}
              style={[
                fyStyles.duroodLevelBtn,
                i === levelIdx
                  ? { backgroundColor: accentColor, borderColor: accentColor }
                  : N
                    ? { backgroundColor: N.surfaceAlt, borderColor: N.border }
                    : { backgroundColor: ql.bg, borderColor: ql.color + '40' },
              ]}
            >
              <Text style={[
                fyStyles.duroodLevelText,
                { color: i === levelIdx ? '#fff' : N ? N.textMuted : ql.color },
              ]}>{ql.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Read in App button */}
        <TouchableOpacity
          onPress={openInQuran}
          style={[fyStyles.openRow, { backgroundColor: accentColor + '28', alignSelf: 'stretch', justifyContent: 'center' }]}
        >
          <MaterialIcons name="auto-stories" size={11} color={accentColor} />
          <Text style={[fyStyles.openText, { color: accentColor }]}>Read in App</Text>
        </TouchableOpacity>

        {/* Mark done */}
        <TouchableOpacity
          onPress={() => onDismiss(id)}
          style={[fyStyles.openRow, { backgroundColor: accentColor + '14', alignSelf: 'stretch', justifyContent: 'center' }]}
        >
          <MaterialIcons name="check-circle" size={11} color={accentColor} />
          <Text style={[fyStyles.openText, { color: accentColor }]}>Mark as Read</Text>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Istighfar Counter Card ────────────────────────────────────────────────
function IstighfarCounterCard({
  nightMode, todayKey, dismissed, onDismiss,
}: {
  nightMode: boolean;
  todayKey: string;
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
}) {
  const N = nightMode ? NIGHT : null;
  const cardId  = `istighfar-${todayKey}`;
  const countKey = `istighfar_count_${todayKey}`;
  const TARGET = 100;

  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(countKey).then(c => {
      if (c) setCount(parseInt(c, 10) || 0);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [countKey]);

  const done = count >= TARGET;
  const progress = Math.min(count / TARGET, 1);
  const accentColor = nightMode ? '#C084FC' : '#7C3AED'; // purple
  const bgTint = nightMode ? 'rgba(192,132,252,0.12)' : '#F5F3FF';

  const triggerFlash = () => {
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const tap = () => {
    if (done) return;
    const next = count + 1;
    setCount(next);
    AsyncStorage.setItem(countKey, String(next)).catch(() => {});
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.90, useNativeDriver: true, speed: 80 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 40 }),
    ]).start();
    if (next === TARGET) triggerFlash();
  };

  if (!loaded || dismissed.has(cardId)) return null;

  const flashOpacity = flashAnim.interpolate({ inputRange: [0,1], outputRange: [0, 0.30] });

  return (
    <View style={[
      fyStyles.duroodCard,
      N && { backgroundColor: N.surface, borderColor: N.border },
    ]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: accentColor, opacity: flashOpacity, borderRadius: Radius.lg }]}
      />
      {/* Header */}
      <View style={fyStyles.duroodHeader}>
        <MaterialIcons name="refresh" size={13} color={accentColor} />
        <Text style={[fyStyles.duroodTitle, { color: accentColor }]}>Istighfar</Text>
        {done ? (
          <View style={[fyStyles.duroodDoneBadge, { backgroundColor: accentColor }]}>
            <MaterialIcons name="check" size={9} color="#fff" />
            <Text style={fyStyles.duroodDoneText}>Done!</Text>
          </View>
        ) : null}
      </View>

      {/* Arabic */}
      <Text style={{ textAlign: 'center', fontSize: 14, color: accentColor, fontWeight: '700', letterSpacing: 0.5 }}>
        أَسْتَغْفِرُ اللَّهَ
      </Text>

      {/* Tap counter */}
      <TouchableOpacity onPress={tap} activeOpacity={done ? 1 : 0.7} disabled={done}>
        <Animated.View style={[
          fyStyles.duroodTapArea,
          { backgroundColor: bgTint, borderColor: accentColor + '44' },
          { transform: [{ scale: scaleAnim }] },
        ]}>
          <Text style={[fyStyles.duroodCount, { color: accentColor }]}>{count}</Text>
          <Text style={[fyStyles.duroodCountOf, N && { color: N.textMuted }]}>of {TARGET}</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={[fyStyles.duroodProgressBg, N && { backgroundColor: N.border }]}>
        <View style={[fyStyles.duroodProgressFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: accentColor }]} />
      </View>

      <Text style={{ fontSize: 9, fontWeight: '500', color: N ? N.textMuted : Colors.textSubtle, textAlign: 'center', lineHeight: 13 }}>
        {'Whoever says Astaghfirullah 100x\nhas all sins forgiven'} - Bukhari 6307
      </Text>

      {/* Mark done */}
      <TouchableOpacity
        onPress={() => onDismiss(cardId)}
        style={[fyStyles.openRow, { backgroundColor: accentColor + '14', alignSelf: 'stretch', justifyContent: 'center' }]}
      >
        <MaterialIcons name="check-circle" size={11} color={accentColor} />
        <Text style={[fyStyles.openText, { color: accentColor }]}>Mark as Done</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Bed Time Card ──────────────────────────────────────────────────────────
function BedTimeCard({
  nightMode, todayKey, dismissed, onDismiss, onOpen,
}: {
  nightMode: boolean;
  todayKey: string;
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
  onOpen: () => void;
}) {
  const N = nightMode ? NIGHT : null;
  const cardId = `bedtime-${todayKey}`;

  if (dismissed.has(cardId)) return null;

  const accentColor = nightMode ? '#93C5FD' : '#1E40AF'; // cool blue
  const bgTint = nightMode ? 'rgba(147,197,253,0.10)' : '#EFF6FF';

  return (
    <View style={[
      fyStyles.duroodCard, { width: 148 },
      N && { backgroundColor: N.surface, borderColor: N.border },
    ]}>
      {/* Header */}
      <View style={fyStyles.duroodHeader}>
        <MaterialIcons name="bedtime" size={13} color={accentColor} />
        <Text style={[fyStyles.duroodTitle, { color: accentColor }]}>Bed Time</Text>
      </View>

      {/* Icon area */}
      <View style={[fyStyles.duroodTapArea, { backgroundColor: bgTint, borderColor: accentColor + '44', paddingVertical: 12 }]}>
        <MaterialIcons name="nights-stay" size={24} color={accentColor} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: accentColor, textAlign: 'center', marginTop: 4, lineHeight: 15 }}>
          Night Adhkar
        </Text>
      </View>

      <Text style={{ fontSize: 10, fontWeight: '400', color: N ? N.textSub : Colors.textSubtle, textAlign: 'center', lineHeight: 14 }}>
        3 Quls · Ayat al-Kursi{"\n"}du{"\x27"}as before sleep
      </Text>

      {/* Open button */}
      <TouchableOpacity
        onPress={onOpen}
        style={[fyStyles.openRow, { backgroundColor: accentColor + '22', alignSelf: 'stretch', justifyContent: 'center' }]}
      >
        <MaterialIcons name="arrow-forward" size={11} color={accentColor} />
        <Text style={[fyStyles.openText, { color: accentColor }]}>Open Adhkar</Text>
      </TouchableOpacity>

      {/* Dismiss */}
      <TouchableOpacity
        onPress={() => onDismiss(cardId)}
        style={[fyStyles.openRow, { backgroundColor: accentColor + '12', alignSelf: 'stretch', justifyContent: 'center' }]}
      >
        <MaterialIcons name="check-circle" size={11} color={accentColor} />
        <Text style={[fyStyles.openText, { color: accentColor }]}>Done for tonight</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Daily Durood Counter Card ───────────────────────────────────────────
function DuroodCounterCard({
  nightMode, todayKey, dismissed, onDismiss,
}: {
  nightMode: boolean;
  todayKey: string;
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
}) {
  const N = nightMode ? NIGHT : null;
  const duroodId = `durood-${todayKey}`;
  const countKey = `durood_count_${todayKey}`;
  const levelKey = 'durood_level_persist';

  const [count, setCount] = useState(0);
  const [levelIdx, setLevelIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(countKey),
      AsyncStorage.getItem(levelKey),
    ]).then(([c, l]) => {
      if (c) setCount(parseInt(c, 10) || 0);
      if (l) setLevelIdx(parseInt(l, 10) || 0);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [countKey]);

  const currentLevel = DUROOD_LEVELS[levelIdx];
  const progress = Math.min(count / currentLevel.target, 1);
  const done = count >= currentLevel.target;

  const triggerFlash = () => {
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const tap = () => {
    if (done) return;
    const next = count + 1;
    setCount(next);
    AsyncStorage.setItem(countKey, String(next)).catch(() => {});
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, speed: 80 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }),
    ]).start();
    if (next === currentLevel.target) triggerFlash();
  };

  const switchLevel = (idx: number) => {
    setLevelIdx(idx);
    AsyncStorage.setItem(levelKey, String(idx)).catch(() => {});
  };

  if (!loaded) return null;
  if (dismissed.has(duroodId)) return null;

  const accentColor = nightMode ? '#69A8FF' : currentLevel.color;
  const bgTint = nightMode ? 'rgba(106,174,255,0.10)' : currentLevel.bg;

  const flashOpacity = flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={[
      fyStyles.duroodCard,
      N && { backgroundColor: N.surface, borderColor: N.border },
    ]}>
      {/* Flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: accentColor, opacity: flashOpacity, borderRadius: Radius.lg }]}
      />

      {/* Header */}
      <View style={fyStyles.duroodHeader}>
        <MaterialIcons name="favorite" size={13} color={accentColor} />
        <Text style={[fyStyles.duroodTitle, { color: accentColor }]}>Daily Durood</Text>
        {done ? (
          <View style={[fyStyles.duroodDoneBadge, { backgroundColor: accentColor }]}>
            <MaterialIcons name="check" size={9} color="#fff" />
            <Text style={fyStyles.duroodDoneText}>Done!</Text>
          </View>
        ) : null}
      </View>

      {/* Counter tap */}
      <TouchableOpacity onPress={tap} activeOpacity={done ? 1 : 0.7} disabled={done}>
        <Animated.View style={[
          fyStyles.duroodTapArea,
          { backgroundColor: bgTint, borderColor: accentColor + '44' },
          { transform: [{ scale: scaleAnim }] },
        ]}>
          <Text style={[fyStyles.duroodCount, { color: accentColor }]}>{count}</Text>
          <Text style={[fyStyles.duroodCountOf, N && { color: N.textMuted }]}>of {currentLevel.target}</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={[fyStyles.duroodProgressBg, N && { backgroundColor: N.border }]}>
        <Animated.View style={[
          fyStyles.duroodProgressFill,
          { width: `${Math.round(progress * 100)}%` as any, backgroundColor: accentColor },
        ]} />
      </View>

      {/* Level selector */}
      <View style={fyStyles.duroodLevels}>
        {DUROOD_LEVELS.map((lv, i) => (
          <TouchableOpacity
            key={lv.level}
            onPress={() => switchLevel(i)}
            style={[
              fyStyles.duroodLevelBtn,
              i === levelIdx
                ? { backgroundColor: accentColor, borderColor: accentColor }
                : N
                  ? { backgroundColor: N.surfaceAlt, borderColor: N.border }
                  : { backgroundColor: lv.bg, borderColor: lv.color + '40' },
            ]}
          >
            <Text style={[
              fyStyles.duroodLevelText,
              { color: i === levelIdx ? '#fff' : N ? N.textMuted : lv.color },
            ]}>{lv.label} {lv.target >= 1000 ? '1k' : lv.target}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mark as Done */}
      <TouchableOpacity
        onPress={() => onDismiss(duroodId)}
        style={[fyStyles.openRow, { backgroundColor: accentColor + '14', alignSelf: 'stretch', justifyContent: 'center' }]}
      >
        <MaterialIcons name="check-circle" size={11} color={accentColor} />
        <Text style={[fyStyles.openText, { color: accentColor }]}>Mark as Done</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Next Adhkar Countdown Card ──────────────────────────────────────────
const PRAYER_ADHKAR_META: Record<string, { icon: string; color: string; title: string; sub: string; badge: string; prayerTab: string }> = {
  Tahajjud:{ icon: 'nights-stay', color: '#1A237E', title: 'Tahajjud Adhkar', sub: 'Night prayer · Witr · Istighfar · Last-third duas', badge: 'Before Fajr',   prayerTab: 'before-fajr'   },
  Fajr:    { icon: 'wb-twilight', color: '#4FE948', title: 'Morning Adhkar',  sub: 'Wird al-Latif · Yaseen · Dua',         badge: 'After Fajr',    prayerTab: 'after-fajr'    },
  Dhuhr:   { icon: 'wb-sunny',    color: '#0A5C9E', title: 'Dhuhr Adhkar',   sub: 'Tasbih · Salawat · Astaghfirullah',    badge: 'After Dhuhr',   prayerTab: 'after-dhuhr'   },
  Asr:     { icon: 'wb-cloudy',   color: '#E65100', title: 'Asr Adhkar',     sub: 'Al-Waqiah · Hizb ul Bahr',             badge: 'After Asr',     prayerTab: 'after-asr'     },
  Maghrib: { icon: 'bedtime',     color: '#6A1B9A', title: 'Evening Adhkar', sub: 'Evening duas & protection dhikr',      badge: 'After Maghrib', prayerTab: 'after-maghrib' },
  Isha:    { icon: 'nightlight',  color: '#1565C0', title: 'Night Dhikr',    sub: "Night remembrance & du'a before sleep", badge: 'After Isha',    prayerTab: 'after-isha'    },
};

function NextAdhkarCountdownCard({
  nightMode, prayers, currentTime, onOpen,
}: {
  nightMode: boolean;
  prayers: { name: string; timeDate: Date }[];
  currentTime: Date;
  onOpen: (prayerTab: string) => void;
}) {
  const N = nightMode ? NIGHT : null;
  const { showAlert } = useAlert();

  // Build augmented prayer list including Tahajjud (2h before Fajr)
  const fajrEntry = prayers.find(pr => pr.name === 'Fajr');
  const tahajjudTime = fajrEntry
    ? new Date(fajrEntry.timeDate.getTime() - 2 * 60 * 60 * 1000)
    : null;

  // Order: Tahajjud → Fajr → Dhuhr → Asr → Maghrib → Isha
  const PRAYER_ORDER = ['Tahajjud', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  // Augmented list with Tahajjud virtual entry
  const augmented: { name: string; timeDate: Date }[] = [
    ...(tahajjudTime ? [{ name: 'Tahajjud', timeDate: tahajjudTime }] : []),
    ...prayers,
  ];

  // Find the next upcoming prayer adhkar (not yet passed)
  let nextPrayer = PRAYER_ORDER.reduce<{ name: string; timeDate: Date } | null>((found, name) => {
    if (found) return found;
    const p = augmented.find(pr => pr.name === name);
    if (p && p.timeDate > currentTime) return p;
    return null;
  }, null);

  // Wrap: after Isha show tomorrow's Tahajjud (fajrTime - 2h + 1 day)
  if (!nextPrayer) {
    if (tahajjudTime) {
      const tomorrowTahajjud = new Date(tahajjudTime);
      tomorrowTahajjud.setDate(tomorrowTahajjud.getDate() + 1);
      nextPrayer = { name: 'Tahajjud', timeDate: tomorrowTahajjud };
    } else if (fajrEntry) {
      const tomorrowFajr = new Date(fajrEntry.timeDate);
      tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
      nextPrayer = { name: 'Fajr', timeDate: tomorrowFajr };
    }
  }

  if (!nextPrayer || prayers.length === 0) return null;
  const meta = PRAYER_ADHKAR_META[nextPrayer.name];
  if (!meta) return null;

  const secondsLeft = Math.max(0, Math.floor((nextPrayer.timeDate.getTime() - currentTime.getTime()) / 1000));
  const isAvailable = secondsLeft === 0;
  const countdown = formatCountdownSeconds(secondsLeft);

  // Format prayer time for the alert message
  const prayerTimeStr = nextPrayer.timeDate.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });

  const handlePress = () => {
    if (isAvailable) {
      onOpen(meta.prayerTab);
    } else {
      const isTahajjud = nextPrayer!.name === 'Tahajjud';
      showAlert(
        isTahajjud ? 'Tahajjud Time Not Yet' : `Available after ${nextPrayer!.name}`,
        isTahajjud
          ? `Tahajjud adhkar unlocks at ${prayerTimeStr} — two hours before Fajr. Come back then.`
          : `This section unlocks at ${prayerTimeStr}. Come back after ${nextPrayer!.name} prayer.`
      );
    }
  };

  const accentColor = nightMode ? meta.color + 'CC' : meta.color;
  const bgTint = meta.color + (nightMode ? '18' : '10');

  return (
    <TouchableOpacity
      style={[
        fyStyles.duroodCard, { width: 158 },
        N && { backgroundColor: N.surface, borderColor: N.border },
        !isAvailable && { opacity: 0.62 },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Header */}
      <View style={fyStyles.duroodHeader}>
        <MaterialIcons name={isAvailable ? meta.icon as any : 'schedule'} size={13} color={accentColor} />
        <Text style={[fyStyles.duroodTitle, { color: accentColor }]}>
          {isAvailable ? meta.badge : 'Coming Up'}
        </Text>
        <View style={[fyStyles.juzBadge, { backgroundColor: isAvailable ? accentColor : (N ? N.border : '#ccc') }]}>
          <Text style={fyStyles.juzBadgeText}>{isAvailable ? 'Available' : 'Soon'}</Text>
        </View>
      </View>

      {/* Countdown / Available area */}
      <View style={[fyStyles.duroodTapArea, { backgroundColor: bgTint, borderColor: accentColor + '50', paddingVertical: 10 }]}>
        {isAvailable ? (
          <>
            <MaterialIcons name={meta.icon as any} size={22} color={accentColor} style={{ marginBottom: 4 }} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: accentColor, textAlign: 'center', lineHeight: 18 }}>
              Ready to recite
            </Text>
          </>
        ) : (
          <>
            <MaterialIcons name="schedule" size={18} color={accentColor} style={{ marginBottom: 2 }} />
            <Text style={{ fontSize: 22, fontWeight: '900', color: accentColor, letterSpacing: 1, fontVariant: ['tabular-nums'] as any }}>
              {countdown}
            </Text>
            <Text style={{ fontSize: 9, fontWeight: '600', color: N ? N.textMuted : Colors.textSubtle, marginTop: 1 }}>
              until {nextPrayer.name}
            </Text>
          </>
        )}
      </View>

      {/* Details */}
      <Text style={[fyStyles.cardTitle, { fontSize: 11, lineHeight: 14 }, N && { color: N.text }]} numberOfLines={1}>
        {meta.title}
      </Text>
      <Text style={[fyStyles.cardSub, N && { color: N.textSub }]} numberOfLines={2}>
        {meta.sub}
      </Text>

      {/* Open */}
      <View style={[fyStyles.openRow, { backgroundColor: accentColor + '18', alignSelf: 'stretch', justifyContent: 'center' }]}>
        <MaterialIcons
          name={isAvailable ? 'arrow-forward' : 'lock-clock'}
          size={10}
          color={accentColor}
        />
        <Text style={[fyStyles.openText, { color: accentColor }]}>
          {isAvailable ? 'View Adhkar →' : `Tap for details`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ForYouCard({
  card, nightMode, onOpen, onDismiss,
}: {
  card: FYCardData;
  nightMode: boolean;
  onOpen: (card: FYCardData) => void;
  onDismiss: (id: string) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 60 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40 }).start();
  const N = nightMode ? NIGHT : null;
  const isOverdue = !!card.isOverdue;
  const overdueColor = '#B45309'; // amber-700
  const overdueBg = N ? 'rgba(180,83,9,0.14)' : 'rgba(255,237,213,0.85)';
  const overdueBorder = N ? '#7C3A00' : '#F59E0B';

  return (
    <TouchableOpacity
      onPress={() => onOpen(card)}
      onPressIn={onIn}
      onPressOut={onOut}
      activeOpacity={1}
    >
      <Animated.View style={[
        fyStyles.card,
        N && { backgroundColor: N.surface, borderColor: N.border },
        isOverdue && { backgroundColor: overdueBg, borderColor: overdueBorder, borderWidth: 1.5, opacity: 0.88 },
        { transform: [{ scale }] },
      ]}>
        <View style={[fyStyles.colorBar, { backgroundColor: isOverdue ? overdueColor : card.color }]} />
        <View style={fyStyles.cardBody}>
          <View style={fyStyles.cardTopRow}>
            <View style={[fyStyles.iconCircle, { backgroundColor: (isOverdue ? overdueColor : card.color) + '22' }]}>
              <MaterialIcons name={isOverdue ? 'schedule' as any : card.icon as any} size={17} color={isOverdue ? overdueColor : card.color} />
            </View>
            {/* Small dismiss X */}
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onDismiss(card.id); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[fyStyles.doneBtn, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}
            >
              <MaterialIcons name="close" size={10} color={N ? N.textMuted : Colors.textSubtle} />
            </TouchableOpacity>
          </View>
          {/* Badge row */}
          {isOverdue ? (
            <View style={[fyStyles.badgeRow, { backgroundColor: overdueColor + '22' }]}>
              <MaterialIcons name="warning-amber" size={9} color={overdueColor} />
              <Text style={[fyStyles.badgeText, { color: overdueColor }]}>Still Due</Text>
            </View>
          ) : card.badge ? (
            <View style={[fyStyles.badgeRow, { backgroundColor: card.color + '18' }]}>
              <Text style={[fyStyles.badgeText, { color: card.color }]}>{card.badge}</Text>
            </View>
          ) : null}
          <Text style={[fyStyles.cardTitle, N && { color: N.text }, isOverdue && { color: N ? '#F6B65E' : '#78350F' }]} numberOfLines={2}>{card.title}</Text>
          <Text style={[fyStyles.cardSub, N && { color: N.textSub }]} numberOfLines={2}>{card.sub}</Text>
          {/* Bottom action rows */}
          {card.route ? (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onOpen(card); }}
              style={[fyStyles.openRow, { backgroundColor: (isOverdue ? overdueColor : card.color) + '18' }]}
            >
              <MaterialIcons name="arrow-forward" size={10} color={isOverdue ? overdueColor : card.color} />
              <Text style={[fyStyles.openText, { color: isOverdue ? overdueColor : card.color }]}>{isOverdue ? 'Open Adhkar →' : 'Open →'}</Text>
            </TouchableOpacity>
          ) : null}
          {/* Mark as Complete — always visible for prayer adhkar cards */}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); onDismiss(card.id); }}
            style={[fyStyles.openRow, { backgroundColor: (isOverdue ? overdueColor : card.color) + '14', alignSelf: 'stretch', justifyContent: 'center' }]}
          >
            <MaterialIcons name="check-circle" size={11} color={isOverdue ? overdueColor : card.color} />
            <Text style={[fyStyles.openText, { color: isOverdue ? overdueColor : card.color }]}>Mark as Complete</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const fyStyles = StyleSheet.create({
  duroodCard: {
    width: 178,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    padding: 10,
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  duroodHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  duroodTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, flex: 1 },
  duroodDoneBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full,
  },
  duroodDoneText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  duroodTapArea: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.md, borderWidth: 1.5,
    paddingVertical: 10,
  },
  duroodCount: { fontSize: 28, fontWeight: '900', lineHeight: 32 },
  duroodCountOf: { fontSize: 10, fontWeight: '600', color: Colors.textSubtle, marginTop: 1 },
  duroodProgressBg: {
    height: 4, borderRadius: 2, backgroundColor: Colors.border, overflow: 'hidden',
  },
  duroodProgressFill: { height: 4, borderRadius: 2 },
  duroodLevels: { flexDirection: 'row', gap: 4 },
  duroodLevelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 4,
    borderRadius: Radius.sm, borderWidth: 1,
  },
  duroodLevelText: { fontSize: 8.5, fontWeight: '800' },
  quranPortionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 7,
  },
  quranPortionHeaderText: { fontSize: 10, fontWeight: '800', color: '#fff', flex: 1 },
  juzBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radius.full,
  },
  juzBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  card: {
    width: 148,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  colorBar: { height: 3 },
  cardBody: { padding: 9, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  iconCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  doneBtn: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeRow: {
    alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  cardTitle: { fontSize: 12, fontWeight: '800', color: Colors.textPrimary, lineHeight: 16 },
  cardSub: { fontSize: 10.5, fontWeight: '400', lineHeight: 14, color: Colors.textSubtle },
  openRow: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: Radius.full, marginTop: 3,
  },
  openText: { fontSize: 10, fontWeight: '700' },
});

// ── Manual swipe row for For You Today ──────────────────────────────────
function ForYouTickerRow({
  cards, nightMode, onOpen, onDismiss, extraSlots,
}: {
  cards: FYCardData[];
  nightMode: boolean;
  onOpen: (card: FYCardData) => void;
  onDismiss: (id: string) => void;
  extraSlots: React.ReactNode[];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.md, paddingBottom: 4, paddingTop: 2 }}
    >
      {/* Prayer adhkar cards first — highest priority */}
      {cards.map(card => (
        <ForYouCard
          key={card.id}
          card={card}
          nightMode={nightMode}
          onOpen={onOpen}
          onDismiss={onDismiss}
        />
      ))}
      {/* Persistent utility slots: Durood, Quran portion, Next Adhkar countdown */}
      {extraSlots.map((slot, i) => (
        <React.Fragment key={`extra-${i}`}>{slot}</React.Fragment>
      ))}
    </ScrollView>
  );
}

function ForYouTodaySection({
  prayers, nightMode, currentTime, hijriDay, todaySunnah,
}: {
  prayers: { name: string; timeDate: Date }[];
  nightMode: boolean;
  currentTime: Date;
  hijriDay: number;
  todaySunnah: SunnahEntry;
}) {
  const N = nightMode ? NIGHT : null;
  const router = useRouter();

  // Use Fajr as the day boundary — before Fajr counts as the previous day
  const fajrPrayer = prayers.find(p => p.name === 'Fajr');
  const referenceDate = new Date(currentTime);
  if (fajrPrayer && currentTime < fajrPrayer.timeDate) {
    referenceDate.setDate(referenceDate.getDate() - 1);
  }
  const todayKey = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}-${String(referenceDate.getDate()).padStart(2, '0')}`;
  const storageKey = `foryou_done_${todayKey}`;

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(val => {
      if (val) {
        try { setDismissed(new Set(JSON.parse(val))); } catch {}
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [storageKey]);

  // Dismiss only — does NOT navigate
  const dismissOnly = useCallback(async (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    AsyncStorage.setItem(storageKey, JSON.stringify([...next])).catch(() => {});
  }, [dismissed, storageKey]);

  // Open card — navigates but does NOT dismiss
  const openCard = useCallback((card: FYCardData) => {
    if (card.route) {
      if (card.prayerTab) {
        router.push(`${card.route}?prayerTime=${card.prayerTab}` as any);
      } else {
        router.push(card.route as any);
      }
    }
  }, [router]);

  if (!loaded) return null;

  const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const cards: FYCardData[] = [];

  // ── Pre-Fajr adhkar — shown when it is currently before Fajr (night window)
  const fajrPrayerObj = prayers.find(p => p.name === 'Fajr');
  const ishaObj = prayers.find(p => p.name === 'Isha');
  const isPreFajr = fajrPrayerObj ? currentTime < fajrPrayer!.timeDate : false;
  // Only show Pre-Fajr card after Isha has passed (proper night window)
  const ishaHasPassed = ishaObj ? ishaObj.timeDate <= currentTime : false;

  // Tahajjud window: 2 hours before Fajr (takes priority over generic pre-fajr card)
  const tahajjudUnlockTime = fajrPrayerObj
    ? new Date(fajrPrayerObj.timeDate.getTime() - 2 * 60 * 60 * 1000)
    : null;
  const inTahajjudWindow = tahajjudUnlockTime
    ? currentTime >= tahajjudUnlockTime && currentTime < fajrPrayer!.timeDate
    : false;

  // Show Tahajjud card during the 2h window before Fajr
  if (inTahajjudWindow && !dismissed.has(TAHAJJUD_CARD_DATA.id)) {
    cards.push(TAHAJJUD_CARD_DATA);
  }

  // Show generic Pre-Fajr card only OUTSIDE the Tahajjud window (earlier night)
  if (isPreFajr && ishaHasPassed && !inTahajjudWindow && !dismissed.has(PRE_FAJR_CARD_DATA.id)) {
    cards.push(PRE_FAJR_CARD_DATA);
  }

  // Determine which prayer's window has expired (next prayer has started)
  const PRAYER_NEXT_MAP: Record<string, string> = {
    Fajr: 'Dhuhr', Dhuhr: 'Asr', Asr: 'Maghrib', Maghrib: 'Isha',
  };

  // Prayer adhkar cards — appear when that salah time has passed, persist until checked
  // Marked as overdue once the NEXT prayer has started
  PRAYER_ORDER.forEach(name => {
    const prayer = prayers.find(p => p.name === name);
    if (prayer && prayer.timeDate <= currentTime) {
      const card = PRAYER_ADHKAR_CARDS[name];
      if (card && !dismissed.has(card.id)) {
        const nextName = PRAYER_NEXT_MAP[name];
        const nextEntry = nextName ? prayers.find(p => p.name === nextName) : null;
        const isOverdue = nextEntry ? nextEntry.timeDate <= currentTime : false;
        cards.push({ ...card, isOverdue });
      }
    }
  });

  // ── Post-Jumu'ah adhkar — Fridays after 2nd Jamaat time
  const isFridayNow = currentTime.getDay() === 5;
  if (isFridayNow) {
    const y = currentTime.getFullYear();
    const lsm = new Date(y, 2, 31); while (lsm.getDay() !== 0) lsm.setDate(lsm.getDate() - 1);
    const lso = new Date(y, 9, 31); while (lso.getDay() !== 0) lso.setDate(lso.getDate() - 1);
    const isBST = currentTime >= lsm && currentTime < lso;
    const jamaat2Hour = isBST ? 14 : 13;
    const jamaat2Time = new Date(currentTime);
    jamaat2Time.setHours(jamaat2Hour, 30, 0, 0);
    const postJumuahId = `adhkar-post-jumuah-${todayKey}`;
    if (currentTime >= jamaat2Time && !dismissed.has(postJumuahId)) {
      cards.push({ id: postJumuahId, ...POST_JUMUAH_CARD_DATA });
    }
  }

  // Jumu'ah reminder on Fridays (before Jumu'ah)
  const jumuahId = `jumuah-${todayKey}`;
  if (isFridayNow && !dismissed.has(jumuahId)) {
    const y2 = currentTime.getFullYear();
    const lsm2 = new Date(y2, 2, 31); while (lsm2.getDay() !== 0) lsm2.setDate(lsm2.getDate() - 1);
    const lso2 = new Date(y2, 9, 31); while (lso2.getDay() !== 0) lso2.setDate(lso2.getDate() - 1);
    const bstNow = currentTime >= lsm2 && currentTime < lso2;
    const j2h = bstNow ? 14 : 13;
    const j2cutoff = new Date(currentTime); j2cutoff.setHours(j2h, 30, 0, 0);
    if (currentTime < j2cutoff) {
      cards.push({
        id: jumuahId,
        icon: 'star',
        color: '#B8860B',
        title: "Jumu'ah Mubarak",
        sub: 'Recite Surah Al-Kahf & send abundant Salawat today.',
        badge: 'Friday',
      });
    }
  }

  // Daily Sunnah reminder
  const sunnahId = `sunnah-${todayKey}`;
  if (!dismissed.has(sunnahId)) {
    cards.push({
      id: sunnahId,
      icon: todaySunnah.icon as string,
      color: '#3949AB',
      title: todaySunnah.act,
      sub: todaySunnah.ref,
      badge: 'Sunnah',
    });
  }

  const allDone = cards.length === 0;

  // Augmented prayers for countdown (includes Tahajjud virtual entry)
  const tahajjudForCountdown = fajrPrayerObj
    ? new Date(fajrPrayerObj.timeDate.getTime() - 2 * 60 * 60 * 1000)
    : null;
  const augmentedPrayersForCountdown = tahajjudForCountdown
    ? [{ name: 'Tahajjud', timeDate: tahajjudForCountdown }, ...prayers]
    : prayers;

  // ── Extra fixed slots ─────────────────────────────────────────────────────
  const extraSlots: React.ReactNode[] = [
    <DuroodCounterCard key="durood" nightMode={nightMode} todayKey={todayKey} dismissed={dismissed} onDismiss={dismissOnly} />,
    <IstighfarCounterCard key="istighfar" nightMode={nightMode} todayKey={todayKey} dismissed={dismissed} onDismiss={dismissOnly} />,
    <QuranPortionCard key="quran-portion" nightMode={nightMode} todayKey={todayKey} dismissed={dismissed} onDismiss={dismissOnly} hijriDay={hijriDay} />,
    <BedTimeCard key="bedtime" nightMode={nightMode} todayKey={todayKey} dismissed={dismissed} onDismiss={dismissOnly} onOpen={() => router.push('/(tabs)/duas?prayerTime=after-isha&group=Night+Protection' as any)} />,
    <NextAdhkarCountdownCard key="next-adhkar" nightMode={nightMode} prayers={augmentedPrayersForCountdown} currentTime={currentTime} onOpen={(prayerTab) => router.push(`/(tabs)/duas?prayerTime=${prayerTab}` as any)} />,
  ];

  return (
    <View style={{ marginHorizontal: -Spacing.md, marginTop: 2, marginBottom: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: Spacing.md }}>
        <Text style={[styles.sectionTitle, N && { color: N.text }]}>For You Today</Text>
        <Text style={{ fontSize: 10, fontWeight: '600', color: N ? N.textMuted : Colors.textSubtle }}>
          {allDone ? 'All done ✓' : `${cards.length} reminder${cards.length !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {allDone ? (
        // Static row when all prayer cards are done (Durood + Quran + Countdown still show)
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 10, paddingBottom: 4 }}
        >
          <DuroodCounterCard nightMode={nightMode} todayKey={todayKey} dismissed={dismissed} onDismiss={dismissOnly} />
          <IstighfarCounterCard nightMode={nightMode} todayKey={todayKey} dismissed={dismissed} onDismiss={dismissOnly} />
          <QuranPortionCard nightMode={nightMode} todayKey={todayKey} dismissed={dismissed} onDismiss={dismissOnly} hijriDay={hijriDay} />
          <BedTimeCard nightMode={nightMode} todayKey={todayKey} dismissed={dismissed} onDismiss={dismissOnly} onOpen={() => router.push('/(tabs)/duas?prayerTime=after-isha' as any)} />
          <NextAdhkarCountdownCard
            nightMode={nightMode}
            prayers={augmentedPrayersForCountdown}
            currentTime={currentTime}
            onOpen={(prayerTab) => router.push(`/(tabs)/duas?prayerTime=${prayerTab}` as any)}
          />
          <View style={[
            fyStyles.card, { width: 160, justifyContent: 'center' },
            N && { backgroundColor: N.surface, borderColor: N.border },
          ]}>
            <View style={fyStyles.colorBar} />
            <View style={[fyStyles.cardBody, { alignItems: 'center', gap: 8, paddingVertical: 16 }]}>
              <View style={[fyStyles.iconCircle, { backgroundColor: '#4FE94822', width: 40, height: 40, borderRadius: 20 }]}>
                <MaterialIcons name="check-circle" size={22} color="#4FE948" />
              </View>
              <Text style={[fyStyles.cardTitle, { textAlign: 'center', fontSize: 13 }, N && { color: N.text }]}>
                All caught up!
              </Text>
              <Text style={[fyStyles.cardSub, { textAlign: 'center', lineHeight: 15 }, N && { color: N.textSub }]}>
                Check back after the next Salah.
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        // Auto-scrolling ticker when cards are present
        <ForYouTickerRow
          cards={cards}
          nightMode={nightMode}
          onOpen={openCard}
          onDismiss={dismissOnly}
          extraSlots={extraSlots}
        />
      )}
    </View>
  );
}

// ── Masjid Status Strip ─────────────────────────────────────────────────
// ── Animated Quick Link Card ─────────────────────────────────────────────
function QuickLinkCard({
  icon, label, route, nightMode,
}: {
  icon: string; label: string; route: string; nightMode: boolean;
}) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 60 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40 }).start();
  const N = nightMode ? NIGHT : null;
  return (
    <TouchableOpacity
      onPress={() => router.push(route as any)}
      onPressIn={onIn}
      onPressOut={onOut}
      activeOpacity={1}
      style={{ width: '47%' }}
    >
      <Animated.View style={[
        styles.quickLinkCard,
        N && {
          backgroundColor: N.surface,
          borderColor: N.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.30,
          shadowRadius: 20,
          elevation: 8,
        },
        { transform: [{ scale }] },
      ]}>
        <View style={[
          styles.quickLinkIcon,
          N && { backgroundColor: N.accentGlow },
        ]}>
          <View style={N ? styles.quickLinkIconGlow : undefined}>
            <MaterialIcons name={icon as any} size={22} color={N ? N.accent : Colors.primary} />
          </View>
        </View>
        <Text style={[styles.quickLinkLabel, N && { color: N.text }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Masjid photo assets for donation card rotation ────────────────────────
const MASJID_IMAGES = [
  require('@/assets/images/masjid/JMN_page_2.png'),
  require('@/assets/images/masjid/JMN_page_3.png'),
  require('@/assets/images/masjid/JMN_page_5 (1).png'),
  require('@/assets/images/masjid/JMN_page_7.png'),
];
// Sequence: donate(even step), photo(odd step) — total = 2 × photo count
const DONATE_TOTAL_STEPS = MASJID_IMAGES.length * 2;
const DONATE_STEP_MS = [4500, 3500]; // [donate face duration, photo face duration]

// ── Hero → Day Section Bridge ────────────────────────────────────────────
function HeroToDaySectionBridge({ nightMode }: { nightMode: boolean }) {
  const dayBg = nightMode ? NIGHT.bg : '#E8EEEA';

  return (
    <View style={{ backgroundColor: dayBg, overflow: 'hidden' }}>
      <LinearGradient
        colors={nightMode ? ['rgba(11,18,32,0.0)', NIGHT.bg] : ['rgba(13,38,71,0.0)', '#E8EEEA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ height: 20 }}
      />
    </View>
  );
}

// ── Zawaal Section Row: Donation card (kept for future use) ──────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ZawaalSectionRow({ nightMode, onDonatePress }: {
  nightMode: boolean;
  onDonatePress: () => void;
}) {
  const N = nightMode ? NIGHT : null;

  // ── Donation card rotation (left card) ──────────────────────────────
  const [donateStep, setDonateStep] = useState(0);
  const [donateDisplayStep, setDonateDisplayStep] = useState(0);
  const donateOpacity = useRef(new Animated.Value(1)).current;

  const isDonateInfoFace = donateDisplayStep % 2 === 0;
  const photoIndex = Math.floor(donateDisplayStep / 2) % MASJID_IMAGES.length;

  const advanceDonate = useCallback((current: number) => {
    Animated.timing(donateOpacity, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => {
      const next = (current + 1) % DONATE_TOTAL_STEPS;
      setDonateDisplayStep(next);
      setDonateStep(next);
      Animated.timing(donateOpacity, { toValue: 1, duration: 380, useNativeDriver: true }).start();
    });
  }, [donateOpacity]);

  useEffect(() => {
    const duration = DONATE_STEP_MS[donateStep % 2];
    const id = setTimeout(() => advanceDonate(donateStep), duration);
    return () => clearTimeout(id);
  }, [donateStep, advanceDonate]);

  const donateGradient = N ? ['#1B4D38', '#0D3527'] as const : ['#2D8B5F', '#1D6B45'] as const;
  const donateBorder = N ? 'rgba(158,227,196,0.4)' : 'rgba(100,180,140,0.5)';
  const donateText = N ? '#F0FFF8' : '#FFFFFF';
  const donateLabel = N ? '#A8E5C2' : '#B4F5D2';
  const donateCtaBg = N ? '#5FD68C' : '#4CAA6B';
  const donateCtaText = N ? '#0D3527' : '#FFFFFF';
  return (
    <View style={zawaalRowStyles.row}>
      {/* ── Donation Card (rotates: info ↔ masjid photos) ───────────── */}
      <TouchableOpacity
        onPress={onDonatePress}
        style={zawaalRowStyles.donateCard}
        activeOpacity={0.82}
      >
        <LinearGradient
          colors={donateGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[zawaalRowStyles.donateCardGradient, { borderColor: donateBorder }]}
        >
          <View style={zawaalRowStyles.donateCardContent}>
            <Animated.View style={[zawaalRowStyles.donateCardFace, { opacity: donateOpacity }]}>
              {isDonateInfoFace ? (
                <View style={zawaalRowStyles.donateLeftContent}>
                  <MaterialIcons name="favorite" size={22} color={donateLabel} />
                  <View style={zawaalRowStyles.donateInfoTextCol}>
                    <Text style={[zawaalRowStyles.donateInfoEyebrow, { color: donateLabel }]}>Help Rebuild</Text>
                    <Text style={[zawaalRowStyles.donateInfoTitle, { color: donateText }]}>Jami&apos; Masjid Noorani</Text>
                  </View>
                </View>
              ) : (
                <View style={StyleSheet.absoluteFillObject}>
                  <Image
                    source={MASJID_IMAGES[photoIndex]}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                  />
                  <LinearGradient
                    colors={N ? ['rgba(8,16,12,0.4)', 'rgba(8,16,12,0.88)'] : ['rgba(9,28,21,0.4)', 'rgba(9,28,21,0.88)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={zawaalRowStyles.donatePhotoContent}>
                    <Text style={zawaalRowStyles.donatePhotoLabel}>JMN Campaign</Text>
                  </View>
                </View>
              )}
            </Animated.View>
            <View style={[zawaalRowStyles.donateCardCta, { backgroundColor: donateCtaBg }]}>
              <Text style={[zawaalRowStyles.donateCardCtaText, { color: donateCtaText }]}>Give</Text>
              <MaterialIcons name="arrow-forward" size={13} color={donateCtaText} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}


const zawaalRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'column',
    gap: 14,
    marginHorizontal: Spacing.sm,
    marginTop: 0,
    marginBottom: 14,
  },
  donateCard: {
    borderRadius: 18,
    overflow: 'hidden',
    minHeight: 130,
    shadowColor: '#0D3527',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  donateCardGradient: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  donateCardContent: {
    flex: 1,
    minHeight: 130,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  donateCardFace: {
    flex: 1,
    minHeight: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 12,
  },
  donateLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  donateInfoTextCol: {
    gap: 3,
  },
  donateInfoEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  donateInfoTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  donatePhotoContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  donatePhotoLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
  donateCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  donateCardCtaText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  donateInfoFace: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    justifyContent: 'space-between',
  },
  donateBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  donatePriorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(216,184,74,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(216,184,74,0.56)',
  },
  donatePriorityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: '#F8E4A1',
  },
  donateLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(148,219,186,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(148,219,186,0.45)',
  },
  donateLocationPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#C7F5E0',
  },
  donateMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  donateIconRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(216,184,74,0.90)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  donateLogoImg: {
    width: 40,
    height: 40,
  },
  donateTextStack: {
    flex: 1,
    gap: 2,
  },
  donateProjectLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BEEED8',
  },
  donateProjectTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFE9A3',
    lineHeight: 27,
  },
  donateSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 16,
  },
  donateMetaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  donateMetaChip: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E7FFF4',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  donateRaisedWrap: {
    gap: 5,
    marginTop: -1,
  },
  donateRaisedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(231,255,244,0.88)',
  },
  donateRaisedValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFE7A3',
    lineHeight: 25,
  },
  donateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  donateBtnText: { fontSize: 11, fontWeight: '900', color: '#0B3B2C', letterSpacing: 0.25 },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    gap: 8,
    alignItems: 'flex-start',
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  photoSub: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 15,
    maxWidth: '88%',
  },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#D4AF37', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5,
  },
  photoBtnText: { fontSize: 10, fontWeight: '900', color: '#0B3B2C' },
  flipCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    width: '80%',
    maxWidth: 360,
    alignSelf: 'center',
    aspectRatio: 1,
    minHeight: 276,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    position: 'relative',
  },
  flipBackdropFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 128,
  },
  flipDecorBlob: {
    position: 'absolute',
    top: 42,
    right: -30,
    width: 124,
    height: 124,
    borderRadius: 62,
  },
  flipDecorBlobSoft: {
    position: 'absolute',
    bottom: -48,
    right: -52,
    width: 152,
    height: 152,
    borderRadius: 76,
  },
  flipDecorNabwiImage: {
    position: 'absolute',
    right: -4,
    bottom: 14,
    width: 88,
    height: 88,
    borderRadius: 44,
    opacity: 0.2,
  },
  flipCardInner: { flex: 1 },
  flipHeroFace: {
    flex: 1,
    paddingHorizontal: 13,
    paddingTop: 11,
    paddingBottom: 9,
    gap: 7,
  },
  flipHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  flipHeroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    overflow: 'hidden',
  },
  flipHeroIconImage: {
    width: '100%',
    height: '100%',
  },
  flipHeroHeaderTextWrap: { flex: 1, paddingTop: 1 },
  flipHeroEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  flipHeroHeading: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
  },
  flipHeroSub: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
    marginTop: 1,
  },
  flipHeroTodayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 0,
  },
  flipHeroTodayText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  flipHeroAct: {
    marginTop: 3,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
    maxWidth: '72%',
  },
  flipHeroDetail: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    maxWidth: '68%',
  },
  flipHeroArabic: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    letterSpacing: 0.1,
    maxWidth: '72%',
  },
  flipHeroRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  flipHeroRefText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  flipHeroCtaBtn: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 132,
    shadowColor: '#0A4B37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  flipHeroCtaText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EAF9F0',
    letterSpacing: 0.3,
  },
  dots: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 5, borderTopWidth: 0,
  },
  dot: { width: 5, height: 5, borderRadius: 3, opacity: 0.55 },
});
type HomePreviewOverride = {
  scenario: 'eid-fitr' | 'eid-fitr-jumuah' | 'eid-adha' | 'eid-adha-jumuah';
  nowIso: string;
  hijriLabel: string;
  eidJamaats: string[];
};

function useCurrentTime(fixedTimeIso?: string) {
  const [time, setTime] = useState(() => (fixedTimeIso ? new Date(fixedTimeIso) : new Date()));

  useEffect(() => {
    if (fixedTimeIso) {
      setTime(new Date(fixedTimeIso));
      return undefined;
    }

    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, [fixedTimeIso]);

  return time;
}

type HeroPrayerTimelineState = {
  stateLabel: string;
  countdownText: string;
  startLabel: string;
  startTimeText: string;
  jamaatLabel: string;
  jamaatTimeText: string;
  endLabel: string;
  endTimeText: string;
  progress: number;
  pulseMarker: boolean;
  isLiveJamaatTrack: boolean;
  showJamaatAnchor: boolean;
};

type HeroTimelinePoint = {
  label: string;
  position: number;
  time: string;
};

const HERO_TIMELINE_ENDING_SOON_SECONDS = 15 * 60;
const HERO_TIMELINE_STARTING_NOW_SECONDS = 2 * 60;
const HERO_TIMELINE_PULSE_SECONDS = 30;
const HERO_LOGO_MARKER_SIZE = 30;
const HERO_TIMELINE_END_DOT_GAP = 16;

function resolvePrayerJamaatDate(activePrayer: PrayerTime | null, iqamah: string | null): Date | null {
  if (!activePrayer || !iqamah || iqamah === '-' || iqamah === '--:--') return null;

  const [hours, minutes] = iqamah.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const date = new Date(activePrayer.timeDate);
  date.setHours(hours, minutes, 0, 0);
  if (date < activePrayer.timeDate) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function resolvePrayerEndDate(activePrayer: PrayerTime | null, nextPrayerDate: Date | null): Date | null {
  if (!activePrayer || !nextPrayerDate) return null;

  const endDate = new Date(nextPrayerDate);
  if (endDate <= activePrayer.timeDate) {
    endDate.setDate(endDate.getDate() + 1);
  }
  return endDate;
}

function usePrayerTimelineState(params: {
  activePrayer: PrayerTime | null;
  currentTime: Date;
  currentPrayerIqamah: string | null;
  activePrayerEndDate: Date | null;
  effectiveHeroCountdownInfo: { label: string; value: string };
  effectiveHeroStartLabel: string;
  effectiveHeroStartTime: string;
  effectiveHeroMidLabel: string;
  effectiveHeroMidTime: string;
  effectiveHeroEndLabel: string;
  effectiveHeroEndTime: string;
  effectiveHeroShowJamaat: boolean;
  effectiveHeroJamaatValue: string;
  effectiveHeroProgress: number;
  canTrackJamaatJourney: boolean;
}): HeroPrayerTimelineState {
  return React.useMemo(() => {
    const fallbackEndLabel = params.effectiveHeroShowJamaat && params.effectiveHeroJamaatValue
      ? 'Jamaat'
      : (params.effectiveHeroEndLabel || 'Next');
    const fallbackEndTime = params.effectiveHeroShowJamaat && params.effectiveHeroJamaatValue
      ? params.effectiveHeroJamaatValue
      : (params.effectiveHeroEndTime || '--:--');
    const hasExplicitMiddleAnchor = !!params.effectiveHeroMidLabel && !!params.effectiveHeroMidTime;

    if (!params.canTrackJamaatJourney || !params.activePrayer) {
      return {
        stateLabel: (params.effectiveHeroCountdownInfo.label || 'Live Prayer').toUpperCase(),
        countdownText: params.effectiveHeroCountdownInfo.value || '00:00:00',
        startLabel: params.effectiveHeroStartLabel || 'Start',
        startTimeText: params.effectiveHeroStartTime || '--:--',
        jamaatLabel: hasExplicitMiddleAnchor ? params.effectiveHeroMidLabel : 'Jamaat',
        jamaatTimeText: hasExplicitMiddleAnchor
          ? params.effectiveHeroMidTime
          : (params.effectiveHeroJamaatValue || '--:--'),
        endLabel: fallbackEndLabel,
        endTimeText: fallbackEndTime,
        progress: Math.max(0, Math.min(1, params.effectiveHeroProgress || 0)),
        pulseMarker: false,
        isLiveJamaatTrack: false,
        showJamaatAnchor: hasExplicitMiddleAnchor,
      };
    }

    const startDate = params.activePrayer.timeDate;
    const jamaatDate = resolvePrayerJamaatDate(params.activePrayer, params.currentPrayerIqamah);
    const endDate = resolvePrayerEndDate(params.activePrayer, params.activePrayerEndDate);
    if (!jamaatDate || !endDate || endDate <= jamaatDate) {
      return {
        stateLabel: (params.effectiveHeroCountdownInfo.label || 'Live Prayer').toUpperCase(),
        countdownText: params.effectiveHeroCountdownInfo.value || '00:00:00',
        startLabel: 'Start',
        startTimeText: params.activePrayer.time || '--:--',
        jamaatLabel: 'Jamaat',
        jamaatTimeText: params.currentPrayerIqamah || '--:--',
        endLabel: fallbackEndLabel,
        endTimeText: fallbackEndTime,
        progress: Math.max(0, Math.min(1, params.effectiveHeroProgress || 0)),
        pulseMarker: false,
        isLiveJamaatTrack: false,
        showJamaatAnchor: false,
      };
    }

    const secondsToJamaat = Math.max(0, Math.floor((jamaatDate.getTime() - params.currentTime.getTime()) / 1000));
    const secondsToEnd = Math.max(0, Math.floor((endDate.getTime() - params.currentTime.getTime()) / 1000));
    const beforeJamaat = params.currentTime < jamaatDate;

    const startToJamaatTotal = Math.max(1, Math.floor((jamaatDate.getTime() - startDate.getTime()) / 1000));
    const startToJamaatElapsed = Math.max(0, Math.floor((params.currentTime.getTime() - startDate.getTime()) / 1000));
    const jamaatToEndTotal = Math.max(1, Math.floor((endDate.getTime() - jamaatDate.getTime()) / 1000));
    const jamaatToEndElapsed = Math.max(0, Math.floor((params.currentTime.getTime() - jamaatDate.getTime()) / 1000));

    let progress = 0;
    let stateLabel = 'UNTIL JAMAAT';
    let countdownText = formatCountdownSeconds(secondsToJamaat);

    if (beforeJamaat) {
      progress = Math.max(0, Math.min(0.5, 0.5 * (startToJamaatElapsed / startToJamaatTotal)));
      if (secondsToJamaat <= HERO_TIMELINE_STARTING_NOW_SECONDS) {
        stateLabel = 'JAMAAT STARTING NOW';
      } else if (secondsToJamaat <= HERO_TIMELINE_ENDING_SOON_SECONDS) {
        stateLabel = 'ENDING SOON';
      }
    } else if (secondsToEnd > 0) {
      progress = Math.max(0.5, Math.min(1, 0.5 + (0.5 * (jamaatToEndElapsed / jamaatToEndTotal))));
      countdownText = formatCountdownSeconds(secondsToEnd);
      if (secondsToJamaat <= HERO_TIMELINE_STARTING_NOW_SECONDS) {
        stateLabel = 'JAMAAT NOW';
      } else if (secondsToEnd <= HERO_TIMELINE_ENDING_SOON_SECONDS) {
        stateLabel = 'ENDING SOON';
      } else {
        stateLabel = 'UNTIL END';
      }
    } else {
      progress = 1;
      countdownText = '00:00:00';
      stateLabel = 'JAMAAT NOW';
    }

    return {
      stateLabel,
      countdownText,
      startLabel: 'Start',
      startTimeText: params.activePrayer.time || '--:--',
      jamaatLabel: 'Jamaat',
      jamaatTimeText: params.currentPrayerIqamah || '--:--',
      endLabel: 'End',
      endTimeText: params.effectiveHeroEndTime || params.effectiveHeroEndLabel || '--:--',
      progress,
      pulseMarker: secondsToJamaat <= HERO_TIMELINE_PULSE_SECONDS || secondsToEnd <= HERO_TIMELINE_PULSE_SECONDS,
      isLiveJamaatTrack: true,
      showJamaatAnchor: true,
    };
  }, [params]);
}

function HeroPrayerStatus({
  prayerName,
  stateLabel,
  countdownText,
  scheduleStrip,
}: {
  prayerName: string;
  stateLabel: string;
  countdownText: string;
  scheduleStrip?: {
    label: string;
    items: string[];
  }[] | null;
}) {
  const stateToneStyle = stateLabel.includes('NOW')
    ? heroTimelineStyles.stateLabelNow
    : stateLabel === 'ENDING SOON'
    ? heroTimelineStyles.stateLabelSoon
    : null;
  const isCompactSchedule = (scheduleStrip?.length ?? 0) > 1;

  return (
    <View style={heroTimelineStyles.statusBlock}>
      <Text style={heroTimelineStyles.prayerName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {prayerName}
      </Text>
      <Text style={[heroTimelineStyles.stateLabel, stateToneStyle]} numberOfLines={1}>
        {stateLabel}
      </Text>
      <Text style={heroTimelineStyles.countdownText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
        {countdownText}
      </Text>
      {scheduleStrip?.length ? (
        <View style={[heroTimelineStyles.scheduleStrip, isCompactSchedule && heroTimelineStyles.scheduleStripCompact]}>
          {scheduleStrip.map((section, sectionIndex) => (
            <View
              key={`${section.label}-${sectionIndex}`}
              style={[
                heroTimelineStyles.scheduleSection,
                isCompactSchedule && heroTimelineStyles.scheduleSectionCompact,
                sectionIndex > 0 && heroTimelineStyles.scheduleSectionWithDivider,
                sectionIndex > 0 && isCompactSchedule && heroTimelineStyles.scheduleSectionWithDividerCompact,
              ]}
            >
              <View style={heroTimelineStyles.scheduleStripHeader}>
                <MaterialIcons name="star" size={12} color="#FFE7A0" />
                <Text style={[heroTimelineStyles.scheduleStripLabel, isCompactSchedule && heroTimelineStyles.scheduleStripLabelCompact]}>{section.label}</Text>
              </View>
              <HeroScheduleTimes sectionLabel={section.label} items={section.items} compact={isCompactSchedule} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function HeroScheduleTimes({
  sectionLabel,
  items,
  compact,
}: {
  sectionLabel: string;
  items: string[];
  compact: boolean;
}) {
  const scrollRef = useRef<ScrollView | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const offsetRef = useRef(0);
  const directionRef = useRef<1 | -1>(1);
  const pauseTicksRef = useRef(0);
  const shouldAutoScroll = items.length >= 3 && contentWidth > containerWidth + 12;

  useEffect(() => {
    if (!shouldAutoScroll) {
      offsetRef.current = 0;
      directionRef.current = 1;
      pauseTicksRef.current = 0;
      scrollRef.current?.scrollTo({ x: 0, animated: false });
      return undefined;
    }

    const maxOffset = Math.max(0, contentWidth - containerWidth);
    if (maxOffset <= 0) return undefined;

    const intervalId = setInterval(() => {
      if (pauseTicksRef.current > 0) {
        pauseTicksRef.current -= 1;
        return;
      }

      let nextOffset = offsetRef.current + directionRef.current;

      if (nextOffset >= maxOffset) {
        nextOffset = maxOffset;
        directionRef.current = -1;
        pauseTicksRef.current = 18;
      } else if (nextOffset <= 0) {
        nextOffset = 0;
        directionRef.current = 1;
        pauseTicksRef.current = 18;
      }

      offsetRef.current = nextOffset;
      scrollRef.current?.scrollTo({ x: nextOffset, animated: false });
    }, 65);

    return () => clearInterval(intervalId);
  }, [shouldAutoScroll, contentWidth, containerWidth]);

  const timeNodes = items.map((time, timeIndex) => (
    <React.Fragment key={`${sectionLabel}-${time}-${timeIndex}`}>
      {timeIndex > 0 ? <View style={heroTimelineStyles.scheduleStripDivider} /> : null}
      <View style={heroTimelineStyles.scheduleStripTimePill}>
        <Text style={[heroTimelineStyles.scheduleStripTimeOrder, compact && heroTimelineStyles.scheduleStripTimeOrderCompact]}>{`${toOrdinal(timeIndex + 1)}`}</Text>
        <Text style={[heroTimelineStyles.scheduleStripTimeValue, compact && heroTimelineStyles.scheduleStripTimeValueCompact]}>{time}</Text>
      </View>
    </React.Fragment>
  ));

  if (!shouldAutoScroll) {
    return <View style={heroTimelineStyles.scheduleStripTimes}>{timeNodes}</View>;
  }

  return (
    <View
      style={heroTimelineStyles.scheduleStripScrollViewport}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onContentSizeChange={(width) => setContentWidth(width)}
        contentContainerStyle={heroTimelineStyles.scheduleStripScrollContent}
      >
        {timeNodes}
      </ScrollView>
    </View>
  );
}

function HeroLogoMarker({
  markerScale,
  nightMode,
  pulseMarker,
}: {
  markerScale: Animated.Value;
  nightMode: boolean;
  pulseMarker: boolean;
}) {
  return (
    <Animated.View
      style={[
        heroTimelineStyles.markerOuter,
        nightMode && heroTimelineStyles.markerOuterNight,
        pulseMarker && heroTimelineStyles.markerOuterPulse,
        { transform: [{ scale: markerScale }] },
      ]}
    >
      <Image
        source={require('@/assets/images/masjid-logo.png')}
        style={heroTimelineStyles.markerImage}
        contentFit="contain"
      />
    </Animated.View>
  );
}

function HeroPrayerTimeline({
  progress,
  startTimeText,
  jamaatTimeText,
  endTimeText,
  startLabel,
  jamaatLabel,
  endLabel,
  showJamaatAnchor,
  nightMode,
  pulseMarker,
  timelinePoints,
}: {
  progress: number;
  startTimeText: string;
  jamaatTimeText: string;
  endTimeText: string;
  startLabel: string;
  jamaatLabel: string;
  endLabel: string;
  showJamaatAnchor: boolean;
  nightMode: boolean;
  pulseMarker: boolean;
  timelinePoints?: HeroTimelinePoint[];
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const markerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, progress]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (pulseMarker) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(markerScale, {
            toValue: 1.06,
            duration: 950,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(markerScale, {
            toValue: 1,
            duration: 950,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      markerScale.stopAnimation();
      markerScale.setValue(1);
    }

    return () => {
      loop?.stop();
    };
  }, [markerScale, pulseMarker]);

  const markerTravel = Math.max(0, trackWidth - HERO_LOGO_MARKER_SIZE - HERO_TIMELINE_END_DOT_GAP);
  const markerTranslateX = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, markerTravel],
  });
  const fillWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, trackWidth)],
  });

  return (
    <View style={heroTimelineStyles.timelineBlock}>
      <View style={heroTimelineStyles.trackShell}>
        <View
          style={heroTimelineStyles.trackRail}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        >
          <View style={[heroTimelineStyles.trackLine, nightMode && heroTimelineStyles.trackLineNight]} />
          {trackWidth > 0 ? (
            <Animated.View style={[heroTimelineStyles.trackFill, { width: fillWidth }]} />
          ) : null}
          <View style={heroTimelineStyles.anchorDot} />
          {showJamaatAnchor ? <View style={[heroTimelineStyles.anchorDot, heroTimelineStyles.anchorDotMiddle]} /> : null}
          {trackWidth > 0 ? timelinePoints?.map((point) => (
            <View
              key={`${point.label}-${point.time}`}
              style={[
                heroTimelineStyles.dynamicTimelineDot,
                { left: `${Math.max(0, Math.min(1, point.position)) * 100}%` },
              ]}
            />
          )) : null}
          {trackWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                heroTimelineStyles.markerPosition,
                { transform: [{ translateX: markerTranslateX }] },
              ]}
            >
              <HeroLogoMarker markerScale={markerScale} nightMode={nightMode} pulseMarker={pulseMarker} />
            </Animated.View>
          ) : null}
          <View style={[heroTimelineStyles.anchorDot, heroTimelineStyles.anchorDotRight, heroTimelineStyles.anchorDotEnd]} />
        </View>
      </View>

      <View style={heroTimelineStyles.anchorTimesRow}>
        <Text style={heroTimelineStyles.anchorTimeText} numberOfLines={1}>{startTimeText}</Text>
        {showJamaatAnchor ? <Text style={heroTimelineStyles.anchorTimeTextCenter} numberOfLines={1}>{jamaatTimeText}</Text> : null}
        {timelinePoints?.map((point) => (
          <Text
            key={`${point.label}-${point.time}-time`}
            style={[
              heroTimelineStyles.dynamicAnchorTimeText,
              { left: `${Math.max(0, Math.min(1, point.position)) * 100}%` },
            ]}
            numberOfLines={1}
          >
            {point.time}
          </Text>
        ))}
        <Text style={heroTimelineStyles.anchorTimeText} numberOfLines={1}>{endTimeText}</Text>
      </View>
      <View style={heroTimelineStyles.anchorLabelsRow}>
        <Text style={heroTimelineStyles.anchorLabelText} numberOfLines={1}>{startLabel}</Text>
        {showJamaatAnchor ? <Text style={heroTimelineStyles.anchorLabelTextCenter} numberOfLines={1}>{jamaatLabel}</Text> : null}
        {timelinePoints?.map((point) => (
          <Text
            key={`${point.label}-${point.time}-label`}
            style={[
              heroTimelineStyles.dynamicAnchorLabelText,
              { left: `${Math.max(0, Math.min(1, point.position)) * 100}%` },
            ]}
            numberOfLines={1}
          >
            {point.label}
          </Text>
        ))}
        <Text style={heroTimelineStyles.anchorLabelText} numberOfLines={1}>{endLabel}</Text>
      </View>
    </View>
  );
}

// ── Hero Support Card: Donation ───────────────────────────────────────────
function HeroDonationCard({ onPress }: { nightMode: boolean; onPress: () => void }) {
  const [donateStep, setDonateStep] = useState(0);
  const [donateDisplayStep, setDonateDisplayStep] = useState(0);
  const donateOpacity = useRef(new Animated.Value(1)).current;

  const isInfoFace = donateDisplayStep % 2 === 0;
  const photoIndex = Math.floor(donateDisplayStep / 2) % MASJID_IMAGES.length;

  const advanceDonate = useCallback((current: number) => {
    Animated.timing(donateOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
      const next = (current + 1) % DONATE_TOTAL_STEPS;
      setDonateDisplayStep(next);
      setDonateStep(next);
      Animated.timing(donateOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  }, [donateOpacity]);

  useEffect(() => {
    const duration = DONATE_STEP_MS[donateStep % 2];
    const id = setTimeout(() => advanceDonate(donateStep), duration);
    return () => clearTimeout(id);
  }, [donateStep, advanceDonate]);

  return (
    <TouchableOpacity style={heroSupportStyles.card} onPress={onPress} activeOpacity={0.82}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: donateOpacity }]}>
        {isInfoFace ? (
          /* ── Info face ─────────────────────────────────────────── */
          <View style={heroSupportStyles.donateInner}>
            <View style={heroSupportStyles.donateLeft}>
              <View style={heroSupportStyles.donateLogoRing}>
                <Image
                  source={require('../../assets/images/masjid-logo.png')}
                  style={heroSupportStyles.donateLogoImg}
                  contentFit="contain"
                />
              </View>
              <View style={heroSupportStyles.donateTextBlock}>
                <View style={heroSupportStyles.donateSectionRow}>
                  <MaterialIcons name="volunteer-activism" size={11} color="#D4AF37" />
                  <Text style={heroSupportStyles.donateSectionLabel}>Community Appeal</Text>
                </View>
                <Text style={heroSupportStyles.donateEyebrow}>Project Rebuild</Text>
                <Text style={heroSupportStyles.donateName} numberOfLines={1}>
                  Jami{'\u2019'} Masjid Noorani
                </Text>
              </View>
            </View>
            <View style={heroSupportStyles.donateBtn}>
              <MaterialIcons name="volunteer-activism" size={11} color="#0B3B2C" />
              <Text style={heroSupportStyles.donateBtnText}>Donate Now</Text>
            </View>
          </View>
        ) : (
          /* ── Photo face ────────────────────────────────────────── */
          <View style={StyleSheet.absoluteFillObject}>
            <Image
              source={MASJID_IMAGES[photoIndex]}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
            />
            <LinearGradient
              colors={['rgba(5,20,13,0.28)', 'rgba(5,20,13,0.82)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={heroSupportStyles.donatePhotoOverlay}>
              <View style={heroSupportStyles.donatePhotoTextBlock}>
                <Text style={heroSupportStyles.donatePhotoEyebrow}>Community Appeal</Text>
                <Text style={heroSupportStyles.donatePhotoLabel}>Jami{'\u2019'} Masjid Noorani</Text>
              </View>
              <View style={heroSupportStyles.donateBtn}>
                <MaterialIcons name="volunteer-activism" size={11} color="#0B3B2C" />
                <Text style={heroSupportStyles.donateBtnText}>Donate Now</Text>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Hero Support Card: Dynamic (Eid / Jumu'ah / Today's Salah) ──────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HeroDynamicSupportCard({
  isEidActive,
  eidLabel,
  eidFirstJamaat,
  isFriday,
  jj1,
  jj2,
  onOpenSalahDrawer,
}: {
  nightMode: boolean;
  isEidActive: boolean;
  eidLabel: string;
  eidFirstJamaat: string;
  isFriday: boolean;
  jj1: string;
  jj2: string;
  onOpenSalahDrawer: () => void;
}) {
  const isAdhaSupportCard = /adha/i.test(eidLabel);

  // Priority 1: Eid
  if (isEidActive) {
    return (
      <TouchableOpacity
        style={[heroSupportStyles.card, isAdhaSupportCard && heroSupportStyles.salahCard]}
        activeOpacity={0.82}
        onPress={onOpenSalahDrawer}
      >
        <View style={heroSupportStyles.dynamicInner}>
          <View style={heroSupportStyles.dynamicIconRow}>
            <MaterialIcons name="star" size={12} color={isAdhaSupportCard ? '#B78103' : '#FBBF24'} />
            <Text
              style={[
                heroSupportStyles.dynamicEyebrow,
                isAdhaSupportCard ? heroSupportStyles.adhaEyebrow : { color: '#FBBF24' },
              ]}
            >
              {eidLabel}
            </Text>
          </View>
          <Text style={[heroSupportStyles.dynamicTitle, isAdhaSupportCard && heroSupportStyles.adhaTitle]}>Eid Salah</Text>
          <Text style={[heroSupportStyles.dynamicSub, isAdhaSupportCard && heroSupportStyles.adhaSub]} numberOfLines={1}>{eidFirstJamaat}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Priority 2: Jumu'ah (Friday)
  // Priority 3: Today's Salah
  return (
    <TouchableOpacity
      style={[heroSupportStyles.card, heroSupportStyles.salahCard]}
      activeOpacity={0.82}
      onPress={onOpenSalahDrawer}
    >
      <View style={heroSupportStyles.dynamicInner}>
        <View style={heroSupportStyles.dynamicIconRow}>
          <MaterialIcons name="schedule" size={12} color="#2B7A57" />
          <Text style={[heroSupportStyles.dynamicEyebrow, heroSupportStyles.salahEyebrow]}>Today{'\u2019'}s Salah</Text>
        </View>
        <Text style={[heroSupportStyles.dynamicTitle, heroSupportStyles.salahTitle]}>Prayer Times</Text>
        <View style={[heroSupportStyles.dynamicViewBtn, heroSupportStyles.salahViewBtn]}>
          <Text style={[heroSupportStyles.dynamicViewBtnText, heroSupportStyles.salahViewBtnText]}>View Times</Text>
          <MaterialIcons name="arrow-forward" size={9} color="#2B7A57" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Night Mode Toggle Button ──────────────────────────────────────────────
export function NightModeToggle({ nightMode, onToggle }: { nightMode: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      style={[
        toggleStyles.btn,
        nightMode ? toggleStyles.btnNight : toggleStyles.btnDay,
      ]}
    >
      <MaterialIcons
        name={nightMode ? 'nights-stay' : 'wb-sunny'}
        size={16}
        color={nightMode ? '#C0D8FF' : '#FFF'}
      />
      <Text style={[toggleStyles.label, { color: nightMode ? '#C0D8FF' : '#FFF' }]}>
        {nightMode ? 'Night' : 'Day'}
      </Text>
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  btnNight: {
    backgroundColor: 'rgba(13,34,74,0.85)',
    borderColor: '#2A4A7A',
  },
  btnDay: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

// ── Home Screen ────────────────────────────────────────────────────────────
export default function HomeScreen({ previewOverride }: { previewOverride?: HomePreviewOverride }) {
  // DB-driven sunnah reminders
  const [dbSunnahs, setDbSunnahs] = useState<SunnahReminderRow[]>([]);
  const [eidUlFitrJamaats, setEidUlFitrJamaats] = useState<string[]>([]);
  const [eidUlAdhaJamaats, setEidUlAdhaJamaats] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [donationLoading, setDonationLoading] = useState(false);
  const [donationModalVisible, setDonationModalVisible] = useState(false);
  const [donationCheckoutUrl, setDonationCheckoutUrl] = useState<string | null>(null);
  const [showDonationOptions, setShowDonationOptions] = useState(true);
  const [donationStatusMessage, setDonationStatusMessage] = useState<string | null>(null);
  const [webPrayerDrawerVisible, setWebPrayerDrawerVisible] = useState(false);
  const prayerSheetRef = useRef<BottomSheet>(null);
  const loadSunnahReminders = useCallback(async () => {
    try {
      const rows = await fetchSunnahReminders();
      if (rows.length > 0) setDbSunnahs(rows);
    } catch {}
  }, []);

  useEffect(() => {
    loadSunnahReminders();

    // Yaseen images are bundled as local assets — no preload needed
  }, [loadSunnahReminders]);

  useEffect(() => {
    let mounted = true;

    const loadEidUlFitr = async () => {
      try {
        const eidData = await fetchEidUlFitr();
        const times = (eidData?.jamaats ?? [])
          .map((entry) => entry.time)
          .filter((time): time is string => !!time);

        if (mounted && times.length > 0) {
          setEidUlFitrJamaats(times);
        }
      } catch (err) {
        console.error('Error fetching Eid ul Fitr times:', err);
      }
    };

    const loadEidUlAdha = async () => {
      try {
        const eidData = await fetchEidUlAdha();
        const times = (eidData?.jamaats ?? [])
          .map((entry) => entry.time)
          .filter((time): time is string => !!time);

        if (mounted && times.length > 0) {
          setEidUlAdhaJamaats(times);
        }
      } catch (err) {
        console.error('Error fetching Eid ul Adha times:', err);
      }
    };

    loadEidUlFitr();
    loadEidUlAdha();

    return () => {
      mounted = false;
    };
  }, []);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const showPreviewShortcuts = __DEV__ || !!previewOverride;
  const { nightMode } = useNightMode();
  const {
    data, countdown, nextPrayerName,
    forbiddenInfo,
    refresh: refreshPrayerTimes,
  } = usePrayerTimes();
  const flashAnim = useRef(new Animated.Value(1)).current;
  const flashLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const currentTime = useCurrentTime(previewOverride?.nowIso);
  const nextInfo = React.useMemo(() => (data ? getNextPrayer(data.prayers) : null), [data]);

  const {
    activePrayer,
    jamaatStarted,
    jamaatOngoing,
    alertMode,
    jamaatCountdown,
    hasJamaat,
  } = React.useMemo(() => buildActivePrayerState(data?.prayers, currentTime), [data, currentTime]);

  useEffect(() => {
    if (jamaatStarted && jamaatOngoing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 0.15, duration: 400, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      flashLoopRef.current = loop;
      loop.start();
    } else {
      flashLoopRef.current?.stop();
      flashLoopRef.current = null;
      flashAnim.setValue(1);
    }
    return () => {
      flashLoopRef.current?.stop();
    };
  }, [jamaatStarted, jamaatOngoing, flashAnim]);

  const N = nightMode ? NIGHT : null;
  const effectiveHijriLabel = previewOverride?.hijriLabel ?? data?.hijriDate ?? '';
  const hijriDayNum  = effectiveHijriLabel ? getHijriDayNumber(effectiveHijriLabel) : '';
  const rawHijriDayNum = effectiveHijriLabel ? Number.parseInt(getHijriDayNumber(effectiveHijriLabel) || '0', 10) : 0;
  const rawHijriMonthName = effectiveHijriLabel ? getHijriMonthFromAnyFormat(effectiveHijriLabel) : '';
  const isShawwalNow = isShawwalMonth(rawHijriMonthName);
  const isDhulHijjahNow = isDhulHijjahMonth(rawHijriMonthName);
  const previewActiveEidType: 'eid_al_fitr' | 'eid_al_adha' | null = previewOverride?.scenario === 'eid-fitr' || previewOverride?.scenario === 'eid-fitr-jumuah'
    ? 'eid_al_fitr'
    : previewOverride?.scenario === 'eid-adha' || previewOverride?.scenario === 'eid-adha-jumuah'
    ? 'eid_al_adha'
    : null;
  const effectiveIsFriday = previewOverride
    ? (previewOverride.scenario === 'eid-fitr-jumuah' || previewOverride.scenario === 'eid-adha-jumuah')
    : currentTime.getDay() === 5;
  const effectiveIsThursday = previewOverride ? false : currentTime.getDay() === 4;
  // Hijri day as integer (1-30) — drives Full Juz for monthly Quran completion
  // Falls back to Gregorian day-of-year mod 30 until Hijri data loads
  const hijriDayInt  = parseInt(hijriDayNum || '0', 10) || ((DAY_OF_YEAR % 30) + 1);

  const nextIqamah = nextInfo?.prayer.iqamah && nextInfo.prayer.iqamah !== '-' ? nextInfo.prayer.iqamah : null;
  const fajrPrayer = data?.prayers.find(p => p.name === 'Fajr');
  const dhuhrPrayer = data?.prayers.find(p => p.name === 'Dhuhr');
  const asrPrayer = data?.prayers.find(p => p.name === 'Asr');
  const maghribPrayer = data?.prayers.find(p => p.name === 'Maghrib');

  const {
    heroImageKey,
    heroProgress,
    heroAthanMarker,
    heroJamaatMarker,
    heroEndMarker,
    heroMidMarker,
    heroPrayerName,
    heroCountdownInfo,
    heroStartLabel,
    heroStartTime,
    heroEndLabel,
    heroEndTime,
    heroMidLabel,
    heroMidTime,
  } = React.useMemo(() => buildHeroState({
    forbiddenInfo,
    data,
    now: currentTime,
    activePrayer,
    nextPrayerName,
    nextInfo,
    hasJamaat,
    jamaatStarted,
    jamaatOngoing,
    jamaatCountdown,
    countdown,
  }), [
    forbiddenInfo,
    data,
    currentTime,
    activePrayer,
    nextPrayerName,
    nextInfo,
    hasJamaat,
    jamaatStarted,
    jamaatOngoing,
    jamaatCountdown,
    countdown,
  ]);
  const isEidUlFitrDay = previewActiveEidType === 'eid_al_fitr' || (isShawwalNow && rawHijriDayNum === 1);
  const isEidUlAdhaDay = previewActiveEidType === 'eid_al_adha' || (isDhulHijjahNow && rawHijriDayNum === 10);
  const activeEidType: 'eid_al_fitr' | 'eid_al_adha' | null = previewActiveEidType ?? (isEidUlFitrDay
    ? 'eid_al_fitr'
    : (isEidUlAdhaDay ? 'eid_al_adha' : null));

  const resolvedEidJamaats = React.useMemo(() => {
    if (previewOverride?.eidJamaats?.length) return previewOverride.eidJamaats;
    const source = activeEidType === 'eid_al_fitr' ? eidUlFitrJamaats : eidUlAdhaJamaats;
    return source.length > 0 ? source : ['06:30'];
  }, [previewOverride?.eidJamaats, activeEidType, eidUlFitrJamaats, eidUlAdhaJamaats]);

  const eidInfoLine = buildEidJamaatNote(resolvedEidJamaats);
  const isEidHeroWindow = !!(
    activeEidType
    && fajrPrayer?.timeDate
    && currentTime >= fajrPrayer.timeDate
    && dhuhrPrayer?.timeDate
    && currentTime < dhuhrPrayer.timeDate
  );
  const shouldShowEidInfoLine = !!(
    activeEidType
    && (
      (!!asrPrayer?.timeDate && currentTime < asrPrayer.timeDate)
      || (!!maghribPrayer?.timeDate && currentTime >= maghribPrayer.timeDate)
    )
  );

  const eidHeroData = React.useMemo(() => {
    if (!isEidHeroWindow || !fajrPrayer?.timeDate || !dhuhrPrayer?.timeDate) return null;

    const parseClockToday = (clock: string): Date | null => {
      const [h, m] = clock.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      const d = new Date(currentTime);
      d.setHours(h, m, 0, 0);
      return d;
    };

    const jamaatDates = resolvedEidJamaats
      .map((time) => ({ time, date: parseClockToday(time) }))
      .filter((entry): entry is { time: string; date: Date } => !!entry.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const timelinePoints: HeroTimelinePoint[] = jamaatDates.map((entry, index) => ({
      label: `${toOrdinal(index + 1).toUpperCase()} EID`,
      time: entry.time,
      position: jamaatDates.length === 1 ? 0.5 : 0.12 + ((0.76 / Math.max(1, jamaatDates.length - 1)) * index),
    }));

    const firstJamaat = jamaatDates[0]?.date ?? null;
    const lastJamaat = jamaatDates[jamaatDates.length - 1]?.date ?? null;

    let label = 'Until Dhuhr';
    let value = countdown;
    let startLabel = 'Fajr';
    let startTime = fajrPrayer.time ?? '--:--';
    let endLabel = 'Dhuhr';
    let endTime = dhuhrPrayer.time ?? '--:--';
    let progressStart = fajrPrayer.timeDate;
    let progressEnd = dhuhrPrayer.timeDate;
    let isAfterFinalEidJamaat = false;

    if (firstJamaat && currentTime < firstJamaat) {
      label = `${toOrdinal(1)} Eid`;
      value = formatCountdownSeconds(Math.max(0, Math.floor((firstJamaat.getTime() - currentTime.getTime()) / 1000)));
      endLabel = `${toOrdinal(1)} Eid`;
      endTime = jamaatDates[0].time;
      progressEnd = firstJamaat;
    } else {
      let betweenIndex = -1;
      for (let i = 0; i < jamaatDates.length - 1; i++) {
        if (currentTime >= jamaatDates[i].date && currentTime < jamaatDates[i + 1].date) {
          betweenIndex = i;
          break;
        }
      }

      if (betweenIndex >= 0) {
        const currentJamaat = jamaatDates[betweenIndex];
        const nextJamaat = jamaatDates[betweenIndex + 1];
        label = `${toOrdinal(betweenIndex + 2)} Eid`;
        value = formatCountdownSeconds(Math.max(0, Math.floor((nextJamaat.date.getTime() - currentTime.getTime()) / 1000)));
        startLabel = `${toOrdinal(betweenIndex + 1)} Eid`;
        startTime = currentJamaat.time;
        endLabel = `${toOrdinal(betweenIndex + 2)} Eid`;
        endTime = nextJamaat.time;
        progressStart = currentJamaat.date;
        progressEnd = nextJamaat.date;
      } else if (lastJamaat && currentTime >= lastJamaat) {
        label = 'Until Dhuhr';
        value = formatCountdownSeconds(Math.max(0, Math.floor((dhuhrPrayer.timeDate.getTime() - currentTime.getTime()) / 1000)));
        startLabel = `${toOrdinal(jamaatDates.length)} Eid`;
        startTime = jamaatDates[jamaatDates.length - 1].time;
        endLabel = 'Dhuhr';
        endTime = dhuhrPrayer.time ?? '--:--';
        progressStart = lastJamaat;
        progressEnd = dhuhrPrayer.timeDate;
        isAfterFinalEidJamaat = true;
      }
    }

    const total = Math.max(1, progressEnd.getTime() - progressStart.getTime());
    const elapsed = Math.max(0, currentTime.getTime() - progressStart.getTime());
    const progress = Math.max(0, Math.min(1, elapsed / total));

    return {
      countdownInfo: {
        label,
        value,
        note: eidInfoLine,
        flash: false,
      },
      progress,
      startLabel,
      startTime,
      endLabel,
      endTime,
      timelinePoints,
      isAfterFinalEidJamaat,
    };
  }, [
    isEidHeroWindow,
    fajrPrayer,
    dhuhrPrayer,
    resolvedEidJamaats,
    currentTime,
    countdown,
    eidInfoLine,
  ]);

  const isFriday = effectiveIsFriday;
  const isThursday = effectiveIsThursday;

  // Compute today's sunnah from DB (fallback to SUNNAH_REMINDERS)
  const computedTodaySunnah: SunnahEntry = (() => {
    if (dbSunnahs.length === 0) {
      return { act: '', detail: '', ref: '', icon: 'star' };
    }
    const filtered = isFriday ? dbSunnahs : dbSunnahs.filter(s => !s.friday_only);
    const pool = filtered.length > 0 ? filtered : dbSunnahs;
    const row = pool[DAY_OF_YEAR % pool.length];
    return {
      act: row?.title ?? '',
      detail: row?.description ?? '',
      ref: row?.reference ?? '',
      icon: row?.icon ?? 'star',
    };
  })();

  const bst = (() => {
    const y = currentTime.getFullYear();
    const lsm = new Date(y, 2, 31); while (lsm.getDay() !== 0) lsm.setDate(lsm.getDate() - 1);
    const lso = new Date(y, 9, 31); while (lso.getDay() !== 0) lso.setDate(lso.getDate() - 1);
    return currentTime >= lsm && currentTime < lso;
  })();

  // Jummah info visibility: from Isha Thursday through Friday (except Jummah hero)

  // For Thursday: show next Friday's times (Friday itself uses today's BST)
  const jumuahDisplayBST = (() => {
    if (isFriday) return bst;
    // Thursday night — calculate for next day (Friday)
    const nextFri = new Date(currentTime);
    nextFri.setDate(nextFri.getDate() + 1);
    const y = nextFri.getFullYear();
    const lsm = new Date(y, 2, 31); while (lsm.getDay() !== 0) lsm.setDate(lsm.getDate() - 1);
    const lso = new Date(y, 9, 31); while (lso.getDay() !== 0) lso.setDate(lso.getDate() - 1);
    return nextFri >= lsm && nextFri < lso;
  })();
  const jj1 = jumuahDisplayBST ? '1:30 PM' : '12:45 PM';
  const jj2 = jumuahDisplayBST ? '2:30 PM' : '1:30 PM';

  const parseMeridianToday = (clock12: string): Date => {
    const m = clock12.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const d = new Date(currentTime);
    if (!m) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    let hh = Number(m[1]);
    const mm = Number(m[2]);
    const mer = m[3].toUpperCase();
    if (mer === 'PM' && hh !== 12) hh += 12;
    if (mer === 'AM' && hh === 12) hh = 0;
    d.setHours(hh, mm, 0, 0);
    return d;
  };

  const effectiveForbiddenInfo = isEidHeroWindow ? null : forbiddenInfo;

  const isFridayPostZawaal = !!(
    isFriday
    && !isEidHeroWindow
    && !effectiveForbiddenInfo
    && dhuhrPrayer?.timeDate
    && asrPrayer?.timeDate
    && currentTime >= dhuhrPrayer.timeDate
    && currentTime < asrPrayer.timeDate
  );

  const isNonJumuahEidPostFinalHero = !!(
    isEidHeroWindow
    && !isFriday
    && eidHeroData?.isAfterFinalEidJamaat
  );

  const isFridayZawaalHero = !!(isFriday && effectiveForbiddenInfo && heroPrayerName === 'Zawaal');

  const firstJummahAthanTime = dhuhrPrayer?.time ?? heroEndTime;
  const fridayJumuahScheduleNote = `Jummah Prayers: 1st: ${jj1} · 2nd: ${jj2}`;
  const shouldShowFridayJumuahNote = (() => {
    // Show Jummah info strip from Maghrib Thursday until Asr starts on Friday.
    if (isFriday && asrPrayer?.timeDate && currentTime < asrPrayer.timeDate) return true;
    if (isThursday && maghribPrayer?.timeDate && currentTime >= maghribPrayer.timeDate) return true;
    return false;
  })();

  const effectiveHeroImageKey = isNonJumuahEidPostFinalHero
    ? 'Zawaal'
    : isEidHeroWindow
    ? (activeEidType === 'eid_al_adha' ? 'EidAdha' : 'Eid')
    : (isFridayPostZawaal ? 'Jumuah' : heroImageKey);
  const effectiveHeroPrayerName = isNonJumuahEidPostFinalHero
    ? 'Zawaal'
    : isEidHeroWindow
    ? 'Eid Prayer'
    : (isFridayPostZawaal ? 'Jumuah' : heroPrayerName);
  const effectiveHeroStartLabel = isEidHeroWindow
    ? (eidHeroData?.startLabel ?? 'Fajr')
    : (isFridayPostZawaal ? 'First Athan' : heroStartLabel);
  const effectiveHeroStartTime = isEidHeroWindow
    ? (eidHeroData?.startTime ?? '--:--')
    : isFridayPostZawaal
    ? (dhuhrPrayer?.time ?? heroStartTime)
    : heroStartTime;
  const effectiveHeroEndLabel = isEidHeroWindow
    ? (eidHeroData?.endLabel ?? 'Dhuhr')
    : isFridayPostZawaal
    ? 'Asr'
    : (isFridayZawaalHero ? '1st Jummah Athaan' : heroEndLabel);
  const effectiveHeroEndTime = isEidHeroWindow
    ? (eidHeroData?.endTime ?? '--:--')
    : isFridayPostZawaal
    ? (asrPrayer?.time ?? heroEndTime)
    : (isFridayZawaalHero ? firstJummahAthanTime : heroEndTime);
  const effectiveHeroMidLabel = (isFridayPostZawaal || isEidHeroWindow) ? '' : heroMidLabel;
  const effectiveHeroMidTime = (isFridayPostZawaal || isEidHeroWindow) ? '' : heroMidTime;
  const currentPrayerIqamah = activePrayer?.iqamah && activePrayer.iqamah !== '-' ? activePrayer.iqamah : null;
  const hasExplicitHeroMidEvent = !!effectiveHeroMidLabel && !!effectiveHeroMidTime;
  const isSpecialHeroPhase = ['Sunrise', 'Ishraq', 'Zawaal'].includes(effectiveHeroPrayerName);
  const heroPrayerSupportsJamaat = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Jumuah'].includes(effectiveHeroPrayerName);
  const endEntrySupportsJamaat = ['Next Prayer', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Jumuah'].includes(effectiveHeroEndLabel);
  const effectiveHeroJamaatValue = (() => {
    if (isEidHeroWindow) return '';
    if (isFridayPostZawaal) return '';
    if (isSpecialHeroPhase) return '';
    if (hasExplicitHeroMidEvent) return '';
    if (heroPrayerSupportsJamaat && currentPrayerIqamah) return currentPrayerIqamah;
    if (endEntrySupportsJamaat && nextIqamah) return nextIqamah;
    return '';
  })();
  const effectiveHeroShowJamaat = !!effectiveHeroJamaatValue;
  const effectiveNextPrayerName = isFridayPostZawaal ? 'Asr' : nextPrayerName;

  const isEidHero = isEidHeroWindow;

  const effectiveHeroCountdownInfo = (() => {
    if (isEidHeroWindow && eidHeroData) {
      const noteParts: string[] = [];
      if (eidHeroData.isAfterFinalEidJamaat) {
        noteParts.push('The final eid prayer has been');
      }
      if (shouldShowEidInfoLine && !eidHeroData.isAfterFinalEidJamaat) noteParts.push(`Eid Prayers: ${eidInfoLine}`);
      if (isFriday) noteParts.push(fridayJumuahScheduleNote);

      return {
        ...eidHeroData.countdownInfo,
        note: noteParts.join(' · '),
      };
    }

    if (isFridayPostZawaal) {
      const j1Date = parseMeridianToday(jj1);
      const j2Date = parseMeridianToday(jj2);
      const asrDate = asrPrayer?.timeDate ?? null;

      if (currentTime < j1Date) {
        return {
          label: '1st Jummah',
          value: formatCountdownSeconds(Math.max(0, Math.floor((j1Date.getTime() - currentTime.getTime()) / 1000))),
          note: fridayJumuahScheduleNote,
          flash: false,
        };
      }
      if (currentTime < j2Date) {
        return {
          label: '2nd Jummah',
          value: formatCountdownSeconds(Math.max(0, Math.floor((j2Date.getTime() - currentTime.getTime()) / 1000))),
          note: fridayJumuahScheduleNote,
          flash: false,
        };
      }
      if (asrDate) {
        return {
          label: 'Asr Start',
          value: formatCountdownSeconds(Math.max(0, Math.floor((asrDate.getTime() - currentTime.getTime()) / 1000))),
          note: 'Jumuah completed. Prepare for Asr.',
          flash: false,
        };
      }
    }

    let resolvedInfo = heroCountdownInfo;

    if (shouldShowFridayJumuahNote) {
      const prefix = resolvedInfo.note ? `${resolvedInfo.note} · ` : '';
      resolvedInfo = {
        ...resolvedInfo,
        note: `${prefix}${fridayJumuahScheduleNote}`,
      };
    }

    if (shouldShowEidInfoLine) {
      const prefix = resolvedInfo.note ? `${resolvedInfo.note} · ` : '';
      resolvedInfo = {
        ...resolvedInfo,
        note: `${prefix}${eidInfoLine}`,
      };
    }

    return resolvedInfo;
  })();

  const fullDayTimelineProgress = React.useMemo(
    () => getFullDayTimelineProgress(data?.prayers, currentTime),
    [data?.prayers, currentTime]
  );

  const effectiveHeroProgress = isEidHeroWindow
    ? (eidHeroData?.progress ?? heroProgress)
    : (fullDayTimelineProgress ?? heroProgress);
  const effectiveHeroTimelinePoints = isEidHeroWindow
    ? (eidHeroData?.timelinePoints ?? [])
    : undefined;
  const effectiveHeroAthanMarker = isEidHeroWindow ? 0 : heroAthanMarker;
  const effectiveHeroJamaatMarker = isEidHeroWindow ? null : heroJamaatMarker;
  const effectiveHeroEndMarker = isEidHeroWindow ? null : heroEndMarker;
  const effectiveHeroMidMarker = isEidHeroWindow ? null : heroMidMarker;
  const effectiveHeroGradientColors: readonly [string, string] = nightMode
    ? ['#1B4D38', '#0D3527']
    : ['#2D8B5F', '#1D6B45'];
  const heroScheduleStrip = React.useMemo(() => {
    const sections: { label: string; items: string[] }[] = [];

    if (shouldShowEidInfoLine) {
      sections.push({
        label: activeEidType === 'eid_al_adha' ? 'Eid ul Adha Times' : 'Eid Times',
        items: resolvedEidJamaats,
      });
    }

    if (shouldShowFridayJumuahNote) {
      sections.push({
        label: 'Jummah Times',
        items: [jj1, jj2],
      });
    }

    return sections.length > 0 ? sections : null;
  }, [shouldShowEidInfoLine, activeEidType, resolvedEidJamaats, shouldShowFridayJumuahNote, jj1, jj2]);

  const canTrackJamaatJourney = !!(
    activePrayer
    && currentPrayerIqamah
    && !isEidHeroWindow
    && !isFridayPostZawaal
    && !isSpecialHeroPhase
    && !hasExplicitHeroMidEvent
  );
  const heroTimelineState = usePrayerTimelineState({
    activePrayer,
    currentTime,
    currentPrayerIqamah,
    activePrayerEndDate: nextInfo?.prayer.timeDate ?? null,
    effectiveHeroCountdownInfo,
    effectiveHeroStartLabel,
    effectiveHeroStartTime,
    effectiveHeroMidLabel,
    effectiveHeroMidTime,
    effectiveHeroEndLabel,
    effectiveHeroEndTime,
    effectiveHeroShowJamaat,
    effectiveHeroJamaatValue,
    effectiveHeroProgress,
    canTrackJamaatJourney,
  });

  // Calendar face removed: timetable now in drawer only

  const backClock = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const backGregorian = currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const hijriYear = effectiveHijriLabel.match(/\b(\d{4})\b/)?.[1] ?? '';
  const backHijri = [hijriDayNum, rawHijriMonthName, hijriYear ? `${hijriYear} AH` : ''].filter(Boolean).join(' ');
  const headerDateLine = `${backGregorian} • ${backHijri || 'Hijri date loading...'}`;
  const drawerDateLine = `${currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })} | ${hijriDayNum || '--'} ${rawHijriMonthName || 'Hijri'}`;

  // Row-state priority keeps one clear focus for elders: current > next > past/future.
  const drawerPrayerRows = React.useMemo(() => buildPrayerDrawerRows({
    prayers: data?.prayers,
    now: currentTime,
    currentPrayerName: activePrayer?.name,
    nextPrayerName: effectiveNextPrayerName,
  }), [data?.prayers, currentTime, activePrayer?.name, effectiveNextPrayerName]);

  const effectiveHeroImageOpacity = getHeroImageOpacity(currentTime.getHours(), effectiveHeroPrayerName, !!forbiddenInfo);
  const { currentSkySource, nextSkySource, nextSkyOpacity } = useSkyBackgroundCycle();

  // Keep these computed hero fields alive while the new visual shell still relies on legacy prayer-state logic.
  const heroLegacyState = {
    SCREEN_WIDTH,
    alertMode,
    effectiveHeroStartLabel,
    effectiveHeroStartTime,
    effectiveHeroEndTime,
    effectiveHeroShowJamaat,
    isEidHero,
    effectiveHeroProgress,
    effectiveHeroTimelinePoints,
    effectiveHeroAthanMarker,
    effectiveHeroJamaatMarker,
    effectiveHeroEndMarker,
    effectiveHeroMidMarker,
    effectiveHeroImageOpacity,
  };
  void heroLegacyState;

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshPrayerTimes(), loadSunnahReminders()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPrayerTimes, loadSunnahReminders]);

  const startDonationCheckout = useCallback(async (priceSlot: 1 | 2) => {
    if (donationLoading) return;

    try {
      setDonationLoading(true);
      setDonationStatusMessage('Preparing secure checkout...');
      setShowDonationOptions(false);

      const checkoutUrl = await createDonationCheckoutUrl(priceSlot);

      if (Platform.OS === 'web') {
        setShowDonationOptions(true);
        setDonationStatusMessage('Embedded Stripe checkout is only available in the mobile app. Use Android or iPhone for in-app payment.');
        return;
      }

      setDonationStatusMessage(null);
      setDonationCheckoutUrl(checkoutUrl);
    } catch (error) {
      console.error('[Donate] error:', error);
      const message = error instanceof Error ? error.message : String(error);
      setDonationStatusMessage(message);
      Alert.alert('Donation error', message);
      setShowDonationOptions(true);
    } finally {
      setDonationLoading(false);
    }
  }, [donationLoading]);

  const openDonationCheckout = useCallback(() => {
    setDonationCheckoutUrl(null);
    setShowDonationOptions(true);
    setDonationStatusMessage(null);
    setDonationModalVisible(true);
  }, []);

  const openPrayerDrawer = useCallback(() => {
    if (Platform.OS === 'web') {
      setWebPrayerDrawerVisible(true);
      return;
    }
    prayerSheetRef.current?.snapToIndex(0);
  }, []);

  const closePrayerDrawer = useCallback(() => {
    if (Platform.OS === 'web') {
      setWebPrayerDrawerVisible(false);
      return;
    }
    prayerSheetRef.current?.close();
  }, []);

  const openPreviewShortcut = useCallback((target: 'home' | 'eid' | 'eid-jumuah' | 'eid-adha' | 'eid-adha-jumuah') => {
    if (target === 'home') {
      router.push('/(tabs)' as any);
      return;
    }

    if (target === 'eid') {
      router.push('/live-home-preview-eid' as any);
      return;
    }

    if (target === 'eid-adha') {
      router.push('/live-home-preview-eid-adha' as any);
      return;
    }

    if (target === 'eid-adha-jumuah') {
      router.push('/live-home-preview-eid-adha-jumuah' as any);
      return;
    }

    router.push('/live-home-preview-eid-jumuah' as any);
  }, [router]);

  const openPrayerCalendar = useCallback(() => {
    closePrayerDrawer();
    router.push('/(tabs)/prayer');
  }, [closePrayerDrawer, router]);

  return (
    <>
    <ScrollView
      style={[styles.container, N && { backgroundColor: N.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onPullRefresh}
          tintColor={N ? N.accent : Colors.primary}
        />
      }
    >
      {/* New Home layout: image-2 inspired editorial stack */}
      <View style={[styles.heroHeader, { paddingTop: insets.top + 10 }]}> 
        <Image
          source={currentSkySource ?? PRAYER_BG_IMAGES[effectiveHeroImageKey] ?? PRAYER_BG_IMAGES['Dhuhr']}
          style={[StyleSheet.absoluteFillObject, { opacity: effectiveHeroImageOpacity }]}
          contentFit="cover"
        />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: nextSkyOpacity }]}> 
          <Image
            source={nextSkySource ?? PRAYER_BG_IMAGES[effectiveHeroImageKey] ?? PRAYER_BG_IMAGES['Dhuhr']}
            style={[StyleSheet.absoluteFillObject, { opacity: effectiveHeroImageOpacity }]}
            contentFit="cover"
          />
        </Animated.View>
        <LinearGradient
          pointerEvents="none"
          colors={N
            ? [HERO_DESIGN_TOKENS.overlayMedium, HERO_DESIGN_TOKENS.overlayStrong]
            : [HERO_DESIGN_TOKENS.overlayLight, HERO_DESIGN_TOKENS.overlayStrong]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.topNav}>
          <View style={styles.topNavBrand}>
            <Image
              source={require('@/assets/images/masjid-logo.png')}
              style={styles.topNavLogo}
              contentFit="contain"
            />
            <View style={styles.topNavText}>
              <Text numberOfLines={1} style={styles.topNavName}>Jami&apos; Masjid Noorani</Text>
              <Text style={styles.topNavCity}>Halifax, UK</Text>
              <Text style={styles.topNavDateLine} numberOfLines={1}>{headerDateLine}</Text>
            </View>
          </View>
          <Text style={styles.topNavUpdated}>{backClock}</Text>
        </View>

        {/* ── 3-part hero composition: live prayer + support cards ─────── */}
        <View style={heroNewStyles.heroInnerWrap}>
          <LinearGradient
            colors={effectiveHeroGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={heroNewStyles.heroGradient}
          >
            {/* Main Live Prayer Section */}
            <View style={heroNewStyles.mainSection}>
              <HeroPrayerStatus
                prayerName={effectiveHeroPrayerName}
                stateLabel={heroTimelineState.stateLabel}
                countdownText={heroTimelineState.countdownText}
                scheduleStrip={heroScheduleStrip}
              />
              <HeroPrayerTimeline
                progress={heroTimelineState.progress}
                startTimeText={heroTimelineState.startTimeText}
                jamaatTimeText={heroTimelineState.jamaatTimeText}
                endTimeText={heroTimelineState.endTimeText}
                startLabel={heroTimelineState.startLabel}
                jamaatLabel={heroTimelineState.jamaatLabel}
                endLabel={heroTimelineState.endLabel}
                showJamaatAnchor={heroTimelineState.showJamaatAnchor}
                nightMode={nightMode}
                pulseMarker={heroTimelineState.pulseMarker}
                timelinePoints={effectiveHeroTimelinePoints}
              />
            </View>

            {/* Hairline separator */}
            <View style={heroNewStyles.separator} />

            {/* Donation Card — full width */}
            <HeroDonationCard nightMode={nightMode} onPress={openDonationCheckout} />
          </LinearGradient>
        </View>
      </View>

      <PrayerDrawerTrigger nightMode={nightMode} onPress={openPrayerDrawer} />

      {showPreviewShortcuts ? (
        <View style={styles.previewShortcutWrap}>
          <Text style={styles.previewShortcutTitle}>Preview Hero</Text>
          <View style={styles.previewShortcutRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openPreviewShortcut('home')}
              style={[
                styles.previewShortcutBtn,
                !previewOverride && styles.previewShortcutBtnActive,
              ]}
            >
              <Text style={[
                styles.previewShortcutBtnText,
                !previewOverride && styles.previewShortcutBtnTextActive,
              ]}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openPreviewShortcut('eid')}
              style={[
                styles.previewShortcutBtn,
                previewOverride?.scenario === 'eid-fitr' && styles.previewShortcutBtnActive,
              ]}
            >
              <Text style={[
                styles.previewShortcutBtnText,
                previewOverride?.scenario === 'eid-fitr' && styles.previewShortcutBtnTextActive,
              ]}>Eid</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openPreviewShortcut('eid-jumuah')}
              style={[
                styles.previewShortcutBtn,
                previewOverride?.scenario === 'eid-fitr-jumuah' && styles.previewShortcutBtnActive,
              ]}
            >
              <Text style={[
                styles.previewShortcutBtnText,
                previewOverride?.scenario === 'eid-fitr-jumuah' && styles.previewShortcutBtnTextActive,
              ]}>Eid + Jummah</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openPreviewShortcut('eid-adha')}
              style={[
                styles.previewShortcutBtn,
                previewOverride?.scenario === 'eid-adha' && styles.previewShortcutBtnActive,
              ]}
            >
              <Text style={[
                styles.previewShortcutBtnText,
                previewOverride?.scenario === 'eid-adha' && styles.previewShortcutBtnTextActive,
              ]}>Adha</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openPreviewShortcut('eid-adha-jumuah')}
              style={[
                styles.previewShortcutBtn,
                previewOverride?.scenario === 'eid-adha-jumuah' && styles.previewShortcutBtnActive,
              ]}
            >
              <Text style={[
                styles.previewShortcutBtnText,
                previewOverride?.scenario === 'eid-adha-jumuah' && styles.previewShortcutBtnTextActive,
              ]}>Adha + Jummah</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <HeroToDaySectionBridge nightMode={nightMode} />

      <View style={[styles.dayCanvas, N && { backgroundColor: N.bg, marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
        <View style={styles.dayCanvasContent}>
          <View style={[styles.body, N && { backgroundColor: 'transparent' }]}> 
            <Text style={[styles.sectionTitle, N && { color: N.text }]}>Quick Access</Text>
            <View style={styles.quickLinks}>
              {[
                { icon: 'campaign', label: 'Events & News', route: '/(tabs)/events' },
                { icon: 'help-outline', label: 'How To Pray', route: '/(tabs)/howto' },
              ].map(item => (
                <QuickLinkCard key={item.label} icon={item.icon} label={item.label} route={item.route} nightMode={nightMode} />
              ))}
            </View>

            <View style={styles.forYouFadeZone}>
              <ForYouTodaySection
                prayers={data?.prayers ?? []}
                nightMode={nightMode}
                currentTime={currentTime}
                hijriDay={hijriDayInt}
                todaySunnah={computedTodaySunnah}
              />
            </View>

            <View style={[styles.hadithCard, styles.hadithCardInBody, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
              <Text style={[styles.hadithKicker, N && { color: N.accentSoft }]}>Sunnah Reminder</Text>
              {!!computedTodaySunnah.act && (
                <Text style={[styles.hadithBody, N && { color: N.text }]} numberOfLines={2}>{computedTodaySunnah.act}</Text>
              )}
              {!!computedTodaySunnah.ref ? (
                <Text style={[styles.hadithRef, N && { color: N.textSub }]} numberOfLines={1}>- {computedTodaySunnah.ref}</Text>
              ) : null}
              <View style={styles.hadithDots}>
                <View style={[styles.hadithDot, styles.hadithDotActive, N && { backgroundColor: N.accent }]} />
                <View style={[styles.hadithDot, N && { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
                <View style={[styles.hadithDot, N && { backgroundColor: 'rgba(255,255,255,0.22)' }]} />
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, N && { color: N.text }]}>Community Updates</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
                <Text style={[styles.seeAll, N && { color: N.accent }]}>See All</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/events')}
              activeOpacity={0.85}
              style={[
                styles.eventsAnnouncementsCard,
                N && {
                  backgroundColor: N.surface,
                  borderColor: N.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.25,
                  shadowRadius: 14,
                  elevation: 6,
                },
              ]}
            >
              <View style={styles.eaCardInner}>
                <View style={[styles.eaIconBox, N && { backgroundColor: N.accentGlow }]}>
                  <MaterialIcons name="campaign" size={26} color={N ? N.accent : Colors.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.eaTitle, N && { color: N.text }]}>Masjid Events & News</Text>
                  <Text style={[styles.eaBody, N && { color: N.textSub }]}>Latest announcements, upcoming events, and community updates.</Text>
                  {MOCK_ANNOUNCEMENTS.length > 0 ? (
                    <View style={[styles.eaLatestBand, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
                      <MaterialIcons name="fiber-manual-record" size={8} color={N ? N.accent : Colors.primary} />
                      <Text style={[styles.eaLatestText, N && { color: N.textSub }]} numberOfLines={1}>
                        {MOCK_ANNOUNCEMENTS[0].title}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <MaterialIcons name="chevron-right" size={22} color={N ? N.textMuted : Colors.textSubtle} />
              </View>
            </TouchableOpacity>

            <View style={{ height: Spacing.xl }} />
          </View>
        </View>
      </View>
    </ScrollView>

    <PrayerDrawerSheet
      bottomSheetRef={prayerSheetRef}
      rows={drawerPrayerRows}
      dateLine={drawerDateLine}
      nightMode={nightMode}
      bottomInset={insets.bottom}
      onOpenCalendar={openPrayerCalendar}
      onIndexChange={() => {}}
      webVisible={webPrayerDrawerVisible}
      onWebClose={closePrayerDrawer}
    />

    <Modal
      visible={donationModalVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        setDonationModalVisible(false);
        setDonationCheckoutUrl(null);
        setShowDonationOptions(true);
        setDonationStatusMessage(null);
      }}
    >
      <View style={styles.donationModalRoot}>
        <View style={styles.donationModalHeader}>
          <Text style={styles.donationModalTitle}>Secure Donation</Text>
          <TouchableOpacity
            onPress={() => {
              setDonationModalVisible(false);
              setDonationCheckoutUrl(null);
              setShowDonationOptions(true);
              setDonationStatusMessage(null);
            }}
            style={styles.donationModalCloseBtn}
            activeOpacity={0.85}
          >
            <MaterialIcons name="close" size={20} color="#123524" />
            <Text style={styles.donationModalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>

        {showDonationOptions ? (
          <View style={styles.donationOptionsWrap}>
            <Text style={styles.donationOptionsTitle}>Choose Donation Type</Text>

            {Platform.OS === 'web' ? (
              <View style={styles.donationWebNotice}>
                <Text style={styles.donationWebNoticeText}>
                  In-app Stripe checkout is only supported in the mobile app. Web cannot embed Stripe Checkout.
                </Text>
              </View>
            ) : null}

            {donationStatusMessage ? (
              <View style={styles.donationStatusNotice}>
                <Text style={styles.donationStatusNoticeText}>{donationStatusMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.donationOptionBtn}
              activeOpacity={0.9}
              onPress={() => startDonationCheckout(1)}
              disabled={donationLoading}
            >
              <Text style={styles.donationOptionTitle}>Masjid Donation</Text>
              <Text style={styles.donationOptionSub}>General donation for the masjid.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.donationOptionBtn}
              activeOpacity={0.9}
              onPress={() => startDonationCheckout(2)}
              disabled={donationLoading}
            >
              <Text style={styles.donationOptionTitle}>Project Donation</Text>
              <Text style={styles.donationOptionSub}>Donate to the additional project fund.</Text>
            </TouchableOpacity>

            {donationLoading ? (
              <View style={{ marginTop: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0B6B45" />
                <Text style={styles.donationWebviewLoadingText}>Preparing checkout...</Text>
              </View>
            ) : null}
          </View>
        ) : donationCheckoutUrl ? (
          <WebView
            source={{ uri: donationCheckoutUrl }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.donationWebviewLoadingOverlay}>
                <ActivityIndicator size="large" color="#0B6B45" />
                <Text style={styles.donationWebviewLoadingText}>Opening Stripe checkout...</Text>
              </View>
            )}
            onShouldStartLoadWithRequest={(request) => {
              if (request.url.includes('jmn://donation-success') || request.url.startsWith('jmn://donation-success')) {
                setDonationModalVisible(false);
                setDonationCheckoutUrl(null);
                setShowDonationOptions(true);
                setDonationStatusMessage(null);
                Alert.alert('JazakAllahu Khayran', 'Your donation was successful. May Allah accept it from you.');
                return false;
              }
              if (request.url.includes('jmn://donation-cancel') || request.url.startsWith('jmn://donation-cancel')) {
                setDonationModalVisible(false);
                setDonationCheckoutUrl(null);
                setShowDonationOptions(true);
                setDonationStatusMessage(null);
                return false;
              }
              return true;
            }}
            onError={() => {
              Alert.alert('Checkout error', 'Unable to load Stripe checkout. Please try again.');
            }}
          />
        ) : (
          <View style={styles.donationWebviewLoadingOverlay}>
            <ActivityIndicator size="large" color="#0B6B45" />
          </View>
        )}
      </View>
    </Modal>

    </>
  );
}

// ── Hero inner gradient card styles ──────────────────────────────────────
const heroNewStyles = StyleSheet.create({
  heroInnerWrap: {
    marginHorizontal: Spacing.md,
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#021F35',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 26,
    elevation: 7,
  },
  heroGradient: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
  },
  mainSection: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: HERO_DESIGN_TOKENS.mintSoft,
    marginBottom: 2,
  },
  clockText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    color: HERO_DESIGN_TOKENS.textPrimary,
    fontVariant: ['tabular-nums'] as any,
  },
  dateText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: HERO_DESIGN_TOKENS.textSecondary,
  },
  hijriText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    color: HERO_DESIGN_TOKENS.textTertiary,
  },
  prayerName: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    color: HERO_DESIGN_TOKENS.textPrimary,
  },
  elegantCountdown: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 48,
    lineHeight: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: -0.5,
  },
  countdownLabel: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: HERO_DESIGN_TOKENS.textSecondary,
  },
  jamaatText: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#CFE8FA',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  supportRow: {
    flexDirection: 'row',
    gap: 10,
  },
});

const heroTimelineStyles = StyleSheet.create({
  statusBlock: {
    width: '100%',
    alignItems: 'center',
  },
  prayerName: {
    textAlign: 'center',
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    color: HERO_DESIGN_TOKENS.textPrimary,
  },
  stateLabel: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: HERO_DESIGN_TOKENS.mintSoft,
  },
  stateLabelSoon: {
    color: '#F6E6B4',
  },
  stateLabelNow: {
    color: '#FFE8A6',
  },
  countdownText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: -0.7,
  },
  scheduleStrip: {
    width: '100%',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(7,13,28,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 8,
  },
  scheduleStripCompact: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  scheduleSection: {
    gap: 8,
  },
  scheduleSectionCompact: {
    gap: 6,
  },
  scheduleSectionWithDivider: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  scheduleSectionWithDividerCompact: {
    paddingTop: 6,
  },
  scheduleStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  scheduleStripLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: '#F8E7B2',
  },
  scheduleStripLabelCompact: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.7,
  },
  scheduleStripTimes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleStripScrollViewport: {
    width: '100%',
    overflow: 'hidden',
  },
  scheduleStripScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  scheduleStripTimePill: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  scheduleStripTimeOrder: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
  },
  scheduleStripTimeOrderCompact: {
    fontSize: 9,
  },
  scheduleStripTimeValue: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'] as any,
  },
  scheduleStripTimeValueCompact: {
    fontSize: 14,
    lineHeight: 16,
  },
  scheduleStripDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: 6,
  },
  timelineBlock: {
    width: '100%',
    marginTop: 14,
  },
  trackShell: {
    paddingHorizontal: 6,
  },
  trackRail: {
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  trackLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  trackLineNight: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(235,246,239,0.48)',
  },
  anchorDot: {
    position: 'absolute',
    left: 0,
    top: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -4,
    backgroundColor: 'rgba(255,255,255,0.72)',
    zIndex: 2,
  },
  anchorDotMiddle: {
    left: '50%',
    marginLeft: -4,
  },
  anchorDotRight: {
    left: undefined,
    right: 0,
  },
  anchorDotEnd: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: -5,
    right: -1,
    backgroundColor: '#F8FCFF',
    borderWidth: 2,
    borderColor: 'rgba(14,73,52,0.65)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 4,
  },
  dynamicTimelineDot: {
    position: 'absolute',
    top: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -4,
    marginLeft: -4,
    backgroundColor: '#F8E7AE',
    borderWidth: 1,
    borderColor: 'rgba(86,60,4,0.60)',
    zIndex: 2,
  },
  markerPosition: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -(HERO_LOGO_MARKER_SIZE / 2),
    zIndex: 3,
  },
  markerOuter: {
    width: HERO_LOGO_MARKER_SIZE,
    height: HERO_LOGO_MARKER_SIZE,
    borderRadius: HERO_LOGO_MARKER_SIZE / 2,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#071019',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },
  markerOuterNight: {
    shadowOpacity: 0.3,
  },
  markerOuterPulse: {
    shadowOpacity: 0.38,
    shadowRadius: 8,
  },
  markerImage: {
    width: 24,
    height: 24,
  },
  anchorTimesRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  anchorTimeText: {
    fontSize: 13,
    fontWeight: '800',
    color: HERO_DESIGN_TOKENS.textPrimary,
    fontVariant: ['tabular-nums'] as any,
  },
  anchorTimeTextCenter: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -24 }],
    width: 48,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: HERO_DESIGN_TOKENS.textPrimary,
    fontVariant: ['tabular-nums'] as any,
  },
  dynamicAnchorTimeText: {
    position: 'absolute',
    transform: [{ translateX: -24 }],
    width: 48,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    color: HERO_DESIGN_TOKENS.textPrimary,
    fontVariant: ['tabular-nums'] as any,
  },
  anchorLabelsRow: {
    marginTop: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  anchorLabelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
    color: HERO_DESIGN_TOKENS.textTertiary,
  },
  dynamicAnchorLabelText: {
    position: 'absolute',
    transform: [{ translateX: -30 }],
    width: 60,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: HERO_DESIGN_TOKENS.textTertiary,
  },
  anchorLabelTextCenter: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -28 }],
    width: 56,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
    color: HERO_DESIGN_TOKENS.textTertiary,
  },
});

// ── Hero support card styles ──────────────────────────────────────────────
const heroSupportStyles = StyleSheet.create({
  card: {
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: 'rgba(2,12,8,0.42)',
    marginHorizontal: -18,
    marginBottom: -14,
    height: 110,
  },
  salahCard: {
    backgroundColor: '#F3F7F5',
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,73,51,0.08)',
  },
  donateInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  donateSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  donateSectionLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(212,175,55,0.92)',
  },
  donatePhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  donatePhotoTextBlock: {
    flex: 1,
    gap: 2,
  },
  donatePhotoEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: '#E8D48B',
  },
  donatePhotoLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  donateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  donateTextBlock: {
    flex: 1,
    gap: 2,
  },
  donateLogoRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.70)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  donateLogoImg: {
    width: 24,
    height: 24,
  },
  donateEyebrow: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(212,175,55,0.85)',
  },
  donateName: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.90)',
    lineHeight: 14,
  },
  donateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  donateBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0B3B2C',
    letterSpacing: 0.2,
  },
  dynamicInner: {
    flex: 1,
    padding: 11,
    gap: 4,
    justifyContent: 'space-between',
  },
  dynamicIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dynamicEyebrow: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: HERO_DESIGN_TOKENS.mintSoft,
  },
  salahEyebrow: {
    color: '#2B7A57',
  },
  adhaEyebrow: {
    color: '#B78103',
  },
  dynamicTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: HERO_DESIGN_TOKENS.textPrimary,
    lineHeight: 16,
  },
  adhaTitle: {
    color: '#18392B',
  },
  salahTitle: {
    color: '#18392B',
  },
  dynamicSub: {
    fontSize: 10,
    fontWeight: '600',
    color: HERO_DESIGN_TOKENS.textTertiary,
    lineHeight: 13,
  },
  adhaSub: {
    color: '#5C4A15',
  },
  dynamicViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(164,242,160,0.16)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(164,242,160,0.26)',
  },
  salahViewBtn: {
    backgroundColor: '#E6F0EB',
    borderColor: 'rgba(43,122,87,0.18)',
  },
  dynamicViewBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: HERO_DESIGN_TOKENS.mintSoft,
    letterSpacing: 0.3,
  },
  salahViewBtnText: {
    color: '#2B7A57',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F7F5' },
  content: { paddingBottom: Spacing.xl, backgroundColor: '#F3F7F5' },
  donationModalRoot: {
    flex: 1,
    backgroundColor: '#F4F9F6',
  },
  donationModalHeader: {
    paddingTop: 54,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(9,52,31,0.15)',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donationModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A2A1B',
    letterSpacing: 0.2,
  },
  donationModalCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#E6F3EC',
  },
  donationModalCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#123524',
  },
  donationWebviewLoadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F4F9F6',
  },
  donationWebviewLoadingText: {
    fontSize: 14,
    color: '#2C4A3D',
    fontWeight: '600',
  },
  donationOptionsWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  donationOptionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0A2A1B',
    marginBottom: 10,
  },
  donationWalletTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F3C28',
    marginBottom: 8,
  },
  donationWalletRow: {
    gap: 8,
    marginBottom: 14,
  },
  donationWalletBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(9,52,31,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  donationWalletBtnActive: {
    borderColor: '#0B6B45',
    backgroundColor: '#EAF4EE',
  },
  donationWalletBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#123524',
  },
  donationWalletBtnTitleActive: {
    color: '#0B6B45',
  },
  donationWalletBtnSub: {
    marginTop: 3,
    fontSize: 11,
    color: '#4F6D5E',
  },
  donationWalletBtnSubActive: {
    color: '#2C5A44',
  },
  donationWebNotice: {
    backgroundColor: '#FFF7E8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0D8A8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  donationWebNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6A4A11',
    fontWeight: '600',
  },
  donationStatusNotice: {
    backgroundColor: '#EAF4EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(11,107,69,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  donationStatusNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#29533F',
    fontWeight: '600',
  },
  donationOptionBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(9,52,31,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  donationOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#123524',
  },
  donationOptionSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#466858',
  },
  heroHeader: {
    paddingBottom: 0,
    overflow: 'hidden',
    backgroundColor: '#0E2E52',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  dayCanvas: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E8EEEA',
    marginTop: 0,
    paddingTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  dayCanvasAtmosphere: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 640,
  },
  dayCanvasFade: {
    ...StyleSheet.absoluteFillObject,
  },
  dayCanvasTint: {
    ...StyleSheet.absoluteFillObject,
  },
  dayCanvasGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  dayCanvasContent: {
    position: 'relative',
    zIndex: 1,
    paddingTop: 0,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: 'rgba(5,18,14,0.16)',
  },
  topNavBrand: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  topNavLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  topNavText: {
    flex: 1,
    paddingTop: 1,
  },
  topNavName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  topNavCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  topNavCityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  topNavCity: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(242,247,255,0.88)',
    letterSpacing: 0.2,
  },
  topNavDateLine: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    color: 'rgba(233,240,235,0.84)',
    letterSpacing: 0.1,
  },
  topNavUpdated: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: 0.3,
    marginLeft: 10,
    marginTop: 2,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modePill: {
    height: 34,
    borderRadius: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.13)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modePillText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  notifBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  updatedPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  updatedPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroUnifiedEntity: {
    marginHorizontal: Spacing.md,
    marginTop: 8,
    marginBottom: 0,
    gap: 14,
    borderRadius: Radius.lg,
    overflow: 'visible',
  },
  hadithCard: {
    marginHorizontal: Spacing.md,
    marginTop: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(250,252,252,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(17,53,39,0.12)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#003C28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 2,
  },
  hadithCardInBody: {
    marginHorizontal: 0,
    marginTop: 8,
    marginBottom: 12,
  },
  hadithKicker: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0E7A5F',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  hadithBody: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
    color: '#1C2F27',
    fontWeight: '700',
  },
  hadithDots: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 6,
  },
  hadithDot: {
    marginBottom: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(28,47,39,0.22)',
  },
  hadithDotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },
  hadithRef: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSubtle,
    fontWeight: '600',
    textAlign: 'center',
  },
  prayerFlipShell: {
    width: '100%',
    borderRadius: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  prayerFlipFacesWrap: {
    height: Dimensions.get('window').height * 0.34,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  prayerFlipFace: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
  },
  prayerFlipLiveFace: {
    shadowColor: '#021F35',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 26,
    elevation: 7,
  },
  prayerFlipCalendarFace: {
    shadowColor: '#05253D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 6,
  },
  prayerFlipGradientFill: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 0,
  },
  prayerLiveContent: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 14,
  },
  prayerLivePrimaryBlock: {
    alignItems: 'center',
  },
  prayerLiveIconOrbit: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(228,238,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  prayerLiveEyebrow: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: HERO_DESIGN_TOKENS.mintSoft,
  },
  prayerLiveName: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    color: HERO_DESIGN_TOKENS.textPrimary,
  },
  prayerLiveCountdownRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 8,
  },
  prayerLiveCountdownRowCompact: {
    gap: 5,
  },
  prayerLiveCountdownUnit: {
    minWidth: 72,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(8,38,24,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(164,242,160,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerLiveCountdownUnitCompact: {
    minWidth: 62,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  prayerLiveCountdownUnitValue: {
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '900',
    color: HERO_DESIGN_TOKENS.textPrimary,
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: 0.4,
  },
  prayerLiveCountdownUnitValueCompact: {
    fontSize: 24,
    lineHeight: 27,
  },
  prayerLiveCountdownUnitLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: HERO_DESIGN_TOKENS.mintSoft,
  },
  prayerLiveCountdown: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'] as any,
  },
  prayerLiveLabel: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: HERO_DESIGN_TOKENS.textSecondary,
  },
  heroMainDateTimeWrap: {
    marginTop: 6,
    alignItems: 'center',
    gap: 1,
  },
  heroMainClockText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    color: HERO_DESIGN_TOKENS.textPrimary,
    fontVariant: ['tabular-nums'] as any,
  },
  heroMainSecondsText: {
    fontSize: 10,
    fontWeight: '700',
    color: HERO_DESIGN_TOKENS.mintSoft,
  },
  heroMainDateText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    color: HERO_DESIGN_TOKENS.textSecondary,
  },
  heroMainHijriText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    color: HERO_DESIGN_TOKENS.textTertiary,
  },
  prayerLiveJamaat: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#CFE8FA',
  },
  prayerCalendarTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prayerCalendarClock: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: '900',
    color: '#123D5D',
    fontVariant: ['tabular-nums'] as any,
  },
  prayerCalendarSeconds: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#3D6F90',
  },
  prayerCalendarOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(28,98,138,0.25)',
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  prayerCalendarOpenText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D5F87',
  },
  prayerCalendarDate: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A4461',
  },
  prayerCalendarHijri: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#43708C',
  },
  prayerCalendarList: {
    marginTop: 0,
    borderRadius: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(28,98,138,0.16)',
    backgroundColor: 'rgba(255,255,255,0.68)',
    gap: 5,
    flex: 1,
    width: '100%',
  },
  prayerCalendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28,98,138,0.2)',
    paddingBottom: 5,
    marginBottom: 2,
  },
  prayerCalendarHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#43708C',
  },
  prayerCalendarHeaderTime: {
    width: 58,
    textAlign: 'right',
  },
  prayerCalendarHeaderJamaat: {
    marginLeft: 10,
    width: 74,
    textAlign: 'right',
  },
  prayerCalendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  prayerCalendarRowNext: {
    backgroundColor: 'rgba(46,125,50,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(46,125,50,0.42)',
  },
  prayerCalendarRowNextNight: {
    backgroundColor: 'rgba(79,233,72,0.18)',
    borderColor: 'rgba(164,242,160,0.5)',
  },
  prayerCalendarNextText: {
    color: '#145A32',
  },
  prayerCalendarPrayer: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#0F354D',
  },
  prayerCalendarTime: {
    width: 58,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '800',
    color: '#113D59',
    fontVariant: ['tabular-nums'] as any,
  },
  prayerCalendarIqamah: {
    marginLeft: 10,
    width: 74,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '700',
    color: '#396C8A',
    fontVariant: ['tabular-nums'] as any,
  },
  rebuildHeroCard: {
    flex: 1,
    minHeight: 220,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(207,180,79,0.45)',
    shadowColor: '#061E13',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 5,
  },
  rebuildHeroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  rebuildHeroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rebuildHeroSub: {
    color: 'rgba(244,247,246,0.95)',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  rebuildHeroBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#D4AF37',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  rebuildHeroBtnText: {
    color: '#0B3B2C',
    fontSize: 13,
    fontWeight: '900',
  },
  calendarCard: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#1D7B44',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#003C28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
    justifyContent: 'space-between',
  },
  calendarCardCompact: {
    flex: 0,
    flexShrink: 0,
    width: SCREEN_WIDTH < 390 ? 126 : 138,
    height: SCREEN_WIDTH < 390 ? 126 : 138,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  calendarTime: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
    fontVariant: ['tabular-nums'] as any,
  },
  calendarAmpm: {
    fontSize: 11,
    color: '#C8F4D7',
    fontWeight: '700',
  },
  calendarSeconds: {
    marginTop: 2,
    fontSize: 14,
    color: '#D7F3E1',
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  calendarDay: {
    marginTop: 2,
    fontSize: 10,
    letterSpacing: 0.9,
    color: '#DFF4E6',
    fontWeight: '800',
  },
  calendarHijri: {
    marginTop: 8,
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '900',
    lineHeight: 43,
  },
  calendarDate: {
    marginTop: 1,
    fontSize: 13,
    color: '#E2F7EA',
    fontWeight: '800',
  },
  openCalendarPill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openCalendarPillCompact: {
    width: '100%',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
    marginTop: 4,
  },
  openCalendarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  openCalendarTextCompact: {
    fontSize: 11,
  },
  liveCard: {
    flex: 0,
    minWidth: 0,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    minHeight: 276,
    shadowColor: '#003C28',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 6,
  },
  liveIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  liveKicker: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(219,234,254,0.92)',
    letterSpacing: 1.4,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  livePrayerName: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 40,
    lineHeight: 44,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  liveCountdown: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 64,
    lineHeight: 68,
    color: '#FFFFFF',
    fontWeight: '900',
    fontVariant: ['tabular-nums'] as any,
  },
  liveSub: {
    textAlign: 'center',
    marginTop: 3,
    fontSize: 14,
    color: 'rgba(229,241,255,0.9)',
    fontWeight: '700',
  },
  liveEndingSoonBadge: {
    marginTop: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,146,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,220,148,0.56)',
  },
  liveEndingSoonText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '800',
    color: '#FFF7E8',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  liveDivider: {
    marginTop: 14,
    marginBottom: 12,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  liveNextLine: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 30,
    color: '#EAF2FF',
    fontWeight: '800',
  },
  liveMetaLine: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 20,
    color: 'rgba(235,243,255,0.86)',
    fontWeight: '700',
  },
  actionRow: {
    marginTop: 14,
    marginHorizontal: Spacing.md,
    flexDirection: 'row',
    gap: 12,
  },
  actionTile: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    shadowColor: '#003C28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  actionTilePrimary: {
    backgroundColor: '#1E7D49',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  actionTileSecondary: {
    backgroundColor: '#FFFAEC',
    borderColor: 'rgba(176,133,14,0.32)',
  },
  actionTileTitleLight: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  actionTileSubLight: {
    marginTop: 2,
    color: '#CFF0DD',
    fontSize: 11,
    fontWeight: '600',
  },
  actionTileTitleDark: {
    marginTop: 8,
    color: '#362703',
    fontSize: 15,
    fontWeight: '800',
  },
  actionTileSubDark: {
    marginTop: 2,
    color: '#6A4E0A',
    fontSize: 11,
    fontWeight: '600',
  },
  navBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  notifBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#E53935',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFF' },
  nightLabel: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(180,210,255,0.35)',
    backgroundColor: 'rgba(8,16,34,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  nightLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(180,210,255,0.88)',
    letterSpacing: 0.3,
  },
  logoBrandArea: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  logoCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  infoRow: { flexDirection: 'row', gap: Spacing.sm, width: '100%', alignItems: 'stretch' },
  squareCard: {
    flex: 1,
    minHeight: 180,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  prayerSquare: { backgroundColor: Colors.accent },
  dayLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  squareTime: { fontSize: 22, fontWeight: '700', letterSpacing: 1, lineHeight: 26 },
  timeRight: { marginBottom: 2, alignItems: 'flex-start' },
  squareSec: { fontSize: 11, fontWeight: '600', lineHeight: 14 },
  squareAmpm: { fontSize: 10, fontWeight: '600', lineHeight: 12 },
  squareDivider: { height: 1, width: '80%', marginVertical: 4 },
  squareDivider2: { height: 1, width: '70%', backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 3 },
  squareDateG: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  squareDateM: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  calTapHint: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  calTapText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.3 },

  nextPrayerSquareLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2,
  },
  nextPrayerSquareName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 1 },
  nextTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  nextTimeSub: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.65)', width: 34 },
  nextTimeVal: { fontSize: 12, fontWeight: '700', color: '#fff' },
  nextTimeIqamah: { fontSize: 12, fontWeight: '800', color: '#69F0AE' },
  nextPrayerSquareCountdown: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  nextPrayerSquareCountdownSub: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },

  // ── Jumuah ──
  jumuahFridayCard: {
    marginHorizontal: Spacing.md, marginTop: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: '#FFD54F',
    padding: Spacing.md, gap: 10,
  },
  jumuahFridayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  jumuahFridayTitle: { fontSize: 16, fontWeight: '800', color: '#5D4037', flex: 1 },
  jumuahTodayBadge: { backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  jumuahTodayText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  jumuahSeasonLabel: { fontSize: 10, fontWeight: '700', color: '#8D6E0A', backgroundColor: '#FFD54F', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  jumuahTimesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#FFFDE7', borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 8 },
  jumuahTimeItem: { alignItems: 'center', flex: 1 },
  jumuahTimeOrder: { fontSize: 10, fontWeight: '600', color: '#8D6E0A', marginBottom: 3 },
  jumuahTimeValue: { fontSize: 15, fontWeight: '800', color: '#F9A825' },
  jumuahDividerV: { width: 1, height: 32, backgroundColor: '#FFD54F' },
  jumuahCountdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#FFD54F' },
  jumuahLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#43A047' },
  jumuahCountdownPhase: { fontSize: 12, fontWeight: '600', color: '#8D6E0A', flex: 1 },
  jumuahCountdownTime: { fontSize: 18, fontWeight: '800', color: '#F9A825', fontVariant: ['tabular-nums'] as any },
  jumuahDoneText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

  // ── Body ──
  body: { paddingHorizontal: Spacing.md, paddingTop: 14, backgroundColor: 'transparent' },
  forYouFadeZone: {
    position: 'relative',
    marginTop: 2,
    marginBottom: 2,
  },
  forYouFadeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.1,
    lineHeight: 36,
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: Spacing.sm,
  },
  previewShortcutWrap: {
    marginHorizontal: Spacing.md,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(8, 30, 22, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 69, 0.14)',
    gap: 8,
  },
  previewShortcutTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#2E5B49',
  },
  previewShortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewShortcutBtn: {
    minWidth: 88,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(13, 107, 69, 0.18)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  previewShortcutBtnActive: {
    backgroundColor: '#0D6B45',
    borderColor: '#0D6B45',
  },
  previewShortcutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#24503F',
  },
  previewShortcutBtnTextActive: {
    color: '#FFFFFF',
  },
  seeAll: { ...Typography.labelMedium, color: Colors.primary },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  quickAccessCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(17,73,51,0.12)',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#003C28',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 1,
  },
  quickAccessIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E7F4EC',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
  },
  quickAccessLabel: {
    fontSize: 16,
    color: '#1A2E24',
    fontWeight: '700',
    textAlign: 'center',
  },
  quickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md, justifyContent: 'space-between' },
  quickLinkCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    width: '100%', padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#0B5C3A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    paddingVertical: 16,
    borderBottomWidth: 3, borderBottomColor: Colors.primarySoft,
  },
  quickLinkIcon: {
    width: 52, height: 52, borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  quickLinkIconGlow: {
    shadowColor: '#4FE948',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 6,
  },
  quickLinkLabel: { ...Typography.labelMedium, color: Colors.textPrimary, textAlign: 'center', fontSize: 13, fontWeight: '700' },

  announcementCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  announcementImportant: { borderColor: Colors.primaryLight, borderLeftWidth: 4 },
  importantBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full, marginBottom: Spacing.xs,
  },
  importantText: { ...Typography.labelMedium, color: Colors.textInverse, fontSize: 10 },
  annTitle: { ...Typography.titleSmall, color: Colors.textPrimary, marginBottom: 4 },
  annBody: { ...Typography.bodyMedium, color: Colors.textSecondary, lineHeight: 22 },
  annDate: { ...Typography.bodySmall, color: Colors.textSubtle, marginTop: 6 },
  eventsAnnouncementsCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.sm,
    shadowColor: '#0B5C3A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  eaCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: Spacing.md,
  },
  eaIconBox: {
    width: 56, height: 56, borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  eaTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  eaBody: { fontSize: 12, fontWeight: '400', lineHeight: 17, color: Colors.textSecondary },
  eaLatestBand: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primarySoft, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 2,
  },
  eaLatestText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, flexShrink: 1 },
});

// ── Small Prayer Card Flip Styles ───────────────────────────────────────
const smallFlipStyles = StyleSheet.create({
  animView: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  face: { alignItems: 'center', justifyContent: 'center', gap: 3, width: '100%', flex: 1 },
  prayerIconRing: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 1,
  },
  donateTitle: { fontSize: 13, fontWeight: '800', textAlign: 'center', marginTop: 4, letterSpacing: 0.2 },
  donateSub: { fontSize: 10, fontWeight: '500', textAlign: 'center', lineHeight: 14, paddingHorizontal: 4 },
  donateBtnSmall: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginTop: 5,
  },
  donateBtnText: { fontSize: 10, fontWeight: '800', color: '#1A0F00' },
  dots: { flexDirection: 'row', gap: 4, paddingBottom: 6, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.30)' },
  dotActive: { backgroundColor: 'rgba(255,255,255,0.90)', width: 12 },
});

// ── Flip Card Styles ────────────────────────────────────────────────────
const flipCard = StyleSheet.create({
  animView: { width: '100%', flex: 1, alignItems: 'center', justifyContent: 'center' },
  face: { width: '100%', flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, gap: 3 },
  faceHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 1 },
  faceLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  bigQuote: { fontSize: 24, lineHeight: 26, opacity: 0.65, marginBottom: -4 },
  hadithBox: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, width: '100%' },
  hadithTextImproved: { fontSize: 12, fontWeight: '500', lineHeight: 19, fontStyle: 'italic', textAlign: 'center' },
  refDivider: { height: 1, width: 40, borderRadius: 1, marginVertical: 2 },
  hadithText: { fontSize: 11.5, fontWeight: '500', lineHeight: 17, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 6 },
  arabicText: { fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 22 } as any,
  translationText: { fontSize: 11, fontWeight: '500', lineHeight: 16, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 4 },
  refText: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 5, marginBottom: 12, alignItems: 'center', justifyContent: 'center', position: 'absolute', bottom: 0, left: 0, right: 0 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  sunnahActBox: {
    borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
    alignItems: 'center', marginVertical: 2,
    width: '100%',
  },
  sunnahAct: { fontSize: 12.5, fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },
  sunnahDetail: { fontSize: 10.5, fontWeight: '400', lineHeight: 15, textAlign: 'center', paddingHorizontal: 4, fontStyle: 'italic' },
  donateTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginTop: 6, letterSpacing: 0.2 },
  donateSubtitle: { fontSize: 11, fontWeight: '400', textAlign: 'center', lineHeight: 16, marginTop: 3, paddingHorizontal: 4 },
  donateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 8,
    marginTop: 6,
  },
  donateBtnText: { fontSize: 12, fontWeight: '800', color: '#1A0F00', letterSpacing: 0.3 },
});
