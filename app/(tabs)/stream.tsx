import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  TextInput,
  Switch,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { APP_CONFIG } from '@/constants/config';
import { useNightMode } from '@/hooks/useNightMode';
import { fetchLiveStatus } from '@/services/liveService';

type StreamTab = 'video' | 'audio';

// ── Night palette ─────────────────────────────────────────────────────────
const NIGHT = {
  bg:         '#0A0F1E',
  surface:    '#121929',
  surfaceAlt: '#192338',
  border:     '#1E2D47',
  text:       '#EEF3FC',
  textSub:    '#93B4D8',
  textMuted:  '#5A7A9E',
  accent:     '#6AAEFF',
  primary:    '#4FE948'
};

type NightPalette = typeof NIGHT | null;

// ── Surah Name Map (1–114) ────────────────────────────────────────────────
const SURAH_NAMES: Record<number, string> = {
  1:'Al-Fatihah',2:'Al-Baqarah',3:'Ali Imran',4:'An-Nisa',5:'Al-Maidah',
  6:'Al-Anam',7:'Al-Araf',8:'Al-Anfal',9:'At-Tawbah',10:'Yunus',
  11:'Hud',12:'Yusuf',13:'Ar-Rad',14:'Ibrahim',15:'Al-Hijr',
  16:'An-Nahl',17:'Al-Isra',18:'Al-Kahf',19:'Maryam',20:'Taha',
  21:'Al-Anbiya',22:'Al-Hajj',23:'Al-Muminun',24:'An-Nur',25:'Al-Furqan',
  26:'Ash-Shuara',27:'An-Naml',28:'Al-Qasas',29:'Al-Ankabut',30:'Ar-Rum',
  31:'Luqman',32:'As-Sajdah',33:'Al-Ahzab',34:'Saba',35:'Fatir',
  36:'Ya-Sin',37:'As-Saffat',38:'Sad',39:'Az-Zumar',40:'Ghafir',
  41:'Fussilat',42:'Ash-Shura',43:'Az-Zukhruf',44:'Ad-Dukhan',45:'Al-Jathiyah',
  46:'Al-Ahqaf',47:'Muhammad',48:'Al-Fath',49:'Al-Hujurat',50:'Qaf',
  51:'Adh-Dhariyat',52:'At-Tur',53:'An-Najm',54:'Al-Qamar',55:'Ar-Rahman',
  56:'Al-Waqiah',57:'Al-Hadid',58:'Al-Mujadila',59:'Al-Hashr',60:'Al-Mumtahanah',
  61:'As-Saf',62:'Al-Jumuah',63:'Al-Munafiqun',64:'At-Taghabun',65:'At-Talaq',
  66:'At-Tahrim',67:'Al-Mulk',68:'Al-Qalam',69:'Al-Haqqah',70:'Al-Maarij',
  71:'Nuh',72:'Al-Jinn',73:'Al-Muzzammil',74:'Al-Muddaththir',75:'Al-Qiyamah',
  76:'Al-Insan',77:'Al-Mursalat',78:'An-Naba',79:'An-Naziat',80:'Abasa',
  81:'At-Takwir',82:'Al-Infitar',83:'Al-Mutaffifin',84:'Al-Inshiqaq',85:'Al-Buruj',
  86:'At-Tariq',87:'Al-Ala',88:'Al-Ghashiyah',89:'Al-Fajr',90:'Al-Balad',
  91:'Ash-Shams',92:'Al-Layl',93:'Ad-Duha',94:'Ash-Sharh',95:'At-Tin',
  96:'Al-Alaq',97:'Al-Qadr',98:'Al-Bayyinah',99:'Az-Zalzalah',100:'Al-Adiyat',
  101:'Al-Qariah',102:'At-Takathur',103:'Al-Asr',104:'Al-Humazah',105:'Al-Fil',
  106:'Quraysh',107:'Al-Maun',108:'Al-Kawthar',109:'Al-Kafirun',110:'An-Nasr',
  111:'Al-Masad',112:'Al-Ikhlas',113:'Al-Falaq',114:'An-Nas'
};

