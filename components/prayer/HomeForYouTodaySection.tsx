import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { getJuzEndPage, getJuzStartPage, getMushafTotalPages, getQuarterStartsInJuz } from '@/constants/mushafJuzPages';
import { formatCountdownSeconds } from '@/services/prayerService';
import { useAlert } from '@/template';

const GATES_BG = require('@/assets/images/background/gates.jpg');
const AQSA_BG = require('@/assets/images/background/aqsa.jpg');
const TAWBAH_BG = require('@/assets/images/background/tawbah.jpg');
const TAWHID_BG = require('@/assets/images/background/tawhid.jpg');

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
  border: 'rgba(173, 198, 235, 0.24)',
  borderStrong: '#1E2D47',
  text: '#FFFFFF',
  textSub: '#CFDCF2',
  textMuted: '#A8BAD8',
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

type CounterCardProps = {
  nightMode: boolean;
  todayKey: string;
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
};

type CounterLevelOption = {
  level: number;
  target: number;
  label?: string;
  color: string;
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

const NON_PERSISTED_REMINDER_IDS = new Set(
  Object.values(PRAYER_ADHKAR_CARDS).map((card) => card.id)
);

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
  { level: 1, label: 'Ayahs', desc: '3–5 Ayahs',  color: '#66DDAA', bg: 'rgba(102,221,170,0.15)' },
  { level: 2, label: '1 Page', desc: '~1 Page',   color: '#5BCFA5', bg: 'rgba(91,207,165,0.15)' },
  { level: 3, label: '½ Juz',  desc: '~10 Pages', color: '#5DD9A0', bg: 'rgba(93,217,160,0.15)' },
  { level: 4, label: 'Full Juz', desc: '~20 Pgs', color: '#6ECF97', bg: 'rgba(110,207,151,0.13)' },
];

const DUROOD_LEVELS = [
  { level: 1, target: 100,  label: 'L1',  color: '#A8E8CC', bg: '#E8F5E9' },
  { level: 2, target: 300,  label: 'L2',  color: '#A8E8CC', bg: '#EAF6EE' },
  { level: 3, target: 500,  label: 'L3',  color: '#A8E8CC', bg: '#EDF5F0' },
  { level: 4, target: 1000, label: 'L4',  color: '#A8E8CC', bg: '#FBF4E3' },
];

const ISTIGHFAR_LEVELS = [
  { level: 1, target: 100,  label: 'L1',  color: '#A8E8CC' },
  { level: 2, target: 300,  label: 'L2',  color: '#A8E8CC' },
  { level: 3, target: 500,  label: 'L3',  color: '#A8E8CC' },
  { level: 4, target: 1000, label: 'L4',  color: '#A8E8CC' },
];

const TAWHID_LEVELS = [
  { level: 1, target: 100,  label: 'L1',  color: '#A8E8CC' },
  { level: 2, target: 300,  label: 'L2',  color: '#A8E8CC' },
  { level: 3, target: 500,  label: 'L3',  color: '#A8E8CC' },
  { level: 4, target: 1000, label: 'L4',  color: '#A8E8CC' },
];

const PENDING_OPEN_KEY = 'quran_pending_open_v1';
const QURAN_RESUME_PAGE_KEY = 'quran_resume_page_v1';
const QURAN_RESUME_PAGE_15LINE_KEY = 'quran_resume_page_15line_v1';
const QURAN_RESUME_PAGE_16LINE_KEY = 'quran_resume_page_16line_v1';
const QURAN_HALF_JUZ_STATE_KEY = 'quran_half_juz_state_v1';
const QURAN_LAST_VALID_HIJRI_DAY_KEY = 'quran_last_valid_hijri_day_v1';
const QURAN_FULL_JUZ_PROGRESS_KEY = 'quran_full_juz_progress_v1';
const QURAN_CATCHUP_UI_STATE_KEY = 'quran_catchup_ui_state_v1';
const QURAN_MUSHAF_LAYOUT_KEY = 'quran_mushaf_layout_v1';
const QURAN_CANONICAL_RESUME_PAGE_KEY = 'quran_canonical_resume_page_v1';

type HalfJuzState = {
  dayKey: string;
  juz: number;
  half: 'first' | 'second';
};

type FullJuzProgressState = {
  lastCompletedHijriDay: number;
  handledMissedDays: number[];
  skippedMissedDays: number[];
};

type CatchupUiState = {
  dateKey: string;
  extraReminderUsed: boolean;
};

type MushafLayout = '15line' | '16line';
const CANONICAL_LAYOUT: MushafLayout = '15line';

function useDeferredStorageSetItem(delayMs = 180) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ key: string; value: string } | null>(null);

  const flush = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    AsyncStorage.setItem(pending.key, pending.value).catch(() => {});
  }, []);

  const schedule = useCallback((key: string, value: string) => {
    pendingRef.current = { key, value };
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      flush();
    }, delayMs);
  }, [delayMs, flush]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      flush();
    };
  }, [flush]);

  return { schedule, flush };
}

