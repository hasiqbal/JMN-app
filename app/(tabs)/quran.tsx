import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import { getJuzEndPage, getJuzStartPage } from '@/constants/mushafJuzPages';

const NIGHT = {
  bg: '#0A0F1E',
  text: '#EEF3FC',
  textSub: '#93B4D8',
};

const QURAN_MUSHAF_LAYOUT_KEY = 'quran_mushaf_layout_v1';
const PENDING_OPEN_KEY = 'quran_pending_open_v1';
type MushafLayout = '15line' | '16line';

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
  const startPage = getJuzStartPage(layout, juz);
  const endPage = getJuzEndPage(layout, juz);
  const chapters: number[] = [];

  for (let chapter = 1; chapter <= 114; chapter += 1) {
    const surahStart = SURAH_START_PAGE[chapter] ?? 999;
    const nextStart = SURAH_START_PAGE[chapter + 1] ?? 605;
    const surahEnd = nextStart - 1;
    if (surahStart <= endPage && surahEnd >= startPage) {
      chapters.push(chapter);
    }
  }

  return chapters;
}

function getQuarterStartsInJuz(layout: MushafLayout, juz: number): Array<{ quarter: number; page: number }> {
  const startPage = getJuzStartPage(layout, juz);
  const endPage = getJuzEndPage(layout, juz);
  const totalPages = endPage - startPage + 1;

  return [1, 2, 3, 4].map((quarter) => {
    const offset = Math.floor(((quarter - 1) * totalPages) / 4);
    return { quarter, page: startPage + offset };
  });
}

export default function QuranScreen() {
  const router = useRouter();
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
  const N = nightMode ? NIGHT : null;

  const openReaderScreen = useCallback((startPage: number, endPage: number) => {
    router.push({
      pathname: '/quran-reader',
      params: {
        startPage: String(startPage),
        endPage: String(endPage),
        mushaf: mushafLayout,
      },
    } as any);
  }, [router, mushafLayout]);

  const loadQuranState = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadQuranState().catch(() => {});
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
    openReaderScreen(targetPage, getJuzEndPage(mushafLayout, juz));
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
    openReaderScreen(targetPage, getJuzEndPage(mushafLayout, juz));
  }, [mushafLayout, openReaderScreen]);

  const chooseSurahInJuz = useCallback(async (chapter: number) => {
    const targetPage = SURAH_START_PAGE[chapter] ?? 1;
    const endPage = (SURAH_START_PAGE[chapter + 1] ?? 605) - 1;
    setSelectedSurah(chapter);
    setSelectedQuarter(null);
    setPendingOpenLabel(`Surah ${chapter} · Page ${targetPage}`);
    setLastUpdated(new Date());
    await AsyncStorage.setItem(PENDING_OPEN_KEY, `${chapter}|${targetPage}`);
    openReaderScreen(targetPage, endPage);
  }, [openReaderScreen]);

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
                const open = expandedJuz === juz;
                const surahsInJuz = getSurahsInJuz(mushafLayout, juz);
                const firstSurah = surahsInJuz[0] ?? 1;
                const lastSurah = surahsInJuz[surahsInJuz.length - 1] ?? firstSurah;
                const surahRange = firstSurah === lastSurah
                  ? (SURAH_NAMES[firstSurah] ?? `Surah ${firstSurah}`)
                  : `${SURAH_NAMES[firstSurah] ?? `Surah ${firstSurah}`} - ${SURAH_NAMES[lastSurah] ?? `Surah ${lastSurah}`}`;

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
                      onLongPress={() => setExpandedJuz(open ? null : juz)}
                      style={[styles.juzHeaderBtn, selected && styles.juzHeaderBtnActive]}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.juzTitle, selected && styles.juzTitleActive]}>Juz {juz}</Text>
                      <Text style={[styles.juzSub, N && { color: N.textSub }]}>Pages {getJuzStartPage(mushafLayout, juz)}-{getJuzEndPage(mushafLayout, juz)}</Text>
                      <Text style={[styles.juzRangeSub, N && { color: N.textSub }]} numberOfLines={2}>{surahRange}</Text>
                      <Text style={[styles.expandHint, N && { color: N.textSub }]}>{open ? 'Tap quarter or surah below' : 'Tap Juz to jump'}</Text>
                    </TouchableOpacity>

                    {open ? (
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
                    ) : null}
                  </View>
                );
              })}
            </View>

            <Text style={[styles.sub, N && { color: N.textSub }]}>Selected Mushaf: {mushafLayout === '16line' ? '16-Line' : '15-Line'}</Text>
          </>
        )}
        <Text style={[styles.sub, N && { color: N.textSub }]}>Pending open target: {pendingOpenLabel}</Text>
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
