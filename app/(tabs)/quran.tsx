import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';

const NIGHT = {
  bg: '#0A0F1E',
  text: '#EEF3FC',
  textSub: '#93B4D8',
};

const QURAN_MUSHAF_LAYOUT_KEY = 'quran_mushaf_layout_v1';
const PENDING_OPEN_KEY = 'quran_pending_open_v1';
type MushafLayout = '15line' | '16line';

export default function QuranScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [mushafLayout, setMushafLayout] = useState<MushafLayout>('15line');
  const [pendingOpenLabel, setPendingOpenLabel] = useState('None');
  const N = nightMode ? NIGHT : null;

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

  const switchMushafLayout = useCallback(async (nextLayout: MushafLayout) => {
    setMushafLayout(nextLayout);
    await AsyncStorage.setItem(QURAN_MUSHAF_LAYOUT_KEY, nextLayout);
  }, []);

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
        <Text style={[styles.sub, N && { color: N.textSub }]}>Reader is in progress</Text>
        <View style={[styles.layoutRow, N && { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          {(['15line', '16line'] as MushafLayout[]).map((layout) => {
            const selected = mushafLayout === layout;
            return (
              <TouchableOpacity
                key={layout}
                onPress={() => switchMushafLayout(layout)}
                style={[
                  styles.layoutBtn,
                  selected && styles.layoutBtnActive,
                ]}
                activeOpacity={0.85}
              >
                <Text style={[styles.layoutBtnText, selected && styles.layoutBtnTextActive]}>
                  {layout === '16line' ? '16-Line' : '15-Line'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.sub, N && { color: N.textSub }]}>Selected Mushaf: {mushafLayout === '16line' ? '16-Line' : '15-Line'}</Text>
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
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  layoutRow: {
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#E9F2ED',
    padding: 4,
  },
  layoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  layoutBtnActive: {
    backgroundColor: '#4FE948',
  },
  layoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5F746A',
  },
  layoutBtnTextActive: {
    color: '#0B2817',
  },
  sub: {
    fontSize: 15,
    color: Colors.textSubtle,
    marginTop: 4,
  },
});
