import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { APP_CONFIG } from '@/constants/config';
import { Radius, Spacing, Typography } from '@/constants/theme';
import {
  type AudioSource,
  type LayoutMode,
  type Station,
  type StreamId,
  type StreamScreenProps,
  ANDROID_PLAYER_BOOTSTRAP_DELAY_MS,
  BOTTOM_PLAYER_COLLAPSED_HEIGHT,
  buildQiraatTrackUrl,
  buildSurahTrackUrl,
  DAY,
  EXPO_GO_NOTIFICATIONS_FALLBACK,
  formatPlaybackClock,
  getNextJuzNumber,
  getNextSurahNumber,
  getPreviousJuzNumber,
  getPreviousSurahNumber,
  HADR_JUZ_TRACKS,
  isQariReciterStation,
  isSurahTemplateStation,
  JUZ_START_SURAH,
  LIVE_NOTIFICATION_CHANNEL_ID,
  MAX_TIMESHIFT_SEC,
  NIGHT,
  normalizeTrackFile,
  NOTIF_KEY,
  PREVIEW_THEME,
  readSingleQueryParam,
  resolveAudioSourceUri,
  REWIND_SEEK_SETTLE_MS,
  REWIND_STEP_SEC,
  sanitizeQariPathSegment,
  SEEK_EPSILON_SEC,
  stationImageSource,
  SURAH_NAMES,
  SURAH_LIST,
} from '@/components/stream/streamConfig';
import { getNotificationsModule } from '@/hooks/useAndroidNotificationChannels';
import { useJmnLiveStatus } from '@/hooks/useJmnLiveStatus';
import { useNightMode } from '@/hooks/useNightMode';
import { refreshJmnLiveStatus } from '@/services/liveService';

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

