import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert, Platform, View, StyleSheet, Animated } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import { useQuranPrayerPopups } from '@/hooks/useQuranPrayerPopups';
import { fetchLiveStatus } from '@/services/liveService';

type ExpoNotificationsModule = typeof import('expo-notifications');

const Notifications: ExpoNotificationsModule | null =
  Platform.OS === 'web' ? null : require('expo-notifications');

const HIDDEN_TAB_OPTIONS = { href: null };
const LIVE_POLL_MS = 30000;
const LIVE_NOTIFY_KEY = 'jmn_radio_notify';
const LIVE_NOTIFY_TS_KEY = 'jmn_last_live_notify_ts';
const LIVE_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000;
const EXPO_GO_NOTIFICATIONS_FALLBACK =
  Constants.appOwnership === 'expo' &&
  Number((Constants.expoConfig?.sdkVersion ?? '0').split('.')[0] || 0) >= 53;

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
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const [isLive, setIsLive] = useState(false);
  const previousLiveRef = useRef<boolean | null>(null);

  useQuranPrayerPopups();

  useEffect(() => {
    if (Platform.OS !== 'android' || !Notifications) return;
    Notifications.setNotificationChannelAsync('jmn-live', {
      name: 'JMN Live Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    }).catch(() => {});
  }, []);

  const maybeNotifyLiveStart = async () => {
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
      Alert.alert('JMN Radio is now live', "Open the Live tab to listen now.");
      await AsyncStorage.setItem(LIVE_NOTIFY_TS_KEY, String(now));
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'JMN Radio is now live',
          body: "Tap to open Jami' Masjid Noorani live stream.",
          sound: 'default',
          channelId: 'jmn-live',
          data: { route: '/stream', type: 'jmn-live' },
        },
        trigger: null,
      });
    } catch {
      Alert.alert('JMN Radio is now live', "Open the Live tab to listen now.");
    }

    await AsyncStorage.setItem(LIVE_NOTIFY_TS_KEY, String(now));
  };

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const live = await fetchLiveStatus();
      if (cancelled) return;

      if (previousLiveRef.current === false && live) {
        void maybeNotifyLiveStart();
      }

      previousLiveRef.current = live;
      setIsLive(live);
    };
    poll();
    const id = setInterval(poll, LIVE_POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

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
    backgroundColor: nightMode ? '#0A0F1E' : Colors.surface,
    borderTopWidth: 1,
    borderTopColor: nightMode ? '#1E2D47' : Colors.border,
  };

  const hiddenRoutes = ['howto', 'events', 'youtube-live'] as const;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: nightMode ? '#69A8FF' : Colors.primary,
        tabBarInactiveTintColor: nightMode ? '#415870' : Colors.textSubtle,
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
