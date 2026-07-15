import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AppState,
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WidgetInfo } from 'react-native-android-widget';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { formatCountdownSeconds, getNextPrayer, getPrayerTimesFromTimetable, type PrayerTime } from '@/services/prayerService';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  fetchAnnouncements,
  translateTextToUrdu,
  type AnnouncementRow,
} from '@/services/contentService';
import { fetchEidUlAdha, fetchEidUlFitr } from '@/services/eidService';
import { getContinuousDaySkyGradient, getInterpolatedPrayerGradient, PRAYER_SKY_DEPTH_OVERLAY } from '@/components/prayer/heroConfig';
import { buildHeroState } from '@/components/prayer/heroState';
import { buildActivePrayerState } from '@/components/prayer/activePrayerState';
import PrayerDrawerSheet from '@/components/prayer/PrayerDrawerSheet';
import { buildPrayerDrawerRows, type DrawerPrayerRow } from '@/components/prayer/prayerDrawerState';
import { HomeInlinePrayerTimesSection } from '@/components/prayer/HomeInlinePrayerTimesSection';
import { HomeQuickAccessSection } from '@/components/prayer/HomeQuickAccessSection';
import { HomeForYouTodaySection } from '@/components/prayer/HomeForYouTodaySection';
import {
  CommunityUpdatesSection,
  type CommunityUpdateItem,
} from '@/components/prayer/CommunityUpdatesSection';
import { SacredContentModule, SacredReadingSheet } from '@/components/prayer/SacredContentModule';
import HeroNewsBar from '@/components/prayer/HeroNewsBar';
import {
  createDonationCheckoutUrl,
  fetchDonationOptionsForApp,
  type AppDonationOption,
} from '@/services/donationService';
import {
  fetchDailySunnah,
  getDailySunnahCached,
  type DailySunnahResult,
} from '@/services/sunnahReminderService';
import { fetchDailyQuranReminder, type DailyQuranResult } from '@/services/quranReminderService';
import { syncIosHomePrayerWidget } from '@/services/iosWidgetSyncService';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DONATION_SUCCESS_SENTINEL = 'example.com/jmn-donation-success';
const DONATION_CANCEL_SENTINEL = 'example.com/jmn-donation-cancel';

const DONATION_CHECKOUT_INJECTED_SCRIPT = `
(function () {
  try {
    let keyboardInset = 0;

    const ensureViewport = () => {
      const head = document.head || document.getElementsByTagName('head')[0];
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport && head) {
        viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        head.appendChild(viewport);
      }

      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover');
      }

      if (document.documentElement) {
        document.documentElement.style.overflowX = 'hidden';
      }

      if (document.body) {
        document.body.style.overflowX = 'hidden';
        document.body.style.maxWidth = '100vw';
      }
    };

    const centerActiveElement = () => {
      const active = document.activeElement;
      if (!active || typeof active.scrollIntoView !== 'function') return;

      try {
        active.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      } catch {
        // ignore
      }
    };

    const applyKeyboardInset = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      keyboardInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      if (document.body) {
        document.body.style.paddingBottom = keyboardInset > 0 ? (keyboardInset + 24) + 'px' : '0px';
      }

      if (keyboardInset > 0) {
        setTimeout(centerActiveElement, 100);
      }
    };

    const notifyOutcome = () => {
      if (!window.ReactNativeWebView) return;

      const href = String((window.location && window.location.href) || '').toLowerCase();
      const titleText = String(document.title || '').toLowerCase();
      const bodyText = String((document.body && document.body.innerText) || '').toLowerCase();
      const isStripeHosted = href.includes('checkout.stripe.com') || href.includes('pay.stripe.com');

      const hasSuccessText =
        titleText.includes('payment complete')
        || titleText.includes('payment successful')
        || bodyText.includes('payment complete')
        || bodyText.includes('payment successful')
        || bodyText.includes('thank you for your donation')
        || bodyText.includes('thanks for your donation')
        || bodyText.includes('receipt');

      const hasCancelText =
        titleText.includes('payment canceled')
        || titleText.includes('payment cancelled')
        || bodyText.includes('payment canceled')
        || bodyText.includes('payment cancelled');

      const isSuccess =
        href.includes('jmn://donation-success')
        || href.includes('${DONATION_SUCCESS_SENTINEL}')
        || href.includes('/success')
        || href.includes('/thank-you')
        || href.includes('redirect_status=succeeded')
        || href.includes('payment_intent=')
        || (isStripeHosted && hasSuccessText);

      const isCancel =
        href.includes('jmn://donation-cancel')
        || href.includes('${DONATION_CANCEL_SENTINEL}')
        || href.includes('/cancel')
        || href.includes('redirect_status=failed')
        || (isStripeHosted && hasCancelText);

      if (isSuccess && !window.__jmnDonationSuccessSent) {
        window.__jmnDonationSuccessSent = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'donation_success', url: href }));
      }

      if (isCancel && !window.__jmnDonationCancelSent) {
        window.__jmnDonationCancelSent = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'donation_cancel', url: href }));
      }
    };

    const run = () => {
      ensureViewport();
      applyKeyboardInset();
      notifyOutcome();
    };

    window.addEventListener('focusin', () => {
      applyKeyboardInset();
      setTimeout(centerActiveElement, 120);
      setTimeout(centerActiveElement, 420);
    });

    window.addEventListener('focusout', () => {
      setTimeout(applyKeyboardInset, 120);
    });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', applyKeyboardInset);
      window.visualViewport.addEventListener('scroll', applyKeyboardInset);
    }

    run();
    setTimeout(run, 250);
    setTimeout(run, 1200);
    const interval = setInterval(run, 900);
    setTimeout(function () { clearInterval(interval); }, 30000);
  } catch (error) {
    // no-op
  }
  true;
})();
`;

type DonationConfirmationState = {
  optionTitle: string;
  atIso: string;
};

function isDonationSuccessNavigation(url: string): boolean {
  const normalized = (url || '').trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.startsWith('jmn://donation-success') || normalized.includes('jmn://donation-success')) {
    return true;
  }

  if (normalized.includes(DONATION_SUCCESS_SENTINEL)) {
    return true;
  }

  if (normalized.includes('checkout.stripe.com') || normalized.includes('pay.stripe.com')) {
    return (
      normalized.includes('/success')
      || normalized.includes('/thank-you')
      || normalized.includes('redirect_status=succeeded')
      || normalized.includes('payment_intent=')
    );
  }

  return false;
}

function isDonationCancelNavigation(url: string): boolean {
  const normalized = (url || '').trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.startsWith('jmn://donation-cancel') || normalized.includes('jmn://donation-cancel')) {
    return true;
  }

  if (normalized.includes(DONATION_CANCEL_SENTINEL)) {
    return true;
  }

  if (normalized.includes('checkout.stripe.com') || normalized.includes('pay.stripe.com')) {
    return normalized.includes('/cancel') || normalized.includes('redirect_status=failed');
  }

  return false;
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
  textPrimary:        '#FCF8F2',  // strongest warm white
  textSecondary:      '#EDE7DE',  // softer off-white
  textTertiary:       '#D4CDC2',  // muted warm tone
  // Hero surfaces
  heroTop:            'rgba(46,138,96,0.70)',
  heroBottom:         'rgba(30,94,65,0.78)',
  heroTopNight:       'rgba(31,90,64,0.78)',
  heroBottomNight:    'rgba(18,58,44,0.85)',
  badgeForest:        'rgba(15,51,35,0.92)',
  badgeBorder:        'rgba(179,218,194,0.20)',
  badgeIconBg:        '#E9E0CF',
  badgeIcon:          '#2A6848',
  dividerSoft:        'rgba(236,244,238,0.16)',
  railBase:           'rgba(234,243,237,0.18)',
  railBaseNight:      'rgba(234,243,237,0.15)',
  railFill:           'rgba(236,246,240,0.44)',
  railDot:            'rgba(244,239,231,0.56)',
  donationSurface:    'rgba(9,44,31,0.74)',
  goldSoft:           '#D8C27A',
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
type SacredPanel = 'hadith' | 'verse';
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
const JAMAAT_FLASH_DURATION_MS = 3 * 60 * 1000;

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

  // Keep alert logic only for real salah prayers.
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
    const d = new Date(activePrayer.timeDate);
    d.setHours(h, m, 0, 0);
    if (d < activePrayer.timeDate) {
      d.setDate(d.getDate() + 1);
    }
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
  donateEyebrow: {
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: 0.1,
    color: '#E8D88A', // softer gold
    opacity: 0.82,
    lineHeight: 28,
    maxWidth: 170,
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
      const sunnahColor = nightMode ? '#4FE948' : '#B88917';
      const accentBg    = nightMode ? 'rgba(79,233,72,0.12)' : 'rgba(184,137,23,0.10)';
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
      const hadithColor = nightMode ? NIGHT.accentSoft : '#0D7C6E';
      const hadithBg    = nightMode ? NIGHT.accentGlow : 'rgba(13,124,110,0.09)';
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
      const verseCol = nightMode ? '#4FE948' : '#3949AB';
      const verseBg  = nightMode ? 'rgba(79,233,72,0.12)' : 'rgba(57,73,171,0.09)';
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

// Home dashboard sections extracted to dedicated components.

const MASJID_IMAGES = [
  require('@/assets/images/masjid/JMN_page_2.png'),
  require('@/assets/images/masjid/JMN_page_3.png'),
  require('@/assets/images/masjid/JMN_page_5_1.png'),
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
        style={{ height: 18 }}
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
                    contentFit="contain"
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 6px 12px rgba(13,53,39,0.18)' }
      : {
          shadowColor: '#0D3527',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
        }),
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0,0,0,0.2)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }),
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
    ...(Platform.OS === 'web'
      ? { textShadow: '0px 1px 4px rgba(0,0,0,0.5)' }
      : { textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }),
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 10px 16px rgba(0,0,0,0.1)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
        }),
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 3px 6px rgba(10,75,55,0.14)' }
      : {
          shadowColor: '#0A4B37',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.14,
          shadowRadius: 6,
        }),
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
function useCurrentTime() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
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
  startPrayerName: string;
  endPrayerName: string;
  progress: number;
  pulseMarker: boolean;
  isLiveJamaatTrack: boolean;
  showJamaatAnchor: boolean;
};

