import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, StyleSheet, Animated } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import { fetchLiveStatus } from '@/services/liveService';

function LiveDot() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
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

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const live = await fetchLiveStatus();
      if (!cancelled) setIsLive(live);
    };
    poll();
    const id = setInterval(poll, 30000);
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
          title: 'Adhkar',
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
      <Tabs.Screen
        name="howto"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          href: null,
        }}
      />
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
