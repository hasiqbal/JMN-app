'use no memo';

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FlexWidget,
  ImageWidget,
  TextWidget,
  type WidgetInfo,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';

type ColorValue = NonNullable<React.ComponentProps<typeof TextWidget>['style']>['color'];
import { lookupTimetable } from '@/services/timetableData';

export const HOME_PRAYER_WIDGET_NAME = 'HomePrayerHeroWidget';
const HOME_PRAYER_WIDGET_STORAGE_KEY = 'jmn:widget:home-prayer-hero:v1';

const DISPLAY_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

type PrayerLike = {
  name: string;
  time: string;
  iqamah?: string;
  timeDate?: Date;
};

type PrayerDataLike = {
  date: string;
  hijriDate: string;
  prayers: PrayerLike[];
};

export type HomePrayerWidgetPayload = {
  dateLine: string;
  hijriLine: string;
  nextPrayerLine: string;
  nextPrayerName: string;
  nextPrayerTime: string;
  prayers: Array<{ name: string; time: string; iqamah: string }>;
  tomorrowPrayers?: Array<{ name: string; time: string; iqamah: string }>;
  updatedAtIso: string;
};

type Row = { name: string; time: string; iqamah: string };

function rowsFromTimetable(date: Date): Row[] | null {
  const row = lookupTimetable(date);
  if (!row) return null;
  return [
    { name: 'Fajr', time: row.fajr, iqamah: row.iqFajr },
    { name: 'Dhuhr', time: row.dhuhr, iqamah: row.iqDhuhr },
    { name: 'Asr', time: row.asr, iqamah: row.iqAsr },
    { name: 'Maghrib', time: row.maghrib, iqamah: row.iqMaghrib },
    { name: 'Isha', time: row.isha, iqamah: row.iqIsha },
  ];
}

function tomorrowRows(now: Date): Row[] {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return rowsFromTimetable(t) ?? DISPLAY_ORDER.map((name) => ({ name, time: '--:--', iqamah: '--:--' }));
}

function toMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function resolveCurrentAndNext(rows: Row[], tomorrow: Row[], now: Date) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let currentIdx = -1;
  rows.forEach((r, i) => {
    const m = toMinutes(r.time);
    if (m !== null && m <= nowMin) currentIdx = i;
  });
  const nextToday = rows.findIndex((r) => {
    const m = toMinutes(r.time);
    return m !== null && m > nowMin;
  });
  const next = nextToday >= 0 ? rows[nextToday] : tomorrow[0];
  return {
    current: currentIdx >= 0 ? rows[currentIdx] : null,
    next,
    nextIsTomorrow: nextToday < 0,
  };
}

function nextPrayerLineFrom(prayers: PrayerLike[], now: Date): string {
  const next = prayers
    .filter((p) => p.timeDate instanceof Date)
    .find((p) => (p.timeDate as Date).getTime() >= now.getTime());

  if (!next) {
    return 'tomorrow';
  }

  return `${next.name} ${next.time}`;
}

function fallbackPayload(now: Date): HomePrayerWidgetPayload {
  const row = lookupTimetable(now);

  if (!row) {
    return {
      dateLine: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      hijriLine: 'Hijri date unavailable',
      nextPrayerLine: '--',
      nextPrayerName: '--',
      nextPrayerTime: '--:--',
      prayers: DISPLAY_ORDER.map((name) => ({ name, time: '--:--', iqamah: '--:--' })),
      tomorrowPrayers: tomorrowRows(now),
      updatedAtIso: now.toISOString(),
    };
  }

  const prayers = [
    { name: 'Fajr', time: row.fajr, iqamah: row.iqFajr },
    { name: 'Dhuhr', time: row.dhuhr, iqamah: row.iqDhuhr },
    { name: 'Asr', time: row.asr, iqamah: row.iqAsr },
    { name: 'Maghrib', time: row.maghrib, iqamah: row.iqMaghrib },
    { name: 'Isha', time: row.isha, iqamah: row.iqIsha },
  ];

  return {
    dateLine: now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    hijriLine: row.hijri,
    nextPrayerLine: `${prayers[0].name} ${prayers[0].time}`,
    nextPrayerName: prayers[0].name,
    nextPrayerTime: prayers[0].time,
    prayers,
    tomorrowPrayers: tomorrowRows(now),
    updatedAtIso: now.toISOString(),
  };
}

