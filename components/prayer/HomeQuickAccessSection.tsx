import React, { useRef } from 'react';
import {
  Animated,
  Linking,
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
  accent: string;
} & (
  | { route: string; externalUrl?: never }
  | { route?: never; externalUrl: string }
);

type HomeQuickAccessSectionProps = {
  nightMode: boolean;
  actions?: QuickAccessAction[];
};

export const DEFAULT_QUICK_ACCESS_ACTIONS: QuickAccessAction[] = [
  { icon: 'campaign',      label: 'Events & News', route: '/(tabs)/events', accent: '#107C55' },
  { icon: 'help-outline',  label: 'How to Guides',   route: '/(tabs)/howto',  accent: '#3A7C6A' },
  { icon: 'auto-stories',  label: 'Duas & Adhkar', route: '/(tabs)/duas',   accent: '#5E7854' },
  {
    icon: 'school',
    label: 'JMN Madrasah',
    externalUrl: 'https://form.jotform.com/242173841501348',
    accent: '#6D5E2E',
  },
  { icon: 'library-books', label: 'Qaseedahs & Naats', route: '/(tabs)/qaseedah-naat', accent: '#2B6A6F' },
];

function ShortcutButton({
  action,
}: {
  action: QuickAccessAction;
}) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const onIn = () =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 60, bounciness: 3 }).start();
  const onOut = () =>
    Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 45, bounciness: 2 }).start();

  const iconBg = action.accent + '18'; // ~9% opacity tint
  const handlePress = () => {
    if ('externalUrl' in action && action.externalUrl) {
      Linking.openURL(action.externalUrl).catch(() => {});
      return;
    }

    router.push(action.route as any);
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      onPressIn={onIn}
      onPressOut={onOut}
      style={styles.shortcutButton}
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
  const splitIndex = Math.ceil(actions.length / 2);
  const topRowActions = actions.slice(0, splitIndex);
  const bottomRowActions = actions.slice(splitIndex);
  const hasBottomRow = bottomRowActions.length > 0;
  const missingBottomSlots = hasBottomRow ? topRowActions.length - bottomRowActions.length : 0;

  return (
    <View style={styles.root}>
      {/* Section kicker */}
      <View style={styles.kickerRow}>
        <View style={styles.kickerAccentBar} />
        <Text style={styles.kicker}>{HomeSectionKickers.quickAccess}</Text>
      </View>

      {/* Shortcut dock card */}
      <View style={styles.dock}>
        <View style={styles.dockRow}>
          {topRowActions.map((action) => (
            <ShortcutButton key={action.label} action={action} />
          ))}
        </View>

        {bottomRowActions.length > 0 && (
          <>
            <View style={styles.dockRowDivider} />
            <View style={styles.dockRow}>
              {missingBottomSlots > 0 && <View style={[styles.shortcutButton, styles.shortcutGhost]} />}
              {bottomRowActions.map((action) => (
                <ShortcutButton key={action.label} action={action} />
              ))}
            </View>
          </>
        )}
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
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: '#F3F8F4',
    borderRadius: Radius.md,
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
  dockRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dockRowDivider: {
    height: 1,
    backgroundColor: 'rgba(180,210,188,0.32)',
    marginHorizontal: 12,
  },
  shortcutButton: {
    flex: 1,
    minHeight: 82,
  },
  shortcutGhost: {
    opacity: 0,
    pointerEvents: 'none',
  },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 6,
  },
  shortcutIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
    color: '#2E3D32',
    textAlign: 'center',
    lineHeight: 14,
  },
});
