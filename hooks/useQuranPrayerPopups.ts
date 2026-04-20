import React from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { getPrayerTimesForDate, PrayerTime, PrayerTimesData } from '@/services/prayerService';

const JAMAAT_THRESHOLDS_MINUTES = [30, 20, 15, 5];
const PRAYER_END_THRESHOLDS_MINUTES = [45, 30, 15];
const RESCHEDULE_INTERVAL_MS = 15 * 60 * 1000;
const MIN_FUTURE_BUFFER_MS = 10 * 1000;
const MAX_SCHEDULED_QURAN_REMINDERS = 60;
const QURAN_NOTIFICATION_CHANNEL_ID = 'quran-prayer';
const QURAN_NOTIFICATION_TYPE = 'quran-prayer-reminder';

const EXPO_GO_NOTIFICATIONS_FALLBACK =
  Constants.appOwnership === 'expo' &&
  Number((Constants.expoConfig?.sdkVersion ?? '0').split('.')[0] || 0) >= 53;

function parseIqamahDate(iqamah: string | undefined, baseDate: Date): Date | null {
  const value = (iqamah ?? '').trim();
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;

  const [hoursRaw, minutesRaw] = value.split(':');
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const out = new Date(baseDate);
  out.setHours(hours, minutes, 0, 0);
  return out;
}

function buildReminderKey(
  kind: 'jamaat' | 'prayer-end',
  prayerName: string,
  targetDate: Date,
  threshold: string,
): string {
  const targetKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}T${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;
  return `${kind}:${prayerName}:${targetKey}:${threshold}`;
}

function getPrayerLabel(name: string): string {
  return name;
}

interface ReminderEvent {
  key: string;
  title: string;
  message: string;
  fireAt: Date;
  prayerName: string;
}

function shouldIncludePrayer(prayer: PrayerTime): boolean {
  return !['Sunrise', 'Ishraq', 'Zawaal'].includes(prayer.name);
}

function buildReminderEventsForPrayer(prayer: PrayerTime): ReminderEvent[] {
  if (!shouldIncludePrayer(prayer)) return [];

  const prayerName = getPrayerLabel(prayer.name || 'Prayer');
  const prayerStart = prayer.timeDate;
  const iqamahDate = parseIqamahDate(prayer.iqamah, prayerStart) ?? prayerStart;
  const events: ReminderEvent[] = [];

  for (const threshold of JAMAAT_THRESHOLDS_MINUTES) {
    events.push({
      key: buildReminderKey('jamaat', prayerName, iqamahDate, String(threshold)),
      title: 'Jamaat Reminder',
      message: `${prayerName} jamaat starts in ${threshold} minutes.`,
      fireAt: new Date(iqamahDate.getTime() - threshold * 60 * 1000),
      prayerName,
    });
  }

  events.push({
    key: buildReminderKey('jamaat', prayerName, iqamahDate, 'started'),
    title: 'Jamaat Reminder',
    message: `${prayerName} jamaat has started.`,
    fireAt: iqamahDate,
    prayerName,
  });

  for (const threshold of PRAYER_END_THRESHOLDS_MINUTES) {
    events.push({
      key: buildReminderKey('prayer-end', prayerName, prayerStart, String(threshold)),
      title: 'Prayer End Reminder',
      message: `${prayerName} begins in ${threshold} minutes. Current prayer time is ending soon.`,
      fireAt: new Date(prayerStart.getTime() - threshold * 60 * 1000),
      prayerName,
    });
  }

  return events;
}

function isQuranNotificationData(data: unknown): data is { type: string } {
  return !!data && typeof data === 'object' && 'type' in data;
}

async function ensureQuranNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(QURAN_NOTIFICATION_CHANNEL_ID, {
    name: 'Quran Prayer Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
  }).catch(() => {});
}

async function clearScheduledQuranNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const quranIds = scheduled
    .filter((item) => isQuranNotificationData(item.content.data) && item.content.data.type === QURAN_NOTIFICATION_TYPE)
    .map((item) => item.identifier);

  await Promise.all(
    quranIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})),
  );
}

function dedupeAndSortEvents(events: ReminderEvent[]): ReminderEvent[] {
  const byKey = new Map<string, ReminderEvent>();
  events.forEach((event) => byKey.set(event.key, event));

  return Array.from(byKey.values())
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, MAX_SCHEDULED_QURAN_REMINDERS);
}

function futureEventsForDate(data: PrayerTimesData, now: Date): ReminderEvent[] {
  const minTime = now.getTime() + MIN_FUTURE_BUFFER_MS;
  return data.prayers
    .flatMap((prayer) => buildReminderEventsForPrayer(prayer))
    .filter((event) => event.fireAt.getTime() > minTime);
}

function tomorrowFajrEvents(data: PrayerTimesData, now: Date): ReminderEvent[] {
  const fajr = data.prayers.find((prayer) => prayer.name === 'Fajr');
  if (!fajr) return [];
  const minTime = now.getTime() + MIN_FUTURE_BUFFER_MS;
  return buildReminderEventsForPrayer(fajr).filter((event) => event.fireAt.getTime() > minTime);
}

async function scheduleReminderEvent(event: ReminderEvent): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: event.title,
      body: event.message,
      sound: 'default',
      channelId: QURAN_NOTIFICATION_CHANNEL_ID,
      data: {
        type: QURAN_NOTIFICATION_TYPE,
        reminderKey: event.key,
        prayerName: event.prayerName,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: event.fireAt,
    },
  });
}

interface UseQuranPrayerPopupsOptions {
  enabled?: boolean;
}

export function useQuranPrayerPopups(options: UseQuranPrayerPopupsOptions = {}): void {
  const { enabled = true } = options;
  const appStateRef = React.useRef<AppStateStatus>(AppState.currentState);
  const schedulingRef = React.useRef(false);
  const lastScheduleAttemptAtRef = React.useRef(0);

  const syncScheduledReminders = React.useCallback(async (force = false) => {
    if (Platform.OS === 'web' || EXPO_GO_NOTIFICATIONS_FALLBACK || schedulingRef.current) return;

    const nowMs = Date.now();
    if (!force && nowMs - lastScheduleAttemptAtRef.current < RESCHEDULE_INTERVAL_MS) return;

    schedulingRef.current = true;
    try {
      lastScheduleAttemptAtRef.current = nowMs;

      if (!enabled) {
        await clearScheduledQuranNotifications();
        return;
      }

      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') return;

      await ensureQuranNotificationChannel();

      const now = new Date();

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [todayData, tomorrowData] = await Promise.all([
        getPrayerTimesForDate(now),
        getPrayerTimesForDate(tomorrow),
      ]);

      const events = dedupeAndSortEvents([
        ...(todayData ? futureEventsForDate(todayData, now) : []),
        ...(tomorrowData ? tomorrowFajrEvents(tomorrowData, now) : []),
      ]);

      await clearScheduledQuranNotifications();

      await Promise.all(events.map((event) => scheduleReminderEvent(event).catch(() => {})));
    } finally {
      schedulingRef.current = false;
    }
  }, [enabled]);

  React.useEffect(() => {
    void syncScheduledReminders(true);
  }, [enabled, syncScheduledReminders]);

  React.useEffect(() => {
    const appSub = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;
      if (state === 'active') {
        void syncScheduledReminders(true);
      }
    });

    return () => appSub.remove();
  }, [syncScheduledReminders]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await syncScheduledReminders();
    };

    void run();
    const intervalId = setInterval(() => {
      void run();
    }, RESCHEDULE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [syncScheduledReminders]);
}
