import React from 'react';
import { AppState, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { fetchSurahPages, MushafPage } from '@/services/quranApiService';
import { ysPdfSt } from './shared';

const KAHF_PAGE_NUMS = [293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304];

const KAHF_15LINE_LOCAL: Partial<Record<number, any>> = {
  293: require('@/assets/images/Quran 15 line indo-pak/Kahf/293.jpg'),
  294: require('@/assets/images/Quran 15 line indo-pak/Kahf/294.jpg'),
  295: require('@/assets/images/Quran 15 line indo-pak/Kahf/295.jpg'),
  296: require('@/assets/images/Quran 15 line indo-pak/Kahf/296.jpg'),
  297: require('@/assets/images/Quran 15 line indo-pak/Kahf/297.jpg'),
  298: require('@/assets/images/Quran 15 line indo-pak/Kahf/298.jpg'),
  299: require('@/assets/images/Quran 15 line indo-pak/Kahf/299.jpg'),
  300: require('@/assets/images/Quran 15 line indo-pak/Kahf/300.jpg'),
  301: require('@/assets/images/Quran 15 line indo-pak/Kahf/301.jpg'),
  302: require('@/assets/images/Quran 15 line indo-pak/Kahf/302.jpg'),
  303: require('@/assets/images/Quran 15 line indo-pak/Kahf/303.jpg'),
  304: require('@/assets/images/Quran 15 line indo-pak/Kahf/304.jpg'),
};

const KAHF_16LINE_LOCAL: Partial<Record<number, any>> = {};

function SurahKahfScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  const N = nightMode;
  const [style, setStyle] = React.useState<'15line' | '16line'>('15line');
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [, setLoadError] = React.useState(false);
  const [, setImageLoading] = React.useState(false);
  const [showTrans, setShowTrans] = React.useState(false);
  const [currentPageIdx, setCurrentPageIdx] = React.useState(0);
  const [kahfPages, setKahfPages] = React.useState<MushafPage[]>([]);

  React.useEffect(() => {
    fetchSurahPages(18).then((data) => {
      setKahfPages(data);
    });
  }, []);

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setTimeout(() => setRefreshKey((value) => value + 1), 150);
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

  const BG = N ? '#081408' : '#F0FBF4';
  const HDR_BG = N ? '#040C06' : '#E8F5EC';
  const HDR_BORDER = N ? '#1A4A25' : '#5A9A6A';
  const ACCENT = '#4FE948';
  const META = N ? '#94A3B8' : '#6B7280';

  const has16LineImages = Object.keys(KAHF_16LINE_LOCAL).length > 0;
  const pageNum = KAHF_PAGE_NUMS[currentPageIdx];
  const pageData = kahfPages.find((page) => page.pageNumber === pageNum);
  const range = pageData?.verseRange;
  const pageVerses = pageData?.verses ?? [];

  const resolvedSrc = style === '15line'
    ? (KAHF_15LINE_LOCAL[pageNum] ?? null)
    : (KAHF_16LINE_LOCAL[pageNum] ?? null);

  const switchStyle = (nextStyle: '15line' | '16line') => {
    setStyle(nextStyle);
    setLoadError(false);
    setRefreshKey((value) => value + 1);
  };

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= KAHF_PAGE_NUMS.length) return;
    setCurrentPageIdx(idx);
    setLoadError(false);
    setShowTrans(false);
    setRefreshKey((value) => value + 1);
    setImageLoading(false);
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    savedScale.value = 1;
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      if (scale.value <= 1.05) {
        translateX.value = event.translationX * 0.25;
      }
    })
    .onEnd((event) => {
      const isSwipeLeft = event.translationX < -35 || event.velocityX < -400;
      const isSwipeRight = event.translationX > 35 || event.velocityX > 400;
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

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(savedScale.value * event.scale, 4));
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        scale.value = withSpring(1, { damping: 20, stiffness: 300 });
        savedScale.value = 1;
      } else {
        savedScale.value = scale.value;
      }
    });

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
        <View style={[ysPdfSt.topBar, { backgroundColor: HDR_BG, borderBottomColor: HDR_BORDER, paddingVertical: 7 }]}>
          <TouchableOpacity
            style={[ysPdfSt.transBtn, { borderColor: ACCENT }, showTrans && { backgroundColor: ACCENT, borderColor: ACCENT }]}
            onPress={() => setShowTrans((value) => !value)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="translate" size={14} color={showTrans ? '#fff' : ACCENT} />
            <Text style={[ysPdfSt.transBtnText, { color: showTrans ? '#fff' : ACCENT }]}>Translation</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={[ysPdfSt.toggleGroup, { backgroundColor: N ? '#112618' : '#DBF1E3', borderColor: N ? '#1A4A25' : '#8BC89E' }]}>
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

        {style === '16line' && !has16LineImages ? (
          <View style={[ysPdfSt.noImagesBox, { backgroundColor: BG }]}>
            <MaterialIcons name="upload-file" size={48} color={ACCENT} style={{ opacity: 0.5 }} />
            <Text style={[ysPdfSt.noImagesTitle, { color: ACCENT }]}>16-Line Images Not Yet Uploaded</Text>
            <Text style={[ysPdfSt.noImagesSub, { color: META }]}>Upload pages 293-304 of the 16-line Indo-Pak Quran as image attachments in the chat.</Text>
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
                      key={`kahf-${pageNum}-${style}-${refreshKey}`}
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
                  {currentPageIdx + 1} / {KAHF_PAGE_NUMS.length}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {KAHF_PAGE_NUMS.map((_, index) => (
                    <TouchableOpacity key={index} onPress={() => goTo(index)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <View style={[ysPdfSt.dotSmall, { backgroundColor: index === currentPageIdx ? ACCENT : (N ? '#1A4A25' : '#8BC89E') }, index === currentPageIdx && { width: 16 }]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[ysPdfSt.navBtnCompact, currentPageIdx === KAHF_PAGE_NUMS.length - 1 && { opacity: 0.3 }]}
                onPress={() => goTo(currentPageIdx + 1)}
                disabled={currentPageIdx === KAHF_PAGE_NUMS.length - 1}
                activeOpacity={0.8}
              >
                <MaterialIcons name="chevron-right" size={26} color={ACCENT} />
              </TouchableOpacity>
            </View>

            {showTrans ? (
              <View style={[ysPdfSt.transOverlay, { backgroundColor: N ? 'rgba(8,20,8,0.97)' : 'rgba(240,251,244,0.97)' }]}>
                <View style={[ysPdfSt.transOverlayHeader, { borderBottomColor: HDR_BORDER }]}>
                  <MaterialIcons name="menu-book" size={16} color={ACCENT} />
                  <Text style={[ysPdfSt.transPanelTitle, { color: ACCENT, flex: 1 }]}>Translation</Text>
                  <TouchableOpacity onPress={() => setShowTrans(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialIcons name="close" size={20} color={META} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                  {pageVerses.map((verse) => (
                    <View key={verse.numberInSurah} style={[ysPdfSt.transVerseRow, { borderBottomColor: HDR_BORDER }]}>
                      <View style={[ysPdfSt.transVerseNum, { backgroundColor: ACCENT + '20' }]}>
                        <Text style={[ysPdfSt.transVerseNumText, { color: ACCENT }]}>{verse.numberInSurah}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        {verse.transliteration ? <Text style={[ysPdfSt.transVerseTranslit, { color: META }]}>{verse.transliteration}</Text> : null}
                        <Text style={[ysPdfSt.transVerseTrans, { color: N ? '#EEF3FC' : '#1F2937' }]}>{verse.translation}</Text>
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

export default SurahKahfScreen;
