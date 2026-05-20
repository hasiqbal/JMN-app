import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, StyleSheet, Animated, AppState } from 'react-native';
import { useRef, useEffect, useCallback, useState } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useJmnLiveStatus } from '@/hooks/useJmnLiveStatus';
import { playIqamah, playPrayerStartAdhaan, stopPrayerStartAdhaan } from '@/hooks/usePrayerAdhaanPlayer';
import { getPrayerTimesForDate } from '@/services/prayerService';
import {
  ADHAAN_SELECTION_STORAGE_KEY,
  ADHKAR_NOTIFICATION_CHANNEL_ID,
  ADHKAR_NOTIFICATION_SCOPE,
  ADHKAR_NOTIFICATION_SILENT_CHANNEL_ID,
  ADHKAR_REMINDER_SOUND_MODE_STORAGE_KEY,
  ADHKAR_REMINDERS_ENABLED_STORAGE_KEY,
  BACKGROUND_PRAYER_NOTIFICATION_MODE_STORAGE_KEY,
  DEFAULT_ADHAAN_OPTION_ID,
  DEFAULT_ADHKAR_REMINDER_SOUND_MODE,
  DEFAULT_ADHKAR_REMINDERS_ENABLED,
  DEFAULT_BACKGROUND_PRAYER_NOTIFICATION_MODE,
  DEFAULT_IQAMAH_EXACT_SOUND_ENABLED,
  DEFAULT_PRAYER_AUDIO_MUTED,
  getAdhaanOptionById,
  getPrayerStartChannelId,
  IQAMAH_EXACT_SOUND_ENABLED_STORAGE_KEY,
  IQAMAH_NOTIFICATION_CHANNEL_ID,
  IQAMAH_NOTIFICATION_SILENT_CHANNEL_ID,
  IQAMAH_SOUND_FILE,
  PRAYER_NOTIFICATION_CHANNEL_ID,
  PRAYER_NOTIFICATION_SILENT_CHANNEL_ID,
  PRAYER_AUDIO_MUTE_ACTION_ID,
  PRAYER_AUDIO_MUTED_STORAGE_KEY,
  PRAYER_AUDIO_NOTIFICATION_CATEGORY_ID,
  PRAYER_NOTIFICATION_SCOPE,
  type AdhkarReminderSoundMode,
} from '@/constants/prayerNotifications';
import {
  buildAdhkarNotificationsForPrayers,
} from '@/services/adhkarNotificationPlanner';
import {
  buildPrayerNotificationsForPrayers,
} from '@/services/prayerNotificationPlanner';
import { routeFromPushNotificationData } from '@/services/pushNotificationRouting';
import { subscribePrayerNotificationRefresh } from '@/services/prayerNotificationRefreshBus';
import { syncPushTokenWithBackend, YOUTUBE_LIVE_NOTIFY_KEY } from '@/services/pushRegistrationService';
import { subscribeTabBarHidden } from '@/services/tabBarVisibility';
import {
  deleteLegacyPrayerNotificationChannels,
  ensureAndroidAdhkarNotificationChannels,
  ensureAndroidLiveNotificationChannel,
  ensureAndroidPrayerNotificationChannel,
  type ExpoNotificationsModule,
  getNotificationsModule,
} from '@/hooks/useAndroidNotificationChannels';
import { useInAppBanner } from '@/template';

const HIDDEN_TAB_OPTIONS = { href: null };
const LIVE_NOTIFICATION_CHANNEL_ID = 'jmn-live-v3';
const LIVE_NOTIFY_KEY = 'jmn_radio_notify';
const LIVE_NOTIFY_TS_KEY = 'jmn_last_live_notify_ts';
const LIVE_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;
const PRAYER_SCHEDULE_REFRESH_MS = 15 * 60 * 1000;
const PRAYER_SCHEDULE_DAY_WINDOW = 3;
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const PUSH_MESSAGE_STORAGE_KEY = 'jmn_last_opened_push_message_v1';
const ADHAAN_DEBUG_TAG = '[ADHAAN_DEBUG]';
const IQAMAH_SUPPRESS_AFTER_PRAYER_START_MS = 2 * 60 * 1000;

