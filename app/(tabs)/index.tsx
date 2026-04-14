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
  Alert,
  Modal,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { useAlert } from '@/template';
import { formatCountdownSeconds, getNextPrayer, getPrayerTimesFromTimetable } from '@/services/prayerService';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { useNightMode } from '@/hooks/useNightMode';
import { MOCK_ANNOUNCEMENTS } from '@/services/eventsService';
import { fetchSunnahReminders, SunnahReminderRow } from '@/services/contentService';
import { fetchEidUlAdha } from '@/services/eidService';
import PrayerHeroCard from '@/components/prayer/PrayerHeroCard';
import { PRAYER_BG_IMAGES, PRAYER_GRADIENTS, PRAYER_ICONS } from '@/components/prayer/heroConfig';
import { buildHeroState } from '@/components/prayer/heroState';
import { buildActivePrayerState } from '@/components/prayer/activePrayerState';
import { createDonationCheckoutUrl } from '@/services/donationService';
import WebView from 'react-native-webview';


const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Time-of-day hero gradient ──────────────────────────────────────────────
function getHeroOverlayGradient(hour: number, nightMode: boolean): readonly [string, string] {
  if (nightMode) return ['rgba(4,7,22,0.90)', 'rgba(8,13,42,0.85)'] as const;
  if (hour >= 4  && hour < 6)  return ['rgba(55,15,90,0.68)',  'rgba(18,8,55,0.58)']  as const; // pre-dawn violet
  if (hour >= 6  && hour < 9)  return ['rgba(170,65,0,0.58)',  'rgba(120,35,0,0.48)'] as const; // sunrise amber
  if (hour >= 9  && hour < 12) return ['rgba(10,68,34,0.62)',  'rgba(5,44,18,0.52)']  as const; // morning emerald
  if (hour >= 12 && hour < 15) return ['rgba(8,48,110,0.62)',  'rgba(4,28,82,0.52)']  as const; // noon sapphire
  if (hour >= 15 && hour < 17) return ['rgba(140,54,0,0.62)',  'rgba(90,30,0,0.52)']  as const; // asr rust
  if (hour >= 17 && hour < 19) return ['rgba(110,18,65,0.68)', 'rgba(70,8,40,0.58)']  as const; // maghrib crimson
  if (hour >= 19 && hour < 21) return ['rgba(38,8,82,0.72)',   'rgba(18,4,62,0.62)']  as const; // isha indigo
  return ['rgba(4,10,38,0.82)', 'rgba(2,5,24,0.72)'] as const;                                   // night navy
}