function CounterExpandModal({
  visible,
  nightMode,
  title,
  icon,
  count,
  target,
  done,
  accentColor,
  scaleAnim,
  levels,
  levelIdx,
  onTap,
  onSwitchLevel,
  onComplete,
  onClose,
  caption,
}: {
  visible: boolean;
  nightMode: boolean;
  title: string;
  icon: React.ReactNode;
  count: number;
  target: number;
  done: boolean;
  accentColor: string;
  scaleAnim: Animated.Value;
  levels: CounterLevelOption[];
  levelIdx: number;
  onTap: () => void;
  onSwitchLevel: (idx: number) => void;
  onComplete: () => void;
  onClose: () => void;
  caption: string;
}) {
  const N = nightMode ? NIGHT : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={fyStyles.counterModalBackdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[fyStyles.counterModalBox, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
          <View style={fyStyles.counterModalHeaderRow}>
            <View style={fyStyles.counterModalTitleRow}>
              <Text style={fyStyles.counterModalTitle}>{title}</Text>
              {icon}
            </View>
            <TouchableOpacity onPress={onClose} style={fyStyles.counterModalCloseBtn}>
              <MaterialIcons name="close" size={14} color="#D5E1DA" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onTap} activeOpacity={done ? 1 : 0.75} disabled={done}>
            <Animated.View
              style={[
                fyStyles.counterModalTapBox,
                { borderColor: `${accentColor}55`, backgroundColor: 'rgba(255,255,255,0.14)' },
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              <Text style={fyStyles.counterModalCount}>{count}</Text>
              <Text style={fyStyles.counterModalTarget}>of {target} today</Text>
              <Text style={fyStyles.counterModalHint}>tap</Text>
            </Animated.View>
          </TouchableOpacity>

          <View style={[fyStyles.counterSegmentedCompact, { backgroundColor: 'rgba(0,0,0,0.28)' }]}>
            {levels.map((lv, i) => (
              <TouchableOpacity
                key={lv.level}
                onPress={() => onSwitchLevel(i)}
                activeOpacity={0.85}
                style={[
                  fyStyles.counterSegmentBtnCompact,
                  i === levelIdx
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : { backgroundColor: 'transparent', borderColor: 'transparent' },
                ]}
              >
                <Text
                  style={[
                    fyStyles.counterSegmentTextCompact,
                    { color: i === levelIdx ? '#05210F' : 'rgba(255,255,255,0.78)' },
                  ]}
                >
                  {lv.target >= 1000 ? '1k' : lv.target}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={fyStyles.counterActionRowCompact}>
            <TouchableOpacity onPress={onComplete} style={[fyStyles.counterActionCompact, { borderColor: '#A8E8CC66' }]}> 
              <MaterialIcons name="check-circle-outline" size={10} color="#A8E8CC" />
              <Text style={[fyStyles.counterActionTextCompact, { color: '#A8E8CC' }]}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={[fyStyles.counterActionCompact, { borderColor: 'rgba(255,255,255,0.26)' }]}> 
              <MaterialIcons name="close" size={10} color="#E6F2EA" />
              <Text style={[fyStyles.counterActionTextCompact, { color: '#E6F2EA' }]}>Close</Text>
            </TouchableOpacity>
          </View>

          <Text numberOfLines={2} style={[fyStyles.counterCaption, { color: 'rgba(255,255,255,0.80)' }]}>
            {caption}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

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

function clampMushafPage(page: number, layout: MushafLayout): number {
  const totalPages = getMushafTotalPages(layout);
  const rounded = Math.round(page);
  return Math.max(1, Math.min(totalPages, Number.isFinite(rounded) ? rounded : 1));
}

function getJuzForMushafPage(layout: MushafLayout, page: number): number {
  const safePage = clampMushafPage(page, layout);
  for (let juz = 30; juz >= 1; juz--) {
    if (safePage >= getJuzStartPage(layout, juz)) return juz;
  }
  return 1;
}

function mapPageAcrossLayouts(page: number, fromLayout: MushafLayout, toLayout: MushafLayout): number {
  const safePage = clampMushafPage(page, fromLayout);
  if (fromLayout === toLayout) return safePage;

  const fromJuz = getJuzForMushafPage(fromLayout, safePage);
  const fromStart = getJuzStartPage(fromLayout, fromJuz);
  const fromEnd = getJuzEndPage(fromLayout, fromJuz);
  const fromSpan = Math.max(1, fromEnd - fromStart);
  const ratio = (safePage - fromStart) / fromSpan;

  const toStart = getJuzStartPage(toLayout, fromJuz);
  const toEnd = getJuzEndPage(toLayout, fromJuz);
  const toSpan = Math.max(1, toEnd - toStart);

  return clampMushafPage(toStart + (ratio * toSpan), toLayout);
}

function chapterForLayoutPage(targetPage: number, layout: MushafLayout): number {
  const canonicalPage = layout === CANONICAL_LAYOUT
    ? clampMushafPage(targetPage, layout)
    : mapPageAcrossLayouts(targetPage, layout, CANONICAL_LAYOUT);
  return chapterForMushaPage(canonicalPage);
}

function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getEpochDayLocal(date: Date): number {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(localMidnight.getTime() / 86400000);
}

function parseStoredMushafPage(value: string | null, layout: MushafLayout): number | null {
  const parsed = value ? parseInt(value, 10) : NaN;
  const totalPages = getMushafTotalPages(layout);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= totalPages) return parsed;
  return null;
}

function getFallbackResumePage(layout: MushafLayout, date: Date): number {
  const seed = getEpochDayLocal(date);
  const totalPages = getMushafTotalPages(layout);
  if (layout === '16line') {
    return ((seed * 197 + 43) % totalPages) + 1;
  }
  return ((seed * 113 + 17) % totalPages) + 1;
}

function getDailyRandomAyahSelection(date: Date, layout: MushafLayout): { page: number; surah: number; ayahTarget: number } {
  const daySeed = getEpochDayLocal(date);
  const canonicalTotalPages = getMushafTotalPages(CANONICAL_LAYOUT);
  const canonicalPage = ((daySeed * 313 + 97) % canonicalTotalPages) + 1;
  const page = mapPageAcrossLayouts(canonicalPage, CANONICAL_LAYOUT, layout);
  const ayahTarget = ((daySeed * 17 + 11) % 5) + 3; // 3..7 ayahs
  return { page, surah: chapterForLayoutPage(page, layout), ayahTarget };
}

// ── Daily Quran Portion Card (with 4 levels + open-in-app) ───────────────
function QuranPortionCard({
  nightMode, todayKey, dismissed, onDismiss, hijriDay, hijriMonthName,
}: {
  nightMode: boolean;
  todayKey: string;
  dismissed: Set<string>;
  onDismiss: (id: string) => void;
  hijriDay: number; // Hijri day of month (1-30) — drives Full Juz for monthly completion
  hijriMonthName?: string;
}) {
  const id = `quran-portion-${todayKey}`;
  const levelKey = 'quran_read_level_persist';
  const N = nightMode ? NIGHT : null;
  const quranBackgroundSource = AQSA_BG;
  const { showAlert } = useAlert();

  const [levelIdx, setLevelIdx] = useState(3); // default: Full Juz
  const [levelLoaded, setLevelLoaded] = useState(false);
  const [resolvedHijriDay, setResolvedHijriDay] = useState(() => {
    const validHijri = Number.isFinite(hijriDay) && hijriDay >= 1 && hijriDay <= 30;
    return validHijri ? hijriDay : 1;
  });
  const [canonicalResumePage, setCanonicalResumePage] = useState<number | null>(null);
  const [halfJuzState, setHalfJuzState] = useState<HalfJuzState | null>(null);
  const [fullJuzProgress, setFullJuzProgress] = useState<FullJuzProgressState>({
    lastCompletedHijriDay: 0,
    handledMissedDays: [],
    skippedMissedDays: [],
  });
  const [showCatchupBanner, setShowCatchupBanner] = useState(false);
  const [activeCatchupJuzDay, setActiveCatchupJuzDay] = useState<number | null>(null);
  const [pendingMissedDays, setPendingMissedDays] = useState<number[]>([]);
  const [extraReminderUsed, setExtraReminderUsed] = useState(false);
  const [mushafLayout, setMushafLayout] = useState<MushafLayout>('15line');
  const scale = useRef(new Animated.Value(1)).current;
  const launchCatchupShownRef = useRef(false);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const extraReminderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();
  const todayDateKey = getLocalDateKey(new Date());
  const fallbackCanonicalResumePage = getFallbackResumePage(CANONICAL_LAYOUT, new Date());
  const effectiveCanonicalResumePage = canonicalResumePage ?? fallbackCanonicalResumePage;
  const currentLayoutResumePage = mapPageAcrossLayouts(effectiveCanonicalResumePage, CANONICAL_LAYOUT, mushafLayout);
  const ayahSelection = getDailyRandomAyahSelection(new Date(), mushafLayout);
  const isRamadan = /(ramadan|رمضان)/i.test(hijriMonthName ?? '');

  const openQuranAtPage = useCallback((targetPage: number, targetEndPage?: number) => {
    const safeStartPage = clampMushafPage(targetPage, mushafLayout);
    const safeEndPage = Math.max(
      safeStartPage,
      clampMushafPage(targetEndPage ?? targetPage, mushafLayout)
    );
    const readerStartPage = safeStartPage;
    const readerEndPage = safeEndPage;
    const chapterId = chapterForLayoutPage(safeStartPage, mushafLayout);
    AsyncStorage.setItem(PENDING_OPEN_KEY, `${chapterId}|${safeStartPage}`).catch(() => {});
    AsyncStorage.setItem(QURAN_MUSHAF_LAYOUT_KEY, mushafLayout).catch(() => {});
    router.push({
      pathname: '/quran-reader',
      params: {
        startPage: String(readerStartPage),
        endPage: String(readerEndPage),
        mushaf: mushafLayout,
      },
    } as any);
  }, [mushafLayout, router]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(levelKey),
      AsyncStorage.getItem(QURAN_CANONICAL_RESUME_PAGE_KEY),
      AsyncStorage.getItem(QURAN_RESUME_PAGE_15LINE_KEY),
      AsyncStorage.getItem(QURAN_RESUME_PAGE_16LINE_KEY),
      AsyncStorage.getItem(QURAN_RESUME_PAGE_KEY),
      AsyncStorage.getItem(QURAN_HALF_JUZ_STATE_KEY),
      AsyncStorage.getItem(QURAN_LAST_VALID_HIJRI_DAY_KEY),
      AsyncStorage.getItem(QURAN_FULL_JUZ_PROGRESS_KEY),
      AsyncStorage.getItem(QURAN_CATCHUP_UI_STATE_KEY),
      AsyncStorage.getItem(QURAN_MUSHAF_LAYOUT_KEY),
    ]).then(([
      storedLevel,
      storedCanonicalPage,
      storedPage15,
      storedPage16,
      legacyStoredPage,
      storedHalfState,
      storedValidHijriDay,
      storedProgress,
      storedCatchupUi,
      storedMushafLayout,
    ]) => {
      if (storedLevel !== null) setLevelIdx(parseInt(storedLevel, 10) || 3);
      if (storedMushafLayout === '15line' || storedMushafLayout === '16line') {
        setMushafLayout(storedMushafLayout);
      }

      const parsedCanonical = parseStoredMushafPage(storedCanonicalPage, CANONICAL_LAYOUT);
      const legacy = parseStoredMushafPage(legacyStoredPage, '15line');
      const parsed15 = parseStoredMushafPage(storedPage15, '15line') ?? legacy;
      const parsed16 = parseStoredMushafPage(storedPage16, '16line');
      const nextCanonical = parsedCanonical
        ?? parsed15
        ?? (parsed16 ? mapPageAcrossLayouts(parsed16, '16line', CANONICAL_LAYOUT) : null)
        ?? fallbackCanonicalResumePage;

      setCanonicalResumePage(nextCanonical);
      if (!parsedCanonical) {
        AsyncStorage.setItem(QURAN_CANONICAL_RESUME_PAGE_KEY, String(nextCanonical)).catch(() => {});
      }

      const mapped15 = mapPageAcrossLayouts(nextCanonical, CANONICAL_LAYOUT, '15line');
      const mapped16 = mapPageAcrossLayouts(nextCanonical, CANONICAL_LAYOUT, '16line');
      AsyncStorage.setItem(QURAN_RESUME_PAGE_15LINE_KEY, String(mapped15)).catch(() => {});
      AsyncStorage.setItem(QURAN_RESUME_PAGE_16LINE_KEY, String(mapped16)).catch(() => {});
      AsyncStorage.setItem(QURAN_RESUME_PAGE_KEY, String(mapped15)).catch(() => {});

      const incomingHijriValid = Number.isFinite(hijriDay) && hijriDay >= 1 && hijriDay <= 30;
      const persistedHijri = storedValidHijriDay ? parseInt(storedValidHijriDay, 10) : NaN;
      const persistedHijriValid = Number.isFinite(persistedHijri) && persistedHijri >= 1 && persistedHijri <= 30;
      const fallbackHijri = ((DAY_OF_YEAR - 1) % 30) + 1;
      const effectiveHijriDay = incomingHijriValid
        ? hijriDay
        : persistedHijriValid
          ? persistedHijri
          : fallbackHijri;

      setResolvedHijriDay(effectiveHijriDay);
      if (incomingHijriValid) {
        AsyncStorage.setItem(QURAN_LAST_VALID_HIJRI_DAY_KEY, String(hijriDay)).catch(() => {});
      }

      let parsedHalfState: HalfJuzState | null = null;
      if (storedHalfState) {
        try {
          const decoded = JSON.parse(storedHalfState) as HalfJuzState;
          const validHalf = decoded.half === 'first' || decoded.half === 'second';
          const validJuz = Number.isFinite(decoded.juz) && decoded.juz >= 1 && decoded.juz <= 30;
          if (decoded.dayKey && validHalf && validJuz) parsedHalfState = decoded;
        } catch {}
      }

      const seedJuz = ((DAY_OF_YEAR - 1) % 30) + 1;
      let nextHalfState: HalfJuzState;
      if (!parsedHalfState) {
        nextHalfState = { dayKey: todayDateKey, juz: seedJuz, half: 'first' };
      } else if (parsedHalfState.dayKey === todayDateKey) {
        nextHalfState = parsedHalfState;
      } else if (parsedHalfState.half === 'first') {
        nextHalfState = { dayKey: todayDateKey, juz: parsedHalfState.juz, half: 'second' };
      } else {
        nextHalfState = {
          dayKey: todayDateKey,
          juz: parsedHalfState.juz >= 30 ? 1 : parsedHalfState.juz + 1,
          half: 'first',
        };
      }
      setHalfJuzState(nextHalfState);
      if (!parsedHalfState || parsedHalfState.dayKey !== nextHalfState.dayKey || parsedHalfState.half !== nextHalfState.half || parsedHalfState.juz !== nextHalfState.juz) {
        AsyncStorage.setItem(QURAN_HALF_JUZ_STATE_KEY, JSON.stringify(nextHalfState)).catch(() => {});
      }

      let progressState: FullJuzProgressState = {
        lastCompletedHijriDay: 0,
        handledMissedDays: [],
        skippedMissedDays: [],
      };
      if (storedProgress) {
        try {
          const decoded = JSON.parse(storedProgress) as FullJuzProgressState;
          if (Number.isFinite(decoded.lastCompletedHijriDay)) {
            progressState = {
              lastCompletedHijriDay: Math.max(0, Math.min(30, decoded.lastCompletedHijriDay)),
              handledMissedDays: Array.isArray(decoded.handledMissedDays)
                ? decoded.handledMissedDays.filter((d) => Number.isFinite(d) && d >= 1 && d <= 30)
                : [],
              skippedMissedDays: Array.isArray(decoded.skippedMissedDays)
                ? decoded.skippedMissedDays.filter((d) => Number.isFinite(d) && d >= 1 && d <= 30)
                : [],
            };
          }
        } catch {}
      }
      if (effectiveHijriDay === 1) {
        progressState = { lastCompletedHijriDay: 0, handledMissedDays: [], skippedMissedDays: [] };
        AsyncStorage.setItem(QURAN_FULL_JUZ_PROGRESS_KEY, JSON.stringify(progressState)).catch(() => {});
      }
      setFullJuzProgress(progressState);

      const defaultCatchupUi: CatchupUiState = { dateKey: todayDateKey, extraReminderUsed: false };
      if (storedCatchupUi) {
        try {
          const decoded = JSON.parse(storedCatchupUi) as CatchupUiState;
          if (decoded.dateKey === todayDateKey) {
            setExtraReminderUsed(!!decoded.extraReminderUsed);
          } else {
            AsyncStorage.setItem(QURAN_CATCHUP_UI_STATE_KEY, JSON.stringify(defaultCatchupUi)).catch(() => {});
            setExtraReminderUsed(false);
          }
        } catch {
          AsyncStorage.setItem(QURAN_CATCHUP_UI_STATE_KEY, JSON.stringify(defaultCatchupUi)).catch(() => {});
          setExtraReminderUsed(false);
        }
      } else {
        AsyncStorage.setItem(QURAN_CATCHUP_UI_STATE_KEY, JSON.stringify(defaultCatchupUi)).catch(() => {});
        setExtraReminderUsed(false);
      }

      setLevelLoaded(true);
    }).catch(() => setLevelLoaded(true));
  }, [hijriDay, todayDateKey, fallbackCanonicalResumePage]);

  const derivePendingMissedDays = useCallback((progress: FullJuzProgressState, todayHijriDay: number) => {
    const handled = new Set(progress.handledMissedDays);
    const pending: number[] = [];
    for (let d = progress.lastCompletedHijriDay + 1; d < todayHijriDay; d++) {
      if (d >= 1 && d <= 30 && !handled.has(d)) pending.push(d);
    }
    return pending;
  }, []);

  const persistCatchupUiState = useCallback((nextExtraReminderUsed: boolean) => {
    const state: CatchupUiState = { dateKey: todayDateKey, extraReminderUsed: nextExtraReminderUsed };
    AsyncStorage.setItem(QURAN_CATCHUP_UI_STATE_KEY, JSON.stringify(state)).catch(() => {});
  }, [todayDateKey]);

  const setFullJuzProgressAndPersist = useCallback((next: FullJuzProgressState) => {
    setFullJuzProgress(next);
    AsyncStorage.setItem(QURAN_FULL_JUZ_PROGRESS_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!levelLoaded) return;
    const pending = derivePendingMissedDays(fullJuzProgress, resolvedHijriDay);
    setPendingMissedDays(pending);
  }, [levelLoaded, fullJuzProgress, resolvedHijriDay, derivePendingMissedDays]);

  useEffect(() => {
    launchCatchupShownRef.current = false;
  }, [todayDateKey]);

  useEffect(() => {
    if (!levelLoaded || levelIdx !== 3 || launchCatchupShownRef.current) return;
    if (pendingMissedDays.length === 0) return;
    setShowCatchupBanner(true);
    launchCatchupShownRef.current = true;
  }, [levelLoaded, levelIdx, pendingMissedDays.length, todayDateKey]);

  useEffect(() => {
    if (!showCatchupBanner) {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
      return;
    }
    autoHideTimerRef.current = setTimeout(() => {
      setShowCatchupBanner(false);
    }, 9000);
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };
  }, [showCatchupBanner]);

  useEffect(() => {
    return () => {
      if (extraReminderTimerRef.current) {
        clearTimeout(extraReminderTimerRef.current);
        extraReminderTimerRef.current = null;
      }
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };
  }, []);

  const switchLevel = (i: number) => {
    if (i !== levelIdx) {
      launchCatchupShownRef.current = false;
      if (i !== 3) setShowCatchupBanner(false);
    }
    setLevelIdx(i);
    AsyncStorage.setItem(levelKey, String(i)).catch(() => {});
  };

  const switchMushafLayout = (layout: MushafLayout) => {
    setMushafLayout(layout);
    AsyncStorage.setItem(QURAN_MUSHAF_LAYOUT_KEY, layout).catch(() => {});
  };

  const onIn  = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 60 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40 }).start();

  if (!levelLoaded) return null;
  // Keep Quran card visible on web to avoid stale dismissal state hiding it.
  if (Platform.OS !== 'web' && dismissed.has(id)) return null;

  const persistCanonicalResumePage = (nextCanonicalPage: number) => {
    const safeCanonicalPage = clampMushafPage(nextCanonicalPage, CANONICAL_LAYOUT);
    setCanonicalResumePage(safeCanonicalPage);
    AsyncStorage.setItem(QURAN_CANONICAL_RESUME_PAGE_KEY, String(safeCanonicalPage)).catch(() => {});

    const mapped15 = mapPageAcrossLayouts(safeCanonicalPage, CANONICAL_LAYOUT, '15line');
    const mapped16 = mapPageAcrossLayouts(safeCanonicalPage, CANONICAL_LAYOUT, '16line');
    AsyncStorage.setItem(QURAN_RESUME_PAGE_15LINE_KEY, String(mapped15)).catch(() => {});
    AsyncStorage.setItem(QURAN_RESUME_PAGE_16LINE_KEY, String(mapped16)).catch(() => {});
    // Keep legacy key updated for backward compatibility with older app builds.
    AsyncStorage.setItem(QURAN_RESUME_PAGE_KEY, String(mapped15)).catch(() => {});
  };

  const advanceResumePage = (layout: MushafLayout = mushafLayout) => {
    const currentPage = mapPageAcrossLayouts(effectiveCanonicalResumePage, CANONICAL_LAYOUT, layout);
    const maxPage = getMushafTotalPages(layout);
    const nextPage = currentPage >= maxPage ? 1 : currentPage + 1;
    const nextCanonicalPage = mapPageAcrossLayouts(nextPage, layout, CANONICAL_LAYOUT);
    persistCanonicalResumePage(nextCanonicalPage);
  };

  const resolveQuranOpenTarget = (catchupJuzDay?: number): { page: number; chapter: number; endPage: number } => {
    if (levelIdx === 0) {
      const page = ayahSelection.page;
      return {
        page,
        chapter: chapterForLayoutPage(page, mushafLayout),
        endPage: page,
      };
    }

    if (levelIdx === 1) {
      const page = currentLayoutResumePage;
      return {
        page,
        chapter: chapterForLayoutPage(page, mushafLayout),
        endPage: page,
      };
    }

    if (levelIdx === 2) {
      const juzNum = halfJuzState?.juz ?? (((DAY_OF_YEAR - 1) % 30) + 1);
      const isFirstHalf = (halfJuzState?.half ?? 'first') === 'first';
      const startPg = getJuzStartPage(mushafLayout, juzNum);
      const endPg = getJuzEndPage(mushafLayout, juzNum);
      const quarterStarts = getQuarterStartsInJuz(mushafLayout, juzNum);
      const thirdQuarterStart = quarterStarts.find((item) => item.quarter === 3)?.page
        ?? Math.round((startPg + endPg) / 2);
      const firstHalfEndPage = Math.max(startPg, thirdQuarterStart - 1);
      const page = isFirstHalf ? startPg : thirdQuarterStart;

      return {
        page,
        chapter: chapterForLayoutPage(page, mushafLayout),
        endPage: isFirstHalf ? firstHalfEndPage : endPg,
      };
    }

    const juzNum = Math.max(1, Math.min(30, catchupJuzDay ?? resolvedHijriDay));
    const page = getJuzStartPage(mushafLayout, juzNum);
    return {
      page,
      chapter: chapterForLayoutPage(page, mushafLayout),
      endPage: getJuzEndPage(mushafLayout, juzNum),
    };
  };

  const normalizeDays = (days: number[]) => Array.from(new Set(days.filter((d) => d >= 1 && d <= 30))).sort((a, b) => a - b);

  const buildNextFullJuzProgress = (targetDay: number, markSkipped: boolean): FullJuzProgressState => {
    const handled = new Set(fullJuzProgress.handledMissedDays);
    const skipped = new Set(fullJuzProgress.skippedMissedDays);

    handled.add(targetDay);
    if (markSkipped) skipped.add(targetDay);
    else skipped.delete(targetDay);

    let lastCompleted = fullJuzProgress.lastCompletedHijriDay;
    while (lastCompleted < 30 && handled.has(lastCompleted + 1)) {
      lastCompleted += 1;
      handled.delete(lastCompleted);
      skipped.delete(lastCompleted);
    }

    return {
      lastCompletedHijriDay: lastCompleted,
      handledMissedDays: normalizeDays(Array.from(handled)),
      skippedMissedDays: normalizeDays(Array.from(skipped)),
    };
  };

  const queueOneExtraReminderIfAllowed = (nextProgress: FullJuzProgressState) => {
    if (extraReminderUsed) return;
    const stillPending = derivePendingMissedDays(nextProgress, resolvedHijriDay);
    if (stillPending.length === 0) return;

    setExtraReminderUsed(true);
    persistCatchupUiState(true);
    if (extraReminderTimerRef.current) clearTimeout(extraReminderTimerRef.current);
    extraReminderTimerRef.current = setTimeout(() => {
      if (levelIdx === 3) setShowCatchupBanner(true);
    }, 20000);
  };

  const openInQuran = () => {
    setShowCatchupBanner(false);
    setActiveCatchupJuzDay(null);
    const target = resolveQuranOpenTarget();
    openQuranAtPage(target.page, target.endPage);
  };

  const handleMarkAsRead = () => {
    if (levelIdx === 1) {
      advanceResumePage(mushafLayout);
      onDismiss(id);
      return;
    }
    if (levelIdx === 3) {
      const targetDay = activeCatchupJuzDay ?? resolvedHijriDay;
      const nextProgress = buildNextFullJuzProgress(targetDay, false);
      setFullJuzProgressAndPersist(nextProgress);
      setActiveCatchupJuzDay(null);
      const stillPending = derivePendingMissedDays(nextProgress, resolvedHijriDay);
      setShowCatchupBanner(stillPending.length > 0);
      return;
    }

    onDismiss(id);
  };

  const handleOpenCatchupConfirmation = () => {
    const targetDay = pendingMissedDays[0];
    if (!targetDay) return;

    const promptTitle = 'Continue from missed Juz';
    const promptBody = isRamadan
      ? `In this blessed month, you can continue with Juz ${targetDay} now.`
      : `You can continue with Juz ${targetDay} now.`;

    showAlert(promptTitle, promptBody, [
      {
        text: 'Yes, catch up now',
        onPress: () => {
          setShowCatchupBanner(false);
          setActiveCatchupJuzDay(targetDay);
          const target = resolveQuranOpenTarget(targetDay);
          openQuranAtPage(target.page, target.endPage);
        },
      },
      { text: 'Cancel', style: 'cancel', onPress: () => {} },
    ]);
  };

  const handleSkipCatchup = () => {
    const targetDay = pendingMissedDays[0];
    if (!targetDay) return;

    const nextProgress = buildNextFullJuzProgress(targetDay, true);
    setFullJuzProgressAndPersist(nextProgress);
    setShowCatchupBanner(false);
    queueOneExtraReminderIfAllowed(nextProgress);
  };

  const lv = QURAN_READ_LEVELS[levelIdx];
  const accentColor = nightMode ? '#4FE948' : lv.color;
  const cardWidth = Math.max(300, windowWidth - (Spacing.md * 2));
  const nextMissedJuz = pendingMissedDays[0] ?? null;
  const shouldRenderCatchupBanner = levelIdx === 3 && showCatchupBanner && pendingMissedDays.length > 0;

  // ── Pick content based on level ────────────────────────────────────────
  let badge = '';
  let titleLine = '';
  let ayahLine = '';
  let subLine = '';

  if (levelIdx === 0) {
    // Level 1: random page + explicit ayah amount target
    badge     = `${ayahSelection.ayahTarget} Ayahs`;
    titleLine = `Surah ${ayahSelection.surah} · Page ${ayahSelection.page}`;
    ayahLine  = `Read ${ayahSelection.ayahTarget} ayahs today`;
    subLine   = 'Daily random selection from the full Quran';
  } else if (levelIdx === 1) {
    // Level 2: 1 Page — use official Juz page boundaries
    const page = currentLayoutResumePage;
    let juzForPage = 1;
    for (let j = 30; j >= 1; j--) {
      if (page >= getJuzStartPage(mushafLayout, j)) {
        juzForPage = j;
        break;
      }
    }
    badge     = '~1 Page';
    titleLine = `Mushaf Page ${page}`;
    subLine   = `Juz ${juzForPage}`;
  } else if (levelIdx === 2) {
    // Level 3: Half Juz with persisted split progression
    const juzNum = halfJuzState?.juz ?? (((DAY_OF_YEAR - 1) % 30) + 1);
    const portion = QURAN_PORTIONS[juzNum - 1];
    const half = (halfJuzState?.half ?? 'first') === 'first' ? 'First half' : 'Second half';
    badge     = 'Half Juz';
    titleLine = `Juz ${portion.juz} — ${half}`;
    subLine   = portion.surahs;
  } else {
    // Level 4: Full Juz — Hijri day maps to Juz number for monthly Quran completion
    const juzNum  = Math.max(1, Math.min(30, resolvedHijriDay));
    const portion = QURAN_PORTIONS[juzNum - 1];
    const startPg = getJuzStartPage(mushafLayout, juzNum);
    badge     = `Juz ${juzNum}`;
    titleLine = `Juz ${juzNum}`;
    ayahLine  = `Day ${resolvedHijriDay} of month · p. ${startPg}`;
    subLine   = portion.surahs;
  }

  return (
    <TouchableOpacity onPressIn={onIn} onPressOut={onOut} activeOpacity={1}>
      <Animated.View style={[
        fyStyles.duroodCard,
        fyStyles.quranFullWidthCard,
        { width: cardWidth },
        N && { backgroundColor: N.surface, borderColor: N.border },
        { transform: [{ scale }] },
      ]}>
        <ImageBackground source={quranBackgroundSource} style={fyStyles.quranBgWrap} imageStyle={fyStyles.quranBgImage}>
          <View style={fyStyles.quranBgOverlay}>
            {/* Header */}
            <View style={fyStyles.duroodHeader}>
              <MaterialIcons name="menu-book" size={13} color={accentColor} />
              <Text style={[fyStyles.duroodTitle, { color: accentColor }]}>Daily Quran</Text>
              <View style={[fyStyles.juzBadge, { backgroundColor: accentColor }]}>
                <Text style={fyStyles.juzBadgeText}>{badge}</Text>
              </View>
            </View>

            {/* Content */}
            <View style={[fyStyles.counterPanelCompact, { backgroundColor: 'rgba(255,255,255,0.18)', paddingVertical: 10, paddingHorizontal: 10 }]}>
              <Text style={[fyStyles.cardTitle, { textAlign: 'center', fontSize: 14, lineHeight: 18, color: '#FFFFFF', fontWeight: '900' }]} numberOfLines={2}>
                {titleLine}
              </Text>
              {ayahLine ? (
                <Text style={[fyStyles.cardSub, { textAlign: 'center', marginTop: 1, fontSize: 11, lineHeight: 14, fontWeight: '700', color: 'rgba(255,255,255,0.82)' }]} numberOfLines={1}>
                  {ayahLine}
                </Text>
              ) : null}
              {subLine ? (
                <Text style={[fyStyles.cardSub, { textAlign: 'center', marginTop: 2, fontWeight: '500', opacity: 1, color: 'rgba(255,255,255,0.70)' }]} numberOfLines={2}>
                  {subLine}
                </Text>
              ) : null}
            </View>

            {/* Level selector */}
            <View style={[fyStyles.counterSegmentedCompact, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
              {QURAN_READ_LEVELS.map((ql, i) => (
                <TouchableOpacity
                  key={ql.level}
                  onPress={() => switchLevel(i)}
                  activeOpacity={0.8}
                  style={[
                    fyStyles.counterSegmentBtnCompact,
                    i === levelIdx
                      ? { backgroundColor: accentColor, borderColor: accentColor }
                      : { backgroundColor: 'transparent', borderColor: 'transparent' },
                  ]}
                >
                  <Text style={[
                    fyStyles.counterSegmentTextCompact,
                    { color: i === levelIdx ? '#000' : 'rgba(255,255,255,0.7)' },
                  ]}>{ql.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[fyStyles.counterSegmentedCompact, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
              {(['15line', '16line'] as MushafLayout[]).map((layout) => {
                const selected = mushafLayout === layout;
                return (
                  <TouchableOpacity
                    key={layout}
                    onPress={() => switchMushafLayout(layout)}
                    activeOpacity={0.8}
                    style={[
                      fyStyles.counterSegmentBtnCompact,
                      selected
                        ? { backgroundColor: accentColor, borderColor: accentColor }
                        : { backgroundColor: 'transparent', borderColor: 'transparent' },
                    ]}
                  >
                    <Text style={[
                      fyStyles.counterSegmentTextCompact,
                      { color: selected ? '#000' : 'rgba(255,255,255,0.7)' },
                    ]}>
                      {layout === '16line' ? '16 line Quran' : '15 line Quran'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {shouldRenderCatchupBanner && nextMissedJuz ? (
              <View style={fyStyles.catchupBannerWrap}>
                <View style={fyStyles.catchupBannerHead}>
                  <Text style={fyStyles.catchupBannerTitle}>
                    {isRamadan ? 'A gentle Ramadan reminder' : "A gentle reminder for yesterday's Juz"}
                  </Text>
                  <View style={fyStyles.catchupCountPill}>
                    <Text style={fyStyles.catchupCountPillText}>{pendingMissedDays.length} missed</Text>
                  </View>
                </View>
                <Text style={fyStyles.catchupBannerBody}>
                  {isRamadan
                    ? `In this blessed month, you can continue with Juz ${nextMissedJuz} now.`
                    : `You can continue with Juz ${nextMissedJuz} now.`}
                </Text>
                <View style={fyStyles.catchupActionRow}>
                  <TouchableOpacity
                    onPress={handleOpenCatchupConfirmation}
                    style={[fyStyles.catchupActionBtn, fyStyles.catchupPrimaryBtn]}
                  >
                    <MaterialIcons name="menu-book" size={10} color="#0B2817" />
                    <Text style={fyStyles.catchupPrimaryBtnText}>Catch up yesterday’s Juz</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSkipCatchup}
                    style={[fyStyles.catchupActionBtn, fyStyles.catchupSecondaryBtn]}
                  >
                    <Text style={fyStyles.catchupSecondaryBtnText}>Skip catch-up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Action buttons — side by side */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={openInQuran}
                style={[fyStyles.openRow, { flex: 1, backgroundColor: accentColor, justifyContent: 'center', marginTop: 0 }]}
              >
                <MaterialIcons name="auto-stories" size={11} color="#fff" />
                <Text style={[fyStyles.openText, { color: '#fff' }]}>Read in App</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleMarkAsRead}
                style={[fyStyles.openRow, { flex: 1, backgroundColor: accentColor, justifyContent: 'center', marginTop: 0 }]}
              >
                <MaterialIcons name="check-circle" size={11} color="#fff" />
                <Text style={[fyStyles.openText, { color: '#fff' }]}>Mark as Read</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Istighfar Counter Card ────────────────────────────────────────────────
function IstighfarCounterCard({
  nightMode, todayKey, dismissed, onDismiss,
}: CounterCardProps) {
  const cardId  = `istighfar-${todayKey}`;
  const countKey = `istighfar_count_${todayKey}`;
  const levelKey = 'istighfar_level_persist';

  const [count, setCount] = useState(0);
  const [levelIdx, setLevelIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const countRef = useRef(0);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { schedule: scheduleCountPersist, flush: flushCountPersist } = useDeferredStorageSetItem();

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

  useEffect(() => {
    return () => {
      flushCountPersist();
    };
  }, [countKey, flushCountPersist]);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  useEffect(() => {
    setExpanded(false);
  }, [countKey]);

  const currentLevel = ISTIGHFAR_LEVELS[levelIdx];
  const done = count >= currentLevel.target;

  const triggerFlash = () => {
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const tap = () => {
    const target = currentLevel.target;
    if (countRef.current >= target) return;
    const next = countRef.current + 1;
    countRef.current = next;
    setCount(next);
    scheduleCountPersist(countKey, String(next));
    if (!expanded) {
      scaleAnim.stopAnimation();
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 0.90, useNativeDriver: true, speed: 80 }),
        Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 40 }),
      ]).start();
    }
    if (next === target) triggerFlash();
  };

  const switchLevel = (idx: number) => {
    setLevelIdx(idx);
    AsyncStorage.setItem(levelKey, String(idx)).catch(() => {});
  };

  if (!loaded || dismissed.has(cardId)) return null;

  const accentColor = nightMode ? '#A8E8CC' : currentLevel.color;
  const flashOpacity = flashAnim.interpolate({ inputRange: [0,1], outputRange: [0, 0.30] });

  return (
    <>
      <ImageBackground
        source={TAWBAH_BG}
        imageStyle={{ borderRadius: Radius.xl }}
        style={[fyStyles.duroodCard, fyStyles.duroodImageCard]}
      >
        <View style={fyStyles.duroodImageOverlay}>
          {/* Flash overlay */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none', backgroundColor: accentColor, opacity: flashOpacity, borderRadius: Radius.xl }]}
          />

          {/* Header */}
          <View style={[fyStyles.counterHeaderRow, { paddingLeft: 4 }]}>
            <Text style={[fyStyles.counterTitleText, { color: '#A8E8CC' }]}>Astaghfirullah</Text>
            {done ? (
              <View style={[fyStyles.counterDoneBadge, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]}>
                <MaterialIcons name="check" size={7} color="#fff" />
                <Text style={[fyStyles.counterDoneText, { color: '#fff' }]}>Done</Text>
              </View>
            ) : null}
            <MaterialIcons name="replay" size={14} color="#A8E8CC" />
          </View>

          {/* Counter tap */}
          <TouchableOpacity onPress={tap} activeOpacity={done ? 1 : 0.7} disabled={done}>
            <Animated.View style={[
              fyStyles.counterPanelCompact,
              { backgroundColor: 'rgba(255,255,255,0.18)' },
              { transform: [{ scale: scaleAnim }] },
            ]}>
              <Text style={[fyStyles.counterCountCompact, { color: '#fff' }]}>{count}</Text>
              <Text style={[fyStyles.counterTargetCompact, { color: 'rgba(255,255,255,0.7)' }]}>of {currentLevel.target} today</Text>
              <Text style={{ fontSize: 7, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginTop: 1, letterSpacing: 0.6, textTransform: 'uppercase' }}>TAP</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Level selector */}
          <View style={[fyStyles.counterSegmentedCompact, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            {ISTIGHFAR_LEVELS.map((lv, i) => (
              <TouchableOpacity
                key={lv.level}
                onPress={() => switchLevel(i)}
                activeOpacity={0.8}
                style={[
                  fyStyles.counterSegmentBtnCompact,
                  i === levelIdx
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : { backgroundColor: 'transparent', borderColor: 'transparent' },
                ]}
              >
                <Text style={[
                  fyStyles.counterSegmentTextCompact,
                  { color: i === levelIdx ? '#000' : 'rgba(255,255,255,0.7)' },
                ]}>{lv.target >= 1000 ? '1k' : lv.target}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={fyStyles.counterActionRowCompact}>
            <TouchableOpacity
              onPress={() => onDismiss(cardId)}
              style={[fyStyles.counterActionCompact, { borderColor: '#A8E8CC44' }]}
            >
              <MaterialIcons name="check-circle-outline" size={9} color="#A8E8CC" />
              <Text style={[fyStyles.counterActionTextCompact, { color: '#A8E8CC' }]}>Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setExpanded(true)}
              style={[fyStyles.counterActionCompact, { borderColor: '#A8E8CC44' }]}
            >
              <MaterialIcons name="open-in-full" size={9} color="#A8E8CC" />
              <Text style={[fyStyles.counterActionTextCompact, { color: '#A8E8CC' }]}>Expand</Text>
            </TouchableOpacity>
          </View>

          {/* Hadith caption */}
          <Text
            numberOfLines={2}
            style={[fyStyles.counterCaption, { color: 'rgba(255,255,255,0.8)' }]}
          >
            100× daily — all sins forgiven · Bukhari 6307
          </Text>
        </View>
      </ImageBackground>

      <CounterExpandModal
        visible={expanded}
        nightMode={nightMode}
        title="Astaghfirullah"
        icon={<MaterialIcons name="replay" size={16} color="#A8E8CC" />}
        count={count}
        target={currentLevel.target}
        done={done}
        accentColor={accentColor}
        scaleAnim={scaleAnim}
        levels={ISTIGHFAR_LEVELS}
        levelIdx={levelIdx}
        onTap={tap}
        onSwitchLevel={switchLevel}
        onComplete={() => {
          onDismiss(cardId);
          setExpanded(false);
        }}
        onClose={() => setExpanded(false)}
        caption="100× daily — all sins forgiven · Bukhari 6307"
      />
    </>
  );
}

// ── La ilaha illallah Counter Card ──────────────────────────────────────
function TawhidCounterCard({
  nightMode, todayKey, dismissed, onDismiss,
}: CounterCardProps) {
  const cardId  = `tawhid-${todayKey}`;
  const countKey = `tawhid_count_${todayKey}`;
  const levelKey = 'tawhid_level_persist';

  const [count, setCount] = useState(0);
  const [levelIdx, setLevelIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const countRef = useRef(0);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { schedule: scheduleCountPersist, flush: flushCountPersist } = useDeferredStorageSetItem();

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

  useEffect(() => {
    return () => {
      flushCountPersist();
    };
  }, [countKey, flushCountPersist]);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  useEffect(() => {
    setExpanded(false);
  }, [countKey]);

  const currentLevel = TAWHID_LEVELS[levelIdx];
  const done = count >= currentLevel.target;

  const triggerFlash = () => {
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const tap = () => {
    const target = currentLevel.target;
    if (countRef.current >= target) return;
    const next = countRef.current + 1;
    countRef.current = next;
    setCount(next);
    scheduleCountPersist(countKey, String(next));
    if (!expanded) {
      scaleAnim.stopAnimation();
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 0.90, useNativeDriver: true, speed: 80 }),
        Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 40 }),
      ]).start();
    }
    if (next === target) triggerFlash();
  };

  const switchLevel = (idx: number) => {
    setLevelIdx(idx);
    AsyncStorage.setItem(levelKey, String(idx)).catch(() => {});
  };

  if (!loaded || dismissed.has(cardId)) return null;

  const accentColor = nightMode ? '#A8E8CC' : currentLevel.color;
  const flashOpacity = flashAnim.interpolate({ inputRange: [0,1], outputRange: [0, 0.30] });

  return (
    <>
      <ImageBackground
        source={TAWHID_BG}
        imageStyle={{ borderRadius: Radius.xl }}
        style={[fyStyles.duroodCard, fyStyles.duroodImageCard]}
      >
        <View style={fyStyles.duroodImageOverlay}>
          {/* Flash overlay */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none', backgroundColor: accentColor, opacity: flashOpacity, borderRadius: Radius.xl }]}
          />

          {/* Header */}
          <View style={[fyStyles.counterHeaderRow, { paddingLeft: 4 }]}>
            <Text style={[fyStyles.counterTitleText, { color: '#A8E8CC' }]}>La ilaha illallah</Text>
            {done ? (
              <View style={[fyStyles.counterDoneBadge, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]}>
                <MaterialIcons name="check" size={7} color="#fff" />
                <Text style={[fyStyles.counterDoneText, { color: '#fff' }]}>Done</Text>
              </View>
            ) : null}
            <MaterialIcons name="auto-awesome" size={14} color="#A8E8CC" />
          </View>

          {/* Counter tap */}
          <TouchableOpacity onPress={tap} activeOpacity={done ? 1 : 0.7} disabled={done}>
            <Animated.View style={[
              fyStyles.counterPanelCompact,
              { backgroundColor: 'rgba(255,255,255,0.18)' },
              { transform: [{ scale: scaleAnim }] },
            ]}>
              <Text style={[fyStyles.counterCountCompact, { color: '#fff' }]}>{count}</Text>
              <Text style={[fyStyles.counterTargetCompact, { color: 'rgba(255,255,255,0.7)' }]}>of {currentLevel.target} today</Text>
              <Text style={{ fontSize: 7, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginTop: 1, letterSpacing: 0.6, textTransform: 'uppercase' }}>TAP</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Level selector */}
          <View style={[fyStyles.counterSegmentedCompact, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            {TAWHID_LEVELS.map((lv, i) => (
              <TouchableOpacity
                key={lv.level}
                onPress={() => switchLevel(i)}
                activeOpacity={0.8}
                style={[
                  fyStyles.counterSegmentBtnCompact,
                  i === levelIdx
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : { backgroundColor: 'transparent', borderColor: 'transparent' },
                ]}
              >
                <Text style={[
                  fyStyles.counterSegmentTextCompact,
                  { color: i === levelIdx ? '#000' : 'rgba(255,255,255,0.7)' },
                ]}>{lv.target >= 1000 ? '1k' : lv.target}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={fyStyles.counterActionRowCompact}>
            <TouchableOpacity
              onPress={() => onDismiss(cardId)}
              style={[fyStyles.counterActionCompact, { borderColor: '#A8E8CC44' }]}
            >
              <MaterialIcons name="check-circle-outline" size={9} color="#A8E8CC" />
              <Text style={[fyStyles.counterActionTextCompact, { color: '#A8E8CC' }]}>Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setExpanded(true)}
              style={[fyStyles.counterActionCompact, { borderColor: '#A8E8CC44' }]}
            >
              <MaterialIcons name="open-in-full" size={9} color="#A8E8CC" />
              <Text style={[fyStyles.counterActionTextCompact, { color: '#A8E8CC' }]}>Expand</Text>
            </TouchableOpacity>
          </View>

          {/* Hadith caption */}
          <Text
            numberOfLines={2}
            style={[fyStyles.counterCaption, { color: 'rgba(255,255,255,0.8)' }]}
          >
            Whoever says it sincerely gains the Prophet’s intercession · Bukhari 99
          </Text>
        </View>
      </ImageBackground>

      <CounterExpandModal
        visible={expanded}
        nightMode={nightMode}
        title="La ilaha illallah"
        icon={<MaterialIcons name="auto-awesome" size={16} color="#A8E8CC" />}
        count={count}
        target={currentLevel.target}
        done={done}
        accentColor={accentColor}
        scaleAnim={scaleAnim}
        levels={TAWHID_LEVELS}
        levelIdx={levelIdx}
        onTap={tap}
        onSwitchLevel={switchLevel}
        onComplete={() => {
          onDismiss(cardId);
          setExpanded(false);
        }}
        onClose={() => setExpanded(false)}
        caption="Whoever says it sincerely gains the Prophet’s intercession · Bukhari 99"
      />
    </>
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
  const bgTint = nightMode ? 'rgba(147,197,253,0.06)' : '#F0F4FF';

  return (
    <View style={[
      fyStyles.duroodCard, { width: 136, padding: 7, gap: 3 },
      N && { backgroundColor: N.surface, borderColor: N.border },
    ]}>
      {/* Header */}
      <View style={fyStyles.counterHeaderRow}>
        <MaterialIcons name="nights-stay" size={10} color={accentColor} />
        <Text style={[fyStyles.counterTitleText, { color: accentColor }]}>Bed Time</Text>
      </View>

      {/* Icon tile — compact */}
      <View style={[fyStyles.duroodTapArea, {
        backgroundColor: bgTint,
        borderColor: accentColor + '18',
        borderWidth: 1,
        paddingVertical: 6,
        paddingHorizontal: 6,
      }]}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: accentColor, textAlign: 'center', lineHeight: 13 }}>
          Night Adhkar
        </Text>
        <Text style={{ fontSize: 8, fontWeight: '500', color: N ? N.textSub : Colors.textSubtle, textAlign: 'center', lineHeight: 10 }}>
          3 essentials before sleep
        </Text>
      </View>

      {/* Primary: Open Adhkar */}
      <TouchableOpacity
        onPress={onOpen}
        style={[fyStyles.openRow, {
          backgroundColor: accentColor,
          alignSelf: 'stretch',
          justifyContent: 'center',
          paddingVertical: 4,
        }]}
      >
        <MaterialIcons name="arrow-forward" size={9} color="#fff" />
        <Text style={[fyStyles.openText, { color: '#fff', fontSize: 9 }]}>Open Adhkar</Text>
      </TouchableOpacity>

      {/* Secondary: Done */}
      <TouchableOpacity
        onPress={() => onDismiss(cardId)}
        style={[fyStyles.openRow, {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: accentColor + '55',
          alignSelf: 'stretch',
          justifyContent: 'center',
          paddingVertical: 3,
        }]}
      >
        <MaterialIcons name="check-circle-outline" size={9} color={accentColor + 'CC'} />
        <Text style={[fyStyles.openText, { color: accentColor + 'CC', fontSize: 9 }]}>Done for tonight</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Daily Durood Counter Card ───────────────────────────────────────────
function DuroodCounterCard({
  nightMode, todayKey, dismissed, onDismiss,
}: CounterCardProps) {
  const duroodId = `durood-${todayKey}`;
  const countKey = `durood_count_${todayKey}`;
  const levelKey = 'durood_level_persist';

  const [count, setCount] = useState(0);
  const [levelIdx, setLevelIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const countRef = useRef(0);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { schedule: scheduleCountPersist, flush: flushCountPersist } = useDeferredStorageSetItem();

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

  useEffect(() => {
    return () => {
      flushCountPersist();
    };
  }, [countKey, flushCountPersist]);

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  useEffect(() => {
    setExpanded(false);
  }, [countKey]);

  const currentLevel = DUROOD_LEVELS[levelIdx];
  const done = count >= currentLevel.target;

  const triggerFlash = () => {
    flashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const tap = () => {
    const target = currentLevel.target;
    if (countRef.current >= target) return;
    const next = countRef.current + 1;
    countRef.current = next;
    setCount(next);
    scheduleCountPersist(countKey, String(next));
    if (!expanded) {
      scaleAnim.stopAnimation();
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, speed: 80 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }),
      ]).start();
    }
    if (next === target) triggerFlash();
  };

  const switchLevel = (idx: number) => {
    setLevelIdx(idx);
    AsyncStorage.setItem(levelKey, String(idx)).catch(() => {});
  };

  if (!loaded) return null;
  if (dismissed.has(duroodId)) return null;

  const accentColor = nightMode ? '#A8E8CC' : currentLevel.color;

  const flashOpacity = flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <>
      <ImageBackground
        source={GATES_BG}
        imageStyle={{ borderRadius: Radius.xl }}
        style={[fyStyles.duroodCard, fyStyles.duroodImageCard]}
      >
        <View style={fyStyles.duroodImageOverlay}>
          {/* Flash overlay */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { pointerEvents: 'none', backgroundColor: accentColor, opacity: flashOpacity, borderRadius: Radius.xl }]}
          />

          {/* Header */}
          <View style={[fyStyles.counterHeaderRow, { paddingLeft: 4 }]}>
            <Text style={[fyStyles.counterTitleText, { color: '#A8E8CC' }]}>Daily Durood</Text>
            {done ? (
              <View style={[fyStyles.counterDoneBadge, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }]}>
                <MaterialIcons name="check" size={7} color="#fff" />
                <Text style={[fyStyles.counterDoneText, { color: '#fff' }]}>Done</Text>
              </View>
            ) : null}
            <Text style={{ fontSize: 14, color: '#A8E8CC' }}>ﷺ</Text>
          </View>

          {/* Counter tap */}
          <TouchableOpacity onPress={tap} activeOpacity={done ? 1 : 0.7} disabled={done}>
            <Animated.View style={[
              fyStyles.counterPanelCompact,
              { backgroundColor: 'rgba(255,255,255,0.18)' },
              { transform: [{ scale: scaleAnim }] },
            ]}>
              <Text style={[fyStyles.counterCountCompact, { color: '#fff' }]}>{count}</Text>
              <Text style={[fyStyles.counterTargetCompact, { color: 'rgba(255,255,255,0.7)' }]}>of {currentLevel.target} today</Text>
              <Text style={{ fontSize: 7, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginTop: 1, letterSpacing: 0.6, textTransform: 'uppercase' }}>TAP</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Level selector */}
          <View style={[fyStyles.counterSegmentedCompact, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            {DUROOD_LEVELS.map((lv, i) => (
              <TouchableOpacity
                key={lv.level}
                onPress={() => switchLevel(i)}
                activeOpacity={0.8}
                style={[
                  fyStyles.counterSegmentBtnCompact,
                  i === levelIdx
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : { backgroundColor: 'transparent', borderColor: 'transparent' },
                ]}
              >
                <Text style={[
                  fyStyles.counterSegmentTextCompact,
                  { color: i === levelIdx ? '#000' : 'rgba(255,255,255,0.7)' },
                ]}>{lv.target >= 1000 ? '1k' : lv.target}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={fyStyles.counterActionRowCompact}>
            <TouchableOpacity
              onPress={() => onDismiss(duroodId)}
              style={[fyStyles.counterActionCompact, { borderColor: '#A8E8CC44' }]}
            >
              <MaterialIcons name="check-circle-outline" size={9} color="#A8E8CC" />
              <Text style={[fyStyles.counterActionTextCompact, { color: '#A8E8CC' }]}>Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setExpanded(true)}
              style={[fyStyles.counterActionCompact, { borderColor: '#A8E8CC44' }]}
            >
              <MaterialIcons name="open-in-full" size={9} color="#A8E8CC" />
              <Text style={[fyStyles.counterActionTextCompact, { color: '#A8E8CC' }]}>Expand</Text>
            </TouchableOpacity>
          </View>

          {/* Hadith caption */}
          <Text
            numberOfLines={2}
            style={[fyStyles.counterCaption, { color: 'rgba(255,255,255,0.8)' }]}
          >
            Dedicate to Durood — your worries solved, sins forgiven · Tirmidhi
          </Text>
        </View>
      </ImageBackground>

      <CounterExpandModal
        visible={expanded}
        nightMode={nightMode}
        title="Daily Durood"
        icon={<Text style={{ fontSize: 16, color: '#A8E8CC' }}>ﷺ</Text>}
        count={count}
        target={currentLevel.target}
        done={done}
        accentColor={accentColor}
        scaleAnim={scaleAnim}
        levels={DUROOD_LEVELS}
        levelIdx={levelIdx}
        onTap={tap}
        onSwitchLevel={switchLevel}
        onComplete={() => {
          onDismiss(duroodId);
          setExpanded(false);
        }}
        onClose={() => setExpanded(false)}
        caption="Dedicate to Durood — your worries solved, sins forgiven · Tirmidhi"
      />
    </>
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

  return (
    <TouchableOpacity
      style={[
        fyStyles.card,
        fyStyles.nextAdhkarStrip,
        N && { backgroundColor: N.surface, borderColor: N.border },
        !isAvailable && { opacity: 0.82 },
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <MaterialIcons name={isAvailable ? meta.icon as any : 'schedule'} size={14} color={accentColor} />
      <View style={{ flex: 1 }}>
        <Text style={[fyStyles.cardTitle, { fontSize: 11, lineHeight: 13 }, N && { color: N.textSub }]} numberOfLines={1}>
          {meta.title}
        </Text>
      </View>
      {isAvailable ? (
        <View style={[fyStyles.juzBadge, { backgroundColor: accentColor }]}>
          <Text style={fyStyles.juzBadgeText}>Ready</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 12, fontWeight: '900', color: accentColor, letterSpacing: 0.2, fontVariant: ['tabular-nums'] as any }}>
          {countdown}
        </Text>
      )}
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
  const overdueColor = nightMode ? '#FF736A' : '#C62828';

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
                { backgroundColor: card.color + '14' },
              ]}>
                <Text style={[fyStyles.badgeText, { color: card.color }]}>{card.badge}</Text>
              </View>
            ) : null}
          </View>

          {/* Row 2: title only */}
          <Text style={[fyStyles.cardTitle, N && { color: N.text }, isOverdue && { color: N ? '#FFD2CE' : '#7F1D1D' }]} numberOfLines={2}>{card.title}</Text>

          {/* Row 3: Open + Done */}
          <View style={fyStyles.ctaRow}>
            {card.route ? (
              <TouchableOpacity
                onPress={(e) => { e.stopPropagation(); onOpen(card); }}
                style={[
                  fyStyles.openPrimary,
                  {
                    backgroundColor: isOverdue
                      ? (N ? 'rgba(255,115,106,0.26)' : accentColor + '18')
                      : accentColor + (N ? '2A' : '18'),
                  },
                ]}
              >
                <Text style={[fyStyles.openPrimaryText, { color: isOverdue && N ? '#FFE8E5' : accentColor }]}>Open</Text>
                <MaterialIcons name="arrow-forward" size={10} color={isOverdue && N ? '#FFE8E5' : accentColor} />
              </TouchableOpacity>
            ) : <View />}
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onDismiss(card.id); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[fyStyles.doneIconBtn, { borderColor: accentColor + (N ? '44' : '30') }]}
              accessibilityLabel="Mark adhkar done"
            >
              <MaterialIcons name="check" size={12} color={accentColor} />
            </TouchableOpacity>
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
    boxShadow: '0px 6px 16px rgba(11,92,58,0.08)',
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
    width: 148,
    paddingHorizontal: 7,
    paddingVertical: 4,
    paddingBottom: 5,
    gap: 2,
  },
  counterPanel: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  // ── Normalized counter system ──
  counterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  counterTitleText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.3,
    flex: 1,
  },
  counterArabicSub: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    opacity: 0.7,
    marginBottom: -1,
  },
  counterPanelCompact: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  counterCountCompact: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  counterTargetCompact: {
    fontSize: 7,
    fontWeight: '600',
    color: '#8A958F',
    marginTop: -1,
    letterSpacing: 0.15,
  },
  counterProgressBgCompact: {
    height: 3,
    borderRadius: Radius.full,
    backgroundColor: '#DCE3DF',
    overflow: 'hidden',
    alignSelf: 'stretch',
    marginTop: 3,
  },
  counterProgressFillCompact: {
    height: 3,
    borderRadius: Radius.full,
  },
  counterSegmentedCompact: {
    flexDirection: 'row',
    gap: 2,
    padding: 2,
    borderRadius: Radius.full,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: '#F0F3F1',
  },
  counterSegmentBtnCompact: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 0,
    minHeight: 18,
    paddingHorizontal: 2,
  },
  counterSegmentTextCompact: {
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.1,
    fontVariant: ['tabular-nums'] as any,
  },
  counterCaption: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#A8B0AB',
    textAlign: 'center',
    lineHeight: 10,
    fontStyle: 'italic',
    marginTop: -1,
  },
  counterActionCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  counterActionRowCompact: {
    flexDirection: 'row',
    gap: 6,
  },
  counterActionTextCompact: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  counterModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.56)',
    paddingHorizontal: 18,
  },
  counterModalBox: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(168,232,204,0.35)',
    backgroundColor: '#16251D',
    padding: 12,
    gap: 8,
  },
  counterModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  counterModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  counterModalTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#A8E8CC',
  },
  counterModalCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  counterModalTapBox: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  counterModalCount: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  counterModalTarget: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.74)',
  },
  counterModalHint: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.48)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 3,
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
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 0.2,
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
    boxShadow: '0px 4px 12px rgba(11,92,58,0.06)',
    elevation: 3,
  },
  nextAdhkarStrip: {
    width: 'auto' as any,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  duroodImageCard: {
    width: 175,
    padding: 0,
    borderWidth: 0,
  },
  quranFullWidthCard: {
    padding: 0,
  },
  quranBgWrap: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  quranBgImage: {
    borderRadius: Radius.xl,
  },
  quranBgOverlay: {
    backgroundColor: 'rgba(0,0,0,0.44)',
    borderRadius: Radius.xl,
    padding: 11,
    gap: 8,
  },
  catchupBannerWrap: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(164,242,160,0.35)',
    backgroundColor: 'rgba(11,37,25,0.58)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  catchupBannerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  catchupBannerTitle: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: '#C9F7D4',
    letterSpacing: 0.2,
  },
  catchupBannerBody: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.86)',
  },
  catchupCountPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(79,233,72,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(79,233,72,0.45)',
  },
  catchupCountPillText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#BFF8B6',
    letterSpacing: 0.2,
  },
  catchupActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catchupActionBtn: {
    flex: 1,
    minHeight: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
  },
  catchupPrimaryBtn: {
    backgroundColor: '#A4F2A0',
  },
  catchupPrimaryBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0B2817',
    letterSpacing: 0.15,
  },
  catchupSecondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  catchupSecondaryBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.84)',
    letterSpacing: 0.15,
  },
  duroodImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: Radius.xl,
    padding: 9,
    gap: 4,
  },
  colorBar: {
    height: 3,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    backgroundColor: '#4FE948',
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
  doneIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
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
      contentContainerStyle={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: Spacing.md, paddingBottom: 8, paddingTop: 3 }}
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

