import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';
import { isBST } from '@/services/prayerService';
import { lookupTimetable, type DayTimetable } from '@/services/timetableData';
import {
  fetchHijriCalendarForMonth,
  fetchPrayerTimesForMonth,
  type PrayerTimeRow,
} from '@/services/contentService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MonthDay {
  date: Date;
  key: string;
  day: DayTimetable | null;
  dbRow: PrayerTimeRow | null;
  isToday: boolean;
  isFriday: boolean;
  isCurrentMonth: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type NightPalette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSub: string;
  textMuted: string;
};

function buildMonthGrid(
  year: number,
  month: number,
  today: Date,
  dbRows: Map<number, PrayerTimeRow>,
  hijriRows: Map<number, string>,
): MonthDay[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = new Date(year, month, 0);
  const daysInPrev = prevMonth.getDate();
  const cells: MonthDay[] = [];

  const makeCell = (d: Date, isCurrentMonth: boolean): MonthDay => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${dd}/${mm}/${d.getFullYear()}`;
    const isToday = d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    const dbRow = isCurrentMonth ? (dbRows.get(d.getDate()) ?? null) : null;
    const hijriDate = isCurrentMonth ? (hijriRows.get(d.getDate()) ?? null) : null;
    const local = lookupTimetable(d);

    let day: DayTimetable | null = local;
    if (dbRow && local) {
      day = {
        ...local,
        fajr: dbRow.fajr,
        sunrise: dbRow.sunrise,
        dhuhr: dbRow.zuhr,
        asr: dbRow.asr,
        maghrib: dbRow.maghrib,
        isha: dbRow.isha,
        iqFajr: dbRow.fajr_jamat ?? local.iqFajr,
        iqDhuhr: dbRow.zuhr_jamat ?? local.iqDhuhr,
        iqAsr: dbRow.asr_jamat ?? local.iqAsr,
        iqMaghrib: dbRow.maghrib_jamat ?? local.iqMaghrib,
        iqIsha: dbRow.isha_jamat ?? local.iqIsha,
        hijri: hijriDate ?? local.hijri,
      };
    } else if (dbRow && !local) {
      day = {
        fajr: dbRow.fajr,
        sunrise: dbRow.sunrise,
        ishraq: dbRow.ishraq ?? '',
        zawaal: dbRow.zawaal ?? undefined,
        dhuhr: dbRow.zuhr,
        asr: dbRow.asr,
        maghrib: dbRow.maghrib,
        isha: dbRow.isha,
        jumuah: dbRow.jumu_ah_1,
        hijri: hijriDate ?? '',
        iqFajr: dbRow.fajr_jamat ?? '07:30',
        iqDhuhr: dbRow.zuhr_jamat ?? '13:00',
        iqAsr: dbRow.asr_jamat ?? '15:30',
        iqMaghrib: dbRow.maghrib_jamat ?? dbRow.maghrib,
        iqIsha: dbRow.isha_jamat ?? '20:00',
      };
    } else if (local && hijriDate) {
      day = {
        ...local,
        hijri: hijriDate,
      };
    }

    return { date: d, key, day, dbRow, isToday, isFriday: d.getDay() === 5, isCurrentMonth };
  };

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push(makeCell(new Date(year, month - 1, daysInPrev - i), false));
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(makeCell(new Date(year, month, i), true));
  }
  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 1; i <= remaining; i++) {
    cells.push(makeCell(new Date(year, month + 1, i), false));
  }
  return cells;
}

function CalendarPrayerPanel({
  selectedDay,
  nightMode,
  nightPalette,
}: {
  selectedDay: MonthDay | null;
  nightMode: boolean;
  nightPalette: NightPalette;
}) {
  const N = nightMode ? nightPalette : null;

  if (!selectedDay?.day) {
    return (
      <View style={[panelStyles.emptyWrap, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="touch-app" size={28} color={N ? N.textMuted : Colors.textSubtle} style={{ opacity: 0.5 }} />
        <Text style={[panelStyles.emptyTitle, N && { color: N.textSub }]}>Tap a date to see prayer times</Text>
        <Text style={[panelStyles.emptySub, N && { color: N.textMuted }]}>Select any day from the calendar above</Text>
      </View>
    );
  }

  const { day, dbRow, date, isFriday } = selectedDay;
  const bstFallback = isBST(date);

  const baseRows: {
    label: string;
    color: string;
    icon: string;
    athan: string;
    iqamah: string | null;
    isJumuah?: boolean;
    jumuahFirst?: string;
    jumuahSecond?: string;
  }[] = [
    { label: 'Fajr', color: '#3949AB', icon: 'bedtime', athan: day.fajr, iqamah: day.iqFajr },
    { label: 'Sunrise', color: '#E4A11B', icon: 'wb-sunny', athan: day.sunrise, iqamah: null },
    { label: 'Ishraq', color: '#0F8D73', icon: 'flare', athan: day.ishraq, iqamah: null },
    { label: 'Dhuhr', color: '#1B8A5A', icon: 'wb-sunny', athan: day.dhuhr, iqamah: day.iqDhuhr },
    { label: 'Asr', color: '#E65100', icon: 'wb-cloudy', athan: day.asr, iqamah: day.iqAsr },
    { label: 'Maghrib', color: '#AD1457', icon: 'nights-stay', athan: day.maghrib, iqamah: day.iqMaghrib },
    { label: 'Isha', color: '#283593', icon: 'nightlight-round', athan: day.isha, iqamah: day.iqIsha },
  ];

  const j1Raw = dbRow?.jumu_ah_1 ?? (bstFallback ? '13:30' : '12:45');
  const j2Raw = dbRow?.jumu_ah_2 ?? (bstFallback ? '14:30' : '13:30');

  const orderedRows = isFriday
    ? baseRows.map((row) =>
        row.label === 'Dhuhr'
          ? {
              label: 'Jumuah',
              color: '#F9A825',
              icon: 'star',
              athan: day.dhuhr,
              iqamah: null,
              isJumuah: true,
              jumuahFirst: j1Raw,
              jumuahSecond: j2Raw,
            }
          : row
      )
    : baseRows;

  return (
    <View style={[panelStyles.panel, N && { backgroundColor: N.surface, borderColor: N.border }]}>
      <View style={[panelStyles.colRow, N && { backgroundColor: N.surfaceAlt, borderBottomColor: N.border }]}>
        <Text style={[panelStyles.colLbl, { flex: 1 }]}>PRAYER</Text>
        <Text style={[panelStyles.colLbl, { width: 72, textAlign: 'center' }]}>BEGINS</Text>
        <Text style={[panelStyles.colLbl, { width: 72, textAlign: 'center' }]}>IQAMAH</Text>
      </View>

      {orderedRows.map((p, idx) => (
        <View
          key={p.label}
          style={[
            panelStyles.prayerRow,
            idx < orderedRows.length - 1 && [panelStyles.prayerRowBorder, N && { borderBottomColor: N.border }],
            N && { backgroundColor: N.surface },
          ]}
        >
          <View style={[panelStyles.iconBox, { backgroundColor: p.color + '1E' }]}>
            <MaterialIcons name={p.icon as any} size={13} color={p.color} />
          </View>
          <Text style={[panelStyles.prayerName, N && { color: N.text }]}>{p.label}</Text>
          <Text style={[panelStyles.athanTime, N && { color: N.textSub }]}>{p.athan}</Text>
          {p.isJumuah ? (
            <View style={panelStyles.jumuahIqamahWrap}>
              <Text style={[panelStyles.jumuahMiniLabel, N && { color: N.textMuted }]}>First</Text>
              <Text style={[panelStyles.jumuahMiniTime, N && { color: N.text }]}>{p.jumuahFirst ?? '—'}</Text>
              <Text style={[panelStyles.jumuahMiniLabel, panelStyles.jumuahMiniLabelGap, N && { color: N.textMuted }]}>Second</Text>
              <Text style={[panelStyles.jumuahMiniTime, N && { color: N.text }]}>{p.jumuahSecond ?? '—'}</Text>
            </View>
          ) : (
            <Text style={[panelStyles.iqamahTime, !p.iqamah && { color: Colors.textSubtle }, N && p.iqamah && { color: N.text }]}>
              {p.iqamah || '—'}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

export default function MonthlyCalendarSection({
  today,
  nightMode,
  nightPalette,
  transliterateHijri,
  getHijriDayNum,
  getHijriMonthName,
}: {
  today: Date;
  nightMode: boolean;
  nightPalette: NightPalette;
  transliterateHijri: (hijri: string) => string;
  getHijriDayNum: (hijri: string) => string;
  getHijriMonthName: (hijri: string) => string;
}) {
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [dbRows, setDbRows] = useState<Map<number, PrayerTimeRow>>(new Map());
  const [hijriRows, setHijriRows] = useState<Map<number, string>>(new Map());
  const [dbLoading, setDbLoading] = useState(false);
  const N = nightMode ? nightPalette : null;

  const [selectedDay, setSelectedDay] = useState<MonthDay | null>(null);

  const currentGrid = React.useMemo(
    () => buildMonthGrid(viewYear, viewMonth, today, dbRows, hijriRows),
    [viewYear, viewMonth, today, dbRows, hijriRows]
  );

  const calRows: MonthDay[][] = [];
  for (let i = 0; i < currentGrid.length; i += 7) calRows.push(currentGrid.slice(i, i + 7));

  useEffect(() => {
    setDbLoading(true);
    Promise.all([
      fetchPrayerTimesForMonth(viewMonth + 1),
      fetchHijriCalendarForMonth(viewYear, viewMonth + 1),
    ])
      .then(([rows, hijri]) => {
        const prayerMap = new Map<number, PrayerTimeRow>();
        rows.forEach((r) => prayerMap.set(r.day, r));

        const hijriMap = new Map<number, string>();
        hijri.forEach((r) => hijriMap.set(r.gregorian_day, r.hijri_date));

        setDbRows(prayerMap);
        setHijriRows(hijriMap);
        setDbLoading(false);
      })
      .catch(() => setDbLoading(false));
  }, [viewMonth, viewYear]);

  useEffect(() => {
    if (selectedDay) {
      const refreshed = currentGrid.find((c) => c.key === selectedDay.key);
      if (refreshed) setSelectedDay(refreshed);
    } else {
      const todayCell = currentGrid.find((c) => c.isToday && c.isCurrentMonth) ?? null;
      setSelectedDay(todayCell);
    }
  }, [dbRows, currentGrid, selectedDay]);

  const goBack = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
    setDbRows(new Map());
    setHijriRows(new Map());
  };

  const goForward = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
    setDbRows(new Map());
    setHijriRows(new Map());
  };

  const firstWithHijri = currentGrid.find((c) => c.isCurrentMonth && c.day?.hijri);
  const viewHijriMonth = firstWithHijri?.day ? getHijriMonthName(firstWithHijri.day.hijri) : '';
  const viewHijriYear = firstWithHijri?.day
    ? (() => {
        const m = firstWithHijri.day.hijri.match(/\b(\d{4})\b/);
        return m ? m[1] : '';
      })()
    : '';

  const cellW = Math.floor((SCREEN_WIDTH - 24) / 7);
  const cellH = Math.max(44, Math.floor(cellW * 1.05));

  return (
    <View style={[calStyles.splitContainer, N && { backgroundColor: N.bg }]}> 
      <View style={[calStyles.gridSection, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}> 
        <View style={[calStyles.navRow, { paddingHorizontal: 8 }]}> 
          <TouchableOpacity onPress={goBack} style={[calStyles.navArrow, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]} activeOpacity={0.7}>
            <MaterialIcons name="chevron-left" size={20} color={N ? '#69A8FF' : Colors.primary} />
          </TouchableOpacity>

          <View style={calStyles.monthLabel}>
            <Text style={[calStyles.monthName, N && { color: N.text }]}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            {selectedDay?.day ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MaterialIcons name="brightness-3" size={9} color={selectedDay.isFriday ? '#B8860B' : (N ? '#69C995' : Colors.primary)} />
                <Text
                  style={[calStyles.hijriMonthSub, { color: selectedDay.isFriday ? '#B8860B' : (N ? '#69C995' : Colors.primary) }]}
                  numberOfLines={1}
                >
                  {transliterateHijri(selectedDay.day.hijri)}
                </Text>
                {selectedDay.isFriday ? (
                  <View style={[panelStyles.fridayBadge, { backgroundColor: 'rgba(249,168,37,0.18)', borderColor: 'rgba(249,168,37,0.45)', paddingHorizontal: 5, paddingVertical: 1 }]}>
                    <MaterialIcons name="star" size={8} color="#F9A825" />
                    <Text style={[panelStyles.fridayBadgeText, { color: '#B8860B', fontSize: 9 }]}>Jumuah</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                {viewHijriMonth ? (
                  <>
                    <MaterialIcons name="brightness-3" size={9} color={N ? '#69C995' : Colors.primary} />
                    <Text style={[calStyles.hijriMonthSub, N && { color: '#69C995' }]}>
                      {viewHijriMonth}{viewHijriYear ? ` ${viewHijriYear} AH` : ''}
                    </Text>
                  </>
                ) : null}
                {dbLoading ? <Text style={calStyles.syncLabel}>  Syncing...</Text> : null}
              </View>
            )}
          </View>

          <TouchableOpacity onPress={goForward} style={[calStyles.navArrow, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]} activeOpacity={0.7}>
            <MaterialIcons name="chevron-right" size={20} color={N ? '#69A8FF' : Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[calStyles.dayLabelsRow, { paddingHorizontal: 4 }, N && { borderBottomColor: N.border }]}> 
          {DAY_LABELS.map((d) => (
            <View key={d} style={[calStyles.dayLabelCell, { width: cellW }]}> 
              <Text style={[calStyles.dayLabelText, d === 'Fri' && [calStyles.fridayLabel, N && { color: '#69C995' }], N && d !== 'Fri' && { color: N.textMuted }]}>{d}</Text>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
          {calRows.map((row, ri) => (
            <View key={ri} style={calStyles.gridRow}>
              {row.map((cell) => {
                const isSelected = selectedDay?.key === cell.key;
                const hijriDay = cell.day ? getHijriDayNum(cell.day.hijri) : '';
                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={[
                      calStyles.cell,
                      { width: cellW, height: cellH },
                      cell.isToday && [calStyles.cellToday],
                      isSelected && !cell.isToday && [calStyles.cellSelected, N && { backgroundColor: N.surfaceAlt, borderColor: '#69A8FF' }],
                      !cell.isCurrentMonth && calStyles.cellFaded,
                    ]}
                    onPress={() => setSelectedDay(isSelected ? null : cell)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      calStyles.cellGreg,
                      N && !cell.isToday && { color: cell.isCurrentMonth ? N.text : N.textMuted },
                      cell.isToday && calStyles.cellGregToday,
                      cell.isFriday && !cell.isToday && [calStyles.cellGregFriday, N && { color: '#69C995' }],
                      !cell.isCurrentMonth && calStyles.cellFadedText,
                    ]}>
                      {cell.date.getDate()}
                    </Text>
                    {hijriDay ? (
                      <Text style={[
                        calStyles.cellHijri,
                        N && !cell.isToday && { color: N.textMuted },
                        cell.isToday && calStyles.cellHijriToday,
                        !cell.isCurrentMonth && calStyles.cellFadedText,
                      ]}>
                        {hijriDay}
                      </Text>
                    ) : null}
                    {cell.isFriday && cell.isCurrentMonth ? <View style={calStyles.jumuahDot} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={[calStyles.inlineLegend, N && { borderTopColor: N.border }]}> 
          <View style={calStyles.legendItem}>
            <View style={[calStyles.legendDot, { backgroundColor: Colors.primary }]} />
            <Text style={[calStyles.legendTxt, N && { color: N.textMuted }]}>Today</Text>
          </View>
          <View style={calStyles.legendItem}>
            <Text style={[calStyles.legendTxt, { color: N ? '#69C995' : Colors.primary, fontWeight: '800' }]}>Fri</Text>
            <Text style={[calStyles.legendTxt, N && { color: N.textMuted }]}>=Jumuah</Text>
          </View>
          <View style={calStyles.legendItem}>
            <View style={[calStyles.legendDot, { backgroundColor: '#F9A825' }]} />
            <Text style={[calStyles.legendTxt, N && { color: N.textMuted }]}>Fri dot</Text>
          </View>
          <View style={calStyles.legendItem}>
            <MaterialIcons name="touch-app" size={10} color={N ? N.textMuted : Colors.textSubtle} />
            <Text style={[calStyles.legendTxt, N && { color: N.textMuted }]}>Tap date</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={[calStyles.panelSection, N && { backgroundColor: N.bg }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <CalendarPrayerPanel selectedDay={selectedDay} nightMode={nightMode} nightPalette={nightPalette} />
      </ScrollView>
    </View>
  );
}

const calStyles = StyleSheet.create({
  splitContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Colors.background,
  },
  gridSection: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  panelSection: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navArrow: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { alignItems: 'center', flex: 1, paddingHorizontal: 6 },
  monthName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  hijriMonthSub: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.1,
  },
  syncLabel: {
    fontSize: 9,
    color: Colors.textSubtle,
  },
  inlineLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendTxt: { fontSize: 7.5, fontWeight: '500', color: Colors.textSubtle },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 4,
  },
  dayLabelCell: { alignItems: 'center', paddingVertical: 1 },
  dayLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSubtle,
    letterSpacing: 0.2,
  },
  fridayLabel: { color: Colors.primary },
  gridRow: { flexDirection: 'row', marginBottom: 2 },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 0,
  },
  cellToday: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cellSelected: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
  },
  cellFaded: { opacity: 0.25 },
  cellFadedText: { color: Colors.textSubtle },
  cellGreg: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  cellGregToday: { color: '#fff' },
  cellGregFriday: { color: Colors.primary },
  cellHijri: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
    lineHeight: 11,
    textAlign: 'center',
  },
  cellHijriToday: { color: 'rgba(255,255,255,0.88)' },
  jumuahDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F9A825',
    marginTop: 0,
  },
});

const panelStyles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    margin: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSubtle,
    textAlign: 'center',
  },
  panel: {
    flex: 1,
    backgroundColor: Colors.surface,
    margin: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  fridayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(249,168,37,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(249,168,37,0.55)',
  },
  fridayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF8E1',
  },
  colRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colLbl: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSubtle,
    letterSpacing: 0.9,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
    backgroundColor: Colors.surface,
  },
  prayerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  athanTime: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    width: 72,
    textAlign: 'center',
  },
  iqamahTime: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    width: 72,
    textAlign: 'center',
  },
  jumuahIqamahWrap: {
    width: 72,
    alignItems: 'center',
  },
  jumuahMiniLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSubtle,
    lineHeight: 12,
  },
  jumuahMiniLabelGap: {
    marginTop: 3,
  },
  jumuahMiniTime: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 14,
  },
});