function logAdhaanDebug(stage: string, payload: Record<string, unknown> = {}): void {
  const event = {
    ts: new Date().toISOString(),
    stage,
    ...payload,
  };

  try {
    console.log(`${ADHAAN_DEBUG_TAG} ${JSON.stringify(event)}`);
  } catch {
    console.log(ADHAAN_DEBUG_TAG, stage);
  }
}

function LiveDot() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={[dotStyles.dot, { opacity: pulse }]} />
  );
}

function TasbihIcon({ color, size }: { color: string; size: number }) {
  const beadRadius = Math.max(1.6, size * 0.11);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Main string arc */}
      <Path
        d="M6 11.2C6 7.9 8.7 5.2 12 5.2C15.3 5.2 18 7.9 18 11.2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />

      {/* Tasbih beads */}
      <Circle cx="7.5" cy="9.8" r={beadRadius} fill={color} />
      <Circle cx="9.4" cy="8.1" r={beadRadius} fill={color} />
      <Circle cx="12" cy="7.5" r={beadRadius} fill={color} />
      <Circle cx="14.6" cy="8.1" r={beadRadius} fill={color} />
      <Circle cx="16.5" cy="9.8" r={beadRadius} fill={color} />
      <Circle cx="17" cy="12.4" r={beadRadius} fill={color} />
      <Circle cx="15.9" cy="14.6" r={beadRadius} fill={color} />
      <Circle cx="14" cy="16.2" r={beadRadius} fill={color} />
      <Circle cx="12" cy="17" r={beadRadius} fill={color} />
      <Circle cx="10" cy="16.2" r={beadRadius} fill={color} />
      <Circle cx="8.1" cy="14.6" r={beadRadius} fill={color} />
      <Circle cx="7" cy="12.4" r={beadRadius} fill={color} />

      {/* Separator and tassel */}
      <Path
        d="M12 17.9V20.4M10.8 20.3L12 22L13.2 20.3"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const dotStyles = StyleSheet.create({
  dot: {
    position: 'absolute', top: -2, right: -4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ff2222',
    borderWidth: 1.5, borderColor: '#fff',
  },
});