const areCounterCardPropsEqual = (prev: CounterCardProps, next: CounterCardProps) => (
  prev.nightMode === next.nightMode
  && prev.todayKey === next.todayKey
  && prev.dismissed === next.dismissed
  && prev.onDismiss === next.onDismiss
);

const MemoDuroodCounterCard = memo(DuroodCounterCard, areCounterCardPropsEqual);
const MemoIstighfarCounterCard = memo(IstighfarCounterCard, areCounterCardPropsEqual);
const MemoTawhidCounterCard = memo(TawhidCounterCard, areCounterCardPropsEqual);

export function HomeForYouTodaySection({
  prayers, nightMode, currentTime, hijriDay, hijriMonthName,
}: {
  prayers: { name: string; timeDate: Date }[];
  nightMode: boolean;
  currentTime: Date;
  hijriDay: number;
  hijriMonthName?: string;
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
    let active = true;
    setLoaded(false);

    AsyncStorage.getItem(storageKey).then(val => {
      if (!active) return;

      if (val) {
        try {
          const parsed = JSON.parse(val);
          const next = new Set(Array.isArray(parsed) ? parsed : []);
          const filtered = new Set(
            Array.from(next).filter((id) => !NON_PERSISTED_REMINDER_IDS.has(String(id)))
          );
          setDismissed(filtered);
          if (filtered.size !== next.size) {
            AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(filtered))).catch(() => {});
          }
        } catch {
          setDismissed(new Set());
        }
      } else {
        // Reset dismissal state when the day changes and no cards are dismissed yet.
        setDismissed(new Set());
      }

      setLoaded(true);
    }).catch(() => {
      if (!active) return;
      setDismissed(new Set());
      setLoaded(true);
    });

    return () => {
      active = false;
    };
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
        router.push(`${card.route}?prayerTime=${card.prayerTab}&openAt=${Date.now()}` as any);
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
    Fajr: 'Ishraq', Dhuhr: 'Asr', Asr: 'Maghrib', Maghrib: 'Isha',
  };

  // Prayer adhkar cards — appear when that salah time has passed, persist until checked
  // Marked as overdue once the NEXT prayer has started
  PRAYER_ORDER.forEach(name => {
    const prayer = prayers.find(p => p.name === name);
    if (prayer && prayer.timeDate <= currentTime) {
      const card = PRAYER_ADHKAR_CARDS[name];
      if (card && !dismissed.has(card.id)) {
        const nextName = PRAYER_NEXT_MAP[name];
        // Fallback for legacy datasets that may not include Ishraq explicitly.
        const nextEntry = nextName
          ? (prayers.find(p => p.name === nextName)
            ?? (name === 'Fajr' ? prayers.find(p => p.name === 'Dhuhr') : null))
          : null;
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

  const allDone = cards.length === 0;

  // Augmented prayers for countdown (includes Tahajjud virtual entry)
  const tahajjudForCountdown = fajrPrayerObj
    ? new Date(fajrPrayerObj.timeDate.getTime() - 2 * 60 * 60 * 1000)
    : null;
  const augmentedPrayersForCountdown = tahajjudForCountdown
    ? [{ name: 'Tahajjud', timeDate: tahajjudForCountdown }, ...prayers]
    : prayers;

  const quranCardId = `quran-portion-${todayKey}`;
  const duroodCardId = `durood-${todayKey}`;
  const istighfarCardId = `istighfar-${todayKey}`;
  const showQuranRow = Platform.OS === 'web' ? true : !dismissed.has(quranCardId);
  const showCountersRow = !dismissed.has(duroodCardId) || !dismissed.has(istighfarCardId);

  // Keep this as the current row: prayer cards with utility follow-ups.
  const currentRowExtraSlots: React.ReactNode[] = [
    ishaHasPassed ? <BedTimeCard key="bedtime" nightMode={nightMode} todayKey={todayKey} dismissed={dismissed} onDismiss={dismissOnly} onOpen={() => router.push(`/(tabs)/duas?prayerTime=after-isha&group=Before+Sleep&openAt=${Date.now()}` as any)} /> : null,
    <NextAdhkarCountdownCard key="next-adhkar" nightMode={nightMode} prayers={augmentedPrayersForCountdown} currentTime={currentTime} onOpen={(prayerTab) => router.push(`/(tabs)/duas?prayerTime=${prayerTab}&openAt=${Date.now()}` as any)} />,
  ];

  return (
    <View style={sectionStyles.container}>
      <View style={sectionStyles.headerRow}>
        <View style={{ flex: 1 }}>
          {/* Section kicker */}
          <View style={sectionStyles.kickerRow}>
            <View style={[sectionStyles.kickerBar, N && { backgroundColor: N.accent }]} />
            <Text style={[sectionStyles.kicker, N && { color: N.textSub }]}>YOUR ADHKAR</Text>
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

      {showQuranRow ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 12, paddingBottom: 6, paddingTop: 2 }}
        >
          <QuranPortionCard
            nightMode={nightMode}
            todayKey={todayKey}
            dismissed={dismissed}
            onDismiss={dismissOnly}
            hijriDay={hijriDay}
            hijriMonthName={hijriMonthName}
          />
        </ScrollView>
      ) : null}

      {allDone ? (
        // Static current row when all prayer cards are done
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 12, paddingBottom: 6, paddingTop: 2 }}
        >
          {ishaHasPassed ? (
            <BedTimeCard nightMode={nightMode} todayKey={todayKey} dismissed={dismissed} onDismiss={dismissOnly} onOpen={() => router.push(`/(tabs)/duas?prayerTime=after-isha&group=Before+Sleep&openAt=${Date.now()}` as any)} />
          ) : null}
          <NextAdhkarCountdownCard
            nightMode={nightMode}
            prayers={augmentedPrayersForCountdown}
            currentTime={currentTime}
            onOpen={(prayerTab) => router.push(`/(tabs)/duas?prayerTime=${prayerTab}&openAt=${Date.now()}` as any)}
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
        // Auto-scrolling current row when cards are present
        <ForYouTickerRow
          cards={cards}
          nightMode={nightMode}
          onOpen={openCard}
          onDismiss={dismissOnly}
          extraSlots={currentRowExtraSlots}
        />
      )}

      {showCountersRow ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: 12, paddingBottom: 8, paddingTop: 2 }}
        >
          <MemoDuroodCounterCard
            nightMode={nightMode}
            todayKey={todayKey}
            dismissed={dismissed}
            onDismiss={dismissOnly}
          />
          <MemoIstighfarCounterCard
            nightMode={nightMode}
            todayKey={todayKey}
            dismissed={dismissed}
            onDismiss={dismissOnly}
          />
          <MemoTawhidCounterCard
            nightMode={nightMode}
            todayKey={todayKey}
            dismissed={dismissed}
            onDismiss={dismissOnly}
          />
        </ScrollView>
      ) : null}
    </View>
  );
}

