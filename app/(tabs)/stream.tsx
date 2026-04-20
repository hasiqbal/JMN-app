import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { APP_CONFIG } from '@/constants/config';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import { fetchLiveStatus } from '@/services/liveService';

type StreamId = 'masjid' | 'qiraat' | 'basit';

type PreviewVariant = 'eid-fitr' | 'eid-fitr-jumuah' | 'eid-adha' | 'eid-adha-jumuah';
type LayoutMode = 'default' | 'split' | 'mosaic' | 'focus';

type Station = {
  id: string;
  label: string;
  sublabel: string;
  url: string;
};

type StreamScreenProps = {
  previewVariant?: PreviewVariant;
  autoPlayOnMount?: boolean;
};

type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
  primary: string;
  hero: [string, string];
  heroGlow: string;
};

const NIGHT: Palette = {
  bg: '#08111D',
  surface: '#0F1C2D',
  surfaceAlt: '#132741',
  border: '#1D3655',
  text: '#EEF4FD',
  textSub: '#B2C6DF',
  textMuted: '#7E96B5',
  accent: '#78B2FF',
  primary: '#50E97C',
  hero: ['#132A46', '#0A1528'],
  heroGlow: 'rgba(120,178,255,0.24)',
};

const DAY: Palette = {
  bg: '#EEF5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#E7F0EA',
  border: '#DAE6DD',
  text: '#13281E',
  textSub: '#4F675B',
  textMuted: '#758A80',
  accent: '#0E8C5E',
  primary: Colors.primary,
  hero: ['#14553E', '#0A2D22'],
  heroGlow: 'rgba(66,179,122,0.2)',
};

const PREVIEW_THEME: Record<PreviewVariant, { hero: [string, string]; title: string; subtitle: string; mode: LayoutMode }> = {
  'eid-fitr': {
    hero: ['#0C4F5F', '#103548'],
    title: 'Eid Day Stream Center',
    subtitle: 'Unified live stream and radio control for Eid ul Fitr.',
    mode: 'split',
  },
  'eid-fitr-jumuah': {
    hero: ['#3D3B8E', '#18224D'],
    title: 'Eid + Jumuah Broadcast',
    subtitle: 'Fast access to live video and station audio on a high traffic day.',
    mode: 'focus',
  },
  'eid-adha': {
    hero: ['#7A4A17', '#412B12'],
    title: 'Eid ul Adha Live Hub',
    subtitle: 'Prayer day streaming with lightweight controls and clear hierarchy.',
    mode: 'mosaic',
  },
  'eid-adha-jumuah': {
    hero: ['#6D1C3D', '#2C1232'],
    title: 'Eid ul Adha + Jumuah Live Hub',
    subtitle: 'One-screen stream center for overlapping Eid and Friday programming.',
    mode: 'default',
  },
};

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah',
  2: 'Al-Baqarah',
  3: 'Ali Imran',
  4: 'An-Nisa',
  5: 'Al-Maidah',
  6: 'Al-Anam',
  7: 'Al-Araf',
  8: 'Al-Anfal',
  9: 'At-Tawbah',
  10: 'Yunus',
  11: 'Hud',
  12: 'Yusuf',
  13: 'Ar-Rad',
  14: 'Ibrahim',
  15: 'Al-Hijr',
  16: 'An-Nahl',
  17: 'Al-Isra',
  18: 'Al-Kahf',
  19: 'Maryam',
  20: 'Taha',
  21: 'Al-Anbiya',
  22: 'Al-Hajj',
  23: 'Al-Muminun',
  24: 'An-Nur',
  25: 'Al-Furqan',
  26: 'Ash-Shuara',
  27: 'An-Naml',
  28: 'Al-Qasas',
  29: 'Al-Ankabut',
  30: 'Ar-Rum',
  31: 'Luqman',
  32: 'As-Sajdah',
  33: 'Al-Ahzab',
  34: 'Saba',
  35: 'Fatir',
  36: 'Ya-Sin',
  37: 'As-Saffat',
  38: 'Sad',
  39: 'Az-Zumar',
  40: 'Ghafir',
  41: 'Fussilat',
  42: 'Ash-Shura',
  43: 'Az-Zukhruf',
  44: 'Ad-Dukhan',
  45: 'Al-Jathiyah',
  46: 'Al-Ahqaf',
  47: 'Muhammad',
  48: 'Al-Fath',
  49: 'Al-Hujurat',
  50: 'Qaf',
  51: 'Adh-Dhariyat',
  52: 'At-Tur',
  53: 'An-Najm',
  54: 'Al-Qamar',
  55: 'Ar-Rahman',
  56: 'Al-Waqiah',
  57: 'Al-Hadid',
  58: 'Al-Mujadila',
  59: 'Al-Hashr',
  60: 'Al-Mumtahanah',
  61: 'As-Saf',
  62: 'Al-Jumuah',
  63: 'Al-Munafiqun',
  64: 'At-Taghabun',
  65: 'At-Talaq',
  66: 'At-Tahrim',
  67: 'Al-Mulk',
  68: 'Al-Qalam',
  69: 'Al-Haqqah',
  70: 'Al-Maarij',
  71: 'Nuh',
  72: 'Al-Jinn',
  73: 'Al-Muzzammil',
  74: 'Al-Muddaththir',
  75: 'Al-Qiyamah',
  76: 'Al-Insan',
  77: 'Al-Mursalat',
  78: 'An-Naba',
  79: 'An-Naziat',
  80: 'Abasa',
  81: 'At-Takwir',
  82: 'Al-Infitar',
  83: 'Al-Mutaffifin',
  84: 'Al-Inshiqaq',
  85: 'Al-Buruj',
  86: 'At-Tariq',
  87: 'Al-Ala',
  88: 'Al-Ghashiyah',
  89: 'Al-Fajr',
  90: 'Al-Balad',
  91: 'Ash-Shams',
  92: 'Al-Layl',
  93: 'Ad-Duha',
  94: 'Ash-Sharh',
  95: 'At-Tin',
  96: 'Al-Alaq',
  97: 'Al-Qadr',
  98: 'Al-Bayyinah',
  99: 'Az-Zalzalah',
  100: 'Al-Adiyat',
  101: 'Al-Qariah',
  102: 'At-Takathur',
  103: 'Al-Asr',
  104: 'Al-Humazah',
  105: 'Al-Fil',
  106: 'Quraysh',
  107: 'Al-Maun',
  108: 'Al-Kawthar',
  109: 'Al-Kafirun',
  110: 'An-Nasr',
  111: 'Al-Masad',
  112: 'Al-Ikhlas',
  113: 'Al-Falaq',
  114: 'An-Nas',
};