function getHeroImageOpacity(hour: number, prayerName: string, isForbidden: boolean): number {
  if (isForbidden) return 0.64;
  if (prayerName === 'Fajr') return 0.9;
  if (prayerName === 'Sunrise' || prayerName === 'Ishraq') return 0.8;
  if (prayerName === 'Maghrib') return 0.85;
  if (prayerName === 'Isha') return 0.66;
  if (hour >= 22 || hour < 4) return 0.62;
  if (hour >= 17 && hour < 20) return 0.83;
  return 0.74;
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

function getHijriYear(hijri: string): string {
  const match = hijri.match(/\b(\d{4})\b/);
  return match ? match[1] : '';
}

/**
 * Builds a clean hijri label like "24 Shawwal 1447 AH".
 * Handles both Arabic timetable format (contains Arabic script)
 * and English DB format (e.g. "24 Shawwal 1447").
 */
function buildHijriLabel(hijri: string): string {
  if (!hijri || hijri === 'Date not available') return '';
  // Arabic format: contains Arabic Unicode characters
  if (/[\u0600-\u06FF]/.test(hijri)) {
    const day = getHijriDayNumber(hijri);
    const month = getHijriMonthEnglish(hijri);
    const year = getHijriYear(hijri);
    const parts = [day, month, year ? `${year} AH` : ''].filter(Boolean);
    return parts.join(' ');
  }
  // English format: already "24 Shawwal 1447" or "24 Shawwal 1447 AH"
  const withoutAH = hijri.replace(/\s*\bAH\b/gi, '').trim();
  if (withoutAH) return `${withoutAH} AH`;
  return hijri;
}

function buildEidJamaatNote(jamaatTimes: string[]): string {
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

// ── Daily Sunnah Reminders ────────────────────────────────────────────────
const SUNNAH_REMINDERS = [
  { act: "Pray 2 Sunnah before Fajr", detail: "The two rakaat before Fajr are better than the world and all it contains.", ref: "Sahih Muslim 725", icon: "wb-twilight" },
  { act: "Say Bismillah before eating", detail: "If you forget, say: Bismillah awwalahu wa akhirahu — at any point during the meal.", ref: "Abu Dawud 3767", icon: "restaurant" },
  { act: "Use the Miswak (or toothbrush)", detail: "The Prophet would use the Miswak upon waking, before prayer, and before reciting Quran.", ref: "Sahih al-Bukhari 245", icon: "self-improvement" },
  { act: "Recite Ayat al-Kursi after each prayer", detail: "Whoever recites it after every obligatory prayer, nothing prevents him from entering Paradise.", ref: "An-Nasai, Sahih chain", icon: "menu-book" },
  { act: "Say SubhanAllah 33x after prayer", detail: "Say SubhanAllah 33×, Alhamdulillah 33×, Allahu Akbar 34× after each prayer.", ref: "Sahih Muslim 597", icon: "loop" },
  { act: "Pray 4 Sunnah before Dhuhr", detail: "Whoever prays four before Dhuhr and four after, Allah forbids the Fire for him.", ref: "Tirmidhi 428", icon: "wb-sunny" },
  { act: "Visit the Masjid in congregation", detail: "The prayer in congregation is twenty-seven degrees superior to the prayer offered alone.", ref: "Sahih al-Bukhari 645", icon: "mosque" },
  { act: "Make Dhikr in the morning", detail: "Say: SubhanAllahi wa bihamdihi 100 times in the morning — all sins are forgiven.", ref: "Sahih al-Bukhari 6405", icon: "brightness-5" },
  // Al-Kahf moved to Friday-specific Jumuah card only
  { act: "Give Salaam first when entering", detail: "The best of the two people is the one who begins with the Salaam.", ref: "Tirmidhi 2694", icon: "waving-hand" },
  { act: "Pray 2 rakaat Tahiyyat al-Masjid", detail: "When any of you enters the Masjid, let him not sit until he prays two rakaat.", ref: "Sahih al-Bukhari 444", icon: "mosque" },
  { act: "Fast on Mondays and Thursdays", detail: "Deeds are presented to Allah on Mondays and Thursdays, so I love for my deeds to be presented while I am fasting.", ref: "Tirmidhi 747", icon: "no-food" },
  { act: "Give in charity, even if a little", detail: "Protect yourself from the Fire even with half a date. If you cannot, then with a good word.", ref: "Sahih al-Bukhari 1413", icon: "volunteer-activism" },
  { act: "Make Istighfar 100 times daily", detail: "The Prophet would seek Allah's forgiveness more than 70 times a day.", ref: "Sahih al-Bukhari 6307", icon: "refresh" },
  { act: "Pray Duha (Forenoon prayer)", detail: "Whoever prays Duha with 12 rakaat, Allah will build a palace of gold for him in Paradise.", ref: "Tirmidhi 473", icon: "flare" },
  { act: "Recite 3 Quls before sleeping", detail: "The Prophet would recite Surah Al-Ikhlas, Al-Falaq, and An-Nas and blow over his body before sleeping.", ref: "Sahih al-Bukhari 5017", icon: "nights-stay" },
  { act: "Make Du'a between Adhan and Iqamah", detail: "Du'a made between the Adhan and Iqamah is not rejected.", ref: "Tirmidhi 212", icon: "access-time" },
  { act: "Read Quran after Fajr", detail: "Recite the Quran at Fajr — indeed the recitation of Fajr is witnessed (by angels).", ref: "Al-Isra 17:78", icon: "wb-twilight" },
  { act: "Send Salawat upon the Prophet", detail: "Whoever sends blessings upon me once, Allah sends blessings upon him tenfold.", ref: "Sahih Muslim 408", icon: "star" },
  { act: "Keep ties of kinship", detail: "Whoever would like his provision to be expanded and his lifespan extended, let him maintain the ties of kinship.", ref: "Sahih al-Bukhari 5985", icon: "people" },
  { act: "Pray Witr before sleeping", detail: "Make Witr your last prayer at night.", ref: "Sahih al-Bukhari 998", icon: "bedtime" },
  { act: "Enter the Masjid with right foot", detail: "When entering the Masjid, step in with the right foot and say: Allahumma iftah li abwaba rahmatik.", ref: "Ibn Majah 771", icon: "login" },
];

const todayHadith  = HADITHS[DAY_OF_YEAR % HADITHS.length];
const todayVerse   = QURAN_VERSES[DAY_OF_YEAR % QURAN_VERSES.length];

const TICKER_MESSAGES = [
  '🕌  Jumuah Khutbah every Friday at 1:15 PM (BST) / 12:30 PM (GMT)',
  '📢  Masjid renovation update — new wudu area now open',
  '📖  Quran Tafseer circle every Sunday at 10:00 AM',
  '🤲  Volunteer drivers needed — contact the masjid office',
  '🌙  Sisters Halaqa resumes this Sunday — Topic: Gratitude in Islam',
];

const bannerStyles = StyleSheet.create({
  wrapper: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  labelBox: {
    minWidth: 92,
    height: '100%',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  labelText: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tickerArea: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tickerText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '600',
    paddingLeft: 8,
  },
});

// ── Flipping Logo Card ────────────────────────────────────────────────────


type CardFace = 'sunnah' | 'hadith' | 'verse';
const FACE_SEQUENCE: CardFace[] = ['sunnah', 'hadith', 'verse'];
const FACE_DURATION = 5000;
const CONTENT_HEIGHT = 148;

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

  const rotateY = rotateAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-90deg', '0deg', '90deg'] });
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
          <Animated.View style={[smallFlipStyles.animView, { transform: [{ rotateY }] }]}>
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
  const heightAnim  = useRef(new Animated.Value(CONTENT_HEIGHT)).current;

  const flipTo = useCallback((nextIndex: number) => {
    Animated.timing(rotateAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start(() => {
      setDisplayFace(FACE_SEQUENCE[nextIndex]);
      rotateAnim.setValue(-1);
      Animated.parallel([
        Animated.timing(rotateAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(heightAnim, { toValue: CONTENT_HEIGHT, duration: 300, useNativeDriver: false }),
      ]).start();
    });
  }, [rotateAnim, heightAnim]);

  useEffect(() => {
    const id = setInterval(() => {
      setFaceIndex(prev => { const next = (prev + 1) % FACE_SEQUENCE.length; flipTo(next); return next; });
    }, FACE_DURATION);
    return () => clearInterval(id);
  }, [flipTo]);

  const rotateY = rotateAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-90deg', '0deg', '90deg'] });

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
    <Animated.View style={[styles.logoCard, { height: heightAnim, backgroundColor: cardBg }]}>
      <Animated.View style={[flipCard.animView, { transform: [{ rotateY }] }]}>
        {renderFace()}
      </Animated.View>
      <View style={[flipCard.dots, { borderTopColor: borderC }]}>
        {FACE_SEQUENCE.map((_, i) => (
          <View key={i} style={[flipCard.dot, { backgroundColor: borderC }, i === faceIndex && { backgroundColor: nightMode ? '#69A8FF' : Colors.primary, width: 14 }]} />
        ))}
      </View>
    </Animated.View>
  );
}

// ── Rolling News Banner ─────────────────────────────────────────────────────
function RollingBanner({ nightMode }: { nightMode: boolean }) {
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const [msgIndex, setMsgIndex] = useState(0);

  const runTicker = useCallback(function tick(index: number) {
    translateX.setValue(SCREEN_WIDTH);
    Animated.timing(translateX, { toValue: -SCREEN_WIDTH * 1.8, duration: 9000, useNativeDriver: true })
      .start(({ finished }) => {
        if (finished) { const next = (index + 1) % TICKER_MESSAGES.length; setMsgIndex(next); tick(next); }
      });
  }, [translateX]);

  useEffect(() => { runTicker(0); return () => translateX.stopAnimation(); }, [runTicker, translateX]);

  const bgLabel = nightMode ? '#0D3A5C' : Colors.accent;
  const bgWrap  = nightMode ? '#0A2540' : Colors.accent;

  return (
    <View style={[bannerStyles.wrapper, { backgroundColor: bgWrap }]}>
      <View style={[bannerStyles.labelBox, { backgroundColor: bgLabel }]}>
        <MaterialIcons name="campaign" size={14} color={Colors.textInverse} />
        <Text style={bannerStyles.labelText}>NEWS</Text>
      </View>
      <View style={bannerStyles.tickerArea}>
        <Animated.Text numberOfLines={1} style={[bannerStyles.tickerText, { transform: [{ translateX }] }]}>
          {TICKER_MESSAGES[msgIndex]}
        </Animated.Text>
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
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

// ── Zawaal Section Row: Donation (rotating) + Daily Sunnah/Verse card ────
type RemFace = 'sunnah' | 'verse';
const REM_FACES: RemFace[] = ['sunnah', 'verse'];
const REM_DURATION = 5000;

function ZawaalSectionRow({ nightMode, todaySunnah, onDonatePress }: {
  nightMode: boolean;
  todaySunnah: SunnahEntry;
  onDonatePress: () => void;
}) {
  const N = nightMode ? NIGHT : null;

  // ── Sunnah/Verse flip (right card) ──────────────────────────────────
  const [faceIndex, setFaceIndex] = useState(0);
  const [displayFace, setDisplayFace] = useState<RemFace>('sunnah');
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const flipTo = useCallback((nextIndex: number) => {
    Animated.timing(rotateAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start(() => {
      setDisplayFace(REM_FACES[nextIndex]);
      rotateAnim.setValue(-1);
      Animated.timing(rotateAnim, { toValue: 0, duration: 320, useNativeDriver: true }).start();
    });
  }, [rotateAnim]);

  useEffect(() => {
    const id = setInterval(() => {
      setFaceIndex(prev => { const next = (prev + 1) % REM_FACES.length; flipTo(next); return next; });
    }, REM_DURATION);
    return () => clearInterval(id);
  }, [flipTo]);

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

  const rotateY = rotateAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-90deg', '0deg', '90deg'] });
  const sunnahColor = N ? NIGHT.accent : Colors.primary;
  const verseColor  = N ? '#4FE948'   : Colors.primary;
  const cardBg  = N ? NIGHT.surface     : '#FFFFFF';
  const borderC = N ? NIGHT.borderStrong : Colors.border;
  const textCol = N ? NIGHT.text         : Colors.textPrimary;
  const subCol  = N ? NIGHT.textSub      : Colors.textSubtle;

  return (
    <View style={zawaalRowStyles.row}>
      {/* ── Donation Card (rotates: info ↔ masjid photos) ───────────── */}
      <TouchableOpacity
        onPress={onDonatePress}
        style={zawaalRowStyles.donateCard}
        activeOpacity={0.85}
      >
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: donateOpacity }]}>
          {isDonateInfoFace ? (
            <View style={zawaalRowStyles.donateInfoFace}>
              <View style={zawaalRowStyles.donateIconRing}>
                <Image
                  source={require('../../assets/images/masjid-logo.png')}
                  style={zawaalRowStyles.donateLogoImg}
                  contentFit="contain"
                />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={zawaalRowStyles.donateProjectLabel}>PROJECT</Text>
                <Text style={zawaalRowStyles.donateProjectTitle}>Rebuild</Text>
              </View>
              <View style={zawaalRowStyles.donateDivider} />
              <Text style={zawaalRowStyles.donateName}>Jami{"'"} Masjid Noorani</Text>
              <Text style={zawaalRowStyles.donateLocation}>Halifax, UK</Text>
              <View style={zawaalRowStyles.donateBtn}>
                <MaterialIcons name="volunteer-activism" size={11} color="#0B3B2C" />
                <Text style={zawaalRowStyles.donateBtnText}>Donate Now</Text>
              </View>
            </View>
          ) : (
            <View style={StyleSheet.absoluteFillObject}>
              <Image
                source={MASJID_IMAGES[photoIndex]}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                blurRadius={7}
              />
              <Image
                source={MASJID_IMAGES[photoIndex]}
                style={StyleSheet.absoluteFillObject}
                contentFit="contain"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.72)']}
                start={{ x: 0, y: 0.45 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={zawaalRowStyles.photoOverlay}>
                <Text style={zawaalRowStyles.photoTitle}>Support the Rebuild</Text>
                <View style={zawaalRowStyles.photoBtn}>
                  <MaterialIcons name="volunteer-activism" size={10} color="#0B3B2C" />
                  <Text style={zawaalRowStyles.photoBtnText}>Donate →</Text>
                </View>
              </View>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* ── Sunnah / Verse flipping card ──────────────────────────────── */}
      <View style={[zawaalRowStyles.flipCard, { backgroundColor: cardBg, borderColor: borderC }]}>
        <Animated.View style={[zawaalRowStyles.flipCardInner, { transform: [{ rotateY }] }]}>
          {displayFace === 'sunnah' ? (
            <View style={zawaalRowStyles.flipFace}>
              <View style={zawaalRowStyles.flipHeader}>
                <MaterialIcons name="star" size={13} color={sunnahColor} />
                <Text style={[zawaalRowStyles.flipLabel, { color: sunnahColor }]}>Daily Sunnah</Text>
              </View>
              <View style={[zawaalRowStyles.flipActBox, { backgroundColor: sunnahColor + '15', borderColor: sunnahColor + '40' }]}>
                <Text style={[zawaalRowStyles.flipActText, { color: textCol }]} numberOfLines={2}>{todaySunnah.act}</Text>
              </View>
              <Text style={[zawaalRowStyles.flipDetailText, { color: subCol }]} numberOfLines={3}>{todaySunnah.detail}</Text>
              <Text style={[zawaalRowStyles.flipRef, { color: sunnahColor }]}>{todaySunnah.ref}</Text>
            </View>
          ) : (
            <View style={zawaalRowStyles.flipFace}>
              <View style={zawaalRowStyles.flipHeader}>
                <MaterialIcons name="menu-book" size={13} color={verseColor} />
                <Text style={[zawaalRowStyles.flipLabel, { color: verseColor }]}>Verse of the Day</Text>
              </View>
              <View style={[zawaalRowStyles.flipActBox, { backgroundColor: verseColor + '15', borderColor: verseColor + '40' }]}>
                <Text style={[zawaalRowStyles.arabicText, { color: verseColor }]} numberOfLines={2}>{todayVerse.arabic}</Text>
              </View>
              <Text style={[zawaalRowStyles.flipDetailText, { color: textCol }]} numberOfLines={3}>{todayVerse.translation}</Text>
              <Text style={[zawaalRowStyles.flipRef, { color: verseColor }]}>{todayVerse.ref}</Text>
            </View>
          )}
        </Animated.View>
        <View style={[zawaalRowStyles.dots, { borderTopColor: borderC }]}>
          {REM_FACES.map((_, i) => (
            <View
              key={i}
              style={[
                zawaalRowStyles.dot,
                { backgroundColor: borderC },
                i === faceIndex && { backgroundColor: N ? '#69A8FF' : Colors.primary, width: 14 },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}


const zawaalRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: Spacing.md,
    marginTop: 12,
    marginBottom: 2,
  },
  donateCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.38)',
    backgroundColor: '#0B3B2C',
    overflow: 'hidden',
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  donateInfoFace: {
    ...StyleSheet.absoluteFillObject,
    padding: 11,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donateIconRing: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: 'rgba(212,175,55,0.80)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  donateLogoImg: {
    width: 34, height: 34,
  },
  donateProjectLabel: {
    fontSize: 8, fontWeight: '900', color: 'rgba(212,175,55,0.75)',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  donateProjectTitle: {
    fontSize: 19, fontWeight: '900', color: '#E8D48B',
    textTransform: 'uppercase', lineHeight: 21,
  },
  donateDivider: {
    width: 38, height: 1.5, backgroundColor: 'rgba(212,175,55,0.35)', borderRadius: 1,
  },
  donateName: {
    fontSize: 9.5, fontWeight: '700', color: 'rgba(255,255,255,0.90)', textAlign: 'center',
  },
  donateLocation: {
    fontSize: 8.5, fontWeight: '500', color: 'rgba(255,255,255,0.50)', textAlign: 'center', marginTop: -3,
  },
  donateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#D4AF37',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    marginTop: 2,
  },
  donateBtnText: { fontSize: 10, fontWeight: '900', color: '#0B3B2C', letterSpacing: 0.2 },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 10, gap: 6, alignItems: 'center',
  },
  photoTitle: {
    fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#D4AF37', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  photoBtnText: { fontSize: 10, fontWeight: '900', color: '#0B3B2C' },
  flipCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  flipCardInner: { flex: 1 },
  flipFace: { padding: 11, gap: 5, flex: 1 },
  flipHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  flipLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, flex: 1 },
  flipActBox: {
    borderRadius: Radius.sm, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 5,
  },
  flipActText: { fontSize: 11, fontWeight: '700', lineHeight: 15 },
  flipDetailText: { fontSize: 10, fontWeight: '400', lineHeight: 14 },
  arabicText: {
    fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 19, letterSpacing: 0.3,
  },
  flipRef: { fontSize: 9, fontWeight: '700', marginTop: 1 },
  dots: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 7, borderTopWidth: 1,
  },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
function useCurrentTime() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
  return time;
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
export default function HomeScreen() {
  // DB-driven sunnah reminders
  const [dbSunnahs, setDbSunnahs] = useState<SunnahReminderRow[]>([]);
  const [eidUlAdhaJamaats, setEidUlAdhaJamaats] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [donationLoading, setDonationLoading] = useState(false);
  const [donationModalVisible, setDonationModalVisible] = useState(false);
  const [donationCheckoutUrl, setDonationCheckoutUrl] = useState<string | null>(null);
  const [showDonationOptions, setShowDonationOptions] = useState(true);
  const [donationStatusMessage, setDonationStatusMessage] = useState<string | null>(null);

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

    loadEidUlAdha();

    return () => {
      mounted = false;
    };
  }, []);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { nightMode } = useNightMode();
  const {
    data, loading, countdown, nextPrayerName,
    forbiddenInfo,
    refresh: refreshPrayerTimes,
  } = usePrayerTimes();
  const flashAnim = useRef(new Animated.Value(1)).current;
  const flashLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const dayCycleAnim = useRef(new Animated.Value(0)).current;
  const twinkleAnim = useRef(new Animated.Value(0)).current;
  const twinkleSlowAnim = useRef(new Animated.Value(0)).current;
  const cloudDriftFarAnim = useRef(new Animated.Value(0)).current;
  const cloudDriftMidAnim = useRef(new Animated.Value(0)).current;
  const cloudDriftNearAnim = useRef(new Animated.Value(0)).current;
  const stars = useRef(
    Array.from({ length: 68 }, (_, i) => ({
      id: i,
      leftPct: Math.random() * 100,
      topPct: Math.random() * 55,
      size: 0.8 + Math.random() * 2.4,
      opacity: 0.45 + Math.random() * 0.55,
      tint: Math.random() > 0.83 ? 'rgba(255,238,210,0.96)' : Math.random() > 0.55 ? 'rgba(225,236,255,0.95)' : 'rgba(255,255,255,0.95)',
      glow: Math.random() > 0.58,
    }))
  ).current;
  const cloudFar = useRef(
    Array.from({ length: 7 }, (_, i) => ({
      id: i,
      top: 40 + Math.random() * 30,
      width: 120 + Math.random() * 70,
      height: 28 + Math.random() * 12,
      alpha: 0.26 + Math.random() * 0.12,
      seed: Math.random(),
    }))
  ).current;
  const cloudMid = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      top: 58 + Math.random() * 34,
      width: 95 + Math.random() * 70,
      height: 24 + Math.random() * 11,
      alpha: 0.3 + Math.random() * 0.16,
      seed: Math.random(),
    }))
  ).current;
  const cloudNear = useRef(
    Array.from({ length: 9 }, (_, i) => ({
      id: i,
      top: 78 + Math.random() * 38,
      width: 105 + Math.random() * 80,
      height: 26 + Math.random() * 12,
      alpha: 0.34 + Math.random() * 0.18,
      seed: Math.random(),
    }))
  ).current;

  const currentTime = useCurrentTime();
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

  useEffect(() => {
    const nowMinutes =
      currentTime.getHours() * 60 +
      currentTime.getMinutes() +
      currentTime.getSeconds() / 60;

    const sunrise = data?.prayers.find(p => p.name === 'Sunrise')?.timeDate;
    const zawaal = data?.prayers.find(p => p.name === 'Zawaal')?.timeDate;
    const dhuhr = data?.prayers.find(p => p.name === 'Dhuhr')?.timeDate;
    const maghrib = data?.prayers.find(p => p.name === 'Maghrib')?.timeDate;

    let dayProgress = nowMinutes / 1440;

    if (sunrise && maghrib) {
      const sunriseMin = sunrise.getHours() * 60 + sunrise.getMinutes();
      const zawaalMin = zawaal ? (zawaal.getHours() * 60 + zawaal.getMinutes()) : null;
      const dhuhrMin = dhuhr ? (dhuhr.getHours() * 60 + dhuhr.getMinutes()) : null;
      const maghribMin = maghrib.getHours() * 60 + maghrib.getMinutes();
      const daySpan = Math.max(1, maghribMin - sunriseMin);
      const nightSpan = 1440 - daySpan;
      const noonPoint = 0.45;
      const postNoonPoint = 0.48;

      if (nowMinutes >= sunriseMin && nowMinutes <= maghribMin) {
        const hasNoonAnchors = zawaalMin !== null && dhuhrMin !== null && zawaalMin > sunriseMin && dhuhrMin > zawaalMin && dhuhrMin < maghribMin;
        if (hasNoonAnchors) {
          if (nowMinutes <= zawaalMin) {
            // Sunrise -> Zawaal (sun climbs to exact noon apex)
            const upSpan = Math.max(1, zawaalMin - sunriseMin);
            const tUp = (nowMinutes - sunriseMin) / upSpan;
            dayProgress = 0.26 + tUp * (noonPoint - 0.26);
          } else if (nowMinutes <= dhuhrMin) {
            // Zawaal -> Dhuhr (sun begins descending just after apex)
            const noonSpan = Math.max(1, dhuhrMin - zawaalMin);
            const tNoon = (nowMinutes - zawaalMin) / noonSpan;
            dayProgress = noonPoint + tNoon * (postNoonPoint - noonPoint);
          } else {
            // Dhuhr -> Maghrib (afternoon decline)
            const downSpan = Math.max(1, maghribMin - dhuhrMin);
            const tDown = (nowMinutes - dhuhrMin) / downSpan;
            dayProgress = postNoonPoint + tDown * (0.78 - postNoonPoint);
          }
        } else {
          // Fallback daylight mapping when noon anchors are unavailable.
          const tDay = (nowMinutes - sunriseMin) / daySpan;
          dayProgress = 0.26 + tDay * (0.78 - 0.26);
        }
      } else {
        // Map night from maghrib -> sunrise across midnight.
        const tNight = nowMinutes > maghribMin
          ? (nowMinutes - maghribMin) / nightSpan
          : (nowMinutes + 1440 - maghribMin) / nightSpan;
        const wrapped = 0.78 + tNight * (1 - 0.78 + 0.26);
        dayProgress = wrapped > 1 ? wrapped - 1 : wrapped;
      }
    }

    Animated.timing(dayCycleAnim, {
      toValue: dayProgress,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [currentTime, dayCycleAnim, data]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkleAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(twinkleAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      twinkleAnim.setValue(0);
    };
  }, [twinkleAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkleSlowAnim, {
          toValue: 1,
          duration: 6200,
          useNativeDriver: false,
        }),
        Animated.timing(twinkleSlowAnim, {
          toValue: 0,
          duration: 7400,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      twinkleSlowAnim.setValue(0);
    };
  }, [twinkleSlowAnim]);

  useEffect(() => {
    const farLoop = Animated.loop(
      Animated.timing(cloudDriftFarAnim, {
        toValue: 1,
        duration: 90000,
        useNativeDriver: true,
      })
    );
    const midLoop = Animated.loop(
      Animated.timing(cloudDriftMidAnim, {
        toValue: 1,
        duration: 62000,
        useNativeDriver: true,
      })
    );
    const nearLoop = Animated.loop(
      Animated.timing(cloudDriftNearAnim, {
        toValue: 1,
        duration: 42000,
        useNativeDriver: true,
      })
    );

    farLoop.start();
    midLoop.start();
    nearLoop.start();
    return () => {
      farLoop.stop();
      midLoop.stop();
      nearLoop.stop();
      cloudDriftFarAnim.setValue(0);
      cloudDriftMidAnim.setValue(0);
      cloudDriftNearAnim.setValue(0);
    };
  }, [cloudDriftFarAnim, cloudDriftMidAnim, cloudDriftNearAnim]);

  const N = nightMode ? NIGHT : null;

  const month = currentTime.getMonth();
  const isWinterSeason = month === 11 || month <= 1;
  const isSummerSeason = month >= 5 && month <= 7;
  const skyPalette = isWinterSeason
    ? ['#020A18', '#061327', '#CF7B88', '#8FC6EA', '#78B9E0', '#D17B88', '#0D213D', '#020A18']
    : isSummerSeason
      ? ['#031225', '#031225', '#F19272', '#8CE4FF', '#72DCF8', '#F69A76', '#132C52', '#031225']
      : ['#031225', '#031225', '#E57C7A', '#7EDCFF', '#69D8F5', '#F08A7A', '#10233F', '#031225'];
  const sunPeakOpacity = isWinterSeason ? 0.88 : 1;
  const sunNoonY = isWinterSeason ? 18 : isSummerSeason ? -6 : 8;
  const cloudPeakOpacity = isWinterSeason ? 0.36 : isSummerSeason ? 0.56 : 0.5;
  const starsNightPeak = isWinterSeason ? 1 : 0.95;
  const horizonGlowColor = isWinterSeason ? 'rgba(255,150,120,0.45)' : 'rgba(255,170,120,0.6)';
  const cloudColor = isWinterSeason ? 'rgba(225,236,250,0.56)' : 'rgba(255,255,255,0.62)';
  const cloudShadeColor = isWinterSeason ? 'rgba(185,204,226,0.46)' : 'rgba(201,219,238,0.42)';
  const cloudHighlightColor = isWinterSeason ? 'rgba(246,250,255,0.6)' : 'rgba(255,255,255,0.7)';

  const skyColor = dayCycleAnim.interpolate({
    inputRange: [0, 0.2, 0.28, 0.4, 0.55, 0.72, 0.82, 1],
    outputRange: skyPalette,
  });
  const sunTranslateX = dayCycleAnim.interpolate({
    inputRange: [0, 0.2, 0.28, 0.45, 0.48, 0.62, 0.78, 1],
    outputRange: [-140, -140, -70, 40, 58, 150, 280, 280],
  });
  const sunTranslateY = dayCycleAnim.interpolate({
    inputRange: [0, 0.2, 0.28, 0.45, 0.48, 0.62, 0.78, 1],
    outputRange: [170, 170, 118, sunNoonY, sunNoonY + 4, sunNoonY + 12, 122, 170],
  });
  const sunOpacity = dayCycleAnim.interpolate({
    inputRange: [0, 0.22, 0.32, 0.7, 0.8, 1],
    outputRange: [0, 0, 0.85, sunPeakOpacity, 0, 0],
  });
  const sunCoreColor = dayCycleAnim.interpolate({
    inputRange: [0.26, 0.4, 0.45, 0.48, 0.62, 0.78],
    outputRange: ['#F5A64A', '#FFD06B', '#FFF2BE', '#FFE6A8', '#FFC773', '#E49A50'],
  });
  const sunHaloOpacity = dayCycleAnim.interpolate({
    inputRange: [0.26, 0.45, 0.48, 0.7, 0.8],
    outputRange: [0.38, 0.72, 0.58, 0.4, 0],
  });
  const sunHaloScale = dayCycleAnim.interpolate({
    inputRange: [0.26, 0.45, 0.48, 0.7],
    outputRange: [1.05, 1.18, 1.1, 1.03],
  });
  const sunNoonBoostOpacity = dayCycleAnim.interpolate({
    inputRange: [0.26, 0.4, 0.45, 0.48, 0.55, 0.7],
    outputRange: [0, 0.35, 0.65, 0.25, 0, 0],
  });
  const sunWarmOverlayOpacity = dayCycleAnim.interpolate({
    inputRange: [0.26, 0.45, 0.48, 0.62, 0.78],
    outputRange: [0.2, 0.05, 0.16, 0.42, 0.62],
  });
  const sunShadowOpacity = dayCycleAnim.interpolate({
    inputRange: [0.26, 0.45, 0.48, 0.78],
    outputRange: [0.48, 0.82, 0.7, 0.4],
  });
  const sunShadowRadius = dayCycleAnim.interpolate({
    inputRange: [0.26, 0.45, 0.48, 0.78],
    outputRange: [14, 24, 20, 12],
  });
  const starsOpacity = dayCycleAnim.interpolate({
    inputRange: [0, 0.22, 0.35, 0.68, 0.82, 1],
    outputRange: [starsNightPeak, starsNightPeak * 0.9, 0.1, 0, 0.55, starsNightPeak],
  });
  const cloudFarOpacity = dayCycleAnim.interpolate({
    inputRange: [0, 0.22, 0.3, 0.7, 0.82, 1],
    outputRange: [0, 0.07, cloudPeakOpacity * 0.58, cloudPeakOpacity * 0.52, 0.07, 0],
  });
  const cloudMidOpacity = dayCycleAnim.interpolate({
    inputRange: [0, 0.24, 0.33, 0.7, 0.82, 1],
    outputRange: [0, 0.1, cloudPeakOpacity * 0.86, cloudPeakOpacity * 0.78, 0.1, 0],
  });
  const cloudNearOpacity = dayCycleAnim.interpolate({
    inputRange: [0, 0.26, 0.36, 0.68, 0.82, 1],
    outputRange: [0, 0.12, cloudPeakOpacity, cloudPeakOpacity * 0.9, 0.12, 0],
  });
  const horizonGlowOpacity = dayCycleAnim.interpolate({
    inputRange: [0, 0.2, 0.27, 0.34, 0.66, 0.74, 0.82, 1],
    outputRange: [0.08, 0.16, 0.48, 0.1, 0.1, 0.45, 0.12, 0.08],
  });
  const sunsetWarmBandOpacity = dayCycleAnim.interpolate({
    inputRange: [0.6, 0.68, 0.74, 0.82],
    outputRange: [0, 0.35, 0.5, 0],
  });
  const duskTintOpacity = dayCycleAnim.interpolate({
    inputRange: [0.68, 0.76, 0.84, 0.9],
    outputRange: [0, 0.16, 0.2, 0],
  });
  const twinkleOpacity = twinkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  const twinkleSlowOpacity = twinkleSlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.78, 1],
  });
  const moonPulseScale = twinkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.02],
  });
  const moonTranslateY = twinkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3],
  });
  const nightVignetteOpacity = dayCycleAnim.interpolate({
    inputRange: [0, 0.2, 0.35, 0.68, 0.82, 1],
    outputRange: [0.45, 0.4, 0.05, 0, 0.3, 0.45],
  });
  const cloudFarDrift = cloudDriftFarAnim.interpolate({ inputRange: [0, 1], outputRange: [-220, SCREEN_WIDTH + 220] });
  const cloudMidDrift = cloudDriftMidAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_WIDTH + 180, -220] });
  const cloudNearDrift = cloudDriftNearAnim.interpolate({ inputRange: [0, 1], outputRange: [-260, SCREEN_WIDTH + 260] });

  const timeH    = currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  const secStr   = currentTime.toLocaleTimeString('en-GB', { second: '2-digit' });
  const ampm     = currentTime.getHours() >= 12 ? 'PM' : 'AM';
  const heroAmbientGradient = getHeroOverlayGradient(currentTime.getHours(), nightMode);
  const dayName  = currentTime.toLocaleDateString('en-GB', { weekday: 'long' });
  const dateShort= currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const hijriDayNum  = data ? getHijriDayNumber(data.hijriDate) : '';
  const rawHijriDayNum = data ? Number.parseInt(getHijriDayNumber(data.hijriDate) || '0', 10) : 0;
  const rawHijriMonthName = data ? getHijriMonthFromAnyFormat(data.hijriDate) : '';
  const isDhulHijjahNow = isDhulHijjahMonth(rawHijriMonthName);
  const maghribEntry = data?.prayers.find(p => p.name === 'Maghrib');
  const isPastMaghrib = maghribEntry ? currentTime >= maghribEntry.timeDate : false;
  const hijriSource = (() => {
    if (!data) return '';
    if (isPastMaghrib) {
      const tomorrow = new Date(currentTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return getPrayerTimesFromTimetable(tomorrow)?.hijriDate ?? data.hijriDate;
    }
    return data.hijriDate;
  })();
  const hijriDisplayLabel = !loading ? buildHijriLabel(hijriSource) : '';
  // Hijri day as integer (1-30) — drives Full Juz for monthly Quran completion
  // Falls back to Gregorian day-of-year mod 30 until Hijri data loads
  const hijriDayInt  = parseInt(hijriDayNum || '0', 10) || ((DAY_OF_YEAR % 30) + 1);

  const nextPrayerTime = data?.prayers.find(p => p.name === nextPrayerName)?.time ?? '';
  const nextIqamah = nextInfo?.prayer.iqamah && nextInfo.prayer.iqamah !== '-' ? nextInfo.prayer.iqamah : null;
  const zawaalPrayer = data?.prayers.find(p => p.name === 'Zawaal');
  const dhuhrPrayer = data?.prayers.find(p => p.name === 'Dhuhr');
  const asrPrayer = data?.prayers.find(p => p.name === 'Asr');

  const {
    heroImageKey,
    heroGradientColors,
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
  const sunriseTimeDate = data?.prayers.find(p => p.name === 'Sunrise')?.timeDate;
  const maghribTimeDate = data?.prayers.find(p => p.name === 'Maghrib')?.timeDate;
  const isEidEveInfoWindow = !!(
    isDhulHijjahNow
    && rawHijriDayNum === 9
    && maghribTimeDate
    && currentTime >= maghribTimeDate
  );
  const isEidDayToZawaalWindow = !!(
    isDhulHijjahNow
    && rawHijriDayNum === 10
    && zawaalPrayer?.timeDate
    && currentTime < zawaalPrayer.timeDate
  );
  const shouldShowEidUlAdhaInfoLine = isEidEveInfoWindow || isEidDayToZawaalWindow;

  const resolvedEidUlAdhaJamaats = React.useMemo(
    () => (eidUlAdhaJamaats.length > 0 ? eidUlAdhaJamaats : ['06:30']),
    [eidUlAdhaJamaats]
  );
  const eidUlAdhaInfoLine = buildEidJamaatNote(resolvedEidUlAdhaJamaats);
  const isEidUlAdhaHeroWindow = !!(
    isDhulHijjahNow
    && rawHijriDayNum === 10
    && sunriseTimeDate
    && currentTime >= sunriseTimeDate
    && zawaalPrayer?.timeDate
    && currentTime < zawaalPrayer.timeDate
  );

  const eidUlAdhaHeroData = React.useMemo(() => {
    if (!isEidUlAdhaHeroWindow || !sunriseTimeDate || !zawaalPrayer?.timeDate) return null;

    const parseClockToday = (clock: string): Date | null => {
      const [h, m] = clock.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      const d = new Date(currentTime);
      d.setHours(h, m, 0, 0);
      return d;
    };

    const jamaatDates = resolvedEidUlAdhaJamaats
      .map((time) => ({ time, date: parseClockToday(time) }))
      .filter((entry): entry is { time: string; date: Date } => !!entry.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const timelinePoints = [
      ...jamaatDates.map((entry, index) => ({
        label: `J${index + 1}`,
        position: jamaatDates.length === 1 ? 0.2 : 0.12 + ((0.56 / Math.max(1, jamaatDates.length - 1)) * index),
      })),
      { label: 'Zawaal', position: 1 },
    ];

    const firstJamaat = jamaatDates[0]?.date ?? null;
    const lastJamaat = jamaatDates[jamaatDates.length - 1]?.date ?? null;

    let label = 'Until Zawaal';
    let value = countdown;
    let startLabel = 'Sunrise';
    let startTime = data?.prayers.find((p) => p.name === 'Sunrise')?.time ?? '--:--';
    let endLabel = 'Zawaal';
    let endTime = zawaalPrayer.time ?? '--:--';
    let progressStart = sunriseTimeDate;
    let progressEnd = zawaalPrayer.timeDate;
    let isAfterFinalEidJamaat = false;

    if (firstJamaat && currentTime < firstJamaat) {
      label = `${toOrdinal(1)} Jamaat`;
      value = formatCountdownSeconds(Math.max(0, Math.floor((firstJamaat.getTime() - currentTime.getTime()) / 1000)));
      endLabel = `${toOrdinal(1)} Jamaat`;
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
        label = `${toOrdinal(betweenIndex + 2)} Jamaat`;
        value = formatCountdownSeconds(Math.max(0, Math.floor((nextJamaat.date.getTime() - currentTime.getTime()) / 1000)));
        startLabel = `${toOrdinal(betweenIndex + 1)} Jamaat`;
        startTime = currentJamaat.time;
        endLabel = `${toOrdinal(betweenIndex + 2)} Jamaat`;
        endTime = nextJamaat.time;
        progressStart = currentJamaat.date;
        progressEnd = nextJamaat.date;
      } else if (lastJamaat && currentTime >= lastJamaat) {
        label = 'Until Zawaal';
        value = formatCountdownSeconds(Math.max(0, Math.floor((zawaalPrayer.timeDate.getTime() - currentTime.getTime()) / 1000)));
        startLabel = `${toOrdinal(jamaatDates.length)} Jamaat`;
        startTime = jamaatDates[jamaatDates.length - 1].time;
        progressStart = lastJamaat;
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
        note: eidUlAdhaInfoLine,
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
    isEidUlAdhaHeroWindow,
    sunriseTimeDate,
    zawaalPrayer,
    resolvedEidUlAdhaJamaats,
    currentTime,
    data,
    countdown,
    eidUlAdhaInfoLine,
  ]);

  const isFriday = currentTime.getDay() === 5;
  const isThursday = currentTime.getDay() === 4;

  const moonVisibility = (() => {
    // Strict night-only moon: fade in after Maghrib, fade out before Sunrise.
    const fadeMinutes = 35;

    if (sunriseTimeDate && maghribTimeDate) {
      const nowMs = currentTime.getTime();
      const sunriseMs = sunriseTimeDate.getTime();
      const maghribMs = maghribTimeDate.getTime();

      if (nowMs >= sunriseMs && nowMs < maghribMs) return 0;

      if (nowMs >= maghribMs) {
        const minsAfterMaghrib = (nowMs - maghribMs) / 60000;
        return Math.max(0, Math.min(1, minsAfterMaghrib / fadeMinutes));
      }

      const minsToSunrise = (sunriseMs - nowMs) / 60000;
      return Math.max(0, Math.min(1, minsToSunrise / fadeMinutes));
    }

    // Fallback while prayer data loads.
    const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
    if (hour >= 20 || hour < 4.5) return 1;
    if (hour >= 4.5 && hour < 5.5) return Math.max(0, 5.5 - hour);
    if (hour >= 19 && hour < 20) return Math.max(0, hour - 19);
    return 0;
  })();

  // Compute today's sunnah from DB (fallback to SUNNAH_REMINDERS)
  const computedTodaySunnah: SunnahEntry = (() => {
    const pool: SunnahReminderRow[] = dbSunnahs.length > 0
      ? dbSunnahs
      : SUNNAH_REMINDERS.map((s, i) => ({
          id: s.act, title: s.act, detail: s.detail, reference: s.ref,
          icon: s.icon, friday_only: false, display_order: i * 10, is_active: true,
        }));
    const filtered = isFriday ? pool : pool.filter(s => !s.friday_only);
    const row = filtered[DAY_OF_YEAR % Math.max(1, filtered.length)] ?? pool[0];
    return {
      act: row?.title ?? '',
      detail: row?.detail ?? '',
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

  const effectiveForbiddenInfo = isEidUlAdhaHeroWindow ? null : forbiddenInfo;

  const isFridayPostZawaal = !!(
    isFriday
    && !effectiveForbiddenInfo
    && zawaalPrayer?.timeDate
    && asrPrayer?.timeDate
    && currentTime >= zawaalPrayer.timeDate
    && currentTime < asrPrayer.timeDate
  );

  const isNonJumuahEidZawaalHero = !!(
    isEidUlAdhaHeroWindow
    && !isFriday
    && eidUlAdhaHeroData?.isAfterFinalEidJamaat
  );

  const isFridayZawaalHero = !!(isFriday && effectiveForbiddenInfo && heroPrayerName === 'Zawaal');

  const firstJummahAthanTime = dhuhrPrayer?.time ?? heroEndTime;
  const fridayJumuahScheduleNote = `1st Jummah: ${jj1} · 2nd Jummah: ${jj2}`;
  const shouldShowFridayJumuahNote = (() => {
    // Show Jummah info strip from Isha Thursday through Friday, but NOT on Jummah hero itself
    if (isFridayPostZawaal) return false; // Never on Jummah hero
    if (isFriday) return true; // All Friday cards
    if (isThursday && heroPrayerName === 'Isha') return true; // Isha Thursday
    return false;
  })();

  const effectiveHeroImageKey = isNonJumuahEidZawaalHero
    ? 'Zawaal'
    : isEidUlAdhaHeroWindow
    ? 'EidAdha'
    : (isFridayPostZawaal ? 'Jumuah' : heroImageKey);
  const effectiveHeroPrayerName = isNonJumuahEidZawaalHero
    ? 'Zawaal'
    : isEidUlAdhaHeroWindow
    ? 'Eid Prayer'
    : (isFridayPostZawaal ? 'Jumuah' : heroPrayerName);
  const effectiveHeroStartLabel = isEidUlAdhaHeroWindow
    ? (eidUlAdhaHeroData?.startLabel ?? 'Sunrise')
    : (isFridayPostZawaal ? 'First Athan' : heroStartLabel);
  const effectiveHeroStartTime = isEidUlAdhaHeroWindow
    ? (eidUlAdhaHeroData?.startTime ?? '--:--')
    : isFridayPostZawaal
    ? (dhuhrPrayer?.time ?? heroStartTime)
    : heroStartTime;
  const effectiveHeroEndLabel = isEidUlAdhaHeroWindow
    ? (eidUlAdhaHeroData?.endLabel ?? 'Zawaal')
    : isFridayPostZawaal
    ? 'Asr'
    : (isFridayZawaalHero ? '1st Jummah Athaan' : heroEndLabel);
  const effectiveHeroEndTime = isEidUlAdhaHeroWindow
    ? (eidUlAdhaHeroData?.endTime ?? '--:--')
    : isFridayPostZawaal
    ? (asrPrayer?.time ?? heroEndTime)
    : (isFridayZawaalHero ? firstJummahAthanTime : heroEndTime);
  const effectiveHeroMidLabel = (isFridayPostZawaal || isEidUlAdhaHeroWindow) ? '' : heroMidLabel;
  const effectiveHeroMidTime = (isFridayPostZawaal || isEidUlAdhaHeroWindow) ? '' : heroMidTime;
  const currentPrayerIqamah = activePrayer?.iqamah && activePrayer.iqamah !== '-' ? activePrayer.iqamah : null;
  const asrIqamah = asrPrayer?.iqamah && asrPrayer.iqamah !== '-' ? asrPrayer.iqamah : null;
  const hasExplicitHeroMidEvent = !!effectiveHeroMidLabel && !!effectiveHeroMidTime;
  const isSpecialHeroPhase = ['Sunrise', 'Ishraq', 'Zawaal'].includes(effectiveHeroPrayerName);
  const heroPrayerSupportsJamaat = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Jumuah'].includes(effectiveHeroPrayerName);
  const endEntrySupportsJamaat = ['Next Prayer', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Jumuah'].includes(effectiveHeroEndLabel);
  const effectiveHeroJamaatValue = (() => {
    if (isEidUlAdhaHeroWindow) return '';
    if (isFridayPostZawaal) return '';
    if (isSpecialHeroPhase) return '';
    if (hasExplicitHeroMidEvent) return '';
    if (heroPrayerSupportsJamaat && currentPrayerIqamah) return currentPrayerIqamah;
    if (endEntrySupportsJamaat && nextIqamah) return nextIqamah;
    return '';
  })();
  const effectiveHeroShowJamaat = !!effectiveHeroJamaatValue;
  const effectiveNextPrayerName = isFridayPostZawaal ? 'Asr' : nextPrayerName;
  const effectiveNextPrayerTime = isFridayPostZawaal
    ? (asrPrayer?.time ?? nextPrayerTime)
    : (nextInfo?.prayer.time ?? nextPrayerTime);
  const effectiveNextPrayerJamaatValue = isFridayPostZawaal
    ? (asrIqamah ?? '')
    : (nextIqamah ?? '');

  const isEidUlAdhaHero = isEidUlAdhaHeroWindow;

  const effectiveHeroCountdownInfo = (() => {
    if (isEidUlAdhaHeroWindow && eidUlAdhaHeroData) {
      const noteParts: string[] = [];
      if (eidUlAdhaHeroData.isAfterFinalEidJamaat) {
        noteParts.push('The final eid prayer has been');
      }
      if (shouldShowEidUlAdhaInfoLine) noteParts.push(eidUlAdhaInfoLine);
      if (isFriday) noteParts.push(fridayJumuahScheduleNote);

      return {
        ...eidUlAdhaHeroData.countdownInfo,
        note: noteParts.join(' · '),
      };
    }

    if (isFridayPostZawaal) {
      const j1Date = parseMeridianToday(jj1);
      const j2Date = parseMeridianToday(jj2);
      const asrDate = asrPrayer?.timeDate ?? null;

      if (currentTime < j1Date) {
        return {
          label: '1st Jamaat',
          value: formatCountdownSeconds(Math.max(0, Math.floor((j1Date.getTime() - currentTime.getTime()) / 1000))),
          note: fridayJumuahScheduleNote,
          flash: false,
        };
      }
      if (currentTime < j2Date) {
        return {
          label: '2nd Jamaat',
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

    if (shouldShowEidUlAdhaInfoLine) {
      const prefix = resolvedInfo.note ? `${resolvedInfo.note} · ` : '';
      resolvedInfo = {
        ...resolvedInfo,
        note: `${prefix}${eidUlAdhaInfoLine}`,
      };
    }

    return resolvedInfo;
  })();

  const effectiveHeroProgress = isEidUlAdhaHeroWindow
    ? (eidUlAdhaHeroData?.progress ?? heroProgress)
    : heroProgress;
  const effectiveHeroTimelinePoints = isEidUlAdhaHeroWindow
    ? (eidUlAdhaHeroData?.timelinePoints ?? [])
    : undefined;
  const effectiveHeroAthanMarker = isEidUlAdhaHeroWindow ? 0 : heroAthanMarker;
  const effectiveHeroJamaatMarker = isEidUlAdhaHeroWindow ? null : heroJamaatMarker;
  const effectiveHeroEndMarker = isEidUlAdhaHeroWindow ? null : heroEndMarker;
  const effectiveHeroMidMarker = isEidUlAdhaHeroWindow ? null : heroMidMarker;
  const effectiveHeroKicker = isNonJumuahEidZawaalHero
    ? 'Prayer Pause Window'
    : isEidUlAdhaHeroWindow
    ? 'Eid ul Adha'
    : (effectiveForbiddenInfo ? 'Prayer Pause Window' : (activePrayer ? 'Current Prayer' : 'Up Next Prayer'));
  const effectiveHeroGradientColors = isNonJumuahEidZawaalHero
    ? PRAYER_GRADIENTS.Zawaal
    : isEidUlAdhaHeroWindow
    ? PRAYER_GRADIENTS.EidAdha
    : heroGradientColors;

  const effectiveHeroImageOpacity = getHeroImageOpacity(currentTime.getHours(), effectiveHeroPrayerName, !!forbiddenInfo);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshPrayerTimes(), loadSunnahReminders()]);
      setLastUpdated(new Date());
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

  useEffect(() => {
    if (!loading && data) {
      setLastUpdated(new Date());
    }
  }, [loading, data]);

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
      {/* ── Hero Header ─────────────────────────────── */}
      <View
        style={[styles.heroHeader, { paddingTop: insets.top + 8 }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: skyColor }]}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 86,
            backgroundColor: horizonGlowColor,
            opacity: horizonGlowOpacity,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 6,
            height: 58,
            backgroundColor: 'rgba(255,124,74,0.6)',
            opacity: sunsetWarmBandOpacity,
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 88,
            backgroundColor: 'rgba(118,76,170,0.32)',
            opacity: duskTintOpacity,
          }}
        />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: cloudFarOpacity }]}>
          {cloudFar.map((c, i) => (
            <Animated.View
              key={`cf-${c.id}`}
              style={{
                position: 'absolute',
                top: c.top,
                width: c.width,
                height: c.height,
                borderRadius: c.height / 2,
                backgroundColor: cloudShadeColor,
                opacity: c.alpha,
                transform: [{ translateX: cloudFarDrift }, { translateY: i % 2 === 0 ? -1 : 1 }],
              }}
            >
              <View style={{ position: 'absolute', width: c.width * 0.58, height: c.height * 1.28, borderRadius: c.height, left: c.width * 0.11, top: -c.height * 0.4, backgroundColor: cloudColor, opacity: 0.92 }} />
              <View style={{ position: 'absolute', width: c.width * 0.42, height: c.height * 1.1, borderRadius: c.height, left: c.width * 0.5, top: -c.height * 0.26, backgroundColor: cloudHighlightColor, opacity: 0.74 }} />
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: cloudMidOpacity }]}>
          {cloudMid.map((c, i) => (
            <Animated.View
              key={`cm-${c.id}`}
              style={{
                position: 'absolute',
                top: c.top,
                width: c.width,
                height: c.height,
                borderRadius: c.height / 2,
                backgroundColor: cloudShadeColor,
                opacity: c.alpha,
                transform: [{ translateX: cloudMidDrift }, { translateY: i % 3 === 0 ? -2 : 2 }],
              }}
            >
              <View style={{ position: 'absolute', width: c.width * 0.52, height: c.height * 1.24, borderRadius: c.height, left: c.width * 0.1, top: -c.height * 0.38, backgroundColor: cloudColor, opacity: 0.93 }} />
              <View style={{ position: 'absolute', width: c.width * 0.4, height: c.height * 1.06, borderRadius: c.height, left: c.width * 0.5, top: -c.height * 0.24, backgroundColor: cloudHighlightColor, opacity: 0.76 }} />
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: cloudNearOpacity }]}>
          {cloudNear.map((c, i) => (
            <Animated.View
              key={`cn-${c.id}`}
              style={{
                position: 'absolute',
                top: c.top,
                width: c.width,
                height: c.height,
                borderRadius: c.height / 2,
                backgroundColor: cloudShadeColor,
                opacity: c.alpha,
                transform: [{ translateX: cloudNearDrift }, { translateY: i % 2 === 0 ? 1 : -1 }],
              }}
            >
              <View style={{ position: 'absolute', width: c.width * 0.54, height: c.height * 1.3, borderRadius: c.height, left: c.width * 0.1, top: -c.height * 0.42, backgroundColor: cloudColor, opacity: 0.95 }} />
              <View style={{ position: 'absolute', width: c.width * 0.42, height: c.height * 1.1, borderRadius: c.height, left: c.width * 0.5, top: -c.height * 0.27, backgroundColor: cloudHighlightColor, opacity: 0.79 }} />
            </Animated.View>
          ))}
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 94,
            height: 94,
            borderRadius: 47,
            backgroundColor: 'rgba(255,218,126,0.46)',
            transform: [{ translateX: sunTranslateX }, { translateY: sunTranslateY }, { scale: sunHaloScale }],
            opacity: Animated.multiply(sunOpacity, sunHaloOpacity),
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 94,
            height: 94,
            borderRadius: 47,
            backgroundColor: sunCoreColor,
            transform: [{ translateX: sunTranslateX }, { translateY: sunTranslateY }],
            opacity: sunOpacity,
            shadowColor: '#FFD06B',
            shadowOpacity: sunShadowOpacity,
            shadowRadius: sunShadowRadius,
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: 47,
                backgroundColor: 'rgba(255,255,255,0.95)',
                opacity: sunNoonBoostOpacity,
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: 47,
                backgroundColor: 'rgba(255,166,84,0.75)',
                opacity: sunWarmOverlayOpacity,
              },
            ]}
          />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 26,
            top: 30,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: 'rgba(240,248,255,0.9)',
            opacity: moonVisibility,
            transform: [{ translateY: moonTranslateY }, { scale: moonPulseScale }],
            shadowColor: '#EAF3FF',
            shadowOpacity: 0.6,
            shadowRadius: 14,
          }}
        />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity: starsOpacity }]}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: twinkleSlowOpacity }]}>
            <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: twinkleOpacity }]}>
            {stars.map((star) => (
              <View
                key={star.id}
                style={{
                  position: 'absolute',
                  left: `${star.leftPct}%` as `${number}%`,
                  top: `${star.topPct}%` as `${number}%`,
                  width: star.size,
                  height: star.size,
                  borderRadius: star.size,
                  opacity: star.opacity,
                  backgroundColor: star.tint,
                  shadowColor: star.tint,
                  shadowOpacity: star.glow ? 0.85 : 0.32,
                  shadowRadius: star.glow ? 6 : 2,
                }}
              />
            ))}
            </Animated.View>
          </Animated.View>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: '#030A18', opacity: nightVignetteOpacity },
          ]}
        />

        {/* Top nav bar */}
        <View style={styles.topNav}>
          <View style={styles.topNavBrand}>
            <Image
              source={require('@/assets/images/masjid-logo.png')}
              style={styles.topNavLogo}
              contentFit="contain"
            />
            <View style={styles.topNavText}>
              <Text numberOfLines={1} style={styles.topNavName}>Jami&apos; Masjid Noorani</Text>
              <View style={styles.topNavCityRow}>
                <View style={styles.topNavCityDot} />
                <Text style={styles.topNavCity}>Halifax, UK</Text>
              </View>
            </View>
          </View>
          <View style={styles.navRight}>
            <View style={styles.updatedPill}>
              <Text style={styles.updatedPillText}>
                Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        </View>

        {/* Unified Hero Entity: time/date + prayer as one card */}
        <View style={styles.heroUnifiedEntity}>
          <PrayerHeroCard
            visible={!!(effectiveForbiddenInfo || nextPrayerName || alertMode || isEidUlAdhaHeroWindow)}
            backgroundSource={PRAYER_BG_IMAGES[effectiveHeroImageKey] ?? PRAYER_BG_IMAGES['Dhuhr']}
            gradientColors={effectiveHeroGradientColors}
            ambientColors={heroAmbientGradient}
            backgroundImageOpacity={effectiveHeroImageOpacity}
            heroWide={SCREEN_WIDTH >= 700}
            kicker={effectiveHeroKicker}
            title={effectiveHeroPrayerName}
            isForbidden={!!effectiveForbiddenInfo || isNonJumuahEidZawaalHero}
            forbiddenEndsAt={effectiveForbiddenInfo?.endsAt ?? (isNonJumuahEidZawaalHero ? (zawaalPrayer?.time ?? '--:--') : '--:--')}
            isFridayJumuahHero={isFridayPostZawaal}
            isEidHero={isEidUlAdhaHero}
            athanValue={activePrayer?.time ?? nextInfo?.prayer.time ?? nextPrayerTime}
            j1={isEidUlAdhaHero ? '' : (isFriday ? jj1 : '')}
            j2={isEidUlAdhaHero ? '' : (isFriday ? jj2 : '')}
            eidJamaats={isEidUlAdhaHero ? resolvedEidUlAdhaJamaats : []}
            showJamaat={effectiveHeroShowJamaat}
            jamaatValue={effectiveHeroJamaatValue}
            countdownInfo={effectiveHeroCountdownInfo}
            flashAnim={flashAnim}
            progress={effectiveHeroProgress}
            athanMarker={effectiveHeroAthanMarker}
            jamaatMarker={effectiveHeroJamaatMarker}
            endMarker={effectiveHeroEndMarker}
            midMarker={effectiveHeroMidMarker}
            startLabel={effectiveHeroStartLabel}
            startTime={effectiveHeroStartTime}
            endLabel={effectiveHeroEndLabel}
            endTime={effectiveHeroEndTime}
            timelinePoints={effectiveHeroTimelinePoints}
            midLabel={effectiveHeroMidLabel}
            midTime={effectiveHeroMidTime}
            hasNext={!!nextInfo}
            nextPrayerName={effectiveNextPrayerName}
            nextPrayerTime={effectiveNextPrayerTime}
            nextPrayerJamaatValue={effectiveNextPrayerJamaatValue}
            prayerIcons={PRAYER_ICONS}
            embedded
            localTime={timeH}
            ampm={ampm}
            seconds={secStr}
            hijriLabel={hijriDisplayLabel}
            loadingHijri={loading || !data}
            dayName={dayName}
            dateShort={dateShort}
            onFullTimetable={() => router.push('/(tabs)/prayer?view=month' as any)}
          />
        </View>
      </View>

      {/* Rolling News Banner */}
      <RollingBanner nightMode={nightMode} />

      {/* ── Forbidden Time Banner ─────────────────── */}
      {effectiveForbiddenInfo ? (
        <View style={styles.forbiddenBanner}>
          <MaterialIcons name="do-not-disturb" size={24} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.forbiddenTitle}>{effectiveForbiddenInfo.label}</Text>
            <Text style={styles.forbiddenReason}>{effectiveForbiddenInfo.reason}</Text>
          </View>
          <View style={styles.forbiddenRight}>
            <Text style={styles.forbiddenUntilLabel}>Resumes at</Text>
            <Text style={styles.forbiddenUntilTime}>{effectiveForbiddenInfo.endsAt}</Text>
            <Text style={styles.forbiddenTimer}>{formatCountdownSeconds(effectiveForbiddenInfo.secondsLeft)}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Donation + Daily Reminders Row ───────── */}
      <ZawaalSectionRow
        nightMode={nightMode}
        todaySunnah={computedTodaySunnah}
        onDonatePress={openDonationCheckout}
      />

      {/* ── Body ──────────────────────────────────── */}
      <View style={[styles.body, N && { backgroundColor: N.bg }]}>
        {/* Quick Links */}
        <Text style={[styles.sectionTitle, N && { color: N.text }]}>Quick Access</Text>
        <View style={styles.quickLinks}>
          {[
            { icon: 'campaign',     label: 'Events & News', route: '/(tabs)/events' },
            { icon: 'help-outline', label: 'How To Pray',   route: '/(tabs)/howto'  },
          ].map(item => (
            <QuickLinkCard key={item.label} icon={item.icon} label={item.label} route={item.route} nightMode={nightMode} />
          ))}
        </View>

        {/* For You Today */}
        <ForYouTodaySection
          prayers={data?.prayers ?? []}
          nightMode={nightMode}
          currentTime={currentTime}
          hijriDay={hijriDayInt}
          todaySunnah={computedTodaySunnah}
        />

        {/* Events & Announcements combined */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, N && { color: N.text }]}>Events & Announcements</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/events')}>
            <Text style={[styles.seeAll, N && { color: N.accent }]}>See All</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/events')}
          activeOpacity={0.85}
          style={[
            styles.eventsAnnouncementsCard,
            N && { backgroundColor: N.surface, borderColor: N.border,
              shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 },
          ]}
        >
          <View style={styles.eaCardInner}>
            <View style={[styles.eaIconBox, N && { backgroundColor: N.accentGlow }]}>
              <MaterialIcons name="campaign" size={26} color={N ? N.accent : Colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.eaTitle, N && { color: N.text }]}>Masjid Events & News</Text>
              <Text style={[styles.eaBody, N && { color: N.textSub }]}>
                Latest announcements, upcoming events, and masjid updates — all in one place.
              </Text>
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
    </ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xl },
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
    marginBottom: 14,
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
    minHeight: 171,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  topNavBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  topNavLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  topNavText: {
    flex: 1,
  },
  topNavName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
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
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.74)',
    letterSpacing: 0.3,
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
    marginTop: 6,
    marginBottom: 0,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#081427',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    overflow: 'visible',
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
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 6,
    alignItems: 'center',
    gap: 2,
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

  // ── Forbidden ──
  forbiddenBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#B71C1C',
    marginHorizontal: Spacing.md, marginTop: 12,
    borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  forbiddenTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  forbiddenReason: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  forbiddenRight: { alignItems: 'flex-end', gap: 2 },
  forbiddenUntilLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, textTransform: 'uppercase' },
  forbiddenUntilTime: { fontSize: 16, fontWeight: '800', color: '#fff' },
  forbiddenTimer: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },

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
  body: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...Typography.titleSmall, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  seeAll: { ...Typography.labelMedium, color: Colors.primary },
  quickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md, justifyContent: 'space-between' },
  quickLinkCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    width: '100%', padding: Spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    paddingVertical: 9,
  },
  quickLinkIcon: {
    width: 46, height: 46, borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs,
  },
  quickLinkIconGlow: {
    shadowColor: '#4FE948',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 6,
  },
  quickLinkLabel: { ...Typography.labelMedium, color: Colors.textPrimary, textAlign: 'center' },

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
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  eaCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: Spacing.md,
  },
  eaIconBox: {
    width: 52, height: 52, borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  eaTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
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