const tabStyles = StyleSheet.create({
  iconFrame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFrameActiveLight: {
    backgroundColor: 'rgba(63, 174, 90, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 90, 0.35)',
    shadowColor: '#1D7D43',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  iconFrameActiveDark: {
    backgroundColor: 'rgba(140, 192, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(140, 192, 255, 0.45)',
    shadowColor: '#8CC0FF',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  liveIconWrap: {
    position: 'relative',
  },
});

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { darkMode } = useAppTheme();
  const { showBanner } = useInAppBanner();
  const { isLive, transitionedToLive } = useJmnLiveStatus();
  const [tabBarHidden, setTabBarHidden] = useState(false);
  const schedulingPrayerNotificationsRef = useRef(false);
  const schedulingAdhkarNotificationsRef = useRef(false);
  const prayerPermissionRequestedRef = useRef(false);
  const handledNotificationIdsRef = useRef<Set<string>>(new Set());
  const lastPrayerStartByPrayerRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!__DEV__ || !IS_EXPO_GO) return;
    showBanner(
      'Running in Expo Go',
      'Some local notification behavior is unreliable in Expo Go. Open the installed JMN build app instead.',
      9000,
      'warning',
    );
  }, [showBanner]);

  useEffect(() => {
    const unsubscribe = subscribeTabBarHidden(setTabBarHidden);
    return unsubscribe;
  }, []);

  const openLiveStreamFromIntent = useCallback(() => {
    router.push({
      pathname: '/stream',
      params: {
        autoplayLive: '1',
        autoplayIntentId: String(Date.now()),
      },
    });
  }, [router]);

  const routeFromNotificationData = useCallback(async (rawData: unknown, content?: { title?: string | null; body?: string | null }) => {
    await routeFromPushNotificationData({
      rawData,
      content,
      push: (target) => router.push(target as never),
      openLiveStreamFromIntent,
      pushMessageStorageKey: PUSH_MESSAGE_STORAGE_KEY,
    });
  }, [openLiveStreamFromIntent, router]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let mounted = true;
    let sub: { remove: () => void } | null = null;
    let receivedSub: { remove: () => void } | null = null;

    const handleResponse = async (
      Notifications: ExpoNotificationsModule,
      response:
        | {
            actionIdentifier?: string;
            notification?: {
              request?: {
                identifier?: string;
                content?: {
                  title?: string | null;
                  body?: string | null;
                  data?: unknown;
                };
              };
            };
          }
        | null
        | undefined,
    ) => {
      const request = response?.notification?.request;
      const requestId = request?.identifier;
      const actionIdentifier = response?.actionIdentifier;

      if (actionIdentifier === PRAYER_AUDIO_MUTE_ACTION_ID) {
        await stopPrayerStartAdhaan();
        return;
      }

      if (typeof requestId === 'string') {
        if (handledNotificationIdsRef.current.has(requestId)) return;
        handledNotificationIdsRef.current.add(requestId);

        if (handledNotificationIdsRef.current.size > 24) {
          const recentIds = Array.from(handledNotificationIdsRef.current).slice(-24);
          handledNotificationIdsRef.current = new Set(recentIds);
        }
      }

      void routeFromNotificationData(request?.content?.data, {
        title: request?.content?.title,
        body: request?.content?.body,
      });
    };

    const setup = async () => {
      const Notifications = await getNotificationsModule();
      if (!mounted || !Notifications) return;

      await Notifications.setNotificationCategoryAsync(
        PRAYER_AUDIO_NOTIFICATION_CATEGORY_ID,
        [
          {
            identifier: PRAYER_AUDIO_MUTE_ACTION_ID,
            buttonTitle: 'Mute',
            options: { opensAppToForeground: false },
          },
        ],
      ).catch(() => {});

      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (!mounted) return;
          void handleResponse(Notifications, response);
        })
        .catch(() => {});

      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        void handleResponse(Notifications, response);
      });

      receivedSub = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data as Record<string, unknown> | undefined;
        const scope = typeof data?.scope === 'string' ? data.scope : '';
        const type = typeof data?.type === 'string' ? data.type : '';
        const prayerName = typeof data?.prayerName === 'string' ? data.prayerName : '';
        const testRunId = typeof data?.testRunId === 'string' ? data.testRunId : '';
        const expectedChannelId = typeof data?.expectedChannelId === 'string' ? data.expectedChannelId : null;
        const expectedSoundFile = typeof data?.expectedSoundFile === 'string' ? data.expectedSoundFile : null;
        const channelId = typeof (notification.request.trigger as { channelId?: unknown } | null | undefined)?.channelId === 'string'
          ? (notification.request.trigger as { channelId: string }).channelId
          : null;

        logAdhaanDebug('notification-received', {
          notificationId: notification.request.identifier,
          scope,
          type,
          contentSound: notification.request.content.sound ?? null,
          channelId,
          data,
        });

        if (testRunId) {
          logAdhaanDebug('test-notification-received', {
            notificationId: notification.request.identifier,
            testRunId,
            scope,
            type,
            prayerName,
            channelId,
            contentSound: notification.request.content.sound ?? null,
            expectedChannelId,
            expectedSoundFile,
          });
        }

        // Remote FCM live notifications carry data.type === 'jmn-live'. Record
        // the timestamp so the foreground polling fallback (maybeNotifyLiveStart)
        // honours the cooldown and does not emit a duplicate local notification.
        if (type === 'jmn-live') {
          AsyncStorage.setItem(LIVE_NOTIFY_TS_KEY, String(Date.now())).catch(() => {});
          return;
        }

        if (scope === PRAYER_NOTIFICATION_SCOPE && type === 'jamaat-start') {
          // Vibration-only buzz at exact jamaat time. No audio playback.
          return;
        }

        if (scope === PRAYER_NOTIFICATION_SCOPE && type === 'prayer-start') {
          void (async () => {
            const prayerAudioMutedRaw = await AsyncStorage
              .getItem(PRAYER_AUDIO_MUTED_STORAGE_KEY)
              .catch(() => null);
            const prayerAudioMuted = prayerAudioMutedRaw == null
              ? DEFAULT_PRAYER_AUDIO_MUTED
              : prayerAudioMutedRaw === 'true';
            if (prayerAudioMuted) return;

            const selectedAdhaanOptionRaw = await AsyncStorage
              .getItem(ADHAAN_SELECTION_STORAGE_KEY)
              .catch(() => null);
            const selectedAdhaanOption = getAdhaanOptionById(selectedAdhaanOptionRaw ?? DEFAULT_ADHAAN_OPTION_ID);
            const playbackOk = await playPrayerStartAdhaan(selectedAdhaanOption.id);
            if (playbackOk && prayerName) {
              lastPrayerStartByPrayerRef.current[prayerName] = Date.now();
            }
            logAdhaanDebug('prayer-start-playback-triggered', {
              prayerName,
              selectedAdhaanOptionId: selectedAdhaanOption.id,
              selectedSoundFile: selectedAdhaanOption.soundFile,
              playbackOk,
            });
          })();
          return;
        }

        if (scope === PRAYER_NOTIFICATION_SCOPE && type === 'iqamah-start') {
          void (async () => {
            const prayerAudioMutedRaw = await AsyncStorage
              .getItem(PRAYER_AUDIO_MUTED_STORAGE_KEY)
              .catch(() => null);
            const prayerAudioMuted = prayerAudioMutedRaw == null
              ? DEFAULT_PRAYER_AUDIO_MUTED
              : prayerAudioMutedRaw === 'true';
            if (prayerAudioMuted) return;

            const iqamahExactSoundRaw = await AsyncStorage
              .getItem(IQAMAH_EXACT_SOUND_ENABLED_STORAGE_KEY)
              .catch(() => null);
            const iqamahExactSoundEnabled = iqamahExactSoundRaw == null
              ? DEFAULT_IQAMAH_EXACT_SOUND_ENABLED
              : iqamahExactSoundRaw === 'true';
            if (!iqamahExactSoundEnabled) return;

            const playbackOk = await playIqamah();
            logAdhaanDebug('iqamah-start-playback-triggered', {
              prayerName,
              playbackOk,
            });
          })();
          return;
        }

        if (scope === PRAYER_NOTIFICATION_SCOPE && type === 'jamaat-10') {
          void (async () => {
            const lastPrayerStartAt = prayerName
              ? lastPrayerStartByPrayerRef.current[prayerName] ?? 0
              : 0;
            if (lastPrayerStartAt > 0 && Date.now() - lastPrayerStartAt <= IQAMAH_SUPPRESS_AFTER_PRAYER_START_MS) {
              logAdhaanDebug('jamaat-10-playback-suppressed-near-prayer-start', {
                prayerName,
                msSincePrayerStart: Date.now() - lastPrayerStartAt,
              });
              return;
            }

            const prayerAudioMutedRaw = await AsyncStorage
              .getItem(PRAYER_AUDIO_MUTED_STORAGE_KEY)
              .catch(() => null);
            const prayerAudioMuted = prayerAudioMutedRaw == null
              ? DEFAULT_PRAYER_AUDIO_MUTED
              : prayerAudioMutedRaw === 'true';
            if (prayerAudioMuted) return;
            const playbackOk = await playIqamah();
            logAdhaanDebug('jamaat-10-playback-triggered', {
              prayerName,
              playbackOk,
            });
          })();
        }
      });
    };

    void setup();

    return () => {
      mounted = false;
      sub?.remove();
      receivedSub?.remove();
    };
  }, [routeFromNotificationData]);

  useEffect(() => {
    const setup = async () => {
      const Notifications = await getNotificationsModule();
      if (!Notifications) return;

      const selectedAdhaanOptionRaw = await AsyncStorage
        .getItem(ADHAAN_SELECTION_STORAGE_KEY)
        .catch(() => null);
      const selectedAdhaanOption = getAdhaanOptionById(selectedAdhaanOptionRaw ?? DEFAULT_ADHAAN_OPTION_ID);

      await ensureAndroidLiveNotificationChannel();
      await deleteLegacyPrayerNotificationChannels();
      await ensureAndroidPrayerNotificationChannel(selectedAdhaanOption.id);
      await ensureAndroidAdhkarNotificationChannels(DEFAULT_ADHKAR_REMINDER_SOUND_MODE);
    };

    void setup();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || IS_EXPO_GO) return;

    let cancelled = false;

    const syncPushPreferences = async (source: string) => {
      const Notifications = await getNotificationsModule();
      if (!Notifications || cancelled) return;

      const youtubeLiveNotifyEnabled = (await AsyncStorage.getItem(YOUTUBE_LIVE_NOTIFY_KEY).catch(() => null)) === 'true';
      const result = await syncPushTokenWithBackend(Notifications, {
        youtubeLiveEnabled: youtubeLiveNotifyEnabled,
        source,
      }).catch(() => {
        return { synced: false, reason: 'exception' } as const;
      });

      if (__DEV__ && (!result || !result.synced)) {
        console.log(`[push-sync:${source}]`, result?.reason ?? 'unknown-reason');
      }
    };

    void syncPushPreferences('tabs-layout-mount');

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncPushPreferences('appstate-active');
      }
    });

    return () => {
      cancelled = true;
      appStateSub.remove();
    };
  }, []);

  const ensurePrayerNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    const Notifications = await getNotificationsModule();
    if (!Notifications) return false;

    const current = await Notifications.getPermissionsAsync();
    let finalStatus = current.status;

    if (finalStatus !== 'granted' && !prayerPermissionRequestedRef.current) {
      prayerPermissionRequestedRef.current = true;
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    return finalStatus === 'granted';
  }, []);

  const clearScheduledAdhkarNotifications = useCallback(async () => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;

    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      const ownAdhkarIds = all
        .filter((item) => {
          const data = item.content.data as Record<string, unknown> | undefined;
          return data?.scope === ADHKAR_NOTIFICATION_SCOPE;
        })
        .map((item) => item.identifier);

      for (const id of ownAdhkarIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    } catch {
      // Keep scheduling resilient even if cancellation fails on specific devices.
    }
  }, []);

  const clearScheduledPrayerNotifications = useCallback(async () => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return;

    try {
      const all = await Notifications.getAllScheduledNotificationsAsync();
      const ownPrayerIds = all
        .filter((item) => {
          const data = item.content.data as Record<string, unknown> | undefined;
          return data?.scope === PRAYER_NOTIFICATION_SCOPE;
        })
        .map((item) => item.identifier);

      for (const id of ownPrayerIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    } catch {
      // Keep scheduling resilient even if cancellation fails on specific devices.
    }
  }, []);

  const schedulePrayerNotifications = useCallback(async () => {
    if (Platform.OS === 'web' || schedulingPrayerNotificationsRef.current) return;

    const Notifications = await getNotificationsModule();
    if (!Notifications) return;

    schedulingPrayerNotificationsRef.current = true;
    try {
      const allowed = await ensurePrayerNotificationPermission();
      if (!allowed) return;

      const selectedAdhaanOptionRaw = await AsyncStorage
        .getItem(ADHAAN_SELECTION_STORAGE_KEY)
        .catch(() => null);
      const selectedAdhaanOption = getAdhaanOptionById(selectedAdhaanOptionRaw ?? DEFAULT_ADHAAN_OPTION_ID);

      const prayerAudioMutedRaw = await AsyncStorage
        .getItem(PRAYER_AUDIO_MUTED_STORAGE_KEY)
        .catch(() => null);
      const prayerAudioMuted = prayerAudioMutedRaw == null
        ? DEFAULT_PRAYER_AUDIO_MUTED
        : prayerAudioMutedRaw === 'true';

      const iqamahExactSoundRaw = await AsyncStorage
        .getItem(IQAMAH_EXACT_SOUND_ENABLED_STORAGE_KEY)
        .catch(() => null);
      const iqamahExactSoundEnabled = iqamahExactSoundRaw == null
        ? DEFAULT_IQAMAH_EXACT_SOUND_ENABLED
        : iqamahExactSoundRaw === 'true';

      const backgroundPrayerNotificationModeRaw = await AsyncStorage
        .getItem(BACKGROUND_PRAYER_NOTIFICATION_MODE_STORAGE_KEY)
        .catch(() => null);
      const backgroundPrayerNotificationMode = backgroundPrayerNotificationModeRaw === 'vibration-only'
        ? 'vibration-only'
        : DEFAULT_BACKGROUND_PRAYER_NOTIFICATION_MODE;
      const backgroundVibrationOnly = backgroundPrayerNotificationMode === 'vibration-only';

      await ensureAndroidPrayerNotificationChannel(selectedAdhaanOption.id);

      const now = new Date();
      const scheduleDates = Array.from({ length: PRAYER_SCHEDULE_DAY_WINDOW }, (_, index) => {
        const date = new Date(now);
        date.setDate(date.getDate() + index);
        return date;
      });

      const dayData = await Promise.all(
        scheduleDates.map((date) => getPrayerTimesForDate(date).catch(() => null))
      );

      const prayerRows = dayData.flatMap((data) => data?.prayers ?? []);
      const rawPlanned = buildPrayerNotificationsForPrayers(prayerRows, now);
      const seen = new Set<string>();
      const planned = rawPlanned.filter((item) => {
        const key = `${item.data.type}:${item.data.prayerName}:${item.fireAt.toISOString()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      logAdhaanDebug('prayer-plan-built', {
        totalPlanned: planned.length,
        audioItems: planned
          .filter((item) => item.data.type === 'prayer-start' || item.data.type === 'iqamah-start' || item.data.type === 'jamaat-10')
          .map((item) => ({
            prayerName: item.data.prayerName,
            type: item.data.type,
            fireAtIso: item.fireAt.toISOString(),
          })),
      });

      await clearScheduledPrayerNotifications();

      for (const item of planned) {
        const isPrayerStart = item.data.type === 'prayer-start';
        const isIqamahStart = item.data.type === 'iqamah-start';
        const isJamaatLead = item.data.type === 'jamaat-10';
        const isJamaatStart = item.data.type === 'jamaat-start';
        const isPrayerNearEnd = item.data.type === 'prayer-near-end';
        const iqamahStartAudible = !prayerAudioMuted && iqamahExactSoundEnabled && !backgroundVibrationOnly;
        const prayerStartSilent = prayerAudioMuted || backgroundVibrationOnly;
        const prayerStartChannelId = getPrayerStartChannelId(selectedAdhaanOption.id, prayerStartSilent);
        const prayerChannelId = isPrayerStart
          ? prayerStartChannelId
          : (isIqamahStart
              ? (iqamahStartAudible ? IQAMAH_NOTIFICATION_CHANNEL_ID : IQAMAH_NOTIFICATION_SILENT_CHANNEL_ID)
              : isJamaatLead
              ? ((prayerAudioMuted || backgroundVibrationOnly) ? IQAMAH_NOTIFICATION_SILENT_CHANNEL_ID : IQAMAH_NOTIFICATION_CHANNEL_ID)
              : isJamaatStart
              ? IQAMAH_NOTIFICATION_SILENT_CHANNEL_ID
              : isPrayerNearEnd
              ? (prayerAudioMuted ? PRAYER_NOTIFICATION_SILENT_CHANNEL_ID : PRAYER_NOTIFICATION_CHANNEL_ID)
              : PRAYER_NOTIFICATION_CHANNEL_ID);
        const prayerSound = isPrayerStart
          ? (prayerStartSilent ? false : selectedAdhaanOption.soundFile)
          : (isIqamahStart
              ? (iqamahStartAudible ? IQAMAH_SOUND_FILE : false)
              : isJamaatLead
              ? ((prayerAudioMuted || backgroundVibrationOnly) ? false : IQAMAH_SOUND_FILE)
              : isJamaatStart
              ? false
              : isPrayerNearEnd
              ? (prayerAudioMuted ? false : 'default')
              : 'default');
        const categoryIdentifier = (isPrayerStart || isIqamahStart || isJamaatLead)
          ? PRAYER_AUDIO_NOTIFICATION_CATEGORY_ID
          : undefined;

        const trigger = Platform.OS === 'android'
          ? ({ type: 'date', date: item.fireAt, channelId: prayerChannelId } as unknown as import('expo-notifications').NotificationTriggerInput)
          : (item.fireAt as unknown as import('expo-notifications').NotificationTriggerInput);

        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: item.title,
              body: item.body,
              sound: prayerSound,
              categoryIdentifier,
              data: item.data,
            },
            trigger,
          });
        } catch {
          // Ignore individual schedule failures; future refreshes will retry.
        }
      }
    } catch {
      // Ignore transient scheduling failures; next refresh will retry.
    } finally {
      schedulingPrayerNotificationsRef.current = false;
    }
  }, [clearScheduledPrayerNotifications, ensurePrayerNotificationPermission]);

  const scheduleAdhkarNotifications = useCallback(async () => {
    if (Platform.OS === 'web' || schedulingAdhkarNotificationsRef.current) return;

    const Notifications = await getNotificationsModule();
    if (!Notifications) return;

    schedulingAdhkarNotificationsRef.current = true;
    try {
      const allowed = await ensurePrayerNotificationPermission();
      if (!allowed) return;

      const remindersEnabledRaw = await AsyncStorage
        .getItem(ADHKAR_REMINDERS_ENABLED_STORAGE_KEY)
        .catch(() => null);
      const remindersEnabled = remindersEnabledRaw == null
        ? DEFAULT_ADHKAR_REMINDERS_ENABLED
        : remindersEnabledRaw === 'true';

      if (!remindersEnabled) {
        await clearScheduledAdhkarNotifications();
        return;
      }

      const storedSoundMode = await AsyncStorage
        .getItem(ADHKAR_REMINDER_SOUND_MODE_STORAGE_KEY)
        .catch(() => null);
      const soundMode: AdhkarReminderSoundMode = storedSoundMode === 'silent'
        ? 'silent'
        : DEFAULT_ADHKAR_REMINDER_SOUND_MODE;

      await ensureAndroidAdhkarNotificationChannels(soundMode);

      const now = new Date();
      const scheduleDates = Array.from({ length: PRAYER_SCHEDULE_DAY_WINDOW }, (_, index) => {
        const date = new Date(now);
        date.setDate(date.getDate() + index);
        return date;
      });

      const dayData = await Promise.all(
        scheduleDates.map((date) => getPrayerTimesForDate(date).catch(() => null))
      );

      const prayerRows = dayData.flatMap((data) => data?.prayers ?? []);
      const buildResult = await buildAdhkarNotificationsForPrayers(prayerRows, now);

      const seen = new Set<string>();
      const planned = buildResult.planned.filter((item) => {
        const key = `${item.data.type}:${item.data.prayerName}:${item.data.prayerTime}:${item.fireAt.toISOString()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      await clearScheduledAdhkarNotifications();

      const adhkarChannelId = soundMode === 'silent'
        ? ADHKAR_NOTIFICATION_SILENT_CHANNEL_ID
        : ADHKAR_NOTIFICATION_CHANNEL_ID;
      const scheduledSound = soundMode === 'silent' ? false : 'default';

      for (const item of planned) {
        const trigger = Platform.OS === 'android'
          ? ({ type: 'date', date: item.fireAt, channelId: adhkarChannelId } as unknown as import('expo-notifications').NotificationTriggerInput)
          : (item.fireAt as unknown as import('expo-notifications').NotificationTriggerInput);

        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: item.title,
              body: item.body,
              sound: scheduledSound,
              data: item.data,
            },
            trigger,
          });
        } catch {
          // Ignore individual schedule failures; future refreshes will retry.
        }
      }
    } catch {
      // Ignore transient scheduling failures; next refresh will retry.
    } finally {
      schedulingAdhkarNotificationsRef.current = false;
    }
  }, [clearScheduledAdhkarNotifications, ensurePrayerNotificationPermission]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    void schedulePrayerNotifications();
    void scheduleAdhkarNotifications();

    const intervalId = setInterval(() => {
      void schedulePrayerNotifications();
      void scheduleAdhkarNotifications();
    }, PRAYER_SCHEDULE_REFRESH_MS);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void schedulePrayerNotifications();
        void scheduleAdhkarNotifications();
      }
    });

    const unsubscribeRefresh = subscribePrayerNotificationRefresh(() => {
      void schedulePrayerNotifications();
      void scheduleAdhkarNotifications();
    });

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
      unsubscribeRefresh();
    };
  }, [scheduleAdhkarNotifications, schedulePrayerNotifications]);

  const maybeNotifyLiveStart = useCallback(async () => {
    if (Platform.OS === 'web') return;

    const Notifications = await getNotificationsModule();
    if (!Notifications) return;

    const enabled = (await AsyncStorage.getItem(LIVE_NOTIFY_KEY)) === 'true';
    if (!enabled) return;

    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') return;

    const now = Date.now();
    const lastRaw = await AsyncStorage.getItem(LIVE_NOTIFY_TS_KEY);
    const lastSentTs = lastRaw ? Number(lastRaw) : 0;
    if (Number.isFinite(lastSentTs) && now - lastSentTs < LIVE_NOTIFY_COOLDOWN_MS) return;

    const liveTrigger = Platform.OS === 'android'
      ? ({ type: 'timeInterval', seconds: 1, channelId: LIVE_NOTIFICATION_CHANNEL_ID } as unknown as import('expo-notifications').NotificationTriggerInput)
      : null;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'JMN Radio is now live',
          body: "Tap to open Jami' Masjid Noorani live stream. | جے ایم این ریڈیو اب براہِ راست ہے۔ سننے کے لیے کھولیں۔",
          sound: 'default',
          data: { route: '/stream', type: 'jmn-live' },
        },
        trigger: liveTrigger,
      });
    } catch {
      // Ignore notification scheduling failure.
    }

    await AsyncStorage.setItem(LIVE_NOTIFY_TS_KEY, String(now));
  }, []);

  useEffect(() => {
    if (!transitionedToLive) return;
    void maybeNotifyLiveStart();
  }, [maybeNotifyLiveStart, transitionedToLive]);

  const tabBarStyle = {
    display: (tabBarHidden ? 'none' : 'flex') as 'none' | 'flex',
    height: Platform.select({
      ios: insets.bottom + 64,
      android: insets.bottom + 68,
      default: 74,
    }),
    paddingTop: 6,
    paddingBottom: Platform.select({
      ios: insets.bottom > 0 ? insets.bottom + 2 : 10,
      android: insets.bottom + 8,
      default: 10,
    }),
    paddingHorizontal: 12,
    backgroundColor: darkMode ? 'rgba(14, 24, 40, 0.94)' : 'rgba(252, 255, 253, 0.94)',
    borderTopWidth: 0,
    borderWidth: 1,
    borderRadius: 24,
    position: 'absolute' as const,
    left: 12,
    right: 12,
    bottom: Platform.select({
      ios: insets.bottom > 0 ? 8 : 12,
      android: 10,
      default: 10,
    }),
    borderColor: darkMode ? 'rgba(126, 167, 211, 0.28)' : 'rgba(148, 177, 159, 0.5)',
    shadowColor: '#000',
    shadowOpacity: darkMode ? 0.34 : 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 14,
  };

  const getTabIconFrameStyle = (focused: boolean) => {
    if (!focused) return tabStyles.iconFrame;
    return [
      tabStyles.iconFrame,
      darkMode ? tabStyles.iconFrameActiveDark : tabStyles.iconFrameActiveLight,
    ];
  };

  const renderTabIcon = (
    iconName: React.ComponentProps<typeof MaterialIcons>['name'],
    color: string,
    size: number,
    focused: boolean
  ) => (
    <View style={getTabIconFrameStyle(focused)}>
      <MaterialIcons name={iconName} size={size} color={color} />
    </View>
  );

  const renderTasbihIcon = (color: string, size: number, focused: boolean) => (
    <View style={getTabIconFrameStyle(focused)}>
      <TasbihIcon color={color} size={size} />
    </View>
  );

  const renderLiveIcon = (color: string, size: number, focused: boolean) => (
    <View style={[getTabIconFrameStyle(focused), tabStyles.liveIconWrap]}>
      <MaterialIcons name="live-tv" size={size} color={color} />
      {isLive ? <LiveDot /> : null}
    </View>
  );

  const hiddenRoutes = ['howto', 'events', 'youtube-live', 'qaseedah-naat', 'qaseedah-viewer', 'qaseedah-group', 'settings', 'push-notification', 'donation-confirmation'] as const;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle,
        tabBarItemStyle: {
          borderRadius: 16,
          paddingVertical: 2,
        },
        tabBarActiveTintColor: darkMode ? '#B2D5FF' : '#176A39',
        tabBarInactiveTintColor: darkMode ? '#7B93B0' : '#70847A',
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => renderTabIcon('home', color, size, focused),
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: 'Prayer',
          tabBarIcon: ({ color, size, focused }) => renderTabIcon('access-time', color, size, focused),
        }}
      />
      <Tabs.Screen
        name="duas"
        options={{
          title: 'Wird',
          tabBarLabel: 'Wird',
          href: '/duas',
          tabBarIcon: ({ color, size, focused }) => renderTasbihIcon(color, size, focused),
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: 'Quran',
          tabBarIcon: ({ color, size, focused }) => renderTabIcon('auto-stories', color, size, focused),
        }}
      />
      {hiddenRoutes.map((name) => (
        <Tabs.Screen key={name} name={name} options={HIDDEN_TAB_OPTIONS} />
      ))}
      <Tabs.Screen
        name="stream"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, size, focused }) => renderLiveIcon(color, size, focused),
        }}
      />
    </Tabs>
  );
}
