import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import { QURAN_15LINE_FULL_PAGE_IMAGES } from '@/constants/quran15lineFullMap';
import { QURAN_16LINE_FULL_PAGE_IMAGES } from '@/constants/quran16lineFullMap';
import { getJuzEndPage, getJuzStartPage, getMushafTotalPages, getQuarterStartsInJuz } from '@/constants/mushafJuzPages';

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
  const pendingPageRef = useRef<number | null>(null);

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
  const quranTintOverlay = nightMode ? 'rgba(255, 239, 196, 0.06)' : 'rgba(255, 239, 196, 0.14)';
  const mushafTotalPages = useMemo(() => getMushafTotalPages(mushaf), [mushaf]);
  const zoomScale = useSharedValue(1);
  const savedZoomScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    if (pendingPageRef.current !== null) {
      const target = pendingPageRef.current;
      pendingPageRef.current = null;
      setPage(Math.min(activeRange.end, Math.max(activeRange.start, target)));
      return;
    }
    setPage(activeRange.start);
  }, [activeRange.start, activeRange.end]);

  useEffect(() => {
    zoomScale.value = 1;
    savedZoomScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [page, zoomScale, savedZoomScale, translateX, translateY, savedTranslateX, savedTranslateY]);

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
        const previousJuz = currentJuz - 1;
        pendingPageRef.current = getJuzEndPage(mushaf, previousJuz);
        setCurrentJuz(previousJuz);
      }
      if (navMode === 'quarter' && currentJuz && currentQuarter) {
        if (currentQuarter > 1) {
          const starts = getQuarterStartsInJuz(mushaf, currentJuz);
          const currentQuarterStart =
            starts.find((item) => item.quarter === currentQuarter)?.page ?? getJuzStartPage(mushaf, currentJuz);
          pendingPageRef.current = Math.max(getJuzStartPage(mushaf, currentJuz), currentQuarterStart - 1);
          setCurrentQuarter(currentQuarter - 1);
          return;
        }
        if (currentJuz > 1) {
          const previousJuz = currentJuz - 1;
          pendingPageRef.current = getJuzEndPage(mushaf, previousJuz);
          setCurrentJuz(previousJuz);
          setCurrentQuarter(4);
        }
      }
    },
    [navMode, currentJuz, currentQuarter, mushaf]
  );

  const goToPreviousPage = useMemo(
    () => () => {
      if (page > activeRange.start) {
        setPage((p) => p - 1);
        return;
      }

      if (navMode === 'juz' || navMode === 'quarter') {
        goToPreviousSegment();
        return;
      }

      if (page > 1) {
        setPage((p) => p - 1);
      }
    },
    [page, activeRange.start, navMode, goToPreviousSegment]
  );

  const goToNextPage = useMemo(
    () => () => {
      if (page < activeRange.end) {
        setPage((p) => p + 1);
        return;
      }

      if (navMode === 'juz' || navMode === 'quarter') {
        goToNextSegment();
        return;
      }

      if (page < mushafTotalPages) {
        setPage((p) => p + 1);
      }
    },
    [page, activeRange.end, navMode, mushafTotalPages, goToNextSegment]
  );

  const imageGestures = useMemo(
    () => Gesture.Simultaneous(
      Gesture.Pan()
        .activeOffsetX([-8, 8])
        .activeOffsetY([-8, 8])
        .onUpdate((e) => {
          if (zoomScale.value <= 1.05) return;

          const maxOffset = 320 * (zoomScale.value - 1);
          const nextX = savedTranslateX.value + e.translationX;
          const nextY = savedTranslateY.value + e.translationY;
          translateX.value = Math.max(-maxOffset, Math.min(maxOffset, nextX));
          translateY.value = Math.max(-maxOffset, Math.min(maxOffset, nextY));
        })
        .onEnd((e) => {
          if (zoomScale.value > 1.05) {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
            return;
          }

          const absX = Math.abs(e.translationX);
          const absY = Math.abs(e.translationY);
          if (absX < 16 && absY < 16) return;

          // Support both horizontal and vertical page swipes.
          if (absY > absX) {
            if (e.translationY < -24 || e.velocityY < -250) runOnJS(goToNextPage)();
            else if (e.translationY > 24 || e.velocityY > 250) runOnJS(goToPreviousPage)();
            return;
          }

          if (e.translationX < -24 || e.velocityX < -250) runOnJS(goToPreviousPage)();
          else if (e.translationX > 24 || e.velocityX > 250) runOnJS(goToNextPage)();
        }),
      Gesture.Pinch()
        .onUpdate((e) => {
          zoomScale.value = Math.max(1, Math.min(savedZoomScale.value * e.scale, 4));
        })
        .onEnd(() => {
          if (zoomScale.value < 1.05) {
            zoomScale.value = withSpring(1, { damping: 20, stiffness: 280 });
            savedZoomScale.value = 1;
            translateX.value = withSpring(0, { damping: 20, stiffness: 280 });
            translateY.value = withSpring(0, { damping: 20, stiffness: 280 });
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            return;
          }
          savedZoomScale.value = zoomScale.value;

          const maxOffset = 320 * (zoomScale.value - 1);
          translateX.value = Math.max(-maxOffset, Math.min(maxOffset, translateX.value));
          translateY.value = Math.max(-maxOffset, Math.min(maxOffset, translateY.value));
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        })
    ),
    [goToNextPage, goToPreviousPage, zoomScale, savedZoomScale, translateX, translateY, savedTranslateX, savedTranslateY]
  );

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: zoomScale.value }],
  }));

  const localSource =
    mushaf === '16line'
      ? (QURAN_16LINE_FULL_PAGE_IMAGES[page] ?? null)
      : (QURAN_15LINE_FULL_PAGE_IMAGES[page + 1] ?? null);
  const displayPage = mushaf === '16line' ? page + 1 : page;
  const displayStart = mushaf === '16line' ? activeRange.start + 1 : activeRange.start;
  const displayEnd = mushaf === '16line' ? activeRange.end + 1 : activeRange.end;

  return (
    <GestureHandlerRootView style={styles.container}>
    <View style={[styles.container, { backgroundColor: N ? N.bg : '#000' }]}>
      <GestureDetector gesture={imageGestures}>
      <View
        style={[styles.viewerPanel, N && { backgroundColor: N.panel, borderColor: N.border }]}
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
          <Text style={[styles.sub, N && { color: N.textSub }]}>Pages {displayStart}-{displayEnd}</Text>
        </View>
      </View>

        {localSource ? (
          <Reanimated.View style={[styles.imageWrap, zoomStyle]}>
            <Image source={localSource} style={styles.image} contentFit="contain" transition={80} />
            <View pointerEvents="none" style={[styles.quranTintOverlay, { backgroundColor: quranTintOverlay }]} />
          </Reanimated.View>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, N && { color: N.text }]}>Image not mapped on this test reader</Text>
            <Text style={[styles.emptySub, N && { color: N.textSub }]}>No local image mapped for this page in {mushaf === '16line' ? '16-Line' : '15-Line'} Full folder.</Text>
            <Text style={[styles.emptySub, N && { color: N.textSub }]}>Requested page: {displayPage}</Text>
          </View>
        )}

        <View style={[styles.bottomOverlay, N && { backgroundColor: 'rgba(16,24,41,0.72)', borderColor: N.border }]}>
          <Text style={[styles.pageText, N && { color: N.textSub }]}>Page {displayPage}</Text>
        </View>
      </View>
      </GestureDetector>
    </View>
    </GestureHandlerRootView>
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
  imageWrap: {
    flex: 1,
  },
  quranTintOverlay: {
    ...StyleSheet.absoluteFillObject,
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
