import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spacing } from '@/constants/theme';
import { HomeTheme } from '@/constants/homeTheme';
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
  isTomorrow?: boolean;
  state: DrawerPrayerRow['state'];
};

const NIGHT = {
  cardBg: '#12233B',
  cardBorder: 'rgba(170,225,196,0.22)',
  cardText: '#EAF8F0',
  cardTextSoft: '#AFC9BE',
  divider: 'rgba(214,236,223,0.14)',
};

function safeClock(value: string | undefined): string {
  return value && value !== '-' ? value : '--:--';
}

export function HomeInlinePrayerTimesSection({
  rows,
  nightMode,
  embedded = false,
  specialSchedule,
}: HomeInlinePrayerTimesSectionProps) {
  const { width } = useWindowDimensions();
  const compact = width < 410;

  const displayRows = useMemo<DisplayRow[]>(() => rows.map((row) => ({
    key: row.name,
    label: row.name === 'Jumuah' ? 'Jummah' : row.name === 'Zawaal' ? 'Zawal' : row.name,
    begins: safeClock(row.begins),
    jamaat: ['Sunrise', 'Ishraq', 'Duha', 'Zawaal'].includes(row.name) ? '—' : safeClock(row.jamaat),
    jamaat2: row.jamaat2 && row.jamaat2 !== '-' ? row.jamaat2 : undefined,
    tomorrowBegins: row.tomorrowBegins,
    tomorrowJamaat: row.tomorrowJamaat,
    isTomorrow: row.isTomorrow,
    state: row.state ?? 'future',
  })), [rows]);

  const specialRows = displayRows.filter((row) => ['Ishraq', 'Duha', 'Zawaal'].includes(row.key));
  const prayerRows = displayRows.filter((row) => !['Ishraq', 'Duha', 'Zawaal'].includes(row.key));

  return (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      <View style={[styles.card, nightMode ? styles.cardNight : styles.cardDay]}>
        <View style={[styles.headerRow, compact && styles.headerRowCompact]}>
          <View style={styles.headerLeft}>
            <View style={[styles.calendarBadge, nightMode && styles.calendarBadgeNight]}>
              <MaterialIcons name="calendar-today" size={14} color={nightMode ? NIGHT.cardText : HomeTheme.sectionKicker} />
            </View>
            <Text style={[styles.title, compact && styles.titleCompact, nightMode && { color: NIGHT.cardText }]} numberOfLines={1}>
              Today&apos;s Prayer Times
            </Text>
          </View>
        </View>

        {specialSchedule && specialSchedule.times.length > 0 ? (
          <View style={[styles.specialSchedule, nightMode && styles.specialScheduleNight]}>
            <Text style={[styles.specialScheduleTitle, nightMode && { color: NIGHT.cardText }]}>{specialSchedule.title}</Text>
            <Text style={[styles.specialScheduleTimes, nightMode && { color: NIGHT.cardTextSoft }]}>
              {specialSchedule.times.join('  ·  ')}
            </Text>
          </View>
        ) : null}

        <View style={[styles.table, nightMode && styles.tableNight]}>
          <View style={[styles.tableHeader, nightMode && styles.tableHeaderNight]}>
            <Text style={[styles.tableHeading, styles.prayerColumn, nightMode && styles.tableHeadingNight]}>Prayer</Text>
            <Text style={[styles.tableHeading, styles.timeColumn, nightMode && styles.tableHeadingNight]}>Begins</Text>
            <Text style={[styles.tableHeading, styles.timeColumn, nightMode && styles.tableHeadingNight]}>Jamaat</Text>
          </View>
          {prayerRows.map((row, index) => {
            const isCurrent = row.state === 'current';
            const isNext = row.state === 'next';
            const stateLabel = isCurrent ? 'CURRENT PRAYER' : isNext ? (row.isTomorrow ? 'NEXT · TOMORROW' : 'NEXT') : null;
            const showTomorrow = row.state === 'past' && !!row.tomorrowBegins;

            return (
              <View
                key={row.key}
                style={[
                  styles.tableRow,
                  index < prayerRows.length - 1 && (nightMode ? styles.tableRowDividerNight : styles.tableRowDivider),
                  isCurrent && (nightMode ? styles.tableRowCurrentNight : styles.tableRowCurrent),
                  isNext && (nightMode ? styles.tableRowNextNight : styles.tableRowNext),
                ]}
              >
                <View style={styles.prayerColumn}>
                  <View style={styles.prayerNameRow}>
                    <Text style={[styles.prayerName, isCurrent && styles.prayerNameCurrent, nightMode && { color: NIGHT.cardText }]} numberOfLines={1}>{row.label}</Text>
                    {stateLabel ? (
                      <Text style={[
                        styles.stateLabel,
                        isCurrent ? styles.stateLabelCurrent : styles.stateLabelNext,
                        nightMode && (isCurrent ? styles.stateLabelCurrentNight : styles.stateLabelNight),
                      ]}>{stateLabel}</Text>
                    ) : null}
                  </View>
                  {row.label === 'Sunrise' ? (
                    <Text style={[styles.specialRowDescription, nightMode && { color: NIGHT.cardTextSoft }]}>Fajr ends at sunrise</Text>
                  ) : null}
                </View>
                <View style={styles.timeColumn}>
                  <Text style={[styles.timeValue, isCurrent && styles.timeValueCurrent, nightMode && { color: NIGHT.cardText }]}>{row.begins}</Text>
                  {showTomorrow ? (
                    <Text style={[styles.tomorrowTime, nightMode && styles.tomorrowTimeNight]}>+24h {row.tomorrowBegins}</Text>
                  ) : null}
                </View>
                <View style={[styles.jamaatColumn]}>
                  <Text style={[styles.timeValue, nightMode && { color: NIGHT.cardText }]}>{row.jamaat}</Text>
                  {row.jamaat2 ? (
                    <Text style={[styles.secondJamaat, nightMode && { color: NIGHT.cardTextSoft }]}>
                      {row.jamaat2}
                    </Text>
                  ) : null}
                  {showTomorrow && row.tomorrowJamaat ? (
                    <Text style={[styles.tomorrowTime, nightMode && styles.tomorrowTimeNight]}>+24h {row.tomorrowJamaat}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {specialRows.length > 0 ? (
          <View style={styles.specialPrayerGrid}>
            {specialRows.map((row) => {
              const isPast = row.state === 'past';
              const isCurrent = row.state === 'current';
              const showTomorrow = isPast && !!row.tomorrowBegins;
              return (
                <View
                  key={row.key}
                  style={[
                    styles.specialPrayerCard,
                    nightMode && styles.specialPrayerCardNight,
                    isCurrent && (nightMode ? styles.specialPrayerCardCurrentNight : styles.specialPrayerCardCurrent),
                  ]}
                >
                  <View style={styles.specialPrayerLeft}>
                    <View style={styles.specialPrayerHeading}>
                      <MaterialIcons
                        name={row.key === 'Zawaal' ? 'hourglass-empty' : 'wb-sunny'}
                        size={13}
                        color={nightMode ? '#A7D8C1' : HomeTheme.sectionKicker}
                      />
                      {isCurrent ? (
                        <Text style={[styles.specialPrayerState, nightMode && styles.specialPrayerStateNight]}>NOW</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.specialPrayerName, nightMode && { color: NIGHT.cardText }]}>{row.label}</Text>
                  </View>
                  <View style={styles.specialPrayerRight}>
                    <Text style={[styles.specialPrayerTime, nightMode && { color: NIGHT.cardText }]}>{row.begins}</Text>
                    {showTomorrow ? (
                      <Text style={[styles.tomorrowTime, styles.specialTomorrowTime, nightMode && styles.tomorrowTimeNight]}>+24h {row.tomorrowBegins}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
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
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  cardDay: {
    backgroundColor: HomeTheme.canvasSoft,
    borderColor: HomeTheme.borderSoft,
  },
  cardNight: {
    backgroundColor: NIGHT.cardBg,
    borderColor: NIGHT.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
    backgroundColor: HomeTheme.quickAccessIconBg,
    borderWidth: 1,
    borderColor: HomeTheme.borderSoft,
  },
  calendarBadgeNight: {
    backgroundColor: 'rgba(170,225,196,0.1)',
    borderColor: 'rgba(170,225,196,0.25)',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: HomeTheme.sectionTitle,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  titleCompact: {
    fontSize: 13,
  },
  specialSchedule: {
    marginBottom: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: HomeTheme.borderSoft,
    backgroundColor: HomeTheme.canvas,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  specialScheduleNight: {
    borderColor: NIGHT.cardBorder,
    backgroundColor: 'rgba(23,57,71,0.72)',
  },
  specialScheduleTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: HomeTheme.sectionKicker,
  },
  specialScheduleTimes: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    color: HomeTheme.sectionSubtle,
    fontVariant: ['tabular-nums'],
  },
  table: {
    borderWidth: 1,
    borderColor: HomeTheme.borderSoft,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: HomeTheme.quickAccessBg,
  },
  tableNight: {
    borderColor: NIGHT.cardBorder,
    backgroundColor: '#162B45',
  },
  tableHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: HomeTheme.canvas,
  },
  tableHeaderNight: {
    backgroundColor: 'rgba(170,225,196,0.08)',
  },
  tableHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: HomeTheme.sectionKicker,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  tableHeadingNight: {
    color: '#A7D8C1',
  },
  prayerColumn: {
    flex: 1,
    minWidth: 0,
  },
  timeColumn: {
    width: 76,
    alignItems: 'flex-end',
  },
  jamaatColumn: {
    width: 76,
    alignItems: 'flex-end',
  },
  tableRow: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tableRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: HomeTheme.communityRowSeparator,
  },
  tableRowDividerNight: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: NIGHT.divider,
  },
  tableRowCurrent: {
    backgroundColor: '#E8F7EE',
    borderLeftWidth: 4,
    borderLeftColor: '#21834A',
  },
  tableRowCurrentNight: {
    backgroundColor: 'rgba(67,190,115,0.2)',
    borderLeftWidth: 4,
    borderLeftColor: '#65D18C',
  },
  tableRowNext: {
    backgroundColor: 'rgba(42,95,154,0.08)',
  },
  tableRowNextNight: {
    backgroundColor: 'rgba(105,168,255,0.12)',
  },
  prayerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  prayerName: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.sectionTitle,
  },
  prayerNameCurrent: {
    fontWeight: '800',
  },
  stateLabel: {
    overflow: 'hidden',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.35,
    color: '#FFFFFF',
    backgroundColor: '#3477A8',
  },
  stateLabelCurrent: {
    backgroundColor: '#21834A',
  },
  stateLabelCurrentNight: {
    backgroundColor: '#287A4A',
    color: '#FFFFFF',
  },
  stateLabelNext: {
    backgroundColor: '#3477A8',
  },
  specialRowDescription: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    color: HomeTheme.sectionSubtle,
  },
  timeValueCurrent: {
    fontSize: 15,
    fontWeight: '800',
  },
  tomorrowTime: {
    marginTop: 3,
    fontSize: 9,
    fontWeight: '700',
    color: '#31945A',
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  tomorrowTimeNight: {
    color: '#85D6A1',
  },
  specialTomorrowTime: {
    marginTop: 0,
    textAlign: 'right',
  },
  specialPrayerLeft: {
    width: '100%',
    minWidth: 0,
  },
  specialPrayerRight: {
    width: '100%',
    alignItems: 'flex-start',
  },
  specialPrayerGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  specialPrayerCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: HomeTheme.borderSoft,
    backgroundColor: HomeTheme.canvas,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  specialPrayerCardNight: {
    borderColor: NIGHT.cardBorder,
    backgroundColor: 'rgba(23,57,71,0.52)',
  },
  specialPrayerCardCurrent: {
    borderColor: '#21834A',
    backgroundColor: '#E8F7EE',
  },
  specialPrayerCardCurrentNight: {
    borderColor: '#65D18C',
    backgroundColor: 'rgba(67,190,115,0.2)',
  },
  specialPrayerHeading: {
    minHeight: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
  },
  specialPrayerState: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: 'hidden',
    backgroundColor: '#21834A',
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
  },
  specialPrayerStateNight: {
    backgroundColor: '#287A4A',
  },
  specialPrayerName: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '800',
    color: HomeTheme.sectionTitle,
    flexShrink: 1,
  },
  specialPrayerDescription: {
    minHeight: 26,
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    color: HomeTheme.sectionSubtle,
  },
  specialPrayerTime: {
    marginTop: 0,
    fontSize: 12,
    fontWeight: '800',
    color: HomeTheme.sectionTitle,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  stateLabelNight: {
    color: '#A7D8C1',
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: HomeTheme.sectionTitle,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  secondJamaat: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    color: HomeTheme.sectionSubtle,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
});
