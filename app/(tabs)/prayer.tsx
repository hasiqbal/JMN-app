import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
  ImageBackground,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { APP_CONFIG } from '@/constants/config';
import {
  getPrayerTimesForDate,
  getPrayerTimesFromTimetable,
  getNextPrayer,
  getForbiddenTimeInfo,
  getJumuahInfo,
  formatCountdownSeconds,
  isBST,
  PrayerTimesData,
  PrayerTime,
  ForbiddenTimeInfo,
  JumuahInfo,
} from '@/services/prayerService';
import { lookupTimetable, DayTimetable } from '@/services/timetableData';
import { fetchPrayerTimesForMonth, fetchPrayerTimeForDay, PrayerTimeRow } from '@/services/contentService';
import { useNightMode } from '@/hooks/useNightMode';
import { useLocalSearchParams } from 'expo-router';
import type { NightModePref } from '@/contexts/NightModeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Monthly Calendar Types ────────────────────────────────────────────────
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
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

// ── Hijri Transliteration ─────────────────────────────────────────────────
const ARABIC_MONTHS: Record<string, string> = {
  'ذو القعدة': "Dhul Qa'dah",
  'ذو الحجّة': 'Dhul Hijjah',
  'ربيع الأوّل': "Rabi' al-Awwal",
  'ربيع الآخر': "Rabi' al-Akhir",
  'جمادى الأولى': 'Jumada al-Ula',
  'جمادى الآخرة': 'Jumada al-Akhirah',
  'محرّم': 'Muharram',
  'رجب': 'Rajab',
  "شعبان": "Sha'ban",
  'رمضان': 'Ramadan',
  'شوّال': 'Shawwal',
  'صفر': 'Safar',
};

const ARABIC_DAYS: Record<string, string> = {
  'الاثنين': 'Monday',
  'الثلاثاء': 'Tuesday',
  'الأربعاء': 'Wednesday',
  'الخميس': 'Thursday',
  'الجمعة': 'Friday',
  'السبت': 'Saturday',
  'الأحد': 'Sunday',
};

function transliterateHijri(arabic: string): string {
  let result = arabic;
  for (const [ar, en] of Object.entries(ARABIC_DAYS)) {
    result = result.replace(ar, en);
  }
  // Sort month keys longest first to avoid partial matches
  const sorted = Object.entries(ARABIC_MONTHS).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of sorted) {
    result = result.replace(ar, en);
  }
  return result;
}

function getHijriDayNum(hijri: string): string {
  const match = hijri.match(/\b(\d{1,2})\b/);
  return match ? match[1] : '';
}

function getHijriMonthName(hijri: string): string {
  const sorted = Object.entries(ARABIC_MONTHS).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of sorted) {
    if (hijri.includes(ar)) return en;
  }
  return '';
}

