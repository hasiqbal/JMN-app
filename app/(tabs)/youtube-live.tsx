import React, { useEffect, useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { APP_CONFIG } from '@/constants/config';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import { fetchLiveStatus } from '@/services/liveService';

const LIVE_POLL_MS = 30000;

const NIGHT = {
  bg: '#08111D',
  surface: '#0F1C2D',
  border: '#1D3655',
  text: '#EEF4FD',
  textSub: '#B2C6DF',
};

export default function YouTubeLiveScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const [isLive, setIsLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  const palette = nightMode ? NIGHT : null;

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const live = await fetchLiveStatus();
      if (cancelled) return;
      setIsLive(live);
      setLastUpdated(new Date());
    };

    poll();
    const id = setInterval(poll, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const openYouTube = () => {
    Linking.openURL(APP_CONFIG.youtubeChannelUrl).catch(() => {});
  };

  const updatedAt = useMemo(
    () => lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    [lastUpdated],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const live = await fetchLiveStatus();
      setIsLive(live);
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }, palette && { backgroundColor: palette.bg }]}> 
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette ? '#78B2FF' : Colors.primary}
          />
        }
      >
        <View style={[styles.headerRow, palette && { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <Image source={require('@/assets/images/masjid-logo.png')} style={styles.logo} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, palette && { color: palette.text }]}>Jami' Masjid Noorani</Text>
            <Text style={[styles.sub, palette && { color: palette.textSub }]}>YouTube Live</Text>
          </View>
          <View style={[styles.livePill, { backgroundColor: isLive ? '#BC2F2F' : '#637084' }]}> 
            <Text style={styles.livePillText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
          </View>
        </View>

        <LinearGradient colors={['#A31010', '#4C0909']} style={styles.youtubeHero}>
          <MaterialIcons name="live-tv" size={34} color="#FFFFFF" />
          <Text style={styles.youtubeTitle}>YouTube Live Stream</Text>
          <Text style={styles.youtubeBody}>Tap below to open the masjid live video on YouTube.</Text>
          <TouchableOpacity style={styles.openButton} onPress={openYouTube} activeOpacity={0.85}>
            <MaterialIcons name="play-circle-filled" size={20} color="#FFFFFF" />
            <Text style={styles.openButtonText}>{isLive ? 'Watch Live on YouTube' : 'Open YouTube Channel'}</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={[styles.infoCard, palette && { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <MaterialIcons name="schedule" size={15} color={palette ? '#78B2FF' : Colors.primary} />
          <Text style={[styles.infoText, palette && { color: palette.textSub }]}>Status refreshed at {updatedAt}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF5F0',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  headerRow: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  name: {
    ...Typography.titleSmall,
    fontWeight: '800',
  },
  sub: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  livePill: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  livePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  youtubeHero: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 18,
    gap: 10,
  },
  youtubeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  youtubeBody: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  openButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.17)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  infoCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