export function buildHomePrayerWidgetPayload(data: PrayerDataLike | null | undefined, now = new Date()): HomePrayerWidgetPayload {
  if (!data || !Array.isArray(data.prayers) || data.prayers.length === 0) {
    return fallbackPayload(now);
  }

  const filtered = DISPLAY_ORDER
    .map((name) => data.prayers.find((p) => p.name === name))
    .filter((p): p is PrayerLike => !!p)
    .map((p) => ({
      name: p.name,
      time: p.time || '--:--',
      iqamah: p.iqamah && p.iqamah !== '-' ? p.iqamah : '--:--',
      timeDate: p.timeDate,
    }));

  const nextPrayerLine = nextPrayerLineFrom(data.prayers, now);
  const parts = nextPrayerLine.split(' ');
  const nextPrayerName = parts[0] || '--';
  const nextPrayerTime = parts[1] || '--:--';

  return {
    dateLine: data.date || now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    hijriLine: data.hijriDate || 'Hijri date unavailable',
    nextPrayerLine,
    nextPrayerName,
    nextPrayerTime,
    prayers: filtered,
    tomorrowPrayers: tomorrowRows(now),
    updatedAtIso: now.toISOString(),
  };
}

export async function persistHomePrayerWidgetPayload(payload: HomePrayerWidgetPayload): Promise<void> {
  await AsyncStorage.setItem(HOME_PRAYER_WIDGET_STORAGE_KEY, JSON.stringify(payload));
}

