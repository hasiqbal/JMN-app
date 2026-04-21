import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import { getJuzEndPage, getJuzStartPage, getMushafTotalPages, getQuarterStartsInJuz } from '@/constants/mushafJuzPages';

const NIGHT = {
  bg: '#0A0F1E',
  text: '#EEF3FC',
  textSub: '#93B4D8',
};

const QURAN_MUSHAF_LAYOUT_KEY = 'quran_mushaf_layout_v1';
const PENDING_OPEN_KEY = 'quran_pending_open_v1';

type MushafLayout = '15line' | '16line';

const ADHKAR_QURAN_SOURCE = 'adhkar-duas';

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali Imran', 4: 'An-Nisa', 5: 'Al-Maidah',
  6: 'Al-Anam', 7: 'Al-Araf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Rad', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Taha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Muminun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shuara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqiah', 57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saf', 62: 'Al-Jumuah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Maarij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-Ala', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
  101: 'Al-Qariah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Maun', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas',
};

const SURAH_START_PAGE: Record<number, number> = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187,
  10: 208, 11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282, 18: 293,
  19: 305, 20: 312, 21: 322, 22: 333, 23: 342, 24: 350, 25: 359, 26: 367, 27: 377,
  28: 385, 29: 396, 30: 404, 31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440,
  37: 446, 38: 453, 39: 458, 40: 467, 41: 477, 42: 483, 43: 489, 44: 496, 45: 499,
  46: 502, 47: 507, 48: 511, 49: 515, 50: 518, 51: 520, 52: 523, 53: 526, 54: 528,
  55: 531, 56: 534, 57: 537, 58: 542, 59: 545, 60: 549, 61: 551, 62: 553, 63: 554,
  64: 556, 65: 558, 66: 560, 67: 562, 68: 564, 69: 566, 70: 568, 71: 570, 72: 572,
  73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585, 81: 586,
  82: 587, 83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593, 90: 594,
  91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599,
  100: 599, 101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602, 107: 602,
  108: 602, 109: 603, 110: 603, 111: 603, 112: 604, 113: 604, 114: 604,
};

const SURAH_START_PAGE_15LINE_BUTTONS: Record<number, number> = {
  1: 2, 2: 3, 3: 51, 4: 78, 5: 107, 6: 129, 7: 152, 8: 178, 9: 188,
  10: 209, 11: 222, 12: 236, 13: 250, 14: 256, 15: 262, 16: 268, 17: 283, 18: 294,
  19: 306, 20: 313, 21: 323, 22: 332, 23: 343, 24: 351, 25: 360, 26: 367, 27: 377,
  28: 386, 29: 397, 30: 405, 31: 412, 32: 416, 33: 419, 34: 429, 35: 435, 36: 441,
  37: 446, 38: 453, 39: 459, 40: 468, 41: 478, 42: 484, 43: 490, 44: 496, 45: 499,
  46: 503, 47: 507, 48: 512, 49: 516, 50: 519, 51: 521, 52: 524, 53: 527, 54: 529,
  55: 532, 56: 535, 57: 538, 58: 543, 59: 546, 60: 550, 61: 552, 62: 554, 63: 555,
  64: 557, 65: 559, 66: 561, 67: 563, 68: 565, 69: 568, 70: 570, 71: 572, 72: 574,
  73: 577, 74: 579, 75: 581, 76: 583, 77: 585, 78: 587, 79: 588, 80: 590, 81: 591,
  82: 592, 83: 593, 84: 595, 85: 596, 86: 597, 87: 598, 88: 599, 89: 599, 90: 601,
  91: 601, 92: 602, 93: 603, 94: 603, 95: 604, 96: 604, 97: 605, 98: 605, 99: 606,
  100: 606, 101: 607, 102: 607, 103: 608, 104: 608, 105: 608, 106: 609, 107: 609,
  108: 609, 109: 609, 110: 610, 111: 610, 112: 610, 113: 611, 114: 611,
};

