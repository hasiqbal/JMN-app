import React from 'react';
import { AppState, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { SURAH_WAQIAH} from '@/services/quranService';
import {ysPdfSt } from './shared';


// ── Surah Al-Waqiah Image-Based Mushaf Viewer (pages 534-537) ──────────────
const WAQIAH_IMG_PAGE_NUMS = [534, 535, 536, 537];
const WAQIAH_PAGE_AYAT_IMG: Record<number, [number, number]> = {
    534: [1, 25], 535: [26, 56], 536: [57, 82], 537: [83, 96],
};
// 15-line Waqiah: add require() entries here once images are uploaded to assets/images/Quran 15 line indo-pak/
const WAQIAH_15LINE_LOCAL: Partial<Record<number, any>> = {
    534: require('@/assets/images/Quran 15 line indo-pak/Waqiah/534.jpg'),
    535: require('@/assets/images/Quran 15 line indo-pak/Waqiah/535.jpg'),
    536: require('@/assets/images/Quran 15 line indo-pak/Waqiah/536.jpg'),
    537: require('@/assets/images/Quran 15 line indo-pak/Waqiah/537.jpg'),
};
const WAQIAH_16LINE_LOCAL: Partial<Record<number, any>> = {};
function SurahWaqiahMushafScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
    const N = nightMode;
    const [wqStyle, setWqStyle] = React.useState<'15line' | '16line'>('15line');
    const [wqRefKey, setWqRefKey] = React.useState(0);
    const [, setWqErr] = React.useState(false);
    const [, setWqLoading] = React.useState(false);
    const [wqShowTrans, setWqShowTrans] = React.useState(false);
    const [wqIdx, setWqIdx] = React.useState(0);

    // Re-render image when app returns from background
    // 150ms delay gives Android time to restore its OpenGL context before we force the Image remount
    React.useEffect(() => {
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                setTimeout(() => setWqRefKey(k => k + 1), 150);
            }
        });
        return () => sub.remove();
    }, []);

    const wqTX = useSharedValue(0);
    const wqSc = useSharedValue(1);
    const wqSvSc = useSharedValue(1);
    const wqAnimStyle = useAnimatedStyle(() => ({ transform: [{ translateX: wqTX.value }, { scale: wqSc.value }], flex: 1, width: '100%' }));
    const BG = N ? '#0F0A00' : '#FFF8F4';
    const HDR_BG = N ? '#1A1000' : '#FFF0E8';
    const HDR_BORDER = N ? '#3A2000' : '#D4A080';
    const ACCENT = N ? '#F97316' : '#E65100';
    const META = N ? '#94A3B8' : '#6B7280';
    const has16 = Object.keys(WAQIAH_16LINE_LOCAL).length > 0;
    const pageNum = WAQIAH_IMG_PAGE_NUMS[wqIdx];
    const range = WAQIAH_PAGE_AYAT_IMG[pageNum];
    const pageVerses = range ? SURAH_WAQIAH.slice(range[0] - 1, range[1]) : [];

    // Waqiah 15-line: local bundled assets only (upload images to populate WAQIAH_15LINE_LOCAL)
    const wqLocalSrc = wqStyle === '15line' ? (WAQIAH_15LINE_LOCAL[pageNum] ?? null) : (WAQIAH_16LINE_LOCAL[pageNum] ?? null);

    const src = wqLocalSrc;
    const wqGoTo = (idx: number) => {
        if (idx < 0 || idx >= WAQIAH_IMG_PAGE_NUMS.length) return;
        setWqIdx(idx); setWqErr(false); setWqShowTrans(false); setWqRefKey(k => k + 1);
        setWqLoading(false);
        wqSc.value = withSpring(1, { damping: 20, stiffness: 300 }); wqSvSc.value = 1;
    };
    const wqGesture = Gesture.Simultaneous(
        Gesture.Pan().activeOffsetX([-12, 12]).failOffsetY([-15, 15])
            .onUpdate((e) => { if (wqSc.value <= 1.05) wqTX.value = e.translationX * 0.25; })
            .onEnd((e) => {
                wqTX.value = withSpring(0, { damping: 20, stiffness: 300 });
                if (wqSc.value <= 1.05) {
                    if (e.translationX < -35 || e.velocityX < -400) runOnJS(wqGoTo)(wqIdx + 1);
                    else if (e.translationX > 35 || e.velocityX > 400) runOnJS(wqGoTo)(wqIdx - 1);
                }
            }).onFinalize(() => { wqTX.value = withSpring(0, { damping: 20, stiffness: 300 }); }),
        Gesture.Race(
            Gesture.Pinch().onUpdate((e) => { wqSc.value = Math.max(1, Math.min(wqSvSc.value * e.scale, 4)); })
                .onEnd(() => { if (wqSc.value < 1.1) { wqSc.value = withSpring(1, { damping: 20, stiffness: 300 }); wqSvSc.value = 1; } else wqSvSc.value = wqSc.value; }),
            Gesture.Tap().numberOfTaps(2).maxDuration(250).onEnd(() => { wqSc.value = withSpring(1, { damping: 20, stiffness: 300 }); wqSvSc.value = 1; })
        )
    );
    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: BG }}>
            <View style={{ flex: 1, backgroundColor: BG }}>
                <View style={[ysPdfSt.topBar, { backgroundColor: HDR_BG, borderBottomColor: HDR_BORDER, paddingVertical: 7 }]}>
                    <Text style={[ysPdfSt.surahNameAr, { color: ACCENT, fontSize: 18 }]}>{'\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0627\u0644\u0652\u0648\u064e\u0627\u0642\u0650\u0639\u064e\u0629'}</Text>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity style={[ysPdfSt.transBtn, { borderColor: ACCENT }, wqShowTrans && { backgroundColor: ACCENT, borderColor: ACCENT }]} onPress={() => setWqShowTrans(v => !v)} activeOpacity={0.8}>
                        <MaterialIcons name="translate" size={13} color={wqShowTrans ? '#fff' : ACCENT} />
                        <Text style={[ysPdfSt.transBtnText, { color: wqShowTrans ? '#fff' : ACCENT, fontSize: 11 }]}>Trans</Text>
                    </TouchableOpacity>
                    <View style={[ysPdfSt.toggleGroup, { backgroundColor: N ? '#2A1500' : '#F5E8DF', borderColor: N ? '#3A2000' : '#D4A080' }]}>
                        {(['15line', '16line'] as const).map(s => (
                            <TouchableOpacity key={s} style={[ysPdfSt.toggleBtn, wqStyle === s && { backgroundColor: ACCENT }]} onPress={() => { setWqStyle(s); setWqErr(false); setWqRefKey(k => k + 1); }} activeOpacity={0.8}>
                                <Text style={[ysPdfSt.toggleBtnText, { color: wqStyle === s ? '#fff' : META }]}>{s === '15line' ? '15L' : '16L'}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                {wqStyle === '16line' && !has16 ? (
                    <View style={[ysPdfSt.noImagesBox, { backgroundColor: BG }]}>
                        <MaterialIcons name="upload-file" size={48} color={ACCENT} style={{ opacity: 0.5 }} />
                        <Text style={[ysPdfSt.noImagesTitle, { color: ACCENT }]}>16-Line Images Not Yet Uploaded</Text>
                        <Text style={[ysPdfSt.noImagesSub, { color: META }]}>Upload pages 534\u2013537 of the 16-line Indo-Pak Quran as image attachments in the chat.</Text>
                        <TouchableOpacity style={[ysPdfSt.noImagesBtn, { backgroundColor: ACCENT + '22', borderColor: ACCENT }]} onPress={() => setWqStyle('15line')} activeOpacity={0.8}>
                            <MaterialIcons name="menu-book" size={16} color={ACCENT} />
                            <Text style={[ysPdfSt.noImagesBtnText, { color: ACCENT }]}>Use 15-Line Instead</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <GestureDetector gesture={wqGesture}>
                            <Reanimated.View style={wqAnimStyle}>
                                {src === null ? (
                                    <View style={[ysPdfSt.noImagesBox, { backgroundColor: BG }]}>
                                        <MaterialIcons name="upload-file" size={48} color={ACCENT} style={{ opacity: 0.5 }} />
                                        <Text style={[ysPdfSt.noImagesTitle, { color: ACCENT }]}>Images Not Yet Uploaded</Text>
                                        <Text style={[ysPdfSt.noImagesSub, { color: META }]}>{`Upload pages 534–537 of the 15-line\nIndo-Pak Mushaf as image attachments.`}</Text>
                                    </View>
                                ) : (
                                    <View style={{ flex: 1 }}>
                                        <Image key={`wq-${pageNum}-${wqStyle}-${wqRefKey}`} source={src} style={{ flex: 1, width: '100%' }} contentFit="contain" transition={0}
                                            onLoad={() => { setWqLoading(false); }}
                                            onError={() => { setWqErr(true); setWqLoading(false); }} />
                                    </View>
                                )}
                            </Reanimated.View>
                        </GestureDetector>
                        <View style={[ysPdfSt.navBarCompact, { backgroundColor: HDR_BG, borderTopColor: HDR_BORDER }]}>
                            <TouchableOpacity style={[ysPdfSt.navBtnCompact, wqIdx === 0 && { opacity: 0.3 }]} onPress={() => wqGoTo(wqIdx - 1)} disabled={wqIdx === 0} activeOpacity={0.8}>
                                <MaterialIcons name="chevron-left" size={26} color={ACCENT} />
                            </TouchableOpacity>
                            <View style={{ alignItems: 'center', gap: 4 }}>
                                <Text style={[ysPdfSt.pageNumCompact, { color: ACCENT }]}>Page {pageNum}</Text>
                                <Text style={{ fontSize: 10, color: META, fontWeight: '500' }}>{wqIdx + 1} / {WAQIAH_IMG_PAGE_NUMS.length}  \u00b7  {range ? `Ayat ${range[0]}\u2013${range[1]}` : ''}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    {WAQIAH_IMG_PAGE_NUMS.map((_, i) => (
                                        <TouchableOpacity key={i} onPress={() => wqGoTo(i)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                                            <View style={[ysPdfSt.dotSmall, { backgroundColor: i === wqIdx ? ACCENT : (N ? '#3A2000' : '#D4A080') }, i === wqIdx && { width: 16 }]} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            <TouchableOpacity style={[ysPdfSt.navBtnCompact, wqIdx === WAQIAH_IMG_PAGE_NUMS.length - 1 && { opacity: 0.3 }]} onPress={() => wqGoTo(wqIdx + 1)} disabled={wqIdx === WAQIAH_IMG_PAGE_NUMS.length - 1} activeOpacity={0.8}>
                                <MaterialIcons name="chevron-right" size={26} color={ACCENT} />
                            </TouchableOpacity>
                        </View>
                        {wqShowTrans ? (
                            <View style={[ysPdfSt.transOverlay, { backgroundColor: N ? 'rgba(15,10,0,0.97)' : 'rgba(255,248,244,0.97)' }]}>
                                <View style={[ysPdfSt.transOverlayHeader, { borderBottomColor: HDR_BORDER }]}>
                                    <MaterialIcons name="menu-book" size={16} color={ACCENT} />
                                    <Text style={[ysPdfSt.transPanelTitle, { color: ACCENT, flex: 1 }]}>{range ? `Ayat ${range[0]}\u2013${range[1]}` : ''}  \u00b7  Translation</Text>
                                    <TouchableOpacity onPress={() => setWqShowTrans(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <MaterialIcons name="close" size={20} color={META} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                                    {pageVerses.map((v: any) => (
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

export default SurahWaqiahMushafScreen;
