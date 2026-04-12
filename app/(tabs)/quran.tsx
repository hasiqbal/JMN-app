import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';

const NIGHT = {
  bg: '#0A0F1E',
  text: '#EEF3FC',
  textSub: '#93B4D8',
};

export default function QuranScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const N = nightMode ? NIGHT : null;

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Quran tab content is placeholder at the moment.
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, []);

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
        <Text style={[styles.sub, N && { color: N.textSub }]}>Coming soon</Text>
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
  sub: {
    fontSize: 15,
    color: Colors.textSubtle,
  },
});
