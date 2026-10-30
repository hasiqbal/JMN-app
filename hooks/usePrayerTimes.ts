import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { loadCachedPrayerTimes, syncPrayerTimes } from '@/services/prayerTimesSync';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [nextPrayerName, setNextPrayerName] = useState<string>('');
  const [nextPrayerIqamah, setNextPrayerIqamah] = useState<string>('');
  const [forbiddenInfo, setForbiddenInfo] = useState<ForbiddenTimeInfo | null>(null);
  const [jumuahInfo, setJumuahInfo] = useState<JumuahInfo | null>(null);
  const [jumuahCountdown, setJumuahCountdown] = useState<string>('');

  const load = useCallback(async (forceSync = false) => {
    try {
      setLoading(true);
      setError(null);
      await loadCachedPrayerTimes();
      // Seed UI immediately from cached/local timetable while server fetch is in-flight
      const local = getPrayerTimesFromTimetable();
      if (local) setData(local);
      await syncPrayerTimes(forceSync);
      // Then override with live DB data (iqamah times, Hijri, etc.)
      const result = await getPrayerTimesForDate();
      if (result) {
        setData(result);
      } else if (!local) {
        setError('Prayer times not available for today. Please check back later.');
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
    let lastDay = new Date().toDateString();
    const refreshIfNeeded = () => {
      const today = new Date().toDateString();
      if (today !== lastDay) {
        lastDay = today;
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
      const next = getNextPrayer(data.prayers, now);
      if (next) {
        setNextPrayerName(next.prayer.name);
        setCountdown(formatCountdownSeconds(next.secondsLeft));
        const iqamah = next.prayer.iqamah && next.prayer.iqamah !== '-' ? next.prayer.iqamah : '';
        setNextPrayerIqamah(iqamah);
      } else {
        setNextPrayerName('');
        setCountdown('');
        setNextPrayerIqamah('');
      }

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
  }, [data]);

  return {
    data, loading, error, countdown, nextPrayerName, nextPrayerIqamah,
    forbiddenInfo, jumuahInfo, jumuahCountdown,
    refresh: () => load(),
  };
}
