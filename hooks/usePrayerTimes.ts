import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { loadCachedPrayerTimes, syncPrayerTimes } from '@/services/prayerTimesSync';
import { addLondonCalendarDays, getLondonDateKey } from '@/services/londonTime';
import {
  getPrayerTimesForDate,
  getPrayerTimesFromTimetable,
  getNextPrayer,
  getForbiddenTimeInfo,
  getJumuahInfo,
  formatCountdownSeconds,
  PrayerTimesData,
  ForbiddenTimeInfo,
  JumuahInfo,
} from '@/services/prayerService';

export function usePrayerTimes() {
  const [data, setData] = useState<PrayerTimesData | null>(null);
  const [dataLondonDateKey, setDataLondonDateKey] = useState<string | null>(null);
  const [tomorrowData, setTomorrowData] = useState<PrayerTimesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextInfo, setNextInfo] = useState<ReturnType<typeof getNextPrayer>>(null);
  const [forbiddenInfo, setForbiddenInfo] = useState<ForbiddenTimeInfo | null>(null);
  const [jumuahInfo, setJumuahInfo] = useState<JumuahInfo | null>(null);
  const [jumuahCountdown, setJumuahCountdown] = useState<string>('');
  const loadedLondonDateRef = useRef(getLondonDateKey(new Date()));

  const load = useCallback(async (forceSync = false) => {
    try {
      setLoading(true);
      setError(null);
      const targetDate = new Date();
      loadedLondonDateRef.current = getLondonDateKey(targetDate);
      const tomorrowDate = addLondonCalendarDays(targetDate, 1);
      await loadCachedPrayerTimes();
      // Seed UI immediately from cached/local timetable while server fetch is in-flight
      const local = getPrayerTimesFromTimetable(targetDate);
      if (local) {
        setData(local);
        setDataLondonDateKey(getLondonDateKey(targetDate));
      }
      setTomorrowData(getPrayerTimesFromTimetable(tomorrowDate));
      await syncPrayerTimes(forceSync);
      // Then override with live DB data (iqamah times, Hijri, etc.)
      const result = await getPrayerTimesForDate(targetDate);
      if (result) {
        setData(result);
        setDataLondonDateKey(getLondonDateKey(targetDate));
      } else if (!local) {
        setError('Prayer times not available for today. Please check back later.');
      }
      try {
        const tomorrowResult = await getPrayerTimesForDate(tomorrowDate);
        if (tomorrowResult) setTomorrowData(tomorrowResult);
      } catch (tomorrowError) {
        console.warn('Unable to load tomorrow prayer times; using the local timetable.', tomorrowError);
      }
    } catch (e) {
      setError('Unable to load prayer times.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-sync when the app returns to foreground, and re-check periodically (handles day rollover)
  useEffect(() => {
    const refreshIfNeeded = () => {
      const today = getLondonDateKey(new Date());
      if (today !== loadedLondonDateRef.current) {
        load(true);
      } else {
        syncPrayerTimes().then((changed) => { if (changed) load(); });
      }
    };
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refreshIfNeeded(); });
    const id = setInterval(refreshIfNeeded, 30 * 60 * 1000);
    return () => { sub.remove(); clearInterval(id); };
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const tick = () => {
      const now = new Date();
      if (getLondonDateKey(now) !== loadedLondonDateRef.current) {
        setNextInfo(null);
        load(true);
        return;
      }
      if (getLondonDateKey(now) !== dataLondonDateKey) {
        setNextInfo(null);
        return;
      }
      const next = getNextPrayer(data.prayers, now, tomorrowData?.prayers);
      setNextInfo(next);

      // Forbidden time check
      setForbiddenInfo(getForbiddenTimeInfo(data.prayers));

      // Jumuah info
      const jInfo = getJumuahInfo();
      setJumuahInfo(jInfo);
      if (jInfo && jInfo.phase === 'before_khutbah') {
        setJumuahCountdown(formatCountdownSeconds(jInfo.secondsToKhutbah));
      } else if (jInfo && (jInfo.phase === 'khutbah' || jInfo.phase === 'between')) {
        setJumuahCountdown(formatCountdownSeconds(jInfo.secondsToJamaat2));
      } else {
        setJumuahCountdown('');
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data, dataLondonDateKey, tomorrowData, load]);

  const countdown = nextInfo ? formatCountdownSeconds(nextInfo.secondsLeft) : '';
  const nextPrayerName = nextInfo?.prayer.name ?? '';
  const nextPrayerIqamah = nextInfo?.prayer.iqamah && nextInfo.prayer.iqamah !== '-'
    ? nextInfo.prayer.iqamah
    : '';

  return {
    data, loading, error, countdown, nextPrayerName, nextPrayerIqamah, nextInfo,
    forbiddenInfo, jumuahInfo, jumuahCountdown,
    refresh: () => load(),
  };
}
