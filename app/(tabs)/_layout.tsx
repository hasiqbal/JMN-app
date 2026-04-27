import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, StyleSheet, Animated, AppState } from 'react-native';
import { useRef, useEffect, useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useJmnLiveStatus } from '@/hooks/useJmnLiveStatus';
import {
  playAdhaanNowForTesting,
  setAdhaanMutedEnabled,
  stopActiveAdhaan,
  useQuranPrayerPopups,
} from '@/hooks/useQuranPrayerPopups';
import { getPrayerTimesForDate, PrayerTime } from '@/services/prayerService';
import { syncPushTokenWithBackend } from '@/services/pushRegistrationService';
import { useInAppBanner } from '@/template';

type ExpoNotificationsModule = typeof import('expo-notifications');

const Notifications: ExpoNotificationsModule | null =
  Platform.OS === 'web' ? null : require('expo-notifications');

const HIDDEN_TAB_OPTIONS = { href: null };
const LIVE_NOTIFICATION_CHANNEL_ID = 'jmn-live-v2';
const LIVE_NOTIFY_KEY = 'jmn_radio_notify';
const LIVE_NOTIFY_TS_KEY = 'jmn_last_live_notify_ts';
const LIVE_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;
const PUSH_SUCCESS_TS_KEY = 'jmn_last_push_success_ts';
const PUSH_SUCCESS_FLAG_WINDOW_MS = 10 * 60 * 1000;
const PRAYER_ADHAAN_CHANNEL_ID = 'jmn-prayer-adhaan-v2';
const PRAYER_JAMAAT_CHANNEL_ID = 'jmn-prayer-jamaat-v2';
const PRAYER_SILENT_CHANNEL_ID = 'jmn-prayer-silent-v3';
const PRAYER_ALERT_CHANNEL_ID = 'jmn-prayer-alerts-v1';
const ADHAAN_BACKGROUND_SOUND_FILE = 'adhaan.mp3';
const IQAMAH_BACKGROUND_SOUND_FILE = 'iqamah.mp3';
const PRAYER_SCHEDULE_REFRESH_MS = 15 * 60 * 1000;
const PRAYER_SCHEDULE_DAY_WINDOW = 3;
const PRAYER_NOTIFICATION_SCOPE = 'jmn-prayer';
const PRAYER_NOTIFICATION_CATEGORY_ID = 'jmn-prayer-controls';
const PRAYER_ACTION_STOP = 'jmn-prayer-stop';
const PRAYER_ACTION_MUTE = 'jmn-prayer-mute';
const DEBUG_ADHAAN_TEST_LAST_SENT_TS_KEY = 'jmn_debug_adhaan_test_last_sent_ts_v1';
const JAMAAT_REMINDER_MINUTES = 10;
const NOTIFICATION_MIN_LEAD_MS = 30 * 1000;
const EXPO_GO_NOTIFICATIONS_FALLBACK =
  Constants.appOwnership === 'expo' &&
  Number((Constants.expoConfig?.sdkVersion ?? '0').split('.')[0] || 0) >= 53;
const PUSH_SYNC_DEBUG_ENABLED = __DEV__;

const NON_PRAYABLE_NAMES = new Set(['Sunrise']);
const START_TIME_ONLY_NAMES = new Set(['Ishraq', 'Zawaal']);

type PlannedPrayerNotification = {
  title: string;
  body: string;
  fireAt: Date;
  data: {
    scope: string;
    type: 'prayer-reminder-60' | 'prayer-reminder-30' | 'prayer-start' | 'jamaat-10' | 'jamaat-start';
    prayerName: string;
    route: string;
  };
};

function parseIqamahDate(iqamah: string | undefined, baseDate: Date): Date | null {
  const value = (iqamah ?? '').trim();
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;

  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const parsed = new Date(baseDate);
  parsed.setHours(hours, minutes, 0, 0);
  return parsed;
}

