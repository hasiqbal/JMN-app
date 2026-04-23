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
  isAdhaanMutedEnabled,
  setAdhaanMutedEnabled,
  stopActiveAdhaan,
  useQuranPrayerPopups,
} from '@/hooks/useQuranPrayerPopups';
import { getPrayerTimesForDate, PrayerTime } from '@/services/prayerService';
import { useInAppBanner } from '@/template';

type ExpoNotificationsModule = typeof import('expo-notifications');

const Notifications: ExpoNotificationsModule | null =
  Platform.OS === 'web' ? null : require('expo-notifications');

const HIDDEN_TAB_OPTIONS = { href: null };
const LIVE_NOTIFY_KEY = 'jmn_radio_notify';
const LIVE_NOTIFY_TS_KEY = 'jmn_last_live_notify_ts';
const LIVE_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;
const PRAYER_CHANNEL_ID = 'jmn-prayer';
const PRAYER_SILENT_CHANNEL_ID = 'jmn-prayer-silent';
const PRAYER_SCHEDULE_REFRESH_MS = 15 * 60 * 1000;
const PRAYER_NOTIFICATION_SCOPE = 'jmn-prayer';
const PRAYER_NOTIFICATION_CATEGORY_ID = 'jmn-prayer-controls';
const PRAYER_ACTION_STOP = 'jmn-prayer-stop';
const PRAYER_ACTION_MUTE = 'jmn-prayer-mute';
const JAMAAT_REMINDER_MINUTES = 10;
const NOTIFICATION_MIN_LEAD_MS = 30 * 1000;
const EXPO_GO_NOTIFICATIONS_FALLBACK =
  Constants.appOwnership === 'expo' &&
  Number((Constants.expoConfig?.sdkVersion ?? '0').split('.')[0] || 0) >= 53;

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
  return parsed;
}

function buildPrayerNotifications(prayer: PrayerTime, now: Date): PlannedPrayerNotification[] {
  if (NON_PRAYABLE_NAMES.has(prayer.name)) return [];

  const notifications: PlannedPrayerNotification[] = [];
  const prayerStart = prayer.timeDate;

  if (prayerStart.getTime() - now.getTime() > NOTIFICATION_MIN_LEAD_MS) {
    notifications.push({
      title: `${prayer.name} prayer time`,
      body: `Azaan for ${prayer.name} has started.`,
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
    let data: Record<string, unknown> | null = null;
    if (rawData && typeof rawData === 'object') {
      data = rawData as Record<string, unknown>;
    } else if (typeof rawData === 'string') {
      try {
        const parsed = JSON.parse(rawData) as unknown;
        if (parsed && typeof parsed === 'object') {
          data = parsed as Record<string, unknown>;
        }
      } catch {
        return;
      }
    }

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
  }, [openLiveStreamFromIntent, router]);

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
        void stopActiveAdhaan();
        showBanner('Adhaan stopped', 'Current adhaan playback has been stopped.');
        router.push('/prayer');
        return;
      }

      if (actionIdentifier === PRAYER_ACTION_MUTE) {
        void setAdhaanMutedEnabled(true);
        void stopActiveAdhaan();
        showBanner('Adhaan muted', 'Prayer adhaan sound is now muted. You can unmute from the Prayer tab.');
        router.push('/prayer');
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

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [routeFromNotificationData, router, showBanner]);

  useEffect(() => {
    if (!Notifications) return;

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('jmn-live', {
        name: 'JMN Live Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
      }).catch(() => {});

      Notifications.setNotificationChannelAsync(PRAYER_CHANNEL_ID, {
        name: 'JMN Prayer Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 120, 200],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
      }).catch(() => {});

      Notifications.setNotificationChannelAsync(PRAYER_SILENT_CHANNEL_ID, {
        name: 'JMN Prayer Alerts (Silent)',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 80],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: null,
      }).catch(() => {});
    }

    Notifications.setNotificationCategoryAsync(PRAYER_NOTIFICATION_CATEGORY_ID, [
      {
        identifier: PRAYER_ACTION_STOP,
        buttonTitle: 'Stop adhaan',
        options: { opensAppToForeground: true },
      },
      {
        identifier: PRAYER_ACTION_MUTE,
        buttonTitle: 'Mute adhaan',
        options: { opensAppToForeground: true },
      },
    ]).catch(() => {});
  }, []);

  const ensurePrayerNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !Notifications) return false;
    if (EXPO_GO_NOTIFICATIONS_FALLBACK) return false;

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
      if (!allowed) return;

      const now = new Date();
      const today = new Date(now);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [todayData, tomorrowData] = await Promise.all([
        getPrayerTimesForDate(today).catch(() => null),
        getPrayerTimesForDate(tomorrow).catch(() => null),
      ]);

      const plannedRaw: PlannedPrayerNotification[] = [];
      for (const data of [todayData, tomorrowData]) {
        if (!data) continue;
        for (const prayer of data.prayers) {
          plannedRaw.push(...buildPrayerNotifications(prayer, now));
        }
      }

      const adhaanMuted = await isAdhaanMutedEnabled();
      const prayerChannelId = adhaanMuted ? PRAYER_SILENT_CHANNEL_ID : PRAYER_CHANNEL_ID;

      const seen = new Set<string>();
      const planned = plannedRaw.filter((item) => {
        const key = `${item.data.type}:${item.data.prayerName}:${item.fireAt.toISOString()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      await clearScheduledPrayerNotifications();

      for (const item of planned) {
        const trigger = Platform.OS === 'android'
          ? ({ type: 'date', date: item.fireAt, channelId: prayerChannelId } as unknown as import('expo-notifications').NotificationTriggerInput)
          : (item.fireAt as unknown as import('expo-notifications').NotificationTriggerInput);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: item.title,
            body: item.body,
            sound: adhaanMuted ? undefined : 'default',
            categoryIdentifier: PRAYER_NOTIFICATION_CATEGORY_ID,
            data: item.data,
          },
          trigger,
        });
      }
    } catch {
      // Ignore transient scheduling failures; next refresh will retry.
    } finally {
      schedulingPrayerNotificationsRef.current = false;
    }
  }, [clearScheduledPrayerNotifications, ensurePrayerNotificationPermission]);

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

    if (EXPO_GO_NOTIFICATIONS_FALLBACK) {
      await AsyncStorage.setItem(LIVE_NOTIFY_TS_KEY, String(now));
      return;
    }

    const liveTrigger = Platform.OS === 'android'
      ? ({ type: 'timeInterval', seconds: 1, channelId: 'jmn-live' } as unknown as import('expo-notifications').NotificationTriggerInput)
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
    backgroundColor: darkMode ? '#0A0F1E' : Colors.surface,
    borderTopWidth: 1,
    borderTopColor: darkMode ? '#1E2D47' : Colors.border,
  };

  const hiddenRoutes = ['howto', 'events', 'youtube-live', 'qaseedah-naat', 'qaseedah-viewer', 'qaseedah-group'] as const;

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
            <MaterialIcons name="home" size={size} color={color} />
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