function getHijriMonthShort(hijri: string): string {
  const sorted = Object.entries(ARABIC_MONTHS).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of sorted) {
    if (hijri.includes(ar)) {
      // Return first word of English month name (abbreviated)
      return en.split(' ')[0].substring(0, 3);
    }
  }
  return '';
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const norm = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(norm / 60)).padStart(2,'0')}:${String(norm % 60).padStart(2,'0')}`;
}

function getJumuahTimesForDate(date: Date) {
  const bst = isBST(date);
  return {
    khutbah: bst ? '1:15 PM' : '12:30 PM',
    jamaat1: bst ? '1:30 PM' : '12:45 PM',
    jamaat2: bst ? '2:30 PM' : '1:30 PM',
  };
}

function buildMonthGrid(
  year: number,
  month: number,
  today: Date,
  dbRows: Map<number, PrayerTimeRow>,
): MonthDay[] {
  const firstDay = new Date(year, month, 1);
  let startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = new Date(year, month, 0);
  const daysInPrev = prevMonth.getDate();
  const cells: MonthDay[] = [];

  const makeCell = (d: Date, isCurrentMonth: boolean): MonthDay => {
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const key = `${dd}/${mm}/${d.getFullYear()}`;
    const isToday = d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate();
    const dbRow = isCurrentMonth ? (dbRows.get(d.getDate()) ?? null) : null;
    const local = lookupTimetable(d);
    // Merge DB data into DayTimetable shape for display
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
        hijri: '',
        iqFajr: dbRow.fajr_jamat ?? '07:30',
        iqDhuhr: dbRow.zuhr_jamat ?? '13:00',
        iqAsr: dbRow.asr_jamat ?? '15:30',
        iqMaghrib: dbRow.maghrib_jamat ?? dbRow.maghrib,
        iqIsha: dbRow.isha_jamat ?? '20:00',
      };
    }
    return { date: d, key, day, dbRow, isToday, isFriday: d.getDay()===5, isCurrentMonth };
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

// ── Compact Prayer Times Panel ───────────────────────────────────────────
function CalendarPrayerPanel({
  selectedDay,
  nightMode,
}: {
  selectedDay: MonthDay | null;
  nightMode: boolean;
}) {
  const N = nightMode ? NIGHT : null;

  if (!selectedDay?.day) {
    // Empty state — prompt user to tap a date
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

  const fmt12 = (t: string) => {
    if (!t || t.includes('M')) return t;
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  // Core prayer rows only (compact) — show Fajr/Dhuhr/Asr/Maghrib/Isha
  const CORE_ROWS = [
    { label: 'Fajr',    color: '#3949AB', icon: 'bedtime',          athan: day.fajr,    iqamah: day.iqFajr    },
    { label: 'Dhuhr',   color: '#1B8A5A', icon: 'wb-sunny',         athan: day.dhuhr,   iqamah: day.iqDhuhr   },
    { label: 'Asr',     color: '#E65100', icon: 'wb-cloudy',        athan: day.asr,     iqamah: day.iqAsr     },
    { label: 'Maghrib', color: '#AD1457', icon: 'nights-stay',      athan: day.maghrib, iqamah: day.iqMaghrib },
    { label: 'Isha',    color: '#283593', icon: 'nightlight-round', athan: day.isha,    iqamah: day.iqIsha    },
  ];

  const j1Raw = dbRow?.jumu_ah_1 ?? (bstFallback ? '13:30' : '12:45');
  const j2Raw = dbRow?.jumu_ah_2 ?? (bstFallback ? '14:30' : '13:30');

  return (
    <View style={[panelStyles.panel, N && { backgroundColor: N.surface, borderColor: N.border }]}>
      {/* ── Column labels ── */}
      <View style={[panelStyles.colRow, N && { backgroundColor: N.surfaceAlt, borderBottomColor: N.border }]}>
        <Text style={[panelStyles.colLbl, { flex: 1 }]}>PRAYER</Text>
        <Text style={[panelStyles.colLbl, { width: 52, textAlign: 'center' }]}>BEGINS</Text>
        <Text style={[panelStyles.colLbl, { width: 52, textAlign: 'center' }]}>IQAMAH</Text>
      </View>

      {/* ── Prayer rows (compact) ── */}
      {CORE_ROWS.map((p, idx) => (
        <View
          key={p.label}
          style={[
            panelStyles.prayerRow,
            idx < CORE_ROWS.length - 1 && [panelStyles.prayerRowBorder, N && { borderBottomColor: N.border }],
            N && { backgroundColor: N.surface },
          ]}
        >
          <View style={[panelStyles.iconBox, { backgroundColor: p.color + '1E' }]}>
            <MaterialIcons name={p.icon as any} size={13} color={p.color} />
          </View>
          <Text style={[panelStyles.prayerName, N && { color: N.text }]}>{p.label}</Text>
          <Text style={[panelStyles.athanTime, N && { color: N.textSub }]}>{p.athan}</Text>
          <Text style={[panelStyles.iqamahTime, { color: p.iqamah ? Colors.primary : Colors.textSubtle }, N && p.iqamah && { color: '#69C995' }]}>
            {p.iqamah || '—'}
          </Text>
        </View>
      ))}

      {/* ── Jumuah footer — always show on Fridays ── */}
      {isFriday ? (
        <View style={[panelStyles.jumuahRow, N && { backgroundColor: N.jumuahBg, borderTopColor: N.jumuahBord }]}>
          <View style={panelStyles.jumuahIconWrap}>
            <MaterialIcons name="star" size={22} color="#F9A825" />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={panelStyles.jumuahLabel}>Jumuah Prayer</Text>
              <Text style={[panelStyles.jumuahSeason, N && { backgroundColor: 'rgba(249,168,37,0.2)', color: '#F9A825' }]}>{bstFallback ? 'BST' : 'GMT'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={panelStyles.jumuahTimeBlock}>
                <Text style={panelStyles.jumuahOrder}>1st Jamaat</Text>
                <Text style={panelStyles.jumuahTime}>{fmt12(j1Raw)}</Text>
              </View>
              <View style={panelStyles.jumuahDividerV} />
              <View style={panelStyles.jumuahTimeBlock}>
                <Text style={panelStyles.jumuahOrder}>2nd Jamaat</Text>
                <Text style={panelStyles.jumuahTime}>{fmt12(j2Raw)}</Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ── Month Calendar Component ──────────────────────────────────────────────
function MonthlyCalendar({ today, nightMode }: { today: Date; nightMode: boolean }) {
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [dbRows, setDbRows] = useState<Map<number, PrayerTimeRow>>(new Map());
  const [dbLoading, setDbLoading] = useState(false);
  const N = nightMode ? NIGHT : null;

  const [selectedDay, setSelectedDay] = useState<MonthDay | null>(null);

  // Rebuild grid whenever dbRows / month changes — memoised so cell taps always reference current DB data
  const currentGrid = React.useMemo(
    () => buildMonthGrid(viewYear, viewMonth, today, dbRows),
    [viewYear, viewMonth, today, dbRows]
  );
  const calRows: MonthDay[][] = [];
  for (let i = 0; i < currentGrid.length; i += 7) calRows.push(currentGrid.slice(i, i + 7));

  // When month changes, fetch DB rows
  useEffect(() => {
    setDbLoading(true);
    fetchPrayerTimesForMonth(viewMonth + 1).then(rows => {
      const map = new Map<number, PrayerTimeRow>();
      rows.forEach(r => map.set(r.day, r));
      setDbRows(map);
      setDbLoading(false);
    }).catch(() => setDbLoading(false));
  }, [viewMonth, viewYear]);

  // Once DB rows load: refresh an existing selection OR auto-select today
  useEffect(() => {
    if (selectedDay) {
      // Refresh the currently-selected cell with the latest DB data
      const refreshed = currentGrid.find(c => c.key === selectedDay.key);
      if (refreshed) setSelectedDay(refreshed);
    } else {
      // Pre-select today so prayer times appear immediately
      const todayCell = currentGrid.find(c => c.isToday && c.isCurrentMonth) ?? null;
      setSelectedDay(todayCell);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbRows]); // currentGrid changes whenever dbRows changes — safe to omit

  const goBack = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
    setDbRows(new Map());
  };
  const goForward = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
    setDbRows(new Map());
  };

  const firstWithHijri = currentGrid.find(c => c.isCurrentMonth && c.day?.hijri);
  const viewHijriMonth = firstWithHijri?.day ? getHijriMonthName(firstWithHijri.day.hijri) : '';
  const viewHijriYear  = firstWithHijri?.day ? (() => { const m = firstWithHijri.day!.hijri.match(/\b(\d{4})\b/); return m ? m[1] : ''; })() : '';

  // Stacked layout: calendar fills full width, prayer panel below
  const CELL_W = Math.floor((SCREEN_WIDTH - 24) / 7);
  const CELL_H = Math.max(44, Math.floor(CELL_W * 1.05));

  return (
    <View style={[calStyles.splitContainer, N && { backgroundColor: N.bg }]}>

      {/* ═══════════════ TOP: CALENDAR GRID ═══════════════ */}
      <View style={[calStyles.gridSection, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>

        {/* Month nav */}
        <View style={[calStyles.navRow, { paddingHorizontal: 8 }]}>
          <TouchableOpacity onPress={goBack} style={[calStyles.navArrow, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]} activeOpacity={0.7}>
            <MaterialIcons name="chevron-left" size={20} color={N ? '#69A8FF' : Colors.primary} />
          </TouchableOpacity>

          <View style={calStyles.monthLabel}>
            <Text style={[calStyles.monthName, N && { color: N.text }]}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            {/* Show selected day's Islamic date when a day is tapped, else show month Hijri */}
            {selectedDay?.day ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MaterialIcons name="brightness-3" size={9} color={selectedDay.isFriday ? '#B8860B' : (N ? '#69C995' : Colors.primary)} />
                <Text style={[calStyles.hijriMonthSub, { color: selectedDay.isFriday ? '#B8860B' : (N ? '#69C995' : Colors.primary) }]} numberOfLines={1}>
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
                {dbLoading ? <Text style={calStyles.syncLabel}>  Syncing…</Text> : null}
              </View>
            )}
          </View>

          <TouchableOpacity onPress={goForward} style={[calStyles.navArrow, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]} activeOpacity={0.7}>
            <MaterialIcons name="chevron-right" size={20} color={N ? '#69A8FF' : Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Day-of-week header */}
        <View style={[calStyles.dayLabelsRow, { paddingHorizontal: 4 }, N && { borderBottomColor: N.border }]}>
          {DAY_LABELS.map(d => (
            <View key={d} style={[calStyles.dayLabelCell, { width: CELL_W }]}>
              <Text style={[calStyles.dayLabelText, d === 'Fri' && [calStyles.fridayLabel, N && { color: '#69C995' }], N && d !== 'Fri' && { color: N.textMuted }]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
          {calRows.map((row, ri) => (
            <View key={ri} style={calStyles.gridRow}>
              {row.map(cell => {
                const isSelected = selectedDay?.key === cell.key;
                const hijriDay = cell.day ? getHijriDayNum(cell.day.hijri) : '';
                const hijriMon = cell.day ? getHijriMonthShort(cell.day.hijri) : '';
                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={[
                      calStyles.cell,
                      { width: CELL_W, height: CELL_H },
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
                    {cell.isFriday && cell.isCurrentMonth ? (
                      <View style={calStyles.jumuahDot} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Legend (compact inline) */}
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

      {/* ═══════════════ BOTTOM: PRAYER TIMES PANEL ═══════════════ */}
      <ScrollView
        style={[calStyles.panelSection, N && { backgroundColor: N.bg }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <CalendarPrayerPanel selectedDay={selectedDay} nightMode={nightMode} />
      </ScrollView>

    </View>
  );
}

const PRAYER_ICONS: Record<string, string> = {
  Fajr: 'bedtime',
  Sunrise: 'wb-sunny',
  Ishraq: 'flare',
  Zawaal: 'blur-on',
  Dhuhr: 'wb-sunny',
  Asr: 'wb-cloudy',
  Maghrib: 'nights-stay',
  Isha: 'nightlight-round',
  Jumuah: 'star',
};

const PRAYER_COLORS: Record<string, string> = {
  Fajr: '#3949AB',
  Sunrise: '#FF8F00',
  Ishraq: '#FFB300',
  Zawaal: '#00897B',
  Dhuhr: '#1B8A5A',
  Asr: '#E65100',
  Maghrib: '#AD1457',
  Isha: '#283593',
  Jumuah: '#F9A825',
};

// Time-of-day sky gradients for the Next Prayer banner
const PRAYER_GRADIENTS: Record<string, readonly [string, string, ...string[]]> = {
  Fajr:    ['rgba(20,20,80,0.82)', 'rgba(40,40,120,0.75)'],
  Sunrise: ['rgba(180,80,0,0.78)', 'rgba(220,140,0,0.72)'],
  Ishraq:  ['rgba(200,100,0,0.75)', 'rgba(240,190,0,0.68)'],
  Zawaal:  ['rgba(0,80,70,0.78)', 'rgba(0,140,120,0.72)'],
  Dhuhr:   ['rgba(10,70,160,0.78)', 'rgba(20,130,220,0.72)'],
  Asr:     ['rgba(150,40,0,0.78)', 'rgba(220,90,30,0.72)'],
  Maghrib: ['rgba(80,10,120,0.80)', 'rgba(180,20,80,0.74)'],
  Isha:    ['rgba(8,14,50,0.85)', 'rgba(20,30,100,0.80)'],
  Jumuah:  ['rgba(100,60,0,0.82)', 'rgba(160,100,0,0.78)'],
};

// Sky background images per prayer period
const PRAYER_BG_IMAGES: Record<string, any> = {
  Fajr:    require('@/assets/images/sky-night.jpg'),
  Sunrise: require('@/assets/images/sky-sunrise.jpg'),
  Ishraq:  require('@/assets/images/sky-sunrise.jpg'),
  Zawaal:  require('@/assets/images/sky-noon.jpg'),
  Dhuhr:   require('@/assets/images/sky-noon.jpg'),
  Asr:     require('@/assets/images/sky-afternoon.jpg'),
  Maghrib: require('@/assets/images/sky-sunset.jpg'),
  Isha:    require('@/assets/images/sky-night.jpg'),
  Jumuah:  require('@/assets/images/sky-noon.jpg'),
};

// Special info-only prayers (no iqamah, no "next" targeting)
const SPECIAL_PRAYERS = new Set(['Sunrise', 'Ishraq', 'Zawaal']);

// Human-readable sky period label
function getSkyPeriodLabel(prayer: string): string {
  switch (prayer) {
    case 'Fajr':    return 'Pre-Dawn · Night';
    case 'Sunrise': return 'Sunrise · Morning';
    case 'Ishraq':  return 'Morning Light';
    case 'Zawaal':  return 'Near Noon';
    case 'Dhuhr':   return 'Midday · Afternoon';
    case 'Asr':     return 'Late Afternoon';
    case 'Maghrib': return 'Sunset · Dusk';
    case 'Isha':    return 'Night · Late Evening';
    case 'Jumuah':  return 'Friday · Jumuah Prayer';
    default:        return '';
  }
}

// ── Night Mode ────────────────────────────────────────────────────────────
// Active from Maghrib athan until Fajr athan (next morning)
function isNightPeriod(prayers: PrayerTime[], now: Date): boolean {
  const maghrib = prayers.find(p => p.name === 'Maghrib');
  const fajr    = prayers.find(p => p.name === 'Fajr');
  if (!maghrib || !fajr) return false;
  // Night = after Maghrib OR before Fajr
  return now >= maghrib.timeDate || now < fajr.timeDate;
}

const NIGHT = {
  bg:         '#0A0F1E',
  surface:    '#121929',
  surfaceAlt: '#192338',
  border:     '#1E2D47',
  text:       '#EEF3FC',
  textSub:    '#93B4D8',
  textMuted:  '#5A7A9E',
  rowSpecial: '#141E2F',
  jumuahBg:   '#1A160A',
  jumuahBord: '#3D2F00',
};

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Night Mode Toggle Button ─────────────────────────────────────────────
function NightModeToggle({
  modePref, onSelect,
}: {
  modePref: NightModePref;
  onSelect: (p: NightModePref) => void;
}) {
  const N_active = modePref === 'night';
  const options: { pref: NightModePref; icon: string; label: string }[] = [
    { pref: 'day',   icon: 'wb-sunny',        label: 'Day'  },
    { pref: 'auto',  icon: 'brightness-auto', label: 'Auto' },
    { pref: 'night', icon: 'nights-stay',     label: 'Night' },
  ];
  return (
    <View style={[nmToggleStyles.row]}>
      {options.map(({ pref, icon, label }) => {
        const active = modePref === pref;
        return (
          <TouchableOpacity
            key={pref}
            onPress={() => onSelect(pref)}
            activeOpacity={0.75}
            style={[nmToggleStyles.btn, active && (N_active ? nmToggleStyles.btnNight : nmToggleStyles.btnActive)]}
          >
            <MaterialIcons
              name={icon as any}
              size={11}
              color={active ? '#fff' : Colors.textSubtle}
            />
            <Text style={[nmToggleStyles.label, { color: active ? '#fff' : Colors.textSubtle }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const nmToggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: 999,
    padding: 2,
    gap: 2,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 4,
    borderRadius: 999,
  },
  btnActive: { backgroundColor: Colors.primary },
  btnNight:  { backgroundColor: '#2A4A7A' },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
});

export default function PrayerScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode, modePref, setModePref } = useNightMode();
  const [data, setData] = useState<PrayerTimesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayDbRow, setTodayDbRow] = useState<PrayerTimeRow | null>(null);
  const { view: viewParam } = useLocalSearchParams<{ view?: string }>();
  const [viewMode, setViewMode] = useState<'today' | 'month'>(viewParam === 'month' ? 'month' : 'today');

  // Respond to navigation param changes (e.g. from Home date card)
  React.useEffect(() => {
    if (viewParam === 'month') setViewMode('month');
  }, [viewParam]);
  const [forbiddenInfo, setForbiddenInfo] = useState<ForbiddenTimeInfo | null>(null);
  const [jumuahInfo, setJumuahInfo] = useState<JumuahInfo | null>(null);
  const now = useCurrentTime();

  // next prayer info - updated every second
  const [nextInfo, setNextInfo] = useState<{ prayer: PrayerTime; secondsLeft: number } | null>(null);

  // ── Prayer alert state ──────────────────────────────────────────────────
  const JAMAAT_FLASH_MS = 60 * 1000;
  const flashAnim = useRef(new Animated.Value(1)).current;
  const flashLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Detect active prayer (time has begun, next hasn't)
  const prayable = data?.prayers.filter(p => !['Sunrise', 'Ishraq', 'Zawaal'].includes(p.name)) ?? [];
  let activePrayer: PrayerTime | null = null;
  for (let i = 0; i < prayable.length; i++) {
    const cur = prayable[i];
    const nxt = prayable[i + 1];
    if (cur.timeDate <= now && (!nxt || nxt.timeDate > now)) { activePrayer = cur; break; }
  }

  const jamaatDate: Date | null = (() => {
    if (!activePrayer) return null;
    const iq = activePrayer.iqamah;
    if (!iq || iq === '-' || iq === '--:--') return null;
    const [h, m] = iq.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  })();

  const jamaatStarted = jamaatDate ? now >= jamaatDate : false;
  const jamaatFlashOver = jamaatDate ? now >= new Date(jamaatDate.getTime() + JAMAAT_FLASH_MS) : false;
  const alertMode = activePrayer !== null && !jamaatFlashOver;

  const secondsToJamaat = jamaatDate && !jamaatStarted
    ? Math.max(0, Math.floor((jamaatDate.getTime() - now.getTime()) / 1000))
    : 0;
  const jmm = Math.floor(secondsToJamaat / 60);
  const jss = secondsToJamaat % 60;
  const jamaatCountdown = `${String(jmm).padStart(2, '0')}:${String(jss).padStart(2, '0')}`;
  const hasJamaat = jamaatDate !== null;

  useEffect(() => {
    if (jamaatStarted && !jamaatFlashOver) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 0.15, duration: 400, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      flashLoopRef.current = loop;
      loop.start();
    } else {
      flashLoopRef.current?.stop();
      flashLoopRef.current = null;
      flashAnim.setValue(1);
    }
    return () => { flashLoopRef.current?.stop(); };
  }, [jamaatStarted, jamaatFlashOver]);

  const loadTimes = useCallback(async () => {
    // Seed instantly from local timetable
    const local = getPrayerTimesFromTimetable();
    if (local) setData(local);
    setLoading(true);
    try {
      const result = await getPrayerTimesForDate();
      if (result) setData(result);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { loadTimes(); }, [loadTimes]);

  // Load today's DB row for dynamic Jumu'ah times
  useEffect(() => {
    const today = new Date();
    fetchPrayerTimeForDay(today.getMonth() + 1, today.getDate()).then(row => {
      setTodayDbRow(row);
    });
  }, []);

  // Refresh at midnight
  useEffect(() => {
    if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
      loadTimes();
    }
  }, [now, loadTimes]);

  // Update next prayer / forbidden info every second
  useEffect(() => {
    if (!data) return;
    setNextInfo(getNextPrayer(data.prayers));
    setForbiddenInfo(getForbiddenTimeInfo(data.prayers));
    setJumuahInfo(getJumuahInfo());
  }, [data, now]);

  const countdown = nextInfo ? formatCountdownSeconds(nextInfo.secondsLeft) : '';
  const nextPrayerName = nextInfo?.prayer.name ?? '';

  // show a subtle source indicator
  const sourceLabel = loading ? 'Syncing with database…' : 'Live · Jami\u2019 Masjid Noorani, Halifax · 2026';

  const hasPassed = (prayer: PrayerTime): boolean => {
    return prayer.timeDate <= now;
  };

  const isCurrentPrayer = (prayer: PrayerTime): boolean => {
    if (!data || SPECIAL_PRAYERS.has(prayer.name)) return false;
    const prayable = data.prayers.filter(p => !SPECIAL_PRAYERS.has(p.name));
    const idx = prayable.findIndex(p => p.name === prayer.name);
    if (idx < 0) return false;
    const start = prayable[idx].timeDate;
    const end = prayable[idx + 1]?.timeDate ?? new Date(start.getTime() + 3600000);
    return now >= start && now < end;
  };

  // Night mode (auto from prayer times, overrideable via toggle)
  const autoNight = data ? isNightPeriod(data.prayers, now) : false;
  const N = nightMode ? NIGHT : null; // shorthand; null = day mode

  const isFriday = now.getDay() === 5;
  const bst = isBST(now);
  // Dynamic Jumu'ah times from DB, fallback to BST/GMT defaults
  const fmt12Jumuah = (t: string) => {
    if (!t || t.includes('M')) return t;
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
  };
  const j1Raw = todayDbRow?.jumu_ah_1 ?? (bst ? '13:30' : '12:45');
  const j2Raw = todayDbRow?.jumu_ah_2 ?? (bst ? '14:30' : '13:30');
  const j1 = fmt12Jumuah(j1Raw);
  const j2 = fmt12Jumuah(j2Raw);
  const season = bst ? 'BST · Summer' : 'GMT · Winter';

  // Jumuah countdown label
  const jumuahCountdownLabel = (() => {
    if (!jumuahInfo || !isFriday) return null;
    if (jumuahInfo.phase === 'before_khutbah')
      return { label: 'Khutbah begins in', seconds: jumuahInfo.secondsToKhutbah };
    if (jumuahInfo.phase === 'khutbah')
      return { label: '2nd Jamaat in', seconds: jumuahInfo.secondsToJamaat2 };
    if (jumuahInfo.phase === 'between')
      return { label: '2nd Jamaat in', seconds: jumuahInfo.secondsToJamaat2 };
    return null;
  })();

  // Find next prayer Iqamah
  const nextIqamah = nextInfo?.prayer.iqamah && nextInfo.prayer.iqamah !== '-'
    ? nextInfo.prayer.iqamah
    : null;

  // Determine if countdown is to Athan or Iqamah (after athan, before iqamah)
  const nextPrayerObj = data?.prayers.find(p => p.name === nextPrayerName);
  const athanPassed = nextPrayerObj ? nextPrayerObj.timeDate <= now : false;

  return (
    <View style={[styles.container, { paddingTop: insets.top }, N && { backgroundColor: N.bg }]}>
      {/* Header — compact in month view, full in today view */}
      {viewMode === 'month' ? (
        /* ── Compact month header ── */
        <View style={[styles.headerCompact, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
          <TouchableOpacity onPress={() => setViewMode('today')} style={styles.backToTodayBtn} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={18} color={N ? '#69A8FF' : Colors.primary} />
            <Text style={[styles.backToTodayText, N && { color: '#69A8FF' }]}>Today</Text>
          </TouchableOpacity>
          <Text style={[styles.headerCompactTitle, N && { color: N.text }]}>Monthly View</Text>
          <NightModeToggle modePref={modePref} onSelect={setModePref} />
        </View>
      ) : (
        /* ── Full today header ── */
        <View style={[styles.header, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
          <View style={styles.headerRow1}>
            <Image
              source={require('@/assets/images/masjid-logo.png')}
              style={styles.headerLogo}
              contentFit="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerMasjidName, N && { color: '#69C995' }]}>Jami' Masjid Noorani</Text>
              <Text style={[styles.headerTitle, N && { color: N.text }]}>Prayer Times</Text>
              <Text style={[styles.headerCity, N && { color: N.textSub }]}>{APP_CONFIG.masjidAddress}</Text>
              <View style={styles.headerDateRow}>
                <Text style={[styles.headerDateGreg, N && { color: N.text }]}>
                  {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </Text>
                {data ? (
                  <>
                    <Text style={[styles.headerDateSep, N && { color: N.textMuted }]}>·</Text>
                    <Text style={[styles.headerDateHijri, N && { color: N ? '#6BB89A' : Colors.primary }]}>
                      {getHijriDayNum(data.hijriDate)} {getHijriMonthName(data.hijriDate)}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
            <NightModeToggle modePref={modePref} onSelect={setModePref} />
            <TouchableOpacity
              onPress={() => setViewMode('month')}
              style={[styles.calBtn, N && { backgroundColor: N.surfaceAlt }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="event" size={20} color={N ? '#69A8FF' : Colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.viewToggle, { alignSelf: 'stretch' }, N && { backgroundColor: N.border }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, { flex: 1 }, styles.toggleBtnActive]}
              onPress={() => setViewMode('today')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="access-time" size={15} color="#fff" />
              <Text style={[styles.toggleBtnText, styles.toggleBtnTextActive]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, { flex: 1 }]}
              onPress={() => setViewMode('month')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="calendar-month" size={15} color={N ? N.textSub : Colors.textSubtle} />
              <Text style={[styles.toggleBtnText, N && { color: N.textSub }]}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Monthly Calendar View — split layout fills remaining screen ── */}
      {viewMode === 'month' ? (
        <MonthlyCalendar today={now} nightMode={nightMode} />
      ) : null}

      {viewMode === 'today' ? <ScrollView showsVerticalScrollIndicator={false}>
        {/* Forbidden Time Banner */}
        {forbiddenInfo ? (
          <View style={styles.forbiddenBanner}>
            <View style={styles.forbiddenLeft}>
              <MaterialIcons name="do-not-disturb" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.forbiddenTitle}>{forbiddenInfo.label}</Text>
                <Text style={styles.forbiddenReason}>{forbiddenInfo.reason}</Text>
              </View>
            </View>
            <View style={styles.forbiddenRight}>
              <Text style={styles.forbiddenUntilLabel}>Resumes at</Text>
              <Text style={styles.forbiddenUntilTime}>{forbiddenInfo.endsAt}</Text>
              <Text style={styles.forbiddenTimer}>{formatCountdownSeconds(forbiddenInfo.secondsLeft)}</Text>
            </View>
          </View>
        ) : null}



        {/* Next Prayer Banner */}
        {(nextPrayerName || alertMode) ? (
          <ImageBackground
            source={PRAYER_BG_IMAGES[alertMode ? (activePrayer?.name ?? nextPrayerName) : nextPrayerName] ?? PRAYER_BG_IMAGES['Dhuhr']}
            style={styles.nextBannerWrap}
            imageStyle={styles.nextBannerImage}
            resizeMode="cover"
          >
          <LinearGradient
            colors={PRAYER_GRADIENTS[alertMode ? (activePrayer?.name ?? nextPrayerName) : nextPrayerName] ?? ['rgba(27,94,52,0.85)', 'rgba(45,138,79,0.80)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextBanner}
          >
            {alertMode ? (
              // ── ALERT MODE: prayer has begun ─────────────────────────────
              <>
                <View style={styles.skyPeriodRow}>
                  <MaterialIcons name={PRAYER_ICONS[activePrayer!.name] as any} size={13} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.skyPeriodLabel}>{getSkyPeriodLabel(activePrayer!.name)}</Text>
                </View>
                <View style={styles.nextRow}>
                  <View style={styles.nextLeft}>
                    <Text style={styles.nextLabel}>Time has begun</Text>
                    <Text style={styles.nextName}>{activePrayer!.name}</Text>
                    <View style={styles.nextTimeRow}>
                      <MaterialIcons name="volume-up" size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.nextTimeLabel}>Athan</Text>
                      <Text style={styles.nextTimeValue}>{activePrayer!.time}</Text>
                    </View>
                    {hasJamaat ? (
                      <View style={styles.nextTimeRow}>
                        <MaterialIcons name="group" size={12} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.nextTimeLabel}>Iqamah</Text>
                        <Text style={styles.nextTimeValue}>{activePrayer!.iqamah}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.nextRight}>
                    {jamaatStarted ? (
                      // Jamaat flashing
                      <Animated.View style={{ alignItems: 'center', opacity: flashAnim }}>
                        <MaterialIcons name="group" size={28} color="#fff" />
                        <Text style={[styles.countdown, { fontSize: 26 }]}>Jamaat!</Text>
                        <View style={styles.liveDot}>
                          <View style={[styles.liveDotInner, { backgroundColor: '#FFD54F' }]} />
                          <Text style={[styles.liveText, { color: '#FFD54F' }]}>LIVE</Text>
                        </View>
                      </Animated.View>
                    ) : hasJamaat ? (
                      // Countdown to jamaat
                      <>
                        <Text style={styles.countdownPhase}>Jamaat in</Text>
                        <Text style={styles.countdown}>{jamaatCountdown}</Text>
                        <View style={styles.liveDot}>
                          <View style={styles.liveDotInner} />
                          <Text style={styles.liveText}>LIVE</Text>
                        </View>
                      </>
                    ) : (
                      // No iqamah set
                      <View style={{ alignItems: 'center', gap: 4 }}>
                        <MaterialIcons name="check-circle" size={24} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.countdownPhase}>In progress</Text>
                        <View style={styles.liveDot}>
                          <View style={styles.liveDotInner} />
                          <Text style={styles.liveText}>LIVE</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </>
            ) : (
              // ── NORMAL MODE: next prayer countdown ───────────────────────
              <>
                <View style={styles.skyPeriodRow}>
                  <MaterialIcons name={PRAYER_ICONS[nextPrayerName] as any} size={13} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.skyPeriodLabel}>{getSkyPeriodLabel(nextPrayerName)}</Text>
                </View>
                <View style={styles.nextRow}>
                  <View style={styles.nextLeft}>
                    <Text style={styles.nextLabel}>Next Prayer</Text>
                    <Text style={styles.nextName}>{nextPrayerName}</Text>
                    <View style={styles.nextTimeRow}>
                      <MaterialIcons name="volume-up" size={12} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.nextTimeLabel}>Athan</Text>
                      <Text style={styles.nextTimeValue}>{nextPrayerObj?.time ?? ''}</Text>
                    </View>
                    {nextIqamah ? (
                      <View style={styles.nextTimeRow}>
                        <MaterialIcons name="group" size={12} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.nextTimeLabel}>Iqamah</Text>
                        <Text style={styles.nextTimeValue}>{nextIqamah}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.nextRight}>
                    <Text style={styles.countdownPhase}>Athan in</Text>
                    <Text style={styles.countdown}>{countdown}</Text>
                    <View style={styles.liveDot}>
                      <View style={styles.liveDotInner} />
                      <Text style={styles.liveText}>LIVE</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </LinearGradient>
          </ImageBackground>
        ) : null}

        {/* Table Header */}
        <View style={[styles.tableHeader, N && { borderBottomColor: N.border }]}>
          <Text style={[styles.colLabel, { flex: 2 }, N && { color: N.textMuted }]}>Prayer</Text>
          <Text style={[styles.colLabel, { flex: 1.3, textAlign: 'center' }, N && { color: N.textMuted }]}>Begins</Text>
          <Text style={[styles.colLabel, { flex: 1.3, textAlign: 'center' }, N && { color: N.textMuted }]}>Iqamah</Text>
        </View>

        {/* Jumuah row — only on Fridays, shown above Fajr */}
        {isFriday ? (() => {
          const jBST = isBST(now);
          const jJ1Raw = todayDbRow?.jumu_ah_1 ?? (jBST ? '13:30' : '12:45');
          const jJ2Raw = todayDbRow?.jumu_ah_2 ?? (jBST ? '14:30' : '13:30');
          const fmt12 = (t: string) => {
            if (!t || t.includes('M')) return t;
            const [h, m] = t.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
          };
          const jJ1 = jJ1Raw;
          const jJ2 = jJ2Raw;
          const jDisplay1 = fmt12(jJ1Raw);
          const jDisplay2 = fmt12(jJ2Raw);
          const j1Date = new Date(now); j1Date.setHours(parseInt(jJ1), parseInt(jJ1.split(':')[1]), 0, 0);
          const j2Date = new Date(now); j2Date.setHours(parseInt(jJ2), parseInt(jJ2.split(':')[1]), 0, 0);
          const j1Passed = now >= j1Date;
          const j2Passed = now >= j2Date;
          return (
            <View style={[styles.tableBody, N && { backgroundColor: N.jumuahBg }, { marginBottom: 8, borderWidth: 1.5, borderColor: '#FFD54F' }]}>
              <View style={[styles.row, N && { backgroundColor: N.jumuahBg }]}>
                <View style={[styles.rowLeft, { flex: 2 }]}>
                  <View style={[styles.prayerIconBox, { backgroundColor: '#FFF8E1' }]}>
                    <MaterialIcons name="star" size={18} color="#F9A825" />
                  </View>
                  <View>
                    <Text style={[styles.prayerName, { color: '#F9A825' }]}>Jumuah</Text>
                    <Text style={[styles.specialBadge, { color: jBST ? '#4CAF50' : '#FF8F00' }]}>{jBST ? 'BST' : 'GMT'} · Friday Prayer</Text>
                  </View>
                </View>
                <View style={[styles.timeColCenter, { flex: 1.3 }]}>
                  <Text style={[styles.timeCell, j1Passed && styles.timePassed, !j1Passed && { color: '#F9A825' }]}>{jDisplay1}</Text>
                  {!j1Passed ? null : <Text style={[styles.timeCell, { color: '#F9A825', fontSize: 12 }]}>{jDisplay2}</Text>}
                </View>
                <View style={[styles.timeColCenter, { flex: 1.3 }]}>
                  {!j1Passed ? (
                    <Text style={[styles.iqamahTime, { color: '#F9A825' }]}>{jDisplay1}</Text>
                  ) : !j2Passed ? (
                    <Text style={[styles.iqamahTime, { color: '#F9A825' }]}>{jDisplay2}</Text>
                  ) : (
                    <Text style={[styles.timeCellMuted, N && { color: N.textMuted }]}>Done</Text>
                  )}
                </View>
              </View>
            </View>
          );
        })() : null}

        {/* Prayer Rows */}
        <View style={[styles.tableBody, N && { backgroundColor: N.surface }]}>
          {data?.prayers.map((prayer, index) => {
            const isCurrent = isCurrentPrayer(prayer);
            const isNext = prayer.name === nextPrayerName;
            const passed = hasPassed(prayer);
            const isSpecial = SPECIAL_PRAYERS.has(prayer.name);
            const isSunrise = prayer.name === 'Sunrise';
            const color = PRAYER_COLORS[prayer.name] ?? Colors.primary;
            const showTomorrow = passed && prayer.tomorrowTime && !isCurrent;

            const rowBaseStyle = [
              styles.row,
              !isCurrent && isNext && [styles.rowNext, N && { backgroundColor: N.surfaceAlt }, { borderLeftWidth: 3, borderLeftColor: color }],
              !isCurrent && isSpecial && [styles.rowSpecial, N && { backgroundColor: N.rowSpecial }],
              !isCurrent && !isNext && !isSpecial && N && { backgroundColor: N.surface },
              index < (data.prayers.length - 1) && [styles.rowBorder, N && { borderBottomColor: N.border }],
            ];

            return isCurrent ? (
              // ── Active prayer: gradient row with glow ──────────────
              <View
                key={prayer.name}
                style={[
                  styles.rowCurrentWrap,
                  { shadowColor: color },
                ]}
              >
                <LinearGradient
                  colors={[color + 'FF', color + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.rowCurrentGradient}
                >
                  {/* Pulsing NOW pill */}
                  <View style={styles.nowPillRow}>
                    <View style={[styles.nowPill, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
                      <View style={styles.nowPillDot} />
                      <Text style={styles.nowPillText}>PRAYER IN PROGRESS</Text>
                    </View>
                  </View>

                  <View style={styles.rowCurrentContent}>
                    {/* Icon */}
                    <View style={[styles.prayerIconBox, styles.prayerIconBoxCurrent]}>
                      <MaterialIcons name={PRAYER_ICONS[prayer.name] as any} size={22} color={color} />
                    </View>

                    {/* Name */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prayerNameCurrent}>{prayer.name}</Text>
                      <Text style={styles.nowBadgeCurrent}>Now · Active</Text>
                    </View>

                    {/* Times */}
                    <View style={styles.currentTimesCol}>
                      <View style={styles.currentTimeRow}>
                        <MaterialIcons name="volume-up" size={11} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.currentTimeLabel}>Began</Text>
                        <Text style={styles.currentTimeVal}>{prayer.time}</Text>
                      </View>
                      {prayer.iqamah && prayer.iqamah !== '-' ? (
                        <View style={styles.currentTimeRow}>
                          <MaterialIcons name="group" size={11} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.currentTimeLabel}>Iqamah</Text>
                          <Text style={[styles.currentTimeVal, styles.currentIqamah]}>{prayer.iqamah}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ) : (
              <View key={prayer.name} style={rowBaseStyle}>
                {/* Icon + Name */}
                <View style={[styles.rowLeft, { flex: 2 }]}>
                  <View style={[
                    styles.prayerIconBox,
                    { backgroundColor: color + (N ? '30' : '22'), borderWidth: isNext ? 1.5 : 0, borderColor: color + '60' }
                  ]}>
                    <MaterialIcons
                      name={PRAYER_ICONS[prayer.name] as any}
                      size={18}
                      color={color}
                    />
                  </View>
                  <View>
                    <Text style={[
                      styles.prayerName,
                      N && { color: N.text },
                      isSpecial && !N && styles.prayerNameSpecial,
                      isSpecial && N && { color: N.textSub, fontSize: 14 },
                    ]}>
                      {prayer.name}
                    </Text>
                    {isNext ? (
                      <Text style={[styles.nowBadge, { color }]}>Next</Text>
                    ) : isSpecial ? (
                      <Text style={[styles.specialBadge, N && { color: '#A07820' }]}>
                        {prayer.name === 'Ishraq' ? '+20 min' : '-20 min Dhuhr'}
                      </Text>
                    ) : null}
                    {prayer.name === 'Sunrise' ? (
                      <Text style={styles.forbiddenNote}>Forbidden to pray until Ishraq</Text>
                    ) : null}
                    {prayer.name === 'Zawaal' ? (
                      <Text style={styles.forbiddenNote}>Forbidden to pray until Dhuhr</Text>
                    ) : null}
                    {prayer.name === 'Asr' ? (
                      <Text style={styles.forbiddenNote}>Delay forbidden 20 mins before Maghrib</Text>
                    ) : null}
                  </View>
                </View>

                {/* Athan / Begins Time */}
                <View style={[styles.timeColCenter, { flex: 1.3 }]}>
                  <Text style={[
                    styles.timeCell,
                    N && { color: passed ? N.textMuted : N.text },
                    passed && styles.timePassed,
                  ]}>
                    {prayer.time}
                  </Text>
                  {showTomorrow && prayer.tomorrowTime ? (
                    <View style={styles.tomorrowBadge}>
                      <Text style={styles.tomorrowTime}>{prayer.tomorrowTime}</Text>
                      <Text style={styles.tomorrowLabel}>+24h</Text>
                    </View>
                  ) : null}
                </View>

                {/* Iqamah */}
                <View style={[styles.timeColCenter, { flex: 1.3 }]}>
                  {isSpecial || isSunrise ? (
                    <Text style={[styles.timeCellMuted, N && { color: N.textMuted }]}>—</Text>
                  ) : (
                    <>
                      <Text style={[
                        styles.iqamahTime,
                        N && { color: passed ? N.textMuted : '#69C995' },
                        passed && styles.timePassed,
                      ]}>
                        {prayer.iqamah}
                      </Text>
                      {showTomorrow && prayer.tomorrowIqamah ? (
                        <View style={[styles.tomorrowBadge, { backgroundColor: Colors.primary + '18' }]}>
                          <Text style={[styles.tomorrowTime, { color: Colors.primary }]}>
                            {prayer.tomorrowIqamah}
                          </Text>
                          <Text style={[styles.tomorrowLabel, { color: Colors.primary }]}>+24h</Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Jumuah Countdown Banner (Fridays) */}
        {isFriday && jumuahCountdownLabel ? (
          <View style={styles.jumuahCountdownBanner}>
            <MaterialIcons name="star" size={18} color="#F9A825" />
            <View style={{ flex: 1 }}>
              <Text style={styles.jumuahCountdownLabel}>{jumuahCountdownLabel.label}</Text>
              <Text style={styles.jumuahCountdownTimer}>
                {formatCountdownSeconds(jumuahCountdownLabel.seconds)}
              </Text>
            </View>
            <View style={styles.jumuahCountdownTimes}>
              <Text style={styles.jumuahCountdownSub}>Khutbah {bst ? '1:15 PM' : '12:30 PM'}</Text>
              <Text style={styles.jumuahCountdownSub}>1st {j1} · 2nd {j2}</Text>
            </View>
          </View>
        ) : null}

        {/* Column Legend */}
        <View style={styles.legend}>
          <MaterialIcons name="info-outline" size={13} color={N ? N.textMuted : Colors.textSubtle} />
          <Text style={[styles.legendText, N && { color: N.textMuted }]}>
            Begins = Athan call  ·  Iqamah = Congregation start  ·  +24h = Tomorrow's time
          </Text>
        </View>

        {/* Ishraq / Zawaal note */}
        <View style={styles.specialNote}>
          <MaterialIcons name="flare" size={12} color={N ? N.textMuted : Colors.textSubtle} />
          <Text style={[styles.legendText, N && { color: N.textMuted }]}>
          Ishraq = 20 min after Sunrise  ·  Zawaal = 20 min before Dhuhr
          </Text>
        </View>

        {/* Source */}
        <View style={styles.sourceRow}>
          <MaterialIcons name={loading ? 'sync' : 'check-circle'} size={12} color={N ? '#3A7A5A' : Colors.primary} />
          <Text style={[styles.sourceText, N && { color: N.textMuted }]}>
            {sourceLabel}
          </Text>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView> : null}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'column',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  // Compact header used in month view
  headerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  headerCompactTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  backToTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  backToTodayText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  headerMasjidName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  headerTitle: { ...Typography.titleLarge, color: Colors.textPrimary },
  headerCity: { ...Typography.bodySmall, color: Colors.textSubtle, marginTop: 2 },
  headerDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  headerDateGreg: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  headerDateSep: { fontSize: 11, color: Colors.textSubtle },
  headerDateHijri: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    padding: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textSubtle },
  toggleBtnTextActive: { color: '#fff' },
  calBtn: {
    width: 36, height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  hijriText: { ...Typography.bodySmall, color: Colors.primary, marginTop: 1 },

  // ── Next Prayer Banner ────────────────────────────
  nextBannerWrap: {
    marginHorizontal: Spacing.md,
    marginTop: 12,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  nextBannerImage: {
    borderRadius: Radius.lg,
  },
  nextBanner: {
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: 16,
  },
  skyPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    opacity: 0.85,
  },
  skyPeriodLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextLeft: { gap: 4, flex: 1 },
  nextLabel: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1, textTransform: 'uppercase',
  },
  nextName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  nextTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  nextTimeLabel: {
    fontSize: 11, fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    width: 44,
  },
  nextTimeValue: {
    fontSize: 13, fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  nextRight: { alignItems: 'flex-end', gap: 4 },
  countdownPhase: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
  },
  countdown: {
    fontSize: 30, fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  liveDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDotInner: {
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: '#69F0AE',
  },
  liveText: {
    fontSize: 10, fontWeight: '800',
    color: '#69F0AE',
    letterSpacing: 1,
  },

  // ── Table ─────────────────────────────────────────
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginTop: 16,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  colLabel: {
    fontSize: 10, fontWeight: '700',
    color: Colors.textSubtle,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  tableBody: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    minHeight: 64,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  // Active prayer wrapper — gradient with glow
  rowCurrentWrap: {
    marginHorizontal: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  rowCurrentGradient: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  nowPillRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  nowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  nowPillDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  nowPillText: {
    fontSize: 9, fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rowCurrentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prayerIconBoxCurrent: {
    width: 44, height: 44,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 0,
  },
  prayerNameCurrent: {
    fontSize: 20, fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  nowBadgeCurrent: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  currentTimesCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  currentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currentTimeLabel: {
    fontSize: 10, fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    width: 40,
    textAlign: 'right',
  },
  currentTimeVal: {
    fontSize: 15, fontWeight: '800',
    color: '#fff',
  },
  currentIqamah: {
    color: '#ADFFD6',
  },
  rowCurrent: {
    backgroundColor: Colors.accent,
  },
  rowNext: {
    backgroundColor: Colors.primarySoft,
  },
  rowSpecial: {
    backgroundColor: '#FFFDE7',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prayerIconBox: {
    width: 36, height: 36,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  prayerName: {
    fontSize: 15, fontWeight: '600',
    color: Colors.textPrimary,
  },
  prayerNameSpecial: {
    fontSize: 14, fontWeight: '500',
    color: Colors.textSecondary,
  },
  nowBadge: {
    fontSize: 10, fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5, marginTop: 1,
  },
  specialBadge: {
    fontSize: 9, fontWeight: '600',
    color: '#8D6E0A',
    marginTop: 1,
  },
  forbiddenNote: {
    fontSize: 9,
    fontWeight: '600',
    color: '#B71C1C',
    marginTop: 2,
    maxWidth: 110,
  },
  textWhite: { color: '#fff' },

  timeColCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  timeCell: {
    fontSize: 15, fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  timeCellMuted: {
    fontSize: 15, fontWeight: '400',
    color: Colors.textSubtle,
    textAlign: 'center',
  },
  timePassed: {
    color: Colors.textSubtle,
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  iqamahTime: {
    fontSize: 15, fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },

  // +24h tomorrow badge
  tomorrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accent + '30',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tomorrowTime: {
    fontSize: 11, fontWeight: '700',
    color: Colors.accent,
  },
  tomorrowLabel: {
    fontSize: 9, fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },

  // Forbidden time banner
  forbiddenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#B71C1C',
    marginHorizontal: Spacing.md,
    marginTop: 12,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: 12,
  },
  forbiddenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  forbiddenTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  forbiddenReason: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  forbiddenRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  forbiddenUntilLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  forbiddenUntilTime: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  forbiddenTimer: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    fontVariant: ['tabular-nums'] as any,
  },

  // Jumuah countdown banner
  jumuahCountdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.md,
    marginTop: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#FFD54F',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  jumuahCountdownLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8D6E0A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  jumuahCountdownTimer: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F9A825',
    fontVariant: ['tabular-nums'] as any,
  },
  jumuahCountdownTimes: {
    alignItems: 'flex-end',
    gap: 3,
  },
  jumuahCountdownSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8D6E0A',
  },

  // Jumuah card
  jumuahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginTop: 12,
    padding: Spacing.md,
    backgroundColor: '#FFF8E1',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  jumuahLeft: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, flex: 1,
  },
  jumuahTitle: { fontSize: 16, fontWeight: '700', color: '#5D4037' },
  jumuahSub: { fontSize: 12, color: '#8D6E0A', marginTop: 1 },
  jumuahRight: { alignItems: 'flex-end', gap: 4 },
  fridayBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  fridayBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  jumuahTimes: { alignItems: 'flex-end', gap: 4 },
  jumuahTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jumuahTimeBadge: {
    fontSize: 10, fontWeight: '700',
    color: '#8D6E0A',
    backgroundColor: '#FFD54F',
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4,
  },
  jumuahTime: { fontSize: 16, fontWeight: '800', color: '#F9A825' },

  // Footer notes
  legend: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md, paddingTop: 12,
  },
  specialNote: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md, paddingTop: 4,
  },
  legendText: {
    ...Typography.bodySmall,
    color: Colors.textSubtle,
    fontSize: 11, flex: 1,
  },
  sourceRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md, paddingTop: 6,
  },
  sourceText: { ...Typography.bodySmall, color: Colors.textSubtle, fontSize: 11 },
});

// ── Monthly Calendar Styles ───────────────────────────────────────────────
const calStyles = StyleSheet.create({
  // Stacked layout: calendar on top, prayer panel below
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

  // ── Navigation ──
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navArrow: {
    width: 26, height: 26,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  monthLabel: { alignItems: 'center', flex: 1, paddingHorizontal: 6 },
  monthName: {
    fontSize: 15, fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  hijriMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  hijriMonthSub: {
    fontSize: 11, fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.1,
  },
  syncLabel: {
    fontSize: 9, color: Colors.textSubtle,
  },

  // ── Inline legend ──
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

  // ── Day-of-week header ──
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 4,
  },
  dayLabelCell: { alignItems: 'center', paddingVertical: 1 },
  dayLabelText: {
    fontSize: 10, fontWeight: '700',
    color: Colors.textSubtle,
    letterSpacing: 0.2,
  },
  fridayLabel: { color: Colors.primary },

  // ── Grid cells ──
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
    fontSize: 14, fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  cellGregToday:   { color: '#fff' },
  cellGregFriday:  { color: Colors.primary },

  cellHijri: {
    fontSize: 10, fontWeight: '600',
    color: Colors.primary,
    lineHeight: 11,
    textAlign: 'center',
  },
  cellHijriToday: { color: 'rgba(255,255,255,0.88)' },

  jumuahDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#F9A825',
    marginTop: 0,
  },

  // Selected day date strip at the bottom of the grid section
  selectedDayStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selectedDayHijri: {
    fontSize: 12, fontWeight: '700',
    flex: 1,
  },

  // kept for legacy reference (unused)
  container: { backgroundColor: Colors.background, paddingHorizontal: 16, paddingTop: 12 },
  legendStrip: { flexDirection: 'row' },
  tapHint: { flexDirection: 'row' },
  tapHintText: { fontSize: 11 },
  detailPanel: { backgroundColor: Colors.surface },
  detailBanner: { flexDirection: 'row' },
  detailGregDate: { fontSize: 15, color: '#fff' },
  detailHijriRow: { flexDirection: 'row' },
  detailHijriDate: { fontSize: 12, color: 'rgba(255,255,255,0.88)' },
  detailColHeader: { flexDirection: 'row' },
  detailColLbl: { fontSize: 9 },
  detailRow: { flexDirection: 'row' },
  detailRowBorder: { borderBottomWidth: 1 },
  detailRowSpecial: { backgroundColor: '#FFFDF0' },
  detailIconBox: { width: 30, height: 30 },
  detailPrayer: { fontSize: 14 },
  detailPrayerSpecial: { fontSize: 13 },
  detailSpecialNote: { fontSize: 9 },
  detailAthan: { fontSize: 14, width: 72, textAlign: 'center' },
  detailIqamah: { fontSize: 14, width: 72, textAlign: 'center' },
  jumuahBadge: { flexDirection: 'row' },
  jumuahBadgeText: { fontSize: 11 },
  jumuahDetailBlock: { margin: 12 },
  jumuahDetailHeader: { flexDirection: 'row' },
  jumuahDetailTitle: { fontSize: 12 },
  jumuahDetailSeason: { fontSize: 10 },
  jumuahDetailTimesRow: { flexDirection: 'row' },
  jumuahDetailTimeCell: { flex: 1 },
  jumuahDetailDivider: { width: 1, height: 32 },
  jumuahDetailLabel: { fontSize: 9 },
  jumuahDetailTime: { fontSize: 15 },
  detailClose: { flexDirection: 'row' },
  detailCloseTxt: { fontSize: 11 },
});

// ── Prayer Panel Styles ───────────────────────────────────────────────────
const panelStyles = StyleSheet.create({
  // Empty state
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
    fontSize: 14, fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12, fontWeight: '400',
    color: Colors.textSubtle,
    textAlign: 'center',
  },

  // Panel container
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

  // Compact date row (replaces gradient header)
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  hijriDateInline: {
    fontSize: 12, fontWeight: '700',
    flex: 1,
  },
  fridayBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(249,168,37,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(249,168,37,0.55)',
  },
  fridayBadgeText: {
    fontSize: 10, fontWeight: '700', color: '#FFF8E1',
  },

  // Column header
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
    fontSize: 9, fontWeight: '800',
    color: Colors.textSubtle,
    letterSpacing: 0.9,
  },

  // Prayer rows — compact
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
    width: 28, height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  prayerName: {
    flex: 1,
    fontSize: 14, fontWeight: '700',
    color: Colors.textPrimary,
  },
  athanTime: {
    fontSize: 13, fontWeight: '700',
    color: Colors.textPrimary,
    width: 58, textAlign: 'center',
  },
  iqamahTime: {
    fontSize: 13, fontWeight: '800',
    color: Colors.primary,
    width: 58, textAlign: 'center',
  },

  // Jumuah footer row
  jumuahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF8E1',
    borderTopWidth: 2,
    borderTopColor: '#FFD54F',
  },
  jumuahIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(249,168,37,0.18)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(249,168,37,0.45)',
    flexShrink: 0,
  },
  jumuahLabel: {
    fontSize: 13, fontWeight: '800',
    color: '#5D4037',
  },
  jumuahOrder: {
    fontSize: 10, fontWeight: '600',
    color: '#8D6E0A',
    marginBottom: 2,
  },
  jumuahTime: {
    fontSize: 17, fontWeight: '900',
    color: '#F9A825',
    letterSpacing: 0.3,
  },
  jumuahTimeBlock: {
    alignItems: 'center', flex: 1,
  },
  jumuahDividerV: {
    width: 1, height: 36,
    backgroundColor: '#FFD54F',
  },
  jumuahDiv: {
    width: 1, height: 14,
    backgroundColor: '#FFD54F',
    marginHorizontal: 3,
  },
  jumuahSeason: {
    fontSize: 10, fontWeight: '800',
    color: '#8D6E0A',
    backgroundColor: '#FFD54F',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 6,
  },
});
