import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  useWindowDimensions,
  Animated,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Time-of-day sky gradients for the Next Prayer banner
const PRAYER_GRADIENTS: Record<string, readonly [string, string, ...string[]]> = {
  Fajr:    ['rgba(20,20,80,0.82)', 'rgba(40,40,120,0.75)'],
  Sunrise: ['rgba(180,80,0,0.78)', 'rgba(220,140,0,0.72)'],
  Ishraq:  ['rgba(200,100,0,0.75)', 'rgba(240,190,0,0.68)'],
  Zawaal:  ['rgba(112,95,62,0.80)', 'rgba(154,134,94,0.74)'],
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

const NIGHT = {
  bg:         '#0A0F1E',
  surface:    '#121929',
  surfaceAlt: '#192338',
  border:     '#1E2D47',
  text:       '#EEF3FC',
  textSub:    '#93B4D8',
  textMuted:  '#5A7A9E',
  rowCurrent: '#173226',
  rowNext:    '#162638',
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
  const { width: viewportWidth } = useWindowDimensions();
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
  const JAMAAT_ONGOING_MS = 7 * 60 * 1000;
  const flashAnim = useRef(new Animated.Value(1)).current;
  const flashLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Detect active timeline period (includes Sunrise, Ishraq, and Zawaal).
  const prayerTimeline = data?.prayers ?? [];
  let activePrayer: PrayerTime | null = null;
  for (let i = 0; i < prayerTimeline.length; i++) {
    const cur = prayerTimeline[i];
    const nxt = prayerTimeline[i + 1];
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
  const jamaatOngoing = jamaatDate ? now < new Date(jamaatDate.getTime() + JAMAAT_ONGOING_MS) : false;
  const alertMode = activePrayer !== null;

  const secondsToJamaat = jamaatDate && !jamaatStarted
    ? Math.max(0, Math.floor((jamaatDate.getTime() - now.getTime()) / 1000))
    : 0;
  const jmm = Math.floor(secondsToJamaat / 60);
  const jss = secondsToJamaat % 60;
  const jamaatCountdown = `${String(jmm).padStart(2, '0')}:${String(jss).padStart(2, '0')}`;
  const hasJamaat = jamaatDate !== null;

  useEffect(() => {
    if (jamaatStarted && jamaatOngoing) {
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
  }, [jamaatStarted, jamaatOngoing, flashAnim]);

  const loadTimes = useCallback(async () => {
    // Seed instantly from local timetable
    const local = getPrayerTimesFromTimetable();
    if (local) setData(local);
    setLoading(true);
    try {
      const result = await getPrayerTimesForDate();
      if (result) setData(result);
    } catch {}
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
    if (!data) return false;
    const timeline = data.prayers;
    const idx = timeline.findIndex(p => p.name === prayer.name);
    if (idx < 0) return false;
    const start = timeline[idx].timeDate;
    const end = timeline[idx + 1]?.timeDate ?? new Date(start.getTime() + 3600000);
    return now >= start && now < end;
  };

  // Night mode (auto from prayer times, overrideable via toggle)
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

  const forbiddenWindowMeta = React.useMemo(() => {
    if (!forbiddenInfo || !data) return null;

    const sunrise = data.prayers.find((p) => p.name === 'Sunrise')?.timeDate;
    const ishraq = data.prayers.find((p) => p.name === 'Ishraq')?.timeDate;
    const zawaal = data.prayers.find((p) => p.name === 'Zawaal')?.timeDate;
    const dhuhr = data.prayers.find((p) => p.name === 'Dhuhr')?.timeDate;

    let phase: 'Sunrise' | 'Zawaal' = 'Zawaal';
    let start: Date | undefined;
    let end: Date | undefined;
    let hint = 'Prepare for Dhuhr and keep the tongue busy with dhikr.';

    if (sunrise && ishraq && now >= sunrise && now < ishraq) {
      phase = 'Sunrise';
      start = sunrise;
      end = ishraq;
      hint = 'Use this pause for dhikr and istighfar until Ishraq begins.';
    } else if (zawaal && dhuhr && now >= zawaal && now < dhuhr) {
      phase = 'Zawaal';
      start = zawaal;
      end = dhuhr;
      hint = 'Use this pause for dhikr and get ready for Dhuhr.';
    }

    const totalMs = start && end ? Math.max(1, end.getTime() - start.getTime()) : 1;
    const elapsedMs = start ? Math.max(0, now.getTime() - start.getTime()) : 0;
    const progress = Math.max(0, Math.min(1, elapsedMs / totalMs));

    return {
      phase,
      hint,
      progress,
    };
  }, [forbiddenInfo, data, now]);

  const parseClockOnToday = useCallback((clock?: string | null): Date | null => {
    if (!clock || clock === '-' || clock === '--:--') return null;
    const [hh, mm] = clock.split(':').map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    const d = new Date(now);
    d.setHours(hh, mm, 0, 0);
    return d;
  }, [now]);

  const currentProgressMeta = React.useMemo(() => {
    if (!activePrayer || !data) return null;
    const idx = data.prayers.findIndex((p) => p.name === activePrayer.name);
    const start = activePrayer.timeDate;
    const end = data.prayers[idx + 1]?.timeDate ?? new Date(start.getTime() + 60 * 60 * 1000);
    const total = Math.max(1, end.getTime() - start.getTime());
    const elapsed = Math.max(0, now.getTime() - start.getTime());
    const progress = Math.max(0, Math.min(1, elapsed / total));

    const iqamahDate = parseClockOnToday(activePrayer.iqamah);
    const jamaatMarker = iqamahDate && iqamahDate >= start && iqamahDate <= end
      ? Math.max(0, Math.min(1, (iqamahDate.getTime() - start.getTime()) / total))
      : null;

    let cautionDate: Date | null = null;
    if (activePrayer.name === 'Fajr') {
      cautionDate = data.prayers.find((p) => p.name === 'Sunrise')?.timeDate ?? null;
    } else if (activePrayer.name === 'Asr') {
      const maghrib = data.prayers.find((p) => p.name === 'Maghrib')?.timeDate;
      cautionDate = maghrib ? new Date(maghrib.getTime() - 20 * 60 * 1000) : null;
    }

    const cautionMarker = cautionDate && cautionDate >= start && cautionDate <= end
      ? Math.max(0, Math.min(1, (cautionDate.getTime() - start.getTime()) / total))
      : null;

    return {
      progress,
      jamaatMarker,
      cautionMarker,
      startLabel: `${activePrayer.name} ${activePrayer.time}`,
      endLabel: data.prayers[idx + 1]?.name ? `${data.prayers[idx + 1].name} ${data.prayers[idx + 1].time}` : 'Next',
    };
  }, [activePrayer, data, now, parseClockOnToday]);

  const nextProgressMeta = React.useMemo(() => {
    if (!nextInfo || !data) return null;
    const start = activePrayer?.timeDate ?? new Date(now.getTime() - 20 * 60 * 1000);
    const nextAthan = nextInfo.prayer.timeDate;
    const nextIqamahDate = parseClockOnToday(nextInfo.prayer.iqamah);
    const end = nextIqamahDate && nextIqamahDate > nextAthan ? nextIqamahDate : nextAthan;

    const total = Math.max(1, end.getTime() - start.getTime());
    const elapsed = Math.max(0, now.getTime() - start.getTime());
    const progress = Math.max(0, Math.min(1, elapsed / total));

    const jamaatMarker = nextIqamahDate && nextIqamahDate >= start && nextIqamahDate <= end
      ? Math.max(0, Math.min(1, (nextIqamahDate.getTime() - start.getTime()) / total))
      : null;

    return {
      progress,
      jamaatMarker,
      startLabel: activePrayer ? `${activePrayer.name} ${activePrayer.time}` : 'Now',
      endLabel: nextIqamahDate && nextInfo.prayer.iqamah !== '-' ? `${nextInfo.prayer.name} Jamaat ${nextInfo.prayer.iqamah}` : `${nextInfo.prayer.name} ${nextInfo.prayer.time}`,
    };
  }, [nextInfo, activePrayer, data, now, parseClockOnToday]);

  const currentEndsIn = React.useMemo(() => {
    if (!activePrayer || !data) return '';
    const idx = data.prayers.findIndex((p) => p.name === activePrayer.name);
    const end = data.prayers[idx + 1]?.timeDate;
    if (!end) return '';
    const sec = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
    return formatCountdownSeconds(sec);
  }, [activePrayer, data, now]);

  const currentPhaseInfo = React.useMemo(() => {
    if (forbiddenInfo) {
      return {
        label: 'Until Resume',
        value: formatCountdownSeconds(forbiddenInfo.secondsLeft),
        note: '',
      };
    }

    if (!activePrayer || !data) {
      return {
        label: '',
        value: '',
        note: '',
      };
    }

    if (hasJamaat && !jamaatStarted) {
      return {
        label: 'Until Jamaat',
        value: jamaatCountdown,
        note: '',
      };
    }

    if (activePrayer.name === 'Fajr') {
      const sunrise = data.prayers.find((p) => p.name === 'Sunrise')?.timeDate;
      if (sunrise) {
        const sec = Math.max(0, Math.floor((sunrise.getTime() - now.getTime()) / 1000));
        if (sec > 0) {
          return {
            label: 'Until Makrooh',
            value: formatCountdownSeconds(sec),
            note: 'Makrooh starts at Sunrise',
          };
        }
      }
    }

    if (activePrayer.name === 'Asr') {
      const maghrib = data.prayers.find((p) => p.name === 'Maghrib')?.timeDate;
      if (maghrib) {
        const makroohStart = new Date(maghrib.getTime() - 20 * 60 * 1000);
        const sec = Math.max(0, Math.floor((makroohStart.getTime() - now.getTime()) / 1000));
        if (sec > 0) {
          return {
            label: 'Until Makrooh',
            value: formatCountdownSeconds(sec),
            note: '20 mins before Maghrib',
          };
        }

        return {
          label: 'Makrooh Window',
          value: currentEndsIn,
          note: 'Nafl discouraged before Maghrib',
        };
      }
    }

    return {
      label: 'Until Next Prayer',
      value: currentEndsIn,
      note: '',
    };
  }, [forbiddenInfo, activePrayer, data, hasJamaat, jamaatStarted, jamaatCountdown, now, currentEndsIn]);

  const heroImageKey = forbiddenInfo
    ? (forbiddenWindowMeta?.phase === 'Sunrise' ? 'Sunrise' : 'Dhuhr')
    : (activePrayer?.name ?? nextPrayerName);

  const heroGradientColors = forbiddenInfo
    ? ['rgba(122,40,14,0.82)', 'rgba(179,66,26,0.76)'] as const
    : (PRAYER_GRADIENTS[heroImageKey] ?? ['rgba(27,94,52,0.82)', 'rgba(45,138,79,0.76)'] as const);

  const heroProgress = forbiddenInfo
    ? (forbiddenWindowMeta?.progress ?? 0)
    : (currentProgressMeta?.progress ?? nextProgressMeta?.progress ?? 0);

  const heroJamaatMarker = forbiddenInfo
    ? null
    : (currentProgressMeta?.jamaatMarker ?? nextProgressMeta?.jamaatMarker ?? null);

  const heroEndMarker = forbiddenInfo ? null : 1;

  const isFridayJumuahHero = isFriday
    && !forbiddenInfo
    && ((activePrayer?.name === 'Dhuhr') || (nextInfo?.prayer.name === 'Dhuhr'));

  const heroPrayerName = forbiddenInfo
    ? (forbiddenWindowMeta?.phase ?? 'Zawaal')
    : (isFridayJumuahHero ? 'Jumuah' : (activePrayer?.name ?? nextPrayerName));

  const heroCountdownInfo = React.useMemo(() => {
    if (forbiddenInfo) {
      return {
        label: currentPhaseInfo.label || 'Until Resume',
        value: currentPhaseInfo.value,
        note: currentPhaseInfo.note,
        flash: false,
      };
    }

    if (activePrayer) {
      if (hasJamaat && !jamaatStarted) {
        return {
          label: 'Until Jamaat',
          value: jamaatCountdown,
          note: '',
          flash: false,
        };
      }

      if (hasJamaat && jamaatStarted && jamaatOngoing) {
        return {
          label: 'Jamaat On Going',
          value: 'ON GOING',
          note: 'Run to the masjid now',
          flash: true,
        };
      }

      return {
        label: 'Until Next Prayer',
        value: currentEndsIn || countdown,
        note: '',
        flash: false,
      };
    }

    return {
      label: currentPhaseInfo.label || 'Until Next Prayer',
      value: currentPhaseInfo.value || countdown,
      note: '',
      flash: false,
    };
  }, [forbiddenInfo, activePrayer, hasJamaat, jamaatStarted, jamaatOngoing, jamaatCountdown, currentEndsIn, countdown, currentPhaseInfo]);

  const heroWide = viewportWidth >= 700;

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
          <View style={styles.headerRowCompact}>
            <Text style={[styles.headerMasjidCompact, N && { color: N.text }]}>Jami&apos; Masjid Noorani</Text>
            <NightModeToggle modePref={modePref} onSelect={setModePref} />
          </View>

          <TouchableOpacity
            onPress={() => setViewMode('month')}
            activeOpacity={0.82}
            style={[styles.headerMetaRow, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}
          >
            <View style={styles.headerMetaLeft}>
              <MaterialIcons name="calendar-today" size={12} color={N ? '#9BC2EA' : Colors.textSubtle} />
              <Text style={[styles.headerMetaDate, N && { color: N.text }]}>
                {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                {data ? ` • ${getHijriDayNum(data.hijriDate)} ${getHijriMonthName(data.hijriDate)}` : ''}
              </Text>
            </View>
            <View style={styles.headerMetaRight}>
              <MaterialIcons name="place" size={12} color={N ? '#6BB89A' : Colors.primary} />
              <Text style={[styles.headerMetaLocation, N && { color: N.textSub }]}>Halifax</Text>
              <View style={[styles.headerMetaAction, N && { backgroundColor: '#2A4A7A', borderColor: '#456A9E' }]}>
                <Text style={[styles.headerMetaActionText, N && { color: '#D7E8FF' }]}>View timetable</Text>
                <MaterialIcons name="chevron-right" size={14} color={N ? '#D7E8FF' : '#1E5BA8'} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Monthly Calendar View — split layout fills remaining screen ── */}
      {viewMode === 'month' ? (
        <MonthlyCalendar today={now} nightMode={nightMode} />
      ) : null}

      {viewMode === 'today' ? <ScrollView showsVerticalScrollIndicator={false}>
        {/* Prayer Hero Card */}
        {(forbiddenInfo || nextPrayerName || alertMode) ? (
          <ImageBackground
            source={PRAYER_BG_IMAGES[heroImageKey] ?? PRAYER_BG_IMAGES['Dhuhr']}
            style={styles.nextBannerWrap}
            imageStyle={styles.nextBannerImage}
            resizeMode="cover"
          >
          <LinearGradient
            colors={heroGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroBanner, heroWide && styles.heroBannerWide]}
          >
            <Text style={styles.heroKicker}>
              {forbiddenInfo ? 'Prayer Pause Window' : (activePrayer ? 'Current Prayer' : 'Up Next Prayer')}
            </Text>
            <Text style={[styles.heroTitle, heroWide && styles.heroTitleWide]}>
              {heroPrayerName}
            </Text>

            <View style={[styles.heroStatsRow, heroWide && styles.heroStatsRowWide]}>
              {!forbiddenInfo && isFridayJumuahHero ? (
                <>
                  <View style={[styles.heroGlassStat, heroWide && styles.heroGlassStatWideDesktop]}>
                    <Text style={styles.heroGlassLabel}>Athan</Text>
                    <Text style={styles.heroGlassValue}>{activePrayer?.time ?? nextInfo?.prayer.time ?? ''}</Text>
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
              ) : !forbiddenInfo ? (
                <>
                  <View style={[styles.heroGlassStat, heroWide && styles.heroGlassStatWideDesktop]}>
                    <Text style={styles.heroGlassLabel}>Athan</Text>
                    <Text style={styles.heroGlassValue}>{activePrayer?.time ?? nextInfo?.prayer.time ?? ''}</Text>
                  </View>
                  {((alertMode && hasJamaat && activePrayer?.iqamah) || (!alertMode && nextIqamah)) ? (
                    <View style={[styles.heroGlassStat, heroWide && styles.heroGlassStatWideDesktop]}>
                      <Text style={styles.heroGlassLabel}>Jamaat</Text>
                      <Text style={styles.heroGlassValue}>{alertMode ? activePrayer?.iqamah : nextIqamah}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={[styles.heroGlassStat, styles.heroGlassStatWide, heroWide && styles.heroGlassStatWideDesktop]}>
                  <Text style={styles.heroGlassLabel}>Prayer Resumes</Text>
                  <Text style={styles.heroGlassValue}>{forbiddenInfo.endsAt}</Text>
                </View>
              )}
            </View>

            <View style={[styles.heroCountdownCard, heroWide && styles.heroCountdownCardWide]}>
              <View style={styles.heroCountdownCardRow}>
                <Text style={styles.heroCountdownCardLabel}>{heroCountdownInfo.label}</Text>
                {heroCountdownInfo.flash ? (
                  <Animated.View style={{ opacity: flashAnim }}>
                    <Text style={[styles.heroCountdownCardValue, styles.heroCountdownCardValueAlert, heroWide && styles.heroCountdownCardValueWide]}>{heroCountdownInfo.value}</Text>
                  </Animated.View>
                ) : (
                  <Text style={[styles.heroCountdownCardValue, heroWide && styles.heroCountdownCardValueWide]}>{heroCountdownInfo.value}</Text>
                )}
              </View>
              {heroCountdownInfo.note ? (
                <Text style={styles.heroCountdownCardNote}>{heroCountdownInfo.note}</Text>
              ) : null}
            </View>

            <View style={[styles.heroTimelineTrackWide, heroWide && styles.heroTimelineTrackWideDesktop]}>
              <View
                style={[
                  styles.heroTimelineFill,
                  { width: `${Math.round(heroProgress * 100)}%` },
                ]}
              />
              {heroJamaatMarker !== null ? (
                <View style={[styles.heroTimelineMarker, { left: `${Math.round(heroJamaatMarker * 100)}%` }]} />
              ) : null}
              {heroEndMarker !== null ? (
                <View style={[styles.heroTimelineEndMarker, { right: -1 }]} />
              ) : null}
            </View>

            {nextInfo ? (
              <View style={[styles.heroTimelineNextChipWide, heroWide && styles.heroTimelineNextChipWideDesktop]}>
                <MaterialIcons name={PRAYER_ICONS[nextPrayerName] as any} size={12} color="#FFF4E8" />
                <Text style={styles.heroTimelineNextLabel}>{`Next Prayer ${nextPrayerName}: ${nextInfo.prayer.time}`}</Text>
              </View>
            ) : null}
          </LinearGradient>
          </ImageBackground>
        ) : null}

        {/* Daily Times (clean table) */}
        <View style={[styles.tableHeader, N && { borderBottomColor: N.border }]}> 
          <View style={styles.colPrayer}>
            <Text style={[styles.colLabel, N && { color: N.textMuted }]}>Prayer</Text>
          </View>
          <View style={styles.colTime}>
            <Text style={[styles.colLabel, N && { color: N.textMuted }]}>Begins</Text>
          </View>
          <View style={styles.colTime}>
            <Text style={[styles.colLabel, N && { color: N.textMuted }]}>Jamaat</Text>
          </View>
        </View>

        <View style={[styles.tableBody, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
          {data?.prayers.map((prayer, idx) => {
            const isCurrent = isCurrentPrayer(prayer);
            const isNext = prayer.name === nextPrayerName;
            const isSpecial = SPECIAL_PRAYERS.has(prayer.name);
            const isCompleted = hasPassed(prayer) && !isCurrent && !isNext;
            const showTomorrowBegins = isCompleted && !!prayer.tomorrowTime;
            const showTomorrowJamaat = isCompleted && !!prayer.tomorrowIqamah && !isSpecial && prayer.name !== 'Sunrise';
            const prayerGuidance = prayer.name === 'Fajr'
              ? 'Nafl forbidden after you prayed until Ishraq'
              : prayer.name === 'Asr'
              ? 'Forbidden to delay — 20 mins before Maghrib'
              : prayer.name === 'Zawaal'
              ? 'Nafl forbidden until Dhuhr'
              : prayer.name === 'Isha'
              ? 'Sleep and rise for Tahajjud before Fajr starts'
              : null;
            const rowStateStyle = isCurrent
              ? styles.rowCurrent
              : isNext
              ? styles.rowNext
              : isSpecial
              ? styles.rowSpecial
              : null;
            const iconBg = isCurrent
              ? 'rgba(30,107,70,0.12)'
              : isNext
              ? 'rgba(42,95,154,0.12)'
              : isSpecial
              ? 'rgba(160,132,58,0.12)'
              : (N ? 'rgba(255,255,255,0.08)' : 'rgba(20,33,48,0.06)');
            const iconColor = isCurrent
              ? '#1E6B46'
              : isNext
              ? '#2A5F9A'
              : isSpecial
              ? '#8A6E2F'
              : (N ? '#C3D3E5' : '#476078');
            const jamaatText = (isSpecial || prayer.name === 'Sunrise' || prayer.iqamah === '-' || prayer.iqamah === '--:--')
              ? '—'
              : prayer.iqamah;

            return (
              <View
                key={prayer.name}
                style={[
                  styles.row,
                  idx < (data?.prayers.length ?? 0) - 1 && styles.rowBorder,
                  rowStateStyle,
                  N && {
                    borderBottomColor: N.border,
                    backgroundColor: isCurrent ? N.rowCurrent : isNext ? N.rowNext : isSpecial ? N.rowSpecial : N.surface,
                  },
                ]}
              >
                <View style={[styles.rowLeft, styles.colPrayer]}>
                  <View
                    style={[
                      styles.prayerIconBox,
                      { backgroundColor: iconBg },
                    ]}
                  >
                    <MaterialIcons name={PRAYER_ICONS[prayer.name] as any} size={15} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.prayerName, N && { color: N.text }]}>{prayer.name}</Text>
                    {prayerGuidance ? (
                      <Text style={styles.prayerGuidance}>{prayerGuidance}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.timeColCenter, styles.colTime]}>
                  <Text style={[styles.timeCell, isCompleted && styles.timePassed, isCurrent && styles.timeCellCurrent, isNext && styles.timeCellNext, N && { color: N.text }]}>{prayer.time}</Text>
                  {showTomorrowBegins ? (
                    <View style={[styles.tomorrowBadge, N && { backgroundColor: 'rgba(105,168,255,0.16)' }]}>
                      <Text style={[styles.tomorrowLabel, N && { color: '#9BC2EA' }]}>+24h</Text>
                      <Text style={[styles.tomorrowTime, N && { color: '#D7E8FF' }]}>{prayer.tomorrowTime}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.timeColCenter, styles.colTime]}>
                  <Text style={[jamaatText === '—' ? styles.timeCellMuted : styles.iqamahTime, isCompleted && jamaatText !== '—' && styles.timePassed, isCurrent && jamaatText !== '—' && styles.timeCellCurrent, isNext && jamaatText !== '—' && styles.timeCellNext, N && jamaatText !== '—' && { color: N.text }]}>{jamaatText}</Text>
                  {showTomorrowJamaat ? (
                    <View style={[styles.tomorrowBadge, N && { backgroundColor: 'rgba(105,168,255,0.16)' }]}>
                      <Text style={[styles.tomorrowLabel, N && { color: '#9BC2EA' }]}>+24h</Text>
                      <Text style={[styles.tomorrowTime, N && { color: '#D7E8FF' }]}>{prayer.tomorrowIqamah}</Text>
                    </View>
                  ) : null}
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
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 6,
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
  headerRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerMasjidCompact: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.1,
    flex: 1,
  },
  headerMetaRow: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  headerMetaDate: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerMetaLocation: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  headerMetaAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#8EB9E8',
    backgroundColor: '#EAF4FF',
  },
  headerMetaActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E5BA8',
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

  // ── Compact Hero Bars ─────────────────────────────
  heroStack: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: Spacing.md,
    gap: 8,
    marginTop: 10,
  },
  heroStackMobile: {
    flexDirection: 'column',
  },
  heroMiniWrap: {
    flex: 1,
    minWidth: 0,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  heroMiniWrapMobile: {
    flex: 0,
    width: '100%',
  },
  heroMiniCard: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#0C1F3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  heroMiniCardNow: {
    backgroundColor: '#2A5FAF',
  },
  heroMiniCardPause: {
    backgroundColor: '#9B3F18',
  },
  heroMiniCardNext: {
    backgroundColor: '#CF620F',
  },
  heroNextTimesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  heroNextTimeBlock: {
    flexDirection: 'column',
  },
  heroNextTimeLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroNextTimeValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroMini: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  heroMiniTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroMiniLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroMiniEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroMiniMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroMiniLeft: {
    flex: 1,
    paddingRight: 4,
  },
  heroMiniTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  heroMiniMetaLine: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 17,
    fontVariant: ['tabular-nums'],
  },
  heroMiniRight: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 92,
    paddingTop: 2,
  },
  heroMiniPhaseLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.84)',
    letterSpacing: 0.25,
  },
  heroMiniCountdownValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.35,
    lineHeight: 22,
  },
  heroMiniPhaseNote: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,244,209,0.94)',
    textAlign: 'right',
  },
  heroCountdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  heroCountdownLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroCountdownValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  heroTimelineTrack: {
    marginTop: 10,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.30)',
    overflow: 'hidden',
  },
  heroTimelineNowDot: {
    position: 'absolute',
    top: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.75)',
    marginLeft: -5,
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
  heroTimelineNextChip: {
    marginTop: 8,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(207,98,15,0.44)',
    borderWidth: 1,
    borderColor: 'rgba(255,224,186,0.85)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  heroTimelineNextLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF4E8',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.35,
  },
  // Legacy hero styles (retained for compatibility)
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
    paddingTop: 12,
    paddingBottom: 18,
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
  heroKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(233,243,255,0.88)',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
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
  heroCountdownCardValueCompact: {
    fontSize: 20,
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
  heroProgressTrack: {
    marginTop: 10,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#FFD08A',
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
    fontWeight: '700',
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextLeft: { gap: 4, flex: 1 },
  nextLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.35,
  },
  nextName: {
    fontSize: 25,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
    marginTop: 1,
  },
  nextTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  nextTimeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.76)',
    width: 44,
  },
  nextTimeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nextRight: { alignItems: 'flex-end', gap: 4 },
  countdownPhase: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.83)',
    letterSpacing: 0.3,
  },
  countdown: {
    fontSize: 30, fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
    fontVariant: ['tabular-nums'],
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginTop: -2,
  },
  liveDotInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#69F0AE',
  },
  liveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#69F0AE',
    letterSpacing: 1.1,
  },

  // ── Table ─────────────────────────────────────────
  prayerCardsScroller: {
    marginTop: 14,
  },
  prayerCardsTrack: {
    paddingHorizontal: Spacing.md,
    gap: 12,
    paddingBottom: 6,
  },
  prayerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  jumuahCardHighlight: {
    borderWidth: 1.5,
    borderColor: '#FFD54F',
    backgroundColor: '#FFF9E8',
  },
  prayerCardCurrentWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    transform: [{ scale: 1.08 }],
    zIndex: 2,
    marginVertical: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  prayerCardCurrentGradient: {
    padding: Spacing.md,
    gap: 10,
  },
  prayerCardNext: {
    borderLeftWidth: 3,
  },
  prayerCardSpecial: {
    backgroundColor: '#FFFDE7',
  },
  prayerCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prayerCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  prayerCardTitleOnGradient: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  prayerCardMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtle,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  prayerCardTimesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  prayerCardTimeBlock: {
    flex: 1,
    gap: 3,
  },
  prayerCardTimeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  prayerCardTimeLabelOnGradient: {
    color: 'rgba(255,255,255,0.85)',
  },
  prayerCardTimeVal: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  prayerCardTimeValOnGradient: {
    color: '#FFFFFF',
  },
  prayerCardFuture: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtle,
    marginTop: 3,
  },
  zawaalModule: {
    gap: 6,
    marginTop: 2,
  },
  zawaalSkyStrip: {
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zawaalSkyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5C4A22',
    letterSpacing: 0.3,
  },
  zawaalSkyMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6E5A2C',
    fontVariant: ['tabular-nums'],
  },
  zawaalTimelineTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(91, 75, 38, 0.22)',
    overflow: 'visible',
  },
  zawaalTimelineFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#B8860B',
  },
  zawaalTimelineDot: {
    position: 'absolute',
    top: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#6E5A2C',
    borderWidth: 2,
    borderColor: '#F7EBD1',
    marginLeft: -5,
  },
  zawaalTimelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zawaalTimelineLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6E5A2C',
    fontVariant: ['tabular-nums'],
  },
  prayerCardFutureOnGradient: {
    color: 'rgba(255,255,255,0.88)',
  },
  prayerCardsDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 2,
  },
  prayerCardsDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(29, 90, 60, 0.24)',
  },
  prayerCardsDotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colLabel: {
    fontSize: 10, fontWeight: '700',
    color: Colors.textSubtle,
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  colPrayer: {
    flex: 1.9,
  },
  colTime: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tableBody: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
    minHeight: 60,
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
    backgroundColor: '#F3FAF6',
    borderLeftWidth: 3,
    borderLeftColor: '#1E6B46',
  },
  rowNext: {
    backgroundColor: '#F5F9FF',
    borderLeftWidth: 3,
    borderLeftColor: '#2A5F9A',
  },
  rowSpecial: {
    backgroundColor: '#FAF8F1',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  prayerIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  prayerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  prayerGuidance: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C0392B',
    marginTop: 3,
    lineHeight: 14,
    maxWidth: 180,
  },
  prayerNameSpecial: {
    fontSize: 14, fontWeight: '500',
    color: Colors.textSecondary,
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
  forbiddenNoteOnGradient: {
    color: '#FFE7B3',
  },
  textWhite: { color: '#fff' },

  timeColCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  timeCell: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  timeCellCurrent: {
    color: '#133423',
  },
  timeCellNext: {
    color: '#173B61',
  },
  timeCellMuted: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSubtle,
    textAlign: 'center',
  },
  timePassed: {
    color: Colors.textSubtle,
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  iqamahTime: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#A61B1B',
    marginHorizontal: Spacing.md,
    marginTop: 12,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  forbiddenLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  forbiddenTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  forbiddenReason: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },
  forbiddenAction: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 4,
    lineHeight: 16,
  },
  forbiddenRight: {
    alignItems: 'flex-end',
    gap: 2,
    paddingTop: 1,
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
  forbiddenProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  forbiddenProgressFill: {
    height: '100%',
    backgroundColor: '#FFD08A',
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
