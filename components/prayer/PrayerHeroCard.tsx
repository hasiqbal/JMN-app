import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const EID_FIREWORK_BURSTS = [
  { top: '16%', left: '14%', color: '#D4B344', delay: 0 },
  { top: '22%', left: '72%', color: '#7FCFC8', delay: 0.2 },
  { top: '42%', left: '58%', color: '#E0C870', delay: 0.4 },
  { top: '54%', left: '24%', color: '#88C888', delay: 0.58 },
] as const;
const FIREWORK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

export type HeroCountdownInfo = {
  label: string;
  value: string;
  note: string;
  flash: boolean;
};

type TimelinePoint = {
  label: string;
  position: number;
};

type Props = {
  visible: boolean;
  embedded?: boolean;
  backgroundSource: any;
  gradientColors: readonly [string, string, ...string[]];
  backgroundImageOpacity?: number;
  heroWide: boolean;
  kicker: string;
  title: string;
  isForbidden: boolean;
  forbiddenEndsAt: string;
  isFridayJumuahHero: boolean;
  isEidHero?: boolean;
  athanValue: string;
  j1: string;
  j2: string;
  eidJamaats?: string[];
  showJamaat: boolean;
  jamaatValue: string;
  countdownInfo: HeroCountdownInfo;
  flashAnim: Animated.Value;
  progress: number;
  athanMarker: number | null;
  jamaatMarker: number | null;
  endMarker: number | null;
  midMarker: number | null;
  startLabel: string;
  startTime: string;
  endLabel: string;
  endTime: string;
  midLabel: string;
  midTime: string;
  timelinePoints?: TimelinePoint[];
  eidTomorrowJamaats?: string[];
  eidTomorrowLabel?: string;
  hasNext: boolean;
  nextPrayerName: string;
  nextPrayerTime: string;
  nextPrayerJamaatValue?: string;
  prayerIcons: Record<string, string>;
  // unified time/date row
  localTime: string;
  ampm: string;
  seconds: string;
  hijriLabel: string;
  loadingHijri?: boolean;
  dayName: string;
  dateShort: string;
  allPrayers?: {
    name: string;
    time: string;
    iqamah: string;
    timeDate?: Date;
    tomorrowIqamah?: string;
  }[];
  onFullTimetable?: () => void;
};

const DOT_DIAMETER = 14;
const TRACK_HEIGHT = 5;
const DOT_OFFSET_TOP = -((DOT_DIAMETER - TRACK_HEIGHT) / 2);
const TIMELINE_LOGO_HALF_WIDTH = 29;
const TIMELINE_PULL_GAP = 0;
const COUNTDOWN_WARNING_SECONDS = 50 * 60;
const COUNTDOWN_CRITICAL_SECONDS = 25 * 60;
const SCHEDULE_ROLL_GAP = 10;

function formatCountdownFriendly(val: string): string {
  const parts = val.split(':').map(Number);
  if (parts.some(Number.isNaN)) return val;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return val;
}

function parseCountdownSeconds(val: string): number | null {
  const parts = val.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return (h * 60 * 60) + (m * 60) + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return (m * 60) + s;
  }
  return null;
}

type ParsedScheduleBanner = {
  eid: string[];
  jumuah: string[];
};

function parseScheduleBanner(note: string): ParsedScheduleBanner | null {
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

function toCompactDayName(dayName: string): string {
  const trimmed = dayName.trim();
  return trimmed.length <= 3 ? trimmed : trimmed.slice(0, 3);
}

function toShortDate(dateShort: string): string {
  return dateShort.replace(/\s+\d{4}\b/, '').trim();
}

function toTitleCase(label: string): string {
  return label.replace(/\b\w/g, (match) => match.toUpperCase());
}

function RollingSchedulePills({
  items,
  prefix,
}: {
  items: string[];
  prefix: string;
}) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const shouldRoll = contentWidth > 0 && viewportWidth > 0 && contentWidth > viewportWidth;

  useEffect(() => {
    translateX.stopAnimation();

    if (!shouldRoll) {
      translateX.setValue(0);
      return;
    }

    const distance = contentWidth + SCHEDULE_ROLL_GAP;
    const duration = Math.max(8000, distance * 30);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(translateX, {
          toValue: -distance,
          duration,
          useNativeDriver: true,
        }),
        Animated.delay(650),
      ])
    );

    translateX.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [contentWidth, shouldRoll, translateX, viewportWidth]);

  const renderPills = (duplicate: boolean) => (
    <View
      onLayout={duplicate ? undefined : (event) => setContentWidth(event.nativeEvent.layout.width)}
      style={[styles.schedulePills, duplicate && styles.schedulePillsDuplicate]}
    >
      {items.map((item, index) => (
        <Text key={`${prefix}-${duplicate ? 'dup' : 'base'}-${index}`} style={styles.schedulePillText}>{item}</Text>
      ))}
    </View>
  );

  return (
    <View
      onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
      style={styles.schedulePillsViewport}
    >
      <Animated.View
        style={[
          styles.schedulePillsTrack,
          shouldRoll ? { transform: [{ translateX }] } : null,
        ]}
      >
        {renderPills(false)}
        {shouldRoll ? renderPills(true) : null}
      </Animated.View>
    </View>
  );
}