const SURAH_LIST = Object.entries(SURAH_NAMES).map(([num, name]) => ({
  num: Number(num),
  name,
  label: `${num}. ${name}`,
}));

const NOTIF_KEY = 'jmn_radio_notify';
const LIVE_POLL_MS = 30000;
const REWIND_STEP_SEC = 10;
const MAX_TIMESHIFT_SEC = 120;
const MAX_REWIND_SEEK_ATTEMPTS = 12;
const REWIND_SEEK_SETTLE_MS = 90;
const EXPO_GO_NOTIFICATIONS_FALLBACK =
  Constants.appOwnership === 'expo' &&
  Number((Constants.expoConfig?.sdkVersion ?? '0').split('.')[0] || 0) >= 53;

function PulsingDot({ active }: { active: boolean }) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    opacity.stopAnimation();
    if (!active) {
      opacity.setValue(0.35);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.35, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, opacity]);

  return <Animated.View style={[styles.livePulseDot, { opacity }]} />;
}

function EqualizerBars({ active, color }: { active: boolean; color: string }) {
  const wave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    wave.stopAnimation();
    if (!active) {
      wave.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [active, wave]);

  const barOne = wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.45] });
  const barTwo = wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.95, 0.45, 0.85] });
  const barThree = wave.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.9, 0.35] });

  return (
    <View style={styles.eqWrap}>
      <Animated.View style={[styles.eqBar, { backgroundColor: color, transform: [{ scaleY: barOne }] }]} />
      <Animated.View style={[styles.eqBar, { backgroundColor: color, transform: [{ scaleY: barTwo }] }]} />
      <Animated.View style={[styles.eqBar, { backgroundColor: color, transform: [{ scaleY: barThree }] }]} />
    </View>
  );
}

function stationImageSource(id: string) {
  if (id === 'masjid') return require('@/assets/images/masjid-logo.png');
  if (id === 'qiraat') return require('@/assets/images/quran-radio-thumb.jpg');
  return require('@/assets/images/qari-basit.png');
}

