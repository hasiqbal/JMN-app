'use no memo';

import React from 'react';
import type { ColorValue } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FlexWidget,
  ImageWidget,
  TextWidget,
  type WidgetInfo,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';
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
  updatedAtIso: string;
};

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

export function HomeHeroPrayerWidget({ payload, widgetInfo }: { payload: HomePrayerWidgetPayload; widgetInfo?: WidgetInfo }) {
  // Palette — refined dark forest green + warm gold accent.
  const COLORS: Record<string, ColorValue> = {
    bg: '#0A2C22',
    surface: '#103A2D',
    surfaceSoft: '#0E3528',
    border: '#1F5440',
    pill: '#13402F',
    pillBorder: '#1F5440',
    pillActive: '#E3C989',
    pillActiveBorder: '#F5D98F',
    pillActiveText: '#0A2C22',
    gold: '#E3C989',
    goldSoft: '#F5DEA0',
    textPrimary: '#FFFFFF',
    textSecondary: '#BFE0CF',
    textMuted: '#7FB29A',
    eyebrow: '#9CC9B2',
  };

  const widgetHeight = widgetInfo?.height ?? 220;
  const widgetWidth = widgetInfo?.width ?? 320;
  const dense = widgetHeight < 200;
  const veryCompact = widgetHeight < 170 || widgetWidth < 280;

  const padX = veryCompact ? 12 : dense ? 14 : 16;
  const padY = veryCompact ? 10 : dense ? 12 : 14;

  const orderedPrayers = DISPLAY_ORDER
    .map((name) => payload.prayers.find((p) => p.name === name))
    .filter((p): p is { name: string; time: string; iqamah: string } => !!p);

  const renderPill = (row: { name: string; time: string }, index: number) => {
    const active = row.name === payload.nextPrayerName;
    return (
      <FlexWidget
        key={row.name}
        style={{
          flex: 1,
          marginLeft: index === 0 ? 0 : veryCompact ? 4 : 6,
          backgroundColor: active ? COLORS.pillActive : COLORS.pill,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: active ? COLORS.pillActiveBorder : COLORS.pillBorder,
          paddingHorizontal: veryCompact ? 6 : 8,
          paddingVertical: veryCompact ? 6 : 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TextWidget
          text={row.name.toUpperCase()}
          style={{
            color: active ? COLORS.pillActiveText : COLORS.textMuted,
            fontSize: veryCompact ? 8 : 9,
            fontWeight: '700',
          }}
        />
        <TextWidget
          text={row.time}
          style={{
            color: active ? COLORS.pillActiveText : COLORS.textPrimary,
            fontSize: veryCompact ? 11 : 13,
            fontWeight: '800',
            marginTop: 2,
          }}
        />
      </FlexWidget>
    );
  };

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="JMN today prayer times widget"
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 28,
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: padX,
        paddingVertical: padY,
        justifyContent: 'space-between',
      }}
    >
      {/* Top row — brand + date */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <FlexWidget
            style={{
              width: veryCompact ? 22 : 28,
              height: veryCompact ? 22 : 28,
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#DDE8E2',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <ImageWidget
              image={require('@/assets/images/masjid-logo.png')}
              imageWidth={veryCompact ? 16 : 20}
              imageHeight={veryCompact ? 16 : 20}
              style={{
                width: veryCompact ? 16 : 20,
                height: veryCompact ? 16 : 20,
              }}
            />
          </FlexWidget>
          <FlexWidget>
            <TextWidget
              text="Jami' Masjid Noorani"
              style={{
                color: COLORS.textPrimary,
                fontSize: veryCompact ? 11 : 12,
                fontWeight: '700',
              }}
            />
            {!veryCompact ? (
              <TextWidget
                text={payload.hijriLine}
                style={{
                  color: COLORS.eyebrow,
                  fontSize: 9,
                  fontWeight: '600',
                  marginTop: 1,
                }}
              />
            ) : null}
          </FlexWidget>
        </FlexWidget>

        <TextWidget
          text={payload.dateLine}
          style={{
            color: COLORS.textMuted,
            fontSize: veryCompact ? 9 : 10,
            fontWeight: '600',
          }}
        />
      </FlexWidget>

      {/* Hero — Next prayer focus */}
      <FlexWidget
        style={{
          marginTop: veryCompact ? 8 : 12,
          marginBottom: veryCompact ? 8 : 12,
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <FlexWidget
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: COLORS.gold,
              marginRight: 6,
            }}
          />
          <TextWidget
            text="NEXT PRAYER"
            style={{
              color: COLORS.gold,
              fontSize: veryCompact ? 8 : 9,
              fontWeight: '800',
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <TextWidget
            text={payload.nextPrayerName}
            style={{
              color: COLORS.textPrimary,
              fontSize: veryCompact ? 22 : dense ? 26 : 30,
              fontWeight: '800',
            }}
          />
          <TextWidget
            text={payload.nextPrayerTime}
            style={{
              color: COLORS.goldSoft,
              fontSize: veryCompact ? 22 : dense ? 26 : 30,
              fontWeight: '800',
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Pill strip — all 5 prayers */}
      <FlexWidget style={{ flexDirection: 'row' }}>
        {orderedPrayers.map((row, index) => renderPill(row, index))}
      </FlexWidget>

      {/* Donate CTA */}
      {!veryCompact ? (
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'jmn:///?openDonation=1' }}
          accessibilityLabel="Open donation panel"
          style={{
            marginTop: dense ? 10 : 12,
            backgroundColor: COLORS.surface,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: COLORS.gold,
            paddingHorizontal: 14,
            paddingVertical: dense ? 7 : 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TextWidget
            text="Donate to the masjid"
            style={{
              color: COLORS.gold,
              fontSize: dense ? 11 : 12,
              fontWeight: '700',
            }}
          />
        </FlexWidget>
      ) : null}
    </FlexWidget>
  );
}

export async function renderHomePrayerWidgetFromStorage(props: WidgetTaskHandlerProps): Promise<void> {
  const stored = await loadHomePrayerWidgetPayload();
  const payload = stored ?? fallbackPayload(new Date());
  props.renderWidget(<HomeHeroPrayerWidget payload={payload} widgetInfo={props.widgetInfo} />);
}
