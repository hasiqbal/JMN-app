import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ImageBackground } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';
import type { DrawerPrayerRow } from '@/components/prayer/prayerDrawerState';

type HomeInlinePrayerTimesSectionProps = {
  rows: DrawerPrayerRow[];
  nightMode: boolean;
  embedded?: boolean;
  specialSchedule?: {
    kind: 'jumuah' | 'eid';
    title: string;
    times: string[];
  } | null;
};

type DisplayRow = {
  key: string;
  label: string;
  begins: string;
  jamaat: string;
  jamaat2?: string;
  tomorrowBegins?: string;
  tomorrowJamaat?: string;
  state: DrawerPrayerRow['state'];
};

const ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Fajr: 'wb-twilight',
  Dhuhr: 'wb-sunny',
  Asr: 'brightness-medium',
  Maghrib: 'wb-twilight',
  Isha: 'nights-stay',
  Jummah: 'groups',
};

const ICON_COLORS: Record<string, string> = {
  Fajr: '#35A85B',
  Dhuhr: '#F5B616',
  Asr: '#F29B1D',
  Maghrib: '#E2397B',
  Isha: '#1D6FB4',
  Jummah: '#2E8B57',
};

const ICON_TINTS: Record<string, string> = {
  Fajr: 'rgba(53,168,91,0.14)',
  Dhuhr: 'rgba(245,182,22,0.17)',
  Asr: 'rgba(242,155,29,0.17)',
  Maghrib: 'rgba(226,57,123,0.14)',
  Isha: 'rgba(29,111,180,0.14)',
  Jummah: 'rgba(46,139,87,0.14)',
};

const NIGHT = {
  cardBg: '#12233B',
  cardBorder: 'rgba(170,225,196,0.22)',
  cardText: '#EAF8F0',
  cardTextSoft: '#AFC9BE',
};

function safeClock(value: string | undefined): string {
  return value && value !== '-' ? value : '--:--';
}

function safeOptionalClock(value: string | undefined): string | undefined {
  if (!value || value === '-' || value === '--:--') return undefined;
  return value;
}

