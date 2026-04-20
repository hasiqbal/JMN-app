import React, { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type ScheduleSection = {
  key: 'eid' | 'jumuah';
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  items: string[];
};

type AlertTone = 'default' | 'live' | 'warning' | 'special';

export type HeroNewsLiveAlert = {
  label: string;
  message: string;
  tone?: AlertTone;
  flashing?: boolean;
  icon?: string;
};

const ALERT_TONE_PALETTES: Record<AlertTone, {
  banner: readonly [string, string];
  badge: readonly [string, string];
  badgeDot: string;
  badgeText: string;
  alertBg: string;
  alertBorder: string;
  alertText: string;
}> = {
  default: {
    banner: ['rgba(11,24,24,0.72)', 'rgba(7,15,16,0.66)'],
    badge: ['rgba(26,110,74,0.78)', 'rgba(14,75,54,0.74)'],
    badgeDot: '#86F3C4',
    badgeText: '#ECFAF2',
    alertBg: 'rgba(38,124,84,0.14)',
    alertBorder: 'rgba(152,236,200,0.28)',
    alertText: '#EFFFF6',
  },
  live: {
    banner: ['rgba(13,55,37,0.8)', 'rgba(9,35,24,0.72)'],
    badge: ['rgba(49,153,105,0.9)', 'rgba(24,112,76,0.86)'],
    badgeDot: '#B9FFD9',
    badgeText: '#F5FFFA',
    alertBg: 'rgba(62,185,128,0.2)',
    alertBorder: 'rgba(165,255,221,0.4)',
    alertText: '#F8FFFC',
  },
  warning: {
    banner: ['rgba(255,146,0,0.9)', 'rgba(214,108,0,0.84)'],
    badge: ['rgba(255,168,28,0.96)', 'rgba(232,128,0,0.92)'],
    badgeDot: '#FFE2A4',
    badgeText: '#FFF9ED',
    alertBg: 'rgba(255,178,43,0.3)',
    alertBorder: 'rgba(255,220,142,0.52)',
    alertText: '#FFF9EE',
  },
  special: {
    banner: ['rgba(18,44,74,0.8)', 'rgba(10,28,50,0.72)'],
    badge: ['rgba(48,112,173,0.88)', 'rgba(29,83,132,0.84)'],
    badgeDot: '#B9DCFF',
    badgeText: '#ECF6FF',
    alertBg: 'rgba(56,132,200,0.2)',
    alertBorder: 'rgba(166,213,255,0.36)',
    alertText: '#EDF7FF',
  },
};

type ParsedScheduleBanner = {
  eid: string[];
  jumuah: string[];
};

export function parseHeroNewsSchedule(note: string): ParsedScheduleBanner | null {
  const text = (note || '').trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  const hasEid = lower.includes('eid prayers:');
  const hasJumuah = lower.includes('jummah prayers:') || lower.includes('jumuah prayers:') || lower.includes('jummah times:') || lower.includes('jumuah times:');
  if (!hasEid && !hasJumuah) return null;

  const splitByDots = text
    .split('·')
    .map((part) => part.trim())
    .filter(Boolean);

  const eid: string[] = [];
  const jumuah: string[] = [];
  let mode: 'eid' | 'jumuah' | null = null;

  for (const chunk of splitByDots) {
    const normalized = chunk.replace(/^\s+|\s+$/g, '');
    const lowerChunk = normalized.toLowerCase();

    if (lowerChunk.startsWith('eid prayers:')) {
      mode = 'eid';
      const first = normalized.replace(/eid prayers:\s*/i, '').trim();
      if (first) eid.push(first);
      continue;
    }

    if (
      lowerChunk.startsWith('jummah prayers:')
      || lowerChunk.startsWith('jumuah prayers:')
      || lowerChunk.startsWith('jummah times:')
      || lowerChunk.startsWith('jumuah times:')
    ) {
      mode = 'jumuah';
      const first = normalized.replace(/jum+u?ah (times|prayers):\s*/i, '').trim();
      if (first) jumuah.push(first);
      continue;
    }

    if (mode === 'eid') {
      eid.push(normalized);
    } else if (mode === 'jumuah') {
      jumuah.push(normalized);
    }
  }

  if (eid.length === 0 && jumuah.length === 0) return null;
  return { eid, jumuah };
}

function buildScheduleSections(parsed: ParsedScheduleBanner): ScheduleSection[] {
  const sections: ScheduleSection[] = [];

  if (parsed.eid.length > 0) {
    sections.push({
      key: 'eid',
      title: 'EID PRAYERS',
      icon: 'auto-awesome',
      items: parsed.eid,
    });
  }

  if (parsed.jumuah.length > 0) {
    sections.push({
      key: 'jumuah',
      title: 'JUMUAH TIMES',
      icon: 'star',
      items: parsed.jumuah,
    });
  }

  return sections;
}

function parseScheduleItem(value: string, index: number): { label: string; time: string } {
  const trimmed = value.trim();
  const match = trimmed.match(/^([^:]+):\s*(.+)$/);

  if (match) {
    return {
      label: match[1].trim(),
      time: match[2].trim(),
    };
  }

  return {
    label: `${index + 1}th`,
    time: trimmed,
  };
}

export default function HeroNewsBar({
  note,
  fallbackText,
  showNewsLabel = true,
  liveAlert,
  style,
}: {
  note: string;
  fallbackText?: string;
  showNewsLabel?: boolean;
  liveAlert?: HeroNewsLiveAlert | null;
  style?: StyleProp<ViewStyle>;
}) {
  const resolvedAlertMessage = liveAlert?.message?.trim() ?? '';
  const hasLiveAlert = resolvedAlertMessage.length > 0;
  const parsedSchedule = parseHeroNewsSchedule(note);
  const scheduleSections = parsedSchedule ? buildScheduleSections(parsedSchedule) : [];
  const hasScheduleSections = scheduleSections.length > 0;
  const alertTone: AlertTone = liveAlert?.tone ?? 'default';
  const tonePalette = ALERT_TONE_PALETTES[alertTone];
  const showDetailMessage = alertTone !== 'warning';
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pulseAnim.stopAnimation();

    if (liveAlert?.flashing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 450, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }

    pulseAnim.setValue(1);
    return undefined;
  }, [liveAlert?.flashing, pulseAnim]);

  if (!hasLiveAlert && !hasScheduleSections && !fallbackText) return null;

  const badgeLabel = (liveAlert?.label?.trim() || 'Alert').toUpperCase();
  const alertIcon = (liveAlert?.icon ?? (alertTone === 'warning' ? 'schedule' : 'notifications-active')) as any;

  if (!hasLiveAlert && hasScheduleSections) {
    return (
      <LinearGradient
        colors={['rgba(15,67,44,0.98)', 'rgba(7,40,27,0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.scheduleBanner, style]}
      >
        <LinearGradient
          colors={['rgba(255,247,228,0.10)', 'rgba(255,255,255,0.00)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.scheduleInnerHighlight, { pointerEvents: 'none' }]}
        />
        {scheduleSections.map((section, sectionIndex) => {
          const parsedItems = section.items.map(parseScheduleItem);

          return (
            <View
              key={section.key}
              style={[
                styles.scheduleSection,
                sectionIndex < scheduleSections.length - 1 && styles.scheduleSectionSpacing,
              ]}
            >
              <View style={styles.scheduleHeader}>
                <MaterialIcons name={section.icon} size={12} color="#C9A95B" />
                <Text style={styles.scheduleTitle}>{section.title}</Text>
              </View>

              <View style={styles.scheduleGrid}>
                {parsedItems.map((item, itemIndex) => (
                  <React.Fragment key={`${section.key}-${item.label}-${item.time}-${itemIndex}`}>
                    {itemIndex > 0 ? <View style={styles.scheduleDivider} /> : null}
                    <View style={styles.scheduleCell}>
                      <Text style={styles.scheduleLabel}>{item.label}</Text>
                      <Text style={styles.scheduleTime}>{item.time}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          );
        })}
      </LinearGradient>
    );
  }

  if (!hasLiveAlert && fallbackText) {
    return (
      <View style={[styles.fallbackWrap, style]}>
        <Text style={styles.fallbackText}>{fallbackText}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={tonePalette.banner}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.banner, !showDetailMessage && styles.bannerBadgeOnly, style]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.00)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.topGloss, { pointerEvents: 'none' }]}
      />

      {showNewsLabel ? (
        <LinearGradient
          colors={tonePalette.badge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.newsBadge}
        >
          <View style={[styles.newsBadgeDot, { backgroundColor: tonePalette.badgeDot }]} />
          <MaterialIcons name={alertIcon} size={12} color={tonePalette.badgeText} />
          <Text style={[styles.newsBadgeText, { color: tonePalette.badgeText }]}>{badgeLabel}</Text>
        </LinearGradient>
      ) : null}

      {showDetailMessage ? (
        <View style={styles.contentWrap}>
          <View style={styles.innerGlassFrame}>
            <LinearGradient
              colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.00)']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={[styles.innerGloss, { pointerEvents: 'none' }]}
            />

            <View style={styles.content}>
              <Animated.View
                style={[
                  styles.liveAlertRow,
                  {
                    backgroundColor: tonePalette.alertBg,
                    borderColor: tonePalette.alertBorder,
                    opacity: pulseAnim,
                  },
                ]}
              >
                <MaterialIcons name={alertIcon} size={12} color={tonePalette.alertText} />
                <Text numberOfLines={2} style={[styles.liveAlertText, { color: tonePalette.alertText }]}>
                  {resolvedAlertMessage}
                </Text>
              </Animated.View>
            </View>
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(8,18,18,0.68)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(241,248,244,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  bannerBadgeOnly: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  topGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  contentWrap: {
    flex: 1,
  },
  innerGlassFrame: {
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(224,241,232,0.08)',
    boxShadow: '0px 3px 8px rgba(2,10,8,0.10)',
    elevation: 1,
    overflow: 'hidden',
  },
  innerGloss: {
    ...StyleSheet.absoluteFillObject,
  },
  newsBadge: {
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(218,244,231,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    boxShadow: '0px 2px 6px rgba(4,17,13,0.12)',
    elevation: 1,
  },
  newsBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  newsBadgeText: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    width: '100%',
    gap: 0,
    paddingTop: 0,
  },
  liveAlertRow: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveAlertText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  scheduleBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(197,224,206,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
    boxShadow: '0px 7px 12px rgba(3,18,11,0.16)',
    elevation: 2,
  },
  scheduleInnerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
  },
  scheduleSection: {
    gap: 10,
  },
  scheduleSectionSpacing: {
    marginBottom: 10,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleTitle: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1.1,
    color: 'rgba(246,239,226,0.9)',
  },
  scheduleGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 0,
  },
  scheduleDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(230,243,233,0.18)',
    marginHorizontal: 4,
  },
  scheduleLabel: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '600',
    color: 'rgba(239,245,241,0.72)',
  },
  scheduleTime: {
    marginTop: 3,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fallbackWrap: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(7,13,28,0.48)',
  },
  fallbackText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: 'rgba(244,247,245,0.9)',
  },
});