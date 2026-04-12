import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radius } from '@/constants/theme';
import { isBST } from '@/services/prayerService';
import { lookupTimetable, type DayTimetable } from '@/services/timetableData';
import {
  fetchHijriCalendarForMonth,
  fetchPrayerTimesForMonth,
  type PrayerTimeRow,
} from '@/services/contentService';

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

const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Ula',
  'Jumada al-Akhirah',
  'Rajab',
  'Shaaban',
  'Ramadan',
  'Shawwal',
  'Dhul Qadah',
  'Dhul Hijjah',
];

const HIJRI_MONTH_ALIASES: Record<string, number> = {
  muharram: 0,
  safar: 1,
  rabialawwal: 2,
  rabialawal: 2,
  rabiulawwal: 2,
  rabiulawal: 2,
  rabialthani: 3,
  rabialakhir: 3,
  rabiuthani: 3,
  rabiulakhir: 3,
  jumadaalula: 4,
  jumadaula: 4,
  jumadaalawwal: 4,
  jumadaalakhirah: 5,
  jumadaalthaniah: 5,
  rajab: 6,
  shaban: 7,
  shaaban: 7,
  ramadan: 8,
  shawwal: 9,
  dhulqadah: 10,
  dhualqadah: 10,
  dhulhijjah: 11,
  dhualhijjah: 11,
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STRIP_ITEM_WIDTH = 56;
const STRIP_ITEM_GAP = 10;
const STRIP_ITEM_RADIUS = 12;
const STRIP_SELECTED_GREEN = '#3FAE5A';
const STRIP_TEXT_DARK = '#2E2E2E';
const STRIP_TEXT_DAY = '#9AA09A';
const STRIP_TEXT_HIJRI = '#C59B2D';
const STRIP_TEXT_HIJRI_SOFT = '#D9BC6A';
const STRIP_FRIDAY_DOT = '#D39C2F';

type HijriParts = {
  day: number;
  monthIndex: number;
  year: number;
};

function normMonthName(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function isHijriLeapYear(year: number): boolean {
  const cycleYear = ((year - 1) % 30) + 1;
  return [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29].includes(cycleYear);
}

function hijriMonthLength(monthIndex: number, year: number): number {
  if (monthIndex === 11) return isHijriLeapYear(year) ? 30 : 29;
  return monthIndex % 2 === 0 ? 30 : 29;
}

function shiftHijri(parts: HijriParts, deltaDays: number): HijriParts {
  let day = parts.day;
  let monthIndex = parts.monthIndex;
  let year = parts.year;

  if (deltaDays >= 0) {
    let remaining = deltaDays;
    while (remaining > 0) {
      const monthLen = hijriMonthLength(monthIndex, year);
      if (day < monthLen) {
        day += 1;
      } else {
        day = 1;
        if (monthIndex === 11) {
          monthIndex = 0;
          year += 1;
        } else {
          monthIndex += 1;
        }
      }
      remaining -= 1;
    }
  } else {
    let remaining = -deltaDays;
    while (remaining > 0) {
      if (day > 1) {
        day -= 1;
      } else {
        if (monthIndex === 0) {
          monthIndex = 11;
          year -= 1;
        } else {
          monthIndex -= 1;
        }
        day = hijriMonthLength(monthIndex, year);
      }
      remaining -= 1;
    }
  }

  return { day, monthIndex, year };
}

function formatHijriParts(parts: HijriParts): string {
  return `${parts.day} ${HIJRI_MONTHS[parts.monthIndex]} ${parts.year}`;
}

const StripDateChip = React.memo(function StripDateChip({
  cell,
  isSelected,
  isToday,
  hijriDay,
  dow,
  nightMode,
  nightPalette,
  onSelect,
}: {
  cell: MonthDay;
  isSelected: boolean;
  isToday: boolean;
  hijriDay: string;
  dow: string;
  nightMode: boolean;
  nightPalette: NightPalette;
  onSelect: (cell: MonthDay) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const N = nightMode ? nightPalette : null;

  const handlePressIn = React.useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 28,
      bounciness: 3,
    }).start();
  }, [scale]);

  const handlePressOut = React.useCallback(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 170,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const containerStyle = React.useMemo(
    () => [
      calStyles.stripItem,
      isToday && !isSelected && calStyles.stripItemToday,
      isSelected && calStyles.stripItemSelected,
      N && !isSelected && {
        backgroundColor: 'transparent',
        borderColor: isToday ? STRIP_SELECTED_GREEN : N.border,
      },
      N && isSelected && {
        backgroundColor: STRIP_SELECTED_GREEN,
        borderColor: STRIP_SELECTED_GREEN,
      },
    ],
    [N, isSelected, isToday]
  );

  const dayStyle = React.useMemo(
    () => [
      calStyles.stripDow,
      isSelected && calStyles.stripTextSelected,
      !isSelected && { color: N ? N.textMuted : STRIP_TEXT_DAY },
      isToday && !isSelected && { color: STRIP_TEXT_DARK },
    ],
    [N, isSelected, isToday]
  );

  const dateStyle = React.useMemo(
    () => [
      calStyles.stripGreg,
      isSelected && calStyles.stripTextSelected,
      !isSelected && { color: N ? N.text : STRIP_TEXT_DARK },
    ],
    [N, isSelected]
  );

  const hijriStyle = React.useMemo(
    () => [
      calStyles.stripHijri,
      isSelected && calStyles.stripHijriSelected,
      !isSelected && { color: N ? STRIP_TEXT_HIJRI_SOFT : STRIP_TEXT_HIJRI },
    ],
    [N, isSelected]
  );

  const handleSelect = React.useCallback(() => onSelect(cell), [cell, onSelect]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={containerStyle}
        onPress={handleSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text style={dayStyle}>{dow}</Text>
        <Text style={dateStyle}>{cell.date.getDate()}</Text>
        <Text style={hijriStyle}>{hijriDay || '--'}</Text>
        {cell.isFriday ? <View style={calStyles.stripFridayDot} /> : null}
      </Pressable>
    </Animated.View>
  );
});

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
  predictHijriDate?: (date: Date) => string | null,
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
    const predictedHijri = isCurrentMonth ? (predictHijriDate?.(d) ?? null) : null;
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
        hijri: hijriDate ?? local.hijri ?? predictedHijri ?? '',
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
        hijri: hijriDate ?? predictedHijri ?? '',
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
    } else if (local && predictedHijri) {
      day = {
        ...local,
        hijri: predictedHijri,
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

function CalendarEventPlaceholders({
  selectedDay,
  nightMode,
  nightPalette,
  transliterateHijri,
}: {
  selectedDay: MonthDay | null;
  nightMode: boolean;
  nightPalette: NightPalette;
  transliterateHijri: (hijri: string) => string;
}) {
  const N = nightMode ? nightPalette : null;
  const islamicDateLabel = selectedDay?.day?.hijri
    ? transliterateHijri(selectedDay.day.hijri)
    : 'selected Islamic date';

  return (
    <View style={eventStyles.wrap}>
      <View style={[eventStyles.card, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <View style={eventStyles.headerRow}>
          <MaterialIcons name="event-important" size={16} color={N ? '#E7C36C' : '#C98500'} />
          <Text style={[eventStyles.title, N && { color: N.text }]}>Important Date Events</Text>
        </View>
        <Text style={[eventStyles.sub, N && { color: N.textSub }]}>Use this space for notable events linked to the Islamic date of {islamicDateLabel}.</Text>
      </View>

      <View style={[eventStyles.card, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <View style={eventStyles.headerRow}>
          <MaterialIcons name="mosque" size={16} color={N ? '#69C995' : '#0F8D73'} />
          <Text style={[eventStyles.title, N && { color: N.text }]}>Masjid Events</Text>
        </View>
        <Text style={[eventStyles.sub, N && { color: N.textSub }]}>Use this space for activities taking place at the masjid on that date.</Text>
      </View>
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
  const { width: screenWidth } = useWindowDimensions();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [dbRows, setDbRows] = useState<Map<number, PrayerTimeRow>>(new Map());
  const [hijriRows, setHijriRows] = useState<Map<number, string>>(new Map());
  const [dbLoading, setDbLoading] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<'month' | 'day'>('month');
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());
  const stripRef = useRef<ScrollView>(null);
  const lastAutoCenteredMonthKeyRef = useRef<string | null>(null);
  const N = nightMode ? nightPalette : null;

  const [selectedDay, setSelectedDay] = useState<MonthDay | null>(null);

  const predictedHijriFromToday = React.useMemo(() => {
    const todayHijri = lookupTimetable(today)?.hijri ?? '';
    if (!todayHijri) return null;

    const day = Number.parseInt(getHijriDayNum(todayHijri), 10);
    const hMonthName = getHijriMonthName(todayHijri);
    const hMonthIndex = HIJRI_MONTH_ALIASES[normMonthName(hMonthName)] ?? -1;
    const hYearMatch = todayHijri.match(/\b(\d{4})\b/);
    const hYear = hYearMatch ? Number.parseInt(hYearMatch[1], 10) : NaN;

    if (!Number.isFinite(day) || day <= 0 || hMonthIndex < 0 || !Number.isFinite(hYear)) {
      return null;
    }

    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

    return (targetDate: Date): HijriParts => {
      const targetUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const diffDays = Math.round((targetUtc - todayUtc) / 86400000);
      return shiftHijri({ day, monthIndex: hMonthIndex, year: hYear }, diffDays);
    };
  }, [today, getHijriDayNum, getHijriMonthName]);

  const predictHijriStringForDate = React.useCallback(
    (date: Date) => {
      if (!predictedHijriFromToday) return null;
      return formatHijriParts(predictedHijriFromToday(date));
    },
    [predictedHijriFromToday]
  );

  const currentGrid = React.useMemo(
    () => buildMonthGrid(viewYear, viewMonth, today, dbRows, hijriRows, predictHijriStringForDate),
    [viewYear, viewMonth, today, dbRows, hijriRows, predictHijriStringForDate]
  );

  const stripDays = currentGrid.filter((c) => c.isCurrentMonth);

  const pickerYears = React.useMemo(() => {
    const start = today.getFullYear();
    const end = today.getFullYear() + 30;
    const years: number[] = [];
    for (let y = start; y <= end; y++) years.push(y);
    return years;
  }, [today]);

  const getHijriYearHint = React.useCallback((year: number) => {
    if (predictedHijriFromToday) {
      const jan = predictedHijriFromToday(new Date(year, 0, 1));
      const dec = predictedHijriFromToday(new Date(year, 11, 1));
      if (jan.year !== dec.year) return `${jan.year}/${dec.year} AH`;
      return `${jan.year} AH`;
    }

    const jan = lookupTimetable(new Date(year, 0, 1))?.hijri ?? '';
    const dec = lookupTimetable(new Date(year, 11, 1))?.hijri ?? '';
    const janMatch = jan.match(/\b(\d{4})\b/);
    const decMatch = dec.match(/\b(\d{4})\b/);
    const janYear = janMatch ? janMatch[1] : '';
    const decYear = decMatch ? decMatch[1] : '';
    if (!janYear && !decYear) return '';
    if (janYear && decYear && janYear !== decYear) return `${janYear}/${decYear} AH`;
    return `${janYear || decYear} AH`;
  }, [predictedHijriFromToday]);

  const getHijriMonthHint = React.useCallback((year: number, month: number) => {
    if (predictedHijriFromToday) {
      const p = predictedHijriFromToday(new Date(year, month, 1));
      return `${HIJRI_MONTHS[p.monthIndex]} ${p.year}`;
    }

    const sample = lookupTimetable(new Date(year, month, 1))?.hijri ?? '';
    if (!sample) return 'Hijri n/a';
    const hMonth = getHijriMonthName(sample);
    const hYearMatch = sample.match(/\b(\d{4})\b/);
    const hYear = hYearMatch ? hYearMatch[1] : '';
    return hMonth ? `${hMonth}${hYear ? ` ${hYear}` : ''}` : 'Hijri n/a';
  }, [getHijriMonthName, predictedHijriFromToday]);

  const pickerSections = React.useMemo(
    () =>
      pickerYears.map((year) => ({
        year,
        yearHijri: getHijriYearHint(year),
        months: MONTH_NAMES.map((name, monthIndex) => ({
          monthIndex,
          shortName: name.slice(0, 3),
          hijriHint: getHijriMonthHint(year, monthIndex),
        })),
      })),
    [pickerYears, getHijriYearHint, getHijriMonthHint]
  );

  const pickerMonthDays = React.useMemo(() => {
    const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = new Date(pickerYear, pickerMonth, day);
      const localHijri = lookupTimetable(date)?.hijri ?? '';
      const predicted = predictedHijriFromToday ? predictedHijriFromToday(date) : null;
      const hijriDay = localHijri
        ? getHijriDayNum(localHijri)
        : predicted
          ? String(predicted.day)
          : '--';
      const dow = DAY_LABELS[(date.getDay() + 6) % 7];
      const dd = String(day).padStart(2, '0');
      const mm = String(pickerMonth + 1).padStart(2, '0');
      const key = `${dd}/${mm}/${pickerYear}`;
      return { day, date, dow, hijriDay, key };
    });
  }, [pickerYear, pickerMonth, predictedHijriFromToday, getHijriDayNum]);

  useFocusEffect(
    React.useCallback(() => {
      const now = new Date();
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      setShowMonthPicker(false);
      setPickerStep('month');
      setPickerYear(now.getFullYear());
      setPickerMonth(now.getMonth());
      setSelectedDay(null);
      setDbRows(new Map());
      setHijriRows(new Map());
      lastAutoCenteredMonthKeyRef.current = null;
      return undefined;
    }, [])
  );

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
      if (refreshed) {
        setSelectedDay(refreshed);
        return;
      }
      const fallback = currentGrid.find((c) => c.isCurrentMonth) ?? null;
      setSelectedDay(fallback);
      return;
    }

    const todayCell = currentGrid.find((c) => c.isToday && c.isCurrentMonth) ?? null;
    const firstCurrent = currentGrid.find((c) => c.isCurrentMonth) ?? null;
    setSelectedDay(todayCell ?? firstCurrent);
  }, [dbRows, currentGrid, selectedDay]);

  // When picker opens, clear the centering guard so that closing it will always
  // trigger exactly one auto-center on today.
  useEffect(() => {
    if (showMonthPicker) {
      lastAutoCenteredMonthKeyRef.current = null;
    }
  }, [showMonthPicker]);

  useEffect(() => {
    if (showMonthPicker || stripDays.length === 0) return;

    const monthKey = `${viewYear}-${viewMonth}`;
    if (lastAutoCenteredMonthKeyRef.current === monthKey) return;

    const todayIndex = stripDays.findIndex((d) => d.isToday);
    if (todayIndex < 0) return;

    const itemWidth = STRIP_ITEM_WIDTH;
    const itemGap = STRIP_ITEM_GAP;
    const contentPad = 8;
    const step = itemWidth + itemGap;
    const targetX = Math.max(0, contentPad + (todayIndex * step) - ((screenWidth - itemWidth) / 2));

    const timer = setTimeout(() => {
      stripRef.current?.scrollTo({ x: targetX, y: 0, animated: true });
      lastAutoCenteredMonthKeyRef.current = monthKey;
    }, 60);

    return () => clearTimeout(timer);
  }, [showMonthPicker, stripDays, screenWidth, viewYear, viewMonth]);

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

  return (
    <View style={[calStyles.splitContainer, N && { backgroundColor: N.bg }]}> 
      <View style={[calStyles.gridSection, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}> 
        {!showMonthPicker ? (
          <>
            <View style={[calStyles.navRow, { paddingHorizontal: 8 }]}> 
              <TouchableOpacity onPress={goBack} style={[calStyles.navArrow, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]} activeOpacity={0.7}>
                <MaterialIcons name="chevron-left" size={20} color={N ? '#69A8FF' : Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setPickerStep('month');
                  setPickerYear(viewYear);
                  setPickerMonth(viewMonth);
                  setShowMonthPicker(true);
                }}
                style={[calStyles.monthLabelButton, N && { backgroundColor: N.surfaceAlt }]}
                activeOpacity={0.7}
              >
                <View style={calStyles.monthLabel}>
                  <Text style={[calStyles.monthName, N && { color: N.text }]}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
                  {selectedDay?.day ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <MaterialIcons name="brightness-3" size={9} color={selectedDay.isFriday ? '#B8860B' : STRIP_TEXT_HIJRI} />
                      <Text
                        style={[calStyles.hijriMonthSub, { color: selectedDay.isFriday ? '#B8860B' : STRIP_TEXT_HIJRI }]}
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
                          <MaterialIcons name="brightness-3" size={9} color={STRIP_TEXT_HIJRI} />
                          <Text style={[calStyles.hijriMonthSub, { color: STRIP_TEXT_HIJRI }]}>
                            {viewHijriMonth}{viewHijriYear ? ` ${viewHijriYear} AH` : ''}
                          </Text>
                        </>
                      ) : null}
                      {dbLoading ? <Text style={calStyles.syncLabel}>  Syncing...</Text> : null}
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={goForward} style={[calStyles.navArrow, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]} activeOpacity={0.7}>
                <MaterialIcons name="chevron-right" size={20} color={N ? '#69A8FF' : Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={stripRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={calStyles.stripScrollContent}
              style={[calStyles.stripScroll, N && { borderTopColor: N.border }]}
            >
              {stripDays.map((cell) => {
                const isSelected = selectedDay?.key === cell.key;
                const isToday = cell.isToday;
                const hijriDay = cell.day ? getHijriDayNum(cell.day.hijri) : '';
                const dow = DAY_LABELS[(cell.date.getDay() + 6) % 7];

                return (
                  <StripDateChip
                    key={cell.key}
                    cell={cell}
                    isSelected={isSelected}
                    isToday={isToday}
                    hijriDay={hijriDay}
                    dow={dow}
                    nightMode={nightMode}
                    nightPalette={nightPalette}
                    onSelect={setSelectedDay}
                  />
                );
              })}
            </ScrollView>
          </>
        ) : (
          <View style={[calStyles.pickerContainer, N && { backgroundColor: N.surface }]}>
            <View style={[calStyles.pickerHeader, N && { borderBottomColor: N.border }]}>
              <TouchableOpacity
                onPress={() => {
                  if (pickerStep === 'day') {
                    setPickerStep('month');
                    return;
                  }
                  const now = new Date();
                  setViewYear(now.getFullYear());
                  setViewMonth(now.getMonth());
                  setPickerYear(now.getFullYear());
                  setPickerMonth(now.getMonth());
                  setPickerStep('month');
                  setSelectedDay(null);
                  setDbRows(new Map());
                  setHijriRows(new Map());
                  setShowMonthPicker(false);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={pickerStep === 'day' ? 'arrow-back' : 'close'}
                  size={24}
                  color={N ? N.text : Colors.textPrimary}
                />
              </TouchableOpacity>
              <Text style={[calStyles.pickerTitle, N && { color: N.text }]}>
                {pickerStep === 'day' ? 'Select Day' : 'Select Year & Month'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            {pickerStep === 'month' ? (
              <ScrollView
                showsVerticalScrollIndicator={true}
                contentContainerStyle={calStyles.pickerYearsWrap}
              >
                {pickerSections.map((section) => {
                const { year, yearHijri, months } = section;
                return (
                  <View key={year} style={[calStyles.yearSection, N && { borderBottomColor: N.border }]}>
                    <View style={calStyles.yearHeaderRow}>
                      <Text style={[calStyles.yearTitle, N && { color: N.text }]}>{year}</Text>
                      <Text style={[calStyles.yearHijri, N && { color: N.textMuted }]}>
                        {yearHijri || 'Hijri year n/a'}
                      </Text>
                    </View>

                    <View style={calStyles.monthGrid}>
                      {months.map((m) => {
                        const { monthIndex, shortName, hijriHint: monthHijri } = m;
                        const isSelected = year === viewYear && monthIndex === viewMonth;
                        return (
                          <TouchableOpacity
                            key={`${year}-${monthIndex}`}
                            onPress={() => {
                              setPickerYear(year);
                              setPickerMonth(monthIndex);
                              setViewYear(year);
                              setViewMonth(monthIndex);
                              setSelectedDay(null);
                              setDbRows(new Map());
                              setHijriRows(new Map());
                              setPickerStep('day');
                            }}
                            style={[
                              calStyles.monthButton,
                              isSelected && calStyles.monthButtonSelected,
                              N && {
                                backgroundColor: isSelected ? '#2E6CB9' : N.surface,
                                borderColor: isSelected ? '#69A8FF' : N.border,
                              },
                            ]}
                            activeOpacity={0.78}
                          >
                            <Text style={[
                              calStyles.monthButtonText,
                              isSelected && calStyles.monthButtonTextSelected,
                              N && { color: isSelected ? '#F3F8FF' : N.text },
                            ]}>
                              {shortName}
                            </Text>
                            <Text style={[
                              calStyles.monthButtonHijri,
                              isSelected && calStyles.monthButtonHijriSelected,
                              N && { color: isSelected ? '#DCEBFF' : N.textMuted },
                            ]} numberOfLines={1}>
                              {monthHijri}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
                })}
              </ScrollView>
            ) : (
              <View style={calStyles.dayPickerWrap}>
                <Text style={[calStyles.dayPickerMonthTitle, N && { color: N.text }]}>
                  {MONTH_NAMES[pickerMonth]} {pickerYear}
                </Text>
                <Text style={[calStyles.dayPickerHijriHint, N && { color: N.textMuted }]}>
                  {getHijriMonthHint(pickerYear, pickerMonth)}
                </Text>

                <ScrollView
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={calStyles.dayGrid}
                >
                  {pickerMonthDays.map((d) => {
                    const isToday =
                      d.date.getFullYear() === today.getFullYear() &&
                      d.date.getMonth() === today.getMonth() &&
                      d.date.getDate() === today.getDate();
                    const isSelected = selectedDay?.key === d.key;
                    return (
                      <TouchableOpacity
                        key={d.key}
                        onPress={() => {
                          setViewYear(pickerYear);
                          setViewMonth(pickerMonth);
                          setSelectedDay({
                            date: d.date,
                            key: d.key,
                            day: null,
                            dbRow: null,
                            isToday,
                            isFriday: d.date.getDay() === 5,
                            isCurrentMonth: true,
                          });
                          setDbRows(new Map());
                          setHijriRows(new Map());
                        }}
                        style={[
                          calStyles.dayButton,
                          isToday && calStyles.dayButtonToday,
                          isSelected && calStyles.dayButtonSelected,
                          N && {
                            backgroundColor: isSelected ? '#2E6CB9' : (isToday ? '#233857' : N.surface),
                            borderColor: isSelected ? '#69A8FF' : (isToday ? '#69A8FF' : N.border),
                          },
                        ]}
                        activeOpacity={0.82}
                      >
                        <Text style={[calStyles.dayButtonDow, N && { color: isSelected ? '#DCEBFF' : N.textMuted }]}>{d.dow}</Text>
                        <Text style={[calStyles.dayButtonDate, isToday && calStyles.dayButtonDateToday, N && { color: (isToday || isSelected) ? '#F3F8FF' : N.text }]}>{d.day}</Text>
                        <Text style={[calStyles.dayButtonHijri, N && { color: (isToday || isSelected) ? '#DCEBFF' : N.textMuted }]}>{d.hijriDay}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView
        style={[calStyles.panelSection, N && { backgroundColor: N.bg }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={calStyles.panelScrollContent}
      >
        <CalendarPrayerPanel selectedDay={selectedDay} nightMode={nightMode} nightPalette={nightPalette} />
        <CalendarEventPlaceholders
          selectedDay={selectedDay}
          nightMode={nightMode}
          nightPalette={nightPalette}
          transliterateHijri={transliterateHijri}
        />
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
    paddingTop: 4,
    paddingHorizontal: 2,
  },
  panelSection: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  panelScrollContent: {
    paddingBottom: 12,
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
  monthLabelButton: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  monthLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  hijriMonthSub: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.1,
  },
  syncLabel: {
    fontSize: 9,
    color: Colors.textSubtle,
  },
  pickerContainer: {
    flex: 1,
    maxHeight: 360,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pickerYearsWrap: {
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  yearSection: {
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  yearHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  yearTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  yearHijri: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  monthButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonSelected: {
    backgroundColor: '#2E6CB9',
    borderColor: '#69A8FF',
    borderWidth: 2,
  },
  monthButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthButtonTextSelected: {
    color: '#F3F8FF',
    fontWeight: '700',
  },
  monthButtonHijri: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textSubtle,
    letterSpacing: 0.1,
  },
  monthButtonHijriSelected: {
    color: '#DCEBFF',
  },
  dayPickerWrap: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  dayPickerMonthTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  dayPickerHijriHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: STRIP_TEXT_HIJRI,
    textAlign: 'center',
    marginBottom: 6,
  },
  dayGrid: {
    paddingBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  dayButton: {
    width: '13.7%',
    minWidth: 46,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonToday: {
    borderColor: '#2E6CB9',
    backgroundColor: '#E6F1FF',
  },
  dayButtonSelected: {
    borderColor: '#2E6CB9',
    backgroundColor: '#2E6CB9',
  },
  dayButtonDow: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textSubtle,
    textTransform: 'uppercase',
  },
  dayButtonDate: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 0,
    lineHeight: 17,
  },
  dayButtonDateToday: {
    color: '#2E6CB9',
  },
  dayButtonHijri: {
    fontSize: 10,
    fontWeight: '600',
    color: STRIP_TEXT_HIJRI,
    marginTop: 0,
  },
  stripScroll: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stripScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: STRIP_ITEM_GAP,
  },
  stripItem: {
    width: STRIP_ITEM_WIDTH,
    borderRadius: STRIP_ITEM_RADIUS,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 78,
  },
  stripItemToday: {
    borderColor: STRIP_SELECTED_GREEN,
    backgroundColor: 'transparent',
  },
  stripItemSelected: {
    borderColor: STRIP_SELECTED_GREEN,
    backgroundColor: STRIP_SELECTED_GREEN,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  stripDow: {
    fontSize: 12,
    fontWeight: '600',
    color: STRIP_TEXT_DAY,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  stripGreg: {
    marginTop: 3,
    fontSize: 19,
    fontWeight: '800',
    color: STRIP_TEXT_DARK,
    lineHeight: 22,
  },
  stripHijri: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: STRIP_TEXT_HIJRI,
    lineHeight: 14,
  },
  stripTextSelected: {
    color: '#FFFFFF',
  },
  stripHijriSelected: {
    color: '#FFF1C7',
  },
  stripFridayDot: {
    marginTop: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: STRIP_FRIDAY_DOT,
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

const eventStyles = StyleSheet.create({
  wrap: {
    gap: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSubtle,
    lineHeight: 18,
  },
});
