import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Spacing, Radius } from '@/constants/theme';

export type HeroCountdownInfo = {
  label: string;
  value: string;
  note: string;
  flash: boolean;
};

type Props = {
  visible: boolean;
  embedded?: boolean;
  backgroundSource: any;
  gradientColors: readonly [string, string, ...string[]];
  heroWide: boolean;
  kicker: string;
  title: string;
  isForbidden: boolean;
  forbiddenEndsAt: string;
  isFridayJumuahHero: boolean;
  athanValue: string;
  j1: string;
  j2: string;
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
  hasNext: boolean;
  nextPrayerName: string;
  nextPrayerTime: string;
  prayerIcons: Record<string, string>;
  // unified time/date row
  localTime: string;
  ampm: string;
  seconds: string;
  hijriLabel: string;
  loadingHijri?: boolean;
  dayName: string;
  dateShort: string;
  onFullTimetable?: () => void;
};

const DOT_DIAMETER = 14;
const TRACK_HEIGHT = 5;
const DOT_OFFSET_TOP = -((DOT_DIAMETER - TRACK_HEIGHT) / 2);

function formatCountdownFriendly(val: string): string {
  const parts = val.split(':').map(Number);
  if (parts.some(Number.isNaN)) return val;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    if (m >= 60) {
      const h2 = Math.floor(m / 60);
      const m2 = m % 60;
      return m2 > 0 ? `${h2}h ${m2}m` : `${h2}h`;
    }
    if (m > 0) return `${m}m`;
    return `${s}s`;
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

export default function PrayerHeroCard({
  visible,
  embedded = false,
  backgroundSource,
  gradientColors,
  heroWide,
  kicker,
  title,
  isForbidden,
  forbiddenEndsAt,
  isFridayJumuahHero,
  athanValue,
  j1,
  j2,
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
  hasNext,
  nextPrayerName,
  nextPrayerTime,
  localTime,
  seconds,
  ampm,
  hijriLabel,
  loadingHijri,
  dayName,
  dateShort,
  onFullTimetable,
}: Props) {
  const [barWidth, setBarWidth] = useState(0);
  const progressAnim = useRef(new Animated.Value(progress)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1400,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1100, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const fillWidth = useMemo(
    () =>
      progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.max(0, barWidth)],
        extrapolate: 'clamp',
      }),
    [barWidth, progressAnim]
  );

  const dotLeft = useMemo(
    () =>
      progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-(DOT_DIAMETER / 2), Math.max(0, barWidth - DOT_DIAMETER / 2)],
        extrapolate: 'clamp',
      }),
    [barWidth, progressAnim]
  );

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.55, 0.2, 0] });

  if (!visible) return null;

  const countdownFriendly = formatCountdownFriendly(countdownInfo.value);
  const isCurrentPrayer = kicker.toLowerCase().includes('current prayer');
  const remainingSeconds = parseCountdownSeconds(countdownInfo.value);
  const urgencyLevel: 'normal' | 'orange' | 'red' = (isForbidden && title === 'Zawaal')
    ? 'red'
    : isCurrentPrayer && remainingSeconds !== null
      ? (remainingSeconds <= (30 * 60) ? 'red' : (remainingSeconds <= (59 * 60) ? 'orange' : 'normal'))
      : 'normal';
  const trackerAccent = urgencyLevel === 'red'
    ? '#FF5A5A'
    : (urgencyLevel === 'orange' ? '#FFB347' : '#68EDE5');
  const trackerPulse = urgencyLevel === 'red'
    ? 'rgba(255,90,90,0.70)'
    : (urgencyLevel === 'orange' ? 'rgba(255,179,71,0.70)' : 'rgba(104,237,229,0.65)');
  const trackerGradientColors: readonly [string, string, string] = urgencyLevel === 'red'
    ? ['rgba(255,90,90,0.45)', '#FF5A5A', '#FFD1D1']
    : (urgencyLevel === 'orange'
      ? ['rgba(255,166,61,0.45)', '#FFB347', '#FFE3BD']
      : ['rgba(100,195,255,0.5)', '#68EDE5', '#C0FAF7']);
  const prayerInUrgencyStyle = urgencyLevel === 'red'
    ? styles.prayerInCritical
    : (urgencyLevel === 'orange' ? styles.prayerInWarning : null);
  const isUntilJamaat = countdownInfo.label.toLowerCase().includes('jamaat') && !countdownInfo.flash;
  const jamaatVisualMarker = jamaatMarker === null
    ? null
    : Math.max(0, Math.min(1, jamaatMarker));
  const midVisualMarker = midMarker === null
    ? null
    : Math.max(0, Math.min(1, midMarker));
  const contextualEndLabel = endLabel.toLowerCase() === 'next prayer' ? 'Next' : endLabel;

  const effectiveColors: readonly [string, string, string] = embedded
    ? ['rgba(0,0,0,0)', 'rgba(2,10,26,0.2)', 'rgba(2,10,26,0.78)']
    : (gradientColors as any);
  const effectiveEnd = embedded ? { x: 0, y: 1 } : { x: 1, y: 1 };

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <Image
        source={backgroundSource}
        style={[styles.bgImage, embedded && styles.bgImageEmbedded]}
        resizeMode="cover"
      />
      <LinearGradient
        colors={effectiveColors}
        start={{ x: 0, y: 0 }}
        end={effectiveEnd}
        style={[styles.inner, heroWide && styles.innerWide]}
      >
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
          <Text style={styles.dateText}>{dayName}{'  ·  '}{dateShort}</Text>
        </TouchableOpacity>

        {/* ── Hijri ── */}
        {loadingHijri ? (
          <ActivityIndicator
            color="rgba(255,255,255,0.4)"
            size="small"
            style={{ alignSelf: 'flex-start', marginTop: 1 }}
          />
        ) : hijriLabel ? (
          <Text style={styles.hijriText}>{hijriLabel}</Text>
        ) : null}

        {/* ── Prayer section ── */}
        <View style={styles.prayerSection}>
          {isForbidden ? (
            <View style={styles.prayerNameRow}>
              <Text style={styles.prayerName}>{title}</Text>
              <Text style={[styles.prayerIn, styles.prayerInCritical]}>{' forbidden until '}{forbiddenEndsAt}</Text>
            </View>
          ) : (
            <>
              <View style={styles.prayerNameRow}>
                <Text style={styles.prayerName}>{title}</Text>
                {countdownInfo.flash ? (
                  <Animated.Text style={[styles.prayerIn, styles.prayerInAlert, { opacity: flashAnim }]}>
                    {' '}now
                  </Animated.Text>
                ) : (
                  <Text style={[styles.prayerIn, prayerInUrgencyStyle]}>
                    {isCurrentPrayer
                      ? (isUntilJamaat ? ` Jamaat in ${countdownFriendly}` : ` ends in ${countdownFriendly}`)
                      : ` in ${countdownFriendly}`}
                  </Text>
                )}
              </View>
            </>
          )}

          {countdownInfo.note ? (
            <Text style={styles.phaseNote}>{countdownInfo.note}</Text>
          ) : null}

          {/* ── Animated timeline ── */}
          <View style={styles.barArea}>
            <View
              style={[
                styles.barTrack,
                urgencyLevel === 'orange' && styles.barTrackWarning,
                urgencyLevel === 'red' && styles.barTrackCritical,
              ]}
              onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            >
              {barWidth > 0 && (
                <Animated.View style={[styles.barFillWrap, { width: fillWidth, shadowColor: trackerAccent }]}>
                  <LinearGradient
                    colors={trackerGradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFillGradient, { width: barWidth }]}
                  />
                </Animated.View>
              )}

              {athanMarker !== null && (
                <View
                  style={[
                    styles.barAthanMark,
                    { left: `${Math.round(athanMarker * 100)}%` as any },
                  ]}
                />
              )}

              {jamaatVisualMarker !== null && (
                <View
                  style={[
                    styles.barJamaatMark,
                    { left: `${Math.round(jamaatVisualMarker * 100)}%` as any },
                  ]}
                />
              )}

              {midVisualMarker !== null && (
                <View
                  style={[
                    styles.barMidMark,
                    { left: `${Math.round(midVisualMarker * 100)}%` as any },
                  ]}
                />
              )}

              {jamaatVisualMarker !== null && (
                <View
                  style={[
                    styles.barJamaatDot,
                    { left: `${Math.round(jamaatVisualMarker * 100)}%` as any },
                  ]}
                />
              )}

              {barWidth > 0 && (
                <Animated.View style={[styles.dotPositioner, { left: dotLeft }]}>
                  <Animated.View
                    style={[
                      styles.barPulseRing,
                      { transform: [{ scale: pulseScale }], opacity: pulseOpacity, borderColor: trackerPulse },
                    ]}
                  />
                  <View style={[styles.barDot, { borderColor: trackerAccent, shadowColor: trackerAccent }]} />
                </Animated.View>
              )}

              <View style={styles.barStartDot} />
              {endMarker !== null && (
                <View
                  style={[
                    styles.barEndMark,
                    { left: `${Math.round(endMarker * 100)}%` as any },
                  ]}
                />
              )}
            </View>

            <View style={styles.pointLabelsLayer}>
              <View style={[styles.pointLabelCol, styles.pointLabelStart]}>
                <Text style={styles.pointLabelName}>{startLabel}</Text>
                <Text style={styles.pointLabelTime}>{startTime || athanValue}</Text>
              </View>

              {jamaatVisualMarker !== null && showJamaat ? (
                <View
                  style={[
                    styles.pointLabelCol,
                    { left: `${Math.round(jamaatVisualMarker * 100)}%` as any },
                  ]}
                >
                  <Text style={styles.pointLabelName}>Jamaat</Text>
                  <Text style={styles.pointLabelTime}>{jamaatValue}</Text>
                </View>
              ) : null}

              {midVisualMarker !== null && midLabel ? (
                <View
                  style={[
                    styles.pointLabelCol,
                    { left: `${Math.round(midVisualMarker * 100)}%` as any },
                  ]}
                >
                  <Text style={styles.pointLabelName}>{midLabel}</Text>
                  <Text style={styles.pointLabelTime}>{midTime}</Text>
                </View>
              ) : null}

              {isFridayJumuahHero && !isForbidden ? (
                <View style={[styles.pointLabelCol, styles.pointLabelEnd]}> 
                  <Text style={styles.pointLabelName}>1st / 2nd</Text>
                  <Text style={styles.pointLabelTime}>{j1} / {j2}</Text>
                </View>
              ) : (
                <View style={[styles.pointLabelCol, styles.pointLabelEnd]}>
                  <Text style={styles.pointLabelName}>{contextualEndLabel}</Text>
                  <Text style={styles.pointLabelTime}>{endTime || `${nextPrayerName} ${nextPrayerTime}`}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.md,
    marginTop: 12,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  wrapEmbedded: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%' as any,
    height: '100%' as any,
    borderRadius: Radius.lg,
  },
  bgImageEmbedded: {
    borderRadius: 0,
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    minHeight: 300,
    justifyContent: 'flex-start',
  },
  innerWide: {
    paddingHorizontal: 26,
    paddingTop: 16,
    minHeight: 320,
  },

  // Clock
  clockRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    marginBottom: 2,
  },
  clockValue: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 58,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  clockAmpm: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 7,
    letterSpacing: 0.5,
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
    marginBottom: 1,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.1,
  },
  hijriText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,218,100,0.95)',
    letterSpacing: 0.1,
  },

  // Prayer name + countdown
  prayerSection: {
    marginTop: 10,
  },
  prayerNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  prayerName: {
    fontSize: 30,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  prayerIn: {
    fontSize: 22,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: -0.1,
    marginBottom: 3,
  },
  prayerInWarning: {
    color: '#FFC76F',
    fontWeight: '500',
  },
  prayerInCritical: {
    color: '#FF8585',
    fontWeight: '600',
  },
  prayerInAlert: {
    color: '#FFE082',
    fontWeight: '600',
  },
  phaseNote: {
    marginTop: -6,
    marginBottom: 8,
    fontSize: 14,
    color: 'rgba(255,232,188,0.98)',
    fontWeight: '500',
  },

  // Animated timeline
  barArea: {
    paddingTop: 12,
  },
  barTrack: {
    height: TRACK_HEIGHT,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'visible',
    marginBottom: 10,
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
    height: 48,
    marginTop: 8,
  },
  pointLabelCol: {
    position: 'absolute',
    top: 0,
    width: 96,
    transform: [{ translateX: -48 }],
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
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(215,234,255,0.92)',
    lineHeight: 16,
  },
  pointLabelTime: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 18,
  },
});
