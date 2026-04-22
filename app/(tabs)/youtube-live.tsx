import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import WebView from 'react-native-webview';
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
  const [useInAppPlayer, setUseInAppPlayer] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isLive) {
      setUseInAppPlayer(false);
    }
  }, [isLive]);

  const openYouTube = useCallback(() => {
    const targetUrl = isLive ? APP_CONFIG.youtubeStreamUrl : APP_CONFIG.youtubeChannelUrl;
    Linking.openURL(targetUrl).catch(() => {});
  }, [isLive]);

  const startInAppPlayer = useCallback(() => {
    if (!isLive || Platform.OS === 'web') {
      openYouTube();
      return;
    }

    setPlayerError(null);
    setUseInAppPlayer(true);
  }, [isLive, openYouTube]);

  const handleInAppPlayerError = useCallback(() => {
    setUseInAppPlayer(false);
    setPlayerError('In-app playback failed. Opened YouTube instead.');
    openYouTube();
    Alert.alert('Playback issue', 'Could not play in-app. Opening YouTube.');
  }, [openYouTube]);

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
            <Text style={[styles.name, palette && { color: palette.text }]}>Jami&apos; Masjid Noorani</Text>
            <Text style={[styles.sub, palette && { color: palette.textSub }]}>YouTube Live</Text>
          </View>
          <View style={[styles.livePill, { backgroundColor: isLive ? '#BC2F2F' : '#637084' }]}> 
            <Text style={styles.livePillText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
          </View>
        </View>

        <LinearGradient colors={['#A31010', '#4C0909']} style={styles.youtubeHero}>
          <MaterialIcons name="live-tv" size={34} color="#FFFFFF" />
          <Text style={styles.youtubeTitle}>YouTube Live Stream</Text>
          <Text style={styles.youtubeBody}>
            {isLive
              ? 'Watch directly in app or open YouTube.'
              : 'Live is currently offline. Open YouTube for latest uploads.'}
          </Text>

          {useInAppPlayer && isLive && Platform.OS !== 'web' ? (
            <View style={styles.playerWrap}>
              <WebView
                source={{ uri: APP_CONFIG.youtubeStreamUrl }}
                style={styles.playerWebView}
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.playerLoadingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.playerLoadingText}>Loading live stream...</Text>
                  </View>
                )}
                onError={handleInAppPlayerError}
                onHttpError={handleInAppPlayerError}
              />

              <View style={styles.playerActionRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={openYouTube} activeOpacity={0.85}>
                  <MaterialIcons name="open-in-new" size={18} color="#FFFFFF" />
                  <Text style={styles.secondaryButtonText}>Open in YouTube</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryGhostButton}
                  onPress={() => setUseInAppPlayer(false)}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="close" size={16} color="#FFFFFF" />
                  <Text style={styles.secondaryGhostButtonText}>Close Player</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.openButton, !isLive && styles.openButtonDisabled]}
                onPress={startInAppPlayer}
                activeOpacity={0.85}
                disabled={!isLive}
              >
                <MaterialIcons name="play-circle-filled" size={20} color="#FFFFFF" />
                <Text style={styles.openButtonText}>{isLive ? 'Play Here' : 'Play Here (Live only)'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={openYouTube} activeOpacity={0.85}>
                <MaterialIcons name="open-in-new" size={18} color="#FFFFFF" />
                <Text style={styles.secondaryButtonText}>{isLive ? 'Open on YouTube' : 'Open Channel'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {playerError ? <Text style={styles.playerErrorText}>{playerError}</Text> : null}
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
    flex: 1,
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
  openButtonDisabled: {
    opacity: 0.6,
  },
  actionRow: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  playerWrap: {
    marginTop: 4,
    gap: 8,
  },
  playerWebView: {
    height: 220,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  playerLoadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  playerLoadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  playerActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryGhostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryGhostButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  playerErrorText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.86)',
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
