import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatCountdownSeconds } from '@/services/prayerService';
import { useAlert } from '@/template';

export type SunnahEntry = { act: string; detail: string; ref: string; icon: string };

type NightPalette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textSub: string;
  textMuted: string;
  cardBg: string;
  jumuahBg: string;
  jumuahBord: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  gold: string;
  cardShadow: string;
};

const NIGHT: NightPalette = {
  bg: '#0B1220',
  surface: '#111A2E',
  surfaceAlt: '#16223A',
  border: 'rgba(255,255,255,0.05)',
  borderStrong: '#1E2D47',
  text: '#FFFFFF',
  textSub: '#B8C1D9',
  textMuted: '#7C879F',
  cardBg: '#111A2E',
  jumuahBg: '#1F1A0A',
  jumuahBord: '#3D2F00',
  accent: '#4FE948',
  accentSoft: '#A4F2A0',
  accentGlow: 'rgba(79,233,72,0.16)',
  gold: '#FBBF24',
  cardShadow: 'rgba(0,0,0,0.30)',
};

const DAY_OF_YEAR = Math.floor(
  (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
);

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
    id: 'adhkar-fajr', icon: 'wb-twilight', color: '#3FAE5A',
    title: 'After Fajr Adhkar', sub: 'Wird al-Latif · Yaseen · Dua of Yaseen',
    route: '/(tabs)/duas', badge: 'After Fajr', prayerTab: 'after-fajr',
  },
  Dhuhr: {
    id: 'adhkar-dhuhr', icon: 'wb-sunny', color: '#3FAE5A',
    title: 'After Dhuhr Adhkar', sub: 'Tasbih · Salawat · Astaghfirullah',
    route: '/(tabs)/duas', badge: 'After Dhuhr', prayerTab: 'after-dhuhr',
  },
  Asr: {
    id: 'adhkar-asr', icon: 'wb-cloudy', color: '#3FAE5A',
    title: 'After Asr Adhkar', sub: 'Surah Al-Waqiah · Hizb ul Bahr',
    route: '/(tabs)/duas', badge: 'After Asr', prayerTab: 'after-asr',
  },
  Maghrib: {
    id: 'adhkar-maghrib', icon: 'bedtime', color: '#3FAE5A',
    title: 'After Maghrib Adhkar', sub: 'Evening duas & protection dhikr',
    route: '/(tabs)/duas', badge: 'After Maghrib', prayerTab: 'after-maghrib',
  },
  Isha: {
    id: 'adhkar-isha', icon: 'nightlight', color: '#3FAE5A',
    title: 'After Isha Adhkar', sub: "Night remembrance & du'a before sleep",
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

const DUROOD_LEVELS = [
  { level: 1, target: 100,  label: 'L1',  color: '#2E7D32', bg: '#E8F5E9' },
  { level: 2, target: 300,  label: 'L2',  color: '#3E8C5A', bg: '#EAF6EE' },
  { level: 3, target: 500,  label: 'L3',  color: '#4F755E', bg: '#EDF5F0' },
  { level: 4, target: 1000, label: 'L4',  color: '#A1792A', bg: '#FBF4E3' },
];

const PENDING_OPEN_KEY = 'quran_pending_open_v1';

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
  const progressPct = Math.round(progress * 100);
  const accentColor = nightMode ? '#7ECF98' : '#3C8D5B';
  const bgTint = nightMode ? 'rgba(126,207,152,0.15)' : '#EDF8F1';

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
      fyStyles.counterCard,
      N && { backgroundColor: N.surface, borderColor: N.border },
    ]}>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none', backgroundColor: accentColor, opacity: flashOpacity, borderRadius: Radius.xl }]}
      />
      {/* Header */}
      <View style={fyStyles.duroodHeader}>
        <MaterialIcons name="refresh" size={12} color={accentColor} />
        <Text style={[fyStyles.duroodTitle, { color: accentColor }]}>Istighfar</Text>
        {done ? (
          <View style={[fyStyles.counterDoneBadge, { backgroundColor: accentColor + '16', borderColor: accentColor + '33' }]}>
            <MaterialIcons name="check" size={8} color={accentColor} />
            <Text style={[fyStyles.counterDoneText, { color: accentColor }]}>Done</Text>
          </View>
        ) : null}
      </View>

      {/* Arabic */}
      <Text style={[fyStyles.counterArabic, { color: accentColor }]}>
        أَسْتَغْفِرُ اللَّهَ
      </Text>

      {/* Tap counter */}
      <TouchableOpacity onPress={tap} activeOpacity={done ? 1 : 0.7} disabled={done}>
        <Animated.View style={[
          fyStyles.duroodTapArea,
          fyStyles.counterPanel,
          { backgroundColor: bgTint, borderColor: accentColor + '22' },
          { transform: [{ scale: scaleAnim }] },
        ]}>
          <Text style={[fyStyles.duroodCount, fyStyles.counterCount, { color: accentColor }]}>{count}</Text>
          <Text style={[fyStyles.duroodCountOf, fyStyles.counterTarget, N && { color: N.textMuted }]}>of {TARGET}</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={fyStyles.counterProgressRow}>
        <Text style={[fyStyles.counterProgressText, N && { color: N.textSub }]}>{progressPct}% complete</Text>
      </View>
      <View style={[fyStyles.duroodProgressBg, fyStyles.counterProgressBg, N && { backgroundColor: N.border }]}>
        <View style={[fyStyles.duroodProgressFill, fyStyles.counterProgressFill, { width: `${progressPct}%` as any, backgroundColor: accentColor }]} />
      </View>

      <Text
        numberOfLines={2}
        style={[fyStyles.counterFootnote, N && { color: N.textMuted }]}
      >
        Whoever says Astaghfirullah 100x, all sins are forgiven. Bukhari 6307
      </Text>

      {/* Mark done */}
      <TouchableOpacity
        onPress={() => onDismiss(cardId)}
        style={[fyStyles.counterActionBar, { backgroundColor: accentColor + '12', borderColor: accentColor + '2A' }]}
      >
        <MaterialIcons name="check-circle" size={10} color={accentColor} />
        <Text style={[fyStyles.counterActionText, { color: accentColor }]}>Mark as Done</Text>
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
  const progressPct = Math.round(progress * 100);

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

  const accentColor = nightMode ? '#7ED29B' : currentLevel.color;
  const bgTint = nightMode ? 'rgba(126,210,155,0.15)' : currentLevel.bg;

  const flashOpacity = flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={[
      fyStyles.duroodCard,
      fyStyles.counterCard,
      N && { backgroundColor: N.surface, borderColor: N.border },
    ]}>
      {/* Flash overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none', backgroundColor: accentColor, opacity: flashOpacity, borderRadius: Radius.xl }]}
      />

      {/* Header */}
      <View style={fyStyles.duroodHeader}>
        <MaterialIcons name="favorite" size={12} color={accentColor} />
        <Text style={[fyStyles.duroodTitle, { color: accentColor }]}>Daily Durood</Text>
        {done ? (
          <View style={[fyStyles.counterDoneBadge, { backgroundColor: accentColor + '16', borderColor: accentColor + '33' }]}>
            <MaterialIcons name="check" size={8} color={accentColor} />
            <Text style={[fyStyles.counterDoneText, { color: accentColor }]}>Done</Text>
          </View>
        ) : null}
      </View>

      {/* Counter tap */}
      <TouchableOpacity onPress={tap} activeOpacity={done ? 1 : 0.7} disabled={done}>
        <Animated.View style={[
          fyStyles.duroodTapArea,
          fyStyles.counterPanel,
          { backgroundColor: bgTint, borderColor: accentColor + '22' },
          { transform: [{ scale: scaleAnim }] },
        ]}>
          <Text style={[fyStyles.duroodCount, fyStyles.counterCount, { color: accentColor }]}>{count}</Text>
          <Text style={[fyStyles.duroodCountOf, fyStyles.counterTarget, N && { color: N.textMuted }]}>of {currentLevel.target}</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={fyStyles.counterProgressRow}>
        <Text style={[fyStyles.counterProgressText, N && { color: N.textSub }]}>{progressPct}% complete</Text>
      </View>
      <View style={[fyStyles.duroodProgressBg, fyStyles.counterProgressBg, N && { backgroundColor: N.border }]}>
        <Animated.View style={[
          fyStyles.duroodProgressFill,
          fyStyles.counterProgressFill,
          { width: `${progressPct}%` as any, backgroundColor: accentColor },
        ]} />
      </View>

      {/* Level selector */}
      <View style={[fyStyles.counterSegmented, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}>
        {DUROOD_LEVELS.map((lv, i) => (
          <TouchableOpacity
            key={lv.level}
            onPress={() => switchLevel(i)}
            activeOpacity={0.8}
            style={[
              fyStyles.counterSegmentBtn,
              i === levelIdx && fyStyles.counterSegmentBtnActive,
              i === levelIdx
                ? { backgroundColor: accentColor, borderColor: accentColor }
                : N
                  ? { backgroundColor: 'transparent', borderColor: 'transparent' }
                  : { backgroundColor: '#FFFFFF', borderColor: '#D9E5DD' },
            ]}
          >
            <Text style={[
              fyStyles.counterSegmentText,
              { color: i === levelIdx ? '#fff' : N ? '#B4C1BA' : '#486155' },
            ]}>{lv.target >= 1000 ? '1k' : lv.target}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mark as Done */}
      <TouchableOpacity
        onPress={() => onDismiss(duroodId)}
        style={[fyStyles.counterActionBar, { backgroundColor: accentColor + '12', borderColor: accentColor + '2A' }]}
      >
        <MaterialIcons name="check-circle" size={10} color={accentColor} />
        <Text style={[fyStyles.counterActionText, { color: accentColor }]}>Mark as Done</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Next Adhkar Countdown Card ──────────────────────────────────────────
const PRAYER_ADHKAR_META: Record<string, { icon: string; color: string; title: string; sub: string; badge: string; prayerTab: string }> = {
  Tahajjud:{ icon: 'nights-stay', color: '#1A237E', title: 'Tahajjud Adhkar', sub: 'Night prayer · Witr · Istighfar · Last-third duas', badge: 'Before Fajr',   prayerTab: 'before-fajr'   },
  Fajr:    { icon: 'wb-twilight', color: '#3FAE5A', title: 'After Fajr Adhkar',    sub: 'Wird al-Latif · Yaseen · Dua',         badge: 'After Fajr',    prayerTab: 'after-fajr'    },
  Dhuhr:   { icon: 'wb-sunny',    color: '#3FAE5A', title: 'After Dhuhr Adhkar',   sub: 'Tasbih · Salawat · Astaghfirullah',    badge: 'After Dhuhr',   prayerTab: 'after-dhuhr'   },
  Asr:     { icon: 'wb-cloudy',   color: '#3FAE5A', title: 'After Asr Adhkar',     sub: 'Al-Waqiah · Hizb ul Bahr',             badge: 'After Asr',     prayerTab: 'after-asr'     },
  Maghrib: { icon: 'bedtime',     color: '#3FAE5A', title: 'After Maghrib Adhkar', sub: 'Evening duas & protection dhikr',      badge: 'After Maghrib', prayerTab: 'after-maghrib' },
  Isha:    { icon: 'nightlight',  color: '#3FAE5A', title: 'After Isha Adhkar',    sub: "Night remembrance & du'a before sleep", badge: 'After Isha',    prayerTab: 'after-isha'    },
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
  const overdueColor = '#C62828'; // red-700
  const isSunnahCard = card.id.startsWith('sunnah-');

  const accentColor = isOverdue ? overdueColor : card.color;

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
        { transform: [{ scale }] },
      ]}>
        <View style={fyStyles.cardBody}>
          {/* Row 1: icon + badge */}
          <View style={fyStyles.iconBadgeRow}>
            <MaterialIcons
              name={isOverdue ? 'schedule' as any : card.icon as any}
              size={16}
              color={accentColor}
            />
            {isOverdue ? (
              <View style={[fyStyles.badgeRow, { backgroundColor: overdueColor + '18', flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                <MaterialIcons name="warning-amber" size={9} color={overdueColor} />
                <Text style={[fyStyles.badgeText, { color: overdueColor }]}>Still Due</Text>
              </View>
            ) : card.badge ? (
              <View style={[
                fyStyles.badgeRow,
                isSunnahCard && fyStyles.badgeRowSunnah,
                { backgroundColor: card.color + (isSunnahCard ? '24' : '14') },
              ]}>
                <Text style={[fyStyles.badgeText, { color: card.color }]}>{card.badge}</Text>
              </View>
            ) : null}
          </View>

          {/* Row 2: title only */}
          <Text style={[fyStyles.cardTitle, N && { color: N.text }, isOverdue && { color: N ? '#FCA5A5' : '#7F1D1D' }]} numberOfLines={2}>{card.title}</Text>

          {/* Row 3: Open + Done */}
          <View style={fyStyles.ctaRow}>
            {card.route ? (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onOpen(card); }}
                style={[
                  fyStyles.openPrimary,
                  { backgroundColor: accentColor + (N ? '2A' : '18') },
                  isSunnahCard && fyStyles.openPrimaryWide,
                ]}
              >
                <Text style={[fyStyles.openPrimaryText, { color: accentColor }]}>{isSunnahCard ? 'View Reminder' : 'Open'}</Text>
                <MaterialIcons name="arrow-forward" size={10} color={accentColor} />
              </TouchableOpacity>
            ) : <View />}
            {isSunnahCard ? (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onDismiss(card.id); }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[fyStyles.doneSunnahBtn, { backgroundColor: accentColor }]}
                accessibilityLabel="Mark sunnah completed"
              >
                <MaterialIcons name="task-alt" size={12} color="#FFFFFF" />
                <Text style={fyStyles.doneSunnahText}>Completed</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onDismiss(card.id); }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[fyStyles.doneIconBtn, { borderColor: accentColor + (N ? '44' : '30') }]}
                accessibilityLabel="Mark adhkar done"
              >
                <MaterialIcons name="check" size={12} color={accentColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginHorizontal: -Spacing.md,
    marginTop: 6,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: 2,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  kickerBar: {
    width: 3,
    height: 11,
    borderRadius: 2,
    backgroundColor: '#2C6A50',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#2C6A50',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.1,
    lineHeight: 28,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  countPill: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EAF3EE',
    borderColor: 'rgba(17,73,51,0.12)',
    marginBottom: 8,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#51645A',
    letterSpacing: 0.2,
  },
});