export async function loadHomePrayerWidgetPayload(): Promise<HomePrayerWidgetPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(HOME_PRAYER_WIDGET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomePrayerWidgetPayload;
    if (!parsed || !Array.isArray(parsed.prayers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

const COLORS: Record<string, ColorValue> = {
  bg: '#FFFFFF',
  card: '#F3F8F5',
  border: '#E3ECE7',
  accent: '#0F8A5F',
  accentSoft: '#DDF3E8',
  accentText: '#FFFFFF',
  amber: '#B7791F',
  amberSoft: '#FFF4D9',
  textPrimary: '#12261D',
  textSecondary: '#4F6A5D',
  textMuted: '#8AA096',
};

export function HomeHeroPrayerWidget({ payload, widgetInfo }: { payload: HomePrayerWidgetPayload; widgetInfo?: WidgetInfo }) {
  const now = new Date();
  const sameDay = new Date(payload.updatedAtIso).toDateString() === now.toDateString();
  const today: Row[] = (sameDay ? payload.prayers : rowsFromTimetable(now)) ?? payload.prayers;
  const tomorrow: Row[] = (sameDay ? payload.tomorrowPrayers : null) ?? tomorrowRows(now);
  const ordered = DISPLAY_ORDER
    .map((name) => today.find((p) => p.name === name))
    .filter((p): p is Row => !!p);
  const { current, next, nextIsTomorrow } = resolveCurrentAndNext(ordered, tomorrow, now);

  const widgetHeight = widgetInfo?.height ?? 240;
  const widgetWidth = widgetInfo?.width ?? 320;
  const compact = widgetHeight < 230 || widgetWidth < 280;
  const fs = compact ? 10 : 11;
  const pad = compact ? 10 : 14;

  const cell = (text: string, flex: number, opts: { color?: ColorValue; bold?: boolean; align?: 'flex-start' | 'center' } = {}) => (
    <FlexWidget style={{ flex, alignItems: opts.align ?? 'center' }}>
      <TextWidget
        text={text}
        style={{ color: opts.color ?? COLORS.textPrimary, fontSize: fs, fontWeight: opts.bold ? '700' : '500' }}
      />
    </FlexWidget>
  );

  const statusCard = (label: string, row: Row | null, tint: ColorValue, bg: ColorValue, suffix?: string) => (
    <FlexWidget
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: compact ? 6 : 8,
      }}
    >
      <TextWidget text={label} style={{ color: tint, fontSize: 9, fontWeight: '800' }} />
      <TextWidget
        text={row ? `${row.name}${suffix ?? ''}` : '—'}
        style={{ color: COLORS.textPrimary, fontSize: compact ? 15 : 18, fontWeight: '800' }}
      />
      <TextWidget
        text={row ? `Starts ${row.time}  ·  Jamaat ${row.iqamah}` : ''}
        style={{ color: COLORS.textSecondary, fontSize: 9, fontWeight: '600' }}
      />
    </FlexWidget>
  );

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="JMN prayer times widget"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 28,
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: pad,
        paddingVertical: pad,
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ImageWidget
            image={require('@/assets/images/masjid-logo.png')}
            imageWidth={22}
            imageHeight={22}
            style={{ width: 22, height: 22, marginRight: 6 }}
          />
          <TextWidget text="Jami' Masjid Noorani" style={{ color: COLORS.textPrimary, fontSize: 12, fontWeight: '800' }} />
        </FlexWidget>
        <TextWidget text={payload.dateLine} style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: '600' }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', marginTop: compact ? 6 : 8 }}>
        {statusCard('NOW', current, COLORS.accent, COLORS.accentSoft)}
        <FlexWidget style={{ width: 8 }} />
        {statusCard('NEXT', next, COLORS.amber, COLORS.amberSoft, nextIsTomorrow ? ' (tmrw)' : '')}
      </FlexWidget>

      <FlexWidget
        style={{
          marginTop: compact ? 6 : 8,
          backgroundColor: COLORS.card,
          borderRadius: 16,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', marginBottom: 2 }}>
          {cell('', 2)}
          <FlexWidget style={{ flex: 4, alignItems: 'center' }}>
            <TextWidget text="TODAY" style={{ color: COLORS.accent, fontSize: 9, fontWeight: '800' }} />
          </FlexWidget>
          <FlexWidget style={{ flex: 4, alignItems: 'center' }}>
            <TextWidget text="TOMORROW" style={{ color: COLORS.amber, fontSize: 9, fontWeight: '800' }} />
          </FlexWidget>
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'row', marginBottom: 2 }}>
          {cell('', 2)}
          {cell('Start', 2, { color: COLORS.textMuted })}
          {cell('Jamaat', 2, { color: COLORS.textMuted })}
          {cell('Start', 2, { color: COLORS.textMuted })}
          {cell('Jamaat', 2, { color: COLORS.textMuted })}
        </FlexWidget>
        {ordered.map((row) => {
          const isNow = current?.name === row.name;
          const isNext = !nextIsTomorrow && next.name === row.name;
          const tm = tomorrow.find((p) => p.name === row.name);
          const hl = isNow ? COLORS.accent : isNext ? COLORS.amber : COLORS.textPrimary;
          return (
            <FlexWidget key={row.name} style={{ flexDirection: 'row', paddingVertical: compact ? 1 : 2 }}>
              {cell(row.name, 2, { color: hl, bold: true, align: 'flex-start' })}
              {cell(row.time, 2, { color: hl, bold: isNow || isNext })}
              {cell(row.iqamah, 2, { color: hl })}
              {cell(tm?.time ?? '--:--', 2, { color: COLORS.textSecondary })}
              {cell(tm?.iqamah ?? '--:--', 2, { color: COLORS.textSecondary })}
            </FlexWidget>
          );
        })}
      </FlexWidget>

      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'jmn:///?openDonation=1' }}
        accessibilityLabel="Open donation panel"
        style={{
          marginTop: compact ? 6 : 8,
          backgroundColor: COLORS.accent,
          borderRadius: 999,
          paddingVertical: compact ? 6 : 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget text="♥  Donate to the masjid" style={{ color: COLORS.accentText, fontSize: 12, fontWeight: '700' }} />
      </FlexWidget>
    </FlexWidget>
  );
}

export async function renderHomePrayerWidgetFromStorage(props: WidgetTaskHandlerProps): Promise<void> {
  const stored = await loadHomePrayerWidgetPayload();
  const payload = stored ?? fallbackPayload(new Date());
  props.renderWidget(<HomeHeroPrayerWidget payload={payload} widgetInfo={props.widgetInfo} />);
}


