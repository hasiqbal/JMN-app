import React, { useCallback } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { APP_CONFIG } from '@/constants/config';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useJmnLiveStatus } from '@/hooks/useJmnLiveStatus';

export default function YouTubeLiveScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLive } = useJmnLiveStatus();

  const openYouTube = useCallback(() => {
    Linking.openURL(APP_CONFIG.youtubeStreamUrl).catch(() => {
      Linking.openURL(APP_CONFIG.youtubeChannelUrl).catch(() => {});
    });
  }, []);

  const closeScreen = useCallback(() => {
    router.replace('/stream');
  }, [router]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={closeScreen} activeOpacity={0.85}>
          <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={[styles.livePill, { backgroundColor: isLive ? '#BC2F2F' : '#637084' }]}>
          <Text style={styles.livePillText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
        </View>

        <View style={styles.iconButtonPlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.heroIconWrap}>
          <MaterialIcons name="live-tv" size={44} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>JMN YouTube Live</Text>
        <Text style={styles.subtitle}>Watch Jami' Masjid Noorani live streams directly on YouTube.</Text>

        <View style={styles.noticeCard}>
          <MaterialIcons name="verified-user" size={16} color={Colors.primary} />
          <Text style={styles.noticeText}>In-app YouTube browsing is disabled for channel safety. Use the button below to open the official JMN YouTube live page.</Text>
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={openYouTube} activeOpacity={0.88}>
          <MaterialIcons name="open-in-new" size={18} color="#FFFFFF" />
          <Text style={styles.ctaButtonText}>Open in YouTube</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#05080E',
    paddingHorizontal: Spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,12,19,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  iconButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  livePill: {
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  livePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  heroIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(188,47,47,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#DCE3F5',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  noticeCard: {
    marginTop: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(8,12,18,0.84)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: 340,
  },
  noticeText: {
    flex: 1,
    color: '#EAF0FF',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  ctaButton: {
    marginTop: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(188,47,47,0.92)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
