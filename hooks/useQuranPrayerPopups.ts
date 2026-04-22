import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useInAppBanner } from '@/template';
import { getNextPrayer, getPrayerTimesForDate, PrayerTimesData } from '@/services/prayerService';

const JAMAAT_THRESHOLDS_MINUTES = [30, 20, 15, 5];
const PRAYER_END_THRESHOLDS_MINUTES = [45, 30, 15];
const ASR_MAKROOH_WARNING_MINUTES = 21;
const CHECK_INTERVAL_MS = 15 * 1000;
const DATA_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const shownReminderKeys = new Set<string>();
let lastReminderDayKey = '';

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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
  kind: 'jamaat' | 'prayer-end' | 'makrooh-warning',
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

function isWithinThresholdWindow(remainingSeconds: number, thresholdMinutes: number): boolean {
  const thresholdSeconds = thresholdMinutes * 60;
  return remainingSeconds <= thresholdSeconds && remainingSeconds > thresholdSeconds - 60;
}

function isJamaatStartedWindow(remainingSeconds: number): boolean {
  return remainingSeconds <= 0 && remainingSeconds > -60;
}

function findPrayerDate(prayers: PrayerTimesData['prayers'], name: string): Date | null {
  return prayers.find((p) => p.name === name)?.timeDate ?? null;
}

function isWithinAsrWindow(prayers: PrayerTimesData['prayers'], now: Date): boolean {
  const asr = findPrayerDate(prayers, 'Asr');
  const maghrib = findPrayerDate(prayers, 'Maghrib');
  return !!(asr && maghrib && now >= asr && now < maghrib);
}

function isWithinZawaalWindow(prayers: PrayerTimesData['prayers'], now: Date): boolean {
  const zawaal = findPrayerDate(prayers, 'Zawaal');
  const dhuhr = findPrayerDate(prayers, 'Dhuhr');
  return !!(zawaal && dhuhr && now >= zawaal && now < dhuhr);
}

export function useQuranPrayerPopups(): void {
  const { showBanner } = useInAppBanner();
  const appStateRef = React.useRef<AppStateStatus>(AppState.currentState);
  const prayerDataRef = React.useRef<PrayerTimesData | null>(null);
  const lastDataLoadAtRef = React.useRef<number>(0);
  const checkingRef = React.useRef(false);

  const resetReminderDayIfNeeded = React.useCallback((now: Date) => {
    const dayKey = toDayKey(now);
    if (dayKey === lastReminderDayKey) return;
    lastReminderDayKey = dayKey;
    shownReminderKeys.clear();
  }, []);

  const loadPrayerData = React.useCallback(async (force = false): Promise<PrayerTimesData | null> => {
    const now = Date.now();
    const isFresh = prayerDataRef.current && now - lastDataLoadAtRef.current < DATA_REFRESH_INTERVAL_MS;
    if (!force && isFresh) return prayerDataRef.current;

    const next = await getPrayerTimesForDate();
    if (next) {
      prayerDataRef.current = next;
      lastDataLoadAtRef.current = now;
    }
    return prayerDataRef.current;
  }, []);

  const showReminderOnce = React.useCallback((
    key: string,
    title: string,
    message: string,
    variant: 'default' | 'warning' = 'default',
  ): boolean => {
    if (shownReminderKeys.has(key)) return false;
    shownReminderKeys.add(key);
    showBanner(title, message, undefined, variant);
    return true;
  }, [showBanner]);

  const checkPopupThresholds = React.useCallback(async () => {
    if (appStateRef.current !== 'active' || checkingRef.current) return;

    checkingRef.current = true;
    try {
      const now = new Date();
      resetReminderDayIfNeeded(now);

      const data = await loadPrayerData();
      if (!data) return;

      const nextPrayer = getNextPrayer(data.prayers);
      if (!nextPrayer) return;

      const nextPrayerName = getPrayerLabel(nextPrayer.prayer.name || 'Prayer');
      const nextPrayerStart = nextPrayer.prayer.timeDate;
      const secondsToPrayerStart = Math.floor((nextPrayerStart.getTime() - now.getTime()) / 1000);
      const isZawaalWindow = isWithinZawaalWindow(data.prayers, now);
      const isAsrWindow = isWithinAsrWindow(data.prayers, now);

      const iqamahDate = parseIqamahDate(nextPrayer.prayer.iqamah, nextPrayerStart) ?? nextPrayerStart;
      const secondsToJamaat = Math.floor((iqamahDate.getTime() - now.getTime()) / 1000);

      for (const threshold of JAMAAT_THRESHOLDS_MINUTES) {
        if (!isWithinThresholdWindow(secondsToJamaat, threshold)) continue;
        const key = buildReminderKey('jamaat', nextPrayerName, iqamahDate, String(threshold));
        if (showReminderOnce(key, 'Jamaat Reminder', `${nextPrayerName} jamaat starts in ${threshold} minutes.`)) {
          return;
        }
      }

      if (isJamaatStartedWindow(secondsToJamaat)) {
        const key = buildReminderKey('jamaat', nextPrayerName, iqamahDate, 'started');
        if (showReminderOnce(key, 'Jamaat Reminder', `${nextPrayerName} jamaat has started.`)) {
          return;
        }
      }

      if (isAsrWindow && nextPrayerName === 'Maghrib' && isWithinThresholdWindow(secondsToPrayerStart, ASR_MAKROOH_WARNING_MINUTES)) {
        const key = buildReminderKey('makrooh-warning', 'Asr', nextPrayerStart, String(ASR_MAKROOH_WARNING_MINUTES));
        if (showReminderOnce(
          key,
          'Makrooh Time Warning',
          'Makrooh time is about to enter. The last 20 minutes of Asr are about to start.',
          'warning',
        )) {
          return;
        }
      }

      for (const threshold of PRAYER_END_THRESHOLDS_MINUTES) {
        if (!isWithinThresholdWindow(secondsToPrayerStart, threshold)) continue;
        const key = buildReminderKey('prayer-end', nextPrayerName, nextPrayerStart, String(threshold));
        const isDhuhrAfterZawaal = isZawaalWindow && nextPrayerName === 'Dhuhr';
        const title = isDhuhrAfterZawaal ? 'Zawaal Reminder' : 'Prayer End Reminder';
        const message = isDhuhrAfterZawaal
          ? `Zawaal ends in ${threshold} minutes. Dhuhr begins soon.`
          : `${nextPrayerName} begins in ${threshold} minutes. Current prayer time is ending soon.`;
        if (showReminderOnce(key, title, message)) {
          return;
        }
      }
    } finally {
      checkingRef.current = false;
    }
  }, [loadPrayerData, resetReminderDayIfNeeded, showReminderOnce]);

  React.useEffect(() => {
    void checkPopupThresholds();
  }, [checkPopupThresholds]);

  React.useEffect(() => {
    const appSub = AppState.addEventListener('change', (state) => {
      appStateRef.current = state;
      if (state === 'active') {
        void checkPopupThresholds();
      }
    });

    return () => appSub.remove();
  }, [checkPopupThresholds]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await checkPopupThresholds();
    };

    const intervalId = setInterval(() => {
      void run();
    }, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [checkPopupThresholds]);
}
