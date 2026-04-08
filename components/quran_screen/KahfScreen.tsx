import React from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Radius } from '@/constants/theme';
import { fetchSurahPages, MushafPage } from '@/services/quranApiService';

import { NIGHT_PALETTE as NIGHT } from './shared';

function SurahKahfScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  const N = nightMode ? NIGHT : null;
  const color = '#1B8A5A';
  const [pages, setPages] = React.useState<MushafPage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [showTrans, setShowTrans] = React.useState(false);
  const scrollRef = React.useRef<ScrollView>(null);
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const KAHF_FONT = 22;

  React.useEffect(() => {
    fetchSurahPages(18).then(data => {
      if (data.length === 0) setError('Could not load Surah Al-Kahf. Please check your connection.');
      else setPages(data);
      setLoading(false);
    });
  }, []);

  const goToPage = (p: number) => {
    if (p < 0 || p >= pages.length) return;
    setCurrentPage(p);
    setShowTrans(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const pageBg = N ? '#081408' : '#F0FBF4';
  const pageText = N ? '#C8F0D0' : '#031508';
  const pageBord = N ? '#1A4A25' : '#5A9A6A';
  const metaColor = N ? '#3A7A45' : '#2A6A35';
  const topBarBg = N ? '#040C06' : '#E8F5EC';
  const page = pages[currentPage];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: N ? N.bg : '#E8F5EC' }}>
        <View style={[kahfStyles.topBar, { backgroundColor: topBarBg, borderBottomColor: pageBord }]}>
          <View style={kahfStyles.topLeft}>
            <Text style={[kahfStyles.topSurahName, { color: metaColor }]}>سُورَةُ الْكَهْف</Text>
            {page ? <Text style={[kahfStyles.topMeta, { color: metaColor }]}>{'Juz ' + page.juzNumber}</Text> : null}
          </View>
          <TouchableOpacity
            style={[kahfStyles.transBtn, showTrans && { backgroundColor: color, borderColor: color }]}
            onPress={() => setShowTrans(v => !v)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="translate" size={14} color={showTrans ? '#fff' : color} />
            <Text style={[kahfStyles.transBtnText, { color: showTrans ? '#fff' : color }]}>Translation</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, color: metaColor, marginTop: 16, textAlign: 'center' }}>Loading Surah Al-Kahf...</Text>
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <MaterialIcons name="wifi-off" size={40} color={N ? N.textMuted : Colors.textSubtle} style={{ opacity: 0.35 }} />
            <Text style={{ fontSize: 14, color: N ? N.textMuted : Colors.textSubtle, textAlign: 'center', lineHeight: 22, marginTop: 12 }}>{error}</Text>
          </View>
        ) : page ? (
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={[kahfStyles.page, { backgroundColor: pageBg, borderColor: pageBord, width: SCREEN_WIDTH - 16, alignSelf: 'center' }]}>
              <View style={[kahfStyles.pageInner, { borderColor: pageBord }]}>
                <View style={[kahfStyles.pageHeader, { borderBottomColor: pageBord }]}>
                  <Text style={[kahfStyles.pageHeaderLeft, { color: metaColor }]}>Surah Al-Kahf</Text>
                  <Text style={[kahfStyles.pageHeaderRight, { color: metaColor }]}>{'Juz ' + page.juzNumber}</Text>
                </View>
                <View style={kahfStyles.linesContainer}>
                  {page.lines.map((line, idx) => (
                    <View key={line.lineNumber} style={[kahfStyles.lineRow, idx < page.lines.length - 1 && { borderBottomColor: pageBord + '40', borderBottomWidth: 0.75 }]}>
                      <Text
                        style={[
                          kahfStyles.lineText,
                          { color: pageText, fontSize: KAHF_FONT, lineHeight: Math.round(KAHF_FONT * 2.2) },
                          line.isBismillah && kahfStyles.bismillahLine,
                          line.isCentered && kahfStyles.centeredLine,
                        ]}
                      >
                        {line.text}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={[kahfStyles.pageFooter, { borderTopColor: pageBord }]}>
                  <Text style={[kahfStyles.pageNum, { color: metaColor }]}>{page.pageNumber}</Text>
                  <Text style={[kahfStyles.verseRangeText, { color: metaColor }]}>{'Ayat ' + page.verseRange[0] + '–' + page.verseRange[1]}</Text>
                </View>
              </View>
            </View>
            {showTrans ? (
              <View style={[kahfStyles.transPanel, { backgroundColor: N ? N.surface : '#FFF', borderColor: N ? N.border : '#A0D4B0', width: SCREEN_WIDTH - 16, alignSelf: 'center' }]}>
                <Text style={[kahfStyles.transPanelTitle, N && { color: N.textSub }]}>Translation - Ayat {page.verseRange[0]}-{page.verseRange[1]}</Text>
                {page.verses.map(v => (
                  <View key={v.numberInSurah} style={[kahfStyles.transVerseRow, N && { borderBottomColor: N.border }]}>
                    <View style={[kahfStyles.transVerseNum, { backgroundColor: color + '20' }]}>
                      <Text style={[kahfStyles.transVerseNumText, { color }]}>{v.numberInSurah}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      {v.transliteration ? <Text style={[kahfStyles.translit, N && { color: N.textSub }]}>{v.transliteration}</Text> : null}
                      <Text style={[kahfStyles.transText, N && { color: N.text }]}>{v.translation}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={kahfStyles.navRow}>
              <TouchableOpacity
                style={[kahfStyles.navBtn, { borderColor: pageBord, backgroundColor: pageBg }, currentPage === 0 && { opacity: 0.35 }]}
                onPress={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                activeOpacity={0.8}
              >
                <MaterialIcons name="chevron-left" size={22} color={metaColor} />
                <Text style={[kahfStyles.navBtnText, { color: metaColor }]}>Prev</Text>
              </TouchableOpacity>
              <View style={kahfStyles.dotsRow}>
                {pages.map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => goToPage(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                    <View style={[kahfStyles.dot, { backgroundColor: pageBord + '50' }, i === currentPage && { backgroundColor: color, width: 18 }]} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[kahfStyles.navBtn, { borderColor: pageBord, backgroundColor: pageBg }, currentPage === pages.length - 1 && { opacity: 0.35 }]}
                onPress={() => goToPage(currentPage + 1)}
                disabled={currentPage === pages.length - 1}
                activeOpacity={0.8}
              >
                <Text style={[kahfStyles.navBtnText, { color: metaColor }]}>Next</Text>
                <MaterialIcons name="chevron-right" size={22} color={metaColor} />
              </TouchableOpacity>
            </View>
            <Text style={[kahfStyles.caption, N && { color: N.textMuted }]}>Page {currentPage + 1} of {pages.length}  ·  Surah Al-Kahf  ·  Juz 15-16</Text>
            <View style={{ height: 24 }} />
          </ScrollView>
        ) : null}
      </View>
    </GestureHandlerRootView>
  );
}

const kahfStyles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1.5,
  },
  topLeft: { gap: 1 },
  topSurahName: { fontSize: 20, fontWeight: '800' } as any,
  topMeta: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  transBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: '#1B8A5A',
  },
  transBtnText: { fontSize: 12, fontWeight: '700' },
  page: {
    marginTop: 8,
    borderRadius: 4,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 12, elevation: 8,
    padding: 8,
  },
  pageInner: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 7, marginBottom: 6,
    borderBottomWidth: 1,
  },
  pageHeaderLeft: { fontSize: 11, fontWeight: '600', fontStyle: 'italic', letterSpacing: 0.2 },
  pageHeaderRight: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  linesContainer: { gap: 0 },
  lineRow: {
    paddingVertical: 4,
  },
  lineText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: Platform.select({ ios: undefined, android: undefined, default: undefined }),
    letterSpacing: 0.3,
    includeFontPadding: false,
  } as any,
  bismillahLine: {
    textAlign: 'center',
    fontWeight: '600',
  },
  centeredLine: {
    textAlign: 'center',
  },
  pageFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, paddingTop: 7,
    borderTopWidth: 1,
  },
  pageNum: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  verseRangeText: { fontSize: 10, fontWeight: '500', letterSpacing: 0.3 },
  transPanel: {
    marginTop: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  transPanelTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.textSubtle,
    letterSpacing: 0.4, marginBottom: 4,
  },
  transVerseRow: {
    flexDirection: 'row', gap: 10, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    alignItems: 'flex-start',
  },
  transVerseNum: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
  },
  transVerseNumText: { fontSize: 11, fontWeight: '800' },
  translit: { fontSize: 12, fontStyle: 'italic', color: Colors.textSecondary, lineHeight: 19 },
  transText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginTop: 14,
    maxWidth: 420, width: '100%', alignSelf: 'center',
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  navBtnText: { fontSize: 13, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  caption: {
    textAlign: 'center', fontSize: 10, fontWeight: '500',
    color: Colors.textSubtle, letterSpacing: 0.3,
    marginTop: 6,
  },
});

export default SurahKahfScreen;
