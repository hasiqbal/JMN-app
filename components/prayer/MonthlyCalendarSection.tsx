import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable as RNPressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Colors, Radius } from '@/constants/theme';
import { isBST } from '@/services/prayerService';
import { lookupTimetable, type DayTimetable } from '@/services/timetableData';
import {
  fetchIslamicCalendarEventsForMonth,
  fetchPrayerTimesForMonth,
  type IslamicCalendarEventRow,
  type PrayerTimeRow,
} from '@/services/contentService';
import {
  forceRefreshHijriCalendarYearCache,
  getHijriCalendarForMonthCached,
  getHijriCalendarForYearCached,
} from '@/services/hijriCalendarWarmupService';

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

const CalendarPressable = RNPressable;
const CalendarStripScrollView = ScrollView;

function extractIsoDateFromLinkedGregorianDate(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  if (!text) return null;

  const isoLikeMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoLikeMatch) {
    const year = Number.parseInt(isoLikeMatch[1], 10);
    const month = Number.parseInt(isoLikeMatch[2], 10);
    const day = Number.parseInt(isoLikeMatch[3], 10);
    if (
      Number.isFinite(year)
      && Number.isFinite(month)
      && Number.isFinite(day)
      && month >= 1
      && month <= 12
      && day >= 1
      && day <= 31
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth() + 1;
  const day = parsed.getUTCDate();
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

type HijriParts = {
  day: number;
  monthIndex: number;
  year: number;
};

type ParsedHijriLabel = {
  day: number;
  monthLabel: string;
  year: number;
};

function parseHijriLabel(value: string | null | undefined): ParsedHijriLabel | null {
  const text = (value ?? '').trim();
  if (!text) return null;

  const match = text.match(/^\s*(\d{1,2})\s+(.+?)\s+(\d{1,4})\b/i);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const year = Number.parseInt(match[3], 10);
  const monthLabel = match[2].replace(/\s+/g, ' ').trim();

  if (!Number.isFinite(day) || day < 1 || day > 30) return null;
  if (!Number.isFinite(year) || year <= 0) return null;
  if (!monthLabel) return null;

  return { day, monthLabel, year };
}

function formatPortalMonthHint(start: ParsedHijriLabel, end: ParsedHijriLabel): string {
  if (start.monthLabel === end.monthLabel && start.year === end.year) {
    return `${start.monthLabel} ${start.year}`;
  }
  if (start.year === end.year) {
    return `${start.monthLabel}/${end.monthLabel} ${start.year}`;
  }
  return `${start.monthLabel} ${start.year}/${end.monthLabel} ${end.year}`;
}

function formatPortalMonthRangeHint(start: ParsedHijriLabel, end: ParsedHijriLabel): string {
  if (start.monthLabel === end.monthLabel && start.year === end.year) {
    return `${start.monthLabel} ${start.year} AH`;
  }
  return `${start.monthLabel} ${start.year} AH → ${end.monthLabel} ${end.year} AH`;
}

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

function formatPredictedHijri(parts: HijriParts): string {
  const monthLabel = HIJRI_MONTHS[parts.monthIndex] ?? '';
  if (!monthLabel) return `${parts.day} ${parts.year} AH`;
  return `${parts.day} ${monthLabel} ${parts.year} AH`;
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
  const N = nightMode ? nightPalette : null;

  const handleSelect = React.useCallback(() => onSelect(cell), [cell, onSelect]);

  const containerStyle = React.useCallback(
    ({ pressed }: { pressed: boolean }) => [
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
      pressed && !isSelected && { opacity: 0.6 },
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

  return (
    <CalendarPressable
      style={containerStyle}
      onPress={handleSelect}
      cancelable={false}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
    >
      <Text style={dayStyle}>{dow}</Text>
      <Text style={dateStyle}>{cell.date.getDate()}</Text>
      <Text style={hijriStyle}>{hijriDay || '--'}</Text>
      {cell.isFriday ? <View style={calStyles.stripFridayDot} /> : null}
    </CalendarPressable>
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
    const portalHijri = isCurrentMonth ? (hijriDate ?? '') : '';

    let day: DayTimetable | null = local;
    if (dbRow && local) {
      day = {
        ...local,
        fajr: dbRow.fajr,
        sunrise: dbRow.sunrise,
        ishraq: dbRow.ishraq ?? local.ishraq,
        zawaal: dbRow.zawaal ?? local.zawaal,
        dhuhr: dbRow.zuhr,
        asr: dbRow.asr,
        maghrib: dbRow.maghrib,
        isha: dbRow.isha,
        iqFajr: dbRow.fajr_jamat ?? local.iqFajr,
        iqDhuhr: dbRow.zuhr_jamat ?? local.iqDhuhr,
        iqAsr: dbRow.asr_jamat ?? local.iqAsr,
        iqMaghrib: dbRow.maghrib_jamat ?? local.iqMaghrib,
        iqIsha: dbRow.isha_jamat ?? local.iqIsha,
        // Calendar chip Hijri must follow portal hijri_calendar rows for this month.
        hijri: portalHijri,
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
        hijri: portalHijri,
        iqFajr: dbRow.fajr_jamat ?? '07:30',
        iqDhuhr: dbRow.zuhr_jamat ?? '13:00',
        iqAsr: dbRow.asr_jamat ?? '15:30',
        iqMaghrib: dbRow.maghrib_jamat ?? dbRow.maghrib,
        iqIsha: dbRow.isha_jamat ?? '20:00',
      };
    } else if (local && portalHijri) {
      day = {
        ...local,
        hijri: portalHijri,
      };
    } else if (local) {
      day = {
        ...local,
        hijri: portalHijri,
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
  const now = new Date();
  const selectedStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const isPastDay = selectedStart < todayStart;
  const isFutureDay = selectedStart > todayStart;
  const isSelectedToday = !isPastDay && !isFutureDay;

  const parseTimeOnDate = (timeStr: string): Date | null => {
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const parseClockToMinutes = (timeStr: string | undefined | null): number | null => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return (h * 60) + m;
  };

  const formatMinutesToClock = (totalMinutes: number): string => {
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const midpointClockBetween = (start: string | undefined | null, end: string | undefined | null): string | undefined => {
    const startMinutes = parseClockToMinutes(start);
    const endMinutes = parseClockToMinutes(end);
    if (startMinutes === null || endMinutes === null) return undefined;

    const adjustedEnd = endMinutes <= startMinutes ? endMinutes + (24 * 60) : endMinutes;
    const midpoint = Math.round(startMinutes + ((adjustedEnd - startMinutes) / 2));
    return formatMinutesToClock(midpoint);
  };

  const subtractMinutesFromClock = (clock: string | undefined | null, minutes: number): string | undefined => {
    const parsed = parseClockToMinutes(clock);
    if (parsed === null) return undefined;
    return formatMinutesToClock(parsed - minutes);
  };

  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + 1);
  const tomorrowLocal = lookupTimetable(nextDate);
  const isThursday = date.getDay() === 4;
  const isTomorrowFriday = nextDate.getDay() === 5;
  const dhuhrIqamahDate = day.iqDhuhr ? parseTimeOnDate(day.iqDhuhr) : null;
  const asrAthanDate = parseTimeOnDate(day.asr);
  const shouldUseTomorrowJumuah = isThursday
    && isTomorrowFriday
    && (isPastDay || (isSelectedToday && !!dhuhrIqamahDate && now >= dhuhrIqamahDate));
  const shouldPreviewTomorrowJumuahAsDual = isThursday
    && isTomorrowFriday
    && (isPastDay || (isSelectedToday && !!asrAthanDate && now >= asrAthanDate));
  const tomorrowJumuahIqamah = tomorrowLocal?.jumuah ?? (isBST(nextDate) ? '13:30' : '12:45');
  const duhaToday = midpointClockBetween(day.fajr, day.maghrib) ?? '--:--';
  const duhaTomorrow = midpointClockBetween(tomorrowLocal?.fajr, tomorrowLocal?.maghrib);
  const zawaalToday = day.zawaal ?? subtractMinutesFromClock(day.dhuhr, 15) ?? '--:--';
  const zawaalTomorrow = tomorrowLocal?.zawaal ?? subtractMinutesFromClock(tomorrowLocal?.dhuhr, 15);

  const baseRows: {
    label: string;
    color: string;
    icon: string;
    athan: string;
    iqamah: string | null;
    tomorrowAthan?: string;
    tomorrowIqamah?: string;
    isJumuah?: boolean;
    isPreviewJumuah?: boolean;
    jumuahFirst?: string;
    jumuahSecond?: string;
  }[] = [
    {
      label: 'Fajr',
      color: '#3949AB',
      icon: 'bedtime',
      athan: day.fajr,
      iqamah: day.iqFajr,
      tomorrowAthan: tomorrowLocal?.fajr,
      tomorrowIqamah: tomorrowLocal?.iqFajr,
    },
    {
      label: 'Sunrise',
      color: '#E4A11B',
      icon: 'wb-sunny',
      athan: day.sunrise,
      iqamah: null,
      tomorrowAthan: tomorrowLocal?.sunrise,
    },
    {
      label: 'Ishraq',
      color: '#0F8D73',
      icon: 'flare',
      athan: day.ishraq,
      iqamah: null,
      tomorrowAthan: tomorrowLocal?.ishraq,
    },
    {
      label: 'ad-Duha al-Kubra',
      color: '#2E7D32',
      icon: 'wb-sunny',
      athan: duhaToday,
      iqamah: null,
      tomorrowAthan: duhaTomorrow,
    },
    {
      label: 'Zawaal',
      color: '#00897B',
      icon: 'hourglass-empty',
      athan: zawaalToday,
      iqamah: null,
      tomorrowAthan: zawaalTomorrow,
    },
    {
      label: 'Dhuhr',
      color: '#1B8A5A',
      icon: 'wb-sunny',
      athan: day.dhuhr,
      iqamah: day.iqDhuhr,
      tomorrowAthan: tomorrowLocal?.dhuhr,
      tomorrowIqamah: shouldUseTomorrowJumuah ? tomorrowJumuahIqamah : tomorrowLocal?.iqDhuhr,
    },
    {
      label: 'Asr',
      color: '#E65100',
      icon: 'wb-cloudy',
      athan: day.asr,
      iqamah: day.iqAsr,
      tomorrowAthan: tomorrowLocal?.asr,
      tomorrowIqamah: tomorrowLocal?.iqAsr,
    },
    {
      label: 'Maghrib',
      color: '#AD1457',
      icon: 'nights-stay',
      athan: day.maghrib,
      iqamah: day.iqMaghrib,
      tomorrowAthan: tomorrowLocal?.maghrib,
      tomorrowIqamah: tomorrowLocal?.iqMaghrib,
    },
    {
      label: 'Isha',
      color: '#283593',
      icon: 'nightlight-round',
      athan: day.isha,
      iqamah: day.iqIsha,
      tomorrowAthan: tomorrowLocal?.isha,
      tomorrowIqamah: tomorrowLocal?.iqIsha,
    },
  ];

  const jumuahFallbackDate = shouldPreviewTomorrowJumuahAsDual ? nextDate : date;
  const j1Raw = dbRow?.jumu_ah_1 ?? (isBST(jumuahFallbackDate) ? '13:30' : '12:45');
  const j2Raw = dbRow?.jumu_ah_2 ?? (isBST(jumuahFallbackDate) ? '14:30' : '13:30');

  const shouldRenderJumuahRow = isFriday || shouldPreviewTomorrowJumuahAsDual;
  const orderedRows = shouldRenderJumuahRow
    ? baseRows.map((row) =>
        row.label === 'Dhuhr'
          ? {
              label: 'Jumuah',
              color: '#F9A825',
              icon: 'star',
              athan: day.dhuhr,
              iqamah: null,
              isJumuah: true,
              isPreviewJumuah: !isFriday,
              jumuahFirst: j1Raw,
              jumuahSecond: j2Raw,
            }
          : row
      )
    : baseRows;

  const rowTimes = orderedRows.map((row) => parseTimeOnDate(row.athan));
  const currentRowIndex = isSelectedToday
    ? rowTimes.findIndex((time, idx) => {
        const next = rowTimes[idx + 1];
        if (!time) return false;
        if (!next) return now >= time;
        return now >= time && now < next;
      })
    : -1;
  const nextRowIndex = isSelectedToday
    ? rowTimes.findIndex((time) => !!time && now < time)
    : -1;

  return (
    <View style={[panelStyles.panel, N && { backgroundColor: N.surface, borderColor: N.border }]}>
      <View style={[panelStyles.colRow, N && { backgroundColor: N.surfaceAlt, borderBottomColor: N.border }]}>
        <Text style={[panelStyles.colLbl, { flex: 1 }]}>PRAYER</Text>
        <Text style={[panelStyles.colLbl, { width: 72, textAlign: 'center' }]}>BEGINS</Text>
        <Text style={[panelStyles.colLbl, { width: 72, textAlign: 'center' }]}>IQAMAH</Text>
      </View>

      {orderedRows.map((p, idx) => {
        const isPreviewJumuah = !!p.isPreviewJumuah;
        const isCompleted = (isPastDay || (isSelectedToday && idx < currentRowIndex)) && !isPreviewJumuah;
        const isCurrent = isSelectedToday && idx === currentRowIndex;
        const isNext = isSelectedToday && idx === nextRowIndex;
        const athanDate = parseTimeOnDate(p.athan);
        const iqamahDate = p.iqamah ? parseTimeOnDate(p.iqamah) : null;
        const isIshaAthanPassed = p.label === 'Isha' && isSelectedToday && !!athanDate && now >= athanDate;
        const isIshaIqamahPassed = p.label === 'Isha' && isSelectedToday && !!iqamahDate && now >= iqamahDate;
        const shouldCrossAthan = isCompleted || isIshaAthanPassed;
        const shouldCrossIqamah = (isCompleted && !!p.iqamah) || isIshaIqamahPassed;
        const shouldPreviewTomorrowIsha = p.label === 'Isha' && (isIshaAthanPassed || isIshaIqamahPassed);
        const showTomorrowAthan = !!p.tomorrowAthan && (isCompleted || shouldPreviewTomorrowIsha);
        const showTomorrowIqamah = !!p.tomorrowIqamah && !p.isJumuah && (isCompleted || shouldPreviewTomorrowIsha);

        return (
        <View
          key={p.label}
          style={[
            panelStyles.prayerRow,
            idx < orderedRows.length - 1 && [panelStyles.prayerRowBorder, N && { borderBottomColor: N.border }],
            isCurrent && panelStyles.rowCurrent,
            isNext && panelStyles.rowNext,
            N && { backgroundColor: N.surface },
          ]}
        >
          <View style={[panelStyles.iconBox, { backgroundColor: p.color + '1E' }]}>
            <MaterialIcons name={p.icon as any} size={13} color={p.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[panelStyles.prayerName, N && { color: N.text }]}>{p.label}</Text>
            {p.label === 'Fajr' ? <Text style={panelStyles.prayerGuidance}>Nafl forbidden after Fajr until Ishraq.</Text> : null}
            {p.label === 'Asr' ? <Text style={panelStyles.prayerGuidance}>Avoid delaying Asr; prayer time ends 20 mins before Maghrib.</Text> : null}
            {p.label === 'Sunrise' ? <Text style={panelStyles.prayerGuidance}>Nafl forbidden until Ishraq.</Text> : null}
            {p.label === 'ad-Duha al-Kubra' ? <Text style={panelStyles.prayerGuidance}>Islamic Midday: midpoint between Fajr and Maghrib.</Text> : null}
            {p.label === 'Zawaal' ? <Text style={panelStyles.prayerGuidance}>Prayer forbidden until Dhuhr begins.</Text> : null}
          </View>
          <View style={{ width: 72, alignItems: 'center' }}>
            <Text style={[
              panelStyles.athanTime,
              shouldCrossAthan && panelStyles.timePassed,
              isCurrent && panelStyles.timeCurrent,
              isNext && panelStyles.timeNext,
              N && { color: N.textSub },
            ]}>{p.athan}</Text>
            {showTomorrowAthan ? (
              <View style={[panelStyles.tomorrowBadge, N && { backgroundColor: 'rgba(105,168,255,0.16)' }]}>
                <Text style={[panelStyles.tomorrowLabel, N && { color: '#9BC2EA' }]}>+24h</Text>
                <Text style={[panelStyles.tomorrowTime, N && { color: '#D7E8FF' }]}>{p.tomorrowAthan}</Text>
              </View>
            ) : null}
          </View>
          {p.isJumuah ? (
            <View style={panelStyles.jumuahIqamahWrap}>
              <Text style={[panelStyles.jumuahMiniLabel, N && { color: N.textMuted }]}>First</Text>
              <Text style={[panelStyles.jumuahMiniTime, isCompleted && panelStyles.timePassed, N && { color: N.text }]}>{p.jumuahFirst ?? '—'}</Text>
              <Text style={[panelStyles.jumuahMiniLabel, panelStyles.jumuahMiniLabelGap, N && { color: N.textMuted }]}>Second</Text>
              <Text style={[panelStyles.jumuahMiniTime, isCompleted && panelStyles.timePassed, N && { color: N.text }]}>{p.jumuahSecond ?? '—'}</Text>
            </View>
          ) : (
            <View style={{ width: 72, alignItems: 'center' }}>
              <Text style={[
                panelStyles.iqamahTime,
                !p.iqamah && { color: Colors.textSubtle },
                shouldCrossIqamah && panelStyles.timePassed,
                isCurrent && p.iqamah && panelStyles.timeCurrent,
                isNext && p.iqamah && panelStyles.timeNext,
                N && p.iqamah && { color: N.text },
              ]}>
                {p.iqamah || '—'}
              </Text>
              {showTomorrowIqamah ? (
                <View style={[panelStyles.tomorrowBadge, N && { backgroundColor: 'rgba(105,168,255,0.16)' }]}>
                  <Text style={[panelStyles.tomorrowLabel, N && { color: '#9BC2EA' }]}>+24h</Text>
                  <Text style={[panelStyles.tomorrowTime, N && { color: '#D7E8FF' }]}>{p.tomorrowIqamah}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      );
      })}
    </View>
  );
}

function CalendarEventPlaceholders({
  selectedDay,
  eventsByDate,
  nightMode,
  nightPalette,
  onOpenMasjidAnnouncement,
}: {
  selectedDay: MonthDay | null;
  eventsByDate: Map<string, IslamicCalendarEventRow[]>;
  nightMode: boolean;
  nightPalette: NightPalette;
  onOpenMasjidAnnouncement: (event: IslamicCalendarEventRow) => void;
}) {
  const N = nightMode ? nightPalette : null;
  const gregorianDateLabel = selectedDay
    ? selectedDay.date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : 'selected date';
  const [importantDatesExpanded, setImportantDatesExpanded] = React.useState(true);
  const [masjidEventsExpanded, setMasjidEventsExpanded] = React.useState(true);

  const selectedIsoDate = selectedDay
    ? `${selectedDay.date.getFullYear()}-${String(selectedDay.date.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.date.getDate()).padStart(2, '0')}`
    : null;

  const selectedEvents = selectedDay?.isCurrentMonth && selectedIsoDate
    ? (eventsByDate.get(selectedIsoDate) ?? [])
    : [];

  const containsAny = (haystack: string, needles: string[]) => needles.some((needle) => haystack.includes(needle));

  const normalizeForSort = (value: string | null | undefined): string =>
    (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const importantDatePriority = (event: IslamicCalendarEventRow): number => {
    const text = normalizeForSort([event.title, event.field_label, event.notes, event.region].filter(Boolean).join(' '));

    const prophetKeywords = [
      'prophet muhammad',
      'muhammad',
      'messenger of allah',
      'rasulullah',
      'mawlid',
      'milad',
      'birth of the messenger',
      'nabi',
    ];

    const sahabaOrAhlulBaytKeywords = [
      'sahaba',
      'sahabi',
      'ahlul bayt',
      'ahl al-bayt',
      'ahlulbait',
      'sayyiduna',
      'abu bakr',
      'umar ibn',
      'uthman ibn',
      'ali ibn',
      'hasan ibn',
      'hussain ibn',
      'fatima',
      'aisha',
      'khadija',
    ];

    if (containsAny(text, prophetKeywords)) return 0;
    if (containsAny(text, sahabaOrAhlulBaytKeywords)) return 1;
    return 2;
  };

  const masjidEventOccurrenceBySource = React.useMemo(() => {
    const counts = new Map<string, number>();

    eventsByDate.forEach((dateEvents) => {
      dateEvents.forEach((event) => {
        if (event.event_type !== 'masjid_event') return;
        const sourceKey = (event.source_announcement_id ?? '').trim();
        if (!sourceKey) return;
        counts.set(sourceKey, (counts.get(sourceKey) ?? 0) + 1);
      });
    });

    return counts;
  }, [eventsByDate]);

  const isRecurringMasjidEvent = (event: IslamicCalendarEventRow): boolean => {
    const sourceKey = (event.source_announcement_id ?? '').trim();
    if (!sourceKey) return false;
    return (masjidEventOccurrenceBySource.get(sourceKey) ?? 0) > 1;
  };

  const importantDateEvents = selectedEvents
    .filter((event) => event.event_type === 'important_date')
    .sort((a, b) => {
      const priorityDiff = importantDatePriority(a) - importantDatePriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return a.title.localeCompare(b.title);
    });

  const masjidEvents = selectedEvents
    .filter((event) => event.event_type === 'masjid_event')
    .sort((a, b) => {
      const recurringDiff = Number(isRecurringMasjidEvent(a)) - Number(isRecurringMasjidEvent(b));
      if (recurringDiff !== 0) return recurringDiff;
      return a.title.localeCompare(b.title);
    });

  const renderEventEntries = (
    events: IslamicCalendarEventRow[],
    emptyMessage: string,
    options?: { announcementLinked?: boolean; showLinkedDate?: boolean },
  ) => {
    if (events.length === 0) {
      return (
        <Text style={[eventStyles.sub, N && { color: N.textSub }]}>{emptyMessage}</Text>
      );
    }

    return (
      <View style={eventStyles.entryList}>
        {events.map((event) => {
          const metaParts = [
            options?.showLinkedDate ? event.linked_gregorian_date : null,
            event.field_label,
            event.region,
          ].filter(Boolean);
          const canOpenAnnouncement = options?.announcementLinked === true && Boolean(event.source_announcement_id);
          const announcementCtaLabel = event.source_link_url
            ? 'Open linked announcement'
            : 'Open in Announcements';

          return (
            <View key={event.id} style={[eventStyles.entryItem, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}>
              <Text style={[eventStyles.entryTitle, N && { color: N.text }]} numberOfLines={2}>{event.title}</Text>
              {metaParts.length > 0 ? (
                <Text style={[eventStyles.entryMeta, N && { color: N.textMuted }]} numberOfLines={1}>{metaParts.join(' • ')}</Text>
              ) : null}
              {event.notes ? (
                <Text style={[eventStyles.entryNotes, N && { color: N.textSub }]} numberOfLines={2}>{event.notes}</Text>
              ) : null}
              {canOpenAnnouncement ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onOpenMasjidAnnouncement(event)}
                  style={eventStyles.entryLinkButton}
                >
                  <MaterialIcons name="open-in-new" size={13} color={N ? '#9BC2EA' : '#2D7D5F'} />
                  <Text style={[eventStyles.entryLinkText, N && { color: '#9BC2EA' }]}>{announcementCtaLabel}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={eventStyles.wrap}>
      <View style={[eventStyles.card, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setImportantDatesExpanded((value) => !value)}
          style={eventStyles.headerButton}
        >
          <View style={eventStyles.headerRow}>
            <View style={eventStyles.headerLeft}>
              <MaterialIcons name="event-note" size={16} color={N ? '#E7C36C' : '#C98500'} />
              <Text style={[eventStyles.title, N && { color: N.text }]}>Important Islamic Dates (Selected Day)</Text>
            </View>
            <MaterialIcons
              name={importantDatesExpanded ? 'expand-less' : 'expand-more'}
              size={18}
              color={N ? N.textMuted : Colors.textSubtle}
            />
          </View>
        </TouchableOpacity>
        {importantDatesExpanded ? (
          <>
            <Text style={[eventStyles.subtleHint, N && { color: N.textMuted }]}>Only dates linked to this selected day.</Text>
            {renderEventEntries(
              importantDateEvents,
              `No important Islamic dates for ${gregorianDateLabel}.`
            )}
          </>
        ) : null}
      </View>

      <View style={[eventStyles.card, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setMasjidEventsExpanded((value) => !value)}
          style={eventStyles.headerButton}
        >
          <View style={eventStyles.headerRow}>
            <View style={eventStyles.headerLeft}>
              <MaterialIcons name="mosque" size={16} color={N ? '#69C995' : '#0F8D73'} />
              <Text style={[eventStyles.title, N && { color: N.text }]}>Masjid Events (Announcements)</Text>
            </View>
            <MaterialIcons
              name={masjidEventsExpanded ? 'expand-less' : 'expand-more'}
              size={18}
              color={N ? N.textMuted : Colors.textSubtle}
            />
          </View>
        </TouchableOpacity>
        {masjidEventsExpanded ? (
          <>
            <Text style={[eventStyles.subtleHint, N && { color: N.textMuted }]}>Only Event-tagged announcements for this selected day.</Text>
            {renderEventEntries(
              masjidEvents,
              `No Event-tagged announcements for ${gregorianDateLabel}.`,
              { announcementLinked: true }
            )}
          </>
        ) : null}
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
  currentHijriMonthYearLabel,
  betweenCalendarAndTimetable,
}: {
  today: Date;
  nightMode: boolean;
  nightPalette: NightPalette;
  transliterateHijri: (hijri: string) => string;
  getHijriDayNum: (hijri: string) => string;
  getHijriMonthName: (hijri: string) => string;
  currentHijriMonthYearLabel?: string;
  betweenCalendarAndTimetable?: React.ReactNode;
}) {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [dbRows, setDbRows] = useState<Map<number, PrayerTimeRow>>(new Map());
  const [hijriRows, setHijriRows] = useState<Map<number, string>>(new Map());
  const [loadedHijriMonthKey, setLoadedHijriMonthKey] = useState<string | null>(null);
  const [portalMonthHints, setPortalMonthHints] = useState<Map<string, { monthHint: string; rangeHint: string }>>(new Map());
  const [portalYearHints, setPortalYearHints] = useState<Map<number, string>>(new Map());
  const [eventsByDate, setEventsByDate] = useState<Map<string, IslamicCalendarEventRow[]>>(new Map());
  const [calendarRefreshToken, setCalendarRefreshToken] = useState(0);

  const pickerHeight = React.useMemo(() => {
    return Math.min(460, Math.max(320, Math.floor(screenHeight * 0.58)));
  }, [screenHeight]);
  const weekCount = React.useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    return Math.max(1, Math.ceil((startOffset + daysInMonth) / 7));
  }, [viewYear, viewMonth]);
  const monthCellMinHeight = React.useMemo(() => {
    const available = Math.max(300, screenHeight - 260);
    return Math.max(62, Math.min(78, Math.floor(available / weekCount)));
  }, [screenHeight, weekCount]);
  const monthButtonWidth = React.useMemo(() => {
    const horizontalPadding = 20;
    const gaps = 14;
    const usable = Math.max(240, screenWidth - horizontalPadding - gaps);
    return Math.floor(usable / 3);
  }, [screenWidth]);
  const monthButtonHeight = React.useMemo(() => {
    const reservedHeight = 146;
    const gridAvailable = Math.max(246, pickerHeight - reservedHeight);
    return Math.max(60, Math.min(70, Math.floor((gridAvailable - 15) / 4)));
  }, [pickerHeight]);
  const [dbLoading, setDbLoading] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerStep, setPickerStep] = useState<'month' | 'day'>('month');
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());
  const N = nightMode ? nightPalette : null;

  const [selectedDay, setSelectedDay] = useState<MonthDay | null>(null);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);

  const resetCalendarDataAndReload = React.useCallback(() => {
    setDbRows(new Map());
    setLoadedHijriMonthKey(null);
    setEventsByDate(new Map());
    setCalendarRefreshToken((value) => value + 1);
  }, []);

  const handleOpenMasjidAnnouncement = React.useCallback((event: IslamicCalendarEventRow) => {
    const sourceAnnouncementId = event.source_announcement_id?.trim();
    if (!sourceAnnouncementId) {
      router.push('/(tabs)/events' as any);
      return;
    }

    router.push({
      pathname: '/(tabs)/events',
      params: {
        openAnnouncementId: sourceAnnouncementId,
        openAt: String(Date.now()),
      },
    } as any);
  }, [router]);

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

  const predictedHijriRowsForViewMonth = React.useMemo(() => {
    const fallback = new Map<number, string>();
    if (!predictedHijriFromToday) return fallback;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const predicted = predictedHijriFromToday(new Date(viewYear, viewMonth, day));
      fallback.set(day, formatPredictedHijri(predicted));
    }
    return fallback;
  }, [predictedHijriFromToday, viewYear, viewMonth]);

  const resolvedHijriRowsForViewMonth = React.useMemo(() => {
    const viewMonthKey = `${viewYear}-${viewMonth}`;
    const merged = new Map<number, string>(predictedHijriRowsForViewMonth);
    if (loadedHijriMonthKey === viewMonthKey && hijriRows.size > 0) {
      hijriRows.forEach((value, day) => merged.set(day, value));
    }
    return merged;
  }, [viewYear, viewMonth, predictedHijriRowsForViewMonth, loadedHijriMonthKey, hijriRows]);

  const currentGrid = React.useMemo(
    () => {
      return buildMonthGrid(viewYear, viewMonth, today, dbRows, resolvedHijriRowsForViewMonth);
    },
    [viewYear, viewMonth, today, dbRows, resolvedHijriRowsForViewMonth]
  );

  const getHijriYearHint = React.useCallback((year: number) => {
    const portalYearHint = portalYearHints.get(year);
    if (portalYearHint) return portalYearHint;

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
  }, [predictedHijriFromToday, portalYearHints]);

  const pickerYearHijri = React.useMemo(() => getHijriYearHint(pickerYear), [getHijriYearHint, pickerYear]);

  const getHijriMonthHint = React.useCallback((year: number, month: number) => {
    const portalMonthHint = portalMonthHints.get(`${year}-${month}`)?.monthHint;
    if (portalMonthHint) return portalMonthHint;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    if (predictedHijriFromToday) {
      const start = predictedHijriFromToday(new Date(year, month, 1));
      const end = predictedHijriFromToday(new Date(year, month, daysInMonth));

      const startMonth = HIJRI_MONTHS[start.monthIndex];
      const endMonth = HIJRI_MONTHS[end.monthIndex];
      if (start.monthIndex === end.monthIndex && start.year === end.year) {
        return `${startMonth} ${start.year}`;
      }
      if (start.year === end.year) {
        return `${startMonth}/${endMonth} ${start.year}`;
      }
      return `${startMonth} ${start.year}/${endMonth} ${end.year}`;
    }

    const startSample = lookupTimetable(new Date(year, month, 1))?.hijri ?? '';
    const endSample = lookupTimetable(new Date(year, month, daysInMonth))?.hijri ?? '';

    const startMonth = startSample ? getHijriMonthName(startSample) : '';
    const startYearMatch = startSample.match(/\b(\d{4})\b/);
    const startYear = startYearMatch ? startYearMatch[1] : '';

    const endMonth = endSample ? getHijriMonthName(endSample) : '';
    const endYearMatch = endSample.match(/\b(\d{4})\b/);
    const endYear = endYearMatch ? endYearMatch[1] : '';

    if (!startMonth && !endMonth) return 'Hijri n/a';

    const leftMonth = startMonth || endMonth;
    const leftYear = startYear || endYear;
    const rightMonth = endMonth || startMonth;
    const rightYear = endYear || startYear;

    if (leftMonth === rightMonth && leftYear === rightYear) {
      return `${leftMonth}${leftYear ? ` ${leftYear}` : ''}`;
    }
    if (leftYear && rightYear && leftYear === rightYear) {
      return `${leftMonth}/${rightMonth} ${leftYear}`;
    }
    return `${leftMonth}${leftYear ? ` ${leftYear}` : ''}/${rightMonth}${rightYear ? ` ${rightYear}` : ''}`;
  }, [getHijriMonthName, predictedHijriFromToday, portalMonthHints]);

  const getHijriMonthRangeHint = React.useCallback((year: number, month: number) => {
    const portalRangeHint = portalMonthHints.get(`${year}-${month}`)?.rangeHint;
    if (portalRangeHint) return portalRangeHint;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    if (predictedHijriFromToday) {
      const start = predictedHijriFromToday(new Date(year, month, 1));
      const end = predictedHijriFromToday(new Date(year, month, daysInMonth));

      const startLabel = `${HIJRI_MONTHS[start.monthIndex]} ${start.year}`;
      const endLabel = `${HIJRI_MONTHS[end.monthIndex]} ${end.year}`;
      if (start.monthIndex === end.monthIndex && start.year === end.year) {
        return `${startLabel} AH`;
      }
      return `${startLabel} AH → ${endLabel} AH`;
    }

    const startSample = lookupTimetable(new Date(year, month, 1))?.hijri ?? '';
    const endSample = lookupTimetable(new Date(year, month, daysInMonth))?.hijri ?? '';

    const startMonth = startSample ? getHijriMonthName(startSample) : '';
    const startYearMatch = startSample.match(/\b(\d{4})\b/);
    const startYear = startYearMatch ? startYearMatch[1] : '';

    const endMonth = endSample ? getHijriMonthName(endSample) : '';
    const endYearMatch = endSample.match(/\b(\d{4})\b/);
    const endYear = endYearMatch ? endYearMatch[1] : '';

    if (!startMonth && !endMonth) return 'Hijri n/a';

    const startLabel = `${startMonth || endMonth}${startYear ? ` ${startYear}` : ''}`.trim();
    const endLabel = `${endMonth || startMonth}${endYear ? ` ${endYear}` : ''}`.trim();

    if (startLabel === endLabel) {
      return `${startLabel} AH`;
    }
    return `${startLabel} AH → ${endLabel} AH`;
  }, [getHijriMonthName, predictedHijriFromToday, portalMonthHints]);

  useEffect(() => {
    if (!showMonthPicker) return;

    const year = pickerYear;
    if (portalYearHints.has(year)) return;

    let cancelled = false;

    getHijriCalendarForYearCached(year)
      .then((yearRows) => {
        if (cancelled) return;

        const allMonths = Array.from({ length: 12 }, (_, idx) => {
          const monthNumber = idx + 1;
          return yearRows
            .filter((row) => row.gregorian_month === monthNumber)
            .sort((a, b) => a.gregorian_day - b.gregorian_day);
        });

        const nextMonthHints = new Map(portalMonthHints);
        let firstSeen: ParsedHijriLabel | null = null;
        let lastSeen: ParsedHijriLabel | null = null;

        allMonths.forEach((rows, monthIndex) => {
          if (!Array.isArray(rows) || rows.length === 0) return;

          const sorted = [...rows].sort((a, b) => a.gregorian_day - b.gregorian_day);
          const parsedRows = sorted
            .map((row) => parseHijriLabel(row.hijri_date))
            .filter((row): row is ParsedHijriLabel => Boolean(row));

          if (parsedRows.length === 0) return;

          const first = parsedRows[0];
          const last = parsedRows[parsedRows.length - 1];

          if (!firstSeen) firstSeen = first;
          lastSeen = last;

          const key = `${year}-${monthIndex}`;
          nextMonthHints.set(key, {
            monthHint: formatPortalMonthHint(first, last),
            rangeHint: formatPortalMonthRangeHint(first, last),
          });
        });

        if (nextMonthHints.size !== portalMonthHints.size) {
          setPortalMonthHints(nextMonthHints);
        }

        if (firstSeen && lastSeen) {
          const firstSeenYear = (firstSeen as ParsedHijriLabel).year;
          const lastSeenYear = (lastSeen as ParsedHijriLabel).year;
          const nextYearHints = new Map(portalYearHints);
          if (firstSeenYear === lastSeenYear) {
            nextYearHints.set(year, `${firstSeenYear} AH`);
          } else {
            nextYearHints.set(year, `${firstSeenYear}/${lastSeenYear} AH`);
          }
          setPortalYearHints(nextYearHints);
        }
      })
      .catch(() => {
        // Keep local fallback hints when portal month-hint prefetch fails.
      });

    return () => {
      cancelled = true;
    };
  }, [showMonthPicker, pickerYear, portalMonthHints, portalYearHints]);

  const pickerMonthDays = React.useMemo(() => {
    const daysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const isViewingLoadedMonth = pickerYear === viewYear && pickerMonth === viewMonth;
    const pickerMonthKey = `${pickerYear}-${pickerMonth}`;
    const viewMonthKey = `${viewYear}-${viewMonth}`;
    const canRenderPortalHijri = isViewingLoadedMonth
      && pickerMonthKey === viewMonthKey
      && loadedHijriMonthKey === viewMonthKey
      && hijriRows.size > 0;

    const pickerFallbackHijriRows = new Map<number, string>();
    if (predictedHijriFromToday) {
      for (let day = 1; day <= daysInMonth; day += 1) {
        const predicted = predictedHijriFromToday(new Date(pickerYear, pickerMonth, day));
        pickerFallbackHijriRows.set(day, formatPredictedHijri(predicted));
      }
    }

    const entries = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = new Date(pickerYear, pickerMonth, day);
      const displayHijri = canRenderPortalHijri
        ? (hijriRows.get(day) ?? pickerFallbackHijriRows.get(day) ?? '')
        : (pickerFallbackHijriRows.get(day) ?? '');

      const localMonthName = displayHijri ? getHijriMonthName(displayHijri) : '';
      const localMonthIndex = localMonthName ? (HIJRI_MONTH_ALIASES[normMonthName(localMonthName)] ?? -1) : -1;
      const localYearMatch = displayHijri.match(/\b(\d{4})\b/);
      const localYear = localYearMatch ? Number.parseInt(localYearMatch[1], 10) : NaN;

      const resolvedMonthIndex = localMonthIndex;
      const resolvedYear = localYear;

      const hijriDay = displayHijri
        ? getHijriDayNum(displayHijri)
        : '--';
      const dow = DAY_LABELS[(date.getDay() + 6) % 7];
      const dd = String(day).padStart(2, '0');
      const mm = String(pickerMonth + 1).padStart(2, '0');
      const key = `${dd}/${mm}/${pickerYear}`;
      const hijriMonthKey = (resolvedMonthIndex >= 0 && Number.isFinite(resolvedYear))
        ? `${resolvedYear}-${resolvedMonthIndex}`
        : null;
      return { day, date, dow, hijriDay, key, hijriMonthKey };
    });

    return entries.map((entry, index) => {
      const previous = index > 0 ? entries[index - 1] : null;
      const dayNumber = Number.parseInt(entry.hijriDay, 10);
      const isHijriDayOne = Number.isFinite(dayNumber) && dayNumber === 1;
      const rolloverByMonthKey = Boolean(
        previous
        && previous.hijriMonthKey
        && entry.hijriMonthKey
        && previous.hijriMonthKey !== entry.hijriMonthKey
      );

      return {
        ...entry,
        isHijriMonthStart: isHijriDayOne || rolloverByMonthKey,
      };
    });
  }, [
    pickerYear,
    pickerMonth,
    viewYear,
    viewMonth,
    predictedHijriFromToday,
    loadedHijriMonthKey,
    hijriRows,
    getHijriDayNum,
    getHijriMonthName,
  ]);

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
      setShowDayDetailModal(false);
      setCalendarRefreshToken((value) => value + 1);
      return undefined;
    }, [])
  );

  useEffect(() => {
    setDbLoading(true);
    setSyncError(null);
    Promise.allSettled([
      fetchPrayerTimesForMonth(viewMonth + 1),
      getHijriCalendarForMonthCached(viewYear, viewMonth + 1),
      fetchIslamicCalendarEventsForMonth(viewYear, viewMonth + 1),
    ])
      .then((results) => {
        const rowsResult = results[0];
        const hijriResult = results[1];
        const eventsResult = results[2];

        const rows = rowsResult.status === 'fulfilled' ? rowsResult.value : [];
        const hijri = hijriResult.status === 'fulfilled' ? hijriResult.value : [];
        const monthEvents = eventsResult.status === 'fulfilled' ? eventsResult.value : [];

        if (rowsResult.status === 'rejected') {
          console.error('[MonthlyCalendarSection] Prayer times sync failed', {
            viewMonth: viewMonth + 1,
            reason: rowsResult.reason,
          });
        }

        if (hijriResult.status === 'rejected') {
          console.error('[MonthlyCalendarSection] Hijri calendar sync failed', {
            viewYear,
            viewMonth: viewMonth + 1,
            reason: hijriResult.reason,
          });
        }

        if (eventsResult.status === 'rejected') {
          console.warn('[MonthlyCalendarSection] Events feed unavailable for this session', {
            viewYear,
            viewMonth: viewMonth + 1,
            reason: eventsResult.reason,
          });
        }

        const prayerMap = new Map<number, PrayerTimeRow>();
        rows.forEach((r) => prayerMap.set(r.day, r));

        const hijriMap = new Map<number, string>();
        hijri.forEach((r) => hijriMap.set(r.gregorian_day, r.hijri_date));

        const expectedDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        if (hijriResult.status !== 'fulfilled') {
          setSyncError('Hijri sync failed. Pull to refresh or reopen month.');
        } else if (hijriMap.size !== expectedDaysInMonth) {
          if (predictedHijriFromToday) {
            setSyncError(null);
          } else {
            setSyncError(`Hijri sync incomplete for ${MONTH_NAMES[viewMonth]} ${viewYear} (${hijriMap.size}/${expectedDaysInMonth} days).`);
          }
        } else {
          setSyncError(null);
        }

        const eventMap = new Map<string, IslamicCalendarEventRow[]>();
        monthEvents.forEach((event) => {
          const isoDate = extractIsoDateFromLinkedGregorianDate(event.linked_gregorian_date);
          if (!isoDate) return;

          const dateEvents = eventMap.get(isoDate) ?? [];

          const duplicateIndex = dateEvents.findIndex((existing) => {
            if (existing.event_type !== event.event_type) return false;

            if (event.event_type === 'masjid_event') {
              const existingAnnouncementId = (existing.source_announcement_id ?? '').trim();
              const nextAnnouncementId = (event.source_announcement_id ?? '').trim();
              if (existingAnnouncementId && nextAnnouncementId) {
                return existingAnnouncementId === nextAnnouncementId;
              }
              return existing.title.trim().toLowerCase() === event.title.trim().toLowerCase();
            }

            return existing.id === event.id;
          });

          if (duplicateIndex >= 0) {
            const existing = dateEvents[duplicateIndex];
            const existingNotes = (existing.notes ?? '').trim();
            const incomingNotes = (event.notes ?? '').trim();
            const incomingLooksCleaner = incomingNotes.length > existingNotes.length
              && !(incomingNotes.startsWith('[') && incomingNotes.endsWith(']'));
            if (incomingLooksCleaner) {
              dateEvents[duplicateIndex] = event;
            }
          } else {
            dateEvents.push(event);
          }

          eventMap.set(isoDate, dateEvents);
        });

        setDbRows(prayerMap);
        setHijriRows(hijriMap);
        setLoadedHijriMonthKey(`${viewYear}-${viewMonth}`);
        setEventsByDate(eventMap);
        setDbLoading(false);
      });
  }, [viewMonth, viewYear, calendarRefreshToken, predictedHijriFromToday]);

  useEffect(() => {
    if (selectedDay) {
      const refreshed = currentGrid.find((c) => c.key === selectedDay.key);
      if (refreshed) {
        if (refreshed.day !== selectedDay.day || refreshed.dbRow !== selectedDay.dbRow || refreshed.isFriday !== selectedDay.isFriday) {
          setSelectedDay(refreshed);
        }
        return;
      }
      const fallback = currentGrid.find((c) => c.isCurrentMonth) ?? null;
      if (fallback?.key !== selectedDay.key) {
        setSelectedDay(fallback);
      }
      return;
    }

    const todayCell = currentGrid.find((c) => c.isToday && c.isCurrentMonth) ?? null;
    const firstCurrent = currentGrid.find((c) => c.isCurrentMonth) ?? null;
    setSelectedDay(todayCell ?? firstCurrent);
  }, [dbRows, currentGrid, selectedDay]);

  const goBack = () => {
    setShowDayDetailModal(false);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
    resetCalendarDataAndReload();
  };

  const goForward = () => {
    setShowDayDetailModal(false);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
    resetCalendarDataAndReload();
  };

  const handleManualRefresh = React.useCallback(() => {
    if (manualRefreshing) return;

    setManualRefreshing(true);
    setSyncError(null);

    void forceRefreshHijriCalendarYearCache(viewYear)
      .catch(() => {
        setSyncError('Refresh failed. Please try again.');
      })
      .finally(() => {
        resetCalendarDataAndReload();
        setManualRefreshing(false);
      });
  }, [manualRefreshing, resetCalendarDataAndReload, viewYear]);

  const firstWithHijri = currentGrid.find((c) => c.isCurrentMonth && c.day?.hijri);
  const isViewingCurrentGregorianMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const forcedCurrentMonthHijriLabel = isViewingCurrentGregorianMonth
    ? (currentHijriMonthYearLabel?.trim() ?? '')
    : '';
  const fallbackMonthStartHijri = lookupTimetable(new Date(viewYear, viewMonth, 1))?.hijri ?? '';
  const fallbackMonthHint = getHijriMonthHint(viewYear, viewMonth);
  const fallbackMonthHintLabel = fallbackMonthHint === 'Hijri n/a' ? '' : fallbackMonthHint;
  const fallbackMonthHintWithAh = fallbackMonthHintLabel
    ? (fallbackMonthHintLabel.includes('AH') ? fallbackMonthHintLabel : `${fallbackMonthHintLabel} AH`)
    : '';

  const headerHijriLabel = fallbackMonthHintWithAh
    ? fallbackMonthHintWithAh
    : firstWithHijri?.day
    ? (() => {
        const month = getHijriMonthName(firstWithHijri.day.hijri);
        const m = firstWithHijri.day.hijri.match(/\b(\d{4})\b/);
        return month ? `${month}${m ? ` ${m[1]} AH` : ''}` : '';
      })()
    : forcedCurrentMonthHijriLabel
      ? forcedCurrentMonthHijriLabel
    : fallbackMonthStartHijri
      ? (() => {
          const month = getHijriMonthName(fallbackMonthStartHijri);
          const m = fallbackMonthStartHijri.match(/\b(\d{4})\b/);
          return month ? `${month}${m ? ` ${m[1]} AH` : ''}` : '';
        })()
      : fallbackMonthHintLabel;

  const [stableHeaderHijriLabel, setStableHeaderHijriLabel] = React.useState('');
  useEffect(() => {
    if (headerHijriLabel) {
      setStableHeaderHijriLabel(headerHijriLabel);
    }
  }, [headerHijriLabel]);

  const visibleHeaderHijriLabel = headerHijriLabel || stableHeaderHijriLabel;
  return (
    <View style={[calStyles.splitContainer, N && { backgroundColor: N.bg }]}> 
      <View style={[calStyles.gridSection, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}> 
        <View style={[calStyles.monthViewHint, N && { borderTopColor: N.border, backgroundColor: N.surfaceAlt }]}> 
          <MaterialIcons name="calendar-view-month" size={14} color={N ? '#9BC2EA' : '#2D7D5F'} />
          <Text style={[calStyles.monthViewHintText, N && { color: N.textSub }]}>Tap any date to open full prayer times and events</Text>
        </View>
      </View>

      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (pickerStep === 'day') {
            setPickerStep('month');
            return;
          }
          setShowMonthPicker(false);
        }}
      >
        <View style={calStyles.pickerModalBackdrop}>
          <CalendarPressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => {
              if (pickerStep === 'day') {
                setPickerStep('month');
                return;
              }
              setShowMonthPicker(false);
            }}
          />
          <View style={[calStyles.pickerModalCard, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
            <View style={[calStyles.pickerContainer, { height: pickerHeight }, N && { backgroundColor: N.surface }]}>
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
                    resetCalendarDataAndReload();
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
                  showsVerticalScrollIndicator={false}
                  style={{ flex: 1 }}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={calStyles.pickerYearsWrap}
                >
                  <View style={[calStyles.yearSection, N && { borderBottomColor: N.border }]}>
                    <View style={calStyles.yearSwitchRow}>
                      <TouchableOpacity
                        onPress={() => setPickerYear((y) => y - 1)}
                        style={[calStyles.yearSwitchBtn, N && { borderColor: N.border, backgroundColor: N.surface }]}
                        activeOpacity={0.8}
                        hitSlop={8}
                      >
                        <MaterialIcons name="chevron-left" size={18} color={N ? N.text : Colors.textPrimary} />
                      </TouchableOpacity>
                      <Text style={[calStyles.yearTitle, N && { color: N.text }]}>{pickerYear}</Text>
                      <TouchableOpacity
                        onPress={() => setPickerYear((y) => y + 1)}
                        style={[calStyles.yearSwitchBtn, N && { borderColor: N.border, backgroundColor: N.surface }]}
                        activeOpacity={0.8}
                        hitSlop={8}
                      >
                        <MaterialIcons name="chevron-right" size={18} color={N ? N.text : Colors.textPrimary} />
                      </TouchableOpacity>
                    </View>

                    <View style={calStyles.yearHeaderRow}>
                      <Text style={[calStyles.yearHijri, N && { color: N.textMuted }]}> 
                        {pickerYearHijri || 'Hijri year n/a'}
                      </Text>
                    </View>

                    <View style={calStyles.monthGrid}>
                      {MONTH_NAMES.map((name, monthIndex) => {
                        const shortName = name.slice(0, 3);
                        const monthHijri = getHijriMonthHint(pickerYear, monthIndex);
                        const isSelected = pickerYear === viewYear && monthIndex === viewMonth;
                        return (
                          <CalendarPressable
                            key={`${pickerYear}-${monthIndex}`}
                            onPress={() => {
                              setPickerMonth(monthIndex);
                              setViewYear(pickerYear);
                              setViewMonth(monthIndex);
                              setSelectedDay(null);
                              setShowDayDetailModal(false);
                              resetCalendarDataAndReload();
                              setPickerStep('month');
                              setShowMonthPicker(false);
                            }}
                            style={[
                              calStyles.monthButton,
                              { width: monthButtonWidth, minHeight: monthButtonHeight, height: monthButtonHeight },
                              isSelected && calStyles.monthButtonSelected,
                              N && {
                                backgroundColor: isSelected ? '#2E6CB9' : N.surface,
                                borderColor: isSelected ? '#69A8FF' : N.border,
                              },
                            ]}
                            cancelable={false}
                            hitSlop={8}
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
                            ]} numberOfLines={2}>
                              {monthHijri}
                            </Text>
                          </CalendarPressable>
                        );
                      })}
                    </View>
                  </View>
                </ScrollView>
              ) : (
                <View style={calStyles.dayPickerWrap}>
                  <Text style={[calStyles.dayPickerMonthTitle, N && { color: N.text }]}> 
                    {MONTH_NAMES[pickerMonth]} {pickerYear}
                  </Text>
                  <Text style={[calStyles.dayPickerHijriHint, N && { color: N.textMuted }]}> 
                    {getHijriMonthRangeHint(pickerYear, pickerMonth)}
                  </Text>

                  <ScrollView
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="always"
                    contentContainerStyle={calStyles.dayGrid}
                  >
                    {pickerMonthDays.map((d) => {
                      const isToday =
                        d.date.getFullYear() === today.getFullYear() &&
                        d.date.getMonth() === today.getMonth() &&
                        d.date.getDate() === today.getDate();
                      const isSelected = selectedDay?.key === d.key;
                      return (
                        <CalendarPressable
                          key={d.key}
                          onPress={() => {
                            setViewYear(pickerYear);
                            setViewMonth(pickerMonth);
                            const matched = currentGrid.find((cell) => cell.key === d.key && cell.isCurrentMonth);
                            setSelectedDay(
                              matched ?? {
                                date: d.date,
                                key: d.key,
                                day: null,
                                dbRow: null,
                                isToday,
                                isFriday: d.date.getDay() === 5,
                                isCurrentMonth: true,
                              }
                            );
                          }}
                          style={[
                            calStyles.dayButton,
                            d.isHijriMonthStart && calStyles.dayButtonHijriMonthStart,
                            isToday && calStyles.dayButtonToday,
                            isSelected && calStyles.dayButtonSelected,
                            N && {
                              backgroundColor: isSelected ? '#2E6CB9' : (isToday ? '#233857' : N.surface),
                              borderColor: isSelected
                                ? '#69A8FF'
                                : (d.isHijriMonthStart ? '#C59B2D' : (isToday ? '#69A8FF' : N.border)),
                            },
                          ]}
                          cancelable={false}
                          hitSlop={8}
                        >
                          <Text style={[
                            calStyles.dayButtonDow,
                            d.isHijriMonthStart && calStyles.dayButtonDowHijriMonthStart,
                            N && { color: isSelected ? '#DCEBFF' : N.textMuted },
                          ]}>{d.dow}</Text>
                          <Text style={[calStyles.dayButtonDate, isToday && calStyles.dayButtonDateToday, N && { color: (isToday || isSelected) ? '#F3F8FF' : N.text }]}>{d.day}</Text>
                          <Text style={[
                            calStyles.dayButtonHijri,
                            d.isHijriMonthStart && calStyles.dayButtonHijriMonthStartText,
                            N && { color: (isToday || isSelected) ? '#DCEBFF' : N.textMuted },
                          ]}>{d.hijriDay}</Text>
                        </CalendarPressable>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        style={[calStyles.panelSection, N && { backgroundColor: N.bg }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={calStyles.panelScrollContent}
      >
        {betweenCalendarAndTimetable ? (
          <View style={calStyles.interstitialWrap}>{betweenCalendarAndTimetable}</View>
        ) : null}
        <View style={[calStyles.monthMatrixCard, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
          <View style={[calStyles.monthMatrixTitleBar, N && { borderBottomColor: N.border, backgroundColor: N.surfaceAlt }]}> 
            <View pointerEvents="none" style={calStyles.monthTitleDecorWrap}>
              <View style={[calStyles.monthTitleDecorOrbLarge, N && { backgroundColor: '#7CB4EA22' }]} />
              <View style={[calStyles.monthTitleDecorOrbSmall, N && { backgroundColor: '#9BC2EA2A' }]} />
            </View>

            <View style={calStyles.monthMatrixTitleWrap}>
              <Text numberOfLines={1} style={[calStyles.monthMatrixKicker, N && { color: N.textMuted }]}>Monthly timetable</Text>
              <Text numberOfLines={1} style={[calStyles.monthMatrixTitle, N && { color: N.text }]}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <View style={calStyles.monthMatrixSubTitleRow}>
                <MaterialIcons name="brightness-2" size={13} color={N ? '#9BC2EA' : '#5A7769'} />
                <Text numberOfLines={1} style={[calStyles.monthMatrixSubTitle, N && { color: N.textMuted }]}>
                  {visibleHeaderHijriLabel || 'Hijri syncing...'}
                </Text>
              </View>
              {manualRefreshing ? (
                <Text style={[calStyles.syncLabel, N && { color: N.textMuted }]}>Syncing dates...</Text>
              ) : null}
              {!manualRefreshing && syncError ? (
                <Text style={calStyles.syncErrorLabel}>{syncError}</Text>
              ) : null}
            </View>

            <View style={calStyles.monthHeaderActions}>
              <View style={[calStyles.monthHeaderUnifiedControl, N && { borderColor: N.border, backgroundColor: N.surface }]}>
                <TouchableOpacity
                  onPress={goBack}
                  style={[calStyles.monthHeaderUnifiedIconBtn, calStyles.monthHeaderUnifiedLeft, N && { borderRightColor: N.border }]}
                  activeOpacity={0.8}
                  hitSlop={8}
                >
                  <MaterialIcons name="chevron-left" size={16} color={N ? '#9BC2EA' : '#2D7D5F'} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setPickerStep('month');
                    setPickerYear(viewYear);
                    setPickerMonth(viewMonth);
                    setShowMonthPicker(true);
                  }}
                  style={[calStyles.monthHeaderUnifiedCenterBtn, N && { borderLeftColor: N.border, borderRightColor: N.border }]}
                  activeOpacity={0.8}
                  hitSlop={8}
                >
                  <MaterialIcons name="calendar-month" size={15} color={N ? '#9BC2EA' : '#FFFFFF'} />
                  <Text numberOfLines={1} style={[calStyles.monthHeaderActionText, calStyles.monthHeaderActionTextPrimary, N && { color: N.textSub }]}>Select month</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={goForward}
                  style={[calStyles.monthHeaderUnifiedIconBtn, calStyles.monthHeaderUnifiedRight, N && { borderLeftColor: N.border }]}
                  activeOpacity={0.8}
                  hitSlop={8}
                >
                  <MaterialIcons name="chevron-right" size={16} color={N ? '#9BC2EA' : '#2D7D5F'} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleManualRefresh}
                style={[calStyles.monthHeaderIconBtn, N && { borderColor: N.border, backgroundColor: N.surface }]}
                activeOpacity={0.8}
                disabled={manualRefreshing}
                hitSlop={8}
              >
                <MaterialIcons
                  name={manualRefreshing ? 'hourglass-empty' : 'refresh'}
                  size={16}
                  color={N ? '#9BC2EA' : '#2D7D5F'}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[calStyles.monthMatrixHeadRow, N && { borderBottomColor: N.border, backgroundColor: N.surfaceAlt }]}>
            {DAY_LABELS.map((label) => (
              <View key={`head-${label}`} style={calStyles.monthMatrixHeadCell}>
                <Text style={[calStyles.monthMatrixHeadText, N && { color: N.textMuted }]}>{label.toUpperCase()}</Text>
              </View>
            ))}
          </View>

          <View style={calStyles.monthMatrixGrid}>
            {currentGrid.map((cell) => {
              const isDimmed = !cell.isCurrentMonth;
              const isoDate = `${cell.date.getFullYear()}-${String(cell.date.getMonth() + 1).padStart(2, '0')}-${String(cell.date.getDate()).padStart(2, '0')}`;
              const eventCount = cell.isCurrentMonth ? (eventsByDate.get(isoDate)?.length ?? 0) : 0;
              const hijriDay = cell.isCurrentMonth && cell.day?.hijri
                ? getHijriDayNum(cell.day.hijri)
                : '';

              return (
                <CalendarPressable
                  key={`matrix-${cell.key}`}
                  onPress={() => {
                    if (!cell.isCurrentMonth) return;
                    setSelectedDay(cell);
                    setShowDayDetailModal(true);
                  }}
                  disabled={!cell.isCurrentMonth}
                  style={[
                    calStyles.monthMatrixCell,
                    { minHeight: monthCellMinHeight },
                    isDimmed && calStyles.monthMatrixCellOut,
                    cell.isToday && calStyles.monthMatrixCellToday,
                    cell.isCurrentMonth && cell.isFriday && calStyles.monthMatrixCellFriday,
                    N && { borderColor: N.border, backgroundColor: isDimmed ? N.surfaceAlt : N.surface },
                    N && cell.isToday && { borderColor: '#69A8FF', backgroundColor: '#1E3354' },
                  ]}
                >
                  <View style={calStyles.monthMatrixCellDateRow}>
                    <Text style={[calStyles.monthMatrixCellDate, N && { color: isDimmed ? N.textMuted : N.text }]}>{cell.date.getDate()}</Text>
                    <View style={calStyles.monthMatrixDateRightCol}>
                      {hijriDay ? (
                        <Text style={[calStyles.monthMatrixCellHijri, N && { color: isDimmed ? N.textMuted : '#E7C36C' }]}>{hijriDay}</Text>
                      ) : null}
                    </View>
                  </View>

                  {cell.isToday ? (
                    <View style={calStyles.monthMatrixTodayBadgeRow}>
                      <View style={[calStyles.monthMatrixTodayBadge, N && { backgroundColor: '#2E6CB9' }]}>
                        <Text numberOfLines={1} style={calStyles.monthMatrixTodayBadgeText}>Today</Text>
                      </View>
                    </View>
                  ) : null}

                  {cell.isCurrentMonth ? (
                    <View style={calStyles.monthMatrixMetaWrap}>
                      <View style={calStyles.monthMatrixIndicatorRow}>
                        {cell.isFriday ? (
                          <View style={calStyles.monthMatrixDotBadge}>
                            <MaterialIcons name="star" size={10} color="#F9A825" />
                          </View>
                        ) : null}
                        {eventCount > 0 ? (
                          <View style={[calStyles.monthMatrixEventBadge, N && { backgroundColor: '#2E6CB9' }]}>
                            <View style={calStyles.monthMatrixEventDot} />
                          </View>
                        ) : null}
                      </View>

                    </View>
                  ) : null}
                </CalendarPressable>
              );
            })}
          </View>
        </View>
        <CalendarEventPlaceholders
          selectedDay={selectedDay}
          eventsByDate={eventsByDate}
          nightMode={nightMode}
          nightPalette={nightPalette}
          onOpenMasjidAnnouncement={handleOpenMasjidAnnouncement}
        />
      </ScrollView>

      <Modal
        visible={showDayDetailModal && !!selectedDay}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDayDetailModal(false)}
      >
        <View style={calStyles.dayModalBackdrop}>
          <CalendarPressable style={StyleSheet.absoluteFillObject} onPress={() => setShowDayDetailModal(false)} />
          <View style={[calStyles.dayModalCard, N && { backgroundColor: N.bg, borderColor: N.border }]}> 
            <View style={[calStyles.dayModalHeader, N && { borderBottomColor: N.border }]}> 
              <View style={{ flex: 1 }}>
                <Text style={[calStyles.dayModalTitle, N && { color: N.text }]}>
                  {selectedDay?.date.toLocaleDateString(undefined, {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  }) || 'Day details'}
                </Text>
                <Text style={[calStyles.dayModalSub, N && { color: N.textMuted }]} numberOfLines={1}>
                  {selectedDay?.day?.hijri ? transliterateHijri(selectedDay.day.hijri) : 'Hijri syncing...'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDayDetailModal(false)}
                style={[calStyles.dayModalCloseBtn, N && { borderColor: N.border, backgroundColor: N.surface }]}
                activeOpacity={0.8}
              >
                <MaterialIcons name="close" size={18} color={N ? N.text : Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={calStyles.dayModalScroll} showsVerticalScrollIndicator={false}>
              <CalendarPrayerPanel
                selectedDay={selectedDay}
                nightMode={nightMode}
                nightPalette={nightPalette}
              />
              <CalendarEventPlaceholders
                selectedDay={selectedDay}
                eventsByDate={eventsByDate}
                nightMode={nightMode}
                nightPalette={nightPalette}
                onOpenMasjidAnnouncement={handleOpenMasjidAnnouncement}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 14,
  },
  monthMatrixCard: {
    marginHorizontal: 10,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C4D5CB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  monthMatrixTitleBar: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D2E0D8',
    backgroundColor: '#EAF3EE',
    position: 'relative',
  },
  monthTitleDecorWrap: {
    position: 'absolute',
    right: -10,
    top: -12,
    width: 88,
    height: 68,
    pointerEvents: 'none',
  },
  monthTitleDecorOrbLarge: {
    position: 'absolute',
    right: 6,
    top: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2D7D5F1F',
  },
  monthTitleDecorOrbSmall: {
    position: 'absolute',
    right: 42,
    top: 34,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2D7D5F24',
  },
  monthMatrixTitleWrap: {
    width: '100%',
    gap: 2,
  },
  monthMatrixKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#5E786B',
  },
  monthMatrixTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#153C2A',
    letterSpacing: 0.2,
  },
  monthMatrixSubTitleRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  monthMatrixSubTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4E6A5E',
    flexShrink: 1,
  },
  monthHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
  },
  monthHeaderUnifiedControl: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BCD1C5',
    backgroundColor: '#F7FBF8',
    overflow: 'hidden',
  },
  monthHeaderUnifiedIconBtn: {
    width: 40,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FBF8',
  },
  monthHeaderUnifiedLeft: {
    borderRightWidth: 1,
    borderRightColor: '#BCD1C5',
  },
  monthHeaderUnifiedRight: {
    borderLeftWidth: 1,
    borderLeftColor: '#BCD1C5',
  },
  monthHeaderUnifiedCenterBtn: {
    minHeight: 38,
    flex: 1,
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: '#BCD1C5',
    borderRightColor: '#BCD1C5',
    backgroundColor: '#2D7D5F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  monthHeaderActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#176E4E',
  },
  monthHeaderActionTextPrimary: {
    color: '#FFFFFF',
  },
  monthHeaderIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#BCD1C5',
    backgroundColor: '#F7FBF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthMatrixHeadRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#D6E3DB',
    backgroundColor: '#F3F8F5',
  },
  monthMatrixHeadCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  monthMatrixHeadText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B8176',
    letterSpacing: 0.4,
  },
  monthMatrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthMatrixCell: {
    width: `${100 / 7}%`,
    minHeight: 92,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#D6E3DB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 6,
    justifyContent: 'space-between',
  },
  monthMatrixCellOut: {
    opacity: 0.7,
    backgroundColor: '#F4F7F5',
  },
  monthMatrixCellFriday: {
    borderColor: '#E3BD62',
    backgroundColor: '#FFF9EC',
  },
  monthMatrixCellToday: {
    borderColor: '#2E6CB9',
    backgroundColor: '#E9F1FF',
  },
  monthMatrixCellDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  monthMatrixCellDate: {
    fontSize: 18,
    fontWeight: '800',
    color: '#132D20',
    lineHeight: 22,
  },
  monthMatrixDateRightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  monthMatrixCellHijri: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B48318',
  },
  monthMatrixMetaWrap: {
    marginTop: 2,
    gap: 3,
  },
  monthMatrixTodayBadgeRow: {
    marginTop: 2,
    alignItems: 'flex-start',
  },
  monthMatrixTodayBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    backgroundColor: '#2E6CB9',
    alignItems: 'center',
    maxWidth: '100%',
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  monthMatrixTodayBadgeText: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
    color: '#F3F8FF',
    letterSpacing: 0,
    textTransform: 'none',
  },
  monthMatrixMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  monthMatrixIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthMatrixDotBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249,168,37,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(249,168,37,0.55)',
  },
  monthMatrixEventBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#247A58',
  },
  monthMatrixEventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  monthMatrixMetaText: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  monthMatrixLine: {
    fontSize: 7,
    fontWeight: '700',
    color: '#23422F',
    lineHeight: 10,
  },
  monthMatrixJumuahLine: {
    fontSize: 7,
    fontWeight: '800',
    color: '#A27300',
    lineHeight: 10,
    marginTop: 1,
  },
  monthPanelsWrap: {
    gap: 6,
    paddingBottom: 2,
  },
  monthDayBlock: {
    marginBottom: 4,
  },
  monthDayHeader: {
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: -2,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#EFF7F1',
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthDayHeaderToday: {
    borderColor: '#2E6CB9',
    backgroundColor: '#E9F3FF',
  },
  monthDayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  monthDayHijri: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  todayBadge: {
    borderRadius: Radius.full,
    backgroundColor: '#2E6CB9',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F3F8FF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  monthViewHint: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#D6E3DB',
    backgroundColor: '#F0F7F3',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  monthViewHintText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A7657',
  },
  dayModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.36)',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  dayModalCard: {
    maxHeight: '92%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  dayModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dayModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  dayModalSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  dayModalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  dayModalScroll: {
    backgroundColor: Colors.background,
  },
  interstitialWrap: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  syncLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  syncErrorLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#B42318',
  },
  pickerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.26)',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  pickerModalCard: {
    maxHeight: '92%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    paddingBottom: 8,
  },
  yearSection: {
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  yearHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  yearSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  yearSwitchBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  yearHijri: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSubtle,
    textAlign: 'center',
    maxWidth: '100%',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 5,
    marginBottom: 4,
  },
  monthButton: {
    minHeight: 64,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 10,
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
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  monthButtonTextSelected: {
    color: '#F3F8FF',
    fontWeight: '700',
  },
  monthButtonHijri: {
    marginTop: 2,
    fontSize: 9.5,
    fontWeight: '600',
    color: Colors.textSubtle,
    letterSpacing: 0,
    lineHeight: 11,
    textAlign: 'center',
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
  dayButtonHijriMonthStart: {
    borderColor: '#C59B2D',
    backgroundColor: '#FFF8E3',
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
  dayButtonDowHijriMonthStart: {
    color: '#A27300',
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
  dayButtonHijriMonthStartText: {
    color: '#A27300',
    fontWeight: '800',
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
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  prayerGuidance: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C0392B',
    marginTop: 2,
    lineHeight: 13,
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
  timePassed: {
    color: Colors.textSubtle,
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  timeCurrent: {
    color: '#133423',
  },
  timeNext: {
    color: '#173B61',
  },
  tomorrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accent + '30',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  tomorrowLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  tomorrowTime: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
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
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerButton: {
    marginBottom: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSubtle,
    lineHeight: 18,
  },
  entryList: {
    gap: 8,
  },
  entryItem: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  entryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  entryMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  entryNotes: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textPrimary,
    lineHeight: 16,
  },
  subtleHint: {
    marginBottom: 6,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  entryLinkButton: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  entryLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D7D5F',
  },
});