export function HomeInlinePrayerTimesSection({
  rows,
  nightMode,
  embedded = false,
  specialSchedule,
}: HomeInlinePrayerTimesSectionProps) {
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<'adhan' | 'jamaat'>('adhan');

  useEffect(() => {
    const id = setInterval(() => {
      setMode((prev) => (prev === 'adhan' ? 'jamaat' : 'adhan'));
    }, 5000);

    return () => clearInterval(id);
  }, []);

  const displayRows = useMemo<DisplayRow[]>(() => {
    return rows.map((row) => {
      const label = row.name === 'Jumuah' ? 'Jummah' : row.name;

      if (label === 'Jummah') {
        return {
          key: 'Jummah',
          label: 'Jummah',
          begins: safeClock(row.begins),
          jamaat: safeClock(row.jamaat),
          jamaat2: safeClock(row.jamaat2),
          tomorrowBegins: safeOptionalClock(row.tomorrowBegins),
          tomorrowJamaat: safeOptionalClock(row.tomorrowJamaat),
          state: row.state ?? 'future',
        };
      }

      return {
        key: label,
        label,
        begins: safeClock(row.begins),
        jamaat: safeClock(row.jamaat),
        tomorrowBegins: safeOptionalClock(row.tomorrowBegins),
        tomorrowJamaat: safeOptionalClock(row.tomorrowJamaat),
        state: row.state ?? 'future',
      };
    });
  }, [rows]);

  const oneRowMode = embedded && width < 460;
  const compact = width < 410 && !oneRowMode;
  const useTwoColumnLayout = !oneRowMode && width < 390;
  const tileColumns = useTwoColumnLayout ? 2 : (width < 330 ? 2 : 3);
  const tileStyle = oneRowMode
    ? styles.prayerCardOneRow
    : (tileColumns === 2 ? styles.prayerCardTwoCol : styles.prayerCardThreeCol);
  const condensedHeader = width < 430;
  const headerTitle = condensedHeader ? "Today's Prayers" : "Today's Prayer Times";

  const renderedPrayerTiles = displayRows.map((row, index) => {
    const highlighted = row.state === 'current' || row.state === 'next';
    const iconColor = ICON_COLORS[row.label] ?? '#2E8B57';
    const primary = mode === 'adhan' ? row.begins : row.jamaat;
    const secondary = mode === 'adhan' ? row.jamaat : row.begins;
    const tomorrowPreview = mode === 'adhan' ? row.tomorrowBegins : row.tomorrowJamaat;
    const showTomorrowPreview = !oneRowMode && row.state !== 'future' && !!tomorrowPreview;
    const tomorrowLabel = mode === 'adhan' ? 'Tomorrow' : 'Tomorrow';

    return (
      <View
        key={row.key}
        style={[
          styles.prayerCard,
          index % 2 === 0 ? styles.prayerCardVariantA : styles.prayerCardVariantB,
          tileStyle,
          compact && styles.prayerCardCompact,
          oneRowMode && styles.prayerCardOneRowTuned,
          highlighted && styles.prayerCardActive,
          nightMode && styles.prayerCardNight,
        ]}
      >
        <View style={[styles.prayerAccent, { backgroundColor: iconColor }, nightMode && styles.prayerAccentNight]} />
        {!compact && !oneRowMode ? <View style={[styles.tileInnerFrame, { borderColor: `${iconColor}2D` }, nightMode && styles.tileInnerFrameNight]} /> : null}
        <View style={[styles.iconBadge, compact && styles.iconBadgeCompact, oneRowMode && styles.iconBadgeOneRow, { backgroundColor: ICON_TINTS[row.label] ?? 'rgba(46,139,87,0.14)' }, nightMode && styles.iconBadgeNight]}>
          <MaterialIcons name={ICONS[row.label] ?? 'schedule'} size={oneRowMode ? 14 : compact ? 18 : 24} color={iconColor} />
        </View>
        <Text
          style={[styles.prayerName, compact && styles.prayerNameCompact, oneRowMode && styles.prayerNameOneRow, nightMode && { color: NIGHT.cardText }]}
          numberOfLines={1}
          adjustsFontSizeToFit={oneRowMode}
          minimumFontScale={0.78}
        >
          {row.label}
        </Text>
        <Text style={[styles.primaryTime, compact && styles.primaryTimeCompact, oneRowMode && styles.primaryTimeOneRow, nightMode && { color: NIGHT.cardText }]}>{primary}</Text>
        {!oneRowMode ? <Text style={[styles.secondaryTime, compact && styles.secondaryTimeCompact, nightMode && { color: NIGHT.cardTextSoft }]}>{secondary}</Text> : null}
        {showTomorrowPreview ? (
          <View style={[styles.tomorrowBadge, compact && styles.tomorrowBadgeCompact, nightMode && styles.tomorrowBadgeNight]}>
            <View style={styles.tomorrowBadgeTextBlock}>
              <Text style={[styles.tomorrowBadgeLabel, compact && styles.tomorrowBadgeLabelCompact, nightMode && styles.tomorrowBadgeLabelNight]}>{tomorrowLabel}</Text>
              {mode === 'jamaat' ? (
                <Text style={[styles.tomorrowBadgeMeta, compact && styles.tomorrowBadgeMetaCompact, nightMode && styles.tomorrowBadgeMetaNight]}>Jamaat</Text>
              ) : null}
            </View>
            <Text style={[styles.tomorrowBadgeTime, compact && styles.tomorrowBadgeTimeCompact, nightMode && styles.tomorrowBadgeTimeNight]}>{tomorrowPreview}</Text>
          </View>
        ) : null}
        {row.label === 'Jummah' && !oneRowMode ? (
          <Text style={[styles.thirdTime, compact && styles.thirdTimeCompact, nightMode && { color: NIGHT.cardTextSoft }]}>
            {`${row.jamaat} / ${row.jamaat2}`}
          </Text>
        ) : null}
      </View>
    );
  });

  return (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      <View
        style={[
          styles.card,
          nightMode ? styles.cardNight : styles.cardDay,
        ]}
      >
        <ImageBackground
          source={require('@/assets/images/background/kiswahkaabah.jpg')}
          style={styles.cardBgImage}
          imageStyle={styles.cardBgImageInner}
          resizeMode="cover"
        >
          <View style={[styles.cardBgTint, nightMode && styles.cardBgTintNight]} />
        </ImageBackground>

        <View pointerEvents="none" style={styles.cardPatternLayer}>
          <View style={[styles.patternCircle, styles.patternCircleTopRight, nightMode && styles.patternShapeNight]} />
          <View style={[styles.patternCircle, styles.patternCircleBottomLeft, nightMode && styles.patternShapeNight]} />
          <View style={[styles.patternDiamond, styles.patternDiamondUpper, nightMode && styles.patternShapeNight]} />
          <View style={[styles.patternDiamond, styles.patternDiamondLower, nightMode && styles.patternShapeNight]} />
        </View>

        <View style={styles.cardContent}>
        <View style={[styles.headerRow, compact && styles.headerRowCompact]}>
          <View style={styles.headerLeft}>
            <View style={[styles.calendarBadge, compact && styles.calendarBadgeCompact, nightMode && styles.calendarBadgeNight]}>
              <MaterialIcons name="calendar-today" size={compact ? 12 : 14} color={nightMode ? NIGHT.cardText : '#1B8661'} />
            </View>
            <Text style={[styles.title, condensedHeader && styles.titleCondensed, compact && styles.titleCompact, nightMode && { color: NIGHT.cardText }]} numberOfLines={1}>{headerTitle}</Text>
          </View>
          <View style={[styles.modePill, compact && styles.modePillCompact, nightMode && styles.modePillNight]}>
            <TouchableOpacity
              style={[styles.modeBtn, compact && styles.modeBtnCompact, mode === 'adhan' && styles.modeBtnActive, nightMode && mode === 'adhan' && styles.modeBtnActiveNight]}
              onPress={() => setMode('adhan')}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeBtnText, compact && styles.modeBtnTextCompact, nightMode && styles.modeBtnTextNight, mode === 'adhan' && styles.modeBtnTextActive]}>Adhan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, compact && styles.modeBtnCompact, mode === 'jamaat' && styles.modeBtnActive, nightMode && mode === 'jamaat' && styles.modeBtnActiveNight]}
              onPress={() => setMode('jamaat')}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeBtnText, compact && styles.modeBtnTextCompact, nightMode && styles.modeBtnTextNight, mode === 'jamaat' && styles.modeBtnTextActive]}>Jamaat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {specialSchedule && specialSchedule.times.length > 0 ? (
          <View style={[styles.specialStrip, compact && styles.specialStripCompact, nightMode && styles.specialStripNight]}>
            <View style={styles.specialStripHeader}>
              <View style={[styles.specialDot, specialSchedule.kind === 'eid' && styles.specialDotEid]} />
              <Text style={[styles.specialTitle, compact && styles.specialTitleCompact, nightMode && styles.specialTitleNight]}>{specialSchedule.title}</Text>
            </View>
            <View style={[styles.specialTimesRow, compact && styles.specialTimesRowCompact]}>
              {specialSchedule.times.map((time) => (
                <View key={`${specialSchedule.kind}-${time}`} style={[styles.specialTimeChip, compact && styles.specialTimeChipCompact, nightMode && styles.specialTimeChipNight]}>
                  <Text style={[styles.specialTimeText, compact && styles.specialTimeTextCompact, nightMode && styles.specialTimeTextNight]}>{time}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={[styles.rowsContainer, compact && styles.rowsContainerCompact, oneRowMode && styles.rowsContainerOneRow]}>
          {renderedPrayerTiles}
        </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  containerEmbedded: {
    paddingHorizontal: 0,
    marginTop: 8,
    width: '100%',
  },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 11,
    overflow: 'hidden',
  },
  cardDay: {
    backgroundColor: '#F4F7F5',
    borderColor: 'rgba(198,214,208,0.92)',
  },
  cardNight: {
    backgroundColor: NIGHT.cardBg,
    borderColor: NIGHT.cardBorder,
  },
  cardBgImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardBgImageInner: {
    opacity: 0.14,
    transform: [{ scale: 1.03 }],
  },
  cardBgTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(247,250,248,0.9)',
  },
  cardBgTintNight: {
    backgroundColor: 'rgba(18,35,59,0.84)',
  },
  cardContent: {
    zIndex: 1,
  },
  cardPatternLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  patternCircle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(34,91,50,0.04)',
    backgroundColor: 'rgba(34,91,50,0.01)',
    borderRadius: 999,
  },
  patternCircleTopRight: {
    width: 118,
    height: 118,
    top: -40,
    right: 72,
  },
  patternCircleBottomLeft: {
    width: 88,
    height: 88,
    bottom: -30,
    left: -18,
  },
  patternDiamond: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,91,50,0.04)',
    backgroundColor: 'rgba(34,91,50,0.01)',
    transform: [{ rotate: '45deg' }],
  },
  patternDiamondUpper: {
    top: 62,
    right: 214,
  },
  patternDiamondLower: {
    bottom: 26,
    right: 94,
  },
  patternShapeNight: {
    borderColor: 'rgba(170,225,196,0.16)',
    backgroundColor: 'rgba(170,225,196,0.045)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 11,
  },
  headerRowCompact: {
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  calendarBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46,168,104,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,168,104,0.28)',
  },
  calendarBadgeCompact: {
    width: 24,
    height: 24,
    borderRadius: 7,
  },
  calendarBadgeNight: {
    backgroundColor: 'rgba(170,225,196,0.1)',
    borderColor: 'rgba(170,225,196,0.25)',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E4736',
    letterSpacing: 0.2,
    flexShrink: 1,
    lineHeight: 20,
  },
  titleCondensed: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  titleCompact: {
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.15,
  },
  modePill: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(97,126,104,0.10)',
    backgroundColor: 'rgba(249,250,248,0.96)',
    padding: 4,
    gap: 4,
    flexShrink: 0,
  },
  modePillCompact: {
    padding: 2,
    gap: 2,
  },
  modePillNight: {
    borderColor: 'rgba(170,225,196,0.28)',
    backgroundColor: '#15314B',
  },
  modeBtn: {
    minWidth: 56,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modeBtnCompact: {
    minWidth: 46,
    height: 30,
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  modeBtnActive: {
    backgroundColor: '#396B4F',
    borderWidth: 1,
    borderColor: 'rgba(34,100,57,0.16)',
  },
  modeBtnActiveNight: {
    backgroundColor: '#268956',
    borderColor: 'rgba(170,225,196,0.35)',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3F6B54',
    letterSpacing: 0.2,
  },
  modeBtnTextCompact: {
    fontSize: 9.5,
  },
  modeBtnTextNight: {
    color: '#BCD3C8',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  rowsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 1,
  },
  rowsContainerCompact: {
    gap: 4,
    paddingVertical: 0,
  },
  rowsContainerOneRow: {
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    gap: 3,
  },
  specialStrip: {
    marginBottom: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(143,183,166,0.35)',
    backgroundColor: 'rgba(236,244,239,0.76)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  specialStripCompact: {
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 3,
  },
  specialStripNight: {
    borderColor: 'rgba(170,225,196,0.25)',
    backgroundColor: 'rgba(23,57,71,0.72)',
  },
  specialStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  specialDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2FAF64',
  },
  specialDotEid: {
    backgroundColor: '#E5A824',
  },
  specialTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1F6B4D',
    letterSpacing: 0.25,
  },
  specialTitleCompact: {
    fontSize: 9.5,
  },
  specialTitleNight: {
    color: '#D7EFE4',
  },
  specialTimesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specialTimesRowCompact: {
    gap: 4,
  },
  specialTimeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(47,175,100,0.45)',
    backgroundColor: 'rgba(47,175,100,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  specialTimeChipCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  specialTimeChipNight: {
    borderColor: 'rgba(170,225,196,0.35)',
    backgroundColor: 'rgba(170,225,196,0.14)',
  },
  specialTimeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E7C56',
    fontVariant: ['tabular-nums'] as any,
  },
  specialTimeTextCompact: {
    fontSize: 8.8,
  },
  specialTimeTextNight: {
    color: '#E6FAF0',
  },
  prayerCard: {
    minWidth: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(178,198,183,0.4)',
    backgroundColor: '#F8FBF7',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
    flexGrow: 0,
    flexShrink: 0,
  },
  prayerCardVariantA: {
    borderRadius: 12,
  },
  prayerCardVariantB: {
    borderRadius: 12,
  },
  prayerCardThreeCol: {
    width: '32%',
    aspectRatio: 0.72,
    minHeight: 112,
  },
  prayerCardTwoCol: {
    width: '49%',
    aspectRatio: 0.82,
    minHeight: 126,
  },
  prayerCardOneRow: {
    width: '16.5%',
    aspectRatio: 0.8,
    minHeight: 90,
  },
  prayerCardCompact: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  prayerCardOneRowTuned: {
    minHeight: 76,
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  prayerCardActive: {
    backgroundColor: '#F5F9F4',
    borderColor: 'rgba(84,157,120,0.18)',
  },
  prayerCardNight: {
    backgroundColor: '#162B45',
    borderColor: 'rgba(170,225,196,0.28)',
  },
  prayerName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
    color: '#2B4B39',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    lineHeight: 15,
    textAlign: 'center',
  },
  prayerNameCompact: {
    marginTop: 2,
    fontSize: 9.5,
    letterSpacing: 0.2,
  },
  prayerNameOneRow: {
    marginTop: 1,
    width: '100%',
    fontSize: 8,
    lineHeight: 10,
    letterSpacing: 0,
  },
  primaryTime: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '800',
    color: '#1B3628',
    fontVariant: ['tabular-nums'] as any,
    lineHeight: 22,
  },
  primaryTimeCompact: {
    marginTop: 0,
    fontSize: 15,
  },
  primaryTimeOneRow: {
    marginTop: 1,
    fontSize: 13.8,
    lineHeight: 19,
  },
  secondaryTime: {
    marginTop: 4,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#667B69',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: 0.2,
    lineHeight: 12,
  },
  secondaryTimeCompact: {
    marginTop: 1,
    fontSize: 8.6,
  },
  thirdTime: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: '700',
    color: '#809793',
    fontVariant: ['tabular-nums'] as any,
    letterSpacing: 0.15,
    lineHeight: 11,
  },
  thirdTimeCompact: {
    fontSize: 8.2,
  },
  tomorrowBadge: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(98,149,131,0.45)',
    backgroundColor: 'rgba(231,241,236,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    minHeight: 30,
  },
  tomorrowBadgeCompact: {
    marginTop: 4,
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 28,
  },
  tomorrowBadgeNight: {
    borderColor: 'rgba(170,225,196,0.28)',
    backgroundColor: 'rgba(170,225,196,0.1)',
  },
  tomorrowBadgeTextBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
  },
  tomorrowBadgeLabel: {
    fontSize: 7.2,
    fontWeight: '800',
    color: '#3A7F64',
    textTransform: 'uppercase',
    letterSpacing: 0.25,
  },
  tomorrowBadgeLabelCompact: {
    fontSize: 6.8,
  },
  tomorrowBadgeMeta: {
    marginTop: 1,
    fontSize: 7.2,
    fontWeight: '700',
    color: '#4A7E69',
  },
  tomorrowBadgeMetaCompact: {
    fontSize: 6.8,
  },
  tomorrowBadgeLabelNight: {
    color: '#A7D8C1',
  },
  tomorrowBadgeMetaNight: {
    color: '#CFEFDA',
  },
  tomorrowBadgeTime: {
    fontSize: 9.6,
    fontWeight: '800',
    color: '#245E47',
    fontVariant: ['tabular-nums'] as any,
  },
  tomorrowBadgeTimeCompact: {
    fontSize: 8.6,
  },
  tomorrowBadgeTimeNight: {
    color: '#DFF6EB',
  },
  prayerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.72,
  },
  prayerAccentNight: {
    opacity: 0.75,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(44,91,50,0.08)',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  iconBadgeNight: {
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconBadgeCompact: {
    width: 32,
    height: 32,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
  },
  iconBadgeOneRow: {
    width: 28,
    height: 28,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  tileInnerFrame: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderRadius: 16,
    borderColor: 'rgba(34,91,50,0.04)',
  },
  tileInnerFrameNight: {
    borderColor: 'rgba(170,225,196,0.2)',
  },
  tileCornerOrb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(34,91,50,0.04)',
  },
  tileCornerOrbLeft: {
    top: -6,
    left: -6,
  },
  tileCornerOrbRight: {
    right: -7,
    bottom: -7,
  },
  tileCornerOrbNight: {
    opacity: 0.75,
  },
});
