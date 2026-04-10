import { lookupTimetable, DayTimetable } from './timetableData';
import { fetchPrayerTimeForDay, fetchHijriDateForGregorian } from './contentService';

export function isBST(date: Date): boolean {
  const year = date.getFullYear();
  const lastSundayMarch = new Date(year, 2, 31);
  while (lastSundayMarch.getDay() !== 0) lastSundayMarch.setDate(lastSundayMarch.getDate() - 1);
  const lastSundayOct = new Date(year, 9, 31);
  while (lastSundayOct.getDay() !== 0) lastSundayOct.setDate(lastSundayOct.getDate() - 1);
  return date >= lastSundayMarch && date < lastSundayOct;
}

export interface ForbiddenTimeInfo {
  isForbidden: boolean;
  label: string;
  reason: string;
  endsAt: string;
  secondsLeft: number;
}

export function getForbiddenTimeInfo(prayers: PrayerTime[]): ForbiddenTimeInfo | null {
  const now = new Date();
  const sunrise = prayers.find(p => p.name === 'Sunrise');
  const ishraq = prayers.find(p => p.name === 'Ishraq');
  const zawaal = prayers.find(p => p.name === 'Zawaal');
  const dhuhr = prayers.find(p => p.name === 'Dhuhr');

  if (sunrise && ishraq && now >= sunrise.timeDate && now < ishraq.timeDate) {
    const secondsLeft = Math.max(0, Math.floor((ishraq.timeDate.getTime() - now.getTime()) / 1000));
    return {
      isForbidden: true,
      label: 'Forbidden Time to Pray',
      reason: 'Prayer is not permitted from Sunrise until Ishraq',
      endsAt: ishraq.time,
      secondsLeft,
    };
  }
  if (zawaal && dhuhr && now >= zawaal.timeDate && now < dhuhr.timeDate) {
    const secondsLeft = Math.max(0, Math.floor((dhuhr.timeDate.getTime() - now.getTime()) / 1000));
    return {
      isForbidden: true,
      label: 'Forbidden Time to Pray',
      reason: 'Prayer is not permitted during Zawaal until Dhuhr begins',
      endsAt: dhuhr.time,
      secondsLeft,
    };
  }
  return null;
}

export interface JumuahInfo {
  khutbahTime: string;
  jamaat1: string;
  jamaat2: string;
  khutbahTimeDate: Date;
  jamaat1Date: Date;
  jamaat2Date: Date;
  secondsToKhutbah: number;
  secondsToJamaat2: number;
  phase: 'before_khutbah' | 'khutbah' | 'between' | 'jamaat2' | 'done';
}

export function getJumuahInfo(date?: Date): JumuahInfo | null {
  const target = date || new Date();
  if (target.getDay() !== 5) return null;

  const bst = isBST(target);
  const khutbahStr = bst ? '13:15' : '12:30';
  const jamaat1Str = bst ? '13:30' : '12:45';
  const jamaat2Str = bst ? '14:30' : '13:30';

  const makeTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(target);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const now = new Date();
  const khutbahDate = makeTime(khutbahStr);
  const jamaat1Date = makeTime(jamaat1Str);
  const jamaat2Date = makeTime(jamaat2Str);

  let phase: JumuahInfo['phase'] = 'done';
  if (now < khutbahDate) phase = 'before_khutbah';
  else if (now >= khutbahDate && now < jamaat1Date) phase = 'khutbah';
  else if (now >= jamaat1Date && now < jamaat2Date) phase = 'between';
  else if (now >= jamaat2Date && now < new Date(jamaat2Date.getTime() + 60 * 60 * 1000)) phase = 'jamaat2';

  return {
    khutbahTime: khutbahStr,
    jamaat1: jamaat1Str,
    jamaat2: jamaat2Str,
    khutbahTimeDate: khutbahDate,
    jamaat1Date,
    jamaat2Date,
    secondsToKhutbah: Math.max(0, Math.floor((khutbahDate.getTime() - now.getTime()) / 1000)),
    secondsToJamaat2: Math.max(0, Math.floor((jamaat2Date.getTime() - now.getTime()) / 1000)),
    phase,
  };
}

export interface PrayerTime {
  name: string;
  time: string;
  timeDate: Date;
  iqamah: string;
  tomorrowTime?: string;
  tomorrowIqamah?: string;
  isSpecial?: boolean;
}

export interface PrayerTimesData {
  date: string;
  hijriDate: string;
  prayers: PrayerTime[];
  jumuah: string | null;
  raw: DayTimetable;
}

function parseTimeStr(timeStr: string, baseDate: Date): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

function subtractMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  let total = h * 60 + m - mins;
  if (total < 0) total += 24 * 60;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

// ── Core builder — shared by both DB-first and local paths ────────────────

function buildPrayerTimesData(raw: DayTimetable, target: Date): PrayerTimesData {
  const tomorrow = new Date(target);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowRaw = lookupTimetable(tomorrow);

  const ishraqTime = raw.ishraq;
  const zawaalTime = raw.zawaal ?? subtractMinutes(raw.dhuhr, 30);

  const prayers: PrayerTime[] = [
    {
      name: 'Fajr',
      time: raw.fajr,
      iqamah: raw.iqFajr,
      timeDate: parseTimeStr(raw.fajr, target),
      tomorrowTime: tomorrowRaw?.fajr,
      tomorrowIqamah: tomorrowRaw?.iqFajr,
    },
    {
      name: 'Sunrise',
      time: raw.sunrise,
      iqamah: '-',
      timeDate: parseTimeStr(raw.sunrise, target),
      tomorrowTime: tomorrowRaw?.sunrise,
    },
    {
      name: 'Ishraq',
      time: ishraqTime,
      iqamah: '-',
      timeDate: parseTimeStr(ishraqTime, target),
      tomorrowTime: tomorrowRaw ? (tomorrowRaw.ishraq ?? addMinutes(tomorrowRaw.sunrise, 20)) : undefined,
      isSpecial: true,
    },
    {
      name: 'Zawaal',
      time: zawaalTime,
      iqamah: '-',
      timeDate: parseTimeStr(zawaalTime, target),
      tomorrowTime: tomorrowRaw ? (tomorrowRaw.zawaal ?? subtractMinutes(tomorrowRaw.dhuhr, 30)) : undefined,
      isSpecial: true,
    },
    {
      name: 'Dhuhr',
      time: raw.dhuhr,
      iqamah: raw.iqDhuhr,
      timeDate: parseTimeStr(raw.dhuhr, target),
      tomorrowTime: tomorrowRaw?.dhuhr,
      tomorrowIqamah: tomorrowRaw?.iqDhuhr,
    },
    {
      name: 'Asr',
      time: raw.asr,
      iqamah: raw.iqAsr,
      timeDate: parseTimeStr(raw.asr, target),
      tomorrowTime: tomorrowRaw?.asr,
      tomorrowIqamah: tomorrowRaw?.iqAsr,
    },
    {
      name: 'Maghrib',
      time: raw.maghrib,
      iqamah: raw.iqMaghrib,
      timeDate: parseTimeStr(raw.maghrib, target),
      tomorrowTime: tomorrowRaw?.maghrib,
      tomorrowIqamah: tomorrowRaw?.iqMaghrib,
    },
    {
      name: 'Isha',
      time: raw.isha,
      iqamah: raw.iqIsha,
      timeDate: parseTimeStr(raw.isha, target),
      tomorrowTime: tomorrowRaw?.isha,
      tomorrowIqamah: tomorrowRaw?.iqIsha,
    },
  ];

  const dayName = target.toLocaleDateString('en-GB', { weekday: 'long' });
  const dateStr = target.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    date: `${dayName}, ${dateStr}`,
    hijriDate: raw.hijri,
    prayers,
    jumuah: raw.jumuah,
    raw,
  };
}

// ── DB-first fetch (use this for the prayer screen) ───────────────────────

/**
 * Fetches prayer times from the database first; falls back to local timetable.
 * Any edits made through the management portal are reflected here.
 */
export async function getPrayerTimesForDate(date?: Date): Promise<PrayerTimesData | null> {
  const target = date || new Date();
  const month = target.getMonth() + 1;
  const day = target.getDate();

  // Try DB first
  const [dbRow, hijriFromDb] = await Promise.all([
  fetchPrayerTimeForDay(month, day),
  fetchHijriDateForGregorian(target),
]);
  if (dbRow) {
    // Iqamah times & Hijri date come from local timetable (not stored in DB yet)
    const localRaw = lookupTimetable(target);
    const raw: DayTimetable = {
      fajr:     dbRow.fajr,
      sunrise:  dbRow.sunrise,
      ishraq:   dbRow.ishraq ?? addMinutes(dbRow.sunrise, 20),
      zawaal:   dbRow.zawaal ?? undefined,
      dhuhr:    dbRow.zuhr,
      asr:      dbRow.asr,
      maghrib:  dbRow.maghrib,
      isha:     dbRow.isha,
      jumuah:   dbRow.jumu_ah_1,
      hijri:    hijriFromDb ?? localRaw?.hijri ?? '',
      iqFajr:   dbRow.fajr_jamat     ?? localRaw?.iqFajr   ?? '07:30',
      iqDhuhr:  dbRow.zuhr_jamat     ?? localRaw?.iqDhuhr  ?? '13:00',
      iqAsr:    dbRow.asr_jamat      ?? localRaw?.iqAsr    ?? '15:30',
      iqMaghrib: dbRow.maghrib_jamat ?? dbRow.maghrib,
      iqIsha:   dbRow.isha_jamat     ?? localRaw?.iqIsha   ?? '19:30',
    };
    return buildPrayerTimesData(raw, target);
  }

  // Fall back to local
  const fallback = getPrayerTimesFromTimetable(target);
if (!fallback) return null;

if (!hijriFromDb) return fallback;

return {
  ...fallback,
  hijriDate: hijriFromDb,
  raw: {
    ...fallback.raw,
    hijri: hijriFromDb,
  },
};
}

