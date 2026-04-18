import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';

type PrayerDrawerTriggerProps = {
  nightMode: boolean;
  onPress: () => void;
  attached?: boolean;
};

const NIGHT = {
  panel: '#122034',
  panelBorder: 'rgba(170, 225, 196, 0.16)',
  text: '#EAF4F0',
  sub: '#A9C4B8',
  icon: '#9BE5A8',
  handle: 'rgba(229, 243, 236, 0.5)',
};

const ATTACHED = {
  icon:   '#E8B84B',             // warm gold
  text:   '#FCF8F2',             // hero textPrimary warm white
  sub:    '#E2F4EA',             // brighter mint for clearer CTA
  handle: 'rgba(200, 226, 212, 0.38)',
};

export default function PrayerDrawerTrigger({ nightMode, onPress, attached }: PrayerDrawerTriggerProps) {
  const textColor  = attached ? ATTACHED.text  : nightMode ? NIGHT.text  : undefined;
  const hintColor  = attached ? ATTACHED.sub   : nightMode ? NIGHT.sub   : undefined;
  const arrowColor = attached ? ATTACHED.sub   : nightMode ? NIGHT.sub   : '#6C8C7A';
  const iconBadgeStyle = attached ? styles.iconBadgeAttached : nightMode ? styles.iconBadgeNight : styles.iconBadgeDay;
  const handleStyle = attached
    ? { backgroundColor: ATTACHED.handle }
    : nightMode ? { backgroundColor: NIGHT.handle } : undefined;

  const inner = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Open today's salah drawer"
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.panel,
        attached ? styles.panelAttached : nightMode ? styles.panelNight : styles.panelDay,
      ]}
    >
      <View style={[styles.handle, handleStyle]} />
      <View style={styles.row}>
        <View style={styles.leftMeta}>
          <View style={[styles.iconBadge, iconBadgeStyle]}>
            <Image
              source={require('../../assets/images/masjid-building.jpg')}
              style={styles.iconImage}
              resizeMode="cover"
            />
          </View>
          <Text style={[styles.title, textColor ? { color: textColor } : undefined]}>Today&apos;s Salah</Text>
        </View>
        <View style={styles.rightMeta}>
          <Text
            style={[styles.hint, hintColor ? { color: hintColor } : undefined]}
            numberOfLines={1}
          >
            View prayer times
          </Text>
          <MaterialIcons name="keyboard-arrow-up" size={17} color={arrowColor} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (attached) return inner;

  return (
    <View style={styles.container}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: 9,
    paddingBottom: 11,
    minHeight: 62,
  },
  panelDay: {
    backgroundColor: 'rgba(236, 246, 239, 0.98)',
    borderColor: 'rgba(43, 117, 76, 0.13)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 9px rgba(10,63,40,0.06)' }
      : {
          shadowColor: '#0A3F28',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 9,
        }),
    elevation: 1,
  },
  panelNight: {
    backgroundColor: NIGHT.panel,
    borderColor: NIGHT.panelBorder,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 9px rgba(0,0,0,0.16)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.16,
          shadowRadius: 9,
        }),
    elevation: 2,
  },
  panelAttached: {
    backgroundColor: 'rgba(30, 94, 65, 0.90)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(236, 244, 238, 0.18)',
    paddingHorizontal: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(43, 117, 76, 0.26)',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 30,
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
  },
  iconBadgeDay: {
    borderColor: 'rgba(42, 94, 66, 0.22)',
  },
  iconBadgeNight: {
    borderColor: 'rgba(155, 229, 168, 0.34)',
  },
  iconBadgeAttached: {
    borderColor: 'rgba(239, 214, 156, 0.6)',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.15,
  },
  rightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  hint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D8577',
    letterSpacing: 0.2,
  },
});
