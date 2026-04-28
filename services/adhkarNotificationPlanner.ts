import { JAMAAT_ONGOING_WINDOW_MS } from '@/components/prayer/activePrayerState';
import {
  ADHKAR_NOTIFICATION_MIN_LEAD_MS,
  ADHKAR_NOTIFICATION_ROUTE,
  ADHKAR_NOTIFICATION_SCOPE,
  ADHKAR_NOTIFICATION_TYPE,
} from '@/constants/prayerNotifications';
import { fetchAdhkarGroupsForPrayerTime } from '@/services/contentService';
import {
  type NotificationTemplateCatalog,
  renderNotificationTemplate,
} from '@/services/notificationTemplateService';
import { parseIqamahDate } from '@/services/prayerNotificationPlanner';
import type { PrayerTime } from '@/services/prayerService';
import type { PrayerTimeId } from '@/types/duasTypes';

export type AdhkarNotificationPrayerTime = Exclude<PrayerTimeId, 'before-fajr'>;

export type AdhkarNotificationType = typeof ADHKAR_NOTIFICATION_TYPE;

export type PlannedAdhkarNotification = {
  title: string;
  body: string;
  fireAt: Date;
  data: {
    scope: string;
    type: AdhkarNotificationType;
    prayerName: string;
    prayerTime: AdhkarNotificationPrayerTime;
    route: string;
  };
};

export type AdhkarNotificationSkipReason =
  | 'non-fard-prayer'
  | 'templates-unavailable'
  | 'no-adhkar-prayer-time'
  | 'adhkar-content-unavailable'
  | 'iqamah-missing-or-invalid'
  | 'iqamah-not-after-prayer-start'
  | 'adhkar-notification-not-in-future';

export type SkippedAdhkarNotification = {
  prayerName: string;
  reason: AdhkarNotificationSkipReason;
};

export type AdhkarNotificationBuildResult = {
  planned: PlannedAdhkarNotification[];
  skipped: SkippedAdhkarNotification[];
};

export type AdhkarNotificationPlannerOptions = {
  notificationMinLeadMs?: number;
  jamaatOngoingWindowMs?: number;
  hasAdhkarForPrayerTime?: (prayerTime: AdhkarNotificationPrayerTime) => Promise<boolean>;
  templates?: NotificationTemplateCatalog | null;
};

function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

export function resolveAdhkarPrayerTimeForPrayer(
  prayer: PrayerTime,
): AdhkarNotificationPrayerTime | null {
  switch (prayer.name) {
    case 'Fajr':
      return 'after-fajr';
    case 'Dhuhr':
      return isFriday(prayer.timeDate) ? 'after-jumuah' : 'after-zuhr';
    case 'Asr':
      return 'after-asr';
    case 'Maghrib':
      return 'after-maghrib';
    case 'Isha':
      return 'after-isha';
    default:
      return null;
  }
}

export function buildAdhkarNotificationForPrayer(
  prayer: PrayerTime,
  now: Date,
  hasAdhkarContent: boolean,
  options?: Pick<AdhkarNotificationPlannerOptions, 'notificationMinLeadMs' | 'jamaatOngoingWindowMs' | 'templates'>,
): AdhkarNotificationBuildResult {
  const templates = options?.templates;
  if (!templates) {
    return {
      planned: [],
      skipped: [{ prayerName: prayer.name, reason: 'templates-unavailable' }],
    };
  }

  const prayerTime = resolveAdhkarPrayerTimeForPrayer(prayer);
  if (!prayerTime) {
    return {
      planned: [],
      skipped: [{ prayerName: prayer.name, reason: 'no-adhkar-prayer-time' }],
    };
  }

  if (!hasAdhkarContent) {
    return {
      planned: [],
      skipped: [{ prayerName: prayer.name, reason: 'adhkar-content-unavailable' }],
    };
  }

  const prayerStart = prayer.timeDate;
  const iqamahDate = parseIqamahDate(prayer.iqamah, prayerStart);
  if (!iqamahDate) {
    return {
      planned: [],
      skipped: [{ prayerName: prayer.name, reason: 'iqamah-missing-or-invalid' }],
    };
  }

  if (iqamahDate.getTime() <= prayerStart.getTime()) {
    return {
      planned: [],
      skipped: [{ prayerName: prayer.name, reason: 'iqamah-not-after-prayer-start' }],
    };
  }

  const jamaatOngoingWindowMs = options?.jamaatOngoingWindowMs ?? JAMAAT_ONGOING_WINDOW_MS;
  const notificationMinLeadMs = options?.notificationMinLeadMs ?? ADHKAR_NOTIFICATION_MIN_LEAD_MS;
  const fireAt = new Date(iqamahDate.getTime() + jamaatOngoingWindowMs);

  if (fireAt.getTime() - now.getTime() <= notificationMinLeadMs) {
    return {
      planned: [],
      skipped: [{ prayerName: prayer.name, reason: 'adhkar-notification-not-in-future' }],
    };
  }

  return {
    planned: [
      {
        title: renderNotificationTemplate(templates.adhkarReminder.title, {
          prayerName: prayer.name,
        }),
        body: renderNotificationTemplate(templates.adhkarReminder.body, {
          prayerName: prayer.name,
        }),
        fireAt,
        data: {
          scope: ADHKAR_NOTIFICATION_SCOPE,
          type: ADHKAR_NOTIFICATION_TYPE,
          prayerName: prayer.name,
          prayerTime,
          route: ADHKAR_NOTIFICATION_ROUTE,
        },
      },
    ],
    skipped: [],
  };
}

async function defaultHasAdhkarForPrayerTime(prayerTime: AdhkarNotificationPrayerTime): Promise<boolean> {
  const groups = await fetchAdhkarGroupsForPrayerTime(prayerTime);
  return groups.length > 0;
}

export async function buildAdhkarNotificationsForPrayers(
  prayers: PrayerTime[],
  now: Date,
  options?: AdhkarNotificationPlannerOptions,
): Promise<AdhkarNotificationBuildResult> {
  const hasAdhkarForPrayerTime = options?.hasAdhkarForPrayerTime ?? defaultHasAdhkarForPrayerTime;
  const availabilityCache = new Map<AdhkarNotificationPrayerTime, boolean>();
  const planned: PlannedAdhkarNotification[] = [];
  const skipped: SkippedAdhkarNotification[] = [];

  for (const prayer of prayers) {
    const prayerTime = resolveAdhkarPrayerTimeForPrayer(prayer);
    if (!prayerTime) {
      skipped.push({ prayerName: prayer.name, reason: 'non-fard-prayer' });
      continue;
    }

    if (!availabilityCache.has(prayerTime)) {
      const hasContent = await hasAdhkarForPrayerTime(prayerTime);
      availabilityCache.set(prayerTime, hasContent);
    }

    const hasContent = availabilityCache.get(prayerTime) === true;
    const result = buildAdhkarNotificationForPrayer(prayer, now, hasContent, options);
    planned.push(...result.planned);
    skipped.push(...result.skipped);
  }

  return { planned, skipped };
}
