import React from 'react';
import { AppState, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { SURAH_YASEEN } from '@/services/quranService';
import { ysPdfSt } from './shared';

const YASEEN_PAGE_AYAT: Record<number, [number, number]> = {
  440: [1, 12],
  441: [13, 22],
  442: [23, 36],
  443: [37, 50],
  444: [51, 66],
  445: [67, 83],
};

// ── Surah Yaseen — Image pages ──────────────────────────────────────────
const YASEEN_PAGE_NUMS = [440, 441, 442, 443, 444, 445];


// 15-line: bundled local assets — instant loading, no network needed
const YASEEN_15LINE_LOCAL: Partial<Record<number, any>> = {
  440: require('@/assets/images/Quran 15 line indo-pak/Yaseen/440.jpg'),
  441: require('@/assets/images/Quran 15 line indo-pak/Yaseen/441.jpg'),
  442: require('@/assets/images/Quran 15 line indo-pak/Yaseen/442.jpg'),
  443: require('@/assets/images/Quran 15 line indo-pak/Yaseen/443.jpg'),
  444: require('@/assets/images/Quran 15 line indo-pak/Yaseen/444.jpg'),
  445: require('@/assets/images/Quran 15 line indo-pak/Yaseen/445.jpg'),
};

// 16-line: locally stored images (upload to assets/images/Quran 16 line indo-pak/)
// Returns null if not yet available
const YASEEN_16LINE_LOCAL: Partial<Record<number, any>> = {
  // Add require() entries as images are uploaded, e.g.:
  // 440: require('@/assets/images/Quran 16 line indo-pak/440.jpg'),
};

function yaseen16LineSource(pageNum: number): any | null {
  return YASEEN_16LINE_LOCAL[pageNum] ?? null;
}

function SurahYaseenScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  const N = nightMode;
  const [style, setStyle] = React.useState<'15line' | '16line'>('15line');
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [, setLoadError] = React.useState(false);
  const [, setImageLoading] = React.useState(false);
  const [showTrans, setShowTrans] = React.useState(false);
  const [currentPageIdx, setCurrentPageIdx] = React.useState(0);

  // Re-render image when app returns from background (expo-image drops bundled assets on Android resume)
  // 150ms delay gives Android time to restore its OpenGL context before we force the Image remount
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setTimeout(() => setRefreshKey(k => k + 1), 150);
      }
    });
    return () => sub.remove();
  }, []);

  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const imageAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
    flex: 1,
    width: '100%',
  }));

  const BG         = N ? '#0A0F1A' : '#F5F0E8';
  const HDR_BG     = N ? '#111827' : '#FAFAF8';
  const HDR_BORDER = N ? '#1F2D45' : '#D4D4C8';
  const ACCENT     = N ? '#34D399' : '#0D6E4A';
  const META       = N ? '#94A3B8' : '#6B7280';

  const has16LineImages = Object.keys(YASEEN_16LINE_LOCAL).length > 0;
  const pageNum = YASEEN_PAGE_NUMS[currentPageIdx];
  const range = YASEEN_PAGE_AYAT[pageNum];
  const pageVerses = range ? SURAH_YASEEN.slice(range[0] - 1, range[1]) : [];

  // Source: bundled local asset only — instant, zero network
  const resolvedSrc = style === '15line'
    ? (YASEEN_15LINE_LOCAL[pageNum] ?? null)
    : (yaseen16LineSource(pageNum) ?? null);





  const switchStyle = (s: '15line' | '16line') => {
    setStyle(s);
    setLoadError(false);
    setRefreshKey(k => k + 1);
  };

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= YASEEN_PAGE_NUMS.length) return;
    setCurrentPageIdx(idx);
    setLoadError(false);
    setShowTrans(false);
    setRefreshKey(k => k + 1);
    setImageLoading(false);
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    savedScale.value = 1;
  };

  // Swipe gesture: left = next, right = prev (disabled when zoomed in)
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      if (scale.value <= 1.05) {
        translateX.value = event.translationX * 0.25;
      }
    })
    .onEnd((event) => {
      const isSwipeLeft  = event.translationX < -35 || event.velocityX < -400;
      const isSwipeRight = event.translationX >  35 || event.velocityX >  400;
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      if (scale.value <= 1.05) {
        if (isSwipeLeft) {
          runOnJS(goTo)(currentPageIdx + 1);
        } else if (isSwipeRight) {
          runOnJS(goTo)(currentPageIdx - 1);
        }
      }
    })
    .onFinalize(() => {
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  // Pinch-to-zoom (max 4×, snaps back if < 1.1×)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(savedScale.value * e.scale, 4));
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        scale.value = withSpring(1, { damping: 20, stiffness: 300 });
        savedScale.value = 1;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Double-tap to reset zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      savedScale.value = 1;
    });

  const composedGesture = Gesture.Simultaneous(
    swipeGesture,
    Gesture.Race(pinchGesture, doubleTapGesture)
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: BG }}>
      <View style={{ flex: 1, backgroundColor: BG }}>
        {/* Header — compact single line */}
        <View style={[ysPdfSt.topBar, { backgroundColor: HDR_BG, borderBottomColor: HDR_BORDER, paddingVertical: 7 }]}>
          <Text style={[ysPdfSt.surahNameAr, { color: ACCENT, fontSize: 18 }]}>سُورَةُ يٰسٓ</Text>
          <View style={{ flex: 1 }} />
          {/* Translation toggle */}
          <TouchableOpacity
            style={[ysPdfSt.transBtn, { borderColor: ACCENT }, showTrans && { backgroundColor: ACCENT, borderColor: ACCENT }]}
            onPress={() => setShowTrans(v => !v)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="translate" size={13} color={showTrans ? '#fff' : ACCENT} />
            <Text style={[ysPdfSt.transBtnText, { color: showTrans ? '#fff' : ACCENT, fontSize: 11 }]}>Trans</Text>
          </TouchableOpacity>
          {/* Style toggle */}
          <View style={[ysPdfSt.toggleGroup, { backgroundColor: N ? '#1F2D45' : '#E8E8E0', borderColor: N ? '#2A3F5C' : '#C8C8B8' }]}>
            <TouchableOpacity
              style={[ysPdfSt.toggleBtn, style === '15line' && { backgroundColor: ACCENT }]}
              onPress={() => switchStyle('15line')}
              activeOpacity={0.8}
            >
              <Text style={[ysPdfSt.toggleBtnText, { color: style === '15line' ? '#fff' : META }]}>15L</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ysPdfSt.toggleBtn, style === '16line' && { backgroundColor: ACCENT }]}
              onPress={() => switchStyle('16line')}
              activeOpacity={0.8}
            >
              <Text style={[ysPdfSt.toggleBtnText, { color: style === '16line' ? '#fff' : META }]}>16L</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 16-line not yet available notice */}
        {style === '16line' && !has16LineImages ? (
          <View style={[ysPdfSt.noImagesBox, { backgroundColor: BG }]}>
            <MaterialIcons name="upload-file" size={48} color={ACCENT} style={{ opacity: 0.5 }} />
            <Text style={[ysPdfSt.noImagesTitle, { color: ACCENT }]}>16-Line Images Not Yet Uploaded</Text>
            <Text style={[ysPdfSt.noImagesSub, { color: META }]}>
              Upload pages 440–445 of the 16-line Indo-Pak Quran as image attachments in the chat.
            </Text>
            <TouchableOpacity
              style={[ysPdfSt.noImagesBtn, { backgroundColor: ACCENT + '22', borderColor: ACCENT }]}
              onPress={() => switchStyle('15line')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="menu-book" size={16} color={ACCENT} />
              <Text style={[ysPdfSt.noImagesBtnText, { color: ACCENT }]}>Use 15-Line Instead</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Page image with swipe gesture — fills all remaining space */}
            <GestureDetector gesture={composedGesture}>
              <Reanimated.View style={imageAnimStyle}>
                {resolvedSrc === null ? (
                  <View style={[ysPdfSt.noImagesBox, { backgroundColor: BG }]}>
                    <MaterialIcons name="upload-file" size={48} color={ACCENT} style={{ opacity: 0.5 }} />
                    <Text style={[ysPdfSt.noImagesTitle, { color: ACCENT }]}>Image Not Available</Text>
                    <Text style={[ysPdfSt.noImagesSub, { color: META }]}>{`Page ${pageNum} is not yet bundled.`}</Text>
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <Image
                      key={`img-${pageNum}-${style}-${refreshKey}`}
                      source={resolvedSrc}
                      style={{ flex: 1, width: '100%' }}
                      contentFit="contain"
                      transition={0}
                      onLoad={() => { setImageLoading(false); }}
                      onError={() => { setLoadError(true); setImageLoading(false); }}
                    />
                  </View>
                )}
              </Reanimated.View>
            </GestureDetector>

            {/* Navigation bar — compact, dots moved here */}
            <View style={[ysPdfSt.navBarCompact, { backgroundColor: HDR_BG, borderTopColor: HDR_BORDER }]}>
              <TouchableOpacity
                style={[ysPdfSt.navBtnCompact, currentPageIdx === 0 && { opacity: 0.3 }]}
                onPress={() => goTo(currentPageIdx - 1)}
                disabled={currentPageIdx === 0}
                activeOpacity={0.8}
              >
                <MaterialIcons name="chevron-left" size={26} color={ACCENT} />
              </TouchableOpacity>

              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={[ysPdfSt.pageNumCompact, { color: ACCENT }]}>Page {pageNum}</Text>
                <Text style={{ fontSize: 10, color: META, fontWeight: '500' }}>
                  {currentPageIdx + 1} / {YASEEN_PAGE_NUMS.length}  ·  Ayat {range ? `${range[0]}–${range[1]}` : ''}
                </Text>
                {/* Page dots — moved from image overlay to here */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {YASEEN_PAGE_NUMS.map((_, i) => (
                    <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <View style={[
                        ysPdfSt.dotSmall,
                        { backgroundColor: i === currentPageIdx ? ACCENT : (N ? '#2A3F5C' : '#C8C8B8') },
                        i === currentPageIdx && { width: 16 },
                      ]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[ysPdfSt.navBtnCompact, currentPageIdx === YASEEN_PAGE_NUMS.length - 1 && { opacity: 0.3 }]}
                onPress={() => goTo(currentPageIdx + 1)}
                disabled={currentPageIdx === YASEEN_PAGE_NUMS.length - 1}
                activeOpacity={0.8}
              >
                <MaterialIcons name="chevron-right" size={26} color={ACCENT} />
              </TouchableOpacity>
            </View>

            {/* Translation modal overlay */}
            {showTrans ? (
              <View style={[ysPdfSt.transOverlay, { backgroundColor: N ? 'rgba(10,15,26,0.97)' : 'rgba(250,250,248,0.97)' }]}>
                <View style={[ysPdfSt.transOverlayHeader, { borderBottomColor: HDR_BORDER }]}>
                  <MaterialIcons name="menu-book" size={16} color={ACCENT} />
                  <Text style={[ysPdfSt.transPanelTitle, { color: ACCENT, flex: 1 }]}>Ayat {range ? `${range[0]}–${range[1]}` : ''} · Translation</Text>
                  <TouchableOpacity onPress={() => setShowTrans(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialIcons name="close" size={20} color={META} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                  {pageVerses.map(v => (
                    <View key={v.ayah} style={[ysPdfSt.transVerseRow, { borderBottomColor: HDR_BORDER }]}>
                      <View style={[ysPdfSt.transVerseNum, { backgroundColor: ACCENT + '20' }]}>
                        <Text style={[ysPdfSt.transVerseNumText, { color: ACCENT }]}>{v.ayah}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[ysPdfSt.transVerseTranslit, { color: META }]}>{v.transliteration}</Text>
                        <Text style={[ysPdfSt.transVerseTrans, { color: N ? '#EEF3FC' : '#1F2937' }]}>{v.translation}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

export default SurahYaseenScreen;