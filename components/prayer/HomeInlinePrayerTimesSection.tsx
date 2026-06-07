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

  const compact = displayRows.length >= 6 || width < 430;
  const oneRowMode = embedded && width < 460;
  const tileColumns = width < 330 ? 2 : 3;
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
    const showTomorrowPreview = !oneRowMode && row.state === 'past' && !!tomorrowPreview;

    return (
      <View
        key={row.key}
        style={[
          styles.prayerCard,
          index % 2 === 0 ? styles.prayerCardVariantA : styles.prayerCardVariantB,
          tileStyle,
          compact && styles.prayerCardCompact,
          highlighted && styles.prayerCardActive,
          nightMode && styles.prayerCardNight,
        ]}
      >
        <View style={[styles.prayerAccent, { backgroundColor: iconColor }, nightMode && styles.prayerAccentNight]} />
        {!compact && !oneRowMode ? <View style={[styles.tileInnerFrame, { borderColor: `${iconColor}2D` }, nightMode && styles.tileInnerFrameNight]} /> : null}
        {!oneRowMode ? <View style={[styles.tileCornerOrb, styles.tileCornerOrbLeft, { backgroundColor: `${iconColor}2B` }, nightMode && styles.tileCornerOrbNight]} /> : null}
        {!oneRowMode ? <View style={[styles.tileCornerOrb, styles.tileCornerOrbRight, { backgroundColor: `${iconColor}24` }, nightMode && styles.tileCornerOrbNight]} /> : null}
        <View style={[styles.iconBadge, compact && styles.iconBadgeCompact, oneRowMode && styles.iconBadgeOneRow, { backgroundColor: ICON_TINTS[row.label] ?? 'rgba(46,139,87,0.14)' }, nightMode && styles.iconBadgeNight]}>
          <MaterialIcons name={ICONS[row.label] ?? 'schedule'} size={oneRowMode ? 14 : compact ? 18 : 24} color={iconColor} />
        </View>
        <Text style={[styles.prayerName, compact && styles.prayerNameCompact, oneRowMode && styles.prayerNameOneRow, nightMode && { color: NIGHT.cardText }]}>{row.label}</Text>
        <Text style={[styles.primaryTime, compact && styles.primaryTimeCompact, oneRowMode && styles.primaryTimeOneRow, nightMode && { color: NIGHT.cardText }]}>{primary}</Text>
        {!oneRowMode ? <Text style={[styles.secondaryTime, compact && styles.secondaryTimeCompact, nightMode && { color: NIGHT.cardTextSoft }]}>{secondary}</Text> : null}
        {showTomorrowPreview ? (
          <View style={[styles.tomorrowBadge, compact && styles.tomorrowBadgeCompact, nightMode && styles.tomorrowBadgeNight]}>
            <Text style={[styles.tomorrowBadgeLabel, compact && styles.tomorrowBadgeLabelCompact, nightMode && styles.tomorrowBadgeLabelNight]}>+24h</Text>
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
    borderColor: 'rgba(28,112,83,0.11)',
    backgroundColor: 'rgba(28,112,83,0.03)',
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
    borderColor: 'rgba(28,112,83,0.12)',
    backgroundColor: 'rgba(28,112,83,0.035)',
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
    fontSize: 14,
    fontWeight: '800',
    color: '#156F4C',
    letterSpacing: 0.3,
    flexShrink: 1,
    lineHeight: 18,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(188,205,199,0.95)',
    backgroundColor: '#E8EFEC',
    padding: 3,
    gap: 3,
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
    minWidth: 50,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  modeBtnCompact: {
    minWidth: 46,
    height: 30,
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  modeBtnActive: {
    backgroundColor: '#2FAF64',
    borderWidth: 1,
    borderColor: 'rgba(31,126,76,0.95)',
  },
  modeBtnActiveNight: {
    backgroundColor: '#268956',
    borderColor: 'rgba(170,225,196,0.35)',
  },
  modeBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#4E655D',
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
    gap: 4,
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
    borderColor: 'rgba(205,219,214,0.95)',
    backgroundColor: '#F7FAF8',
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexGrow: 0,
    flexShrink: 0,
  },
  prayerCardVariantA: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 26,
    borderBottomLeftRadius: 14,
  },
  prayerCardVariantB: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 26,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 26,
  },
  prayerCardThreeCol: {
    width: '31.5%',
    aspectRatio: 0.72,
  },
  prayerCardTwoCol: {
    width: '48.5%',
    aspectRatio: 0.82,
  },
  prayerCardOneRow: {
    width: '16.1%',
    aspectRatio: 1.02,
  },
  prayerCardCompact: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  prayerCardActive: {
    backgroundColor: '#ECF5F0',
    borderColor: 'rgba(84,157,120,0.7)',
  },
  prayerCardNight: {
    backgroundColor: '#162B45',
    borderColor: 'rgba(170,225,196,0.28)',
  },
  prayerName: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '800',
    color: '#256A4E',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
    lineHeight: 14,
  },
  prayerNameCompact: {
    marginTop: 2,
    fontSize: 8.8,
    letterSpacing: 0.2,
  },
  prayerNameOneRow: {
    marginTop: 1,
    fontSize: 8.2,
    lineHeight: 10,
    letterSpacing: 0.1,
  },
  primaryTime: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: '800',
    color: '#182627',
    fontVariant: ['tabular-nums'] as any,
    lineHeight: 23,
  },
  primaryTimeCompact: {
    marginTop: 0,
    fontSize: 15,
  },
  primaryTimeOneRow: {
    marginTop: 0,
    fontSize: 12.6,
    lineHeight: 14,
  },
  secondaryTime: {
    marginTop: 2,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#69817D',
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
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(98,149,131,0.45)',
    backgroundColor: 'rgba(231,241,236,0.95)',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tomorrowBadgeCompact: {
    marginTop: 2,
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  tomorrowBadgeNight: {
    borderColor: 'rgba(170,225,196,0.28)',
    backgroundColor: 'rgba(170,225,196,0.1)',
  },
  tomorrowBadgeLabel: {
    fontSize: 7.6,
    fontWeight: '800',
    color: '#3A7F64',
  },
  tomorrowBadgeLabelCompact: {
    fontSize: 7,
  },
  tomorrowBadgeLabelNight: {
    color: '#A7D8C1',
  },
  tomorrowBadgeTime: {
    fontSize: 8,
    fontWeight: '800',
    color: '#245E47',
    fontVariant: ['tabular-nums'] as any,
  },
  tomorrowBadgeTimeCompact: {
    fontSize: 7.4,
  },
  tomorrowBadgeTimeNight: {
    color: '#DFF6EB',
  },
  prayerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.72,
  },
  prayerAccentNight: {
    opacity: 0.75,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
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
    top: 7,
    left: 7,
    right: 7,
    bottom: 7,
    borderWidth: 1,
    borderRadius: 16,
  },
  tileInnerFrameNight: {
    borderColor: 'rgba(170,225,196,0.2)',
  },
  tileCornerOrb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
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