// ── Pulse animation ───────────────────────────────────────────────────────
function PulsingRing({ active, color, size = 58 }: { active: boolean; color?: string; size?: number }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!active) { scale.setValue(1); opacity.setValue(0.2); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.55, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(opacity, { toValue: 0,    duration: 900, useNativeDriver: Platform.OS !== 'web' })
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1,   duration: 0, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: Platform.OS !== 'web' })
        ])
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  return (
    <Animated.View style={[
      {
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: color ?? Colors.primary
      },
      { transform: [{ scale }], opacity }
    ]} />
  );
}

// ── Qiraat Live Controls (expanded panel for continuous stream) ──────────
function QiraatControls({
  N, accentColor, isPlaying, isLoading, onPlay, onStop
}: {
  N: NightPalette;
  accentColor: string;
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
  onStop: () => void;
}) {
  return (
    <View style={[basitStyles.container, N && { borderTopColor: N.border, backgroundColor: N.surfaceAlt }]}>
      <View style={[basitStyles.nowPlayingRow, N && { backgroundColor: N.border }]}>
        <MaterialIcons
          name={isPlaying ? 'graphic-eq' : 'radio'}
          size={16}
          color={isPlaying ? accentColor : (N ? N.textMuted : Colors.textSubtle)}
        />
        <Text style={[basitStyles.nowPlayingText, { color: isPlaying ? accentColor : (N ? N.textSub : Colors.textSecondary) }]} numberOfLines={1}>
          {isLoading ? 'Connecting...' : isPlaying ? 'Now Playing — 24/7 Quran Recitation' : 'Continuous Quran recitation stream'}
        </Text>
      </View>
      <TouchableOpacity
        style={[basitStyles.stopBtn, !isPlaying && { backgroundColor: accentColor }]}
        onPress={isPlaying ? onStop : onPlay}
        activeOpacity={0.8}
      >
        <MaterialIcons name={isLoading ? 'hourglass-empty' : isPlaying ? 'stop' : 'play-arrow'} size={18} color="#fff" />
        <Text style={basitStyles.stopBtnText}>
          {isLoading ? 'Connecting...' : isPlaying ? 'Stop' : 'Play Stream'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Basit Surah Controls ──────────────────────────────────────────────────
const SURAH_LIST = Object.entries(SURAH_NAMES).map(([num, name]) => ({
  num: Number(num),
  name,
  label: `${num}. ${name}`
}));

function BasitControls({
  N, accentColor, isPlaying, isLoading, playingSurah, onPlay, onStop
}: {
  N: NightPalette;
  accentColor: string;
  isPlaying: boolean;
  isLoading: boolean;
  playingSurah: number | null;
  onPlay: (surah: number) => void;
  onStop: () => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = search.trim().length > 0
    ? SURAH_LIST.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        String(s.num).startsWith(search.trim())
      )
    : SURAH_LIST;

  const playRandom = () => {
    const n = Math.floor(Math.random() * 114) + 1;
    onPlay(n);
  };

  return (
    <View style={[basitStyles.container, N && { borderTopColor: N.border, backgroundColor: N.surfaceAlt }]}>
      {isPlaying ? (
        <View style={{ gap: 10 }}>
          {playingSurah ? (
            <View style={[basitStyles.nowPlayingRow, N && { backgroundColor: N.border }]}>
              <MaterialIcons name="graphic-eq" size={16} color={accentColor} />
              <Text style={[basitStyles.nowPlayingText, { color: accentColor }]} numberOfLines={1}>
                {isLoading
                  ? 'Connecting...'
                  : `Now Playing: Surah ${SURAH_NAMES[playingSurah] ?? ''} \u2014 ${playingSurah}`}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity style={basitStyles.stopBtn} onPress={onStop} activeOpacity={0.8}>
            <MaterialIcons name="stop" size={18} color="#fff" />
            <Text style={basitStyles.stopBtnText}>Stop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Search + Random row */}
          <View style={basitStyles.searchRow}>
            <View style={[basitStyles.searchWrap, N && { backgroundColor: N.surface, borderColor: N.border }]}>
              <MaterialIcons name="search" size={16} color={N ? N.textMuted : Colors.textSubtle} />
              <TextInput
                style={[basitStyles.searchInput, N && { color: N.text }]}
                value={search}
                onChangeText={setSearch}
                placeholder="Search Surah name or number..."
                placeholderTextColor={N ? N.textMuted : '#aaa'}
                returnKeyType="search"
              />
              {search.length > 0 ? (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={15} color={N ? N.textMuted : Colors.textSubtle} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[basitStyles.randomBtn, N && { backgroundColor: N.border }]}
              onPress={playRandom}
              activeOpacity={0.8}
            >
              <MaterialIcons name="shuffle" size={16} color={accentColor} />
              <Text style={[basitStyles.randomBtnText, { color: accentColor }]}>Random</Text>
            </TouchableOpacity>
          </View>

          {/* Surah list */}
          <View style={[basitStyles.listWrap, N && { borderColor: N.border }]}>
            <ScrollView
              style={{ maxHeight: 220 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {filtered.map((s, idx) => (
                <TouchableOpacity
                  key={s.num}
                  style={[
                    basitStyles.surahRow,
                    idx < filtered.length - 1 && [basitStyles.surahRowBorder, N && { borderBottomColor: N.border }],
                    N && { backgroundColor: N.surfaceAlt }
                  ]}
                  onPress={() => { onPlay(s.num); setSearch(''); }}
                  activeOpacity={0.75}
                >
                  <View style={[basitStyles.surahNum, { backgroundColor: accentColor + '22' }]}>
                    <Text style={[basitStyles.surahNumText, { color: accentColor }]}>{s.num}</Text>
                  </View>
                  <Text style={[basitStyles.surahName, N && { color: N.text }]}>{s.name}</Text>
                  <MaterialIcons name="play-circle-outline" size={20} color={accentColor} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
              {filtered.length === 0 ? (
                <View style={basitStyles.emptyRow}>
                  <Text style={[basitStyles.emptyText, N && { color: N.textMuted }]}>No surahs found</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}

const basitStyles = StyleSheet.create({
  container: {
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    marginTop: 12, paddingTop: 12, paddingHorizontal: 4, gap: 10
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 42, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 10,
    backgroundColor: Colors.surface
  },
  searchInput: {
    flex: 1, fontSize: 14, fontWeight: '500', color: Colors.textPrimary
  },
  randomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 42, borderRadius: 10,
    backgroundColor: Colors.border
  },
  randomBtnText: { fontSize: 12, fontWeight: '700' },
  listWrap: {
    borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border,
    overflow: 'hidden'
  },
  surahRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    backgroundColor: Colors.surface
  },
  surahRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  surahNum: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center'
  },
  surahNumText: { fontSize: 12, fontWeight: '800' },
  surahName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  emptyRow: { paddingVertical: 20, alignItems: 'center' },
  emptyText: { fontSize: 13, color: Colors.textSubtle, fontWeight: '500' },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    backgroundColor: '#C62828', borderRadius: 10, paddingVertical: 10
  },
  stopBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  nowPlayingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.primarySoft, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8
  },
  nowPlayingText: { fontSize: 13, fontWeight: '700', flex: 1 }
});

const NOTIF_KEY = 'jmn_radio_notify';
const LIVE_POLL_MS = 30000;

// ── Main Screen ───────────────────────────────────────────────────────────
export default function StreamScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const [activeStream, setActiveStream]   = useState<StreamTab>('video');
  const [audioPlaying, setAudioPlaying]   = useState(false);
  const [audioLoading, setAudioLoading]   = useState(false);
  const [activeRadioId, setActiveRadioId] = useState<string>('masjid');
  const [playingSurah, setPlayingSurah]   = useState<number | null>(null);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [isLive, setIsLive]               = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [lastUpdated, setLastUpdated]     = useState(() => new Date());
  const livePulse                         = useRef(new Animated.Value(0.3)).current;
  const soundRef        = useRef<AudioPlayer | null>(null);
  const playingRef      = useRef(false);
  const loadingRef      = useRef(false);
  const activeIdRef     = useRef('masjid');

  // Load saved notification preference
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then(val => {
      if (val !== null) setNotifyEnabled(val === 'true');
    });
  }, []);

  // Poll live status every 30 s
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const live = await fetchLiveStatus();
      if (!cancelled) {
        setIsLive(live);
        setLastUpdated(new Date());
      }
    };
    poll();
    const id = setInterval(poll, LIVE_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Pulse animation when live
  useEffect(() => {
    livePulse.stopAnimation();
    if (!isLive) { livePulse.setValue(0.3); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(livePulse, { toValue: 1,   duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(livePulse, { toValue: 0.3, duration: 600, useNativeDriver: Platform.OS !== 'web' })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isLive]);

  const toggleNotify = async (val: boolean) => {
    setNotifyEnabled(val);
    await AsyncStorage.setItem(NOTIF_KEY, String(val));
  };

  const setPlaying = (v: boolean) => { playingRef.current = v;  setAudioPlaying(v); };
  const setLoading = (v: boolean) => { loadingRef.current = v;  setAudioLoading(v); };
  const setActiveId = (v: string) => { activeIdRef.current = v; setActiveRadioId(v); };

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const live = await fetchLiveStatus();
      setIsLive(live);
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, []);

  const N: NightPalette = nightMode ? NIGHT : null;
  useEffect(() => {
    return () => { soundRef.current?.remove(); };
  }, []);

  const openYouTubeApp = () => Linking.openURL(APP_CONFIG.youtubeChannelUrl).catch(() => {});

  const stopAudio = async () => {
    try {
      if (soundRef.current) {
        soundRef.current.pause();
        await soundRef.current.seekTo(0);
        soundRef.current.remove();
        soundRef.current = null;
      }
    } catch (_) {}
    setPlaying(false);
    setLoading(false);
  };

  const playUrl = async (url: string) => {
    try {
      setLoading(true);
      setPlaying(true);
      // Small delay on Android to avoid native module initialisation race
      if (Platform.OS === 'android') {
        await new Promise(r => setTimeout(r, 150));
      }
      await setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: true,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionModeAndroid: 'doNotMix'
      });
      const player = createAudioPlayer({ uri: url }, 250);
      soundRef.current = player;
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && (status.playing || status.isBuffering)) {
          setLoading(false);
        }
        if (status.didJustFinish) {
          setPlaying(false);
          setLoading(false);
        }
      });
      player.play();
      setTimeout(() => setLoading(false), 3000);
    } catch (_) {
      setLoading(false);
      setPlaying(false);
    }
  };

  const handlePlayAudio = async (streamId: string) => {
    const stream = APP_CONFIG.radioStreams.find(s => s.id === streamId);
    if (!stream) return;
    if (activeIdRef.current === streamId && (playingRef.current || loadingRef.current || soundRef.current)) {
      await stopAudio();
      return;
    }
    if (soundRef.current) await stopAudio();
    setActiveId(streamId);
    setPlayingSurah(null);
    await playUrl(stream.url);
  };

  const handleSelectBasit = async (streamId: string) => {
    if (activeIdRef.current === streamId && !playingRef.current) {
      setActiveId('masjid');
      return;
    }
    if (soundRef.current) await stopAudio();
    setActiveId(streamId);
    setPlayingSurah(null);
  };

  const handlePlayQiraat = async (url: string) => {
    if (soundRef.current) await stopAudio();
    setActiveId('qiraat');
    await playUrl(url);
  };

  const handleStopQiraat = async () => {
    await stopAudio();
  };

  const handlePlayBasit = async (urlTemplate: string, surahNum: number) => {
    if (soundRef.current) await stopAudio();
    setPlayingSurah(surahNum);
    const url = urlTemplate.replace('{SURAH}', String(surahNum));
    await playUrl(url);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }, N && { backgroundColor: N.bg }]}>
      {/* Header */}
      <View style={[styles.header, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        <View style={styles.headerLeft}>
          {/* Live badge — flashes when live */}
          <Animated.View style={[
            styles.liveBadge,
            isLive && styles.liveBadgeActive,
            { opacity: isLive ? livePulse : 1 }
          ]}>
            <View style={[styles.liveDot, !isLive && { opacity: 0.5 }]} />
            <Text style={styles.liveText}>{isLive ? 'LIVE NOW' : 'LIVE'}</Text>
          </Animated.View>

          <Image
            source={require('@/assets/images/masjid-logo.png')}
            style={styles.headerLogo}
            contentFit="contain"
          />
          <View>
            <Text style={[styles.headerMasjidName, N && { color: '#4FE948' }]}>Jami' Masjid Noorani</Text>
            <Text style={[styles.headerTitle, N && { color: N.text }]}>Live Stream</Text>
            <Text style={[styles.headerSub, N && { color: N.textSub }]}>Halifax, UK</Text>
            <Text style={[styles.headerSub, N && { color: N.textMuted }]}>
              Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabRow, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        {(['video', 'audio'] as StreamTab[]).map((tab) => {
          const isActive = activeStream === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, isActive && [styles.tabBtnActive, N && { borderBottomColor: N.accent }]]}
              onPress={() => setActiveStream(tab)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={tab === 'video' ? 'live-tv' : 'radio'}
                size={16}
                color={isActive ? (N ? N.accent : Colors.primary) : (N ? N.textMuted : Colors.textSubtle)}
              />
              <Text style={[
                styles.tabText, N && { color: N.textSub },
                isActive && [styles.tabTextActive, N && { color: N.accent }]
              ]}>
                {tab === 'video' ? 'YouTube Live' : 'Radio Stream'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, N && { backgroundColor: N.bg }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={N ? N.primary : Colors.primary}
          />
        }
      >
        {/* ── VIDEO TAB ──────────────────────────────── */}
        {activeStream === 'video' ? (
          <>
            {/* Live Now banner when masjid is live */}
            {isLive ? (
              <View style={[styles.liveNowBanner, N && { backgroundColor: '#1A0A0A', borderColor: '#8B0000' }]}>
                <Animated.View style={[styles.liveNowDot, { opacity: livePulse }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveNowTitle}>We are LIVE now!</Text>
                  <Text style={[styles.liveNowSub, N && { color: 'rgba(255,255,255,0.65)' }]}>
                    Tap below to watch on YouTube
                  </Text>
                </View>
                <MaterialIcons name="live-tv" size={22} color="#ff6b6b" />
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.ytHeroCard, N && { backgroundColor: N.surface, borderColor: N.border }]}
              onPress={openYouTubeApp}
              activeOpacity={0.88}
            >
              <View style={styles.ytHeroBg}>
                <MaterialIcons name="live-tv" size={64} color="rgba(255,255,255,0.18)" />
              </View>
              <View style={styles.ytHeroContent}>
                <View style={styles.ytLiveRow}>
                  <View style={[styles.ytLivePill, isLive && styles.ytLivePillActive]}>
                    <Animated.View style={[styles.ytLiveDot, isLive && { opacity: livePulse }]} />
                    <Text style={styles.ytLivePillText}>{isLive ? 'LIVE NOW' : 'LIVE'}</Text>
                  </View>
                  <Text style={[styles.ytChannelHandle, N && { color: 'rgba(255,255,255,0.75)' }]}>
                    @jamimasjidnoorani
                  </Text>
                </View>
                <Text style={styles.ytHeroTitle}>Watch on YouTube</Text>
                <Text style={[styles.ytHeroSub, N && { color: 'rgba(255,255,255,0.7)' }]}>
                  Tap to open live stream or latest video
                </Text>
                <View style={styles.ytOpenBtn}>
                  <MaterialIcons name="play-circle-filled" size={18} color="#fff" />
                  <Text style={styles.ytOpenBtnText}>Open YouTube</Text>
                  <MaterialIcons name="open-in-new" size={14} color="rgba(255,255,255,0.8)" />
                </View>
              </View>
            </TouchableOpacity>

            <View style={[styles.infoCard, N && { backgroundColor: N.surfaceAlt }]}>
              <MaterialIcons name="info-outline" size={16} color={N ? N.accent : Colors.primary} />
              <Text style={[styles.infoText, N && { color: N.textSub }]}>
                Live stream is available during Jumuah, Tarawih, and special programmes. Subscribe to be notified when we go live.
              </Text>
            </View>

            <View style={[styles.scheduleCard, N && { backgroundColor: N.surface, borderColor: N.border }]}>
              <Text style={[styles.scheduleTitle, N && { color: N.text }]}>Stream Schedule</Text>
              {[
                { icon: 'star',        day: 'Every Friday',   time: 'Jumuah Khutbah \u00b7 1:00 PM (BST) / 12:30 PM (GMT)' },
                { icon: 'nights-stay', day: 'Ramadan Nights', time: 'Tarawih \u00b7 after Isha' },
                { icon: 'campaign',    day: 'Special Events', time: 'As announced' }
              ].map((s, i) => (
                <View key={i} style={styles.scheduleRow}>
                  <MaterialIcons name={s.icon as any} size={16} color={N ? N.primary : Colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scheduleDay, N && { color: N.text }]}>{s.day}</Text>
                    <Text style={[styles.scheduleTime, N && { color: N.textMuted }]}>{s.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ── AUDIO / RADIO TAB ──────────────────────── */}
        {activeStream === 'audio' ? (
          <>
            {APP_CONFIG.radioStreams.map((stream) => {
              const isActive  = activeRadioId === stream.id;
              const isPlaying = isActive && audioPlaying;
              const isLoading = isActive && audioLoading;
              const isBasit   = stream.id === 'basit';
              const isQiraat  = stream.id === 'qiraat';
              const isMasjid  = stream.id === 'masjid';
              const isExpandable = isBasit || isQiraat;
              const accent    = N ? N.accent : Colors.primary;
              const thumbSize = isMasjid ? 70 : 60;

              return (
                <View
                  key={stream.id}
                  style={[
                    radioStyles.stationCard,
                    isMasjid && radioStyles.masjidCard,
                    N && { backgroundColor: N.surface, borderColor: N.border },
                    isActive && { borderColor: accent },
                    // Highlight JMN card when live
                    isMasjid && isLive && !isActive && { borderColor: '#C0392B' }
                  ]}
                >
                  <TouchableOpacity
                    style={radioStyles.stationMain}
                    onPress={() => isExpandable
                      ? handleSelectBasit(stream.id)
                      : handlePlayAudio(stream.id)
                    }
                    activeOpacity={0.85}
                  >
                    {/* Thumbnail */}
                    <View style={[radioStyles.thumbWrap, { width: thumbSize, height: thumbSize }]}>
                      <PulsingRing active={isPlaying} color={accent} size={thumbSize} />
                      {isMasjid ? (
                        <Image
                          source={require('@/assets/images/masjid-logo.png')}
                          style={[radioStyles.thumb, { width: thumbSize, height: thumbSize, backgroundColor: '#fff' }]}
                          contentFit="contain"
                        />
                      ) : isBasit ? (
                        <Image
                          source={require('@/assets/images/qari-basit.png')}
                          style={[radioStyles.thumb, { width: thumbSize, height: thumbSize }]}
                          contentFit="cover"
                        />
                      ) : isQiraat ? (
                        <Image
                          source={require('@/assets/images/quran-radio-thumb.jpg')}
                          style={[radioStyles.thumb, { width: thumbSize, height: thumbSize }]}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[
                          radioStyles.thumb,
                          { width: thumbSize, height: thumbSize },
                          {
                            backgroundColor: isActive
                              ? accent + '22'
                              : (N ? N.surfaceAlt : Colors.surfaceAlt),
                            alignItems: 'center', justifyContent: 'center'
                          }
                        ]}>
                          <MaterialIcons
                            name={stream.icon as any}
                            size={26}
                            color={isActive ? accent : (N ? N.textMuted : Colors.textSubtle)}
                          />
                        </View>
                      )}
                      {/* Live indicator dot on JMN card thumbnail */}
                      {isMasjid && isLive ? (
                        <Animated.View style={[radioStyles.liveBadgeDot, { opacity: livePulse }]} />
                      ) : null}
                    </View>

                    {/* Labels */}
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        radioStyles.stationName,
                        isMasjid && radioStyles.masjidName,
                        N && { color: N.text },
                        isActive && { color: accent }
                      ]} numberOfLines={2}>
                        {stream.label}
                      </Text>
                      <Text style={[radioStyles.stationSub, N && { color: N.textMuted }]}>
                        {isMasjid && isLive ? 'Broadcasting Live Now' : stream.sublabel}
                      </Text>
                      <View style={radioStyles.liveRow}>
                        <View style={[radioStyles.liveDot, isPlaying && radioStyles.liveDotActive, isMasjid && isLive && !isPlaying && radioStyles.liveDotLive]} />
                        <Text style={[radioStyles.liveStatusText, N && { color: N.textSub }]}>
                          {isLoading
                            ? 'Connecting...'
                            : isPlaying
                              ? 'Now Playing'
                              : isBasit && isActive
                                ? 'Choose a Surah below'
                                : isQiraat && isActive
                                  ? 'Tap play to start'
                                  : isMasjid && isLive
                                    ? 'Live — Tap to tune in'
                                    : 'Tap to expand'}
                        </Text>
                      </View>
                    </View>

                    {/* Right control */}
                    {isExpandable ? (
                      <MaterialIcons
                        name={isActive ? 'expand-less' : 'expand-more'}
                        size={24}
                        color={N ? N.textMuted : Colors.textSubtle}
                      />
                    ) : (
                      <View style={[
                        radioStyles.playBtn,
                        isMasjid && radioStyles.masjidPlayBtn,
                        isActive && !isPlaying && { backgroundColor: accent },
                        isPlaying && { backgroundColor: '#C62828' },
                        !isActive && isMasjid && isLive && { backgroundColor: '#C0392B' },
                        !isActive && !(isMasjid && isLive) && { backgroundColor: N ? N.border : Colors.border }
                      ]}>
                        <MaterialIcons
                          name={isLoading ? 'hourglass-empty' : isPlaying ? 'stop' : 'play-arrow'}
                          size={isMasjid ? 24 : 20}
                          color={(isActive || (isMasjid && isLive)) ? '#fff' : (N ? N.textMuted : Colors.textSubtle)}
                        />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Expanded controls */}
                  {isBasit && isActive ? (
                    <BasitControls
                      N={N}
                      accentColor={accent}
                      isPlaying={isPlaying}
                      isLoading={isLoading}
                      playingSurah={playingSurah}
                      onPlay={(surah) => handlePlayBasit(stream.url, surah)}
                      onStop={stopAudio}
                    />
                  ) : isQiraat && isActive ? (
                    <QiraatControls
                      N={N}
                      accentColor={accent}
                      isPlaying={isPlaying}
                      isLoading={isLoading}
                      onPlay={() => handlePlayQiraat(stream.url)}
                      onStop={handleStopQiraat}
                    />
                  ) : null}

                  {/* JMN Radio notification toggle */}
                  {isMasjid ? (
                    <View style={[radioStyles.notifRow, N && { borderTopColor: N.border }]}>
                      <MaterialIcons name="notifications" size={16} color={notifyEnabled ? accent : (N ? N.textMuted : Colors.textSubtle)} />
                      <Text style={[radioStyles.notifLabel, N && { color: N.textSub }]}>Notify when JMN goes live</Text>
                      <Switch
                        value={notifyEnabled}
                        onValueChange={toggleNotify}
                        trackColor={{ false: N ? N.border : Colors.border, true: accent + '80' }}
                        thumbColor={notifyEnabled ? accent : (N ? N.textMuted : Colors.textSubtle)}
                        ios_backgroundColor={N ? N.border : Colors.border}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={[styles.infoCard, N && { backgroundColor: N.surfaceAlt }]}>
              <MaterialIcons name="info-outline" size={16} color={N ? N.accent : Colors.primary} />
              <Text style={[styles.infoText, N && { color: N.textSub }]}>
                Tap any station to play. For Qari Abdul Basit, enter a Surah number (1–114) or tap Random to play a random Surah.
              </Text>
            </View>
          </>
        ) : null}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerMasjidName: { fontSize: 13, fontWeight: '800', color: Colors.primary, letterSpacing: 0.2 },
  headerLogo: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#fff' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#7f1d1d',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full
  },
  liveBadgeActive: {
    backgroundColor: '#C0392B'
    
    
    
    
    },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { ...Typography.labelMedium, color: '#fff', fontSize: 10 },
  headerTitle: { ...Typography.titleLarge, color: Colors.textPrimary },
  headerSub: { ...Typography.bodySmall, color: Colors.textSubtle, marginTop: 1 },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md, gap: Spacing.md
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: Spacing.sm, paddingHorizontal: 4,
    borderBottomWidth: 2, borderBottomColor: 'transparent'
  },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabText: { ...Typography.titleSmall, color: Colors.textSubtle },
  tabTextActive: { color: Colors.primary },
  content: { padding: Spacing.md, gap: Spacing.md },
  // Live now banner
  liveNowBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1C0000',
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: '#C0392B',
    paddingHorizontal: Spacing.md, paddingVertical: 12
  },
  liveNowDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#ff4444'
  },
  liveNowTitle: {
    fontSize: 15, fontWeight: '800', color: '#ff6b6b'
  },
  liveNowSub: {
    fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2
  },
  // YouTube
  ytHeroCard: {
    borderRadius: Radius.xl, overflow: 'hidden',
    backgroundColor: '#1a1a2e',
    borderWidth: 1, borderColor: '#333',
    minHeight: 200
     
      },
  ytHeroBg: {
    position: 'absolute', inset: 0,
    backgroundColor: '#C00000',
    alignItems: 'center', justifyContent: 'center'
  },
  ytHeroContent: {
    flex: 1, padding: Spacing.lg, gap: 10, justifyContent: 'flex-end', minHeight: 200,
    backgroundColor: 'rgba(0,0,0,0.45)'
  },
  ytLiveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ytLivePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#7f1d1d', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4
  },
  ytLivePillActive: { backgroundColor: '#C00000' },
  ytLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  ytLivePillText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  ytChannelHandle: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  ytHeroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  ytHeroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19 },
  ytOpenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)'
  },
  ytOpenBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  // Shared
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.primarySoft, borderRadius: Radius.md, padding: Spacing.md
  },
  infoText: { ...Typography.bodyMedium, color: Colors.textPrimary, flex: 1, lineHeight: 22 },
  scheduleCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm
  },
  scheduleTitle: { ...Typography.titleSmall, color: Colors.textPrimary, marginBottom: 4 },
  scheduleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  scheduleDay: { ...Typography.labelLarge, color: Colors.textPrimary, fontSize: 14 },
  scheduleTime: { ...Typography.bodySmall, color: Colors.textSubtle, marginTop: 1 }
});

const radioStyles = StyleSheet.create({
  stationCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md
     
      },
  masjidCard: {
    padding: Spacing.lg,
    borderWidth: 2
      },
  stationMain: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumbWrap: {
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'visible'
  },
  thumb: { borderRadius: Radius.md },
  liveBadgeDot: {
    position: 'absolute',
    top: -3, right: -3,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#ff2222',
    borderWidth: 2, borderColor: '#fff'
  },
  stationName: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  masjidName: { fontSize: 16 },
  stationSub: { fontSize: 11, color: Colors.textSubtle, fontWeight: '500', marginTop: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textSubtle },
  liveDotActive: { backgroundColor: '#43A047' },
  liveDotLive:   { backgroundColor: '#ff2222' },
  liveStatusText: { fontSize: 11, fontWeight: '600', color: Colors.textSubtle },
  playBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center'
     
      },
  masjidPlayBtn: {
    width: 48, height: 48, borderRadius: 24
  },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: Colors.border,
    marginTop: 12, paddingTop: 12
  },
  notifLabel: {
    flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textSecondary
  }
});