const SURAH_START_PAGE_16LINE_BUTTONS: Record<number, number> = {
  1: 2, 2: 3, 3: 46, 4: 70, 5: 97, 6: 116, 7: 137, 8: 160, 9: 169,
  10: 188, 11: 200, 12: 213, 13: 225, 14: 231, 15: 236, 16: 241, 17: 255, 18: 265,
  19: 276, 20: 282, 21: 291, 22: 300, 23: 309, 24: 316, 25: 325, 26: 331, 27: 340,
  28: 348, 29: 358, 30: 365, 31: 371, 32: 374, 33: 377, 34: 386, 35: 392, 36: 397,
  37: 402, 38: 409, 39: 413, 40: 421, 41: 430, 42: 435, 43: 441, 44: 447, 45: 449,
  46: 453, 47: 457, 48: 461, 49: 464, 50: 467, 51: 469, 52: 472, 53: 474, 54: 476,
  55: 479, 56: 482, 57: 485, 58: 489, 59: 492, 60: 496, 61: 498, 62: 500, 63: 501,
  64: 503, 65: 505, 66: 507, 67: 509, 68: 511, 69: 513, 70: 515, 71: 517, 72: 519,
  73: 521, 74: 522, 75: 524, 76: 525, 77: 527, 78: 529, 79: 530, 80: 531, 81: 533,
  82: 533, 83: 534, 84: 535, 85: 536, 86: 537, 87: 538, 88: 538, 89: 539, 90: 540,
  91: 541, 92: 541, 93: 542, 94: 542, 95: 543, 96: 543, 97: 544, 98: 544, 99: 545,
  100: 545, 101: 545, 102: 546, 103: 546, 104: 546, 105: 547, 106: 547, 107: 547,
  108: 547, 109: 548, 110: 548, 111: 548, 112: 548, 113: 549, 114: 549,
};

const JUZ_SURAH_MAP: Record<number, number[]> = {
  1: [1, 2],
  2: [2],
  3: [2, 3],
  4: [3, 4],
  5: [4],
  6: [4, 5],
  7: [5, 6],
  8: [6, 7],
  9: [7, 8],
  10: [8, 9],
  11: [9, 10, 11],
  12: [11, 12],
  13: [12, 13, 14, 15],
  14: [15, 16],
  15: [17, 18],
  16: [18, 19, 20],
  17: [21, 22],
  18: [23, 24, 25],
  19: [25, 26, 27],
  20: [27, 28, 29],
  21: [29, 30, 31, 32, 33],
  22: [33, 34, 35, 36],
  23: [36, 37, 38, 39],
  24: [39, 40, 41],
  25: [41, 42, 43, 44, 45],
  26: [46, 47, 48, 49, 50, 51],
  27: [51, 52, 53, 54, 55, 56, 57],
  28: [58, 59, 60, 61, 62, 63, 64, 65, 66],
  29: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
  30: [78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114],
};

function chapterForMushafPage(targetPage: number): number {
  let chapter = 1;
  for (let s = 1; s <= 114; s += 1) {
    if ((SURAH_START_PAGE[s] ?? 999) <= targetPage) {
      chapter = s;
    } else {
      break;
    }
  }
  return chapter;
}

function getSurahsInJuz(layout: MushafLayout, juz: number): number[] {
  void layout;
  return JUZ_SURAH_MAP[juz] ?? [];
}

function getDisplayedJuzPage(layout: MushafLayout, page: number): number {
  void layout;
  return page + 1;
}

function pickParamValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function normalizePrayerTimeParam(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value === 'after-dhuhr' ? 'after-zuhr' : value;
}

function getSurahPageRange(layout: MushafLayout, chapter: number): { startPage: number; endPage: number } {
  const startMap = layout === '15line'
    ? SURAH_START_PAGE_15LINE_BUTTONS
    : layout === '16line'
      ? SURAH_START_PAGE_16LINE_BUTTONS
      : SURAH_START_PAGE;

  const surahOpenOffset = layout === '15line'
    ? -1
    : layout === '16line'
      ? (chapter === 1 ? -2 : -1)
      : 0;

  const startPage = Math.max(1, (startMap[chapter] ?? 1) + surahOpenOffset);
  const nextStart = startMap[chapter + 1];
  const endPage = Math.max(
    startPage,
    nextStart !== undefined
      ? (nextStart + surahOpenOffset - 1)
      : getMushafTotalPages(layout)
  );

  return { startPage, endPage };
}

