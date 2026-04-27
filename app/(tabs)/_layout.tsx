import { MaterialIcons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, StyleSheet, Animated, AppState } from 'react-native';
import { useRef, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useJmnLiveStatus } from '@/hooks/useJmnLiveStatus';
import {
  setAdhaanMutedEnabled,
  stopActiveAdhaan,
  useQuranPrayerPopups,
} from '@/hooks/useQuranPrayerPopups';
import { getPrayerTimesForDate, PrayerTime } from '@/services/prayerService';
import { syncPushTokenWithBackend } from '@/services/pushRegistrationService';
import { useInAppBanner } from '@/template';

type ExpoNotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<ExpoNotificationsModule | null> | null = null;

async function getNotificationsModule(): Promise<ExpoNotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((mod) => mod)
      .catch(() => null);
  }
  return notificationsModulePromise;
}

const HIDDEN_TAB_OPTIONS = { href: null };
const LIVE_NOTIFICATION_CHANNEL_ID = 'jmn-live-v2';
const LIVE_NOTIFY_KEY = 'jmn_radio_notify';
const LIVE_NOTIFY_TS_KEY = 'jmn_last_live_notify_ts';
const LIVE_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;
const LIVE_PRAYER_COMBINE_WINDOW_MS = 20 * 1000;
const PRAYER_ADHAAN_CHANNEL_ID = 'jmn-prayer-adhaan-v5';
const PRAYER_JAMAAT_CHANNEL_ID = 'jmn-prayer-jamaat-v5';
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
const JAMAAT_REMINDER_MINUTES = 10;
const NOTIFICATION_MIN_LEAD_MS = 30 * 1000;
const ANDROID_PRAYER_START_ADVANCE_MS = 60 * 1000;
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const FARD_PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

const NON_PRAYABLE_NAMES = new Set(['Sunrise', 'Ishraq', 'Zawaal']);

