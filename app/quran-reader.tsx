import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import { QURAN_15LINE_FULL_PAGE_IMAGES } from '@/constants/quran15lineFullMap';
import { QURAN_16LINE_FULL_PAGE_IMAGES } from '@/constants/quran16lineFullMap';
import { getJuzEndPage, getJuzStartPage, getQuarterStartsInJuz } from '@/constants/mushafJuzPages';

const NIGHT = {
  bg: '#0A0F1E',
  text: '#EEF3FC',
  textSub: '#93B4D8',
  panel: '#101829',
  border: '#1E2D47',
};

function toNumber(value: string | string[] | undefined, fallback: number): number {
  const text = Array.isArray(value) ? value[0] : value;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function QuranReaderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const params = useLocalSearchParams();

  const startPage = useMemo(() => Math.max(1, toNumber(params.startPage, 1)), [params.startPage]);
  const endPage = useMemo(() => Math.max(startPage, toNumber(params.endPage, startPage)), [params.endPage, startPage]);
  const navMode = useMemo(() => {
    const raw = Array.isArray(params.navMode) ? params.navMode[0] : params.navMode;
    return raw === 'juz' || raw === 'quarter' ? raw : null;
  }, [params.navMode]);
  const paramJuz = useMemo(() => {
    const parsed = toNumber(params.juz, 0);
    return parsed >= 1 && parsed <= 30 ? parsed : null;
  }, [params.juz]);
  const paramQuarter = useMemo(() => {
    const parsed = toNumber(params.quarter, 0);
    return parsed >= 1 && parsed <= 4 ? parsed : null;
  }, [params.quarter]);
  const mushaf = useMemo(() => {
    const raw = Array.isArray(params.mushaf) ? params.mushaf[0] : params.mushaf;
    return raw === '16line' ? '16line' : '15line';
  }, [params.mushaf]);

  const [currentJuz, setCurrentJuz] = useState<number | null>(paramJuz);
  const [currentQuarter, setCurrentQuarter] = useState<number | null>(navMode === 'quarter' ? paramQuarter : null);

  useEffect(() => {
    setCurrentJuz(paramJuz);
    setCurrentQuarter(navMode === 'quarter' ? paramQuarter : null);
  }, [paramJuz, paramQuarter, navMode]);

  const activeRange = useMemo(() => {
    if (navMode === 'juz' && currentJuz) {
      return {
        start: getJuzStartPage(mushaf, currentJuz),
        end: getJuzEndPage(mushaf, currentJuz),
      };
    }

    if (navMode === 'quarter' && currentJuz && currentQuarter) {
      const starts = getQuarterStartsInJuz(mushaf, currentJuz);
      const start = starts.find((q) => q.quarter === currentQuarter)?.page ?? getJuzStartPage(mushaf, currentJuz);
      const end = currentQuarter < 4
        ? (starts.find((q) => q.quarter === currentQuarter + 1)?.page ?? (getJuzEndPage(mushaf, currentJuz) + 1)) - 1
        : getJuzEndPage(mushaf, currentJuz);
      return { start, end };
    }

    return { start: startPage, end: endPage };
  }, [navMode, currentJuz, currentQuarter, mushaf, startPage, endPage]);

  const [page, setPage] = useState(activeRange.start);
  const N = nightMode ? NIGHT : null;

  useEffect(() => {
    setPage(activeRange.start);
  }, [activeRange.start]);

  const goToNextSegment = useMemo(
    () => () => {
      if (navMode === 'juz' && currentJuz && currentJuz < 30) {
        setCurrentJuz(currentJuz + 1);
      }
      if (navMode === 'quarter' && currentJuz && currentQuarter) {
        if (currentQuarter < 4) {
          setCurrentQuarter(currentQuarter + 1);
          return;
        }
        if (currentJuz < 30) {
          setCurrentJuz(currentJuz + 1);
          setCurrentQuarter(1);
        }
      }
    },
    [navMode, currentJuz, currentQuarter]
  );

  const goToPreviousSegment = useMemo(
    () => () => {
      if (navMode === 'juz' && currentJuz && currentJuz > 1) {
        setCurrentJuz(currentJuz - 1);
      }
      if (navMode === 'quarter' && currentJuz && currentQuarter) {
        if (currentQuarter > 1) {
          setCurrentQuarter(currentQuarter - 1);
          return;
        }
        if (currentJuz > 1) {
          setCurrentJuz(currentJuz - 1);
          setCurrentQuarter(4);
        }
      }
    },
    [navMode, currentJuz, currentQuarter]
  );

  const swipeHandlers = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 24,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -40) {
            if (page > activeRange.start) {
              setPage((p) => p - 1);
            } else {
              goToPreviousSegment();
            }
            return;
          }
          if (gestureState.dx > 40) {
            if (page < activeRange.end) {
              setPage((p) => p + 1);
            } else {
              goToNextSegment();
            }
          }
        },
      }),
    [page, activeRange.start, activeRange.end, goToNextSegment, goToPreviousSegment]
  );

  const localSource =
    mushaf === '16line'
      ? (QURAN_16LINE_FULL_PAGE_IMAGES[page] ?? null)
      : (QURAN_15LINE_FULL_PAGE_IMAGES[page] ?? null);

  return (
    <View style={[styles.container, { backgroundColor: N ? N.bg : '#000' }]}>
      <View
        style={[styles.viewerPanel, N && { backgroundColor: N.panel, borderColor: N.border }]}
        {...swipeHandlers.panHandlers}
      >
        <View style={[styles.topOverlay, { top: insets.top + 8 }, N && { backgroundColor: 'rgba(16,24,41,0.72)', borderColor: N.border }]}> 
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/quran');
            }
          }}
          style={[styles.backBtn, N && { borderColor: N.border }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.backBtnText, N && { color: N.text }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.sub, N && { color: N.textSub }]}>Pages {activeRange.start}-{activeRange.end}</Text>
        </View>
      </View>

        {localSource ? (
          <Image source={localSource} style={styles.image} contentFit="contain" transition={80} />
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, N && { color: N.text }]}>Image not mapped on this test reader</Text>
            <Text style={[styles.emptySub, N && { color: N.textSub }]}>No local image mapped for this page in {mushaf === '16line' ? '16-Line' : '15-Line'} Full folder.</Text>
            <Text style={[styles.emptySub, N && { color: N.textSub }]}>Requested page: {page}</Text>
          </View>
        )}

        <View style={[styles.bottomOverlay, N && { backgroundColor: 'rgba(16,24,41,0.72)', borderColor: N.border }]}>
          <Text style={[styles.pageText, N && { color: N.textSub }]}>Page {page}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#274638',
  },
  headerTextWrap: {
    marginLeft: 10,
  },
  sub: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  viewerPanel: {
    flex: 1,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSubtle,
    textAlign: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
});