function buildDockPrayers(params: {
  prayers: { name: string; time: string; iqamah: string }[];
  isFriday: boolean;
  j1?: string;
  j2?: string;
}): { name: string; time: string; iqamah: string }[] {
  const filtered = params.prayers.filter((prayer) => !['Sunrise', 'Ishraq', 'Zawaal', 'Eid', 'Eid Prayer'].includes(prayer.name));

  if (!params.isFriday) {
    const regularOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    return regularOrder.map((name) => filtered.find((prayer) => prayer.name === name) ?? {
      name,
      time: '--:--',
      iqamah: '--:--',
    });
  }

  const dhuhrRow = filtered.find((prayer) => prayer.name === 'Dhuhr');
  const existingJumuah = filtered.find((prayer) => prayer.name === 'Jumuah');
  const jumuahRow = existingJumuah ?? {
    name: 'Jumuah',
    time: dhuhrRow?.time ?? params.j1 ?? '--:--',
    iqamah: params.j2 || dhuhrRow?.iqamah || '--:--',
  };
  const fridayRows = filtered.filter((prayer) => prayer.name !== 'Dhuhr' && prayer.name !== 'Jumuah');
  const fridayOrder = ['Fajr', 'Jumuah', 'Asr', 'Maghrib', 'Isha'];

  return fridayOrder.map((name) => {
    if (name === 'Jumuah') return jumuahRow;
    return fridayRows.find((prayer) => prayer.name === name) ?? {
      name,
      time: '--:--',
      iqamah: '--:--',
    };
  });
}