export default function QuranScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    source?: string | string[];
    autoOpen?: string | string[];
    chapter?: string | string[];
    page?: string | string[];
    prayerTime?: string | string[];
    group?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [mushafLayout, setMushafLayout] = useState<MushafLayout>('15line');
  const [selectedMushaf, setSelectedMushaf] = useState<MushafLayout | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [expandedJuz, setExpandedJuz] = useState<number | null>(1);
  const [selectedQuarter, setSelectedQuarter] = useState<{ juz: number; quarter: number } | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [pendingOpenLabel, setPendingOpenLabel] = useState('None');
  const [isStateHydrated, setIsStateHydrated] = useState(false);
  const processedAdhkarAutoOpenRef = React.useRef<string | null>(null);
  const N = nightMode ? NIGHT : null;

  const sourceParam = pickParamValue(params.source);
  const autoOpenParam = pickParamValue(params.autoOpen);
  const chapterParam = Number(pickParamValue(params.chapter));
  const pageParam = Number(pickParamValue(params.page));
  const prayerTimeParam = normalizePrayerTimeParam(pickParamValue(params.prayerTime));
  const groupParam = pickParamValue(params.group);

  const openReaderScreen = useCallback((startPage: number, endPage: number, extraParams?: Record<string, string>) => {
    router.push({
      pathname: '/quran-reader',
      params: {
        startPage: String(startPage),
        endPage: String(endPage),
        mushaf: mushafLayout,
        ...(extraParams ?? {}),
      },
    } as any);
  }, [router, mushafLayout]);

  const loadQuranState = useCallback(async () => {
    try {
      const [storedLayout, pendingOpen] = await Promise.all([
        AsyncStorage.getItem(QURAN_MUSHAF_LAYOUT_KEY),
        AsyncStorage.getItem(PENDING_OPEN_KEY),
      ]);

      if (storedLayout === '15line' || storedLayout === '16line') {
        setMushafLayout(storedLayout);
      }

      if (!pendingOpen) {
        setPendingOpenLabel('None');
        return;
      }

      const [chapterRaw, pageRaw] = pendingOpen.split('|');
      const chapter = Number(chapterRaw);
      const page = Number(pageRaw);
      if (Number.isFinite(chapter) && Number.isFinite(page)) {
        setPendingOpenLabel(`Surah ${chapter} · Page ${page}`);
      } else if (Number.isFinite(chapter)) {
        setPendingOpenLabel(`Surah ${chapter}`);
      } else {
        setPendingOpenLabel('None');
      }
    } finally {
      setIsStateHydrated(true);
    }
  }, []);

  useEffect(() => {
    setIsStateHydrated(false);
    loadQuranState().catch(() => {
      setPendingOpenLabel('None');
    });
  }, [loadQuranState]);

  const chooseMushaf = useCallback(async (nextLayout: MushafLayout) => {
    setMushafLayout(nextLayout);
    setSelectedMushaf(nextLayout);
    setSelectedJuz(null);
    setExpandedJuz(1);
    setSelectedQuarter(null);
    setSelectedSurah(null);
    await AsyncStorage.setItem(QURAN_MUSHAF_LAYOUT_KEY, nextLayout);
  }, []);

  const chooseJuz = useCallback(async (juz: number) => {
    const targetPage = getJuzStartPage(mushafLayout, juz);
    const chapter = chapterForMushafPage(targetPage);
    setSelectedJuz(juz);
    setExpandedJuz(juz);
    setSelectedQuarter(null);
    setSelectedSurah(null);
    setPendingOpenLabel(`Surah ${chapter} · Page ${targetPage}`);
    setLastUpdated(new Date());
    await AsyncStorage.setItem(PENDING_OPEN_KEY, `${chapter}|${targetPage}`);
    openReaderScreen(targetPage, getJuzEndPage(mushafLayout, juz), {
      navMode: 'juz',
      juz: String(juz),
    });
  }, [mushafLayout, openReaderScreen]);

  const chooseQuarterInJuz = useCallback(async (juz: number, quarter: number) => {
    const quarterStart = getQuarterStartsInJuz(mushafLayout, juz).find((item) => item.quarter === quarter);
    const targetPage = quarterStart?.page ?? getJuzStartPage(mushafLayout, juz);
    const chapter = chapterForMushafPage(targetPage);
    setSelectedJuz(juz);
    setExpandedJuz(juz);
    setSelectedQuarter({ juz, quarter });
    setSelectedSurah(null);
    setPendingOpenLabel(`Surah ${chapter} · Page ${targetPage}`);
    setLastUpdated(new Date());
    await AsyncStorage.setItem(PENDING_OPEN_KEY, `${chapter}|${targetPage}`);
    openReaderScreen(targetPage, getJuzEndPage(mushafLayout, juz), {
      navMode: 'quarter',
      juz: String(juz),
      quarter: String(quarter),
    });
  }, [mushafLayout, openReaderScreen]);

  const chooseSurahInJuz = useCallback(async (chapter: number) => {
    const { startPage: targetPage, endPage } = getSurahPageRange(mushafLayout, chapter);
    setSelectedSurah(chapter);
    setSelectedQuarter(null);
    setPendingOpenLabel(`Surah ${chapter} · Page ${targetPage}`);
    setLastUpdated(new Date());
    await AsyncStorage.setItem(PENDING_OPEN_KEY, `${chapter}|${targetPage}`);
    openReaderScreen(targetPage, endPage);
  }, [mushafLayout, openReaderScreen]);

  useEffect(() => {
    if (!isStateHydrated) return;

    const hasAutoOpenRequest = sourceParam === ADHKAR_QURAN_SOURCE && autoOpenParam === '1' && Number.isFinite(chapterParam);
    if (!hasAutoOpenRequest) return;

    const chapter = Math.floor(chapterParam);
    if (chapter < 1 || chapter > 114) return;
    const pageOverride = Number.isFinite(pageParam) && pageParam >= 1
      ? Math.floor(pageParam) - 1
      : null;

    const requestKey = `${mushafLayout}|${chapter}|${pageOverride ?? ''}|${prayerTimeParam ?? ''}|${groupParam ?? ''}`;
    if (processedAdhkarAutoOpenRef.current === requestKey) return;
    processedAdhkarAutoOpenRef.current = requestKey;

    const { startPage, endPage } = getSurahPageRange(mushafLayout, chapter);
    const effectiveStartPage = pageOverride ?? startPage;
    const sourceParams: Record<string, string> = {
      navMode: 'surah',
      chapter: String(chapter),
      source: ADHKAR_QURAN_SOURCE,
    };
    if (prayerTimeParam) {
      sourceParams.prayerTime = prayerTimeParam;
    }
    if (groupParam && groupParam.trim().length > 0) {
      sourceParams.group = groupParam;
    }

    setSelectedMushaf(mushafLayout);
    setSelectedSurah(chapter);
    setSelectedQuarter(null);
    setSelectedJuz(null);
    setExpandedJuz(1);
    setPendingOpenLabel(`Surah ${chapter} · Page ${effectiveStartPage}`);
    setLastUpdated(new Date());

    AsyncStorage.setItem(PENDING_OPEN_KEY, `${chapter}|${effectiveStartPage}`).catch(() => {});
    openReaderScreen(effectiveStartPage, endPage, sourceParams);
  }, [autoOpenParam, chapterParam, groupParam, isStateHydrated, mushafLayout, openReaderScreen, pageParam, prayerTimeParam, sourceParam]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadQuranState();
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [loadQuranState]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: N ? N.bg : Colors.background }]}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onPullRefresh}
          tintColor={N ? N.text : Colors.primary}
        />
      }
    >
      <View style={styles.inner}>
        <Text style={[styles.title, N && { color: N.text }]}>Quran</Text>
        {!selectedMushaf ? (
          <>
            <Text style={[styles.sub, styles.sectionTitle, N && { color: N.textSub }]}>Choose Quran First</Text>
            <View style={styles.layoutChoiceWrap}>
              {(['15line', '16line'] as MushafLayout[]).map((layout) => {
                const label = layout === '16line' ? '16-Line Quran' : '15-Line Quran';
                return (
                  <TouchableOpacity
                    key={layout}
                    onPress={() => chooseMushaf(layout)}
                    style={[
                      styles.layoutChoice,
                      N && { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
                    ]}
                    activeOpacity={0.9}
                  >
                    <Text style={[styles.layoutChoiceTitle, N && { color: N.text }]}>{label}</Text>
                    <Text style={[styles.layoutChoiceSub, N && { color: N.textSub }]}>Tap to open and choose Juz</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.sub, styles.sectionTitle, N && { color: N.textSub }]}>
              {selectedMushaf === '16line' ? '16-Line Quran' : '15-Line Quran'}
            </Text>
            <TouchableOpacity
              style={[styles.backBtn, N && { borderColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => {
                setSelectedMushaf(null);
                setExpandedJuz(1);
                setSelectedJuz(null);
                setSelectedQuarter(null);
                setSelectedSurah(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.backBtnText, N && { color: N.textSub }]}>Choose another Quran</Text>
            </TouchableOpacity>

            <Text style={[styles.sub, N && { color: N.textSub }]}>Choose Juz or Surah</Text>
            <View style={styles.juzGroupsWrap}>
              {Array.from({ length: 30 }, (_, index) => index + 1).map((juz) => {
                const selected = selectedJuz === juz;
                const surahsInJuz = getSurahsInJuz(mushafLayout, juz);
                const firstSurah = surahsInJuz[0] ?? 1;
                const lastSurah = surahsInJuz[surahsInJuz.length - 1] ?? firstSurah;

                return (
                  <View
                    key={juz}
                    style={[
                      styles.juzGroup,
                      N && { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => chooseJuz(juz)}
                      style={[styles.juzHeaderBtn, selected && styles.juzHeaderBtnActive]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.juzTitle, selected && styles.juzTitleActive]}>Juz {juz}</Text>
                      <Text style={[styles.juzSub, N && { color: N.textSub }]}>Pages {getDisplayedJuzPage(mushafLayout, getJuzStartPage(mushafLayout, juz))}-{getDisplayedJuzPage(mushafLayout, getJuzEndPage(mushafLayout, juz))}</Text>
                    </TouchableOpacity>

                    <View style={styles.optionsWrap}>
                      <Text style={[styles.optionGroupLabel, N && { color: N.textSub }]}>Quarters</Text>
                      <View style={styles.chipsWrap}>
                        {getQuarterStartsInJuz(mushafLayout, juz).map((item) => {
                          const isQuarterSelected = selectedQuarter?.juz === juz && selectedQuarter.quarter === item.quarter;
                          const quarterLabel = item.quarter === 1
                            ? '1st Quarter'
                            : item.quarter === 2
                              ? '2nd Quarter'
                              : item.quarter === 3
                                ? '3rd Quarter'
                                : '4th Quarter';
                          return (
                            <TouchableOpacity
                              key={`q-${juz}-${item.quarter}`}
                              onPress={() => chooseQuarterInJuz(juz, item.quarter)}
                              style={[styles.quarterChip, isQuarterSelected && styles.quarterChipActive]}
                              activeOpacity={0.85}
                            >
                              <Text style={[styles.quarterChipText, isQuarterSelected && styles.quarterChipTextActive]}>
                                {quarterLabel}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text style={[styles.optionGroupLabel, N && { color: N.textSub }]}>Surahs</Text>
                      <View style={styles.chipsWrap}>
                        {surahsInJuz.map((chapter) => {
                          const isSelected = selectedSurah === chapter;
                          return (
                            <TouchableOpacity
                              key={chapter}
                              onPress={() => chooseSurahInJuz(chapter)}
                              style={[styles.surahChip, isSelected && styles.surahChipActive]}
                              activeOpacity={0.85}
                            >
                              <Text style={[styles.surahChipText, isSelected && styles.surahChipTextActive]}>
                                {SURAH_NAMES[chapter] ?? `Surah ${chapter}`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

          </>
        )}
        <Text style={[styles.sub, N && { color: N.textSub }]}>Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 96,
  },
  settingRow: {
    width: '100%',
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D6E1DB',
    backgroundColor: '#EEF4F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingRowNight: {
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  settingSub: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSubtle,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
  },
  layoutChoiceWrap: {
    width: '100%',
    gap: 10,
    marginBottom: 8,
  },
  layoutChoice: {
    borderWidth: 1,
    borderColor: '#D6E1DB',
    backgroundColor: '#EEF4F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  layoutChoiceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  layoutChoiceSub: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSubtle,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: '#C7D8CE',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 10,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A6457',
  },
  juzGroupsWrap: {
    width: '100%',
    gap: 8,
    marginBottom: 8,
  },
  juzGroup: {
    borderWidth: 1,
    borderColor: '#D6E1DB',
    backgroundColor: '#F0F5F2',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  juzHeaderBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  juzHeaderBtnActive: {
    backgroundColor: '#4FE948',
  },
  juzTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  juzTitleActive: {
    color: '#0B2817',
  },
  juzSub: {
    marginTop: 2,
    fontSize: 11,
    color: '#6B7F74',
  },
  juzRangeSub: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 12,
    color: '#60756A',
    textAlign: 'center',
  },
  expandHint: {
    marginTop: 4,
    fontSize: 10,
    color: '#60756A',
  },
  optionsWrap: {
    paddingHorizontal: 4,
    paddingTop: 6,
    gap: 6,
  },
  optionGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60756A',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quarterChip: {
    borderWidth: 1,
    borderColor: '#8BC997',
    backgroundColor: '#EAF8EE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quarterChipActive: {
    backgroundColor: '#4FE948',
    borderColor: '#4FE948',
  },
  quarterChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#23563A',
  },
  quarterChipTextActive: {
    color: '#0B2817',
  },
  surahChip: {
    borderWidth: 1,
    borderColor: '#BFD0C7',
    backgroundColor: '#F8FBF9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  surahChipActive: {
    backgroundColor: '#4FE948',
    borderColor: '#4FE948',
  },
  surahChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#355645',
  },
  surahChipTextActive: {
    color: '#0B2817',
  },
  sub: {
    fontSize: 15,
    color: Colors.textSubtle,
    marginTop: 4,
  },
});