const HERO_TIMELINE_ENDING_SOON_SECONDS = 15 * 60;
const HERO_TIMELINE_STARTING_NOW_SECONDS = 2 * 60;
const HERO_TIMELINE_JAMAAT_ONGOING_SECONDS = 15 * 60;
const HERO_TIMELINE_PULSE_SECONDS = 30;
const HERO_LOGO_MARKER_SIZE = 22;

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
  // Strict comparison avoids turning equal boundaries into an artificial +24h window.
  if (endDate < activePrayer.timeDate) {
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
        startPrayerName: params.effectiveHeroStartLabel || 'Start',
        endPrayerName: params.effectiveHeroEndLabel || 'Next',
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
        startPrayerName: params.activePrayer.name || 'Start',
        endPrayerName: params.effectiveHeroEndLabel || 'Next',
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
        stateLabel = 'JAMAAT SOON';
      }
    } else if (secondsToEnd > 0) {
      progress = Math.max(0.5, Math.min(1, 0.5 + (0.5 * (jamaatToEndElapsed / jamaatToEndTotal))));
      countdownText = formatCountdownSeconds(secondsToEnd);
      const secondsSinceJamaat = Math.floor((params.currentTime.getTime() - jamaatDate.getTime()) / 1000);
      const jamaatStillOngoing = secondsSinceJamaat >= 0 && secondsSinceJamaat <= HERO_TIMELINE_JAMAAT_ONGOING_SECONDS;
      if (jamaatStillOngoing) {
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
      startPrayerName: params.activePrayer.name || 'Start',
      endPrayerName: params.effectiveHeroEndLabel || 'End',
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
  jamaatTimeText,
  nextPrayerName,
  nextPrayerTime,
  showJamaatAnchor,
}: {
  prayerName: string;
  stateLabel: string;
  countdownText: string;
  jamaatTimeText: string;
  nextPrayerName: string;
  nextPrayerTime: string;
  showJamaatAnchor: boolean;
}) {
  const jamaatPillFlashAnim = useRef(new Animated.Value(1)).current;
  const isJamaatNow = stateLabel === 'JAMAAT NOW';
  const isJamaatStartingNow = stateLabel === 'JAMAAT STARTING NOW';
  const isJamaatInProgress = stateLabel === 'JAMAAT NOW';
  const isJamaatSoon = stateLabel === 'JAMAAT SOON';
  const isEndingSoon = stateLabel === 'ENDING SOON';
  const isUntilEnd = stateLabel === 'UNTIL END';
  const normalizedStateLabel = stateLabel.trim().toUpperCase();
  const isForbidden = normalizedStateLabel === 'FORBIDDEN WINDOW' || prayerName === 'Zawaal';
  const showJamaatPill = showJamaatAnchor
    && (normalizedStateLabel === 'UNTIL JAMAAT' || isJamaatNow || isJamaatStartingNow || isJamaatSoon || isEndingSoon || isUntilEnd);
  const showContextPill = countdownText !== '00:00:00';

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    if (isJamaatInProgress && showContextPill) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(jamaatPillFlashAnim, {
            toValue: 0.52,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(jamaatPillFlashAnim, {
            toValue: 1,
            duration: 520,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      jamaatPillFlashAnim.stopAnimation();
      jamaatPillFlashAnim.setValue(1);
    }

    return () => {
      loop?.stop();
    };
  }, [isJamaatInProgress, showContextPill, jamaatPillFlashAnim]);

  const jamaatPillScale = jamaatPillFlashAnim.interpolate({
    inputRange: [0.52, 1],
    outputRange: [0.985, 1],
  });
  const toTitleCase = (value: string) => value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const nonJamaatPillLabel = (() => {
    if (isForbidden) return 'Forbidden window ends in';
    if (normalizedStateLabel.startsWith('UNTIL ')) {
      const target = toTitleCase(normalizedStateLabel.replace('UNTIL ', '').trim());
      return `Countdown to ${target}`;
    }
    if (normalizedStateLabel === 'LIVE PRAYER') return 'Live prayer countdown';
    return 'Countdown to next event';
  })();

  const pillLabel = showJamaatPill
    ? isJamaatNow
      ? 'Jamaat in progress'
      : isJamaatStartingNow
      ? 'Jamaat starts now'
      : isJamaatSoon
      ? 'Jamaat time soon'
      : isEndingSoon
      ? 'Prayer ending soon'
      : isUntilEnd
      ? 'Countdown to end'
      : 'Countdown to Jamaat'
    : nonJamaatPillLabel;

  const pillIconName = showJamaatPill
    ? isJamaatNow
      ? 'play-arrow'
      : isUntilEnd
      ? 'radio-button-on'
      : 'schedule'
    : 'schedule';

  const countdownParts = useMemo(() => {
    const countdownPartsRaw = countdownText.split(':').map((seg) => seg.trim()).filter(Boolean);
    return countdownPartsRaw.length === 3
      ? countdownPartsRaw
      : countdownPartsRaw.length === 2
        ? ['00', countdownPartsRaw[0], countdownPartsRaw[1]]
        : [countdownText, '', ''];
  }, [countdownText]);

  const countdownOutlineMax = 84;
  const outlineProgressAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const outlineReadyRef = useRef(false);

  useEffect(() => {
    const targets = [0, 1, 2].map((index) => getCountdownSegmentProgress(countdownParts, index));

    if (!outlineReadyRef.current) {
      targets.forEach((target, index) => {
        outlineProgressAnims[index].setValue(target);
      });
      outlineReadyRef.current = true;
      return;
    }

    const animation = Animated.parallel(
      targets.map((target, index) =>
        Animated.timing(outlineProgressAnims[index], {
          toValue: target,
          duration: 920,
          useNativeDriver: false,
        })
      )
    );

    animation.start();
    return () => animation.stop();
  }, [countdownParts, countdownText, outlineProgressAnims]);

  const segmentLabels = ['HRS', 'MIN', 'SEC'];
  const countdownPalette = getHeroCountdownPalette(prayerName, isForbidden);

  return (
    <View style={heroTimelineStyles.statusBlock}>
      <View style={heroTimelineStyles.currentPrayerLabelWrap}>
        <MaterialIcons
          name={isForbidden ? 'block' : 'auto-awesome'}
          size={12}
          color="rgba(230,244,235,0.88)"
          style={heroTimelineStyles.currentPrayerLabelIcon}
        />
        <Text style={heroTimelineStyles.currentPrayerLabel}>
          {isForbidden ? 'Forbidden Period' : 'Current Prayer'}
        </Text>
      </View>
      <Text style={heroTimelineStyles.prayerName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {prayerName}
      </Text>

      {showContextPill ? (
          <Animated.View
            style={[
              heroTimelineStyles.jamaatPill,
              heroTimelineStyles.countdownSectionPill,
              isJamaatInProgress
                ? { opacity: jamaatPillFlashAnim, transform: [{ scale: jamaatPillScale }] }
                : null,
            ]}
          >
            <View style={heroTimelineStyles.jamaatPillIconWrap}>
              <MaterialIcons name={isForbidden ? 'block' : pillIconName} size={14} color={HERO_DESIGN_TOKENS.badgeIcon} />
            </View>
            <Text
              style={heroTimelineStyles.jamaatPillText}
              numberOfLines={1}
              ellipsizeMode="tail"
              allowFontScaling={false}
            >
              {pillLabel}
            </Text>
          </Animated.View>
      ) : null}

      {!isJamaatInProgress ? (
        <Animated.View
          style={[
            heroTimelineStyles.countdownCockpit,
            !showContextPill && heroTimelineStyles.countdownCockpitNoPill,
          ]}
        >
          {countdownParts.map((seg, i) => {
            const phase = outlineProgressAnims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [0, 4],
            });

            const topLen = phase.interpolate({
              inputRange: [0, 1, 4],
              outputRange: [0, countdownOutlineMax, countdownOutlineMax],
              extrapolate: 'clamp',
            });
            const rightLen = phase.interpolate({
              inputRange: [0, 1, 2, 4],
              outputRange: [0, 0, countdownOutlineMax, countdownOutlineMax],
              extrapolate: 'clamp',
            });
            const bottomLen = phase.interpolate({
              inputRange: [0, 2, 3, 4],
              outputRange: [0, 0, countdownOutlineMax, countdownOutlineMax],
              extrapolate: 'clamp',
            });
            const leftLen = phase.interpolate({
              inputRange: [0, 3, 4],
              outputRange: [0, 0, countdownOutlineMax],
              extrapolate: 'clamp',
            });

            return (
            <React.Fragment key={i}>
              <View
                style={[
                  heroTimelineStyles.countdownTile,
                  {
                    backgroundColor: countdownPalette.tileBg,
                    borderWidth: 1,
                    borderColor: countdownPalette.tileBorder,
                  },
                ]}
              >
                <View pointerEvents="none" style={heroTimelineStyles.countdownTileHighlight} />
                <View pointerEvents="none" style={heroTimelineStyles.countdownTileShade} />
                <View pointerEvents="none" style={heroTimelineStyles.countdownOutlineTrack}>
                  <Animated.View
                    style={[
                      heroTimelineStyles.countdownOutlineTop,
                      {
                        width: topLen,
                        backgroundColor: countdownPalette.orb,
                        shadowColor: countdownPalette.orbGlow,
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      heroTimelineStyles.countdownOutlineRight,
                      {
                        height: rightLen,
                        backgroundColor: countdownPalette.orb,
                        shadowColor: countdownPalette.orb,
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      heroTimelineStyles.countdownOutlineBottom,
                      {
                        width: bottomLen,
                        backgroundColor: countdownPalette.orb,
                        shadowColor: countdownPalette.orb,
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      heroTimelineStyles.countdownOutlineLeft,
                      {
                        height: leftLen,
                        backgroundColor: countdownPalette.orb,
                        shadowColor: countdownPalette.orb,
                      },
                    ]}
                  />
                </View>
                <Text style={[heroTimelineStyles.countdownDigit, { color: countdownPalette.digit }] }>
                  {seg}
                </Text>
                <Text style={[heroTimelineStyles.countdownUnit, { color: countdownPalette.unit }]}>{segmentLabels[i] || ''}</Text>
              </View>
              {i < countdownParts.length - 1 ? (
                <Text style={[heroTimelineStyles.countdownSeparator, { color: countdownPalette.separator }]}>:</Text>
              ) : null}
            </React.Fragment>
          )})}
        </Animated.View>
      ) : null}

      <View style={heroTimelineStyles.footerRow}>
        <MaterialIcons name={isForbidden ? 'info-outline' : 'wb-sunny'} size={11} color="rgba(237,231,222,0.54)" />
        <Text
          style={heroTimelineStyles.footerText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          ellipsizeMode="tail"
        >
          {isForbidden
            ? <><Text style={heroTimelineStyles.footerLabel}>Prayer resumes </Text><Text style={heroTimelineStyles.footerTime}>{nextPrayerTime || '--:--'}</Text></>
            : prayerName === 'Ishraq'
            ? <><Text style={heroTimelineStyles.footerLabel}>Zawaal </Text><Text style={heroTimelineStyles.footerTime}>{jamaatTimeText || '--:--'}</Text></>
            : <><Text style={heroTimelineStyles.footerLabel}>Jamaat </Text><Text style={heroTimelineStyles.footerTime}>{jamaatTimeText || '--:--'}</Text></>
          }
          {!isForbidden && nextPrayerName ? <><Text style={heroTimelineStyles.footerMuted}> · Next: </Text><Text style={heroTimelineStyles.footerLabel}>{nextPrayerName} </Text><Text style={heroTimelineStyles.footerTime}>{nextPrayerTime}</Text></> : ''}
        </Text>
      </View>
    </View>
  );
}

function getCountdownSegmentProgress(parts: string[], index: number): number {
  const parsePart = (value?: string) => {
    const parsed = Number.parseInt(value ?? '0', 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const hours = Math.max(0, Math.min(23, parsePart(parts[0])));
  const minutes = Math.max(0, Math.min(59, parsePart(parts[1])));
  const seconds = Math.max(0, Math.min(59, parsePart(parts[2])));

  if (index === 0) {
    // If the displayed unit is zero, keep the outline fully complete.
    if (hours === 0) return 1;
    const remaining = hours + minutes / 60 + seconds / 3600;
    return 1 - Math.max(0, Math.min(1, remaining / 23));
  }

  if (index === 1) {
    // If the displayed unit is zero, keep the outline fully complete.
    if (minutes === 0) return 1;
    const remaining = minutes + seconds / 60;
    return 1 - Math.max(0, Math.min(1, remaining / 59));
  }

  // If the displayed unit is zero, keep the outline fully complete.
  if (seconds === 0) return 1;
  return 1 - Math.max(0, Math.min(1, seconds / 59));
}

function getHeroCountdownPalette(prayerName: string, isForbidden: boolean): {
  tileBg: string;
  tileBorder: string;
  tileBorderStrong: string;
  digit: string;
  unit: string;
  separator: string;
  orb: string;
  orbGlow: string;
} {
  if (isForbidden) {
    return {
      tileBg: 'rgba(14,46,30,0.70)',
      tileBorder: 'rgba(154,229,180,0.46)',
      tileBorderStrong: 'rgba(190,246,210,0.72)',
      digit: '#F6FFFB',
      unit: 'rgba(198,242,214,0.94)',
      separator: 'rgba(176,233,198,0.66)',
      orb: 'rgba(171,241,193,0.78)',
      orbGlow: 'rgba(98,206,142,0.27)',
    };
  }

  const key = (prayerName || '').trim().toLowerCase();

  if (key === 'fajr' || key === 'isha') {
    return {
      tileBg: 'rgba(10,39,30,0.74)',
      tileBorder: 'rgba(133,218,178,0.38)',
      tileBorderStrong: 'rgba(179,243,201,0.66)',
      digit: '#F2FFF7',
      unit: 'rgba(186,236,207,0.92)',
      separator: 'rgba(161,226,191,0.60)',
      orb: 'rgba(149,234,188,0.79)',
      orbGlow: 'rgba(83,198,136,0.27)',
    };
  }

  if (key === 'maghrib' || key === 'sunrise') {
    return {
      tileBg: 'rgba(16,47,32,0.72)',
      tileBorder: 'rgba(131,214,171,0.40)',
      tileBorderStrong: 'rgba(173,238,195,0.68)',
      digit: '#F4FFF8',
      unit: 'rgba(184,234,203,0.92)',
      separator: 'rgba(160,223,187,0.62)',
      orb: 'rgba(145,229,181,0.79)',
      orbGlow: 'rgba(81,195,129,0.29)',
    };
  }

  return {
    tileBg: 'rgba(12,43,30,0.70)',
    tileBorder: 'rgba(139,221,182,0.38)',
    tileBorderStrong: 'rgba(183,242,205,0.64)',
    digit: '#F3FFF8',
    unit: 'rgba(181,236,204,0.92)',
    separator: 'rgba(159,224,188,0.60)',
    orb: 'rgba(146,231,184,0.79)',
    orbGlow: 'rgba(84,198,133,0.27)',
  };
}

function HeroPrayerTimeline({
  progress,
  startTimeText,
  jamaatTimeText,
  endTimeText,
  startLabel,
  jamaatLabel,
  endLabel,
  startPrayerName,
  endPrayerName,
  showJamaatAnchor,
  nightMode,
  pulseMarker,
}: {
  progress: number;
  startTimeText: string;
  jamaatTimeText: string;
  endTimeText: string;
  startLabel: string;
  jamaatLabel: string;
  endLabel: string;
  startPrayerName: string;
  endPrayerName: string;
  showJamaatAnchor: boolean;
  nightMode: boolean;
  pulseMarker: boolean;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const animatedProgress = useRef(new Animated.Value(progress)).current;
  const markerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 700,
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
            useNativeDriver: true,
          }),
          Animated.timing(markerScale, {
            toValue: 1,
            duration: 950,
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

  const markerTravel = Math.max(0, trackWidth - HERO_LOGO_MARKER_SIZE);
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
          <View style={[heroTimelineStyles.anchorDot, progress > 0 && heroTimelineStyles.anchorDotFilled]} />
          {showJamaatAnchor ? <View style={[heroTimelineStyles.anchorDot, heroTimelineStyles.anchorDotMiddle, progress > 0.5 && heroTimelineStyles.anchorDotFilled]} /> : null}
          {trackWidth > 0 ? (
            <Animated.View
              style={[
                heroTimelineStyles.markerPosition,
                { pointerEvents: 'none' },
                { transform: [{ translateX: markerTranslateX }] },
              ]}
            >
              <HeroLogoMarker markerScale={markerScale} nightMode={nightMode} pulseMarker={pulseMarker} />
            </Animated.View>
          ) : null}
          <View style={[heroTimelineStyles.anchorDot, heroTimelineStyles.anchorDotRight, progress >= 1 && heroTimelineStyles.anchorDotFilled]} />
        </View>
      </View>

      <View style={heroTimelineStyles.anchorLabelsRow}>
        <Text style={heroTimelineStyles.anchorLabelText} numberOfLines={1}>{startPrayerName}</Text>
        {showJamaatAnchor ? <Text style={heroTimelineStyles.anchorLabelTextCenter} numberOfLines={1}>{jamaatLabel}</Text> : null}
        <Text style={heroTimelineStyles.anchorLabelText} numberOfLines={1}>{endPrayerName}</Text>
      </View>
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
          <View style={StyleSheet.absoluteFillObject}>
            <LinearGradient
              colors={['#3A9569', '#2A7354', '#173C2D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <LinearGradient
              colors={['rgba(245,234,197,0.20)', 'rgba(245,234,197,0.05)', 'rgba(245,234,197,0.00)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={heroSupportStyles.donateInfoSheen}
            />
            <Image
              source={require('@/assets/images/background/kiswahkaabah.jpg')}
              style={heroSupportStyles.donateInfoPattern}
              contentFit="cover"
            />
            <Image
              source={require('../../assets/images/masjid-logo.png')}
              style={[StyleSheet.absoluteFillObject, heroSupportStyles.donateInfoLogo]}
              contentFit="contain"
            />
            <View style={heroSupportStyles.donateInfoTint} />
            <View style={heroSupportStyles.donateInfoOrb} />
            <View style={heroSupportStyles.donateInfoOrbSecondary} />
            <LinearGradient
              colors={['rgba(8,23,17,0.28)', 'rgba(8,23,17,0.07)', 'rgba(8,23,17,0.12)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={heroSupportStyles.donateInfoVignette}
            />
            <View style={heroSupportStyles.donateFrame} />
            <View style={heroSupportStyles.donateInner}>
              <View style={heroSupportStyles.donateLeft}>
                <View style={heroSupportStyles.donateKickerRow}>
                  <View style={heroSupportStyles.donateKickerDot} />
                  <Text style={heroSupportStyles.donateKicker}>Community Appeal</Text>
                </View>
                <Text style={heroSupportStyles.donateEyebrow}>Project Rebuild</Text>
                <Text style={heroSupportStyles.donateName} numberOfLines={1}>
                  Jami{'\u2019'} Masjid Noorani
                </Text>
              </View>
              <View style={heroSupportStyles.donateActionCol}>
                <View style={heroSupportStyles.donateBtn}>
                  <MaterialIcons name="volunteer-activism" size={12} color="#143F2D" />
                  <Text style={heroSupportStyles.donateBtnText}>Donate Now</Text>
                </View>
                <Text style={heroSupportStyles.donateActionNote}>Support the rebuild</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={StyleSheet.absoluteFillObject}>
            <View style={heroSupportStyles.donatePhotoBase} />
            <Image
              source={MASJID_IMAGES[photoIndex]}
              style={[StyleSheet.absoluteFillObject, heroSupportStyles.donatePhotoImage]}
              contentFit="cover"
            />
            <LinearGradient
              colors={['rgba(12,31,24,0.10)', 'rgba(12,31,24,0.52)', 'rgba(8,18,14,0.70)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={heroSupportStyles.donateFrame} />
            <View style={heroSupportStyles.donatePhotoOverlay}>
              <View style={heroSupportStyles.donatePhotoTextBlock}>
                <View style={heroSupportStyles.donateKickerRow}>
                  <View style={heroSupportStyles.donateKickerDot} />
                  <Text style={heroSupportStyles.donatePhotoEyebrow}>Community Appeal</Text>
                </View>
                <Text style={heroSupportStyles.donatePhotoLabel} numberOfLines={1}>Jami{'\u2019'} Masjid Noorani</Text>
              </View>
              <View style={heroSupportStyles.donateActionCol}>
                <View style={heroSupportStyles.donateBtn}>
                  <MaterialIcons name="volunteer-activism" size={13} color="#143F2D" />
                  <Text style={heroSupportStyles.donateBtnText}>Donate Now</Text>
                </View>
                <Text style={heroSupportStyles.donateActionNote}>Support the rebuild</Text>
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
  // Priority 1: Eid
  if (isEidActive) {
    return (
      <TouchableOpacity style={heroSupportStyles.card} activeOpacity={0.82} onPress={onOpenSalahDrawer}>
        <View style={heroSupportStyles.dynamicInner}>
          <View style={heroSupportStyles.dynamicIconRow}>
            <MaterialIcons name="star" size={12} color="#FBBF24" />
            <Text style={[heroSupportStyles.dynamicEyebrow, { color: '#FBBF24' }]}>{eidLabel}</Text>
          </View>
          <Text style={heroSupportStyles.dynamicTitle}>Eid Salah</Text>
          <Text style={heroSupportStyles.dynamicSub} numberOfLines={1}>{eidFirstJamaat}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Priority 2: Jumu'ah (Friday)
  // Priority 3: Today's Salah
  return (
    <TouchableOpacity style={heroSupportStyles.card} activeOpacity={0.82} onPress={onOpenSalahDrawer}>
      <View style={heroSupportStyles.dynamicInner}>
        <View style={heroSupportStyles.dynamicIconRow}>
          <MaterialIcons name="schedule" size={12} color="rgba(164,242,160,0.90)" />
          <Text style={heroSupportStyles.dynamicEyebrow}>Today{'\u2019'}s Salah</Text>
        </View>
        <Text style={heroSupportStyles.dynamicTitle}>Prayer Times</Text>
        <View style={heroSupportStyles.dynamicViewBtn}>
          <Text style={heroSupportStyles.dynamicViewBtnText}>View Times</Text>
          <MaterialIcons name="arrow-forward" size={9} color="rgba(164,242,160,0.90)" />
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
export default function HomeScreen() {
  const [communityUpdates, setCommunityUpdates] = useState<AnnouncementRow[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const hasCommunityDataRef = useRef(false);
  const [activeSacredPanel, setActiveSacredPanel] = useState<SacredPanel | null>(null);
  const [eidUlFitrJamaats, setEidUlFitrJamaats] = useState<string[]>([]);
  const [eidUlAdhaJamaats, setEidUlAdhaJamaats] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [donationLoading, setDonationLoading] = useState(false);
  const [donationModalVisible, setDonationModalVisible] = useState(false);
  const [donationCheckoutUrl, setDonationCheckoutUrl] = useState<string | null>(null);
  const [showDonationOptions, setShowDonationOptions] = useState(true);
  const [donationStatusMessage, setDonationStatusMessage] = useState<string | null>(null);
  const [donationOptions, setDonationOptions] = useState<AppDonationOption[]>([]);
  const [donationOptionsLoading, setDonationOptionsLoading] = useState(false);
  const [selectedDonationOption, setSelectedDonationOption] = useState<AppDonationOption | null>(null);
  const [donationConfirmation, setDonationConfirmation] = useState<DonationConfirmationState | null>(null);
  const donationOutcomeHandledRef = useRef(false);
  const [webPrayerDrawerVisible, setWebPrayerDrawerVisible] = useState(false);
  const isNativeMobileCheckoutPlatform = Platform.OS === 'ios' || Platform.OS === 'android';
  const prayerSheetRef = useRef<BottomSheet>(null);
  const [dailySunnah, setDailySunnah] = useState<DailySunnahResult | null>(null);
  const [dailyQuran, setDailyQuran] = useState<DailyQuranResult | null>(null);

  const refreshDailySunnah = useCallback((forceRefresh = false) => {
    void fetchDailySunnah({ forceRefresh }).then((result) => {
      if (result) {
        setDailySunnah(result);
      }
    });
  }, []);

  const refreshDailyQuran = useCallback(() => {
    void fetchDailyQuranReminder().then((result) => {
      if (result) setDailyQuran(result);
    });
  }, []);

  useEffect(() => {
    hasCommunityDataRef.current = communityUpdates.length > 0;
  }, [communityUpdates.length]);

  const loadCommunityUpdates = useCallback(async (options?: { showLoader?: boolean }) => {
    const shouldShowLoader = (options?.showLoader ?? false) && !hasCommunityDataRef.current;
    if (shouldShowLoader) {
      setCommunityLoading(true);
    }
    try {
      const rows = await fetchAnnouncements();
      setCommunityUpdates(rows);
    } catch {
      // Keep last successful rows to avoid visible blank-state jumps on transient errors.
    } finally {
      if (shouldShowLoader) {
        setCommunityLoading(false);
      }
    }
  }, []);

  const loadDonationOptions = useCallback(async () => {
    setDonationOptionsLoading(true);
    try {
      const rows = await fetchDonationOptionsForApp();
      setDonationOptions(rows);
    } catch {
      setDonationOptions([]);
    } finally {
      setDonationOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCommunityUpdates({ showLoader: true });
    loadDonationOptions();

    // Yaseen images are bundled as local assets — no preload needed
  }, [loadCommunityUpdates, loadDonationOptions]);
  
  useEffect(() => {
    let mounted = true;

    void getDailySunnahCached().then((cached) => {
      if (mounted && cached) {
        setDailySunnah(cached);
      }
    });

    refreshDailySunnah(true);

    return () => {
      mounted = false;
    };
  }, [refreshDailySunnah]);

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 5, 0);
      const delay = Math.max(1000, nextMidnight.getTime() - now.getTime());

      midnightTimer = setTimeout(() => {
        refreshDailySunnah();
        refreshDailyQuran();
        scheduleMidnightRefresh();
      }, delay);
    };

    scheduleMidnightRefresh();

    return () => {
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [refreshDailyQuran, refreshDailySunnah]);

  useEffect(() => {
    let slotTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextSlotRefresh = () => {
      const now = new Date();
      const nextSlot = new Date(now);
      const currentUtcHour = now.getUTCHours();
      const nextBoundaryHour = (Math.floor(currentUtcHour / 8) + 1) * 8;
      nextSlot.setUTCHours(nextBoundaryHour, 0, 5, 0);
      const delay = Math.max(1000, nextSlot.getTime() - now.getTime());

      slotTimer = setTimeout(() => {
        refreshDailySunnah(true);
        scheduleNextSlotRefresh();
      }, delay);
    };

    scheduleNextSlotRefresh();

    return () => {
      if (slotTimer) clearTimeout(slotTimer);
    };
  }, [refreshDailySunnah]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshDailySunnah();
        refreshDailyQuran();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshDailyQuran, refreshDailySunnah]);

  useEffect(() => {
    refreshDailyQuran();
  }, [refreshDailyQuran]);

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
        if (__DEV__) {
          console.warn('[Home] Eid ul Fitr load failed:', err);
        }
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
        if (__DEV__) {
          console.warn('[Home] Eid ul Adha load failed:', err);
        }
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
  const { openDonation } = useLocalSearchParams<{ openDonation?: string | string[] }>();
  const donationDeepLinkHandledRef = useRef(false);
  const { darkMode } = useAppTheme();
  const nightMode = darkMode;
  const isExpoGo = Constants.appOwnership === 'expo';
  const {
    data, countdown, nextPrayerName,
    forbiddenInfo,
    refresh: refreshPrayerTimes,
  } = usePrayerTimes();
  const flashAnim = useRef(new Animated.Value(1)).current;
  const flashLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const currentTime = useCurrentTime();
  const nextInfo = React.useMemo(
    () => (data ? getNextPrayer(data.prayers, currentTime) : null),
    [data, currentTime]
  );

  useEffect(() => {
    let cancelled = false;

    const syncWidget = async () => {
      const {
        HOME_PRAYER_WIDGET_NAME,
        HomeHeroPrayerWidget,
        buildHomePrayerWidgetPayload,
        persistHomePrayerWidgetPayload,
      } = await import('@/widgets/home-prayer-widget');

      const payload = buildHomePrayerWidgetPayload(data);

      void persistHomePrayerWidgetPayload(payload);

      if (cancelled) return;

      if (Platform.OS === 'android' && !isExpoGo) {
        const { requestWidgetUpdate } = await import('react-native-android-widget');
        void requestWidgetUpdate({
          widgetName: HOME_PRAYER_WIDGET_NAME,
          renderWidget: (widgetInfo: WidgetInfo) => <HomeHeroPrayerWidget payload={payload} widgetInfo={widgetInfo} />,
        }).catch((error: unknown) => {
          if (__DEV__) {
            console.warn('[Widget] Failed to request prayer widget update:', error);
          }
        });
        return;
      }

      if (Platform.OS === 'ios') {
        void syncIosHomePrayerWidget(payload);
      }
    };

    void syncWidget();

    return () => {
      cancelled = true;
    };
  }, [data, isExpoGo]);

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

  const N = darkMode ? NIGHT : null;
  const hijriDayNum  = data ? getHijriDayNumber(data.hijriDate) : '';
  const rawHijriDayNum = data ? Number.parseInt(getHijriDayNumber(data.hijriDate) || '0', 10) : 0;
  const rawHijriMonthName = data ? getHijriMonthFromAnyFormat(data.hijriDate) : '';
  const isShawwalNow = isShawwalMonth(rawHijriMonthName);
  const isDhulHijjahNow = isDhulHijjahMonth(rawHijriMonthName);
  // Hijri day as integer (1-30) — drives Full Juz for monthly Quran completion
  // Falls back to Gregorian day-of-year mod 30 until Hijri data loads
  const hijriDayInt  = parseInt(hijriDayNum || '0', 10) || (((DAY_OF_YEAR - 1) % 30) + 1);

  const fajrPrayer = data?.prayers.find(p => p.name === 'Fajr');
  const dhuhrPrayer = data?.prayers.find(p => p.name === 'Dhuhr');
  const asrPrayer = data?.prayers.find(p => p.name === 'Asr');
  const maghribPrayer = data?.prayers.find(p => p.name === 'Maghrib');
  const currentYear = currentTime.getFullYear();
  const currentMonth = currentTime.getMonth();
  const currentDate = currentTime.getDate();
  const tomorrowPrayerTimes = React.useMemo(() => {
    const tomorrow = new Date(currentYear, currentMonth, currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getPrayerTimesFromTimetable(tomorrow);
  }, [currentYear, currentMonth, currentDate]);
  const tomorrowHijriDayNum = tomorrowPrayerTimes
    ? Number.parseInt(getHijriDayNumber(tomorrowPrayerTimes.hijriDate) || '0', 10)
    : 0;
  const tomorrowHijriMonthName = tomorrowPrayerTimes
    ? getHijriMonthFromAnyFormat(tomorrowPrayerTimes.hijriDate)
    : '';
  const isTomorrowEidUlFitr = isShawwalMonth(tomorrowHijriMonthName) && tomorrowHijriDayNum === 1;
  const isTomorrowEidUlAdha = isDhulHijjahMonth(tomorrowHijriMonthName) && tomorrowHijriDayNum === 10;

  const {
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
  const isEidUlFitrDay = isShawwalNow && rawHijriDayNum === 1;
  const isEidUlAdhaDay = isDhulHijjahNow && rawHijriDayNum === 10;
  const activeEidType: 'eid_al_fitr' | 'eid_al_adha' | null = isEidUlFitrDay
    ? 'eid_al_fitr'
    : (isEidUlAdhaDay ? 'eid_al_adha' : null);
  const upcomingEidType: 'eid_al_fitr' | 'eid_al_adha' | null = isTomorrowEidUlFitr
    ? 'eid_al_fitr'
    : (isTomorrowEidUlAdha ? 'eid_al_adha' : null);
  const isEidNightWindow = !!(
    !activeEidType
    && upcomingEidType
    && maghribPrayer?.timeDate
    && currentTime >= maghribPrayer.timeDate
  );
  const effectiveEidType: 'eid_al_fitr' | 'eid_al_adha' | null = activeEidType
    ?? (isEidNightWindow ? upcomingEidType : null);

  const resolvedEidJamaats = React.useMemo(() => {
    const source = effectiveEidType === 'eid_al_fitr' ? eidUlFitrJamaats : eidUlAdhaJamaats;
    return source.length > 0 ? source : ['06:30'];
  }, [effectiveEidType, eidUlFitrJamaats, eidUlAdhaJamaats]);

  const eidInfoLine = buildEidJamaatNote(resolvedEidJamaats);
  const isEidHeroWindow = !!(
    activeEidType
    && fajrPrayer?.timeDate
    && currentTime >= fajrPrayer.timeDate
    && dhuhrPrayer?.timeDate
    && currentTime < dhuhrPrayer.timeDate
  );
  const shouldShowEidInfoLine = !!(
    effectiveEidType
    && (isEidNightWindow || currentTime < (dhuhrPrayer?.timeDate ?? currentTime))
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
    const timelinePoints = [
      ...jamaatDates.map((entry, index) => ({
        label: `J${index + 1}`,
        position: jamaatDates.length === 1 ? 0.2 : 0.12 + ((0.56 / Math.max(1, jamaatDates.length - 1)) * index),
      })),
      { label: 'Dhuhr', position: 1 },
    ];

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

  const isFriday = currentTime.getDay() === 5;
  const isThursday = currentTime.getDay() === 4;

  const fallbackVersePreview = '';
  const fallbackVerseReference = '';
  const fallbackVerseFullText = 'Open full Verse to read the reminder.';

  const hadithTitle = 'Daily Sunnah Reminder';
  const hadithTitleUrdu = 'روزانہ سنت یاددہانی';
  const hadithPreview = dailySunnah?.preview ?? '';
  const hadithPreviewUrdu = '';
  const sourcePathParts = dailySunnah?.sourceUrl
    ? dailySunnah.sourceUrl.replace(/^https?:\/\/[^/]+/i, '').split('/').filter(Boolean)
    : [];
  const parsedChapterFromUrl = sourcePathParts.length >= 3 ? Number(sourcePathParts[1]) : NaN;
  const parsedHadithFromUrl = sourcePathParts.length >= 3 ? Number(sourcePathParts[2]) : NaN;
  const hadithChapterNumber = dailySunnah?.chapterNumber
    ?? (Number.isInteger(parsedChapterFromUrl) ? parsedChapterFromUrl : null);
  const hadithNumber = dailySunnah?.hadithNumber
    ?? (Number.isInteger(parsedHadithFromUrl) ? parsedHadithFromUrl : null)
    ?? dailySunnah?.idInBook
    ?? null;
  const hadithSource = dailySunnah
    ? dailySunnah.sourceLabel
      ?? `${dailySunnah.bookTitle}${hadithChapterNumber ? ` - Chapter ${hadithChapterNumber}` : ''}${hadithNumber ? ` - Hadith ${hadithNumber}` : ''}`
    : '';
  const toUrduDigits = (value: number | string) => String(value).replace(/\d/g, (digit) => {
    const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return digits[Number(digit)] ?? digit;
  });
  const hadithBookTitleUrdu = dailySunnah?.bookTitle?.includes('Riyad')
    ? 'ریاض الصالحین'
    : dailySunnah?.bookTitle?.includes('Adab')
      ? 'الادب المفرد'
      : dailySunnah?.bookTitle?.includes('Shama')
        ? 'الشمائل المحمدیہ'
        : (dailySunnah?.bookTitle ?? '');
  const hadithSourceUrdu = dailySunnah
    ? `${hadithBookTitleUrdu}${hadithChapterNumber ? ` - باب ${toUrduDigits(hadithChapterNumber)}` : ''}${hadithNumber ? ` - حدیث ${toUrduDigits(hadithNumber)}` : ''}`
    : '';
  const hadithArabic = dailySunnah?.arabic ?? '';
  const hadithNarrator = dailySunnah?.narrator?.trim() ?? '';
  const hadithText = dailySunnah?.text?.trim() ?? '';
  const textAlreadyHasNarrator = !!(
    hadithNarrator
    && hadithText
    && hadithText.toLowerCase().startsWith(hadithNarrator.toLowerCase())
  );
  const hadithBodyText = textAlreadyHasNarrator && hadithNarrator
    ? hadithText.slice(hadithNarrator.length).replace(/^\s*[:,-]?\s*/, '').trimStart()
    : hadithText;
  const hadithFullText = dailySunnah
    ? (hadithBodyText || hadithText)
    : 'Open full Hadith to read the reminder.';

  const verseTitle = 'Daily Quran Reminder';
  const verseTitleUrdu = 'روزانہ قرآنی یاددہانی';
  const versePreview = dailyQuran?.preview ?? fallbackVersePreview;
  const versePreviewUrdu = '';
  const verseReference = dailyQuran?.ref ?? fallbackVerseReference;
  const verseArabic = dailyQuran?.arabic ?? '';
  const verseFullText = dailyQuran?.text ?? dailyQuran?.englishTranslation ?? fallbackVerseFullText;
  const expandHintEn = 'Tap to open';
  const expandHintUr = 'کھولنے کے لیے ٹیپ کریں';

  const expandedSacredContent = {
    hadithFullText,
    hadithSource,
    hadithSourceUrdu,
    hadithTitle,
    hadithTitleUrdu: `${hadithTitleUrdu}${hadithBookTitleUrdu ? ` - ${hadithBookTitleUrdu}` : ''}`,
    verseFullText,
    verseReference,
    verseTitle,
  };

  const activeSheetTitle =
    activeSacredPanel === 'hadith'
      ? expandedSacredContent.hadithTitle
      : activeSacredPanel === 'verse'
        ? expandedSacredContent.verseTitle
        : '';
  const activeSheetTitleUrdu =
    activeSacredPanel === 'hadith'
      ? expandedSacredContent.hadithTitleUrdu
      : '';
  const activeSheetText =
    activeSacredPanel === 'hadith'
      ? expandedSacredContent.hadithFullText
      : activeSacredPanel === 'verse'
        ? expandedSacredContent.verseFullText
        : '';
  const activeSheetReference =
    activeSacredPanel === 'hadith'
      ? expandedSacredContent.hadithSource
      : activeSacredPanel === 'verse'
        ? expandedSacredContent.verseReference
        : '';
  const activeSheetReferenceUrdu =
    activeSacredPanel === 'hadith'
      ? expandedSacredContent.hadithSourceUrdu
      : '';
  const activeSheetNarrator =
    activeSacredPanel === 'hadith'
      ? hadithNarrator
      : '';
  const activeSheetArabic =
    activeSacredPanel === 'hadith'
      ? hadithArabic
      : activeSacredPanel === 'verse'
        ? verseArabic
        : '';

  const requestActiveSheetUrduText = useCallback(async () => {
    const source = activeSheetText.trim();
    if (!source) return '';
    return translateTextToUrdu(source);
  }, [activeSheetText]);

  const openQuranReminderTafsir = useCallback(async (languageMode: 'english' | 'urdu') => {
    if (!dailyQuran) {
      router.push('/(tabs)/quran' as any);
      return;
    }
    const reminder = dailyQuran;

    const targetVerseKey = (reminder.contextVerseKeys?.[0] ?? reminder.verseKey ?? '').trim();
    if (!targetVerseKey) {
      router.push('/(tabs)/quran' as any);
      return;
    }

    let reminderPage = Number.isFinite(reminder.pageNumber)
      ? Math.max(0, Math.floor(reminder.pageNumber) - 1)
      : 0;

    try {
      const response = await fetch(
        `https://api.quran.com/api/v4/verses/by_key/${encodeURIComponent(targetVerseKey)}?fields=page_number&language=en`
      );
      if (response.ok) {
        const payload = await response.json();
        const resolvedPage = Number(payload?.verse?.page_number);
        if (Number.isFinite(resolvedPage) && resolvedPage >= 1) {
          reminderPage = Math.max(0, resolvedPage - 1);
        }
      }
    } catch {
      // Use fallback reminder page when page lookup is unavailable.
    }

    setActiveSacredPanel(null);
    router.push({
      pathname: '/quran-reader',
      params: {
        startPage: String(reminderPage),
        endPage: String(reminderPage),
        contentMode: 'tafsir',
        contentLang: languageMode === 'urdu' ? 'ur' : 'en',
        openContentPanel: '1',
      },
    } as any);
  }, [dailyQuran, router]);

  const bst = (() => {
    const y = currentTime.getFullYear();
    const lsm = new Date(y, 2, 31); while (lsm.getDay() !== 0) lsm.setDate(lsm.getDate() - 1);
    const lso = new Date(y, 9, 31); while (lso.getDay() !== 0) lso.setDate(lso.getDate() - 1);
    return currentTime >= lsm && currentTime < lso;
  })();

  // Jummah info visibility: from Thursday after Asr through Friday (except Jummah hero)

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
    // Show on Thursday from Asr onward, and on Friday only before Asr begins.
    const thursdayAsrStart = asrPrayer?.timeDate;
    if (isThursday && thursdayAsrStart && currentTime >= thursdayAsrStart) return true;
    if (!isFriday) return false;
    const asrStart = asrPrayer?.timeDate;
    if (!asrStart) return true;
    return currentTime < asrStart;
  })();

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
  const effectiveHeroJamaatValue = (() => {
    if (isEidHeroWindow) return '';
    if (isFridayPostZawaal) return '';
    if (isSpecialHeroPhase) return '';
    if (hasExplicitHeroMidEvent) return '';
    if (heroPrayerSupportsJamaat && currentPrayerIqamah) return currentPrayerIqamah;
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
        note: `${prefix}Eid Prayers: ${eidInfoLine}`,
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
  const effectiveHeroSkyGradientColors = fullDayTimelineProgress != null
    ? getContinuousDaySkyGradient(fullDayTimelineProgress, effectiveHeroPrayerName)
    : getInterpolatedPrayerGradient(effectiveHeroPrayerName, effectiveHeroProgress);
  const effectiveHeroGradientColors: readonly [string, string] = nightMode
    ? [HERO_DESIGN_TOKENS.heroTopNight, HERO_DESIGN_TOKENS.heroTopNight]
    : [HERO_DESIGN_TOKENS.heroTop, HERO_DESIGN_TOKENS.heroTop];

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

  const backGregorianWeekday = currentTime.toLocaleDateString('en-GB', { weekday: 'short' });
  const backGregorianDate = currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const backGregorian = `${backGregorianWeekday} ${backGregorianDate}`;
  const hijriYear = data?.hijriDate?.match(/\b(\d{4})\b/)?.[1] ?? '';
  const backHijri = [hijriDayNum, rawHijriMonthName, hijriYear ? `${hijriYear} AH` : ''].filter(Boolean).join(' ');
  const headerHijriLine = backHijri || 'Hijri date loading...';
  const drawerDateLine = `${currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })} | ${hijriDayNum || '--'} ${rawHijriMonthName || 'Hijri'}`;

  // Row-state priority keeps one clear focus for elders: current > next > past/future.
  const drawerPrayerRows = React.useMemo(() => buildPrayerDrawerRows({
    prayers: data?.prayers,
    now: currentTime,
    currentPrayerName: activePrayer?.name,
    nextPrayerName: effectiveNextPrayerName,
  }), [data?.prayers, currentTime, activePrayer?.name, effectiveNextPrayerName]);

  const homeInlinePrayerRows = React.useMemo<DrawerPrayerRow[]>(() => {
    const prayerMap = new Map((data?.prayers ?? []).map((prayer) => [prayer.name, prayer] as const));
    const drawerStateMap = new Map(drawerPrayerRows.map((row) => [row.name, row.state] as const));
    const jumuahRow = drawerPrayerRows.find((row) => row.name === 'Jumuah');
    const isFriday = currentTime.getDay() === 5;

    const resolveState = (name: string, timeDate?: Date): DrawerPrayerRow['state'] => {
      const mapped = drawerStateMap.get(name);
      if (mapped) return mapped;
      if (activePrayer?.name === name) return 'current';
      if (effectiveNextPrayerName === name) return 'next';
      if (timeDate && timeDate.getTime() < currentTime.getTime()) return 'past';
      return 'future';
    };

    const fromPrayer = (name: string): DrawerPrayerRow => {
      const prayer = prayerMap.get(name);
      return {
        name,
        begins: prayer?.time || '--:--',
        jamaat: prayer?.iqamah || '--:--',
        tomorrowBegins: prayer?.tomorrowTime,
        tomorrowJamaat: prayer?.tomorrowIqamah,
        state: resolveState(name, prayer?.timeDate),
      };
    };

    const dhuhrPrayer = prayerMap.get('Dhuhr');
    const fridayRow: DrawerPrayerRow = {
      name: 'Jummah',
      begins: jumuahRow?.begins || dhuhrPrayer?.time || '--:--',
      jamaat: jumuahRow?.jamaat || dhuhrPrayer?.iqamah || '--:--',
      jamaat2: jumuahRow?.jamaat2,
      tomorrowBegins: jumuahRow?.tomorrowBegins,
      tomorrowJamaat: jumuahRow?.tomorrowJamaat,
      state: jumuahRow?.state || resolveState('Dhuhr', dhuhrPrayer?.timeDate),
    };

    return [
      fromPrayer('Fajr'),
      fromPrayer('Ishraq'),
      isFriday ? fridayRow : fromPrayer('Dhuhr'),
      fromPrayer('Asr'),
      fromPrayer('Maghrib'),
      fromPrayer('Isha'),
    ];
  }, [data?.prayers, drawerPrayerRows, currentTime, activePrayer?.name, effectiveNextPrayerName]);

  const homeInlineSpecialSchedule = React.useMemo(() => {
    if (activeEidType) {
      const eidTimes = Array.from(new Set((resolvedEidJamaats ?? []).filter(Boolean))).slice(0, 4);
      if (eidTimes.length === 0) return null;

      return {
        kind: 'eid' as const,
        title: activeEidType === 'eid_al_fitr' ? 'Eid ul Fitr Jamaat' : 'Eid ul Adha Jamaat',
        times: eidTimes,
      };
    }

    // Jummah times are already presented in the inline prayer tile,
    // so avoid rendering a second special strip with the same times.
    return null;
  }, [activeEidType, resolvedEidJamaats]);

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
  };
  void heroLegacyState;

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshPrayerTimes(),
        loadCommunityUpdates(),
        loadDonationOptions(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [
    loadDonationOptions,
    loadCommunityUpdates,
    refreshPrayerTimes,
  ]);

  const homeCommunityItems = React.useMemo<CommunityUpdateItem[]>(() => {
    return communityUpdates.map((row) => {
      const categoryLabel = (row.category || 'Notice').trim();
      const normalized = categoryLabel.toLowerCase();
      const category = row.pinned && (normalized === 'general' || normalized === 'news')
        ? 'Important'
        : categoryLabel;

      return {
        id: row.id,
        category,
        title: row.title,
        date: new Date(row.published_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        sortTime: Date.parse(row.published_at || '') || 0,
        priority: row.pinned ? 100 : 0,
        isPinned: row.pinned,
        excerpt: row.body,
      };
    });
  }, [communityUpdates]);

  const oneOffDonationOptions = React.useMemo(
    () => donationOptions.filter((option) => option.frequency === 'one-off'),
    [donationOptions],
  );

  const monthlyDonationOptions = React.useMemo(
    () => donationOptions.filter((option) => option.frequency === 'monthly'),
    [donationOptions],
  );

  const handleSelectDonationOption = useCallback((option: AppDonationOption) => {
    setSelectedDonationOption(option);
    setDonationStatusMessage(null);
    setDonationConfirmation(null);
  }, []);

  const openDonationCheckoutInBrowser = useCallback(async (url: string): Promise<boolean> => {
    const normalizedUrl = (url || '').trim();
    if (!normalizedUrl) return false;

    try {
      const canOpen = await Linking.canOpenURL(normalizedUrl);
      if (!canOpen) return false;
      await Linking.openURL(normalizedUrl);
      return true;
    } catch (error) {
      console.error('[Donate] browser checkout fallback failed:', error);
      return false;
    }
  }, []);

  const submitDonationCheckout = useCallback(async () => {
    if (!selectedDonationOption || donationLoading) return;

    try {
      setDonationLoading(true);
      setDonationStatusMessage('Preparing secure checkout...');

      const checkoutUrl = await createDonationCheckoutUrl({
        priceSlot: selectedDonationOption.priceSlot,
        stripePriceId: selectedDonationOption.stripePriceId,
        optionId: selectedDonationOption.id,
        frequency: selectedDonationOption.frequency,
      });

      if (Platform.OS === 'web') {
        setDonationStatusMessage('Embedded Stripe checkout is only available in the mobile app. Use Android or iPhone for in-app payment.');
        return;
      }

      if (Platform.OS === 'ios') {
        donationOutcomeHandledRef.current = false;
        const openedInBrowser = await openDonationCheckoutInBrowser(checkoutUrl);
        if (openedInBrowser) {
          setDonationCheckoutUrl(null);
          setShowDonationOptions(true);
          setDonationModalVisible(false);
          return;
        }

        setDonationStatusMessage('Unable to bring up Stripe checkout automatically. Please try again.');
        Alert.alert('Checkout error', 'Unable to bring up Stripe checkout. Please try again.');
        return;
      }

      donationOutcomeHandledRef.current = false;
      setDonationStatusMessage(null);
      setShowDonationOptions(false);
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
  }, [donationLoading, openDonationCheckoutInBrowser, selectedDonationOption]);

  const resetDonationFlowToSelection = useCallback(() => {
    donationOutcomeHandledRef.current = false;
    setDonationCheckoutUrl(null);
    setShowDonationOptions(true);
    setDonationStatusMessage(null);
    setSelectedDonationOption(null);
  }, []);

  const handleDonationSuccess = useCallback(() => {
    if (donationOutcomeHandledRef.current) return;
    donationOutcomeHandledRef.current = true;

    const confirmedOptionTitle = selectedDonationOption?.title ?? 'Donation';
    const confirmedAtIso = new Date().toISOString();

    setDonationModalVisible(false);
    setDonationConfirmation(null);
    setDonationCheckoutUrl(null);
    setShowDonationOptions(true);
    setDonationStatusMessage(null);
    setSelectedDonationOption(null);
    router.push({
      pathname: '/(tabs)/donation-confirmation',
      params: {
        title: confirmedOptionTitle,
        atIso: confirmedAtIso,
      },
    } as never);
  }, [router, selectedDonationOption?.title]);

  const handleDonationCancel = useCallback(() => {
    if (donationOutcomeHandledRef.current) return;
    donationOutcomeHandledRef.current = true;
    resetDonationFlowToSelection();
    setDonationStatusMessage('Donation was cancelled before payment completion.');
  }, [resetDonationFlowToSelection]);

  const handleDonationWebMessage = useCallback((event: WebViewMessageEvent) => {
    const rawData = event.nativeEvent.data;
    if (!rawData) return;

    try {
      const parsed = JSON.parse(rawData) as { type?: string };
      if (parsed.type === 'donation_success') {
        handleDonationSuccess();
        return;
      }
      if (parsed.type === 'donation_cancel') {
        handleDonationCancel();
      }
    } catch {
      // ignore malformed message payloads
    }
  }, [handleDonationCancel, handleDonationSuccess]);

  const closeDonationModal = useCallback(() => {
    setDonationModalVisible(false);
    setDonationConfirmation(null);
    resetDonationFlowToSelection();
  }, [resetDonationFlowToSelection]);

  const handleDonationModalClose = useCallback(() => {
    if (showDonationOptions) {
      closeDonationModal();
      return;
    }

    resetDonationFlowToSelection();
  }, [closeDonationModal, resetDonationFlowToSelection, showDonationOptions]);

  const openDonationCheckout = useCallback(() => {
    setDonationConfirmation(null);
    resetDonationFlowToSelection();
    void loadDonationOptions();
    setDonationModalVisible(true);
  }, [loadDonationOptions, resetDonationFlowToSelection]);

  useEffect(() => {
    const openDonationParam = Array.isArray(openDonation) ? openDonation[0] : openDonation;
    if (openDonationParam !== '1') {
      donationDeepLinkHandledRef.current = false;
      return;
    }

    if (donationDeepLinkHandledRef.current) return;
    donationDeepLinkHandledRef.current = true;
    openDonationCheckout();
  }, [openDonation, openDonationCheckout]);

  const closePrayerDrawer = useCallback(() => {
    if (Platform.OS === 'web') {
      setWebPrayerDrawerVisible(false);
      return;
    }
    prayerSheetRef.current?.close();
  }, []);

  const openPrayerCalendar = useCallback(() => {
    closePrayerDrawer();
    router.push('/(tabs)/prayer');
  }, [closePrayerDrawer, router]);

  return (
    <>
    <ScrollView
      style={[styles.container, N && { backgroundColor: N.bg }]}
      contentContainerStyle={[styles.content, N && { backgroundColor: N.bg }]}
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
      <View style={[styles.heroHeader, { paddingTop: insets.top + 6 }]}> 
        <LinearGradient
          colors={effectiveHeroSkyGradientColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <LinearGradient
          colors={PRAYER_SKY_DEPTH_OVERLAY}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none' }]}
        />

        <View style={styles.topNav}>
          <View style={styles.topNavBrand}>
            <View style={styles.topNavLogoWrap}>
              <Image
                source={require('@/assets/images/masjid-logo.png')}
                style={styles.topNavLogo}
                contentFit="contain"
              />
            </View>
            <View style={styles.topNavText}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.84}
                style={styles.topNavName}
              >
                Jami&apos; Masjid Noorani
              </Text>
              <Text numberOfLines={1} style={styles.topNavDateLine}>{backGregorian}</Text>
              <Text numberOfLines={1} style={styles.topNavHijriLine}>{headerHijriLine}</Text>
            </View>
          </View>
          <View style={styles.headerControls}>
            <TouchableOpacity
              style={styles.modePill}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <MaterialIcons
                name="settings"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.modePillText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 3-part hero composition: live prayer + support cards ─────── */}
        <View style={heroNewStyles.heroInnerWrap}>
          <LinearGradient
            colors={effectiveHeroGradientColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={heroNewStyles.heroGradient}
          >
            <Image
              source={require('@/assets/images/masjid/JMN_page_7.png')}
              style={heroNewStyles.heroBackdropImage}
              contentFit="cover"
            />
            <View pointerEvents="none" style={heroNewStyles.heroBackdropUniformLayer} />

            {/* Main Live Prayer Section */}
            <View style={heroNewStyles.mainSection}>
              <HeroPrayerStatus
                prayerName={effectiveHeroPrayerName}
                stateLabel={heroTimelineState.stateLabel}
                countdownText={heroTimelineState.countdownText}
                jamaatTimeText={heroTimelineState.jamaatTimeText}
                nextPrayerName={effectiveNextPrayerName}
                nextPrayerTime={nextInfo?.prayer.time ?? '--:--'}
                showJamaatAnchor={heroTimelineState.showJamaatAnchor}
              />
              {effectiveHeroCountdownInfo.note ? (
                <HeroNewsBar
                  note={effectiveHeroCountdownInfo.note}
                  style={heroNewStyles.heroNewsBar}
                />
              ) : null}
              <HeroPrayerTimeline
                progress={heroTimelineState.progress}
                startTimeText={heroTimelineState.startTimeText}
                jamaatTimeText={heroTimelineState.jamaatTimeText}
                endTimeText={heroTimelineState.endTimeText}
                startLabel={heroTimelineState.startLabel}
                jamaatLabel={heroTimelineState.jamaatLabel}
                endLabel={heroTimelineState.endLabel}
                startPrayerName={heroTimelineState.startPrayerName}
                endPrayerName={heroTimelineState.endPrayerName}
                showJamaatAnchor={heroTimelineState.showJamaatAnchor}
                nightMode={nightMode}
                pulseMarker={heroTimelineState.pulseMarker}
              />
            </View>

            <HomeInlinePrayerTimesSection
              rows={homeInlinePrayerRows}
              nightMode={nightMode}
              specialSchedule={homeInlineSpecialSchedule}
              embedded
            />
          </LinearGradient>
        </View>
      </View>

      <HeroToDaySectionBridge nightMode={nightMode} />

      <View style={[styles.dayCanvas, N && { backgroundColor: N.bg, marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
        <View style={styles.dayCanvasContent}>
          <View style={[styles.body, N && { backgroundColor: 'transparent' }]}> 
            <View style={{ marginBottom: Spacing.sm }}>
              <HeroDonationCard nightMode={nightMode} onPress={openDonationCheckout} />
            </View>

            <View style={{ marginBottom: Spacing.sm }}>
              <HomeQuickAccessSection nightMode={nightMode} />
            </View>

            <View style={{ marginTop: Spacing.xs, marginBottom: Spacing.xs }}>
              <CommunityUpdatesSection
                title="Community Updates"
                items={homeCommunityItems}
                isLoading={communityLoading}
                nightMode={nightMode}
                onPressSeeAll={() => router.push('/(tabs)/events')}
                onPressItem={(item) => router.push({
                  pathname: '/(tabs)/events',
                  params: { announcementId: item.id },
                } as any)}
              />
            </View>

            <View style={{ marginTop: Spacing.xs }}>
              <SacredContentModule
                hadithLabel={hadithTitle}
                hadithLabelUrdu={hadithTitleUrdu}
                hadithPreview={hadithPreview}
                hadithPreviewUrdu={hadithPreviewUrdu}
                hadithSource={hadithSource}
                hadithSourceUrdu={hadithSourceUrdu}
                onPressHadith={() => setActiveSacredPanel('hadith')}
                verseLabel={verseTitle}
                verseLabelUrdu={verseTitleUrdu}
                versePreview={versePreview}
                versePreviewUrdu={versePreviewUrdu}
                verseReference={verseReference}
                onPressVerse={() => setActiveSacredPanel('verse')}
                hadithExpandHint={expandHintEn}
                hadithExpandHintUrdu={expandHintUr}
                verseExpandHint={expandHintEn}
                verseExpandHintUrdu={expandHintUr}
                isLoading={false}
                nightMode={nightMode}
              />
            </View>

            <View style={styles.forYouFadeZone}>
              <HomeForYouTodaySection
                prayers={data?.prayers ?? []}
                nightMode={nightMode}
                currentTime={currentTime}
                hijriDay={hijriDayInt}
                hijriMonthName={rawHijriMonthName}
              />
            </View>

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

    <SacredReadingSheet
      visible={activeSacredPanel !== null}
      title={activeSheetTitle}
      titleUrdu={activeSheetTitleUrdu}
      narratorText={activeSheetNarrator}
      fullText={activeSheetText}
      reference={activeSheetReference}
      referenceUrdu={activeSheetReferenceUrdu}
      secondaryText={activeSheetArabic}
      showUrduToggle={activeSacredPanel !== null}
      onRequestUrduText={activeSacredPanel ? requestActiveSheetUrduText : undefined}
      footerActionLabel={activeSacredPanel === 'hadith' ? 'Open full Hadith' : undefined}
      onFooterAction={
        activeSacredPanel
          ? () => {
              const target = activeSacredPanel;
              setActiveSacredPanel(null);
              router.push((target === 'hadith' ? '/(tabs)/duas' : '/(tabs)/quran') as any);
            }
          : undefined
      }
      secondaryFooterActionLabel={activeSacredPanel === 'verse' ? 'Tafsir' : undefined}
      onSecondaryFooterAction={activeSacredPanel === 'verse' ? openQuranReminderTafsir : undefined}
      onClose={() => setActiveSacredPanel(null)}
      nightMode={nightMode}
    />

    <Modal
      visible={donationModalVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleDonationModalClose}
    >
      <View style={styles.donationModalRoot}>
        <Image
          source={require('@/assets/images/masjid/JMN_page_7.png')}
          style={styles.donationModalBgImage}
          contentFit="cover"
        />
        <View style={styles.donationModalBgOverlay} />
        <View style={styles.donationModalContentLayer}>
          <TouchableOpacity
            onPress={handleDonationModalClose}
            style={[
              styles.donationModalCloseBtn,
              styles.donationModalCloseFloating,
              { top: insets.top + 10 },
            ]}
            activeOpacity={0.85}
          >
            <MaterialIcons name="close" size={20} color="#123524" />
            <Text style={styles.donationModalCloseText}>Close</Text>
          </TouchableOpacity>

        {showDonationOptions ? (
          <>
          <ScrollView
            style={styles.donationOptionsWrap}
            contentContainerStyle={[
              styles.donationOptionsContent,
              {
                paddingTop: insets.top + 58,
                paddingBottom: Math.max(insets.bottom + 20, 28),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.donationOptionsTitle}>Choose Donation Amount</Text>

            {donationConfirmation ? (
              <View style={styles.donationConfirmationCard}>
                <Text style={styles.donationConfirmationTitle}>Donation confirmed</Text>
                <Text style={styles.donationConfirmationBody}>
                  JazakAllahu Khayran. Your {donationConfirmation.optionTitle} donation was completed successfully.
                </Text>
                <Text style={styles.donationConfirmationMeta}>
                  Time: {new Date(donationConfirmation.atIso).toLocaleString('en-GB')}
                </Text>
                <TouchableOpacity
                  style={styles.donationConfirmationAction}
                  onPress={closeDonationModal}
                  activeOpacity={0.9}
                >
                  <Text style={styles.donationConfirmationActionText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}

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

            {!selectedDonationOption ? (
              <View style={styles.donationStatusNotice}>
                <Text style={styles.donationStatusNoticeText}>Select an amount, then choose Gift Aid before checkout.</Text>
              </View>
            ) : null}

            <View style={styles.donationOptionSection}>
              <Text style={styles.donationOptionSectionTitle}>One-off donation</Text>
              <View style={styles.donationOptionGrid}>
                {oneOffDonationOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.donationOptionBtn,
                      selectedDonationOption?.id === option.id && styles.donationOptionBtnSelected,
                    ]}
                    activeOpacity={0.9}
                    onPress={() => handleSelectDonationOption(option)}
                    disabled={donationLoading}
                  >
                    {option.campaignLabel ? (
                      <Text style={styles.donationOptionBadge}>{option.campaignLabel}</Text>
                    ) : null}
                    <Text style={styles.donationOptionTitle}>{option.title}</Text>
                    <Text style={styles.donationOptionSub}>{option.subtitle || option.campaignCopy || 'Support the masjid.'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.donationOptionSection}>
              <Text style={styles.donationOptionSectionTitle}>Monthly subscription</Text>
              <View style={styles.donationOptionGrid}>
                {monthlyDonationOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.donationOptionBtn,
                      selectedDonationOption?.id === option.id && styles.donationOptionBtnSelected,
                    ]}
                    activeOpacity={0.9}
                    onPress={() => handleSelectDonationOption(option)}
                    disabled={donationLoading}
                  >
                    {option.campaignLabel ? (
                      <Text style={styles.donationOptionBadge}>{option.campaignLabel}</Text>
                    ) : null}
                    <Text style={styles.donationOptionTitle}>{option.title}</Text>
                    <Text style={styles.donationOptionSub}>{option.subtitle || option.campaignCopy || 'Monthly support for the masjid.'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {!donationOptionsLoading && oneOffDonationOptions.length === 0 && monthlyDonationOptions.length === 0 ? (
              <View style={styles.donationStatusNotice}>
                <Text style={styles.donationStatusNoticeText}>No active donation options are available right now.</Text>
              </View>
            ) : null}

            {(donationLoading || donationOptionsLoading) ? (
              <View style={{ marginTop: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0B6B45" />
                <Text style={styles.donationWebviewLoadingText}>
                  {donationOptionsLoading ? 'Loading donation options...' : 'Preparing checkout...'}
                </Text>
              </View>
            ) : null}
          </ScrollView>
          {selectedDonationOption ? (
            <View style={styles.donationGiftAidPopupWrap}>
              <TouchableOpacity
                style={styles.donationGiftAidBackdrop}
                activeOpacity={1}
                onPress={() => {
                  if (donationLoading) return;
                  setSelectedDonationOption(null);
                  setDonationStatusMessage(null);
                }}
              />
              <View
                style={[
                  styles.donationGiftAidCard,
                  styles.donationGiftAidPopupCard,
                  { marginBottom: Math.max(insets.bottom + 12, 16) },
                ]}
              >
                <Text style={styles.donationGiftAidTitle}>Donation details</Text>
                <Text style={styles.donationGiftAidSubtitle}>
                  Option: {selectedDonationOption.title}
                </Text>

                <Text style={styles.donationGiftAidHint}>
                  Gift Aid opt-in will be asked on the secure Stripe payment page at time of payment.
                </Text>

                <View style={styles.donationGiftAidActionsRow}>
                  <TouchableOpacity
                    style={styles.donationGiftAidContinueBtn}
                    onPress={submitDonationCheckout}
                    disabled={donationLoading}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.donationGiftAidContinueText}>Continue to secure checkout</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.donationGiftAidChangeBtn}
                    onPress={() => {
                      setSelectedDonationOption(null);
                      setDonationStatusMessage(null);
                    }}
                    disabled={donationLoading}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.donationGiftAidChangeText}>Change amount</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
          </>
        ) : donationCheckoutUrl ? (
          <View style={styles.donationCheckoutContainer}>
            <View style={styles.donationCheckoutHeaderBar}>
              <TouchableOpacity
                style={styles.donationCheckoutHeaderButton}
                onPress={() => {
                  if (donationCheckoutUrl) {
                    void (async () => {
                      const openedInBrowser = await openDonationCheckoutInBrowser(donationCheckoutUrl);
                      if (!openedInBrowser) {
                        Alert.alert('Checkout error', 'Unable to open Stripe checkout in your browser.');
                      }
                    })();
                  }
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="open-in-new" size={16} color="#0B6B45" />
                <Text style={styles.donationCheckoutHeaderButtonText}>Open in browser</Text>
              </TouchableOpacity>
            </View>
            <WebView
              style={styles.donationCheckoutWebview}
              source={{ uri: donationCheckoutUrl }}
              startInLoadingState
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              injectedJavaScript={DONATION_CHECKOUT_INJECTED_SCRIPT}
              renderLoading={() => (
                <View style={styles.donationWebviewLoadingOverlay}>
                  <ActivityIndicator size="large" color="#0B6B45" />
                  <Text style={styles.donationWebviewLoadingText}>Opening Stripe checkout...</Text>
                </View>
              )}
              onMessage={handleDonationWebMessage}
            onNavigationStateChange={(navState) => {
              if (isDonationSuccessNavigation(navState.url)) {
                handleDonationSuccess();
                return;
              }

              if (isDonationCancelNavigation(navState.url)) {
                handleDonationCancel();
              }
            }}
            onShouldStartLoadWithRequest={(request) => {
              if (isDonationSuccessNavigation(request.url)) {
                handleDonationSuccess();
                return false;
              }

              if (isDonationCancelNavigation(request.url)) {
                handleDonationCancel();
                return false;
              }

              return true;
            }}
            onError={() => {
              if (isNativeMobileCheckoutPlatform && donationCheckoutUrl) {
                void (async () => {
                  const openedInBrowser = await openDonationCheckoutInBrowser(donationCheckoutUrl);
                  if (openedInBrowser) {
                    setDonationCheckoutUrl(null);
                    setShowDonationOptions(true);
                    setDonationModalVisible(false);
                    return;
                  }

                  Alert.alert('Checkout error', 'Unable to load Stripe checkout. Please try again.');
                })();
                return;
              }

              Alert.alert('Checkout error', 'Unable to load Stripe checkout. Please try again.');
            }}
            />
          </View>
        ) : (
          <View style={styles.donationWebviewLoadingOverlay}>
            <ActivityIndicator size="large" color="#0B6B45" />
          </View>
        )}
        </View>
      </View>
    </Modal>

    </>
  );
}

// ── Hero inner gradient card styles ──────────────────────────────────────
const heroNewStyles = StyleSheet.create({
  heroInnerWrap: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'visible',
    ...(Platform.OS === 'web'
      ? { boxShadow: 'none' }
      : {
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        }),
    elevation: 0,
  },
  softSeparator: {
    height: 1,
    backgroundColor: 'rgba(236,244,238,0.08)',
    marginHorizontal: -18,
    borderRadius: 1,
    marginBottom: 4,
  },
  heroGradient: {
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 14,
  },
  heroBackdropImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  heroBackdropUniformLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 66, 46, 0.42)',
  },
  mainSection: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  heroNewsBar: {
    width: '100%',
    marginTop: 8,
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
    backgroundColor: 'rgba(232,212,139,0.18)',
    marginHorizontal: -18,
    marginBottom: 8,
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
    paddingTop: SCREEN_WIDTH < 390 ? 7.5 : 9.5,
  },
  islamicFrame: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(208,234,217,0.22)',
    borderRadius: 16,
    position: 'relative',
    overflow: 'visible',
    backgroundColor: 'rgba(5,48,33,0.10)',
  },
  islamicCorner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: 'rgba(232,225,214,0.40)',
  },
  islamicCornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 4,
  },
  islamicCornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 4,
  },
  islamicCornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 4,
  },
  islamicCornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 4,
  },
  islamicTopDiamond: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    width: 16,
    height: 16,
    backgroundColor: 'rgba(42,100,70,1)',
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(208,234,217,0.40)',
  },
  islamicTopDiamondInner: {
    width: 5,
    height: 5,
    borderWidth: 1,
    borderColor: 'rgba(232,225,214,0.55)',
    transform: [{ rotate: '0deg' }],
  },
  currentPrayerLabel: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.25,
    color: 'rgba(232,245,238,0.86)',
  },
  currentPrayerLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    backgroundColor: 'rgba(8,45,33,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(166,226,194,0.20)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  currentPrayerLabelIcon: {
    marginRight: 5,
  },
  prayerName: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: HERO_DESIGN_TOKENS.textPrimary,
  },
  jamaatPill: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '92%',
    maxWidth: 420,
    minHeight: 46,
    backgroundColor: 'rgba(7,57,43,0.74)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(224,241,231,0.16)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 3px 10px rgba(1,19,13,0.18)' }
      : {
          shadowColor: '#01130D',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
        }),
    elevation: 2,
  },
  jamaatPillIconWrap: {
    width: 27,
    height: 27,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(237,230,212,0.94)',
  },
  jamaatPillText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    color: HERO_DESIGN_TOKENS.textPrimary,
    letterSpacing: 0.1,
    flexShrink: 1,
    textAlign: 'center',
  },
  stateLabel: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: HERO_DESIGN_TOKENS.mintSoft,
  },
  stateLabelSoon: {
    color: '#F6E6B4',
  },
  stateLabelNow: {
    color: '#FFE8A6',
  },
  countdownSectionPill: {
    marginTop: 12,
    alignSelf: 'center',
  },
  countdownCockpit: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    position: 'relative',
  },
  countdownCockpitNoPill: {
    marginTop: 16,
  },
  countdownTile: {
    width: 86,
    height: 86,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(7,12,13,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(151, 236, 196, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#00131B',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  countdownTileHighlight: {
    position: 'absolute',
    top: 4,
    left: 5,
    right: 5,
    height: '36%',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  countdownTileShade: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    right: 6,
    height: '30%',
    borderRadius: 10,
    backgroundColor: 'rgba(2,10,14,0.2)',
  },
  countdownOutlineTrack: {
    ...StyleSheet.absoluteFillObject,
    margin: 1,
    borderRadius: 12,
  },
  countdownOutlineTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 2,
    borderRadius: 2,
    shadowOpacity: 0.47,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  countdownOutlineRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 2,
    borderRadius: 2,
    shadowOpacity: 0.47,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  countdownOutlineBottom: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    height: 2,
    borderRadius: 2,
    shadowOpacity: 0.47,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  countdownOutlineLeft: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 2,
    borderRadius: 2,
    shadowOpacity: 0.47,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  countdownDigit: {
    fontSize: 34,
    lineHeight: 37,
    fontWeight: '800',
    color: HERO_DESIGN_TOKENS.textPrimary,
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: 0.45,
    textAlign: 'center',
  },
  countdownUnit: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.95,
    color: 'rgba(207,214,210,0.8)',
    textTransform: 'uppercase',
  },
  countdownSeparator: {
    marginHorizontal: 8,
    fontSize: 22,
    lineHeight: 33,
    fontWeight: '600',
    color: 'rgba(210,221,214,0.34)',
  },
  countdownText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 46,
    lineHeight: 50,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: -0.3,
  },
  simpleDivider: {
    marginTop: 12,
    width: '100%',
    height: 1,
    backgroundColor: HERO_DESIGN_TOKENS.dividerSoft,
    alignItems: 'center',
  },
  simpleDividerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -3.5,
    backgroundColor: 'rgba(244,239,231,0.72)',
  },
  footerRow: {
    marginTop: 10,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: SCREEN_WIDTH < 390 ? 14 : 15,
    lineHeight: SCREEN_WIDTH < 390 ? 18 : 20,
    fontWeight: '500',
    color: 'rgba(237,231,222,0.68)',
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'center',
  },
  footerLabel: {
    color: 'rgba(237,231,222,0.70)',
  },
  footerMuted: {
    color: 'rgba(237,231,222,0.56)',
  },
  footerTime: {
    fontWeight: '800',
    color: HERO_DESIGN_TOKENS.textPrimary,
  },
  timelineBlock: {
    width: '100%',
    marginTop: 16,
  },
  trackShell: {
    paddingHorizontal: 2,
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
    height: 2.5,
    borderRadius: 999,
    backgroundColor: 'rgba(236,246,241,0.72)',
  },
  trackLineNight: {
    backgroundColor: 'rgba(234,243,237,0.52)',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 2.5,
    borderRadius: 999,
    backgroundColor: '#49C16E',
  },
  anchorDot: {
    position: 'absolute',
    left: 0,
    top: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -4,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(244,239,231,0.50)',
  },
  anchorDotFilled: {
    backgroundColor: 'rgba(244,239,231,0.85)',
    borderWidth: 0,
  },
  anchorDotMiddle: {
    left: '50%',
    marginLeft: -4,
  },
  anchorDotRight: {
    left: undefined,
    right: 0,
  },
  markerPosition: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -(HERO_LOGO_MARKER_SIZE / 2),
  },
  markerOuter: {
    width: HERO_LOGO_MARKER_SIZE,
    height: HERO_LOGO_MARKER_SIZE,
    borderRadius: HERO_LOGO_MARKER_SIZE / 2,
    backgroundColor: 'rgba(23,70,50,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(252,248,242,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 2px rgba(7,20,14,0.06)' }
      : {
          shadowColor: '#07140E',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 2,
        }),
    elevation: 2,
  },
  markerOuterNight: {
    ...(Platform.OS === 'web' ? { boxShadow: '0px 1px 2px rgba(7,20,14,0.10)' } : { shadowOpacity: 0.10 }),
  },
  markerOuterPulse: {
    // scale-only pulse; no shadow changes
  },
  markerImage: {
    width: 18,
    height: 18,
    tintColor: 'rgba(197,246,188,0.96)',
    opacity: 0.96,
  },
  anchorLabelsRow: {
    marginTop: -3,
    marginBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
  },
  anchorLabelText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: 'rgba(236,246,241,0.9)',
  },
  anchorLabelTextCenter: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -28 }],
    width: 56,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
});

// ── Hero support card styles ──────────────────────────────────────────────
const heroSupportStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: HERO_DESIGN_TOKENS.donationSurface,
    marginTop: -2,
    marginHorizontal: -6,
    marginBottom: 6,
    height: 118,
    borderWidth: 1,
    borderColor: 'rgba(232,212,139,0.14)',
  },
  donateInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  donateFrame: {
    position: 'absolute',
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
    borderWidth: 1,
    borderColor: 'rgba(232,212,139,0.10)',
    borderRadius: 14,
  },
  donateInfoLogo: {
    opacity: 0.07,
    transform: [{ scale: 1.05 }],
  },
  donateInfoPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
    transform: [{ scale: 1.08 }],
  },
  donateInfoSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  donateInfoTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,20,15,0.08)',
  },
  donateInfoOrb: {
    position: 'absolute',
    width: 168,
    height: 168,
    borderRadius: 84,
    top: -82,
    right: -34,
    backgroundColor: 'rgba(232,212,139,0.10)',
  },
  donateInfoOrbSecondary: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
    bottom: -72,
    left: -26,
    backgroundColor: 'rgba(118, 197, 148, 0.09)',
  },
  donateInfoVignette: {
    ...StyleSheet.absoluteFillObject,
  },
  donateSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
    display: 'none',
  },
  donateSectionLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(212,175,55,0.92)',
    display: 'none',
  },
  donatePhotoOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  donatePhotoBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#10261C',
  },
  donatePhotoImage: {
    top: -16,
    bottom: -16,
    left: -20,
    right: -20,
  },
  donatePhotoTextBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-end',
    gap: 4,
  },
  donatePhotoEyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: HERO_DESIGN_TOKENS.goldSoft,
  },
  donatePhotoLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: HERO_DESIGN_TOKENS.textPrimary,
    lineHeight: 17,
    maxWidth: 188,
  },
  donateLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 5,
    flex: 1,
    minWidth: 0,
    zIndex: 2,
  },
  donateKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  donateKickerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HERO_DESIGN_TOKENS.goldSoft,
  },
  donateKicker: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: 'rgba(244,232,188,0.92)',
  },
  donateTextBlock: {
    flex: 1,
    gap: 1,
  },
  donateLogoBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
  },
  donateLogoImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
  },
  donateEyebrow: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia' }),
    fontSize: 24,
    fontWeight: Platform.OS === 'android' ? '800' : '700',
    letterSpacing: 0.3,
    color: HERO_DESIGN_TOKENS.goldSoft,
    lineHeight: 27,
    textShadowColor: 'rgba(5,17,12,0.34)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: 170,
  },
  donateName: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(237,231,222,0.86)',
    lineHeight: 15,
    maxWidth: 188,
  },
  donateActionCol: {
    width: 114,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    marginBottom: 1,
  },
  donateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#D6C17D',
    borderRadius: 999,
    minHeight: 30,
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0,0,0,0.16)' }
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.16,
          shadowRadius: 8,
        }),
    elevation: 3,
  },
  donateBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#143F2D',
    letterSpacing: 0.2,
  },
  donateActionNote: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(237,231,222,0.70)',
    letterSpacing: 0.15,
    textAlign: 'center',
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
  dynamicTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: HERO_DESIGN_TOKENS.textPrimary,
    lineHeight: 16,
  },
  dynamicSub: {
    fontSize: 10,
    fontWeight: '600',
    color: HERO_DESIGN_TOKENS.textTertiary,
    lineHeight: 13,
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
  dynamicViewBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: HERO_DESIGN_TOKENS.mintSoft,
    letterSpacing: 0.3,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xl, backgroundColor: Colors.headerBg },
  donationModalRoot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  donationModalBgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  donationModalBgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(236,244,238,0.88)',
  },
  donationModalContentLayer: {
    flex: 1,
  },
  donationCheckoutContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  donationCheckoutHeaderBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#F5FAF7',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(11,107,69,0.12)',
  },
  donationCheckoutHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(11,107,69,0.16)',
  },
  donationCheckoutHeaderButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B6B45',
  },
  donationCheckoutWebview: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  donationModalCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#DDEDE3',
  },
  donationModalCloseFloating: {
    position: 'absolute',
    right: 14,
    zIndex: 5,
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
    backgroundColor: Colors.background,
  },
  donationWebviewLoadingText: {
    fontSize: 14,
    color: '#2C4A3D',
    fontWeight: '600',
  },
  donationOptionsWrap: {
    flex: 1,
  },
  donationOptionsContent: {
    paddingHorizontal: 20,
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
  donationConfirmationCard: {
    backgroundColor: '#E9F7EF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(11,107,69,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  donationConfirmationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A2A1B',
    marginBottom: 4,
  },
  donationConfirmationBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#214734',
    marginBottom: 6,
  },
  donationConfirmationMeta: {
    fontSize: 12,
    color: '#2D5B43',
    marginBottom: 2,
  },
  donationConfirmationAction: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#0B6B45',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  donationConfirmationActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  donationGiftAidCard: {
    backgroundColor: '#F6FBF8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(11,107,69,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  donationGiftAidPopupWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  donationGiftAidBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,31,21,0.22)',
  },
  donationGiftAidPopupCard: {
    zIndex: 1,
    shadowColor: '#102E20',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  donationGiftAidTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#123524',
  },
  donationGiftAidSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#2D5B43',
    marginBottom: 8,
  },
  donationGiftAidHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#355E4B',
    marginBottom: 8,
  },
  donationGiftAidActionsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  donationGiftAidContinueBtn: {
    backgroundColor: '#0B6B45',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  donationGiftAidContinueText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  donationGiftAidChangeBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(9,52,31,0.25)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  donationGiftAidChangeText: {
    color: '#244B38',
    fontSize: 12,
    fontWeight: '700',
  },
  donationOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  donationOptionSection: {
    marginBottom: 12,
  },
  donationOptionSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A4632',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  donationOptionBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(9,52,31,0.15)',
    width: '48%',
    aspectRatio: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  donationOptionBtnSelected: {
    borderColor: '#0B6B45',
    backgroundColor: '#EAF5EE',
  },
  donationOptionBadge: {
    alignSelf: 'center',
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#EAF4EE',
    color: '#0B6B45',
    fontSize: 10,
    fontWeight: '700',
    overflow: 'hidden',
  },
  donationOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#123524',
    textAlign: 'center',
  },
  donationOptionSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#466858',
    textAlign: 'center',
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
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'rgba(5,18,14,0.18)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    ...(Platform.OS === 'web'
      ? { boxShadow: 'none' }
      : {
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        }),
    elevation: 0,
  },
  topNavBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  topNavLogoWrap: {
    width: 36,
    height: 36,
    borderRadius: 4,
    marginRight: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    borderColor: 'transparent',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 4px rgba(3,18,12,0.24)' }
      : {
          shadowColor: '#03120C',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.24,
          shadowRadius: 4,
        }),
    elevation: 2,
  },
  topNavLogo: {
    width: 30,
    height: 30,
    opacity: 1,
  },
  topNavText: {
    flex: 1,
    minWidth: 0,
  },
  topNavName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.15,
    lineHeight: 18,
    marginBottom: 1,
    ...(Platform.OS === 'web'
      ? { textShadow: '0px 1px 2px rgba(0,0,0,0.35)' }
      : {
          textShadowColor: 'rgba(0,0,0,0.35)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }),
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
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.2,
    marginTop: 0,
  },
  topNavDateLine: {
    marginTop: 1,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.58)',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  topNavHijriLine: {
    marginTop: 0,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.58)',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  topNavUpdated: {
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: -0.5,
    marginLeft: 0,
    paddingRight: 0,
    ...(Platform.OS === 'web'
      ? { textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }
      : {
          textShadowColor: 'rgba(0,0,0,0.3)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        }),
  },
  headerControls: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    marginLeft: 8,
    flexShrink: 0,
  },
  modePill: {
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.13)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  modePillText: {
    fontSize: 16,
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
  // ── Community feed ──────────────────────────────────────────────────
  communityCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 14px rgba(11,92,58,0.07)' }
      : {
          shadowColor: '#0B5C3A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.07,
          shadowRadius: 14,
        }),
    elevation: 3,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
  },
  communityDivider: {
    height: 1,
    backgroundColor: '#E5EDE7',
    marginHorizontal: Spacing.md,
  },
  communityChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  communityChip: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(63,174,90,0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  communityChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  communityDate: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textSubtle,
  },
  communityRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  communityViewAll: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.sm,
    paddingVertical: 2,
  },
  communityViewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 10px 26px rgba(2,31,53,0.28)' }
      : {
          shadowColor: '#021F35',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.28,
          shadowRadius: 26,
        }),
    elevation: 7,
  },
  prayerFlipCalendarFace: {
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 10px 24px rgba(5,37,61,0.2)' }
      : {
          shadowColor: '#05253D',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 24,
        }),
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 6px 20px rgba(6,30,19,0.2)' }
      : {
          shadowColor: '#061E13',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
        }),
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
    ...(Platform.OS === 'web'
      ? { textShadow: '0px 1px 3px rgba(0,0,0,0.45)' }
      : {
          textShadowColor: 'rgba(0,0,0,0.45)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }),
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 24px rgba(0,60,40,0.12)' }
      : {
          shadowColor: '#003C28',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
        }),
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 8px 28px rgba(0,60,40,0.18)' }
      : {
          shadowColor: '#003C28',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 28,
        }),
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
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 12px rgba(0,60,40,0.06)' }
      : {
          shadowColor: '#003C28',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        }),
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
  body: { paddingHorizontal: Spacing.md, paddingTop: 6, backgroundColor: 'transparent' },
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
  seeAll: { ...Typography.labelMedium, color: Colors.primary },

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
  // ea styles kept for potential future re-use
  eventsAnnouncementsCard_legacy: {
    backgroundColor: Colors.surface,
  },
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