export default function PrayerHeroCard({
  visible,
  embedded = false,
  backgroundSource,
  gradientColors,
  backgroundImageOpacity = 0.72,
  heroWide,
  kicker,
  title,
  isForbidden,
  forbiddenEndsAt,
  isFridayJumuahHero,
  isEidHero,
  athanValue,
  j1,
  j2,
  eidJamaats,
  showJamaat,
  jamaatValue,
  countdownInfo,
  flashAnim,
  progress,
  athanMarker,
  jamaatMarker,
  endMarker,
  midMarker,
  startLabel,
  startTime,
  endLabel,
  endTime,
  midLabel,
  midTime,
  eidTomorrowJamaats,
  eidTomorrowLabel,
  hasNext,
  nextPrayerName,
  nextPrayerTime,
  nextPrayerJamaatValue,
  localTime,
  seconds,
  ampm,
  hijriLabel,
  loadingHijri,
  dayName,
  dateShort,
  allPrayers,
  onFullTimetable,
}: Props) {
  const progressAnim = useRef(new Animated.Value(progress)).current;
  const fireworksAnim = useRef(new Animated.Value(0)).current;
  const logoPulseAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const liveDotAnim = useRef(new Animated.Value(0)).current;
  const [timelineLineWidth, setTimelineLineWidth] = useState(0);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1400,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  useEffect(() => {
    if (!isEidHero) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fireworksAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(fireworksAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [fireworksAnim, isEidHero]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(logoPulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [logoPulseAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(liveDotAnim, { toValue: 0, duration: 650, useNativeDriver: true }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [liveDotAnim]);

  if (!visible) return null;

  const countdownFriendly = formatCountdownFriendly(countdownInfo.value);
  const isCurrentPrayer = kicker.toLowerCase().includes('current prayer');
  const remainingSeconds = parseCountdownSeconds(countdownInfo.value);
  const urgencyLevel: 'normal' | 'orange' | 'red' = (isForbidden && title === 'Zawaal')
    ? 'red'
    : isCurrentPrayer && remainingSeconds !== null
      ? (remainingSeconds <= COUNTDOWN_CRITICAL_SECONDS ? 'red' : (remainingSeconds <= COUNTDOWN_WARNING_SECONDS ? 'orange' : 'normal'))
      : 'normal';
  const isUntilJamaat = countdownInfo.label.toLowerCase().includes('jamaat') && !countdownInfo.flash;
  const contextualEndLabel = endLabel.toLowerCase() === 'next prayer'
    ? `${nextPrayerName || 'Next'}`
    : (endLabel.toLowerCase() === 'sunrise' ? 'Sunrise' : (endLabel.toLowerCase() === 'jummah athan' ? 'Jummah Athan' : endLabel));
  const hasMiddleEvent = (showJamaat && !!jamaatValue) || (!!midLabel && !!midTime);
  const stripMiddleLabel = (showJamaat && jamaatValue) ? 'Jamaat' : midLabel;
  const stripMiddleTime = (showJamaat && jamaatValue) ? jamaatValue : midTime;
  const showMiddleStrip = hasMiddleEvent;
  const tomorrowJamaatRows = (() => {
    if (!allPrayers || allPrayers.length === 0) return [] as { name: string; time: string }[];

    const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    return order
      .map((name) => {
        const prayer = allPrayers.find((entry) => entry.name === name);
        const time = prayer?.tomorrowIqamah;
        if (!time || time === '-' || time === '--:--') return null;
        return { name, time };
      })
      .filter((entry): entry is { name: string; time: string } => !!entry);
  })();
  const isAfterIshaJamaat = (() => {
    if (!allPrayers || allPrayers.length === 0) return false;

    const isha = allPrayers.find((entry) => entry.name === 'Isha');
    if (!isha?.iqamah || isha.iqamah === '-' || isha.iqamah === '--:--') return false;

    const [hours, minutes] = isha.iqamah.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;

    const base = isha.timeDate ? new Date(isha.timeDate) : new Date();
    base.setHours(hours, minutes, 0, 0);
    return new Date() >= base;
  })();
  const showTomorrowJamaatBanner = !isEidHero
    && !countdownInfo.flash
    && isAfterIshaJamaat
    && tomorrowJamaatRows.length > 0;
  const rightColumnLabel = isFridayJumuahHero
    ? `${nextPrayerName || endLabel || 'Asr'}`
    : contextualEndLabel;
  const rightColumnTime = isFridayJumuahHero
    ? (nextPrayerTime || endTime || '--:--')
    : (endTime || nextPrayerTime || '--:--');
  const countdownLabel = countdownInfo.label.trim();
  const countdownTarget = countdownLabel.replace(/^until\s+/i, '').trim();
  const parsedScheduleBanner = parseScheduleBanner(countdownInfo.note);
  const cutThroughTimeline = embedded;
  const compactDayName = toCompactDayName(dayName);
  const compactDateShort = toShortDate(dateShort);
  const unifiedDateText = loadingHijri || !hijriLabel
    ? `${compactDayName} ${compactDateShort}`
    : `${compactDayName} ${compactDateShort} · ${hijriLabel}`;
  const timelineStartLabel = startLabel.trim().toLowerCase() === 'start' ? 'Athan' : startLabel;
  const statusText = (() => {
    const isOrdinalCountdown = /^\d+(st|nd|rd|th)\b/i.test(countdownLabel);
    if (isForbidden) return `${title} until ${forbiddenEndsAt}`;
    if (countdownInfo.flash) return `${title} Jamaat started`;
    if (isUntilJamaat) return `${title} Jamaat in ${countdownFriendly}`;
    if ((isEidHero || isFridayJumuahHero) && countdownLabel) {
      if (isOrdinalCountdown) {
        return `${toTitleCase(countdownLabel)} in ${countdownFriendly}`;
      }
      if (/^until\s+/i.test(countdownLabel) && countdownTarget) {
        return `${title} until ${toTitleCase(countdownTarget)} in ${countdownFriendly}`;
      }
      return `${title} ${toTitleCase(countdownLabel)} in ${countdownFriendly}`;
    }
    if (isCurrentPrayer) return `${title} in progress`;
    return `${title} in ${countdownFriendly}`;
  })();
  const showLiveStatus = !countdownInfo.flash && !/jamaat\s+is\s+now/i.test(`${countdownInfo.label} ${countdownInfo.note}`);
  const liveStatusColor = (() => {
    if (isForbidden) return '#FFD2D2';
    if (urgencyLevel === 'red') return '#FFD2D2';
    if (urgencyLevel === 'orange') return '#FFE2AD';
    if (isCurrentPrayer) return '#A7E8C5';
    return '#F7FBFF';
  })();
  const liveStatusEndsText = (isCurrentPrayer && !countdownInfo.flash)
    ? `Ends in ${countdownFriendly}`
    : null;

  const timelineLogoTranslateX = timelineLineWidth > 0
    ? progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, timelineLineWidth],
      extrapolate: 'clamp',
    })
    : 0;
  const timelineLogoScale = logoPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const fillAnchorOffset = Math.max(0, TIMELINE_LOGO_HALF_WIDTH - TIMELINE_PULL_GAP);
  const maxFillWidth = Math.max(0, timelineLineWidth - fillAnchorOffset);
  const progressFillWidth = timelineLineWidth > 0
    ? Animated.subtract(
      Animated.multiply(progressAnim, timelineLineWidth),
      fillAnchorOffset
    ).interpolate({
      inputRange: [0, Math.max(1, maxFillWidth)],
      outputRange: [0, Math.max(1, maxFillWidth)],
      extrapolate: 'clamp',
    })
    : 0;

  const timelineTrack = (


    <>
      <View style={styles.horizontalTimelineContainer}>
        <View
          style={styles.glowingLineWrapper}
          onLayout={(event) => setTimelineLineWidth(event.nativeEvent.layout.width)}
        >
          <View style={styles.glowingLineBase} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowingLineAura,
              {
                opacity: logoPulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.28, 0.62],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.glowingLineFill,
              {
                width: progressFillWidth,
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glowingLineShimmerClip,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            <Animated.View
              style={[
                styles.glowingLineShimmer,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.15, 0.8, 1],
                    outputRange: [0, 0.95, 0.42, 0],
                  }),
                  transform: [
                    {
                      translateX: shimmerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-90, 280],
                      }),
                    },
                    { rotate: '8deg' },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.glowingLineShimmerSecondary,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.35, 1],
                    outputRange: [0, 0.65, 0],
                  }),
                  transform: [
                    {
                      translateX: shimmerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-130, 230],
                      }),
                    },
                    { rotate: '8deg' },
                  ],
                },
              ]}
            />
          </Animated.View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.timelineLogoPointerTrack,
              { transform: [{ translateX: timelineLogoTranslateX }] },
            ]}
          >
            <Animated.Image
              source={require('@/assets/images/masjid-logo.png')}
              resizeMode="contain"
              style={[
                styles.timelineLogoPointerImage,
                { transform: [{ scale: timelineLogoScale }] },
              ]}
            />
          </Animated.View>
        </View>

        <View style={styles.timelinePointsRow}>
          <View style={styles.timelinePointColumn}>
            <Text style={styles.timelineLabel}>{timelineStartLabel}</Text>
            <Text style={styles.timelineTime}>{startTime || athanValue}</Text>
          </View>

          {showMiddleStrip ? (
            <View style={styles.timelinePointColumn}>
              <Text style={styles.timelineLabelCenter}>{stripMiddleLabel || 'Jamaat'}</Text>
              <Text style={styles.timelineTimeCenter}>{stripMiddleTime || '--:--'}</Text>
            </View>
          ) : null}

          <View style={styles.timelinePointColumn}>
            <Text style={styles.timelineLabel}>{rightColumnLabel}</Text>
            <Text style={styles.timelineTime}>{rightColumnTime}</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderCompartmentLayout = () => {
    if (!allPrayers) return null;

    const mainPrayers = buildDockPrayers({
      prayers: allPrayers,
      isFriday: dayName.trim().toLowerCase().startsWith('fri'),
      j1,
      j2,
    });

    return (
      <View style={[styles.compartmentsDock, embedded && styles.compartmentsDockEmbedded]}>
        {/* Prayer compartments */}
        <View style={styles.compartmentsRow}>
          {mainPrayers.map((prayer, index) => {
            const isActive = title === prayer.name;
            return (
              <View
                key={`${prayer.name}-${index}`}
                style={[
                  styles.compartment,
                  isActive && styles.compartmentActive,
                  !isActive && styles.compartmentInactive,
                  index === mainPrayers.length - 1 && styles.compartmentLast,
                ]}
              >
                <Text style={[styles.compPrayerName, isActive && styles.compPrayerNameActive]}>{prayer.name}</Text>
                <Text style={[styles.compStartTime, isActive && styles.compStartTimeActive]}>{prayer.time}</Text>
                <Text style={[styles.compJamaatLabel, isActive && styles.compJamaatLabelActive]}>Jamaat</Text>
                <Text style={[styles.compJamaatTime, isActive && styles.compJamaatTimeActive]}>{prayer.iqamah}</Text>
              </View>
            );
          })}
        </View>

        {/* Progress seam between dock and ticker */}
        <View style={styles.progressBarContainer}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(4,14,30,0.52)', 'rgba(7,24,42,0.34)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.progressBarBackdrop}
          />
          <View
            style={styles.glowingLineWrapper}
            onLayout={(event) => setTimelineLineWidth(event.nativeEvent.layout.width)}
          >
            <View style={styles.glowingLineBase} />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glowingLineAura,
                {
                  opacity: logoPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.28, 0.62],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.glowingLineFill,
                {
                  width: progressFillWidth,
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.timelineLogoPointerTrack,
                { transform: [{ translateX: timelineLogoTranslateX }] },
              ]}
            >
              <Animated.Image
                source={require('@/assets/images/masjid-logo.png')}
                resizeMode="contain"
                style={[
                  styles.timelineLogoPointerImage,
                  { transform: [{ scale: timelineLogoScale }] },
                ]}
              />
            </Animated.View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <View style={[styles.surfaceShell, embedded && styles.surfaceShellEmbedded]}>
        {/* Full-screen overlay */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.5)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.overlay}
        />
        {/* Fireworks layer */}
        {isEidHero ? (
          <View pointerEvents="none" style={styles.fireworksLayer}>
            {EID_FIREWORK_BURSTS.map((burst, burstIndex) => {
              const burstOpacity = fireworksAnim.interpolate({
                inputRange: [0, burst.delay, Math.min(1, burst.delay + 0.18), Math.min(1, burst.delay + 0.45), 1],
                outputRange: [0, 0, 0.95, 0, 0],
                extrapolate: 'clamp',
              });
              const burstScale = fireworksAnim.interpolate({
                inputRange: [0, burst.delay, Math.min(1, burst.delay + 0.35), 1],
                outputRange: [0.2, 0.2, 1.15, 1.15],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={`${burst.left}-${burst.top}-${burstIndex}`}
                  style={[
                    styles.fireworkBurst,
                    {
                      top: burst.top,
                      left: burst.left,
                      opacity: burstOpacity,
                      transform: [{ scale: burstScale }],
                    },
                  ]}
                >
                  <View style={[styles.fireworkCore, { backgroundColor: burst.color }]} />
                  {FIREWORK_ANGLES.map((angle) => (
                    <View
                      key={`${burstIndex}-${angle}`}
                      style={[
                        styles.fireworkRay,
                        {
                          backgroundColor: burst.color,
                          transform: [{ rotate: `${angle}deg` }, { translateY: -18 }],
                        },
                      ]}
                    />
                  ))}
                </Animated.View>
              );
            })}
          </View>
        ) : null}

        <View
          style={[styles.inner, heroWide && styles.innerWide, cutThroughTimeline && styles.innerCutThrough]}
        >
          {embedded ? (
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.015)', 'rgba(255,255,255,0.00)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.surfaceSheen}
            />
          ) : null}
          <View style={styles.textCluster}>

            {/* ── Clock ── */}
            <View style={styles.clockRow}>
              <Text style={styles.clockValue}>{localTime}</Text>
              <Text style={styles.clockAmpm}>{ampm}</Text>
            </View>

            {/* ── Date ── */}
            <TouchableOpacity
              activeOpacity={onFullTimetable ? 0.7 : 1}
              onPress={onFullTimetable}
              style={styles.dateLine}
            >
              <Text style={styles.dateText}>{unifiedDateText}</Text>
            </TouchableOpacity>

            {/* ── Prayer section ── */}
            <View style={styles.prayerSection}>
          {showLiveStatus ? (
          <View style={styles.liveStatusBlock}>
            <View style={styles.liveStatusRow}>
              <Animated.View
                style={[
                  styles.liveStatusDot,
                  {
                    backgroundColor: liveStatusColor,
                    opacity: liveDotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                    transform: [
                      {
                        scale: liveDotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.1] }),
                      },
                    ],
                  },
                ]}
              />
              <Text style={[styles.prayerIn, styles.liveStatusText, { color: liveStatusColor }]}>{statusText}</Text>
            </View>
            {liveStatusEndsText ? (
              <Text style={[styles.liveStatusEndsText, { color: liveStatusColor }]}>{liveStatusEndsText}</Text>
            ) : null}
          </View>
          ) : null}

          {showTomorrowJamaatBanner ? (
            <View style={styles.tomorrowJamaatBanner}>
              <Text style={styles.tomorrowJamaatHeading}>Tomorrow Jamaat Times</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tomorrowJamaatPills}
              >
                {tomorrowJamaatRows.map((entry) => (
                  <View key={`tomorrow-jamaat-${entry.name}`} style={styles.tomorrowJamaatPill}>
                    <Text style={styles.tomorrowJamaatPillLabel}>{entry.name}</Text>
                    <Text style={styles.tomorrowJamaatPillTime}>{entry.time}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {(eidTomorrowJamaats?.length) ? (
            <View style={styles.eidTomorrowBanner}>
              <Text style={styles.eidTomorrowHeading}>{eidTomorrowLabel ?? 'Eid Prayer · Tomorrow'}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eidTomorrowPills}
              >
                {eidTomorrowJamaats.map((time, i) => (
                  <View key={`tomorrow-${i}`} style={styles.eidTomorrowPill}>
                    <Text style={styles.eidTomorrowPillLabel}>J{i + 1}</Text>
                    <Text style={styles.eidTomorrowPillTime}>{time}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : parsedScheduleBanner ? (
            <View style={styles.scheduleBanner}>
              {parsedScheduleBanner.eid.length > 0 ? (
                <View style={styles.scheduleRow}>
                  <Text style={styles.scheduleHeading}>Eid Prayers</Text>
                  <RollingSchedulePills items={parsedScheduleBanner.eid} prefix="eid" />
                </View>
              ) : null}
              {parsedScheduleBanner.jumuah.length > 0 ? (
                <View style={styles.scheduleRow}>
                  <Text style={styles.scheduleHeading}>Jummah Prayers</Text>
                  <RollingSchedulePills items={parsedScheduleBanner.jumuah} prefix="jumuah" />
                </View>
              ) : null}
            </View>
          ) : countdownInfo.note ? (
            <Text style={styles.phaseNote}>{countdownInfo.note}</Text>
          ) : null}
            </View>
          </View>

          {cutThroughTimeline ? (
            <View style={styles.cutThroughContentArea}>
              {allPrayers ? null : timelineTrack}
            </View>
          ) : (
            <View style={styles.barArea}>
              {allPrayers ? null : timelineTrack}
            </View>
          )}
        </View>

        {allPrayers ? renderCompartmentLayout() : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    overflow: 'visible',
  },
  wrapEmbedded: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    overflow: 'visible',
  },
  surfaceShell: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  surfaceShellEmbedded: {
    borderRadius: 0,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%' as any,
    height: '100%' as any,
    borderRadius: 0,
  },
  bgImageEmbedded: {
    borderRadius: 0,
  },
  bgImageAmbient: {
    opacity: 0.95,
  },
  bgImageZawaalFocus: {
    transform: [{ translateY: 30 }, { scale: 1.08 }],
  },
  bgImageJumuahFocus: {
    transform: [{ translateY: -140 }, { scale: 1.12 }],
  },
  fireworksLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  fireworkBurst: {
    position: 'absolute',
    width: 44,
    height: 44,
    marginLeft: -22,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireworkCore: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 999,
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  fireworkRay: {
    position: 'absolute',
    width: 3,
    height: 16,
    borderRadius: 999,
    opacity: 0.88,
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    minHeight: 248,
    justifyContent: 'flex-start',
  },
  innerCutThrough: {
    paddingBottom: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  surfaceSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  textCluster: {
    position: 'relative',
  },
  innerWide: {
    paddingHorizontal: 22,
    paddingTop: 12,
    minHeight: 268,
  },

  // Clock
  clockRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    marginBottom: 8,
  },
  clockValue: {
    fontSize: 50,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 48,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  clockAmpm: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  clockSeconds: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    letterSpacing: 0.2,
  },

  // Date / Hijri
  dateLine: {
    marginBottom: 0,
  },
  dateText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(248,252,255,0.94)',
    letterSpacing: 0.1,
  },
  hijriText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.74)',
    letterSpacing: 0.1,
  },

  // Prayer name + countdown
  prayerSection: {
    marginTop: 12,
  },
  prayerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  liveStatusBlock: {
    marginBottom: 10,
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  liveStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  liveStatusText: {
    marginBottom: 0,
    flex: 1,
  },
  liveStatusEndsText: {
    marginTop: 2,
    marginLeft: 20,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 21,
  },
  prayerName: {
    fontSize: 36,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  prayerIn: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F7FBFF',
    letterSpacing: 0,
    marginBottom: 12,
    lineHeight: 28,
  },
  tomorrowJamaatBanner: {
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(79,233,72,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(79,233,72,0.28)',
  },
  tomorrowJamaatHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(169,255,204,0.96)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  tomorrowJamaatPills: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
  },
  tomorrowJamaatPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(79,233,72,0.24)',
    alignItems: 'center',
    minWidth: 54,
  },
  tomorrowJamaatPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(169,255,204,0.88)',
    letterSpacing: 0.2,
  },
  tomorrowJamaatPillTime: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  prayerInWarning: {
    color: '#FFD29A',
    fontWeight: '600',
  },
  prayerInCritical: {
    color: '#FFB1B1',
    fontWeight: '600',
  },
  prayerInAlert: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  phaseNote: {
    marginTop: -6,
    marginBottom: 6,
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
  },

  // Horizontal timeline
  horizontalTimelineContainer: {
    position: 'relative',
    paddingTop: 24,
    paddingBottom: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowingLineWrapper: {
    position: 'relative',
    width: '100%',
    height: 16,
    marginBottom: 8,
    overflow: 'visible',
  },
  glowingLineBase: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(96, 225, 154, 0.24)',
    borderRadius: 2,
    shadowColor: 'rgba(54,214,125,0.24)',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  glowingLineAura: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(54,214,125,0.14)',
  },
  glowingLineFill: {
    position: 'absolute',
    top: 6,
    left: 0,
    height: 3,
    backgroundColor: '#59C98A',
    borderRadius: 2,
    shadowColor: '#4DB87D',
    shadowOpacity: 0.95,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  glowingLinePullCap: {
    position: 'absolute',
    top: 3,
    width: 8,
    height: 8,
    marginLeft: -4,
    borderRadius: 999,
    backgroundColor: '#A8EBC7',
    shadowColor: '#A8EBC7',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  glowingLineShimmerClip: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    height: 10,
    overflow: 'hidden',
    borderRadius: 999,
  },
  glowingLineShimmer: {
    position: 'absolute',
    top: -8,
    width: 86,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.34)',
    shadowColor: '#DFFFF0',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  glowingLineShimmerSecondary: {
    position: 'absolute',
    top: -5,
    width: 46,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(141,255,209,0.28)',
    shadowColor: '#8EDDB6',
    shadowOpacity: 0.55,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  timelineLogoPointr: {
    position: 'absolute',
    top: -12,
    width: 0,
    height: 0,
    marginLeft: -50,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    elevation: 5,
  },
  timelineLogoPointerImage: {
    position: 'absolute',
    top: -27,
    width: 50,
    height: 58,
    marginLeft: -49,
    tintColor: '#4DB87D',
    opacity: 1,
    zIndex: 6,
    elevation: 6
  },
  timelineLogoPointerTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 6,
    elevation: 6,
  },
  timelinePointsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  timelinePointColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  timelineDotActive: {
    width: 14,
    height: 14,
    marginLeft: -70,
    borderRadius: 7,
    backgroundColor: '#74DDA0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#74DDA0',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 13,
    letterSpacing: 0.2,
  },
  timelineLabelCenter: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 14,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  timelineTime: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 16,
  },
  timelineTimeCenter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
    textShadowColor: 'rgba(79,233,72,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  cutThroughContentArea: {
    paddingTop: 0,
    marginTop: 'auto',
  },
  barArea: {
    paddingTop: 0,
    marginTop: 'auto',
  },
  barTrack: {
    height: TRACK_HEIGHT,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'visible',
    marginBottom: 10,
  },
  barTrackCutThrough: {
    height: 6,
    marginBottom: 0,
    backgroundColor: 'rgba(255,255,255,0.22)',
    shadowColor: 'rgba(4,18,38,0.45)',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  barTrackWarning: {
    backgroundColor: 'rgba(255,186,112,0.25)',
  },
  barTrackCritical: {
    backgroundColor: 'rgba(255,110,110,0.25)',
  },
  barFillWrap: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 999,
    shadowColor: '#68EDE5',
    shadowOpacity: 0.8,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  barFillGradient: {
    height: '100%',
    borderRadius: 999,
  },
  barJamaatMark: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 11,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.42)',
    marginLeft: -1,
  },
  barMidMark: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 11,
    borderRadius: 1,
    backgroundColor: 'rgba(255,208,120,0.88)',
    marginLeft: -1,
  },
  barJamaatDot: {
    position: 'absolute',
    top: -((8 - TRACK_HEIGHT) / 2),
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    backgroundColor: '#EAF8FF',
    borderWidth: 1,
    borderColor: 'rgba(11,28,58,0.7)',
  },
  barAthanMark: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 11,
    borderRadius: 1,
    backgroundColor: 'rgba(200,230,255,0.75)',
    marginLeft: -1,
  },
  dotPositioner: {
    position: 'absolute',
    top: DOT_OFFSET_TOP,
    width: DOT_DIAMETER,
    height: DOT_DIAMETER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barPulseRing: {
    position: 'absolute',
    width: DOT_DIAMETER,
    height: DOT_DIAMETER,
    borderRadius: DOT_DIAMETER / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(104,237,229,0.65)',
  },
  barDot: {
    width: DOT_DIAMETER,
    height: DOT_DIAMETER,
    borderRadius: DOT_DIAMETER / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: '#68EDE5',
    shadowColor: '#68EDE5',
    shadowOpacity: 0.95,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  barEndMark: {
    position: 'absolute',
    top: -((10 - TRACK_HEIGHT) / 2),
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(205,245,255,0.95)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#9CEBFF',
    shadowOpacity: 0.85,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  barTimelinePoint: {
    position: 'absolute',
    top: -((8 - TRACK_HEIGHT) / 2),
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,240,186,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(70,44,0,0.55)',
  },
  barStartDot: {
    position: 'absolute',
    top: -((10 - TRACK_HEIGHT) / 2),
    left: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  pointLabelsLayer: {
    position: 'relative',
    height: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  pointLabelsLayerCutThrough: {
    position: 'relative',
    height: 18,
    marginTop: 0,
    marginBottom: 8,
  },
  pointLabelCol: {
    position: 'absolute',
    top: 0,
    width: 84,
    transform: [{ translateX: -42 }],
    alignItems: 'center',
  },
  pointLabelStart: {
    left: 0,
    transform: [{ translateX: 0 }],
    alignItems: 'flex-start',
  },
  pointLabelEnd: {
    right: 0,
    transform: [{ translateX: 0 }],
    alignItems: 'flex-end',
  },
  pointLabelName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(215,234,255,0.92)',
    lineHeight: 14,
  },
  timesStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 10,
  },
  timesStripCutThrough: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  timesStripCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  eidStripColWide: {
    flex: 1.7,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  eidStripHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,245,213,0.96)',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  eidStripColCompact: {
    flex: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  timesStripDivider: {
    width: 1,
    marginVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  timesStripLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 14,
  },
  timesStripLabelActive: {
    opacity: 1,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.96)',
  },
  timesStripLabelInactive: {
    opacity: 0.56,
    fontWeight: '400',
  },
  timesStripTime: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  timesStripTimeActive: {
    opacity: 1,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  timesStripTimeInactive: {
    opacity: 0.56,
    fontWeight: '400',
  },
  timesStripMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 13,
  },
  eidJamaatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  eidJamaatPill: {
    minWidth: 72,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,236,169,0.24)',
    alignItems: 'center',
  },
  eidJamaatPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,245,213,0.95)',
    lineHeight: 12,
  },
  eidJamaatPillTime: {
    marginTop: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  eidTomorrowBanner: {
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(212,179,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,179,68,0.30)',
  },
  eidTomorrowHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(228,196,88,0.95)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  eidTomorrowPills: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
  },
  eidTomorrowPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(212,179,68,0.22)',
    alignItems: 'center',
    minWidth: 48,
  },
  eidTomorrowPillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(228,196,88,0.88)',
    letterSpacing: 0.2,
  },
  eidTomorrowPillTime: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  scheduleBanner: {
    marginTop: -2,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(10,22,45,0.44)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    gap: 6,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleHeading: {
    width: 112,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,245,213,0.95)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  schedulePills: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    flexGrow: 0,
  },
  schedulePillsViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  schedulePillsTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '100%',
  },
  schedulePillsDuplicate: {
    marginLeft: SCHEDULE_ROLL_GAP,
  },
  schedulePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
  },

  /* Compartment Styles */
  compartmentsDock: {
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'hidden',
    shadowOpacity: 0,
    elevation: 0,
  },
  compartmentsDockEmbedded: {
    marginTop: -4,
    marginBottom: -4,
    zIndex: 6,
  },
  compartmentsPanel: {
    backgroundColor: 'rgba(18,55,92,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    shadowColor: '#020814',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  compartmentsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(5,20,38,0.56)',
  },
  compartment: {
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(204,228,255,0.34)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compartmentLast: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(204,228,255,0.34)',
  },
  compartmentActive: {
    borderLeftColor: 'rgba(121,217,166,0.98)',
    backgroundColor: 'rgba(25,112,76,0.52)',
  },
  compartmentInactive: {
    opacity: 1,
    backgroundColor: 'rgba(11,40,70,0.42)',
  },
  compPrayerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EAF4FF',
    marginBottom: 4,
    lineHeight: 15,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  compPrayerNameActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  compStartTime: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F7FBFF',
    marginBottom: 4,
    letterSpacing: -0.1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  compStartTimeActive: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
  },
  compJamaatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DDEBFB',
    marginBottom: 2,
    letterSpacing: 0,
  },
  compJamaatLabelActive: {
    color: '#E6FFF0',
  },
  compJamaatTime: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7FD7A8',
    letterSpacing: 0,
    textShadowColor: 'rgba(95,255,159,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  compJamaatTimeActive: {
    color: '#BCEFD5',
    fontWeight: '900',
    fontSize: 15,
    textShadowColor: 'rgba(141,255,187,0.55)',
    textShadowRadius: 6,
  },
  progressBarContainer: {
    marginTop: 0,
    paddingHorizontal: 6,
    paddingTop: 5,
    paddingBottom: 4,
    position: 'relative',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(7,20,38,0.18)',
    zIndex: 7,
  },
  progressBarBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
});