function buildPrayerNotifications(prayer: PrayerTime, now: Date): PlannedPrayerNotification[] {
  if (NON_PRAYABLE_NAMES.has(prayer.name)) return [];

  const notifications: PlannedPrayerNotification[] = [];
  const prayerStart = prayer.timeDate;
  const startTimeOnly = START_TIME_ONLY_NAMES.has(prayer.name);

  if (!startTimeOnly) {
    // 1-hour reminder before prayer
    const reminder60Date = new Date(prayerStart.getTime() - 60 * 60 * 1000);
    if (reminder60Date.getTime() - now.getTime() > NOTIFICATION_MIN_LEAD_MS) {
      notifications.push({
        title: `${prayer.name} prayer in 1 hour`,
        body: `${prayer.name} prayer starts in 1 hour.\nنماز ${prayer.name} میں 1 گھنٹہ باقی ہے۔`,
        fireAt: reminder60Date,
        data: {
          scope: PRAYER_NOTIFICATION_SCOPE,
          type: 'prayer-reminder-60',
          prayerName: prayer.name,
          route: '/prayer',
        },
      });
    }

    // 30-minute reminder before prayer
    const reminder30Date = new Date(prayerStart.getTime() - 30 * 60 * 1000);
    if (reminder30Date.getTime() - now.getTime() > NOTIFICATION_MIN_LEAD_MS) {
      notifications.push({
        title: `${prayer.name} prayer in 30 minutes`,
        body: `${prayer.name} prayer starts in 30 minutes.\nنماز ${prayer.name} میں 30 منٹ باقی ہیں۔`,
        fireAt: reminder30Date,
        data: {
          scope: PRAYER_NOTIFICATION_SCOPE,
          type: 'prayer-reminder-30',
          prayerName: prayer.name,
          route: '/prayer',
        },
      });
    }
  }

  // Start-time notification (fire at exact prayer time, no early offset)
  if (prayerStart.getTime() - now.getTime() > NOTIFICATION_MIN_LEAD_MS) {
    notifications.push({
      title: `${prayer.name} time`,
      body: startTimeOnly
        ? `${prayer.name} time has started.\nوقت ${prayer.name} شروع ہو گیا۔`
        : `Azaan for ${prayer.name} has started.\nنماز ${prayer.name} کا وقت ہو گیا — اذان شروع ہو گئی۔`,
      fireAt: prayerStart,
      data: {
        scope: PRAYER_NOTIFICATION_SCOPE,
        type: 'prayer-start',
        prayerName: prayer.name,
        route: '/prayer',
      },
    });
  }

  const iqamahDate = parseIqamahDate(prayer.iqamah, prayerStart);
  if (!iqamahDate) return notifications;

  // 10-minute jamaat reminder
  const jamaatReminderDate = new Date(iqamahDate.getTime() - JAMAAT_REMINDER_MINUTES * 60 * 1000);
  if (jamaatReminderDate.getTime() - now.getTime() > NOTIFICATION_MIN_LEAD_MS) {
    notifications.push({
      title: `${prayer.name} jamaat in ${JAMAAT_REMINDER_MINUTES} minutes`,
      body: `${prayer.name} jamaat starts in ${JAMAAT_REMINDER_MINUTES} minutes.\nنماز ${prayer.name} کی جماعت میں 10 منٹ باقی ہیں۔`,
      fireAt: jamaatReminderDate,
      data: {
        scope: PRAYER_NOTIFICATION_SCOPE,
        type: 'jamaat-10',
        prayerName: prayer.name,
        route: '/prayer',
      },
    });
  }

  // Jamaat-started notification (at iqamah time)
  if (iqamahDate.getTime() - now.getTime() > NOTIFICATION_MIN_LEAD_MS) {
    notifications.push({
      title: `${prayer.name} jamaat has started`,
      body: `Time to go to the masjid — ${prayer.name} jamaat has started.\nمسجد چلیے — نماز ${prayer.name} کی جماعت شروع ہو گئی۔`,
      fireAt: iqamahDate,
      data: {
        scope: PRAYER_NOTIFICATION_SCOPE,
        type: 'jamaat-start',
        prayerName: prayer.name,
        route: '/prayer',
      },
    });
  }

  return notifications;
}

async function ensureAndroidLiveNotificationChannel(): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(LIVE_NOTIFICATION_CHANNEL_ID, {
    name: 'JMN Live Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
  }).catch(() => {});
}

async function ensureAndroidPrayerNotificationChannels(): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return;

  await Promise.all([
    Notifications.setNotificationChannelAsync(PRAYER_ALERT_CHANNEL_ID, {
      name: 'JMN Prayer Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    }),
    Notifications.setNotificationChannelAsync(PRAYER_ADHAAN_CHANNEL_ID, {
      name: 'JMN Adhaan Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: ADHAAN_BACKGROUND_SOUND_FILE,
    }),
    Notifications.setNotificationChannelAsync(PRAYER_JAMAAT_CHANNEL_ID, {
      name: 'JMN Jamaat Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: IQAMAH_BACKGROUND_SOUND_FILE,
    }),
    Notifications.setNotificationChannelAsync(PRAYER_SILENT_CHANNEL_ID, {
      name: 'JMN Prayer Alerts (Silent)',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 80],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null,
    }),
  ]).catch(() => {});
}