type PlannedPrayerNotification = {
  title: string;
  body: string;
  fireAt: Date;
  data: {
    scope: string;
    type: 'prayer-start' | 'jamaat-10';
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

  // Some datasets may store iqamah in 12-hour style (e.g. 1:30) while
  // prayer start is in 24-hour style (e.g. 13:00). If parsed time appears to
  // be in the past for this prayer, roll forward by 12h when reasonable.
  if (parsed.getTime() < baseDate.getTime() - 5 * 60 * 1000) {
    const plusTwelve = new Date(parsed.getTime() + 12 * 60 * 60 * 1000);
    if (plusTwelve.getTime() >= baseDate.getTime() - 5 * 60 * 1000) {
      return plusTwelve;
    }
  }

  return parsed;
}

function buildPrayerNotifications(prayer: PrayerTime, now: Date): PlannedPrayerNotification[] {
  if (NON_PRAYABLE_NAMES.has(prayer.name)) return [];

  const notifications: PlannedPrayerNotification[] = [];
  const prayerStart = prayer.timeDate;
  const prayerStartNotifyAt = Platform.OS === 'android'
    ? new Date(prayerStart.getTime() - ANDROID_PRAYER_START_ADVANCE_MS)
    : prayerStart;

  if (prayerStartNotifyAt.getTime() - now.getTime() > NOTIFICATION_MIN_LEAD_MS) {
    notifications.push({
      title: `${prayer.name} prayer time`,
      body: `Azaan for ${prayer.name} has started.`,
      fireAt: prayerStartNotifyAt,
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

  const jamaatReminderDate = new Date(iqamahDate.getTime() - JAMAAT_REMINDER_MINUTES * 60 * 1000);
  if (jamaatReminderDate.getTime() - now.getTime() <= NOTIFICATION_MIN_LEAD_MS) {
    return notifications;
  }

  notifications.push({
    title: `${prayer.name} jamaat in ${JAMAAT_REMINDER_MINUTES} minutes`,
    body: `As-salatu khayrun minan nawm. ${prayer.name} jamaat starts in ${JAMAAT_REMINDER_MINUTES} minutes.`,
    fireAt: jamaatReminderDate,
    data: {
      scope: PRAYER_NOTIFICATION_SCOPE,
      type: 'jamaat-10',
      prayerName: prayer.name,
      route: '/prayer',
    },
  });

  return notifications;
}

async function ensureAndroidLiveNotificationChannel(): Promise<void> {
  const Notifications = await getNotificationsModule();
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
  const Notifications = await getNotificationsModule();
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

const dotStyles = StyleSheet.create({
  dot: {
    position: 'absolute', top: -2, right: -4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ff2222',
    borderWidth: 1.5, borderColor: '#fff',
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

  useQuranPrayerPopups();

  useEffect(() => {
    if (!__DEV__ || !IS_EXPO_GO) return;
    showBanner(
      'Running in Expo Go',
      'Background adhaan tests are unreliable in Expo Go. Open the installed JMN build app instead.',
      9000,
      'warning',
    );
  }, [showBanner]);

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

  const maybeMarkPushSuccess = useCallback((rawData: unknown) => {
    const data = parseNotificationData(rawData);
    if (!data) return;

    const notificationId = typeof data.notificationId === 'string' ? data.notificationId.trim() : '';
    if (!notificationId) return;
  }, [parseNotificationData]);

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

    const setup = async () => {
      const Notifications = await getNotificationsModule();
      if (!mounted || !Notifications) return;

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
        void maybeMarkPushSuccess(notification.request.content.data);
      });
    };

    void setup();

    return () => {
      mounted = false;
      sub?.remove();
      receivedSub?.remove();
    };
  }, [maybeMarkPushSuccess, routeFromNotificationData, router, showBanner]);

  useEffect(() => {
    const setup = async () => {
      const Notifications = await getNotificationsModule();
      if (!Notifications) return;

      await ensureAndroidLiveNotificationChannel();
      await ensureAndroidPrayerNotificationChannels();

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
    };

    void setup();
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

      await ensureAndroidPrayerNotificationChannels();

      // Local prayer scheduling does not depend on push token sync; skip this in Expo Go.
      if (!IS_EXPO_GO) {
        await syncPushTokenWithBackend(Notifications).catch(() => {
          return { synced: false, reason: 'exception' } as const;
        });
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

      if (__DEV__) {
        const hasTypeForPrayer = (type: PlannedPrayerNotification['data']['type'], prayerName: string) =>
          planned.some((item) => item.data.type === type && item.data.prayerName === prayerName);

        const missingPrayerStart = FARD_PRAYER_NAMES.filter((name) => !hasTypeForPrayer('prayer-start', name));
        const missingJamaatReminder = FARD_PRAYER_NAMES.filter((name) => !hasTypeForPrayer('jamaat-10', name));

        if (missingPrayerStart.length > 0 || missingJamaatReminder.length > 0) {
          showBanner(
            'Prayer schedule coverage warning',
            `Missing prayer-start: ${missingPrayerStart.join(', ') || 'none'}; missing jamaat-10: ${missingJamaatReminder.join(', ') || 'none'}.`,
            10000,
            'warning',
          );
        }
      }

      await clearScheduledPrayerNotifications();

      for (const item of planned) {
        const useIqamahSound = item.data.type === 'jamaat-10';

        const prayerChannelId = useIqamahSound
          ? PRAYER_JAMAAT_CHANNEL_ID
          : PRAYER_ADHAAN_CHANNEL_ID;

        const scheduledSound = useIqamahSound
          ? IQAMAH_BACKGROUND_SOUND_FILE
          : ADHAAN_BACKGROUND_SOUND_FILE;

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
        } catch {
          // Ignore individual schedule failures; future refreshes will retry.
        }
      }
    } catch {
      // Ignore transient scheduling failures; next refresh will retry.
    } finally {
      schedulingPrayerNotificationsRef.current = false;
    }
  }, [clearScheduledPrayerNotifications, ensurePrayerNotificationPermission, showBanner]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

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

    const getTriggerTimeMs = (trigger: unknown): number | null => {
      if (!trigger || typeof trigger !== 'object') return null;
      const maybeDate = (trigger as { date?: unknown }).date;
      if (!maybeDate) return null;
      if (maybeDate instanceof Date) return maybeDate.getTime();
      if (typeof maybeDate === 'number') return maybeDate;
      if (typeof maybeDate === 'string') {
        const parsed = Date.parse(maybeDate);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    const overlappingPrayer = scheduled
      .filter((item) => {
        const data = item.content.data as Record<string, unknown> | undefined;
        if (data?.scope !== PRAYER_NOTIFICATION_SCOPE) return false;
        const triggerTs = getTriggerTimeMs(item.trigger);
        if (!Number.isFinite(triggerTs)) return false;
        return Math.abs((triggerTs as number) - now) <= LIVE_PRAYER_COMBINE_WINDOW_MS;
      })
      .sort((a, b) => {
        const aTs = getTriggerTimeMs(a.trigger) ?? 0;
        const bTs = getTriggerTimeMs(b.trigger) ?? 0;
        return aTs - bTs;
      })[0];

    const combinedData = (overlappingPrayer?.content?.data ?? null) as Record<string, unknown> | null;
    const combinedType = typeof combinedData?.type === 'string' ? combinedData.type : null;
    const combinedPrayerName = typeof combinedData?.prayerName === 'string' ? combinedData.prayerName : 'Prayer';
    const combiningWithPrayer = combinedType === 'jamaat-10' || combinedType === 'prayer-start';

    if (combiningWithPrayer && typeof overlappingPrayer?.identifier === 'string') {
      await Notifications.cancelScheduledNotificationAsync(overlappingPrayer.identifier).catch(() => {});
    }

    const useIqamahSound = combinedType === 'jamaat-10';
    const liveOrCombinedChannelId = combiningWithPrayer
      ? (useIqamahSound ? PRAYER_JAMAAT_CHANNEL_ID : PRAYER_ADHAAN_CHANNEL_ID)
      : LIVE_NOTIFICATION_CHANNEL_ID;

    const liveTrigger = Platform.OS === 'android'
      ? ({ type: 'timeInterval', seconds: 1, channelId: liveOrCombinedChannelId } as unknown as import('expo-notifications').NotificationTriggerInput)
      : null;

    const combinedTitle = combinedType === 'jamaat-10'
      ? `JMN Radio live • ${combinedPrayerName} jamaat in ${JAMAAT_REMINDER_MINUTES} min`
      : `JMN Radio live • ${combinedPrayerName} prayer time`;

    const combinedBody = combinedType === 'jamaat-10'
      ? `${combinedPrayerName} jamaat starts in ${JAMAAT_REMINDER_MINUTES} minutes. Tap to open live stream.`
      : `${combinedPrayerName} time has started. Tap to open JMN live stream.`;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: combiningWithPrayer ? combinedTitle : 'JMN Radio is now live',
          body: combiningWithPrayer ? combinedBody : "Tap to open Jami' Masjid Noorani live stream.",
          sound: combiningWithPrayer
            ? (useIqamahSound ? IQAMAH_BACKGROUND_SOUND_FILE : ADHAAN_BACKGROUND_SOUND_FILE)
            : 'default',
          data: combiningWithPrayer
            ? {
                route: '/stream',
                type: 'jmn-live-prayer-combined',
                prayerType: combinedType,
                prayerName: combinedPrayerName,
              }
            : { route: '/stream', type: 'jmn-live' },
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
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
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
