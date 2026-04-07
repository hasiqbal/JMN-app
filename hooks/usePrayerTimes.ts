import { useState, useEffect, useCallback } from 'react';
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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Seed UI immediately from local timetable while DB fetch is in-flight
      const local = getPrayerTimesFromTimetable();
      if (local) setData(local);
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

  useEffect(() => {
    if (!data) return;
    const tick = () => {
      const next = getNextPrayer(data.prayers);
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
    refresh: load,
  };
}