function LiveDot() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: Platform.OS !== 'web' }),
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

function PushSuccessFlag() {
  return (
    <View style={dotStyles.flagWrap}>
      <MaterialIcons name="flag" size={9} color="#FFFFFF" />
    </View>
  );
}

const dotStyles = StyleSheet.create({
  dot: {
    position: 'absolute', top: -2, right: -4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ff2222',
    borderWidth: 1.5, borderColor: '#fff',
  },
  flagWrap: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#16A34A',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function TabLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { darkMode } = useAppTheme();
  const { showBanner } = useInAppBanner();
  const { isLive, transitionedToLive } = useJmnLiveStatus();
  const schedulingPrayerNotificationsRef = useRef(false);
  const prayerPermissionRequestedRef = useRef(false);
  const handledNotificationIdsRef = useRef<Set<string>>(new Set());
  const lastPushSyncDebugReasonRef = useRef<string | null>(null);
  const pushFlagTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasRecentPushSuccess, setHasRecentPushSuccess] = useState(false);

  useQuranPrayerPopups();

  const clearPushFlagTimeout = useCallback(() => {
    if (pushFlagTimeoutRef.current) {
      clearTimeout(pushFlagTimeoutRef.current);
      pushFlagTimeoutRef.current = null;
    }
  }, []);

  const schedulePushFlagExpiry = useCallback((delayMs: number) => {
    clearPushFlagTimeout();
    const timeout = Math.max(1000, delayMs);
    pushFlagTimeoutRef.current = setTimeout(() => {
      setHasRecentPushSuccess(false);
      pushFlagTimeoutRef.current = null;
    }, timeout);
  }, [clearPushFlagTimeout]);

  const parseNotificationData = useCallback((rawData: unknown): Record<string, unknown> | null => {
    if (rawData && typeof rawData === 'object') {
      return rawData as Record<string, unknown>;
    }

    if (typeof rawData === 'string') {
      try {
        const parsed = JSON.parse(rawData) as unknown;
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }

    return null;
  }, []);

  const maybeMarkPushSuccess = useCallback(async (rawData: unknown) => {
    const data = parseNotificationData(rawData);
    if (!data) return;

    const notificationId = typeof data.notificationId === 'string' ? data.notificationId.trim() : '';
    if (!notificationId) return;

    const now = Date.now();
    setHasRecentPushSuccess(true);
    schedulePushFlagExpiry(PUSH_SUCCESS_FLAG_WINDOW_MS);

    await AsyncStorage.setItem(PUSH_SUCCESS_TS_KEY, String(now)).catch(() => {});

    showBanner(
      'Push delivered successfully',
      'This phone received the notification.',
      4500,
    );
  }, [parseNotificationData, schedulePushFlagExpiry, showBanner]);

  useEffect(() => {
    let mounted = true;

    const restorePushFlag = async () => {
      const raw = await AsyncStorage.getItem(PUSH_SUCCESS_TS_KEY).catch(() => null);
      if (!mounted || !raw) return;

      const ts = Number(raw);
      if (!Number.isFinite(ts)) return;

      const elapsed = Date.now() - ts;
      if (elapsed >= PUSH_SUCCESS_FLAG_WINDOW_MS) return;

      setHasRecentPushSuccess(true);
      schedulePushFlagExpiry(PUSH_SUCCESS_FLAG_WINDOW_MS - elapsed);
    };

    void restorePushFlag();

    return () => {
      mounted = false;
      clearPushFlagTimeout();
    };
  }, [clearPushFlagTimeout, schedulePushFlagExpiry]);

  const openLiveStreamFromIntent = useCallback(() => {
    router.push({
      pathname: '/stream',
      params: {
        autoplayLive: '1',
        autoplayIntentId: String(Date.now()),
      },
    });
  }, [router]);

  const routeFromNotificationData = useCallback((rawData: unknown) => {
    const data = parseNotificationData(rawData);
    if (!data) return;

    const routeRaw = typeof data.route === 'string' ? data.route.trim() : null;
    if (!routeRaw) return;
    const route = routeRaw.startsWith('/') ? routeRaw : `/${routeRaw}`;

    const type = typeof data.type === 'string' ? data.type : null;
    const shouldAutoplayLive = route === '/stream' && type === 'jmn-live';

    if (shouldAutoplayLive) {
      openLiveStreamFromIntent();
      return;
    }

    router.push(route as never);
  }, [openLiveStreamFromIntent, parseNotificationData, router]);

  useEffect(() => {
    if (Platform.OS === 'web' || !Notifications) return;

    const handleResponse = (
      response:
        | {
            actionIdentifier?: string;
            notification?: {
              request?: {
                identifier?: string;
                content?: {
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

      if (actionIdentifier === PRAYER_ACTION_STOP) {
        if (typeof requestId === 'string') {
          void Notifications.dismissNotificationAsync(requestId).catch(() => {});
        }
        void Notifications.dismissAllNotificationsAsync().catch(() => {});
        void stopActiveAdhaan();
        if (AppState.currentState === 'active') {
          showBanner('Adhaan stopped', 'Current adhaan playback has been stopped.');
          router.push('/prayer');
        }
        return;
      }

      if (actionIdentifier === PRAYER_ACTION_MUTE) {
        if (typeof requestId === 'string') {
          void Notifications.dismissNotificationAsync(requestId).catch(() => {});
        }
        void Notifications.dismissAllNotificationsAsync().catch(() => {});
        void setAdhaanMutedEnabled(true);
        void stopActiveAdhaan();
        if (AppState.currentState === 'active') {
          showBanner('Adhaan muted', 'Prayer adhaan sound is now muted. You can unmute from the Prayer tab.');
          router.push('/prayer');
        }
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

      void maybeMarkPushSuccess(request?.content?.data);

      routeFromNotificationData(request?.content?.data);
    };

    let mounted = true;

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!mounted) return;
        handleResponse(response);
      })
      .catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleResponse(response);
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      void maybeMarkPushSuccess(notification.request.content.data);
    });

    return () => {
      mounted = false;
      sub.remove();
      receivedSub.remove();
    };
  }, [maybeMarkPushSuccess, routeFromNotificationData, router, showBanner]);

  useEffect(() => {
    if (!Notifications) return;

    void ensureAndroidLiveNotificationChannel();
    void ensureAndroidPrayerNotificationChannels();

    Notifications.setNotificationCategoryAsync(PRAYER_NOTIFICATION_CATEGORY_ID, [
      {
        identifier: PRAYER_ACTION_STOP,
        buttonTitle: 'Stop adhaan',
        options: { opensAppToForeground: false },
      },
      {
        identifier: PRAYER_ACTION_MUTE,
        buttonTitle: 'Mute adhaan',
        options: { opensAppToForeground: false },
      },
    ]).catch(() => {});
  }, []);

  useEffect(() => {
    if (!__DEV__ || Platform.OS === 'web' || !Notifications) return;

    let cancelled = false;

    const triggerImmediateAdhaanTest = async () => {
      const currentPerm = await Notifications.getPermissionsAsync().catch(() => null);
      let status = currentPerm?.status ?? 'undetermined';
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync().catch(() => null);
        status = requested?.status ?? status;
      }

      if (status !== 'granted') {
        if (!cancelled) {
          showBanner('Test adhaan failed', 'Notification permission is not granted.', 5500, 'warning');
        }
        return;
      }

      const lastRaw = await AsyncStorage.getItem(DEBUG_ADHAAN_TEST_LAST_SENT_TS_KEY).catch(() => null);
      const lastSent = Number(lastRaw || 0);
      if (Number.isFinite(lastSent) && Date.now() - lastSent < 5000) {
        return;
      }

      await ensureAndroidPrayerNotificationChannels();

      const fireAt = new Date(Date.now() + 7000);
      const trigger = Platform.OS === 'android'
        ? ({ type: 'date', date: fireAt, channelId: PRAYER_ADHAAN_CHANNEL_ID } as unknown as import('expo-notifications').NotificationTriggerInput)
        : (fireAt as unknown as import('expo-notifications').NotificationTriggerInput);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Adhaan (Now)',
          body: 'Testing volume-button mute and notification actions.',
          sound: ADHAAN_BACKGROUND_SOUND_FILE,
          categoryIdentifier: PRAYER_NOTIFICATION_CATEGORY_ID,
          data: {
            scope: PRAYER_NOTIFICATION_SCOPE,
            type: 'prayer-start',
            prayerName: 'Test Adhaan',
            route: '/prayer',
          },
        },
        trigger,
      });

      // Fallback for devices/builds where custom notification sounds do not
      // play reliably: start adhaan directly from app audio only while app is
      // active. In background, rely on OS notification sound behavior.
      setTimeout(() => {
        if (AppState.currentState !== 'active') return;
        void playAdhaanNowForTesting({ ignoreMute: true });
      }, 7000);

      if (cancelled) return;

      await AsyncStorage.setItem(DEBUG_ADHAAN_TEST_LAST_SENT_TS_KEY, String(Date.now())).catch(() => {});
      showBanner('Test adhaan sent', 'It will ring in about 7 seconds.');
    };

    void triggerImmediateAdhaanTest();

    return () => {
      cancelled = true;
    };
  }, [showBanner]);

  const ensurePrayerNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !Notifications) return false;

    const current = await Notifications.getPermissionsAsync();
    let finalStatus = current.status;

    if (finalStatus !== 'granted' && !prayerPermissionRequestedRef.current) {
      prayerPermissionRequestedRef.current = true;
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    return finalStatus === 'granted';
  }, []);

  const clearScheduledPrayerNotifications = useCallback(async () => {
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
    if (Platform.OS === 'web' || !Notifications || schedulingPrayerNotificationsRef.current) return;

    schedulingPrayerNotificationsRef.current = true;
    try {
      const allowed = await ensurePrayerNotificationPermission();
      if (!allowed) {
        if (PUSH_SYNC_DEBUG_ENABLED) {
          const reason = 'permission-not-granted';
          if (lastPushSyncDebugReasonRef.current !== reason) {
            lastPushSyncDebugReasonRef.current = reason;
            showBanner('Push token not synced', `Reason: ${reason}`, 6500, 'warning');
          }
        }
        return;
      }

      await ensureAndroidPrayerNotificationChannels();

      // Register and refresh Expo push token in the backend while permissions are valid.
      const syncResult = await syncPushTokenWithBackend(Notifications).catch((error) => {
        if (PUSH_SYNC_DEBUG_ENABLED) {
          const message = error instanceof Error ? error.message : String(error);
          const reason = `sync-exception:${message}`;
          if (lastPushSyncDebugReasonRef.current !== reason) {
            lastPushSyncDebugReasonRef.current = reason;
            showBanner('Push token sync failed', message.slice(0, 180), 6500, 'warning');
          }
        }
        return { synced: false, reason: 'exception' } as const;
      });

      if (PUSH_SYNC_DEBUG_ENABLED) {
        const reason = syncResult.synced
          ? 'synced'
          : `not-synced:${syncResult.reason ?? 'unknown'}`;
        if (lastPushSyncDebugReasonRef.current !== reason) {
          lastPushSyncDebugReasonRef.current = reason;
          if (syncResult.synced) {
            showBanner('Push token synced', 'This phone is now registered for portal pushes.', 4500);
          } else {
            showBanner('Push token not synced', `Reason: ${syncResult.reason ?? 'unknown'}`, 6500, 'warning');
          }
        }
      }

      const now = new Date();
      const scheduleDates = Array.from({ length: PRAYER_SCHEDULE_DAY_WINDOW }, (_, index) => {
        const date = new Date(now);
        date.setDate(date.getDate() + index);
        return date;
      });

      const dayData = await Promise.all(
        scheduleDates.map((date) => getPrayerTimesForDate(date).catch(() => null))
      );

      const plannedRaw: PlannedPrayerNotification[] = [];
      for (const data of dayData) {
        if (!data) continue;
        for (const prayer of data.prayers) {
          plannedRaw.push(...buildPrayerNotifications(prayer, now));
        }
      }

      const seen = new Set<string>();
      const planned = plannedRaw.filter((item) => {
        const key = `${item.data.type}:${item.data.prayerName}:${item.fireAt.toISOString()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      await clearScheduledPrayerNotifications();

      let scheduledCount = 0;
      const scheduleErrors: string[] = [];

      for (const item of planned) {
        const notifType = item.data.type;

        const prayerChannelId =
          notifType === 'jamaat-10' || notifType === 'jamaat-start'
            ? PRAYER_JAMAAT_CHANNEL_ID
            : notifType === 'prayer-start'
            ? PRAYER_ADHAAN_CHANNEL_ID
            : PRAYER_ALERT_CHANNEL_ID; // prayer-reminder-60 / prayer-reminder-30

        const scheduledSound =
          notifType === 'jamaat-10' || notifType === 'jamaat-start'
            ? IQAMAH_BACKGROUND_SOUND_FILE
            : notifType === 'prayer-start'
            ? ADHAAN_BACKGROUND_SOUND_FILE
            : 'default'; // gentle alert for 1hr / 30min reminders

        const trigger = Platform.OS === 'android'
          ? ({ type: 'date', date: item.fireAt, channelId: prayerChannelId } as unknown as import('expo-notifications').NotificationTriggerInput)
          : (item.fireAt as unknown as import('expo-notifications').NotificationTriggerInput);

        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: item.title,
              body: item.body,
              sound: scheduledSound,
              categoryIdentifier: PRAYER_NOTIFICATION_CATEGORY_ID,
              data: item.data,
            },
            trigger,
          });
          scheduledCount++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          scheduleErrors.push(msg);
        }
      }

      if (__DEV__) {
        if (scheduleErrors.length > 0) {
          showBanner(
            `Prayer scheduling: ${scheduledCount}/${planned.length} ok`,
            `First error: ${scheduleErrors[0]}`,
            8000,
            'warning',
          );
        } else if (scheduledCount === 0 && planned.length > 0) {
          showBanner(
            'Prayer scheduling failed',
            'No notifications were scheduled. Check exact alarm permission in Android settings.',
            8000,
            'warning',
          );
        } else {
          showBanner(
            `Prayer notifications scheduled`,
            `${scheduledCount} notifications scheduled for next ${PRAYER_SCHEDULE_DAY_WINDOW} days.`,
            4500,
          );
        }
      }
    } catch {
      // Ignore transient scheduling failures; next refresh will retry.
    } finally {
      schedulingPrayerNotificationsRef.current = false;
    }
  }, [clearScheduledPrayerNotifications, ensurePrayerNotificationPermission, showBanner]);

  useEffect(() => {
    if (Platform.OS === 'web' || !Notifications) return;

    void schedulePrayerNotifications();

    const intervalId = setInterval(() => {
      void schedulePrayerNotifications();
    }, PRAYER_SCHEDULE_REFRESH_MS);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void schedulePrayerNotifications();
      }
    });

    return () => {
      clearInterval(intervalId);
      appStateSub.remove();
    };
  }, [schedulePrayerNotifications]);

  const maybeNotifyLiveStart = useCallback(async () => {
    if (Platform.OS === 'web' || !Notifications) return;

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
          body: "Tap to open Jami' Masjid Noorani live stream.",
          sound: 'default',
          data: { route: '/stream', type: 'jmn-live' },
        },
        trigger: liveTrigger,
      });
    } catch {}

    await AsyncStorage.setItem(LIVE_NOTIFY_TS_KEY, String(now));
  }, []);

  useEffect(() => {
    if (!transitionedToLive) return;

    showBanner(
      'JMN Radio is now live',
      'Tap Live to listen now.',
      undefined,
      'default',
      'جے ایم این ریڈیو اب براہِ راست ہے۔ سننے کے لیے لائیو ٹیب کھولیں۔',
      openLiveStreamFromIntent,
    );
    void maybeNotifyLiveStart();
  }, [maybeNotifyLiveStart, openLiveStreamFromIntent, showBanner, transitionedToLive]);

  const tabBarStyle = {
    height: Platform.select({
      ios: insets.bottom + 60,
      android: insets.bottom + 60,
      default: 70,
    }),
    paddingTop: 8,
    paddingBottom: Platform.select({
      ios: insets.bottom + 8,
      android: insets.bottom + 8,
      default: 8,
    }),
    paddingHorizontal: 16,
    backgroundColor: darkMode ? '#0A0F1E' : Colors.navBackground,
    borderTopWidth: 1,
    borderTopColor: darkMode ? '#1E2D47' : Colors.border,
  };

  const hiddenRoutes = ['howto', 'events', 'youtube-live', 'qaseedah-naat', 'qaseedah-viewer', 'qaseedah-group', 'settings'] as const;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: darkMode ? '#69A8FF' : Colors.primary,
        tabBarInactiveTintColor: darkMode ? '#415870' : Colors.textSubtle,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialIcons name="home" size={size} color={color} />
              {hasRecentPushSuccess ? <PushSuccessFlag /> : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: 'Prayer',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="access-time" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="duas"
        options={{
          title: 'Duas',
          tabBarLabel: 'Duas',
          href: '/duas',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="menu-book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          title: 'Quran',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="auto-stories" size={size} color={color} />
          ),
        }}
      />
      {hiddenRoutes.map((name) => (
        <Tabs.Screen key={name} name={name} options={HIDDEN_TAB_OPTIONS} />
      ))}
      <Tabs.Screen
        name="stream"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialIcons name="live-tv" size={size} color={color} />
              {isLive ? <LiveDot /> : null}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
