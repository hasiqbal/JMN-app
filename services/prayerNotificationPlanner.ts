import {
  PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES,
  PRAYER_NOTIFICATION_MIN_LEAD_MS,
  PRAYER_NOTIFICATION_NEAR_END_MINUTES,
  PRAYER_NOTIFICATION_ROUTE,
  PRAYER_NOTIFICATION_SCOPE,
} from '@/constants/prayerNotifications';
import type { PrayerTime } from '@/services/prayerService';

const IQAMAH_ROLLOVER_TOLERANCE_MS = 5 * 60 * 1000;
const IQAMAH_FALLBACK_OFFSET_MS = 5 * 1000;
const FARD_PRAYER_NAMES = new Set(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);

export type PrayerNotificationType = 'prayer-start' | 'prayer-near-end' | 'jamaat-10' | 'iqamah-start';

export type PlannedPrayerNotification = {
  title: string;
  body: string;
  fireAt: Date;
  data: {
    scope: string;
    type: PrayerNotificationType;
    prayerName: string;
    route: string;
  };
};

export function parseIqamahDate(iqamah: string | undefined, baseDate: Date): Date | null {
  const value = (iqamah ?? '').trim();
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;

  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const parsed = new Date(baseDate);
  parsed.setHours(hours, minutes, 0, 0);

  if (parsed.getTime() < baseDate.getTime() - IQAMAH_ROLLOVER_TOLERANCE_MS) {
    const plusTwelve = new Date(parsed.getTime() + 12 * 60 * 60 * 1000);
    if (plusTwelve.getTime() >= baseDate.getTime() - IQAMAH_ROLLOVER_TOLERANCE_MS) {
      return plusTwelve;
    }
  }

  return parsed;
}

export function buildPrayerNotificationsForPrayers(
  prayers: PrayerTime[],
  now: Date,
): PlannedPrayerNotification[] {
  const minLeadMs = PRAYER_NOTIFICATION_MIN_LEAD_MS;

  const fardRows = prayers
    .filter((row) => FARD_PRAYER_NAMES.has(row.name))
    .sort((left, right) => left.timeDate.getTime() - right.timeDate.getTime());

  const planned: PlannedPrayerNotification[] = [];

  for (let index = 0; index < fardRows.length; index += 1) {
    const prayer = fardRows[index];
    const nextPrayer = fardRows[index + 1] ?? null;

    const prayerStartAt = prayer.timeDate;
    if (prayerStartAt.getTime() - now.getTime() > minLeadMs) {
      planned.push({
        title: `${prayer.name} prayer time`,
        body: `${prayer.name} prayer time has begun.`,
        fireAt: prayerStartAt,
        data: {
          scope: PRAYER_NOTIFICATION_SCOPE,
          type: 'prayer-start',
          prayerName: prayer.name,
          route: PRAYER_NOTIFICATION_ROUTE,
        },
      });
    }

    const iqamahDate = parseIqamahDate(prayer.iqamah, prayerStartAt);
    const effectiveIqamahDate = iqamahDate ?? new Date(prayerStartAt.getTime() + IQAMAH_FALLBACK_OFFSET_MS);

    if (effectiveIqamahDate.getTime() - now.getTime() > minLeadMs) {
      planned.push({
        title: `${prayer.name} iqamah now`,
        body: `${prayer.name} iqamah has started.`,
        fireAt: effectiveIqamahDate,
        data: {
          scope: PRAYER_NOTIFICATION_SCOPE,
          type: 'iqamah-start',
          prayerName: prayer.name,
          route: PRAYER_NOTIFICATION_ROUTE,
        },
      });
    }

    if (iqamahDate) {
      const jamaatReminderAtRaw = new Date(iqamahDate.getTime() - PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES * 60 * 1000);
      const jamaatReminderAt = jamaatReminderAtRaw.getTime() < prayerStartAt.getTime()
        ? prayerStartAt
        : jamaatReminderAtRaw;
      if (jamaatReminderAt.getTime() - now.getTime() > minLeadMs) {
        const isExactTenMinuteLead = jamaatReminderAt.getTime() === jamaatReminderAtRaw.getTime();
        planned.push({
          title: isExactTenMinuteLead
            ? `${prayer.name} jamaat in ${PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES} minutes`
            : `${prayer.name} jamaat soon`,
          body: isExactTenMinuteLead
            ? `${prayer.name} jamaat starts in ${PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES} minutes.`
            : `${prayer.name} jamaat starts soon.`,
          fireAt: jamaatReminderAt,
          data: {
            scope: PRAYER_NOTIFICATION_SCOPE,
            type: 'jamaat-10',
            prayerName: prayer.name,
            route: PRAYER_NOTIFICATION_ROUTE,
          },
        });
      }
    }

    if (nextPrayer) {
      const nearEndAt = new Date(nextPrayer.timeDate.getTime() - PRAYER_NOTIFICATION_NEAR_END_MINUTES * 60 * 1000);
      if (nearEndAt.getTime() > prayerStartAt.getTime() && nearEndAt.getTime() - now.getTime() > minLeadMs) {
        planned.push({
          title: `${prayer.name} ending soon`,
          body: `${prayer.name} time is near its end (about ${PRAYER_NOTIFICATION_NEAR_END_MINUTES} minutes left).`,
          fireAt: nearEndAt,
          data: {
            scope: PRAYER_NOTIFICATION_SCOPE,
            type: 'prayer-near-end',
            prayerName: prayer.name,
            route: PRAYER_NOTIFICATION_ROUTE,
          },
        });
      }
    }
  }

  return planned;
}
