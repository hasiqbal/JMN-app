import React, { useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Colors, Radius } from '@/constants/theme';
import { HomeTheme, HomeSectionKickers } from '@/constants/homeTheme';

export type QuickAccessAction = {
  icon: string;
  label: string;
  route: string;
  accent: string;
};

type HomeQuickAccessSectionProps = {
  nightMode: boolean;
  actions?: QuickAccessAction[];
};

export const DEFAULT_QUICK_ACCESS_ACTIONS: QuickAccessAction[] = [
  { icon: 'campaign',      label: 'Events & News', route: '/(tabs)/events', accent: '#107C55' },
  { icon: 'help-outline',  label: 'How to Guides',   route: '/(tabs)/howto',  accent: '#3A7C6A' },
  { icon: 'auto-stories',  label: 'Duas & Adhkar', route: '/(tabs)/duas',   accent: '#5E7854' },
  { icon: 'library-books', label: 'Qaseedahs & Naats', route: '/(tabs)/qaseedah-naat', accent: '#2B6A6F' },
];

function ShortcutButton({
  action,
  flex,
}: {
  action: QuickAccessAction;
  flex: number;
}) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const onIn = () =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 60, bounciness: 3 }).start();
  const onOut = () =>
    Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 45, bounciness: 2 }).start();

  const iconBg = action.accent + '18'; // ~9% opacity tint

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => router.push(action.route as any)}
      onPressIn={onIn}
      onPressOut={onOut}
      style={{ flex }}
    >
      <Animated.View style={[styles.shortcut, { transform: [{ scale }] }]}>
        <View style={[styles.shortcutIconCircle, { backgroundColor: iconBg }]}>
          <MaterialIcons name={action.icon as any} size={20} color={action.accent} />
        </View>
        <Text style={styles.shortcutLabel} numberOfLines={2}>{action.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function HomeQuickAccessSection({
  nightMode: _nightMode,
  actions = DEFAULT_QUICK_ACCESS_ACTIONS,
}: HomeQuickAccessSectionProps) {
  return (
    <View style={styles.root}>
      {/* Section kicker */}
      <View style={styles.kickerRow}>
        <View style={styles.kickerAccentBar} />
        <Text style={styles.kicker}>{HomeSectionKickers.quickAccess}</Text>
      </View>

      {/* Shortcut dock card */}
      <View style={styles.dock}>
        {actions.map((action, i) => (
          <React.Fragment key={action.label}>
            {i > 0 && <View style={styles.dockDivider} />}
            <ShortcutButton action={action} flex={1} />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginBottom: 10,
    marginTop: 0,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  kickerAccentBar: {
    width: 3,
    height: 11,
    borderRadius: 2,
    backgroundColor: HomeTheme.sectionKicker,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: HomeTheme.sectionKicker,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 28,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F3F8F4',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#D8E8DC',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 4px rgba(16,124,85,0.05)' }
      : {
          shadowColor: '#107C55',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
        }),
    elevation: 1,
    overflow: 'hidden',
  },
  dockDivider: {
    width: 1,
    backgroundColor: 'rgba(180,210,188,0.38)',
    marginVertical: 14,
  },
  shortcut: {
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    gap: 6,
  },
  shortcutIconCircle: {
    width: 37,
    height: 37,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
    color: '#2E3D32',
    textAlign: 'center',
    lineHeight: 14,
  },
});