export function StreamScreen({ previewVariant, autoPlayOnMount = false }: StreamScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    autoplayLive?: string | string[];
    autoplayIntentId?: string | string[];
    qari?: string | string[];
    qariPath?: string | string[];
    track?: string | string[];
    trackFile?: string | string[];
  }>();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const { nightMode } = useNightMode();
  const { isLive } = useJmnLiveStatus({ enabled: isFocused });

  const notificationAutoplayFlag = readSingleQueryParam(params.autoplayLive);
  const notificationAutoplayIntentId = readSingleQueryParam(params.autoplayIntentId);
  const qiraatParamQariPath = readSingleQueryParam(params.qariPath) ?? readSingleQueryParam(params.qari);
  const qiraatParamTrackFile = readSingleQueryParam(params.trackFile) ?? readSingleQueryParam(params.track);
  const qiraatQariPath = sanitizeQariPathSegment(
    qiraatParamQariPath,
  );
  const qiraatTrackFile = normalizeTrackFile(
    qiraatParamTrackFile,
  );

  const [activeStationId, setActiveStationId] = useState<StreamId>('masjid');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPaused, setAudioPaused] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [playingSurah, setPlayingSurah] = useState<number | null>(null);
  const [surahPickerOpen, setSurahPickerOpen] = useState(false);
  const [surahSearch, setSurahSearch] = useState('');
  const [selectedSurahStationId, setSelectedSurahStationId] = useState<string | null>(null);
  const [selectedSurahByStation, setSelectedSurahByStation] = useState<Record<string, number>>({});
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hadrOpen, setHadrOpen] = useState(false);
  const [selectedHadrJuz, setSelectedHadrJuz] = useState<number>(1);
  const [playingHadrJuz, setPlayingHadrJuz] = useState<number | null>(null);
  const [downloadingAllHadr, setDownloadingAllHadr] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState<{ done: number; total: number } | null>(null);
  const [downloadingHadrJuzSet, setDownloadingHadrJuzSet] = useState<Record<number, boolean>>({});
  const [cachedHadrJuzSet, setCachedHadrJuzSet] = useState<Record<number, boolean>>({});
  const [rewindNotice, setRewindNotice] = useState<string | null>(null);
  const [playbackPositionSec, setPlaybackPositionSec] = useState(0);
  const [playbackDurationSec, setPlaybackDurationSec] = useState(0);
  const [seekDraftSec, setSeekDraftSec] = useState<number | null>(null);
  const [timeshiftDraftSec, setTimeshiftDraftSec] = useState<number | null>(null);
  const [timeshiftSec, setTimeshiftSec] = useState(0);
  const [bottomPlayerExpanded, setBottomPlayerExpanded] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);

  const soundRef = useRef<AudioPlayer | null>(null);
  const webAudioRef = useRef<any>(null);
  const allPlayersRef = useRef<Set<AudioPlayer>>(new Set());
  const allWebAudiosRef = useRef<Set<any>>(new Set());
  const playRequestIdRef = useRef(0);
  const playHadrJuzRef = useRef<((juz: number, options?: { closeSheet?: boolean; promptDownload?: boolean }) => Promise<void>) | null>(null);
  const playSurahTrackRef = useRef<((stationId: string, surah: number) => Promise<void>) | null>(null);
  const activeStationIdRef = useRef<StreamId>('masjid');
  const playingHadrJuzRef = useRef<number | null>(null);
  const playingSurahRef = useRef<number | null>(null);
  const surahTemplateStationIdsRef = useRef<Set<string>>(new Set());
  const repeatEnabledRef = useRef(false);
  const autoAdvanceLockRef = useRef(false);
  const playbackStartedAtRef = useRef<number | null>(null);
  const playbackPositionSecRef = useRef(0);
  const playbackDurationSecRef = useRef(0);
  const timeshiftSecRef = useRef(0);
  const seekQueueRef = useRef<Promise<void>>(Promise.resolve());
  const bottomPlayerTranslateY = useRef(new Animated.Value(0)).current;
  const bottomPlayerTranslateYRef = useRef(0);
  const bottomPlayerTravelRef = useRef(0);
  const bottomPlayerDragStartRef = useRef(0);
  const audioModeReadyRef = useRef(false);
  const autoplayAttempted = useRef(false);
  const handledNotificationAutoplayIntentRef = useRef<string | null>(null);
  const revealAnim = useRef(new Animated.Value(0)).current;

  const hadrCacheDir = useMemo(() => {
    if (!FileSystem.documentDirectory) return null;
    return `${FileSystem.documentDirectory}hadr-juz-cache`;
  }, []);

  const hadrUsesRemoteTracks = useMemo(
    () => Array.from({ length: 30 }, (_, index) => index + 1).some((juz) => typeof HADR_JUZ_TRACKS[juz] === 'string'),
    [],
  );

  const buildHadrCacheFileUri = useCallback((juz: number) => {
    if (!hadrCacheDir) return null;
    return `${hadrCacheDir}/juz-${String(juz).padStart(2, '0')}.mp3`;
  }, [hadrCacheDir]);

  const ensureHadrCacheDirectory = useCallback(async () => {
    if (!hadrCacheDir) return false;

    try {
      await FileSystem.makeDirectoryAsync(hadrCacheDir, { intermediates: true });
      return true;
    } catch {
      return false;
    }
  }, [hadrCacheDir]);

  const getCachedHadrTrackUri = useCallback(async (juz: number) => {
    const targetUri = buildHadrCacheFileUri(juz);
    if (!targetUri) return null;

    try {
      const info = await FileSystem.getInfoAsync(targetUri);
      return info.exists ? targetUri : null;
    } catch {
      return null;
    }
  }, [buildHadrCacheFileUri]);

  const promptHadrDownloadChoice = useCallback((juz: number) => {
    return new Promise<'stream' | 'download' | 'cancel'>((resolve) => {
      Alert.alert(
        'Hadr playback option',
        `Play Juz ${juz} now or download it to local cache for offline playback.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
          { text: 'Stream now', onPress: () => resolve('stream') },
          { text: 'Download & play', onPress: () => resolve('download') },
        ],
        { cancelable: true, onDismiss: () => resolve('cancel') },
      );
    });
  }, []);

  const promptDownloadAllChoice = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        'Download full Hadr pack',
        'Download all 30 Hadr Juz files for offline playback? This can use significant storage.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Download all', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }, []);

  const downloadHadrTrackToCache = useCallback(async (juz: number, source: string): Promise<string | null> => {
    const cacheReady = await ensureHadrCacheDirectory();
    if (!cacheReady) {
      return null;
    }

    const targetUri = buildHadrCacheFileUri(juz);
    if (!targetUri) {
      return null;
    }

    try {
      const download = await FileSystem.downloadAsync(source, targetUri);
      if (download.status >= 200 && download.status < 300) {
        return download.uri;
      }
    } catch {
      // ignore and return null so caller can fallback/continue
    }

    return null;
  }, [buildHadrCacheFileUri, ensureHadrCacheDirectory]);

  const refreshCachedHadrStatus = useCallback(async () => {
    if (Platform.OS === 'web' || !hadrUsesRemoteTracks) {
      setCachedHadrJuzSet({});
      return;
    }

    const next: Record<number, boolean> = {};

    for (let juz = 1; juz <= 30; juz += 1) {
      const cached = await getCachedHadrTrackUri(juz);
      if (cached) next[juz] = true;
    }

    setCachedHadrJuzSet(next);
  }, [getCachedHadrTrackUri, hadrUsesRemoteTracks]);

  useEffect(() => {
    if (Platform.OS === 'web' || hadrUsesRemoteTracks || !hadrCacheDir) return;

    // Remove stale remote-cache files so Hadr always plays bundled juz-* assets.
    void FileSystem.deleteAsync(hadrCacheDir, { idempotent: true }).catch(() => {});
  }, [hadrCacheDir, hadrUsesRemoteTracks]);

  const downloadSingleHadrJuz = useCallback(async (juz: number) => {
    if (Platform.OS === 'web' || downloadingAllHadr || downloadingHadrJuzSet[juz]) return;

    if (!hadrUsesRemoteTracks) {
      setRewindNotice('Hadr uses built-in local files. Download is not required.');
      return;
    }

    const source = HADR_JUZ_TRACKS[juz];
    if (typeof source !== 'string') {
      setRewindNotice(`Juz ${juz} audio is currently unavailable.`);
      return;
    }

    const existing = await getCachedHadrTrackUri(juz);
    if (existing) {
      setCachedHadrJuzSet((prev) => ({ ...prev, [juz]: true }));
      setRewindNotice(`Juz ${juz} is already downloaded.`);
      return;
    }

    setDownloadingHadrJuzSet((prev) => ({ ...prev, [juz]: true }));
    setRewindNotice(`Downloading Juz ${juz}...`);

    try {
      const savedUri = await downloadHadrTrackToCache(juz, source);
      if (savedUri) {
        setCachedHadrJuzSet((prev) => ({ ...prev, [juz]: true }));
        setRewindNotice(`Downloaded Juz ${juz} for offline playback.`);
      } else {
        setRewindNotice(`Download failed for Juz ${juz}.`);
      }
    } finally {
      setDownloadingHadrJuzSet((prev) => {
        const copy = { ...prev };
        delete copy[juz];
        return copy;
      });
    }
  }, [downloadHadrTrackToCache, downloadingAllHadr, downloadingHadrJuzSet, getCachedHadrTrackUri, hadrUsesRemoteTracks]);

  const downloadAllHadrJuz = useCallback(async () => {
    if (Platform.OS === 'web' || downloadingAllHadr) return;

    if (!hadrUsesRemoteTracks) {
      setRewindNotice('Hadr uses built-in local files. Full pack download is not required.');
      return;
    }

    const approved = await promptDownloadAllChoice();
    if (!approved) return;

    const allJuz = Array.from({ length: 30 }, (_, index) => index + 1)
      .filter((juz) => typeof HADR_JUZ_TRACKS[juz] === 'string') as number[];

    if (!allJuz.length) {
      setRewindNotice('No Hadr tracks are currently available for download.');
      return;
    }

    setDownloadingAllHadr(true);
    setDownloadAllProgress({ done: 0, total: allJuz.length });
    setRewindNotice('Starting full Hadr download...');

    let completed = 0;

    try {
      for (const juz of allJuz) {
        const source = HADR_JUZ_TRACKS[juz];
        if (typeof source !== 'string') continue;

        const existing = await getCachedHadrTrackUri(juz);
        if (existing) {
          completed += 1;
          setDownloadAllProgress({ done: completed, total: allJuz.length });
          continue;
        }

        const savedUri = await downloadHadrTrackToCache(juz, source);
        if (savedUri) {
          completed += 1;
          setDownloadAllProgress({ done: completed, total: allJuz.length });
          setRewindNotice(`Downloaded Juz ${juz}. (${completed}/${allJuz.length})`);
        }
      }

      if (completed === allJuz.length) {
        setRewindNotice('All Hadr Juz files downloaded for offline playback.');
      } else {
        setRewindNotice(`Downloaded ${completed}/${allJuz.length} Hadr Juz files. You can retry Download all later.`);
      }

      await refreshCachedHadrStatus();
    } finally {
      setDownloadingAllHadr(false);
      setTimeout(() => setDownloadAllProgress(null), 1800);
    }
  }, [downloadHadrTrackToCache, downloadingAllHadr, getCachedHadrTrackUri, hadrUsesRemoteTracks, promptDownloadAllChoice, refreshCachedHadrStatus]);

  const resolveHadrPlaybackSource = useCallback(async (
    juz: number,
    source: AudioSource,
    options?: { promptDownload?: boolean },
  ): Promise<AudioSource | null> => {
    if (typeof source !== 'string' || Platform.OS === 'web' || !hadrUsesRemoteTracks) {
      return source;
    }

    const cachedUri = await getCachedHadrTrackUri(juz);
    if (cachedUri) {
      setRewindNotice(`Playing downloaded Juz ${juz}.`);
      return cachedUri;
    }

    const shouldPrompt = options?.promptDownload ?? true;
    if (!shouldPrompt) {
      return source;
    }

    const decision = await promptHadrDownloadChoice(juz);
    if (decision === 'cancel') {
      return null;
    }

    if (decision === 'stream') {
      return source;
    }

    setRewindNotice(`Downloading Juz ${juz} for offline playback...`);
    const savedUri = await downloadHadrTrackToCache(juz, source);
    if (savedUri) {
      setRewindNotice(`Downloaded Juz ${juz}. Offline playback ready.`);
      return savedUri;
    }

    setRewindNotice('Download failed. Streaming instead.');
    return source;
  }, [downloadHadrTrackToCache, getCachedHadrTrackUri, hadrUsesRemoteTracks, promptHadrDownloadChoice]);

  const palette = nightMode ? NIGHT : DAY;
  const previewTheme = previewVariant ? PREVIEW_THEME[previewVariant] : null;
  const layoutMode: LayoutMode = previewTheme?.mode ?? 'default';
  const isNarrowViewport = viewportWidth <= 390;
  const bottomPlayerSafeInset = Math.max(insets.bottom, 0);
  const bottomPlayerCollapsedHeight = BOTTOM_PLAYER_COLLAPSED_HEIGHT + bottomPlayerSafeInset;
  const bottomPlayerExpandedHeight = useMemo(
    () => Math.min(420, Math.max(290, Math.round(viewportHeight * 0.62))) + bottomPlayerSafeInset,
    [bottomPlayerSafeInset, viewportHeight],
  );
  const bottomPlayerTravel = Math.max(0, bottomPlayerExpandedHeight - bottomPlayerCollapsedHeight);

  const qariCardWidth = useMemo(() => {
    const preferred = Math.round(viewportWidth * (isNarrowViewport ? 0.78 : 0.74));
    return Math.max(248, Math.min(322, preferred));
  }, [isNarrowViewport, viewportWidth]);

  const accentColor = palette.accent;

  const radioStreams = useMemo(
    () => APP_CONFIG.radioStreams as Station[],
    [],
  );

  useEffect(() => {
    if (!hadrOpen) return;
    void refreshCachedHadrStatus();
  }, [hadrOpen, refreshCachedHadrStatus]);

  const masjidStation = useMemo(
    () => radioStreams.find((station) => station.id === 'masjid') ?? null,
    [radioStreams],
  );

  const qariStations = useMemo(
    () => radioStreams.filter(isQariReciterStation),
    [radioStreams],
  );

  const qariStationIds = useMemo(
    () => new Set(qariStations.map((station) => station.id)),
    [qariStations],
  );

  const otherStations = useMemo(
    () => radioStreams.filter((station) => station.id !== 'masjid' && !qariStationIds.has(station.id)),
    [qariStationIds, radioStreams],
  );

  const surahTemplateStationIds = useMemo(
    () => new Set(radioStreams.filter(isSurahTemplateStation).map((station) => station.id)),
    [radioStreams],
  );

  const selectedSurahStation = useMemo(
    () => (selectedSurahStationId ? radioStreams.find((item) => item.id === selectedSurahStationId) ?? null : null),
    [radioStreams, selectedSurahStationId],
  );

  const selectedSurahForStation = useMemo(
    () => (selectedSurahStationId ? selectedSurahByStation[selectedSurahStationId] ?? 1 : 1),
    [selectedSurahByStation, selectedSurahStationId],
  );

  const filteredSurahs = useMemo(() => {
    const term = surahSearch.trim().toLowerCase();
    if (!term) return SURAH_LIST;
    return SURAH_LIST.filter(
      (item) => item.name.toLowerCase().includes(term) || String(item.num).startsWith(term),
    );
  }, [surahSearch]);

  const updatePlaybackPosition = useCallback((positionSec: number) => {
    if (!Number.isFinite(positionSec)) return;
    const normalized = Math.max(0, positionSec);
    playbackPositionSecRef.current = normalized;
    setPlaybackPositionSec((prev) => (Math.abs(prev - normalized) >= 0.2 ? normalized : prev));
  }, []);

  const updatePlaybackDuration = useCallback((durationSec: number) => {
    const normalized = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0;
    playbackDurationSecRef.current = normalized;
    setPlaybackDurationSec((prev) => (Math.abs(prev - normalized) >= 0.5 ? normalized : prev));
  }, []);

  useEffect(() => {
    activeStationIdRef.current = activeStationId;
  }, [activeStationId]);

  useEffect(() => {
    playingHadrJuzRef.current = playingHadrJuz;
  }, [playingHadrJuz]);

  useEffect(() => {
    playingSurahRef.current = playingSurah;
  }, [playingSurah]);

  useEffect(() => {
    surahTemplateStationIdsRef.current = surahTemplateStationIds;
  }, [surahTemplateStationIds]);

  useEffect(() => {
    repeatEnabledRef.current = repeatEnabled;
  }, [repeatEnabled]);

  useEffect(() => {
    if (Platform.OS === 'web' || !hadrOpen) return;

    const currentJuz = Math.max(1, Math.min(30, selectedHadrJuz));
    const warmupJuz = [
      currentJuz,
      getPreviousJuzNumber(currentJuz),
      getNextJuzNumber(currentJuz),
    ];

    warmupJuz.forEach((juz) => {
      const source = HADR_JUZ_TRACKS[juz];
      if (!source || typeof source !== 'number') return;
      const asset = Asset.fromModule(source);
      if (!asset.localUri) {
        void asset.downloadAsync().catch(() => {});
      }
    });
  }, [hadrOpen, selectedHadrJuz]);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((value) => {
      if (value === null) {
        setNotifyEnabled(true);
        void AsyncStorage.setItem(NOTIF_KEY, 'true').catch(() => {});
        return;
      }

      setNotifyEnabled(value === 'true');
    });
  }, []);

  useEffect(() => {
    const playersRef = allPlayersRef;
    const webAudiosRef = allWebAudiosRef;

    return () => {
      playRequestIdRef.current += 1;

      const playersSet = playersRef.current;
      const playersToStop = new Set<AudioPlayer>(playersSet);
      if (soundRef.current) playersToStop.add(soundRef.current);
      playersSet.clear();
      soundRef.current = null;

      const webAudiosSet = webAudiosRef.current;
      const webAudiosToStop = new Set<any>(webAudiosSet);
      if (webAudioRef.current) webAudiosToStop.add(webAudioRef.current);
      webAudiosSet.clear();
      webAudioRef.current = null;

      playersToStop.forEach((player) => {
        try {
          player.pause();
        } catch {
          // Ignore pause failures while unmounting.
        }

        try {
          void player.seekTo(0).catch(() => {});
        } catch {
          // Some streams don't support seek.
        }

        try {
          player.remove();
        } catch {
          // Ignore removal failures while unmounting.
        }
      });

      webAudiosToStop.forEach((webAudio) => {
        try {
          webAudio.pause();
        } catch {
          // Ignore web pause failures while unmounting.
        }

        try {
          webAudio.currentTime = 0;
        } catch {
          // Some streams don't support setting current time.
        }

        try {
          webAudio.src = '';
          if (typeof webAudio.load === 'function') webAudio.load();
        } catch {
          // Ignore web cleanup failures while unmounting.
        }
      });

      playbackStartedAtRef.current = null;
      playbackPositionSecRef.current = 0;
      playbackDurationSecRef.current = 0;
      timeshiftSecRef.current = 0;
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

  useEffect(() => {
    bottomPlayerTravelRef.current = bottomPlayerTravel;
    const next = bottomPlayerExpanded ? 0 : bottomPlayerTravel;
    bottomPlayerTranslateYRef.current = next;
    bottomPlayerTranslateY.setValue(next);
  }, [bottomPlayerExpanded, bottomPlayerTravel, bottomPlayerTranslateY]);

  const animateBottomPlayer = useCallback((expand: boolean) => {
    const toValue = expand ? 0 : bottomPlayerTravelRef.current;
    setBottomPlayerExpanded(expand);

    Animated.spring(bottomPlayerTranslateY, {
      toValue,
      damping: 26,
      stiffness: 260,
      mass: 0.9,
      overshootClamping: true,
      useNativeDriver: true,
    }).start(() => {
      bottomPlayerTranslateYRef.current = toValue;
    });
  }, [bottomPlayerTranslateY]);

  const bottomPlayerPanResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        return Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
      },
      onPanResponderGrant: () => {
        bottomPlayerTranslateY.stopAnimation((value) => {
          bottomPlayerTranslateYRef.current = value;
          bottomPlayerDragStartRef.current = value;
        });
      },
      onPanResponderMove: (_evt, gesture) => {
        const travel = bottomPlayerTravelRef.current;
        const next = Math.max(0, Math.min(travel, bottomPlayerDragStartRef.current + gesture.dy));
        bottomPlayerTranslateYRef.current = next;
        bottomPlayerTranslateY.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const travel = bottomPlayerTravelRef.current;
        const current = bottomPlayerTranslateYRef.current;
        const expandByVelocity = gesture.vy < -0.24;
        const collapseByVelocity = gesture.vy > 0.24;
        const expandByPosition = current < travel * 0.45;
        const shouldExpand = collapseByVelocity ? false : expandByVelocity ? true : expandByPosition;
        animateBottomPlayer(shouldExpand);
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        const travel = bottomPlayerTravelRef.current;
        animateBottomPlayer(bottomPlayerTranslateYRef.current < travel * 0.5);
      },
    }),
    [animateBottomPlayer, bottomPlayerTranslateY],
  );

  const stopAudio = useCallback(async () => {
    playRequestIdRef.current += 1;

    const playersToStop = new Set<AudioPlayer>(allPlayersRef.current);
    if (soundRef.current) playersToStop.add(soundRef.current);
    allPlayersRef.current.clear();

    const webAudiosToStop = new Set<any>(allWebAudiosRef.current);
    if (webAudioRef.current) webAudiosToStop.add(webAudioRef.current);
    allWebAudiosRef.current.clear();

    soundRef.current = null;
    webAudioRef.current = null;

    for (const player of playersToStop) {
      try {
        player.pause();
      } catch {
        // Ignore pause failures; we still must dispose the player.
      }

      try {
        player.remove();
      } catch {
        // Disposal errors should not block UI flow.
      }
    }

    for (const webAudio of webAudiosToStop) {
      try {
        webAudio.pause();
      } catch {
        // Ignore pause failures for web audio.
      }

      try {
        webAudio.currentTime = 0;
      } catch {
        // Some streams don't support setting current time.
      }

      try {
        webAudio.src = '';
        if (typeof webAudio.load === 'function') webAudio.load();
      } catch {
        // Ignore web cleanup failures.
      }
    }

    playbackStartedAtRef.current = null;
    playbackPositionSecRef.current = 0;
    playbackDurationSecRef.current = 0;
    timeshiftSecRef.current = 0;
    setPlaybackPositionSec(0);
    setPlaybackDurationSec(0);
    setSeekDraftSec(null);
    setTimeshiftDraftSec(null);
    setTimeshiftSec(0);
    setAudioPlaying(false);
    setAudioPaused(false);
    setAudioLoading(false);
  }, []);

  const ensurePrayerAudioUnlocked = useCallback((): boolean => true, []);

  const pauseActiveAudio = useCallback(async () => {
    if ((!soundRef.current && !webAudioRef.current) || audioLoading) return;

    try {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
      }
      if (soundRef.current) {
        soundRef.current.pause();
      }
      setAudioPlaying(false);
      setAudioPaused(true);
      setAudioLoading(false);
    } catch {
      setRewindNotice('Unable to pause right now. Please try again.');
    }
  }, [audioLoading]);

  const resumeActiveAudio = useCallback(async () => {
    if ((!soundRef.current && !webAudioRef.current) || audioLoading) return;
    if (!ensurePrayerAudioUnlocked()) return;

    try {
      if (webAudioRef.current) {
        const resumeResult = webAudioRef.current.play();
        if (resumeResult && typeof resumeResult.then === 'function') {
          await resumeResult;
        }
      }
      if (soundRef.current) {
        soundRef.current.play();
      }
      setAudioPaused(false);
      setAudioPlaying(true);
      setAudioLoading(false);
      setRewindNotice(null);
    } catch {
      setRewindNotice('Unable to resume playback. Please tap Play again.');
    }
  }, [audioLoading, ensurePrayerAudioUnlocked]);

  const playUrl = useCallback(async (
    source: AudioSource,
    options?: { retries?: number; connectTimeoutMs?: number },
  ) => {
    if (!ensurePrayerAudioUnlocked()) return;

    const requestId = ++playRequestIdRef.current;

    const cleanupWebAudio = (audio: any) => {
      allWebAudiosRef.current.delete(audio);
      if (webAudioRef.current === audio) {
        webAudioRef.current = null;
      }

      try {
        audio.pause();
      } catch {
        // Ignore pause failures for web audio cleanup.
      }

      try {
        audio.src = '';
        if (typeof audio.load === 'function') audio.load();
      } catch {
        // Ignore source cleanup failures.
      }
    };

    const cleanupPlayer = (player: AudioPlayer) => {
      allPlayersRef.current.delete(player);
      if (soundRef.current === player) {
        soundRef.current = null;
      }

      try {
        player.pause();
      } catch {
        // Ignore pause failures.
      }

      try {
        void player.seekTo(0).catch(() => {});
      } catch {
        // Ignore seek failures.
      }

      try {
        player.remove();
      } catch {
        // Ignore removal failures.
      }
    };

    const maxAttempts = Math.max(1, options?.retries ?? 1);
    const connectTimeoutMs = options?.connectTimeoutMs ?? 2500;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let connected = false;

      try {
        setAudioLoading(true);
        setAudioPlaying(true);
        setAudioPaused(false);
        playbackStartedAtRef.current = Date.now();
        playbackPositionSecRef.current = 0;
        playbackDurationSecRef.current = 0;
        timeshiftSecRef.current = 0;
        setPlaybackPositionSec(0);
        setPlaybackDurationSec(0);
        setSeekDraftSec(null);
        setTimeshiftDraftSec(null);
        setTimeshiftSec(0);

        const url = await resolveAudioSourceUri(source);
        if (requestId !== playRequestIdRef.current) return;

        if (Platform.OS === 'web') {
          const AudioCtor = (globalThis as { Audio?: new (src?: string) => any }).Audio;
          if (!AudioCtor) {
            throw new Error('web-audio-not-supported');
          }

          const audio = new AudioCtor(url);
          if (requestId !== playRequestIdRef.current) {
            cleanupWebAudio(audio);
            return;
          }

          webAudioRef.current = audio;
          allWebAudiosRef.current.add(audio);

          audio.preload = 'none';
          audio.playsInline = true;

          audio.ontimeupdate = () => {
            if (webAudioRef.current !== audio) return;
            const currentTime = audio.currentTime;
            if (typeof currentTime === 'number' && Number.isFinite(currentTime)) {
              updatePlaybackPosition(currentTime);
            }

            const duration = audio.duration;
            if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
              updatePlaybackDuration(duration);
            }
          };

          audio.onloadedmetadata = () => {
            if (webAudioRef.current !== audio) return;
            const duration = audio.duration;
            if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
              updatePlaybackDuration(duration);
            }
          };

          audio.onplaying = () => {
            if (webAudioRef.current !== audio) return;
            connected = true;
            setAudioPaused(false);
            setAudioLoading(false);
          };

          audio.oncanplay = () => {
            if (webAudioRef.current !== audio) return;
            connected = true;
            setAudioPaused(false);
            setAudioLoading(false);
          };

          audio.onended = () => {
            allWebAudiosRef.current.delete(audio);
            if (webAudioRef.current !== audio) return;

            const activeStation = activeStationIdRef.current;
            if (repeatEnabledRef.current) {
              if (
                activeStation === 'hadr'
                && !autoAdvanceLockRef.current
                && typeof playingHadrJuzRef.current === 'number'
              ) {
                const replayJuz = playHadrJuzRef.current;
                const sameJuz = playingHadrJuzRef.current;
                if (replayJuz) {
                  autoAdvanceLockRef.current = true;
                  setTimeout(() => {
                    replayJuz(sameJuz, { promptDownload: false })
                      .catch(() => {})
                      .finally(() => {
                        autoAdvanceLockRef.current = false;
                      });
                  }, 140);
                  return;
                }
              }

              if (
                surahTemplateStationIdsRef.current.has(activeStation)
                && !autoAdvanceLockRef.current
                && typeof playingSurahRef.current === 'number'
              ) {
                const replaySurah = playSurahTrackRef.current;
                const sameSurah = playingSurahRef.current;
                if (replaySurah) {
                  autoAdvanceLockRef.current = true;
                  setTimeout(() => {
                    replaySurah(activeStation, sameSurah)
                      .catch(() => {})
                      .finally(() => {
                        autoAdvanceLockRef.current = false;
                      });
                  }, 140);
                  return;
                }
              }
            }

            if (
              activeStation === 'hadr'
              && !autoAdvanceLockRef.current
              && typeof playingHadrJuzRef.current === 'number'
            ) {
              const playNextJuz = playHadrJuzRef.current;
              const nextJuz = getNextJuzNumber(playingHadrJuzRef.current);
              if (playNextJuz) {
                autoAdvanceLockRef.current = true;
                setTimeout(() => {
                  playNextJuz(nextJuz, { promptDownload: false })
                    .catch(() => {})
                    .finally(() => {
                      autoAdvanceLockRef.current = false;
                    });
                }, 140);
                return;
              }
            }

            if (
              surahTemplateStationIdsRef.current.has(activeStation)
              && !autoAdvanceLockRef.current
              && typeof playingSurahRef.current === 'number'
            ) {
              const playNextSurah = playSurahTrackRef.current;
              const nextSurah = getNextSurahNumber(playingSurahRef.current);
              if (playNextSurah) {
                autoAdvanceLockRef.current = true;
                setTimeout(() => {
                  playNextSurah(activeStation, nextSurah)
                    .catch(() => {})
                    .finally(() => {
                      autoAdvanceLockRef.current = false;
                    });
                }, 140);
                return;
              }
            }

            playbackStartedAtRef.current = null;
            playbackPositionSecRef.current = 0;
            playbackDurationSecRef.current = 0;
            setPlaybackPositionSec(0);
            setPlaybackDurationSec(0);
            setSeekDraftSec(null);
            setTimeshiftDraftSec(null);
            setAudioPlaying(false);
            setAudioPaused(false);
            setAudioLoading(false);
          };

          const playResult = audio.play();
          if (playResult && typeof playResult.then === 'function') {
            await playResult;
          }

          await new Promise((resolve) => setTimeout(resolve, connectTimeoutMs));

          if (requestId !== playRequestIdRef.current) {
            cleanupWebAudio(audio);
            return;
          }

          if (!connected) {
            cleanupWebAudio(audio);
            throw new Error('connect-timeout');
          }

          setTimeout(() => {
            if (requestId === playRequestIdRef.current) {
              setAudioLoading(false);
            }
          }, 1200);

          setRewindNotice(null);

          return;
        }

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

        if (requestId !== playRequestIdRef.current) return;

        if (Platform.OS === 'android') {
          await new Promise((resolve) => setTimeout(resolve, ANDROID_PLAYER_BOOTSTRAP_DELAY_MS));
        }

        if (requestId !== playRequestIdRef.current) return;

        const player = createAudioPlayer({ uri: url }, { updateInterval: 250 });
        if (requestId !== playRequestIdRef.current) {
          cleanupPlayer(player);
          return;
        }

        soundRef.current = player;
        allPlayersRef.current.add(player);

        player.addListener('playbackStatusUpdate', (status) => {
          if (soundRef.current !== player) return;

          const currentTime = (status as { currentTime?: number }).currentTime;
          const duration = (status as { duration?: number }).duration;

          if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
            updatePlaybackDuration(duration);
          }

          if (typeof currentTime === 'number' && Number.isFinite(currentTime)) {
            updatePlaybackPosition(currentTime);
          } else if (playbackStartedAtRef.current && status.playing) {
            updatePlaybackPosition((Date.now() - playbackStartedAtRef.current) / 1000);
          }

          if (status.isLoaded && (status.playing || status.isBuffering)) {
            connected = true;
            setAudioPaused(false);
            setAudioLoading(false);
          }

          if (status.didJustFinish) {
            allPlayersRef.current.delete(player);
            const activeStation = activeStationIdRef.current;
            if (repeatEnabledRef.current) {
              if (
                activeStation === 'hadr'
                && !autoAdvanceLockRef.current
                && typeof playingHadrJuzRef.current === 'number'
              ) {
                const replayJuz = playHadrJuzRef.current;
                const sameJuz = playingHadrJuzRef.current;
                if (replayJuz) {
                  autoAdvanceLockRef.current = true;
                  setTimeout(() => {
                    replayJuz(sameJuz, { promptDownload: false })
                      .catch(() => {})
                      .finally(() => {
                        autoAdvanceLockRef.current = false;
                      });
                  }, 140);
                  return;
                }
              }

              if (
                surahTemplateStationIdsRef.current.has(activeStation)
                && !autoAdvanceLockRef.current
                && typeof playingSurahRef.current === 'number'
              ) {
                const replaySurah = playSurahTrackRef.current;
                const sameSurah = playingSurahRef.current;
                if (replaySurah) {
                  autoAdvanceLockRef.current = true;
                  setTimeout(() => {
                    replaySurah(activeStation, sameSurah)
                      .catch(() => {})
                      .finally(() => {
                        autoAdvanceLockRef.current = false;
                      });
                  }, 140);
                  return;
                }
              }
            }

            if (
              activeStation === 'hadr'
              && !autoAdvanceLockRef.current
              && typeof playingHadrJuzRef.current === 'number'
            ) {
              const playNextJuz = playHadrJuzRef.current;
              const nextJuz = getNextJuzNumber(playingHadrJuzRef.current);
              if (playNextJuz) {
                autoAdvanceLockRef.current = true;
                setTimeout(() => {
                  playNextJuz(nextJuz, { promptDownload: false })
                    .catch(() => {})
                    .finally(() => {
                      autoAdvanceLockRef.current = false;
                    });
                }, 140);
                return;
              }
            }

            if (
              surahTemplateStationIdsRef.current.has(activeStation)
              && !autoAdvanceLockRef.current
              && typeof playingSurahRef.current === 'number'
            ) {
              const playNextSurah = playSurahTrackRef.current;
              const nextSurah = getNextSurahNumber(playingSurahRef.current);
              if (playNextSurah) {
                autoAdvanceLockRef.current = true;
                setTimeout(() => {
                  playNextSurah(activeStation, nextSurah)
                    .catch(() => {})
                    .finally(() => {
                      autoAdvanceLockRef.current = false;
                    });
                }, 140);
                return;
              }
            }

            playbackStartedAtRef.current = null;
            playbackPositionSecRef.current = 0;
            playbackDurationSecRef.current = 0;
            setPlaybackPositionSec(0);
            setPlaybackDurationSec(0);
            setSeekDraftSec(null);
            setTimeshiftDraftSec(null);
            setAudioPlaying(false);
            setAudioPaused(false);
            setAudioLoading(false);
          }
        });

        player.play();

        await new Promise((resolve) => setTimeout(resolve, connectTimeoutMs));

        if (requestId !== playRequestIdRef.current) {
          cleanupPlayer(player);
          return;
        }

        if (!connected) {
          cleanupPlayer(player);
          throw new Error('connect-timeout');
        }

        setTimeout(() => {
          if (requestId === playRequestIdRef.current) {
            setAudioLoading(false);
          }
        }, 2200);

        setRewindNotice(null);

        return;
      } catch {
        if (requestId !== playRequestIdRef.current) {
          return;
        }

        const hasMoreAttempts = attempt < maxAttempts;
        if (!hasMoreAttempts) {
          setAudioLoading(false);
          setAudioPlaying(false);
          setAudioPaused(false);
          setRewindNotice('Unable to play this station in-app right now. Please try again in a moment.');
          return;
        }
      }
    }
  }, [ensurePrayerAudioUnlocked, updatePlaybackDuration, updatePlaybackPosition]);

  const playSurahTrack = useCallback(
    async (stationId: string, surah: number) => {
      const station = radioStreams.find((item) => item.id === stationId);
      if (!station) return;

      if (soundRef.current || webAudioRef.current || allPlayersRef.current.size || allWebAudiosRef.current.size) {
        await stopAudio();
      }

      const normalizedSurah = Math.max(1, Math.min(114, Math.round(surah)));
      setActiveStationId(stationId);
      setPlayingHadrJuz(null);
      setHadrOpen(false);
      setPlayingSurah(normalizedSurah);
      setSelectedSurahByStation((prev) => ({ ...prev, [stationId]: normalizedSurah }));

      const source = buildSurahTrackUrl(station.url, normalizedSurah);
      await playUrl(source, { retries: 1, connectTimeoutMs: 2200 });
    },
    [playUrl, radioStreams, stopAudio],
  );

  useEffect(() => {
    playSurahTrackRef.current = playSurahTrack;
  }, [playSurahTrack]);

  const playRandomSurahForStation = useCallback(async (stationId: string) => {
    const currentSurah = selectedSurahByStation[stationId]
      ?? (activeStationIdRef.current === stationId ? playingSurahRef.current : null)
      ?? 1;
    const candidatePool = SURAH_LIST.length > 1
      ? SURAH_LIST.filter((item) => item.num !== currentSurah)
      : SURAH_LIST;
    const randomSurah = candidatePool[Math.floor(Math.random() * candidatePool.length)]?.num ?? 1;
    await playSurahTrack(stationId, randomSurah);
  }, [playSurahTrack, selectedSurahByStation]);

  const playStation = useCallback(
    async (stationId: StreamId) => {
      const stream = radioStreams.find((item) => item.id === stationId);
      if (!stream) return;

      const isSurahTemplate = surahTemplateStationIds.has(stationId);

      const tappingSame = activeStationId === stationId;
      if (tappingSame && (audioPlaying || audioLoading || soundRef.current || webAudioRef.current)) {
        await stopAudio();
        if (stationId === 'hadr') {
          setPlayingHadrJuz(null);
        }
        if (isSurahTemplate) {
          setPlayingSurah(null);
        }
        return;
      }

      if (isSurahTemplate) {
        const surahToPlay = selectedSurahByStation[stationId] ?? playingSurahRef.current ?? 1;
        await playSurahTrack(stationId, surahToPlay);
        return;
      }

      if (soundRef.current || webAudioRef.current || allPlayersRef.current.size || allWebAudiosRef.current.size) {
        await stopAudio();
      }

      setActiveStationId(stationId);
      setPlayingHadrJuz(null);
      setPlayingSurah(null);
      setHadrOpen(false);

      const isQiraat = stationId === 'qiraat';
      let source: AudioSource = stream.url;
      let retries = 1;
      let connectTimeoutMs = 2500;

      if (isQiraat) {
        source = buildQiraatTrackUrl(stream.url, qiraatQariPath, qiraatTrackFile);
        retries = 2;
        connectTimeoutMs = 1800;
      }

      await playUrl(source, {
        retries,
        connectTimeoutMs,
      });
    },
    [activeStationId, audioLoading, audioPlaying, playSurahTrack, playUrl, qiraatQariPath, qiraatTrackFile, radioStreams, selectedSurahByStation, stopAudio, surahTemplateStationIds],
  );

  const playHadrJuz = useCallback(
    async (juz: number, options?: { closeSheet?: boolean; promptDownload?: boolean }) => {
      const hadr = radioStreams.find((item) => item.id === 'hadr');
      if (!hadr) return;

      const normalizedJuz = Math.max(1, Math.min(30, Math.round(juz)));
      const hadrTrack = HADR_JUZ_TRACKS[normalizedJuz];
      if (!hadrTrack) {
        setRewindNotice(`Juz ${normalizedJuz} audio is currently unavailable.`);
        return;
      }

      const sourceToPlay = await resolveHadrPlaybackSource(normalizedJuz, hadrTrack, {
        promptDownload: options?.promptDownload,
      });
      if (!sourceToPlay) {
        setRewindNotice(`Playback cancelled for Juz ${normalizedJuz}.`);
        return;
      }

      if (soundRef.current || webAudioRef.current || allPlayersRef.current.size || allWebAudiosRef.current.size) {
        await stopAudio();
      }

      setActiveStationId('hadr');
      setPlayingHadrJuz(normalizedJuz);
      setSelectedHadrJuz(normalizedJuz);

      if (options?.closeSheet ?? false) {
        setHadrOpen(false);
      }

      await playUrl(sourceToPlay, { retries: 1, connectTimeoutMs: 2200 });

      const nextTrack = HADR_JUZ_TRACKS[getNextJuzNumber(normalizedJuz)];
      if (typeof nextTrack === 'number') {
        const nextAsset = Asset.fromModule(nextTrack);
        if (!nextAsset.localUri) {
          void nextAsset.downloadAsync().catch(() => {});
        }
      }
    },
    [playUrl, radioStreams, resolveHadrPlaybackSource, stopAudio],
  );

  const playRandomHadrJuz = useCallback(async (options?: { closeSheet?: boolean }) => {
    const availableJuz = Array.from({ length: 30 }, (_, index) => index + 1)
      .filter((juz) => Boolean(HADR_JUZ_TRACKS[juz]));

    if (!availableJuz.length) {
      setRewindNotice('No Hadr Juz audio is currently available.');
      return;
    }

    const currentJuz = playingHadrJuzRef.current ?? selectedHadrJuz;
    const candidatePool = availableJuz.length > 1
      ? availableJuz.filter((juz) => juz !== currentJuz)
      : availableJuz;
    const randomJuz = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    await playHadrJuz(randomJuz, options);
  }, [playHadrJuz, selectedHadrJuz]);

  useEffect(() => {
    playHadrJuzRef.current = (juz: number, options?: { closeSheet?: boolean; promptDownload?: boolean }) => playHadrJuz(juz, options);
  }, [playHadrJuz]);

  const playPreviousFromPlayer = useCallback(async () => {
    if (audioLoading) return;

    const currentStationId = activeStationIdRef.current;

    if (currentStationId === 'hadr') {
      const currentJuz = playingHadrJuzRef.current ?? selectedHadrJuz;
      const previousJuz = getPreviousJuzNumber(currentJuz);
      await playHadrJuz(previousJuz, { closeSheet: true });
      return;
    }

    if (surahTemplateStationIdsRef.current.has(currentStationId)) {
      const currentSurah = playingSurahRef.current ?? selectedSurahByStation[currentStationId] ?? 1;
      const previousSurah = getPreviousSurahNumber(currentSurah);
      const playSurah = playSurahTrackRef.current;
      if (playSurah) {
        await playSurah(currentStationId, previousSurah);
      }
      return;
    }

    const currentIndex = radioStreams.findIndex((item) => item.id === currentStationId);
    if (currentIndex < 0 || radioStreams.length === 0) return;

    const previousStation = radioStreams[(currentIndex - 1 + radioStreams.length) % radioStreams.length];
    await playStation(previousStation.id as StreamId);
  }, [audioLoading, playHadrJuz, playStation, radioStreams, selectedHadrJuz, selectedSurahByStation]);

  const playNextFromPlayer = useCallback(async () => {
    if (audioLoading) return;

    const currentStationId = activeStationIdRef.current;

    if (currentStationId === 'hadr') {
      const currentJuz = playingHadrJuzRef.current ?? selectedHadrJuz;
      const nextJuz = getNextJuzNumber(currentJuz);
      await playHadrJuz(nextJuz, { closeSheet: true });
      return;
    }

    if (surahTemplateStationIdsRef.current.has(currentStationId)) {
      const currentSurah = playingSurahRef.current ?? selectedSurahByStation[currentStationId] ?? 1;
      const nextSurah = getNextSurahNumber(currentSurah);
      const playSurah = playSurahTrackRef.current;
      if (playSurah) {
        await playSurah(currentStationId, nextSurah);
      }
      return;
    }

    const currentIndex = radioStreams.findIndex((item) => item.id === currentStationId);
    if (currentIndex < 0 || radioStreams.length === 0) return;

    const nextStation = radioStreams[(currentIndex + 1) % radioStreams.length];
    await playStation(nextStation.id as StreamId);
  }, [audioLoading, playHadrJuz, playStation, radioStreams, selectedHadrJuz, selectedSurahByStation]);

  useEffect(() => {
    if (!autoPlayOnMount || autoplayAttempted.current) return;
    autoplayAttempted.current = true;

    const id = setTimeout(() => {
      playStation('masjid').catch(() => {});
    }, 300);

    return () => clearTimeout(id);
  }, [autoPlayOnMount, playStation]);

  useEffect(() => {
    if (notificationAutoplayFlag !== '1') return;

    const intentId = notificationAutoplayIntentId ?? 'live-notification';
    if (handledNotificationAutoplayIntentRef.current === intentId) return;
    handledNotificationAutoplayIntentRef.current = intentId;

    let cancelled = false;
    let playTimer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      const latest = await refreshJmnLiveStatus().catch(() => null);
      if (cancelled || !latest?.isLive) return;
      if (audioPlaying || audioLoading || soundRef.current || webAudioRef.current) return;

      autoplayAttempted.current = true;
      playTimer = setTimeout(() => {
        if (cancelled) return;
        playStation('masjid').catch(() => {});
      }, 300);
    })();

    return () => {
      cancelled = true;
      if (playTimer) {
        clearTimeout(playTimer);
      }
    };
  }, [audioLoading, audioPlaying, notificationAutoplayFlag, notificationAutoplayIntentId, playStation]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const latest = await refreshJmnLiveStatus();
      const hasActiveAudio = audioPlaying || audioLoading || !!soundRef.current || !!webAudioRef.current;
      const isMasjidPlaying = activeStationIdRef.current === 'masjid';

      if (isMasjidPlaying && hasActiveAudio && !latest.isLive) {
        await stopAudio();
        setRewindNotice('Live stream is currently offline. Playback stopped.');
      }
    } finally {
      setRefreshing(false);
    }
  }, [audioLoading, audioPlaying, stopAudio]);

  const resyncActiveStreamToLive = useCallback(async (notice?: string) => {
    if ((!soundRef.current && !webAudioRef.current) || (!audioPlaying && !audioLoading && !audioPaused)) return;

    const activeStream = radioStreams.find((item) => item.id === activeStationId);
    if (!activeStream) return;

    let targetSource: AudioSource = activeStream.url;
    let retries = 1;
    let connectTimeoutMs = 2200;

    if (activeStationId === 'qiraat') {
      retries = 2;
      connectTimeoutMs = 1800;
      targetSource = buildQiraatTrackUrl(activeStream.url, qiraatQariPath, qiraatTrackFile);
    }

    if (surahTemplateStationIds.has(activeStationId)) {
      const surah = playingSurah ?? 1;
      targetSource = buildSurahTrackUrl(activeStream.url, surah);
      retries = 1;
      connectTimeoutMs = 2200;
    }

    if (activeStationId === 'hadr') {
      const hadrTrack = HADR_JUZ_TRACKS[playingHadrJuz ?? selectedHadrJuz];
      if (!hadrTrack) {
        setRewindNotice(`Juz ${playingHadrJuz ?? selectedHadrJuz} audio is currently unavailable.`);
        return;
      }
      targetSource = hadrTrack;
    }

    await stopAudio();
    await playUrl(targetSource, { retries, connectTimeoutMs });
    timeshiftSecRef.current = 0;
    setTimeshiftSec(0);
    setRewindNotice(notice ?? 'Resynced to current live position.');
  }, [activeStationId, audioLoading, audioPaused, audioPlaying, playUrl, playingHadrJuz, playingSurah, qiraatQariPath, qiraatTrackFile, radioStreams, selectedHadrJuz, stopAudio, surahTemplateStationIds]);

  const readCurrentPlaybackTime = useCallback(() => {
    const webTime = webAudioRef.current?.currentTime;
    if (typeof webTime === 'number' && Number.isFinite(webTime) && webTime >= 0) {
      updatePlaybackPosition(webTime);
      return webTime;
    }

    const liveValue = soundRef.current?.currentTime;
    if (typeof liveValue === 'number' && Number.isFinite(liveValue) && liveValue >= 0) {
      updatePlaybackPosition(liveValue);
      return liveValue;
    }
    return Math.max(0, playbackPositionSecRef.current);
  }, [updatePlaybackPosition]);

  const readCurrentPlaybackDuration = useCallback(() => {
    const webDuration = webAudioRef.current?.duration;
    if (typeof webDuration === 'number' && Number.isFinite(webDuration) && webDuration > 0) {
      updatePlaybackDuration(webDuration);
      return webDuration;
    }

    const nativeDuration = (soundRef.current as { duration?: number } | null)?.duration;
    if (typeof nativeDuration === 'number' && Number.isFinite(nativeDuration) && nativeDuration > 0) {
      updatePlaybackDuration(nativeDuration);
      return nativeDuration;
    }

    return Math.max(0, playbackDurationSecRef.current);
  }, [updatePlaybackDuration]);

  const seekActiveStreamToPosition = useCallback(async (targetSec: number) => {
    seekQueueRef.current = seekQueueRef.current.then(async () => {
      if ((!soundRef.current && !webAudioRef.current) || (!audioPlaying && !audioPaused)) return;

      const player = soundRef.current;
      const webAudio = webAudioRef.current;
      const before = readCurrentPlaybackTime();
      const knownDuration = readCurrentPlaybackDuration();
      const boundedTarget = knownDuration > 0
        ? Math.max(0, Math.min(knownDuration, targetSec))
        : Math.max(0, targetSec);

      if (Math.abs(boundedTarget - before) < SEEK_EPSILON_SEC) return;

      if (webAudio) {
        webAudio.currentTime = boundedTarget;
      } else if (player) {
        await player.seekTo(boundedTarget);
      } else {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, REWIND_SEEK_SETTLE_MS));

      const afterRaw = readCurrentPlaybackTime();
      const after = knownDuration > 0
        ? Math.max(0, Math.min(knownDuration, afterRaw))
        : Math.max(0, afterRaw);
      const movedSec = Math.abs(after - before);

      if (movedSec < SEEK_EPSILON_SEC) {
        throw new Error('seek-not-effective');
      }

      updatePlaybackPosition(after);

      if (playbackStartedAtRef.current) {
        playbackStartedAtRef.current = Date.now() - after * 1000;
      }

      const deltaSec = after - before;
      const nextTimeshift = Math.max(0, Math.min(MAX_TIMESHIFT_SEC, timeshiftSecRef.current - deltaSec));
      timeshiftSecRef.current = nextTimeshift;
      setTimeshiftSec(nextTimeshift);
      setRewindNotice(null);
    }).catch(async () => {
      if (activeStationId === 'qiraat') {
        await resyncActiveStreamToLive(
          'This qiraat track does not support seek. It was resynced.',
        );
        return;
      }
      setRewindNotice('Seek is not available on this stream source. Use Resync to jump to current live.');
    }).finally(() => {
      setSeekDraftSec(null);
      setTimeshiftDraftSec(null);
    });

    await seekQueueRef.current;
  }, [activeStationId, audioPaused, audioPlaying, readCurrentPlaybackDuration, readCurrentPlaybackTime, resyncActiveStreamToLive, updatePlaybackPosition]);

  const seekActiveStreamToTimeshift = useCallback(async (targetTimeshiftSec: number) => {
    const desiredTimeshiftSec = Math.max(0, Math.min(MAX_TIMESHIFT_SEC, targetTimeshiftSec));
    const currentPositionSec = readCurrentPlaybackTime();
    const currentTimeshiftSec = Math.max(0, Math.min(MAX_TIMESHIFT_SEC, timeshiftSecRef.current));
    const targetPositionSec = currentPositionSec + (currentTimeshiftSec - desiredTimeshiftSec);
    await seekActiveStreamToPosition(targetPositionSec);
  }, [readCurrentPlaybackTime, seekActiveStreamToPosition]);

  const rewindActiveStreamByTen = useCallback(async () => {
    const current = readCurrentPlaybackTime();
    await seekActiveStreamToPosition(current - REWIND_STEP_SEC);
  }, [readCurrentPlaybackTime, seekActiveStreamToPosition]);

  const forwardActiveStreamByTen = useCallback(async () => {
    const current = readCurrentPlaybackTime();
    await seekActiveStreamToPosition(current + REWIND_STEP_SEC);
  }, [readCurrentPlaybackTime, seekActiveStreamToPosition]);

  const ensureNotificationPermission = useCallback(async () => {
    if (Platform.OS === 'web') return false;
    if (EXPO_GO_NOTIFICATIONS_FALLBACK) return true;

    const Notifications = await getNotificationsModule();
    if (!Notifications) return false;

    const current = await Notifications.getPermissionsAsync();
    let finalStatus = current.status;

    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(LIVE_NOTIFICATION_CHANNEL_ID, {
        name: 'JMN Live Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        enableVibrate: true,
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

  const openSurahPickerForStation = useCallback((stationId: string) => {
    setActiveStationId(stationId as StreamId);
    setSelectedSurahStationId(stationId);
    setSurahSearch('');
    setSurahPickerOpen(true);
  }, []);

  const renderStationCard = (station: Station, compact = false) => {
    const isActive = station.id === activeStationId;
    const isPlaying = isActive && audioPlaying;
    const isPaused = isActive && audioPaused;
    const isLoading = isActive && audioLoading;
    const isQiraat = station.id === 'qiraat';
    const isHadr = station.id === 'hadr';
    const isSurahTemplate = isSurahTemplateStation(station);
    const selectedSurahForThisStation = selectedSurahByStation[station.id] ?? 1;
    const selectedSurahCode = String(selectedSurahForThisStation).padStart(3, '0');
    const selectedSurahName = SURAH_NAMES[selectedSurahForThisStation] ?? `Surah ${selectedSurahCode}`;
    const isMasjid = station.id === 'masjid';
    const isRunning = isPlaying || isLoading || isPaused;
    const isEngaged = isRunning;
    const useStackedSurahActions = compact && isNarrowViewport;

    const statusText = isLoading
      ? 'Connecting...'
      : isPaused
      ? isHadr
        ? `Paused Juz ${playingHadrJuz ?? selectedHadrJuz}`
        : isSurahTemplate
        ? `Paused ${String(playingSurah ?? selectedSurahForThisStation).padStart(3, '0')}. ${SURAH_NAMES[playingSurah ?? selectedSurahForThisStation]}`
        : isQiraat
        ? 'Paused live Quran stream'
        : 'Paused'
      : isPlaying
      ? isHadr
        ? `Playing Juz ${playingHadrJuz ?? selectedHadrJuz}`
        : isSurahTemplate
        ? `Playing ${String(playingSurah ?? selectedSurahForThisStation).padStart(3, '0')}. ${SURAH_NAMES[playingSurah ?? selectedSurahForThisStation]}`
        : isQiraat
        ? 'Playing live Quran stream'
        : 'Now playing'
      : isHadr
      ? `Select a Juz (current: ${selectedHadrJuz})`
      : isSurahTemplate
      ? `Select Surah (current: ${selectedSurahCode}. ${SURAH_NAMES[selectedSurahForThisStation]})`
      : station.sublabel;

    const primaryLabel = isSurahTemplate
      ? isRunning
        ? 'Stop'
        : `Play ${selectedSurahName}`
      : isHadr
      ? isRunning
        ? 'Stop'
        : 'Choose Juz'
      : isRunning
      ? 'Stop'
      : 'Play';

    const onPrimaryPress = () => {
      if (isSurahTemplate) {
        if (isRunning) {
          stopAudio().catch(() => {});
          return;
        }
        playStation(station.id as StreamId).catch(() => {});
        return;
      }

      if (isHadr) {
        if (isRunning) {
          stopAudio().catch(() => {});
          return;
        }
        setActiveStationId('hadr');
        setHadrOpen(true);
        return;
      }

      if (!isRunning) {
        setActiveStationId(station.id as StreamId);
        setAudioPlaying(true);
        setAudioPaused(false);
        setAudioLoading(true);
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
          compact && { width: qariCardWidth },
          {
            backgroundColor: palette.surface,
            borderColor: isActive ? accentColor : palette.border,
            shadowColor: isActive ? accentColor : '#000000',
          },
        ]}
      >
        <View style={[styles.stationMediaWrap, compact && styles.stationMediaWrapCompact]}>
          <Image
            source={stationImageSource(station.id)}
            style={styles.stationMedia}
            contentFit={compact ? 'contain' : 'cover'}
            contentPosition={compact ? 'top' : 'center'}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.52)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.stationMediaShade}
          />
          <View style={styles.stationMediaBadge}>
            <Text style={styles.stationMediaBadgeText}>{isMasjid ? 'JMN' : station.id.toUpperCase()}</Text>
          </View>
          {(isPlaying || (isMasjid && isLive)) && <PulsingDot active={isPlaying || isLive} />}
        </View>

        <View style={[styles.stationBody, compact && styles.stationBodyCompact]}>
          <Text style={[styles.stationName, { color: palette.text }]} numberOfLines={2}>
            {station.label}
          </Text>

          <View style={styles.stationStatusRow}>
            <EqualizerBars active={isPlaying || isLoading} color={isActive ? accentColor : palette.textMuted} />
            <Text style={[styles.stationStatus, { color: isActive ? accentColor : palette.textSub }]} numberOfLines={2}>
              {statusText}
            </Text>
            {isEngaged ? (
              <View style={[styles.stationStatusPill, { backgroundColor: isLoading ? '#B48925' : isPaused ? '#6E7E96' : accentColor }]}>
                <Text style={styles.stationStatusPillText}>{isLoading ? 'Buffering' : isPaused ? 'Paused' : 'Playing'}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.stationActions}>
            <TouchableOpacity
              style={[
                styles.primaryControl,
                {
                  backgroundColor: isRunning ? '#BC2F2F' : accentColor,
                },
              ]}
              onPress={onPrimaryPress}
              activeOpacity={0.85}
              delayPressIn={0}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons
                name={isLoading ? 'hourglass-empty' : isRunning ? 'stop' : 'play-arrow'}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.primaryControlText}>{primaryLabel}</Text>
            </TouchableOpacity>

            {isSurahTemplate && !isRunning ? (
              <View style={[styles.secondaryControlRow, useStackedSurahActions && styles.secondaryControlRowStacked]}>
                <TouchableOpacity
                  style={[
                    styles.secondaryControlWide,
                    styles.secondaryControlHalf,
                    useStackedSurahActions && styles.secondaryControlStacked,
                    { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
                  ]}
                  onPress={() => {
                    openSurahPickerForStation(station.id);
                  }}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="search" size={16} color={palette.textSub} />
                  <Text style={[styles.secondaryControlWideText, { color: palette.textSub }]}>Select Surah</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryControlWide,
                    styles.secondaryControlHalf,
                    useStackedSurahActions && styles.secondaryControlStacked,
                    { borderColor: palette.border, backgroundColor: palette.surfaceAlt },
                  ]}
                  onPress={() => {
                    playRandomSurahForStation(station.id).catch(() => {});
                  }}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="shuffle" size={16} color={palette.textSub} />
                  <Text style={[styles.secondaryControlWideText, { color: palette.textSub }]}>Random Surah</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {isHadr && !isRunning ? (
              <TouchableOpacity
                style={[styles.secondaryControl, { borderColor: palette.border, backgroundColor: palette.surfaceAlt }]}
                onPress={() => {
                  setActiveStationId('hadr');
                  setHadrOpen(true);
                }}
                activeOpacity={0.85}
              >
                <MaterialIcons name="queue-music" size={16} color={palette.textSub} />
              </TouchableOpacity>
            ) : null}
          </View>

          {isHadr || isSurahTemplate ? (
            <View
              style={[
                styles.autoNextRow,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.surfaceAlt,
                },
              ]}
            >
              <MaterialIcons name="autorenew" size={14} color={accentColor} />
              <Text style={[styles.autoNextText, { color: palette.textSub }]}>
                {isHadr ? 'Auto-next enabled across Quran' : 'Auto-next enabled across Surahs'}
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
    return (
      <View style={styles.stationStack}>
        {masjidStation ? renderStationCard(masjidStation) : null}

        {qariStations.length ? (
          <View style={[styles.stationGroupCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={styles.stationGroupHeader}>
              <Text style={[styles.stationGroupTitle, { color: palette.text }]}>Qari Channels</Text>
              <Text style={[styles.stationGroupMeta, { color: palette.textSub }]}>{qariStations.length} channels</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.qariRailContent,
                isNarrowViewport && styles.qariRailContentNarrow,
                layoutMode === 'mosaic' && styles.qariRailContentTight,
              ]}
            >
              {qariStations.map((station) => renderStationCard(station, true))}
            </ScrollView>
          </View>
        ) : null}

        {otherStations.length ? (
          <View style={styles.otherStreamsWrap}>
            <Text style={[styles.otherStreamsTitle, { color: palette.text }]}>Other Streams</Text>
            <View style={styles.otherStreamsStack}>
              {otherStations.map((station) => renderStationCard(station))}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const activeStation = radioStreams.find((station) => station.id === activeStationId);
  const activeStationIsSurahTemplate = activeStation ? isSurahTemplateStation(activeStation) : false;
  const activeStationIsHadr = activeStation?.id === 'hadr';
  const activeStationIsRunning = audioPlaying || audioPaused || audioLoading;
  const activeSurahForControls = activeStation && activeStationIsSurahTemplate
    ? selectedSurahByStation[activeStation.id] ?? 1
    : 1;
  const activeSurahCode = String(activeSurahForControls).padStart(3, '0');
  const activeSurahName = SURAH_NAMES[activeSurahForControls] ?? `Surah ${activeSurahCode}`;
  const controlsStatusText = audioLoading
    ? 'Connecting...'
    : audioPaused
    ? 'Paused'
    : audioPlaying
    ? 'Playing'
    : 'Ready';
  const activeStationMetaText = activeStationIsSurahTemplate
    ? `Surah: ${activeSurahName}`
    : activeStationIsHadr
    ? `Juz ${playingHadrJuz ?? selectedHadrJuz}`
    : activeStation?.sublabel ?? 'No station selected';

  const controlsCanSeek = Boolean(soundRef.current || webAudioRef.current) && (audioPlaying || audioPaused);
  const controlsDurationSeekEnabled = controlsCanSeek && playbackDurationSec > 0;
  const controlsTimeshiftSeekEnabled = controlsCanSeek && !controlsDurationSeekEnabled;
  const controlsCurrentSec = controlsDurationSeekEnabled
    ? Math.max(0, Math.min(playbackDurationSec, playbackPositionSec))
    : Math.max(0, playbackPositionSec);
  const controlsSeekDisplaySec = typeof seekDraftSec === 'number'
    ? Math.max(
      0,
      Math.min(controlsDurationSeekEnabled ? playbackDurationSec : controlsCurrentSec + REWIND_STEP_SEC, seekDraftSec),
    )
    : controlsCurrentSec;
  const controlsTimeshiftDisplaySec = typeof timeshiftDraftSec === 'number'
    ? Math.max(0, Math.min(MAX_TIMESHIFT_SEC, timeshiftDraftSec))
    : Math.max(0, Math.min(MAX_TIMESHIFT_SEC, timeshiftSec));
  const simpleBottomPlayer = true;
  const bottomPlayerVisualExpanded = simpleBottomPlayer ? false : bottomPlayerExpanded;
  const bottomPlayerBg = bottomPlayerVisualExpanded ? '#070A10' : (nightMode ? '#112B20' : '#EAF7EF');
  const bottomPlayerBorder = bottomPlayerVisualExpanded
    ? 'rgba(255,255,255,0.14)'
    : (nightMode ? 'rgba(133, 213, 172, 0.34)' : '#B8DFC8');
  const bottomPlayerSubText = bottomPlayerVisualExpanded ? '#9CA6B8' : (nightMode ? '#A4CDB8' : '#4A6B5D');
  const bottomPlayerIcon = bottomPlayerVisualExpanded ? '#D0D7E4' : (nightMode ? '#9BE7C0' : '#0E7F53');
  const bottomPlayerMainActionBg = bottomPlayerVisualExpanded ? accentColor : (nightMode ? '#1F8358' : '#14955E');
  const bottomPlayerStreamName = activeStation?.label ?? 'Station';
  const bottomPlayerNowPlayingDetail = activeStationIsSurahTemplate
    ? `${controlsStatusText}: ${activeSurahName}`
    : activeStationIsHadr
    ? `${controlsStatusText}: Juz ${playingHadrJuz ?? selectedHadrJuz}`
    : controlsStatusText;
  const bottomPlayerRightTimeLabel = controlsDurationSeekEnabled
    ? formatPlaybackClock(playbackDurationSec)
    : `${Math.round(controlsTimeshiftDisplaySec)}s`;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: palette.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 12 },
        ]}
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
          </View>
        </Animated.View>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Listen Now</Text>
          <View style={[styles.sectionNowPill, { backgroundColor: palette.surfaceAlt, borderColor: palette.border }]}> 
            <MaterialIcons
              name={audioLoading ? 'hourglass-empty' : audioPlaying ? 'graphic-eq' : audioPaused ? 'pause-circle-outline' : 'radio'}
              size={13}
              color={audioPlaying || audioPaused ? accentColor : palette.textMuted}
            />
            <Text style={[styles.sectionNowPillText, { color: audioPlaying || audioPaused ? accentColor : palette.textMuted }]} numberOfLines={1}>
              {audioLoading
                ? `Connecting: ${activeStation?.label ?? 'Station'}`
                : audioPlaying
                ? `Now: ${activeStation?.label ?? 'Station'}`
                : audioPaused
                ? `Paused: ${activeStation?.label ?? 'Station'}`
                : 'Ready'}
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

      {!surahPickerOpen && !hadrOpen && activeStation && activeStationIsRunning ? (
        <Animated.View
          style={[
            styles.bottomPlayerShell,
            {
              backgroundColor: bottomPlayerBg,
              borderColor: bottomPlayerBorder,
              height: bottomPlayerCollapsedHeight,
            },
          ]}
        >
          {simpleBottomPlayer || !bottomPlayerExpanded ? (
            <View
              style={[
                styles.bottomPlayerCollapsedRow,
                { paddingBottom: bottomPlayerSafeInset },
              ]}
            >
              {/* Track info */}
              <View style={styles.bpTrackRow}>
                <View style={styles.bpTrackInfoWrap}>
                  <Text style={[styles.bpTrackTitle, { color: bottomPlayerIcon }]} numberOfLines={1}>
                    {bottomPlayerStreamName}
                  </Text>
                  <Text style={[styles.bpTrackMeta, { color: bottomPlayerSubText }]} numberOfLines={1}>
                    {bottomPlayerNowPlayingDetail}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.bpProgressRow}>
                <Text style={[styles.bpTimeText, { color: bottomPlayerSubText }]}>
                  {formatPlaybackClock(controlsSeekDisplaySec)}
                </Text>
                <View style={styles.bpSliderWrap}>
                  {controlsDurationSeekEnabled ? (
                    <Slider
                      style={styles.bpSlider}
                      minimumValue={0}
                      maximumValue={playbackDurationSec}
                      value={controlsSeekDisplaySec}
                      minimumTrackTintColor={bottomPlayerMainActionBg}
                      maximumTrackTintColor="rgba(21,67,51,0.2)"
                      thumbTintColor={bottomPlayerMainActionBg}
                      onSlidingStart={() => { setSeekDraftSec(controlsCurrentSec); }}
                      onValueChange={(value) => { setSeekDraftSec(value); }}
                      onSlidingComplete={(value) => {
                        setSeekDraftSec(value);
                        seekActiveStreamToPosition(value).catch(() => {});
                      }}
                    />
                  ) : controlsTimeshiftSeekEnabled ? (
                    <Slider
                      style={styles.bpSlider}
                      minimumValue={0}
                      maximumValue={MAX_TIMESHIFT_SEC}
                      value={controlsTimeshiftDisplaySec}
                      minimumTrackTintColor={bottomPlayerMainActionBg}
                      maximumTrackTintColor="rgba(21,67,51,0.2)"
                      thumbTintColor={bottomPlayerMainActionBg}
                      onSlidingStart={() => { setTimeshiftDraftSec(timeshiftSec); }}
                      onValueChange={(value) => { setTimeshiftDraftSec(value); }}
                      onSlidingComplete={(value) => {
                        setTimeshiftDraftSec(value);
                        seekActiveStreamToTimeshift(value).catch(() => {});
                      }}
                    />
                  ) : (
                    <View style={styles.bpSliderFallback} />
                  )}
                </View>
                <Text style={[styles.bpTimeText, { color: bottomPlayerSubText }]}>
                  {bottomPlayerRightTimeLabel}
                </Text>
              </View>

              {/* Playback controls */}
              <View style={styles.bpControlsRow}>
                {activeStationIsRunning ? (
                  <TouchableOpacity
                    style={[styles.bpSecondaryBtn, styles.bpStopBtn]}
                    onPress={() => stopAudio().catch(() => {})}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="stop" size={18} color="#BC2F2F" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.bpSecondaryBtn} />
                )}

                <TouchableOpacity
                  style={[styles.bpSecondaryBtn, !controlsCanSeek && styles.bottomPlayerCollapsedStepBtnDisabled]}
                  onPress={() => rewindActiveStreamByTen().catch(() => {})}
                  disabled={!controlsCanSeek}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="replay-10" size={20} color={bottomPlayerIcon} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bpSecondaryBtn}
                  onPress={() => playPreviousFromPlayer().catch(() => {})}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="skip-previous" size={22} color={bottomPlayerIcon} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bottomPlayerCollapsedMainBtn, { backgroundColor: bottomPlayerMainActionBg }]}
                  onPress={() => {
                    if (activeStationIsRunning) {
                      if (audioLoading) {
                        stopAudio().catch(() => {});
                        return;
                      }
                      (audioPaused ? resumeActiveAudio() : pauseActiveAudio()).catch(() => {});
                      return;
                    }

                    if (activeStationIsHadr) {
                      setActiveStationId('hadr');
                      setHadrOpen(true);
                      return;
                    }

                    playStation(activeStation.id as StreamId).catch(() => {});
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name={audioLoading ? 'hourglass-empty' : activeStationIsRunning ? (audioPaused ? 'play-arrow' : 'pause') : 'play-arrow'}
                    size={26}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bpSecondaryBtn}
                  onPress={() => playNextFromPlayer().catch(() => {})}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="skip-next" size={22} color={bottomPlayerIcon} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bpSecondaryBtn, !controlsCanSeek && styles.bottomPlayerCollapsedStepBtnDisabled]}
                  onPress={() => forwardActiveStreamByTen().catch(() => {})}
                  disabled={!controlsCanSeek}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="forward-10" size={20} color={bottomPlayerIcon} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.bpSecondaryBtn,
                    repeatEnabled && { backgroundColor: `${bottomPlayerMainActionBg}22`, borderColor: bottomPlayerMainActionBg },
                  ]}
                  onPress={() => setRepeatEnabled((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="repeat" size={20} color={repeatEnabled ? bottomPlayerMainActionBg : bottomPlayerIcon} />
                </TouchableOpacity>
              </View>

            </View>
          ) : (
            <View style={[styles.bottomPlayerExpandedPanel, { paddingBottom: bottomPlayerSafeInset + 12 }]}>
              <View style={styles.bottomPlayerExpandedHeader} {...bottomPlayerPanResponder.panHandlers}>
                <View style={styles.bottomPlayerExpandedTitleWrap}>
                  <Text style={styles.bottomPlayerExpandedTitle} numberOfLines={1}>
                    {activeStationIsSurahTemplate ? activeSurahName : activeStation.label}
                  </Text>
                  <Text style={styles.bottomPlayerExpandedMeta} numberOfLines={1}>
                    {`${activeStation.label} • ${activeStationMetaText}`}
                  </Text>
                </View>

                <View style={styles.bottomPlayerExpandedHeaderActions}>
                  <TouchableOpacity
                    style={styles.bottomPlayerExpandedHeaderBtn}
                    onPress={() => animateBottomPlayer(false)}
                  >
                    <MaterialIcons name="keyboard-arrow-down" size={22} color="#AEB5C2" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bottomPlayerExpandedHeaderBtn}
                    onPress={() => {
                      stopAudio().catch(() => {});
                      animateBottomPlayer(false);
                    }}
                  >
                    <MaterialIcons name="close" size={21} color="#AEB5C2" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.bottomPlayerExpandedSeekBlock}>
                {controlsDurationSeekEnabled ? (
                  <Slider
                    style={styles.bottomPlayerExpandedSeekSlider}
                    minimumValue={0}
                    maximumValue={playbackDurationSec}
                    value={controlsSeekDisplaySec}
                    minimumTrackTintColor={accentColor}
                    maximumTrackTintColor="rgba(255,255,255,0.12)"
                    thumbTintColor={accentColor}
                    onSlidingStart={() => {
                      setSeekDraftSec(controlsCurrentSec);
                    }}
                    onValueChange={(value) => {
                      setSeekDraftSec(value);
                    }}
                    onSlidingComplete={(value) => {
                      setSeekDraftSec(value);
                      seekActiveStreamToPosition(value).catch(() => {});
                    }}
                  />
                ) : controlsTimeshiftSeekEnabled ? (
                  <Slider
                    style={styles.bottomPlayerExpandedSeekSlider}
                    minimumValue={0}
                    maximumValue={MAX_TIMESHIFT_SEC}
                    value={controlsTimeshiftDisplaySec}
                    minimumTrackTintColor={accentColor}
                    maximumTrackTintColor="rgba(255,255,255,0.12)"
                    thumbTintColor={accentColor}
                    onSlidingStart={() => {
                      setTimeshiftDraftSec(timeshiftSec);
                    }}
                    onValueChange={(value) => {
                      setTimeshiftDraftSec(value);
                    }}
                    onSlidingComplete={(value) => {
                      setTimeshiftDraftSec(value);
                      seekActiveStreamToTimeshift(value).catch(() => {});
                    }}
                  />
                ) : (
                  <View style={styles.bottomPlayerExpandedSeekFallback} />
                )}

                <View style={styles.bottomPlayerExpandedTimeRow}>
                  <Text style={styles.bottomPlayerExpandedTimeText}>{formatPlaybackClock(controlsSeekDisplaySec)}</Text>
                  <Text style={styles.bottomPlayerExpandedTimeText}>{bottomPlayerRightTimeLabel}</Text>
                </View>
              </View>

              <View style={styles.bottomPlayerMainControlsRow}>
                <TouchableOpacity
                  style={styles.bottomPlayerCircleAction}
                  onPress={() => playPreviousFromPlayer().catch(() => {})}
                >
                  <MaterialIcons name="skip-previous" size={24} color="#AEB5C2" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bottomPlayerCircleAction, !controlsCanSeek && styles.bottomPlayerCircleActionDisabled]}
                  onPress={() => rewindActiveStreamByTen().catch(() => {})}
                  disabled={!controlsCanSeek}
                >
                  <MaterialIcons name="replay-10" size={24} color="#AEB5C2" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bottomPlayerMainPlayBtn, { backgroundColor: accentColor }]}
                  onPress={() => {
                    if (activeStationIsRunning) {
                      if (audioLoading) {
                        stopAudio().catch(() => {});
                        return;
                      }
                      (audioPaused ? resumeActiveAudio() : pauseActiveAudio()).catch(() => {});
                      return;
                    }

                    if (activeStationIsHadr) {
                      setActiveStationId('hadr');
                      setHadrOpen(true);
                      return;
                    }

                    playStation(activeStation.id as StreamId).catch(() => {});
                  }}
                >
                  <MaterialIcons
                    name={audioLoading ? 'hourglass-empty' : activeStationIsRunning ? (audioPaused ? 'play-arrow' : 'pause') : 'play-arrow'}
                    size={36}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bottomPlayerCircleAction, !controlsCanSeek && styles.bottomPlayerCircleActionDisabled]}
                  onPress={() => forwardActiveStreamByTen().catch(() => {})}
                  disabled={!controlsCanSeek}
                >
                  <MaterialIcons name="forward-10" size={24} color="#AEB5C2" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bottomPlayerCircleAction}
                  onPress={() => playNextFromPlayer().catch(() => {})}
                >
                  <MaterialIcons name="skip-next" size={24} color="#AEB5C2" />
                </TouchableOpacity>
              </View>

              <View style={styles.bottomPlayerUtilityRow}>
                <TouchableOpacity
                  style={[
                    styles.bottomPlayerUtilityBtn,
                    repeatEnabled && { borderColor: accentColor, backgroundColor: 'rgba(107, 199, 150, 0.14)' },
                  ]}
                  onPress={() => setRepeatEnabled((prev) => !prev)}
                >
                  <MaterialIcons name="repeat" size={18} color={repeatEnabled ? accentColor : '#AEB5C2'} />
                  <Text style={[styles.bottomPlayerUtilityText, repeatEnabled && { color: accentColor }]}>Repeat</Text>
                </TouchableOpacity>

                {controlsCanSeek ? (
                  <TouchableOpacity style={styles.bottomPlayerUtilityBtn} onPress={() => resyncActiveStreamToLive().catch(() => {})}>
                    <MaterialIcons name="sync" size={18} color="#AEB5C2" />
                    <Text style={styles.bottomPlayerUtilityText}>Resync</Text>
                  </TouchableOpacity>
                ) : null}

                {activeStationIsSurahTemplate ? (
                  <TouchableOpacity style={styles.bottomPlayerUtilityBtn} onPress={() => openSurahPickerForStation(activeStation.id)}>
                    <MaterialIcons name="search" size={18} color="#AEB5C2" />
                    <Text style={styles.bottomPlayerUtilityText}>Surah List</Text>
                  </TouchableOpacity>
                ) : null}

                {activeStationIsHadr ? (
                  <TouchableOpacity
                    style={styles.bottomPlayerUtilityBtn}
                    onPress={() => {
                      setActiveStationId('hadr');
                      setHadrOpen(true);
                    }}
                  >
                    <MaterialIcons name="queue-music" size={18} color="#AEB5C2" />
                    <Text style={styles.bottomPlayerUtilityText}>Juz List</Text>
                  </TouchableOpacity>
                ) : null}

                {activeStationIsRunning ? (
                  <TouchableOpacity style={styles.bottomPlayerUtilityBtn} onPress={() => stopAudio().catch(() => {})}>
                    <MaterialIcons name="stop" size={18} color="#AEB5C2" />
                    <Text style={styles.bottomPlayerUtilityText}>Stop</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}
        </Animated.View>
      ) : null}

      <Modal visible={surahPickerOpen} transparent animationType="slide" onRequestClose={() => setSurahPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSurahPickerOpen(false)}>
          <View />
        </Pressable>
        <View style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: palette.text }]} numberOfLines={2}>
              {selectedSurahStation?.label ?? 'Choose Surah'}
            </Text>
            <TouchableOpacity onPress={() => setSurahPickerOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sheetSub, { color: palette.textSub }]}>Search by surah number or name, then tap to play.</Text>

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
                if (!selectedSurahStationId) return;
                playSurahTrack(selectedSurahStationId, selectedSurahForStation).catch(() => {});
                setSurahPickerOpen(false);
              }}
              disabled={!selectedSurahStationId}
            >
              <MaterialIcons name="play-arrow" size={16} color="#FFFFFF" />
              <Text style={styles.sheetActionText}>Play Surah {selectedSurahForStation}</Text>
            </TouchableOpacity>

            {selectedSurahStationId === activeStationId && !audioLoading && (audioPlaying || audioPaused) ? (
              <TouchableOpacity
                style={[styles.sheetActionBtn, { backgroundColor: '#5B6B82' }]}
                onPress={() => (audioPaused ? resumeActiveAudio() : pauseActiveAudio()).catch(() => {})}
              >
                <MaterialIcons name={audioPaused ? 'play-arrow' : 'pause'} size={16} color="#FFFFFF" />
                <Text style={styles.sheetActionText}>{audioPaused ? 'Resume' : 'Pause'}</Text>
              </TouchableOpacity>
            ) : null}

            {selectedSurahStationId === activeStationId && (audioPlaying || audioLoading || audioPaused) ? (
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
            {filteredSurahs.map((surah) => {
              const isSelected = selectedSurahForStation === surah.num;
              const isCurrent = selectedSurahStationId === activeStationId && playingSurah === surah.num;

              return (
                <TouchableOpacity
                  key={surah.num}
                  style={[
                    styles.surahRow,
                    {
                      borderBottomColor: palette.border,
                      backgroundColor: isSelected ? palette.surfaceAlt : palette.surface,
                    },
                  ]}
                  onPress={() => {
                    if (!selectedSurahStationId) return;
                    setSelectedSurahByStation((prev) => ({ ...prev, [selectedSurahStationId]: surah.num }));
                    playSurahTrack(selectedSurahStationId, surah.num).catch(() => {});
                    setSurahPickerOpen(false);
                  }}
                  activeOpacity={0.82}
                >
                  <View style={[styles.surahNum, { backgroundColor: `${accentColor}24` }]}>
                    <Text style={[styles.surahNumText, { color: accentColor }]}>{surah.num}</Text>
                  </View>
                  <View style={styles.sheetRowTextWrap}>
                    <Text style={[styles.surahName, { color: palette.text }]}>{surah.name}</Text>
                    <Text style={[styles.sheetRowMeta, { color: palette.textSub }]}>{`${String(surah.num).padStart(3, '0')}.mp3`}</Text>
                  </View>
                  <MaterialIcons name={isCurrent ? 'graphic-eq' : 'play-circle-outline'} size={20} color={accentColor} />
                </TouchableOpacity>
              );
            })}
            {!filteredSurahs.length ? (
              <View style={styles.emptyRow}>
                <Text style={[styles.emptyText, { color: palette.textMuted }]}>No surahs found</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={hadrOpen} transparent animationType="slide" onRequestClose={() => setHadrOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setHadrOpen(false)}>
          <View />
        </Pressable>
        <View style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: palette.text }]}>Full Quran Hadr</Text>
            <TouchableOpacity onPress={() => setHadrOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sheetSub, { color: palette.textSub }]}>
            Tap any Juz row to play instantly. Auto-next is always on.
          </Text>

          {downloadAllProgress ? (
            <Text style={[styles.sheetSub, { color: palette.textSub, marginTop: 4 }]}>
              Downloading full pack: {downloadAllProgress.done}/{downloadAllProgress.total}
            </Text>
          ) : null}

          <View style={styles.hadrPrimaryActionRow}>
            <TouchableOpacity
              style={[styles.hadrPrimaryActionBtn, { backgroundColor: accentColor }]}
              onPress={() => playHadrJuz(selectedHadrJuz, { closeSheet: true }).catch(() => {})}
              activeOpacity={0.85}
            >
              <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
              <Text style={styles.hadrPrimaryActionText}>Play Juz {selectedHadrJuz}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hadrSecondaryActionGrid}>
            <TouchableOpacity
              style={[styles.hadrSecondaryActionBtn, { backgroundColor: '#2F6DB6' }]}
              onPress={() => playRandomHadrJuz({ closeSheet: true }).catch(() => {})}
              activeOpacity={0.85}
            >
              <MaterialIcons name="shuffle" size={18} color="#FFFFFF" />
              <Text style={styles.hadrSecondaryActionText}>Random Juz</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.hadrSecondaryActionBtn,
                { backgroundColor: '#0F8C74' },
                downloadingAllHadr && { opacity: 0.7 },
              ]}
              onPress={() => {
                void downloadAllHadrJuz();
              }}
              disabled={downloadingAllHadr}
              activeOpacity={0.85}
            >
              <MaterialIcons name={downloadingAllHadr ? 'hourglass-empty' : 'download'} size={18} color="#FFFFFF" />
              <Text style={styles.hadrSecondaryActionText}>{downloadingAllHadr ? 'Downloading...' : 'Download all'}</Text>
            </TouchableOpacity>

            {activeStationId === 'hadr' && !audioLoading && (audioPlaying || audioPaused) ? (
              <TouchableOpacity
                style={[styles.hadrSecondaryActionBtn, { backgroundColor: '#5B6B82' }]}
                onPress={() => (audioPaused ? resumeActiveAudio() : pauseActiveAudio()).catch(() => {})}
                activeOpacity={0.85}
              >
                <MaterialIcons name={audioPaused ? 'play-arrow' : 'pause'} size={18} color="#FFFFFF" />
                <Text style={styles.hadrSecondaryActionText}>{audioPaused ? 'Resume' : 'Pause'}</Text>
              </TouchableOpacity>
            ) : null}

            {activeStationId === 'hadr' && (audioPlaying || audioLoading || audioPaused) ? (
              <TouchableOpacity
                style={[styles.hadrSecondaryActionBtn, { backgroundColor: '#BC2F2F' }]}
                onPress={() => stopAudio().catch(() => {})}
                activeOpacity={0.85}
              >
                <MaterialIcons name="stop" size={18} color="#FFFFFF" />
                <Text style={styles.hadrSecondaryActionText}>Stop</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView showsVerticalScrollIndicator style={styles.surahList} keyboardShouldPersistTaps="handled">
            {Array.from({ length: 30 }, (_, index) => index + 1).map((juz) => {
              const startSurah = JUZ_START_SURAH[juz] ?? 1;
              const isSelected = selectedHadrJuz === juz;
              const isCurrent = activeStationId === 'hadr' && playingHadrJuz === juz;
              const isAvailable = Boolean(HADR_JUZ_TRACKS[juz]);
              const isCached = !!cachedHadrJuzSet[juz];
              const isDownloading = !!downloadingHadrJuzSet[juz] || downloadingAllHadr;

              return (
                <TouchableOpacity
                  key={juz}
                  style={[
                    styles.surahRow,
                    {
                      borderBottomColor: palette.border,
                      backgroundColor: isSelected ? palette.surfaceAlt : palette.surface,
                      opacity: isAvailable ? 1 : 0.45,
                    },
                  ]}
                  onPress={() => {
                    setSelectedHadrJuz(juz);
                    playHadrJuz(juz, { closeSheet: true }).catch(() => {});
                  }}
                  disabled={!isAvailable}
                  activeOpacity={0.82}
                >
                  <View style={[styles.surahNum, { backgroundColor: `${accentColor}24` }]}>
                    <Text style={[styles.surahNumText, { color: accentColor }]}>{juz}</Text>
                  </View>
                  <View style={styles.sheetRowTextWrap}>
                    <Text style={[styles.surahName, { color: palette.text }]}>Juz {juz}</Text>
                    <Text style={[styles.sheetRowMeta, { color: palette.textSub }]}>
                      {isAvailable
                        ? isCached
                          ? `Downloaded • Starts at ${SURAH_NAMES[startSurah]}`
                          : `Starts at ${SURAH_NAMES[startSurah]}`
                        : 'File missing'}
                    </Text>
                  </View>
                  {isAvailable ? (
                    <TouchableOpacity
                      onPress={(event) => {
                        event.stopPropagation();
                        void downloadSingleHadrJuz(juz);
                      }}
                      disabled={isCached || isDownloading}
                      style={styles.hadrRowActionBtn}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons
                        name={isCached ? 'check-circle' : isDownloading ? 'hourglass-empty' : 'download'}
                        size={18}
                        color={isCached ? '#20A368' : accentColor}
                      />
                    </TouchableOpacity>
                  ) : null}
                  <MaterialIcons name={isCurrent ? 'graphic-eq' : 'play-circle-outline'} size={20} color={accentColor} />
                </TouchableOpacity>
              );
            })}
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
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 0,
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
    paddingVertical: 6,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inlineTabText: {
    fontSize: 12,
    fontWeight: '700',
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
  stationGroupCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    gap: 8,
  },
  stationGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  stationGroupTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  stationGroupMeta: {
    fontSize: 11,
    fontWeight: '700',
  },
  qariRailContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  qariRailContentNarrow: {
    paddingHorizontal: 10,
    gap: 8,
  },
  qariRailContentTight: {
    gap: 8,
  },
  otherStreamsWrap: {
    gap: 8,
  },
  otherStreamsTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  otherStreamsStack: {
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
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
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
  stationMediaWrapCompact: {
    height: 138,
    backgroundColor: 'rgba(0,0,0,0.06)',
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
  stationBodyCompact: {
    padding: 12,
    gap: 8,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  stationStatus: {
    flex: 1,
    fontSize: 13,
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
  secondaryControlRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  secondaryControlRowStacked: {
    flexDirection: 'column',
    gap: 7,
  },
  bottomPlayerShell: {
    borderTopWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 16,
    elevation: 16,
    zIndex: 24,
  },
  bottomPlayerCollapsedRow: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 4,
  },
  bottomPlayerCollapsedControlsWrap: {
    flex: 1,
    gap: 7,
  },
  bottomPlayerCollapsedTransportStack: {
    marginTop: 1,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 9,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  bottomPlayerCollapsedPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 48,
  },
  bottomPlayerCollapsedSecondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 36,
    paddingTop: 2,
  },
  bottomPlayerCollapsedStepBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.14)',
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  bottomPlayerCollapsedStepBtnCompact: {
    width: 38,
    height: 38,
  },
  bottomPlayerCollapsedSecondaryBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  bottomPlayerCollapsedStepBtnDisabled: {
    opacity: 0.34,
  },
  bottomPlayerCollapsedStopBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(188,47,47,0.34)',
    backgroundColor: 'rgba(188,47,47,0.12)',
  },
  bottomPlayerCollapsedStopBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BC2F2F',
  },
  bottomPlayerCollapsedMainBtn: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  bottomPlayerCollapsedMainBtnCompact: {
    width: 50,
    height: 50,
  },
  bpTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  bpTrackInfoWrap: {
    flex: 1,
    gap: 2,
  },
  bpTrackTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  bpTrackMeta: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 15,
  },
  bpProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 4,
  },
  bpSliderWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  bpSlider: {
    height: 40,
  },
  bpSliderFallback: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(21,67,51,0.2)',
    marginVertical: 18,
  },
  bpTimeText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    minWidth: 30,
    textAlign: 'center',
  },
  bpControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  bpSecondaryBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  bpStopBtn: {
    borderColor: 'rgba(188,47,47,0.34)',
    backgroundColor: 'rgba(188,47,47,0.1)',
  },
  bottomPlayerCollapsedNowPlayingText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
  },
  bottomPlayerCollapsedStreamNameText: {
    marginTop: 0,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  bottomPlayerCollapsedTimeWrap: {
    minWidth: 72,
    maxWidth: 112,
  },
  bottomPlayerCollapsedTimeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bottomPlayerCollapsedSeekWrap: {
    justifyContent: 'center',
  },
  bottomPlayerCollapsedSeekSlider: {
    height: 42,
    marginHorizontal: 0,
  },
  bottomPlayerCollapsedSeekFallback: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(21,67,51,0.24)',
  },
  bottomPlayerCollapsedSeekCard: {
    marginTop: 0,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  bottomPlayerCollapsedSeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  bottomPlayerCollapsedSeekLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  bottomPlayerCollapsedSeekLabelValue: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  bottomPlayerCollapsedSeekTimelineText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  bottomPlayerCollapsedIconBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPlayerExpandedPanel: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },
  bottomPlayerExpandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomPlayerExpandedTitleWrap: {
    flex: 1,
    gap: 3,
  },
  bottomPlayerExpandedTitle: {
    color: '#EDEFF4',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  bottomPlayerExpandedMeta: {
    color: '#98A1B1',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomPlayerExpandedHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomPlayerExpandedHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bottomPlayerExpandedSeekBlock: {
    gap: 6,
  },
  bottomPlayerExpandedSeekSlider: {
    height: 34,
    marginHorizontal: -6,
  },
  bottomPlayerExpandedSeekFallback: {
    height: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  bottomPlayerExpandedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomPlayerExpandedTimeText: {
    color: '#8E97A8',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomPlayerMainControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  bottomPlayerCircleAction: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bottomPlayerCircleActionDisabled: {
    opacity: 0.35,
  },
  bottomPlayerMainPlayBtn: {
    width: 86,
    height: 86,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },
  bottomPlayerUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  bottomPlayerUtilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bottomPlayerUtilityText: {
    color: '#AEB5C2',
    fontSize: 12,
    fontWeight: '800',
  },
  autoNextRow: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  autoNextText: {
    fontSize: 11,
    fontWeight: '700',
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
  seekSlider: {
    height: 36,
    marginHorizontal: -4,
    marginVertical: 0,
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
  secondaryControlWide: {
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    minHeight: 40,
  },
  secondaryControlHalf: {
    flex: 1,
  },
  secondaryControlStacked: {
    width: '100%',
  },
  secondaryControlWideText: {
    fontSize: 12,
    fontWeight: '700',
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
  controlsStatusPill: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  controlsStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  controlsActionWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlsActionWrapCompact: {
    gap: 6,
  },
  controlsActionBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
  },
  controlsActionBtnCompact: {
    flexBasis: '48.5%',
    flexGrow: 1,
    paddingHorizontal: 10,
  },
  controlsActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  controlsActionTextCompact: {
    fontSize: 11,
  },
  controlsSeekCard: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  controlsSeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  controlsSeekTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  controlsSeekValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  controlsSeekHint: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
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
  hadrPrimaryActionRow: {
    marginTop: 10,
  },
  hadrPrimaryActionBtn: {
    borderRadius: Radius.md,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  hadrPrimaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  hadrSecondaryActionGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hadrSecondaryActionBtn: {
    borderRadius: Radius.md,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexBasis: '48%',
    flexGrow: 1,
  },
  hadrSecondaryActionText: {
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
  sheetRowTextWrap: {
    flex: 1,
    gap: 2,
  },
  sheetRowMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  hadrRowActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
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