export function StreamScreen({ previewVariant, autoPlayOnMount = true }: StreamScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();

  const [activeStationId, setActiveStationId] = useState<StreamId>('masjid');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playingSurah, setPlayingSurah] = useState<number | null>(null);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [liveSince, setLiveSince] = useState<number | null>(null);
  const [basitOpen, setBasitOpen] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');
  const [rewindNotice, setRewindNotice] = useState<string | null>(null);
  const [timeshiftSec, setTimeshiftSec] = useState(0);

  const soundRef = useRef<AudioPlayer | null>(null);
  const playbackStartedAtRef = useRef<number | null>(null);
  const playbackPositionSecRef = useRef(0);
  const timeshiftSecRef = useRef(0);
  const seekQueueRef = useRef<Promise<void>>(Promise.resolve());
  const audioModeReadyRef = useRef(false);
  const autoplayAttempted = useRef(false);
  const previousLive = useRef(false);
  const revealAnim = useRef(new Animated.Value(0)).current;

  const palette = nightMode ? NIGHT : DAY;
  const previewTheme = previewVariant ? PREVIEW_THEME[previewVariant] : null;
  const layoutMode: LayoutMode = previewTheme?.mode ?? 'default';

  const accentColor = palette.accent;

  const radioStreams = useMemo(
    () =>
      APP_CONFIG.radioStreams.filter((stream) =>
        stream.id === 'masjid' || stream.id === 'qiraat' || stream.id === 'basit',
      ) as Station[],
    [],
  );

  const filteredSurahs = useMemo(() => {
    const term = surahSearch.trim().toLowerCase();
    if (!term) return SURAH_LIST;
    return SURAH_LIST.filter(
      (item) => item.name.toLowerCase().includes(term) || String(item.num).startsWith(term),
    );
  }, [surahSearch]);

  const updateLiveState = useCallback((liveValue: boolean, stamp: Date) => {
    setIsLive(liveValue);

    if (liveValue && !previousLive.current) {
      setLiveSince(stamp.getTime());
    }

    if (!liveValue) {
      setLiveSince(null);
    }

    previousLive.current = liveValue;
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((value) => {
      if (value !== null) setNotifyEnabled(value === 'true');
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const liveValue = await fetchLiveStatus();
      if (cancelled) return;
      updateLiveState(liveValue, new Date());
    };

    poll();
    const id = setInterval(poll, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [updateLiveState]);

  useEffect(() => {
    return () => {
      soundRef.current?.remove();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    setAudioModeAsync({
      allowsRecording: false,
      shouldPlayInBackground: true,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
      interruptionModeAndroid: 'doNotMix',
    })
      .then(() => {
        audioModeReadyRef.current = true;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    revealAnim.setValue(0);
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [revealAnim]);

  const stopAudio = useCallback(async () => {
    const player = soundRef.current;
    soundRef.current = null;

    if (player) {
      try {
        player.pause();
      } catch {
        // Ignore pause failures; we still must dispose the player.
      }

      try {
        await player.seekTo(0);
      } catch {
        // Some live streams do not support seek. Continue to remove the player.
      }

      try {
        player.remove();
      } catch {
        // Intentionally silent: disposal errors should never block UI flow.
      }
    }

    playbackStartedAtRef.current = null;
    playbackPositionSecRef.current = 0;
    timeshiftSecRef.current = 0;
    setTimeshiftSec(0);
    setAudioPlaying(false);
    setAudioLoading(false);
  }, []);

  const playUrl = useCallback(async (
    url: string,
    options?: { retries?: number; connectTimeoutMs?: number },
  ) => {
    const maxAttempts = Math.max(1, options?.retries ?? 1);
    const connectTimeoutMs = options?.connectTimeoutMs ?? 2500;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let connected = false;

      try {
        setAudioLoading(true);
        setAudioPlaying(true);
        playbackStartedAtRef.current = Date.now();
        playbackPositionSecRef.current = 0;
        timeshiftSecRef.current = 0;
        setTimeshiftSec(0);

        if (!audioModeReadyRef.current) {
          await setAudioModeAsync({
            allowsRecording: false,
            shouldPlayInBackground: true,
            playsInSilentMode: true,
            shouldRouteThroughEarpiece: false,
            interruptionModeAndroid: 'doNotMix',
          });
          audioModeReadyRef.current = true;
        }

        if (Platform.OS === 'android') {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const player = createAudioPlayer({ uri: url }, 250);
        soundRef.current = player;

        player.addListener('playbackStatusUpdate', (status) => {
          if (soundRef.current !== player) return;

          const currentTime = (status as { currentTime?: number }).currentTime;
          if (typeof currentTime === 'number' && Number.isFinite(currentTime)) {
            playbackPositionSecRef.current = currentTime;
          } else if (playbackStartedAtRef.current && status.playing) {
            playbackPositionSecRef.current = (Date.now() - playbackStartedAtRef.current) / 1000;
          }

          if (status.isLoaded && (status.playing || status.isBuffering)) {
            connected = true;
            setAudioLoading(false);
          }

          if (status.didJustFinish) {
            playbackStartedAtRef.current = null;
            playbackPositionSecRef.current = 0;
            setAudioPlaying(false);
            setAudioLoading(false);
          }
        });

        player.play();

        await new Promise((resolve) => setTimeout(resolve, connectTimeoutMs));

        if (!connected) {
          if (soundRef.current === player) {
            soundRef.current = null;
          }
          player.remove();
          throw new Error('connect-timeout');
        }

        setTimeout(() => {
          setAudioLoading(false);
        }, 2200);

        return;
      } catch (_error) {
        const hasMoreAttempts = attempt < maxAttempts;
        if (!hasMoreAttempts) {
          setAudioLoading(false);
          setAudioPlaying(false);
          return;
        }
      }
    }
  }, []);

  const playStation = useCallback(
    async (stationId: StreamId) => {
      const stream = radioStreams.find((item) => item.id === stationId);
      if (!stream) return;

      const tappingSame = activeStationId === stationId;
      if (tappingSame && (audioPlaying || audioLoading || soundRef.current)) {
        await stopAudio();
        if (stationId === 'basit') setPlayingSurah(null);
        return;
      }

      if (soundRef.current) await stopAudio();

      setActiveStationId(stationId);
      setPlayingSurah(null);
      const isQiraat = stationId === 'qiraat';
      await playUrl(stream.url, {
        retries: isQiraat ? 2 : 1,
        connectTimeoutMs: isQiraat ? 1800 : 2500,
      });
    },
    [activeStationId, audioLoading, audioPlaying, playUrl, radioStreams, stopAudio],
  );

  const playBasitSurah = useCallback(
    async (surah: number) => {
      const basit = radioStreams.find((item) => item.id === 'basit');
      if (!basit) return;

      if (soundRef.current) await stopAudio();

      setActiveStationId('basit');
      setPlayingSurah(surah);
      await playUrl(basit.url.replace('{SURAH}', String(surah)), { retries: 1, connectTimeoutMs: 2200 });
      setBasitOpen(false);
    },
    [playUrl, radioStreams, stopAudio],
  );

  useEffect(() => {
    if (!autoPlayOnMount || autoplayAttempted.current) return;
    autoplayAttempted.current = true;

    const id = setTimeout(() => {
      playStation('masjid').catch(() => {});
    }, 300);

    return () => clearTimeout(id);
  }, [autoPlayOnMount, playStation]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const liveValue = await fetchLiveStatus();
      updateLiveState(liveValue, new Date());
    } finally {
      setRefreshing(false);
    }
  }, [updateLiveState]);

  const resyncActiveStreamToLive = useCallback(async (notice?: string) => {
    if (!soundRef.current || (!audioPlaying && !audioLoading)) return;

    const activeStream = radioStreams.find((item) => item.id === activeStationId);
    if (!activeStream) return;

    let targetUrl = activeStream.url;
    let retries = 1;
    let connectTimeoutMs = 2200;

    if (activeStationId === 'qiraat') {
      retries = 2;
      connectTimeoutMs = 1800;
    }

    if (activeStationId === 'basit') {
      const surah = playingSurah ?? 1;
      targetUrl = activeStream.url.replace('{SURAH}', String(surah));
    }

    await stopAudio();
    await playUrl(targetUrl, { retries, connectTimeoutMs });
    timeshiftSecRef.current = 0;
    setTimeshiftSec(0);
    setRewindNotice(notice ?? 'Resynced to current live position.');
  }, [activeStationId, audioLoading, audioPlaying, playUrl, playingSurah, radioStreams, stopAudio]);

  const readCurrentPlaybackTime = useCallback(() => {
    const liveValue = soundRef.current?.currentTime;
    if (typeof liveValue === 'number' && Number.isFinite(liveValue) && liveValue >= 0) {
      playbackPositionSecRef.current = liveValue;
      return liveValue;
    }
    return Math.max(0, playbackPositionSecRef.current);
  }, []);

  const rewindActiveStreamByTen = useCallback(async () => {
    seekQueueRef.current = seekQueueRef.current.then(async () => {
      if (!soundRef.current || !audioPlaying) return;
      const player = soundRef.current;

      try {
        let before = readCurrentPlaybackTime();
        let movedTotalSec = 0;
        let stalledAttempts = 0;

        for (let attempt = 0; attempt < MAX_REWIND_SEEK_ATTEMPTS; attempt += 1) {
          const remaining = REWIND_STEP_SEC - movedTotalSec;
          if (remaining <= 0.5) break;

          const target = Math.max(0, before - remaining);
          await player.seekTo(target);
          await new Promise((resolve) => setTimeout(resolve, REWIND_SEEK_SETTLE_MS));

          const after = readCurrentPlaybackTime();
          const movedThisAttempt = Math.max(0, before - after);

          if (movedThisAttempt < 0.25) {
            stalledAttempts += 1;
            if (stalledAttempts >= 2) break;
          } else {
            stalledAttempts = 0;
            movedTotalSec += movedThisAttempt;
          }

          before = after;
        }

        if (movedTotalSec < 0.75) {
          throw new Error('seek-not-effective');
        }

        if (playbackStartedAtRef.current) {
          playbackStartedAtRef.current = Date.now() - before * 1000;
        }

        const nextTimeshift = Math.min(MAX_TIMESHIFT_SEC, timeshiftSecRef.current + movedTotalSec);
        timeshiftSecRef.current = nextTimeshift;
        setTimeshiftSec(nextTimeshift);
        setRewindNotice(null);
      } catch {
        if (activeStationId === 'qiraat') {
          await resyncActiveStreamToLive(
            'Qiraat is a true live stream. 10-second seek is not supported, so it was resynced to current live.',
          );
          return;
        }
        setRewindNotice('Rewind is not available on this stream source. Use Resync to jump to current live.');
      }
    }).catch(() => {});

    await seekQueueRef.current;
  }, [activeStationId, audioPlaying, readCurrentPlaybackTime, resyncActiveStreamToLive]);

  const ensureNotificationPermission = useCallback(async () => {
    if (Platform.OS === 'web') return false;
    if (EXPO_GO_NOTIFICATIONS_FALLBACK) return true;

    const current = await Notifications.getPermissionsAsync();
    let finalStatus = current.status;

    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('jmn-live', {
        name: 'JMN Live Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
      }).catch(() => {});
    }

    return true;
  }, []);

  const toggleNotify = useCallback(async (value: boolean) => {
    if (!value) {
      setNotifyEnabled(false);
      await AsyncStorage.setItem(NOTIF_KEY, 'false');
      return;
    }

    const allowed = await ensureNotificationPermission();
    setNotifyEnabled(allowed);
    await AsyncStorage.setItem(NOTIF_KEY, String(allowed));
  }, [ensureNotificationPermission]);

  const renderStationCard = (station: Station, compact = false) => {
    const isActive = station.id === activeStationId;
    const isPlaying = isActive && audioPlaying;
    const isLoading = isActive && audioLoading;
    const isBasit = station.id === 'basit';
    const isMasjid = station.id === 'masjid';
    const isEngaged = isPlaying || isLoading;
    const showRewind = isActive && isEngaged;
    const stationTimeshiftSec = isActive ? timeshiftSec : 0;
    const timeshiftFill = Math.max(0, Math.min(1, stationTimeshiftSec / MAX_TIMESHIFT_SEC));

    const statusText = isLoading
      ? 'Connecting...'
      : isPlaying
      ? isBasit && playingSurah
        ? `Playing ${SURAH_NAMES[playingSurah]}`
        : 'Now playing'
      : isBasit
      ? 'Search and play any surah'
      : station.sublabel;

    const primaryLabel = isBasit
      ? isPlaying
        ? 'Stop'
        : 'Choose Surah'
      : isPlaying
      ? 'Stop'
      : 'Play';

    const onPrimaryPress = () => {
      if (isBasit) {
        if (isPlaying || isLoading) {
          stopAudio().catch(() => {});
          return;
        }
        setActiveStationId('basit');
        setBasitOpen(true);
        return;
      }

      playStation(station.id as StreamId).catch(() => {});
    };

    return (
      <View
        key={station.id}
        style={[
          styles.stationCard,
          isActive && styles.stationCardActive,
          compact && styles.stationCardCompact,
          {
            backgroundColor: palette.surface,
            borderColor: isActive ? accentColor : palette.border,
            shadowColor: isActive ? accentColor : '#000000',
          },
        ]}
      >
        <View style={styles.stationMediaWrap}>
          <Image source={stationImageSource(station.id)} style={styles.stationMedia} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.45)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.stationMediaShade}
          />
          <View style={styles.stationMediaBadge}>
            <Text style={styles.stationMediaBadgeText}>{isMasjid ? 'JMN' : station.id.toUpperCase()}</Text>
          </View>
          {(isPlaying || (isMasjid && isLive)) && <PulsingDot active={isPlaying || isLive} />}
        </View>

        <View style={styles.stationBody}>
          <Text style={[styles.stationName, { color: palette.text }]} numberOfLines={2}>
            {station.label}
          </Text>

          <View style={styles.stationStatusRow}>
            <EqualizerBars active={isEngaged} color={isActive ? accentColor : palette.textMuted} />
            <Text style={[styles.stationStatus, { color: isActive ? accentColor : palette.textSub }]} numberOfLines={2}>
              {statusText}
            </Text>
            {isEngaged ? (
              <View style={[styles.stationStatusPill, { backgroundColor: isLoading ? '#B48925' : accentColor }]}>
                <Text style={styles.stationStatusPillText}>{isLoading ? 'Buffering' : 'Playing'}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.stationActions}>
            {showRewind ? (
              <TouchableOpacity
                style={[styles.rewindControl, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}
                onPress={() => rewindActiveStreamByTen().catch(() => {})}
                activeOpacity={0.85}
              >
                <MaterialIcons name="replay-10" size={18} color={palette.textSub} />
                <Text style={[styles.rewindControlText, { color: palette.textSub }]}>-10s</Text>
              </TouchableOpacity>
            ) : null}

            {showRewind ? (
              <TouchableOpacity
                style={[styles.resyncControl, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}
                onPress={() => resyncActiveStreamToLive().catch(() => {})}
                activeOpacity={0.85}
              >
                <MaterialIcons name="sync" size={16} color={palette.textSub} />
                <Text style={[styles.resyncControlText, { color: palette.textSub }]}>Resync</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryControl,
                {
                  backgroundColor: isPlaying ? '#BC2F2F' : accentColor,
                },
              ]}
              onPress={onPrimaryPress}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name={isLoading ? 'hourglass-empty' : isPlaying ? 'stop' : 'play-arrow'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.primaryControlText}>{primaryLabel}</Text>
            </TouchableOpacity>

            {isBasit && !isPlaying ? (
              <TouchableOpacity
                style={[styles.secondaryControl, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}
                onPress={() => {
                  setActiveStationId('basit');
                  setBasitOpen(true);
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="search" size={16} color={palette.textSub} />
              </TouchableOpacity>
            ) : null}
          </View>

          {isEngaged ? (
            <View style={styles.timeshiftWrap}>
              <View style={styles.timeshiftHeader}>
                <Text style={[styles.timeshiftTitle, { color: palette.textSub }]}>Time Shift</Text>
                <Text style={[styles.timeshiftValue, { color: palette.text }]}>{Math.round(stationTimeshiftSec)}s</Text>
              </View>
              <View style={[styles.timeshiftTrack, { backgroundColor: palette.border }]}>
                <View
                  style={[
                    styles.timeshiftFill,
                    {
                      width: `${timeshiftFill * 100}%`,
                      backgroundColor: isActive ? accentColor : palette.textMuted,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.timeshiftHint, { color: stationTimeshiftSec > 0 ? palette.textSub : palette.textMuted }]}>
                {stationTimeshiftSec > 0 ? `-${Math.round(stationTimeshiftSec)}s behind live` : 'Live edge (0s)'}
              </Text>
            </View>
          ) : null}

          {isMasjid ? (
            <View>
              <View style={[styles.notifyRow, { borderTopColor: palette.border }]}>
                <MaterialIcons
                  name="notifications"
                  size={16}
                  color={notifyEnabled ? accentColor : palette.textMuted}
                />
                <Text style={[styles.notifyLabel, { color: palette.textSub }]}>Notify when live starts</Text>
                <Switch
                  value={notifyEnabled}
                  onValueChange={toggleNotify}
                  trackColor={{ false: palette.border, true: `${accentColor}80` }}
                  thumbColor={notifyEnabled ? accentColor : palette.textMuted}
                  ios_backgroundColor={palette.border}
                />
              </View>
              {EXPO_GO_NOTIFICATIONS_FALLBACK ? (
                <Text style={[styles.notifyHint, { color: palette.textMuted }]}>Expo Go SDK 53+ uses in-app alerts. Use a development build for system notifications.</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderStations = () => {
    if (layoutMode === 'split') {
      const first = radioStreams[0];
      const rest = radioStreams.slice(1);
      return (
        <>
          {first ? renderStationCard(first) : null}
          <View style={styles.halfRow}>
            {rest.map((station) => (
              <View key={station.id} style={styles.halfCol}>
                {renderStationCard(station, true)}
              </View>
            ))}
          </View>
        </>
      );
    }

    if (layoutMode === 'mosaic') {
      return (
        <View style={styles.mosaicWrap}>
          {radioStreams.map((station) => (
            <View key={station.id} style={styles.mosaicItem}>
              {renderStationCard(station, true)}
            </View>
          ))}
        </View>
      );
    }

    if (layoutMode === 'focus') {
      const masjid = radioStreams.find((item) => item.id === 'masjid');
      const others = radioStreams.filter((item) => item.id !== 'masjid');
      return (
        <>
          {masjid ? renderStationCard(masjid) : null}
          <View style={styles.focusStack}>{others.map((station) => renderStationCard(station, true))}</View>
        </>
      );
    }

    return <View style={styles.stationStack}>{radioStreams.map((station) => renderStationCard(station))}</View>;
  };

  const activeStation = radioStreams.find((station) => station.id === activeStationId);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={palette.primary}
          />
        }
      >
        <View style={[styles.headerRow, { borderColor: palette.border }]}> 
          <Image source={require('@/assets/images/masjid-logo.png')} style={styles.headerLogo} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerName, { color: palette.text }]}>{APP_CONFIG.masjidName}</Text>
            <Text style={[styles.headerSub, { color: palette.textSub }]}>Halifax, UK</Text>
          </View>
          <View style={[styles.headerLivePill, { backgroundColor: isLive ? '#BC2F2F' : palette.surfaceAlt }]}> 
            <View style={[styles.headerLiveDot, { opacity: isLive ? 1 : 0.4 }]} />
            <Text style={styles.headerLiveText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
          </View>
        </View>

        <Animated.View
          style={{
            opacity: revealAnim,
            transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          }}
        >
          <View style={[styles.radioOnlyIntroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
            <View style={[styles.inlineTabRow, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}> 
              <View style={[styles.inlineTab, { backgroundColor: palette.surface }]}> 
                <MaterialIcons name="radio" size={15} color={accentColor} />
                <Text style={[styles.inlineTabText, { color: palette.text }]}>Live Radio</Text>
              </View>
              <TouchableOpacity
                style={styles.inlineTab}
                activeOpacity={0.85}
                onPress={() => router.push('/youtube-live')}
              >
                <MaterialIcons name="ondemand-video" size={15} color={palette.textSub} />
                <Text style={[styles.inlineTabText, { color: palette.textSub }]}>YouTube Live</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.radioOnlyIntroHead}>
              <MaterialIcons name="radio" size={16} color={accentColor} />
              <Text style={[styles.radioOnlyIntroTitle, { color: palette.text }]}>Live Radio</Text>
            </View>
            <Text style={[styles.radioOnlyIntroBody, { color: palette.textSub }]}>This page is dedicated to JMN radio streams. Use the tab above to open YouTube Live.</Text>
          </View>
        </Animated.View>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Listen Now</Text>
          <View style={[styles.sectionNowPill, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}> 
            <MaterialIcons
              name={audioPlaying ? 'graphic-eq' : 'radio'}
              size={13}
              color={audioPlaying ? accentColor : palette.textMuted}
            />
            <Text style={[styles.sectionNowPillText, { color: audioPlaying ? accentColor : palette.textMuted }]} numberOfLines={1}>
              {audioPlaying ? `Now: ${activeStation?.label ?? 'Station'}` : 'Ready'}
            </Text>
          </View>
        </View>

        <Animated.View
          style={{
            opacity: revealAnim.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0, 0, 1] }),
            transform: [{ translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
          }}
        >
          {renderStations()}
        </Animated.View>

        {rewindNotice ? (
          <View style={[styles.infoCard, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}> 
            <MaterialIcons name="info-outline" size={16} color={accentColor} />
            <Text style={[styles.infoText, { color: palette.textSub }]}>{rewindNotice}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={basitOpen} transparent animationType="slide" onRequestClose={() => setBasitOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setBasitOpen(false)}>
          <View />
        </Pressable>
        <View style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: palette.text }]}>Qari Abdul Basit</Text>
            <TouchableOpacity onPress={() => setBasitOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sheetSub, { color: palette.textSub }]}>Search and tap a surah to play.</Text>

          <View style={[styles.searchWrap, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}> 
            <MaterialIcons name="search" size={16} color={palette.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Search surah name or number"
              placeholderTextColor={palette.textMuted}
              value={surahSearch}
              onChangeText={setSurahSearch}
              returnKeyType="search"
            />
            {surahSearch.length > 0 ? (
              <TouchableOpacity onPress={() => setSurahSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name="close" size={16} color={palette.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.sheetActions}>
            <TouchableOpacity
              style={[styles.sheetActionBtn, { backgroundColor: accentColor }]}
              onPress={() => {
                const randomSurah = Math.floor(Math.random() * 114) + 1;
                playBasitSurah(randomSurah).catch(() => {});
              }}
            >
              <MaterialIcons name="shuffle" size={16} color="#FFFFFF" />
              <Text style={styles.sheetActionText}>Random</Text>
            </TouchableOpacity>

            {activeStationId === 'basit' && (audioPlaying || audioLoading) ? (
              <TouchableOpacity
                style={[styles.sheetActionBtn, { backgroundColor: '#BC2F2F' }]}
                onPress={() => stopAudio().catch(() => {})}
              >
                <MaterialIcons name="stop" size={16} color="#FFFFFF" />
                <Text style={styles.sheetActionText}>Stop</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView showsVerticalScrollIndicator style={styles.surahList} keyboardShouldPersistTaps="handled">
            {filteredSurahs.map((surah) => (
              <TouchableOpacity
                key={surah.num}
                style={[
                  styles.surahRow,
                  {
                    borderBottomColor: palette.border,
                    backgroundColor: palette.surface,
                  },
                ]}
                onPress={() => playBasitSurah(surah.num).catch(() => {})}
                activeOpacity={0.8}
              >
                <View style={[styles.surahNum, { backgroundColor: `${accentColor}24` }]}>
                  <Text style={[styles.surahNumText, { color: accentColor }]}>{surah.num}</Text>
                </View>
                <Text style={[styles.surahName, { color: palette.text }]}>{surah.name}</Text>
                <MaterialIcons name="play-circle-outline" size={20} color={accentColor} />
              </TouchableOpacity>
            ))}
            {!filteredSurahs.length ? (
              <View style={styles.emptyRow}>
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>No surahs found</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export default function StreamRoute() {
  return <StreamScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  headerRow: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  headerName: {
    ...Typography.titleSmall,
    fontWeight: '800',
  },
  headerSub: {
    ...Typography.bodySmall,
    marginTop: 1,
  },
  headerLivePill: {
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  headerLiveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -70,
    right: -60,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroStatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroStatePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 14,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroActionPrimary: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  heroActionGhost: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroActionGhostText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  quickActionsCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: 10,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...Typography.titleSmall,
    fontWeight: '800',
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  radioOnlyIntroCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 6,
  },
  radioOnlyIntroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  inlineTabRow: {
    borderWidth: 1,
    borderRadius: Radius.full,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineTab: {
    flex: 1,
    borderRadius: Radius.full,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inlineTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  radioOnlyIntroTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  radioOnlyIntroBody: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  sectionNowPill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '68%',
  },
  sectionNowPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stationStack: {
    gap: 12,
  },
  halfRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCol: {
    flex: 1,
  },
  focusStack: {
    gap: 10,
  },
  mosaicWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mosaicItem: {
    width: '48.5%',
  },
  stationCard: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  stationCardActive: {
    borderWidth: 2,
  },
  stationCardCompact: {
    shadowOpacity: 0.08,
  },
  stationMediaWrap: {
    height: 130,
    position: 'relative',
  },
  stationMedia: {
    width: '100%',
    height: '100%',
  },
  stationMediaShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  stationMediaBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(6, 13, 25, 0.68)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stationMediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  livePulseDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    right: 10,
    top: 10,
    backgroundColor: '#FF4040',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  stationBody: {
    padding: Spacing.md,
    gap: 8,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  stationStatus: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  stationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  stationStatusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stationStatusPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  eqWrap: {
    width: 12,
    height: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eqBar: {
    width: 2.5,
    height: 13,
    borderRadius: 2,
  },
  stationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  rewindControl: {
    minWidth: 72,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  rewindControlText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resyncControl: {
    minWidth: 82,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  resyncControlText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeshiftWrap: {
    gap: 5,
  },
  timeshiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeshiftTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeshiftValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  timeshiftTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  timeshiftFill: {
    height: '100%',
    borderRadius: 999,
  },
  timeshiftHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  primaryControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flex: 1,
  },
  primaryControlText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryControl: {
    width: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyRow: {
    marginTop: 2,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifyLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  notifyHint: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  infoCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 10, 20, 0.58)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
    fontWeight: '600',
  },
  searchWrap: {
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  sheetActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  sheetActionBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sheetActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  surahList: {
    marginTop: 10,
    maxHeight: 330,
  },
  surahRow: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  surahNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahNumText: {
    fontSize: 12,
    fontWeight: '800',
  },
  surahName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyRow: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
});