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
import { getCurrentPrayerPeriod } from '@/services/currentPrayerPeriod';
import { getPrayerTimesFromTimetable } from '@/services/prayerService';
import { getDateKey, lookupTimetable } from '@/services/timetableData';
import { getPrayerTimesLastSyncAt, loadCachedPrayerTimes, syncPrayerTimes } from '@/services/prayerTimesSync';

type ColorValue = NonNullable<React.ComponentProps<typeof TextWidget>['style']>['color'];

export const HOME_PRAYER_WIDGET_NAME = 'HomePrayerHeroWidget';
const HOME_PRAYER_WIDGET_STORAGE_KEY = 'jmn:widget:home-prayer-hero:v1';
const HOME_PRAYER_WIDGET_REFRESH_KEY = 'jmn:widget:prayer-times-refresh-at:v1';
const HOME_PRAYER_WIDGET_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

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
  dateKey: string;
  dateLine: string;
  hijriLine: string;
  sunriseTime: string;
  nextPrayerLine: string;
  nextPrayerName: string;
  nextPrayerTime: string;
  prayers: { name: string; time: string; iqamah: string }[];
  tomorrowPrayers?: { name: string; time: string; iqamah: string }[];
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

function dateLineFor(date: Date): string {
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function localTimeDate(time: string, date: Date): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function toMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function resolveCurrentAndNext(rows: Row[], tomorrow: Row[], now: Date, sunriseTime: string) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const prayerTimeline = rows
    .map((row) => {
      const timeDate = localTimeDate(row.time, now);
      return timeDate ? { ...row, timeDate } : null;
    })
    .filter((row): row is Row & { timeDate: Date } => row !== null);
  const sunriseDate = localTimeDate(sunriseTime, now);
  if (sunriseDate) prayerTimeline.push({ name: 'Sunrise', time: sunriseTime, iqamah: '--:--', timeDate: sunriseDate });
  const currentPrayer = getCurrentPrayerPeriod(prayerTimeline, now);

  const nextToday = rows.findIndex((r) => {
    const m = toMinutes(r.time);
    return m !== null && m > nowMin;
  });
  const next = nextToday >= 0 ? rows[nextToday] : tomorrow[0];
  return {
    current: currentPrayer ? rows.find((row) => row.name === currentPrayer.name) ?? null : null,
    next,
    nextIsTomorrow: nextToday < 0,
    hasPrayerTimes: rows.some((row) => toMinutes(row.time) !== null),
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
      dateKey: getDateKey(now),
      dateLine: dateLineFor(now),
      hijriLine: 'Hijri date unavailable',
      sunriseTime: '--:--',
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
    dateKey: getDateKey(now),
    dateLine: dateLineFor(now),
    hijriLine: row.hijri,
    sunriseTime: row.sunrise,
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
    dateKey: getDateKey(now),
    dateLine: dateLineFor(now),
    hijriLine: data.hijriDate || 'Hijri date unavailable',
    sunriseTime: data.prayers.find((prayer) => prayer.name === 'Sunrise')?.time ?? lookupTimetable(now)?.sunrise ?? '--:--',
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

async function refreshTimetableIfNeeded(now: Date): Promise<boolean> {
  const lastSyncAt = await getPrayerTimesLastSyncAt();
  const sinceLastSync = now.getTime() - lastSyncAt;
  if (sinceLastSync >= 0 && sinceLastSync < HOME_PRAYER_WIDGET_REFRESH_INTERVAL_MS) {
    return false;
  }

  const lastAttempt = Number(await AsyncStorage.getItem(HOME_PRAYER_WIDGET_REFRESH_KEY).catch(() => null));
  const sinceLastAttempt = now.getTime() - lastAttempt;
  if (Number.isFinite(lastAttempt) && lastAttempt > 0 && sinceLastAttempt >= 0
    && sinceLastAttempt < HOME_PRAYER_WIDGET_REFRESH_INTERVAL_MS) {
    return false;
  }

  await AsyncStorage.setItem(HOME_PRAYER_WIDGET_REFRESH_KEY, String(now.getTime()));
  try {
    return await syncPrayerTimes(true);
  } catch (error) {
    console.warn('[Widget] Prayer timetable refresh failed:', error);
    return false;
  }
}

function payloadForCurrentDate(
  payload: HomePrayerWidgetPayload | null,
  now: Date,
  timetableWasRefreshed: boolean,
): HomePrayerWidgetPayload {
  const localData = getPrayerTimesFromTimetable(now);
  if (timetableWasRefreshed && localData) {
    return buildHomePrayerWidgetPayload(localData, now);
  }

  const todayKey = getDateKey(now);
  const payloadDateKey = payload?.dateKey
    ?? (payload && new Date(payload.updatedAtIso).toDateString() === now.toDateString() ? todayKey : '');

  if (payload && payloadDateKey === todayKey) {
    return {
      ...payload,
      dateKey: todayKey,
      dateLine: dateLineFor(now),
      sunriseTime: payload.sunriseTime || lookupTimetable(now)?.sunrise || '--:--',
      tomorrowPrayers: tomorrowRows(now),
    };
  }

  return buildHomePrayerWidgetPayload(localData, now);
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
  const sameDay = payload.dateKey
    ? payload.dateKey === getDateKey(now)
    : new Date(payload.updatedAtIso).toDateString() === now.toDateString();
  const today: Row[] = (sameDay ? payload.prayers : rowsFromTimetable(now)) ?? [];
  const tomorrow: Row[] = (sameDay ? payload.tomorrowPrayers : null) ?? tomorrowRows(now);
  const ordered = DISPLAY_ORDER
    .map((name) => today.find((p) => p.name === name))
    .filter((p): p is Row => !!p);
  const sunriseTime = sameDay ? payload.sunriseTime : lookupTimetable(now)?.sunrise ?? '--:--';
  const { current, next, nextIsTomorrow, hasPrayerTimes } = resolveCurrentAndNext(ordered, tomorrow, now, sunriseTime);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const fajrMinutes = toMinutes(ordered.find((row) => row.name === 'Fajr')?.time ?? '') ?? -1;
  const isBeforeFajr = current?.name === 'Isha' && fajrMinutes > nowMinutes;
  const hijriLine = sameDay ? payload.hijriLine : lookupTimetable(now)?.hijri ?? 'Hijri date unavailable';

  const widgetHeight = widgetInfo?.height ?? 240;
  const widgetWidth = widgetInfo?.width ?? 320;
  const compact = widgetHeight < 260 || widgetWidth < 320;
  const pad = compact ? 8 : 12;
  const showDonation = widgetHeight >= 280;

  const cell = (text: string, flex: number, opts: { color?: ColorValue; bold?: boolean; align?: 'flex-start' | 'center' } = {}) => (
    <FlexWidget style={{ flex, width: 0, alignItems: opts.align ?? 'center', justifyContent: 'center' }}>
      <TextWidget
        text={text}
        maxLines={1}
        style={{
          color: opts.color ?? COLORS.textPrimary,
          fontSize: compact ? 8 : 9,
          fontWeight: opts.bold ? '700' : '500',
          textAlign: opts.align === 'flex-start' ? 'left' : 'center',
          adjustsFontSizeToFit: true,
        }}
      />
    </FlexWidget>
  );

  const statusCard = (
    label: string,
    row: Row | null,
    tint: ColorValue,
    bg: ColorValue,
    suffix = '',
    emptyLabel = '—',
    detail = row ? `Begins ${row.time}\nJamaat ${row.iqamah}` : '',
  ) => (
    <FlexWidget
      style={{
        flex: 1,
        width: 0,
        backgroundColor: bg,
        borderRadius: 16,
        paddingHorizontal: compact ? 7 : 10,
        paddingVertical: compact ? 5 : 7,
      }}
    >
      <TextWidget text={label} maxLines={1} style={{ color: tint, fontSize: 8, fontWeight: '800' }} />
      <TextWidget
        text={row ? `${row.name}${suffix}` : emptyLabel}
        maxLines={2}
        style={{ color: COLORS.textPrimary, fontSize: compact ? 13 : 16, fontWeight: '800', adjustsFontSizeToFit: true }}
      />
      {detail ? (
        <TextWidget
          text={detail}
          maxLines={2}
          style={{ color: COLORS.textSecondary, fontSize: compact ? 8 : 9, fontWeight: '600', adjustsFontSizeToFit: true }}
        />
      ) : null}
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
        justifyContent: 'flex-start',
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: compact ? 'column' : 'row', alignItems: 'center' }}>
        <FlexWidget
          style={{
            width: compact ? 'match_parent' : 0,
            flex: compact ? undefined : 3,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <ImageWidget
            image={require('@/assets/images/masjid-logo.png')}
            imageWidth={20}
            imageHeight={20}
            style={{ width: 20, height: 20, marginRight: 5 }}
          />
          <FlexWidget style={{ flex: 1, width: 0 }}>
            <TextWidget
              text="Jami' Masjid Noorani"
              maxLines={1}
              truncate="END"
              style={{ color: COLORS.textPrimary, fontSize: 12, fontWeight: '800', adjustsFontSizeToFit: true }}
            />
          </FlexWidget>
        </FlexWidget>
        <FlexWidget
          style={{
            width: compact ? 'match_parent' : 0,
            flex: compact ? undefined : 2,
            alignItems: 'flex-end',
            marginTop: compact ? 2 : 0,
          }}
        >
          <TextWidget
            text={dateLineFor(now)}
            maxLines={1}
            style={{ color: COLORS.textMuted, fontSize: 9, fontWeight: '700', textAlign: 'right', adjustsFontSizeToFit: true }}
          />
          <TextWidget
            text={hijriLine}
            maxLines={1}
            truncate="END"
            style={{ color: COLORS.textMuted, fontSize: 8, fontWeight: '500', textAlign: 'right', adjustsFontSizeToFit: true }}
          />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', marginTop: compact ? 5 : 7 }}>
        {statusCard('NOW', current, COLORS.accent, COLORS.accentSoft, '', hasPrayerTimes ? 'Between prayers' : '—', isBeforeFajr ? 'Before Fajr' : undefined)}
        <FlexWidget style={{ width: 6 }} />
        {statusCard('NEXT', next, COLORS.amber, COLORS.amberSoft, nextIsTomorrow ? ' (tmrw)' : '')}
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          marginTop: compact ? 6 : 8,
          backgroundColor: COLORS.card,
          borderRadius: 16,
          paddingHorizontal: compact ? 6 : 8,
          paddingVertical: compact ? 4 : 6,
        }}
      >
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', marginBottom: 1 }}>
          {cell('', 2)}
          <FlexWidget style={{ flex: 2, width: 0, alignItems: 'center' }}>
            <TextWidget text="TODAY" maxLines={1} style={{ color: COLORS.accent, fontSize: 8, fontWeight: '800' }} />
          </FlexWidget>
          <FlexWidget style={{ width: 1, height: 'match_parent', backgroundColor: COLORS.border }} />
          <FlexWidget style={{ flex: 2, width: 0, alignItems: 'center' }}>
            <TextWidget text="TOMORROW" maxLines={1} style={{ color: COLORS.amber, fontSize: 8, fontWeight: '800', adjustsFontSizeToFit: true }} />
          </FlexWidget>
        </FlexWidget>
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', marginBottom: 1 }}>
          {cell('', 2)}
          <FlexWidget style={{ flex: 2, width: 0, flexDirection: 'row' }}>
            {cell('Begins', 1, { color: COLORS.textMuted })}
            {cell('Jamaat', 1, { color: COLORS.textMuted })}
          </FlexWidget>
          <FlexWidget style={{ width: 1, height: 'match_parent', backgroundColor: COLORS.border }} />
          <FlexWidget style={{ flex: 2, width: 0, flexDirection: 'row' }}>
            {cell('Begins', 1, { color: COLORS.textMuted })}
            {cell('Jamaat', 1, { color: COLORS.textMuted })}
          </FlexWidget>
        </FlexWidget>
        {ordered.map((row) => {
          const isNow = current?.name === row.name;
          const isNext = !nextIsTomorrow && next.name === row.name;
          const tm = tomorrow.find((p) => p.name === row.name);
          const hl = isNow ? COLORS.accent : isNext ? COLORS.amber : COLORS.textPrimary;
          return (
            <FlexWidget key={row.name} style={{ width: 'match_parent', flexDirection: 'row', paddingVertical: compact ? 0 : 1 }}>
              {cell(row.name, 2, { color: hl, bold: true, align: 'flex-start' })}
              <FlexWidget style={{ flex: 2, width: 0, flexDirection: 'row' }}>
                {cell(row.time, 1, { color: hl, bold: isNow || isNext })}
                {cell(row.iqamah, 1, { color: hl })}
              </FlexWidget>
              <FlexWidget style={{ width: 1, height: 'match_parent', backgroundColor: COLORS.border }} />
              <FlexWidget style={{ flex: 2, width: 0, flexDirection: 'row' }}>
                {cell(tm?.time ?? '--:--', 1, { color: COLORS.textSecondary })}
                {cell(tm?.iqamah ?? '--:--', 1, { color: COLORS.textSecondary })}
              </FlexWidget>
            </FlexWidget>
          );
        })}
      </FlexWidget>

      {showDonation ? (
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'jmn:///?openDonation=1' }}
          accessibilityLabel="Open donation panel"
          style={{
            width: 'match_parent',
            marginTop: 7,
            backgroundColor: COLORS.accent,
            borderRadius: 999,
            paddingVertical: 6,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget text="Donate to the masjid" maxLines={1} style={{ color: COLORS.accentText, fontSize: 10, fontWeight: '700' }} />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

export async function renderHomePrayerWidgetFromStorage(props: WidgetTaskHandlerProps): Promise<void> {
  const now = new Date();
  await loadCachedPrayerTimes();
  const timetableWasRefreshed = await refreshTimetableIfNeeded(now);
  const stored = await loadHomePrayerWidgetPayload();
  const payload = payloadForCurrentDate(stored, now, timetableWasRefreshed);
  if (timetableWasRefreshed || !stored || stored.dateKey !== payload.dateKey) {
    await persistHomePrayerWidgetPayload(payload).catch((error: unknown) => {
      console.warn('[Widget] Failed to save refreshed prayer widget data:', error);
    });
  }
  props.renderWidget(<HomeHeroPrayerWidget payload={payload} widgetInfo={props.widgetInfo} />);
}