const fyStyles = StyleSheet.create({
  duroodCard: {
    width: 184,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    padding: 11,
    gap: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 6px 16px rgba(11,92,58,0.08)' }
      : {
          shadowColor: '#0B5C3A',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
        }),
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
    borderRadius: Radius.lg, borderWidth: 1.5,
    paddingVertical: 11,
  },
  duroodCount: { fontSize: 28, fontWeight: '900', lineHeight: 32 },
  duroodCountOf: { fontSize: 10, fontWeight: '600', color: Colors.textSubtle, marginTop: 1 },
  duroodProgressBg: {
    height: 4, borderRadius: 2, backgroundColor: Colors.border, overflow: 'hidden',
  },
  duroodProgressFill: { height: 4, borderRadius: 2 },
  duroodLevels: { flexDirection: 'row', gap: 5 },
  duroodLevelBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 5,
    borderRadius: Radius.sm, borderWidth: 1,
  },
  duroodLevelText: { fontSize: 8.5, fontWeight: '800' },
  counterCard: {
    width: 176,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 6,
  },
  counterPanel: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  counterArabic: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginTop: -1,
    marginBottom: -1,
  },
  counterCount: {
    fontSize: 46,
    lineHeight: 48,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  counterTarget: {
    fontSize: 8.5,
    fontWeight: '700',
    marginTop: -2,
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  counterProgressRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 1,
  },
  counterProgressText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#6B7A72',
    letterSpacing: 0.2,
  },
  counterProgressBg: {
    height: 5,
    borderRadius: Radius.full,
    marginTop: 1,
  },
  counterProgressFill: {
    height: 5,
    borderRadius: Radius.full,
  },
  counterSegmented: {
    flexDirection: 'row',
    gap: 5,
    padding: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#D7E2DA',
    backgroundColor: '#F1F6F3',
  },
  counterSegmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    minHeight: 27,
    paddingHorizontal: 4,
  },
  counterSegmentBtnActive: {
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 3px 10px rgba(16,74,39,0.24)' }
      : {
          shadowColor: '#104A27',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.24,
          shadowRadius: 4,
        }),
    elevation: 2,
  },
  counterSegmentText: {
    fontSize: 8.7,
    fontWeight: '900',
    letterSpacing: 0.15,
    fontVariant: ['tabular-nums'] as any,
  },
  counterDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  counterDoneText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  counterFootnote: {
    fontSize: 8.25,
    fontWeight: '500',
    color: '#8A958F',
    textAlign: 'center',
    lineHeight: 11.5,
    minHeight: 23,
    marginTop: -1,
  },
  counterActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginTop: 1,
  },
  counterActionText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
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
    width: 175,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(11,92,58,0.06)' }
      : {
          shadowColor: '#0B5C3A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        }),
    elevation: 3,
  },
  cardBody: { padding: 12, gap: 8 },
  iconBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  doneBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeRow: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeRowSunnah: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, lineHeight: 17 },
  cardSub: { fontSize: 10.5, fontWeight: '400', lineHeight: 14, color: Colors.textSubtle, opacity: 0.9 },
  ctaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, gap: 8,
  },
  openRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: Radius.full, marginTop: 3,
  },
  openText: { fontSize: 10, fontWeight: '700' },
  openPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  openPrimaryText: { fontSize: 10, fontWeight: '700' },
  openPrimaryWide: {
    flex: 1,
    justifyContent: 'center',
  },
  doneIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  doneSunnahBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  doneSunnahText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
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
      contentContainerStyle={{ flexDirection: 'row', gap: 12, paddingHorizontal: Spacing.md, paddingBottom: 8, paddingTop: 3 }}
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

