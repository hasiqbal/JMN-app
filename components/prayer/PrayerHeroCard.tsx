import React from 'react';
import { View, Text, Animated, ImageBackground, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
  jamaatMarker: number | null;
  endMarker: number | null;
  hasNext: boolean;
  nextPrayerName: string;
  nextPrayerTime: string;
  prayerIcons: Record<string, string>;
};

export default function PrayerHeroCard({
  visible,
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
  jamaatMarker,
  endMarker,
  hasNext,
  nextPrayerName,
  nextPrayerTime,
  prayerIcons,
}: Props) {
  if (!visible) return null;

  return (
    <ImageBackground
      source={backgroundSource}
      style={styles.nextBannerWrap}
      imageStyle={styles.nextBannerImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroBanner, heroWide && styles.heroBannerWide]}
      >
        <Text style={styles.heroKicker}>{kicker}</Text>
        <Text style={[styles.heroTitle, heroWide && styles.heroTitleWide]}>{title}</Text>

        <View style={[styles.heroStatsRow, heroWide && styles.heroStatsRowWide]}>
          {!isForbidden && isFridayJumuahHero ? (
            <>
              <View style={[styles.heroGlassStat, heroWide && styles.heroGlassStatWideDesktop]}>
                <Text style={styles.heroGlassLabel}>Athan</Text>
                <Text style={styles.heroGlassValue}>{athanValue}</Text>
              </View>
              <View style={[styles.heroGlassStat, heroWide && styles.heroGlassStatWideDesktop]}>
                <Text style={styles.heroGlassLabel}>1st Jamaat</Text>
                <Text style={styles.heroGlassValue}>{j1}</Text>
              </View>
              <View style={[styles.heroGlassStat, heroWide && styles.heroGlassStatWideDesktop]}>
                <Text style={styles.heroGlassLabel}>2nd Jamaat</Text>
                <Text style={styles.heroGlassValue}>{j2}</Text>
              </View>
            </>
          ) : !isForbidden ? (
            <>
              <View style={[styles.heroGlassStat, heroWide && styles.heroGlassStatWideDesktop]}>
                <Text style={styles.heroGlassLabel}>Athan</Text>
                <Text style={styles.heroGlassValue}>{athanValue}</Text>
              </View>
              {showJamaat ? (
                <View style={[styles.heroGlassStat, heroWide && styles.heroGlassStatWideDesktop]}>
                  <Text style={styles.heroGlassLabel}>Jamaat</Text>
                  <Text style={styles.heroGlassValue}>{jamaatValue}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={[styles.heroGlassStat, styles.heroGlassStatWide, heroWide && styles.heroGlassStatWideDesktop]}>
              <Text style={styles.heroGlassLabel}>Prayer Resumes</Text>
              <Text style={styles.heroGlassValue}>{forbiddenEndsAt}</Text>
            </View>
          )}
        </View>

        <View style={[styles.heroCountdownCard, heroWide && styles.heroCountdownCardWide]}>
          <View style={styles.heroCountdownCardRow}>
            <Text style={styles.heroCountdownCardLabel}>{countdownInfo.label}</Text>
            {countdownInfo.flash ? (
              <Animated.View style={{ opacity: flashAnim }}>
                <Text style={[styles.heroCountdownCardValue, styles.heroCountdownCardValueAlert, heroWide && styles.heroCountdownCardValueWide]}>{countdownInfo.value}</Text>
              </Animated.View>
            ) : (
              <Text style={[styles.heroCountdownCardValue, heroWide && styles.heroCountdownCardValueWide]}>{countdownInfo.value}</Text>
            )}
          </View>
          {countdownInfo.note ? (
            <Text style={styles.heroCountdownCardNote}>{countdownInfo.note}</Text>
          ) : null}
        </View>

        <View style={[styles.heroTimelineTrackWide, heroWide && styles.heroTimelineTrackWideDesktop]}>
          <View style={[styles.heroTimelineFill, { width: `${Math.round(progress * 100)}%` }]} />
          {jamaatMarker !== null ? (
            <View style={[styles.heroTimelineMarker, { left: `${Math.round(jamaatMarker * 100)}%` }]} />
          ) : null}
          {endMarker !== null ? (
            <View style={[styles.heroTimelineEndMarker, { right: -1 }]} />
          ) : null}
        </View>

        {hasNext ? (
          <View style={[styles.heroTimelineNextChipWide, heroWide && styles.heroTimelineNextChipWideDesktop]}>
            <MaterialIcons name={(prayerIcons[nextPrayerName] ?? 'schedule') as any} size={12} color="#FFF4E8" />
            <Text style={styles.heroTimelineNextLabel}>{`Next Prayer ${nextPrayerName}: ${nextPrayerTime}`}</Text>
          </View>
        ) : null}
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  nextBannerWrap: {
    marginHorizontal: Spacing.md,
    marginTop: 12,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  nextBannerImage: {
    borderRadius: Radius.lg,
  },
  heroBanner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    minHeight: 224,
  },
  heroBannerWide: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    minHeight: 230,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(233,243,255,0.88)',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F3F7FF',
    letterSpacing: -0.3,
    marginBottom: 10,
    textShadowColor: 'rgba(7, 22, 48, 0.32)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroTitleWide: {
    fontSize: 29,
    marginBottom: 12,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 12,
  },
  heroStatsRowWide: {
    gap: 14,
    marginBottom: 14,
  },
  heroGlassStat: {
    minWidth: 122,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(228,239,255,0.12)',
    boxShadow: '0px 8px 22px rgba(10, 32, 68, 0.16)',
  },
  heroGlassStatWide: {
    minWidth: 168,
  },
  heroGlassStatWideDesktop: {
    minWidth: 136,
    paddingHorizontal: 16,
  },
  heroGlassLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(237,244,255,0.80)',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  heroGlassValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F4F8FF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.35,
  },
  heroCountdownCard: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(9, 31, 67, 0.34)',
    boxShadow: '0px 12px 28px rgba(7, 20, 46, 0.18)',
  },
  heroCountdownCardWide: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  heroCountdownCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroCountdownCardLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(235,243,255,0.86)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroCountdownCardValue: {
    fontSize: 25,
    fontWeight: '900',
    color: '#F8FBFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
  },
  heroCountdownCardValueAlert: {
    color: '#FFE082',
    letterSpacing: 0.1,
  },
  heroCountdownCardValueWide: {
    fontSize: 28,
  },
  heroCountdownCardNote: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(247, 229, 190, 0.96)',
  },
  heroTimelineTrackWide: {
    marginTop: 14,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(241,247,255,0.34)',
    overflow: 'visible',
  },
  heroTimelineTrackWideDesktop: {
    marginTop: 12,
  },
  heroTimelineFill: {
    height: '100%',
    backgroundColor: '#FFD08A',
  },
  heroTimelineMarker: {
    position: 'absolute',
    top: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFE6B2',
    borderWidth: 2,
    borderColor: '#7A4B11',
    marginLeft: -6,
  },
  heroTimelineEndMarker: {
    position: 'absolute',
    right: -2,
    top: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#C46A0A',
  },
  heroTimelineNextChipWide: {
    marginTop: 10,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 42, 88, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(211,229,255,0.68)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  heroTimelineNextChipWideDesktop: {
    marginTop: 9,
  },
  heroTimelineNextLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF4E8',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.35,
  },
});
