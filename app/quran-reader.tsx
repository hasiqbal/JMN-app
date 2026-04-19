import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import { QURAN_15LINE_FULL_PAGE_IMAGES } from '@/constants/quran15lineFullMap';
import { QURAN_16LINE_FULL_PAGE_IMAGES } from '@/constants/quran16lineFullMap';

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
  const mushaf = useMemo(() => {
    const raw = Array.isArray(params.mushaf) ? params.mushaf[0] : params.mushaf;
    return raw === '16line' ? '16line' : '15line';
  }, [params.mushaf]);

  const [page, setPage] = useState(startPage);
  const N = nightMode ? NIGHT : null;

  useEffect(() => {
    setPage(startPage);
  }, [startPage]);

  const localSource =
    mushaf === '16line'
      ? (QURAN_16LINE_FULL_PAGE_IMAGES[page] ?? null)
      : (QURAN_15LINE_FULL_PAGE_IMAGES[page] ?? null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, backgroundColor: N ? N.bg : Colors.background }]}>
      <View style={[styles.headerRow, N && { borderBottomColor: N.border }]}> 
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
          <Text style={[styles.title, N && { color: N.text }]}>Quran Reader</Text>
          <Text style={[styles.sub, N && { color: N.textSub }]}>Pages {startPage}-{endPage} · {mushaf === '16line' ? '16-Line' : '15-Line'}</Text>
        </View>
      </View>

      <View style={[styles.viewerPanel, N && { backgroundColor: N.panel, borderColor: N.border }]}>
        {localSource ? (
          <Image source={localSource} style={styles.image} contentFit="contain" transition={80} />
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, N && { color: N.text }]}>Image not mapped on this test reader</Text>
            <Text style={[styles.emptySub, N && { color: N.textSub }]}>No local image mapped for this page in {mushaf === '16line' ? '16-Line' : '15-Line'} Full folder.</Text>
            <Text style={[styles.emptySub, N && { color: N.textSub }]}>Requested page: {page}</Text>
          </View>
        )}
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.navBtn, page <= startPage && styles.navBtnDisabled]}
          onPress={() => setPage((p) => Math.max(startPage, p - 1))}
          disabled={page <= startPage}
          activeOpacity={0.8}
        >
          <Text style={styles.navBtnText}>Previous</Text>
        </TouchableOpacity>
        <Text style={[styles.pageText, N && { color: N.textSub }]}>Page {page}</Text>
        <TouchableOpacity
          style={[styles.navBtn, page >= endPage && styles.navBtnDisabled]}
          onPress={() => setPage((p) => Math.min(endPage, p + 1))}
          disabled={page >= endPage}
          activeOpacity={0.8}
        >
          <Text style={styles.navBtnText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE7E2',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: '#C8D9CF',
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
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSubtle,
  },
  viewerPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D9E5DE',
    borderRadius: 12,
    backgroundColor: '#F8FCF9',
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
  controlsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    backgroundColor: '#4FE948',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  navBtnDisabled: {
    backgroundColor: '#BFDAC6',
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B2817',
  },
  pageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5E776A',
  },
});