export function HomeForYouTodaySection({
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
  const hasSunnahReminder = [todaySunnah.act, todaySunnah.detail, todaySunnah.ref]
    .some((value) => (value ?? '').trim().length > 0);
  if (hasSunnahReminder && !dismissed.has(sunnahId)) {
    cards.push({
      id: sunnahId,
      icon: todaySunnah.icon as string,
      color: '#2E7D32',
      title: todaySunnah.act || 'Adhkar coming soon.',
      sub: todaySunnah.detail || todaySunnah.ref || 'Review the Sunnah reminder and complete it today.',
      badge: 'Sunnah Reminder',
      route: '/(tabs)/duas',
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
    <View style={sectionStyles.container}>
      <View style={sectionStyles.headerRow}>
        <View style={{ flex: 1 }}>
          {/* Section kicker */}
          <View style={sectionStyles.kickerRow}>
            <View style={sectionStyles.kickerBar} />
            <Text style={sectionStyles.kicker}>YOUR ADHKAR</Text>
          </View>
        </View>
        <View style={[
          sectionStyles.countPill,
          N && { backgroundColor: N.surfaceAlt, borderColor: N.border },
        ]}>
          <Text style={[sectionStyles.countPillText, N && { color: N.textMuted }]}>
            {allDone ? 'All done ✓' : `${cards.length} reminder${cards.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>

      {allDone ? (
        // Static row when all prayer cards are done (Durood + Quran + Countdown still show)
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 12, paddingBottom: 8, paddingTop: 3 }}
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
            fyStyles.card, { width: 172, justifyContent: 'center' },
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