// ── Local-only (synchronous) — used for quick lookups & tomorrow ──────────

export function getPrayerTimesFromTimetable(date?: Date): PrayerTimesData | null {
  const target = date || new Date();
  const raw = lookupTimetable(target);
  if (!raw) return null;
  return buildPrayerTimesData(raw, target);
}

// ── Next prayer helper ────────────────────────────────────────────────────

export function getNextPrayer(prayers: PrayerTime[]): { prayer: PrayerTime; secondsLeft: number } | null {
  const now = new Date();
  const isFriday = now.getDay() === 5;

  if (isFriday) {
    const bst = isBST(now);
    const jamaat1Str = bst ? '13:30' : '12:45';
    const [jh, jm] = jamaat1Str.split(':').map(Number);
    const jumuahDate = new Date(now);
    jumuahDate.setHours(jh, jm, 0, 0);

    const fajr = prayers.find(p => p.name === 'Fajr');
    if (fajr && fajr.timeDate <= now && now < jumuahDate) {
      const jumuahPrayer: PrayerTime = {
        name: 'Jumuah',
        time: jamaat1Str,
        iqamah: jamaat1Str,
        timeDate: jumuahDate,
      };
      return { prayer: jumuahPrayer, secondsLeft: Math.floor((jumuahDate.getTime() - now.getTime()) / 1000) };
    }
  }

  const prayable = prayers.filter(p => !['Sunrise', 'Ishraq', 'Zawaal'].includes(p.name));
  for (const prayer of prayable) {
    if (prayer.timeDate > now) {
      return { prayer, secondsLeft: Math.floor((prayer.timeDate.getTime() - now.getTime()) / 1000) };
    }
  }

  // After Isha — next is tomorrow's Fajr
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowData = getPrayerTimesFromTimetable(tomorrow);
  if (tomorrowData) {
    const fajr = tomorrowData.prayers.find(p => p.name === 'Fajr');
    if (fajr) {
      return { prayer: fajr, secondsLeft: Math.floor((fajr.timeDate.getTime() - now.getTime()) / 1000) };
    }
  }
  return null;
}

// ── Formatting helpers ────────────────────────────────────────────────────

export function formatCountdownSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatCountdown(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Legacy async wrapper (backwards compat) ───────────────────────────────

export async function fetchPrayerTimes(date?: Date): Promise<PrayerTimesData> {
  const result = await getPrayerTimesForDate(date);
  if (result) return result;

  const target = date || new Date();
  const fallbackPrayers: PrayerTime[] = [
    { name: 'Fajr',    time: '--:--', iqamah: '--:--', timeDate: new Date(0) },
    { name: 'Sunrise', time: '--:--', iqamah: '-',     timeDate: new Date(0) },
    { name: 'Ishraq',  time: '--:--', iqamah: '-',     timeDate: new Date(0), isSpecial: true },
    { name: 'Zawaal',  time: '--:--', iqamah: '-',     timeDate: new Date(0), isSpecial: true },
    { name: 'Dhuhr',   time: '--:--', iqamah: '--:--', timeDate: new Date(0) },
    { name: 'Asr',     time: '--:--', iqamah: '--:--', timeDate: new Date(0) },
    { name: 'Maghrib', time: '--:--', iqamah: '--:--', timeDate: new Date(0) },
    { name: 'Isha',    time: '--:--', iqamah: '--:--', timeDate: new Date(0) },
  ];
  return {
    date: target.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    hijriDate: 'Date not available',
    prayers: fallbackPrayers,
    jumuah: null,
    raw: {} as DayTimetable,
  };
}
