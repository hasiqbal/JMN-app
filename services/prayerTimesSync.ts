import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAllPrayerTimes, PrayerTimeRow } from './contentService';
import { DayTimetable, setTimetableOverrides } from './timetableData';

const CACHE_KEY = 'jmn.prayerTimes.cache.v1';
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

interface CachePayload {
  fetchedAt: number;
  rows: PrayerTimeRow[];
}

function addMinutes(t: string, mins: number): string {
  const [h, m] = t.split(':').map(Number);
  const total = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function applyRows(rows: PrayerTimeRow[]): void {
  const map: Record<string, Partial<DayTimetable>> = {};
  for (const r of rows) {
    const o: Partial<DayTimetable> = {
      fajr: r.fajr,
      sunrise: r.sunrise,
      ishraq: r.ishraq ?? addMinutes(r.sunrise, 20),
      zawaal: r.zawaal ?? addMinutes(r.zuhr, -15),
      dhuhr: r.zuhr,
      asr: r.asr,
      maghrib: r.maghrib,
      isha: r.isha,
      iqMaghrib: r.maghrib_jamat ?? r.maghrib,
    };
    if (r.jumu_ah_1) o.jumuah = r.jumu_ah_1;
    if (r.fajr_jamat) o.iqFajr = r.fajr_jamat;
    if (r.zuhr_jamat) o.iqDhuhr = r.zuhr_jamat;
    if (r.asr_jamat) o.iqAsr = r.asr_jamat;
    if (r.isha_jamat) o.iqIsha = r.isha_jamat;
    map[`${r.month}-${r.day}`] = o;
  }
  setTimetableOverrides(map);
}

let loaded = false;
let lastFetchedAt = 0;

/** Load last synced timetable from disk so it works offline. */
export async function loadCachedPrayerTimes(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const cache = JSON.parse(raw) as CachePayload;
    lastFetchedAt = cache.fetchedAt ?? 0;
    if (Array.isArray(cache.rows)) applyRows(cache.rows);
  } catch {}
}

/**
 * Pull the full timetable from the server; server values replace anything
 * saved locally. Returns true if fresh data was applied.
 */
export async function syncPrayerTimes(force = false): Promise<boolean> {
  await loadCachedPrayerTimes();
  if (!force && Date.now() - lastFetchedAt < MAX_AGE_MS) return false;
  const rows = await fetchAllPrayerTimes();
  if (!rows) return false;
  applyRows(rows);
  lastFetchedAt = Date.now();
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: lastFetchedAt, rows }));
  } catch {}
  return true;
}
