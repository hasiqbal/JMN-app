import type { PrayerTime } from '@/services/prayerService';
import {
  type NotificationTemplateCatalog,
  renderNotificationTemplate,
} from '@/services/notificationTemplateService';

export const PRAYER_NOTIFICATION_SCOPE = 'jmn-prayer';
export const PRAYER_NOTIFICATION_ROUTE = '/prayer';
export const JAMAAT_REMINDER_MINUTES = 10;

const NON_PRAYABLE_NAMES = new Set(['Sunrise', 'Ishraq', 'Zawaal']);
const IQAMAH_ROLLOVER_TOLERANCE_MS = 5 * 60 * 1000;
const DEFAULT_NOTIFICATION_MIN_LEAD_MS = 30 * 1000;
const DEFAULT_ANDROID_PRAYER_START_ADVANCE_MS = 60 * 1000;

export type PrayerNotificationType = 'prayer-start' | 'jamaat-10';

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

export type PrayerNotificationSkipReason =
  | 'non-prayer-row'
  | 'templates-unavailable'
  | 'iqamah-missing-or-invalid'
  | 'iqamah-not-after-prayer-start'
  | 'iqamah-reminder-before-prayer-start'
  | 'iqamah-reminder-not-in-future'
  | 'prayer-start-not-in-future';

export type PrayerNotificationBuildResult = {
  planned: PlannedPrayerNotification[];
  skipped: PrayerNotificationSkipReason[];
};

export type PrayerNotificationPlannerOptions = {
  isAndroid?: boolean;
  notificationMinLeadMs?: number;
  androidPrayerStartAdvanceMs?: number;
  jamaatReminderMinutes?: number;
  templates?: NotificationTemplateCatalog | null;
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

  // Some schedules store iqamah in 12-hour style while prayer start is 24-hour.
  // When the parsed iqamah looks far in the past, try rolling it forward by 12h.
  if (parsed.getTime() < baseDate.getTime() - IQAMAH_ROLLOVER_TOLERANCE_MS) {
    const plusTwelve = new Date(parsed.getTime() + 12 * 60 * 60 * 1000);
    if (plusTwelve.getTime() >= baseDate.getTime() - IQAMAH_ROLLOVER_TOLERANCE_MS) {
      return plusTwelve;
    }
  }

  return parsed;
}

export function buildPrayerNotifications(
  prayer: PrayerTime,
  now: Date,
  options?: PrayerNotificationPlannerOptions,
): PrayerNotificationBuildResult {
  if (NON_PRAYABLE_NAMES.has(prayer.name)) {
    return { planned: [], skipped: ['non-prayer-row'] };
  }

  const templates = options?.templates;
  if (!templates) {
    return { planned: [], skipped: ['templates-unavailable'] };
  }

  const notificationMinLeadMs = options?.notificationMinLeadMs ?? DEFAULT_NOTIFICATION_MIN_LEAD_MS;
  const androidPrayerStartAdvanceMs = options?.androidPrayerStartAdvanceMs ?? DEFAULT_ANDROID_PRAYER_START_ADVANCE_MS;
  const jamaatReminderMinutes = options?.jamaatReminderMinutes ?? JAMAAT_REMINDER_MINUTES;

  const planned: PlannedPrayerNotification[] = [];
  const skipped: PrayerNotificationSkipReason[] = [];

  const prayerStart = prayer.timeDate;
  const prayerStartNotifyAt = options?.isAndroid
    ? new Date(prayerStart.getTime() - androidPrayerStartAdvanceMs)
    : prayerStart;

  if (prayerStartNotifyAt.getTime() - now.getTime() > notificationMinLeadMs) {
    const vars = { prayerName: prayer.name, minutes: jamaatReminderMinutes };
    planned.push({
      title: renderNotificationTemplate(templates.prayerStart.title, vars),
      body: renderNotificationTemplate(templates.prayerStart.body, vars),
      fireAt: prayerStartNotifyAt,
      data: {
        scope: PRAYER_NOTIFICATION_SCOPE,
        type: 'prayer-start',
        prayerName: prayer.name,
        route: PRAYER_NOTIFICATION_ROUTE,
      },
    });
  } else {
    skipped.push('prayer-start-not-in-future');
  }

  const iqamahDate = parseIqamahDate(prayer.iqamah, prayerStart);
  if (!iqamahDate) {
    skipped.push('iqamah-missing-or-invalid');
    return { planned, skipped };
  }

  // Iqamah reminders must belong to the prayer window and never pre-date prayer start.
  if (iqamahDate.getTime() <= prayerStart.getTime()) {
    skipped.push('iqamah-not-after-prayer-start');
    return { planned, skipped };
  }

  const jamaatReminderDate = new Date(iqamahDate.getTime() - jamaatReminderMinutes * 60 * 1000);

  // If jamaat-minus-10 is before prayer start, skip (requested behavior).
  if (jamaatReminderDate.getTime() < prayerStart.getTime()) {
    skipped.push('iqamah-reminder-before-prayer-start');
    return { planned, skipped };
  }

  if (jamaatReminderDate.getTime() - now.getTime() <= notificationMinLeadMs) {
    skipped.push('iqamah-reminder-not-in-future');
    return { planned, skipped };
  }

  planned.push({
    title: renderNotificationTemplate(templates.jamaatReminder.title, {
      prayerName: prayer.name,
      minutes: jamaatReminderMinutes,
    }),
    body: renderNotificationTemplate(templates.jamaatReminder.body, {
      prayerName: prayer.name,
      minutes: jamaatReminderMinutes,
    }),
    fireAt: jamaatReminderDate,
    data: {
      scope: PRAYER_NOTIFICATION_SCOPE,
      type: 'jamaat-10',
      prayerName: prayer.name,
      route: PRAYER_NOTIFICATION_ROUTE,
    },
  });

  return { planned, skipped };
}
