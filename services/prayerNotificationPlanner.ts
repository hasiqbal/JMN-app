import {
  PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES,
  PRAYER_NOTIFICATION_MIN_LEAD_MS,
  PRAYER_NOTIFICATION_NEAR_END_MINUTES,
  PRAYER_NOTIFICATION_ROUTE,
  PRAYER_NOTIFICATION_SCOPE,
} from '@/constants/prayerNotifications';
import { getJumuahInfo, type PrayerTime } from '@/services/prayerService';

const IQAMAH_ROLLOVER_TOLERANCE_MS = 5 * 60 * 1000;
const FARD_PRAYER_NAMES = new Set(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);

export type PrayerNotificationType =
  | 'prayer-start'
  | 'prayer-near-end'
  | 'jamaat-10'
  | 'jamaat-start'
  | 'iqamah-start';

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
  const sunriseRow = prayers.find((row) => row.name === 'Sunrise') ?? null;

  const planned: PlannedPrayerNotification[] = [];

  for (let index = 0; index < fardRows.length; index += 1) {
    const prayer = fardRows[index];
    const nextPrayer = fardRows[index + 1] ?? null;
    const isFridayDhuhr = prayer.name === 'Dhuhr' && prayer.timeDate.getDay() === 5;

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

    if (isFridayDhuhr) {
      const jumuahInfo = getJumuahInfo(prayerStartAt);
      const jamaats = jumuahInfo
        ? [
            { label: '1st Jumuah', time: jumuahInfo.jamaat1Date },
            { label: '2nd Jumuah', time: jumuahInfo.jamaat2Date },
          ]
        : [];

      for (const jamaat of jamaats) {
        if (jamaat.time.getTime() <= prayerStartAt.getTime()) continue;

        const jamaatReminderAt = new Date(jamaat.time.getTime() - PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES * 60 * 1000);
        const isAfterPrayerStart = jamaatReminderAt.getTime() > prayerStartAt.getTime();

        if (isAfterPrayerStart && jamaatReminderAt.getTime() - now.getTime() > minLeadMs) {
          planned.push({
            title: `${jamaat.label} in ${PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES} minutes`,
            body: `${jamaat.label} starts in ${PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES} minutes.`,
            fireAt: jamaatReminderAt,
            data: {
              scope: PRAYER_NOTIFICATION_SCOPE,
              type: 'jamaat-10',
              prayerName: prayer.name,
              route: PRAYER_NOTIFICATION_ROUTE,
            },
          });
        }

        // Vibration-only buzz at the exact jamaat time (no audio).
        if (jamaat.time.getTime() - now.getTime() > minLeadMs) {
          planned.push({
            title: `${jamaat.label} starting`,
            body: `${jamaat.label} is starting now.`,
            fireAt: jamaat.time,
            data: {
              scope: PRAYER_NOTIFICATION_SCOPE,
              type: 'jamaat-start',
              prayerName: prayer.name,
              route: PRAYER_NOTIFICATION_ROUTE,
            },
          });
        }
      }
    } else {
      const iqamahDate = parseIqamahDate(prayer.iqamah, prayerStartAt);
      if (iqamahDate && iqamahDate.getTime() > prayerStartAt.getTime()) {
        const jamaatReminderAt = new Date(iqamahDate.getTime() - PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES * 60 * 1000);
        const isAfterPrayerStart = jamaatReminderAt.getTime() > prayerStartAt.getTime();

        if (isAfterPrayerStart && jamaatReminderAt.getTime() - now.getTime() > minLeadMs) {
          planned.push({
            title: `${prayer.name} jamaat in ${PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES} minutes`,
            body: `${prayer.name} jamaat starts in ${PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES} minutes.`,
            fireAt: jamaatReminderAt,
            data: {
              scope: PRAYER_NOTIFICATION_SCOPE,
              type: 'jamaat-10',
              prayerName: prayer.name,
              route: PRAYER_NOTIFICATION_ROUTE,
            },
          });
        }

        // Vibration-only buzz at the exact jamaat time (no audio).
        if (iqamahDate.getTime() - now.getTime() > minLeadMs) {
          planned.push({
            title: `${prayer.name} jamaat starting`,
            body: `${prayer.name} jamaat is starting now.`,
            fireAt: iqamahDate,
            data: {
              scope: PRAYER_NOTIFICATION_SCOPE,
              type: 'jamaat-start',
              prayerName: prayer.name,
              route: PRAYER_NOTIFICATION_ROUTE,
            },
          });
        }
      }
    }

    const nearEndBoundary = prayer.name === 'Fajr'
      ? (sunriseRow?.timeDate ?? nextPrayer?.timeDate ?? null)
      : (nextPrayer?.timeDate ?? null);

    if (nearEndBoundary) {
      const nearEndAt = new Date(nearEndBoundary.getTime() - PRAYER_NOTIFICATION_NEAR_END_MINUTES * 60 * 1000);
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
