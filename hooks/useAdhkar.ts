/**
 * useAdhkar.ts
 * Fetches additional adhkar from the database for any prayer time slot.
 * Returns [] while loading or if the table is empty — caller combines with hardcoded content.
 */
import { useState, useEffect } from 'react';
import { fetchAdhkarForPrayerTime, AdhkarRow } from '@/services/contentService';

type PrayerTime = 'before-fajr' | 'after-fajr' | 'after-jumuah' | 'after-asr' | 'after-maghrib' | 'after-isha';

export function useAdhkar(prayerTime: PrayerTime) {
  const [adhkar, setAdhkar] = useState<AdhkarRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAdhkarForPrayerTime(prayerTime).then((data) => {
      if (!cancelled) {
        setAdhkar(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [prayerTime]);

  return { adhkar, loading };
}
