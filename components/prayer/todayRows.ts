import { isBST, type PrayerTime } from '@/services/prayerService';

const SPECIAL_PRAYERS = new Set(['Sunrise', 'Ishraq', 'Zawaal']);

export interface TodayTableRow {
  prayer: PrayerTime;
  isCurrent: boolean;
  isNext: boolean;
  isSpecial: boolean;
  isCompleted: boolean;
  showTomorrowBegins: boolean;
  showTomorrowJamaat: boolean;
  prayerGuidance: string | null;
  rowState: "current" | "next" | "special" | "default";
  iconBg: string;
  iconColor: string;
  jamaatText: string;
  isJumuah: boolean;
  jumuahFirstJamaat: string | null;
  jumuahSecondJamaat: string | null;
}

export function buildTodayRowsWithJumuah(prayers: PrayerTime[], now: Date): PrayerTime[] {
    const rows = [...prayers];
    const baseRows = rows.filter((p) => p.name !== 'Jumuah');
    const isFriday = now.getDay() === 5;
    if (!isFriday) {
      return baseRows;
    }
  // Existing Jumuah jamaat defaults (kept separate)
  const bstNow = isBST(now);
  const j1 = bstNow ? '13:30' : '12:45';
  const j2 = bstNow ? '14:30' : '13:30';

  // 1) Get the Dhuhr row first
    const dhuhrIdx = baseRows.findIndex((p) => p.name === 'Dhuhr');
    const dhuhrRow = dhuhrIdx >= 0 ? baseRows[dhuhrIdx] : null;

  // 2) Use Dhuhr begins for Jumuah begins
  const beginsTime = dhuhrRow?.time ?? j1;
  const beginsDate = dhuhrRow?.timeDate ?? (() => {
    const [jh, jm] = j1.split(':').map(Number);
    const d = new Date(now);
    d.setHours(jh, jm, 0, 0);
    return d;
  })();

  // 3) Keep jamaat times separate (j1 and j2)
  // For now iqamah holds j2; j1/j2 can be rendered separately in UI next.
  const jumuahRow: PrayerTime = {
    name: 'Jumuah',
    time: beginsTime,
    iqamah: j2,
    timeDate: beginsDate,
  };

const fridayRows = baseRows.filter((p) => p.name !== 'Dhuhr');

if (dhuhrIdx >= 0) {
  fridayRows.splice(dhuhrIdx, 0, jumuahRow);
} else {
  fridayRows.push(jumuahRow);
}

return fridayRows;
}

export function buildTodayTableRows(params: {
  prayers: PrayerTime[];
  now: Date;
  nextPrayerName: string;
  nightMode: boolean;
  hasPassed: (prayer: PrayerTime) => boolean;
  isCurrentPrayer: (prayer: PrayerTime) => boolean;
}): TodayTableRow[] {
  const rows = buildTodayRowsWithJumuah(params.prayers, params.now);
  const bstNow = isBST(params.now);
  const j1 = bstNow ? '13:30' : '12:45';
  const j2 = bstNow ? '14:30' : '13:30';

  return rows.map((prayer) => {
    const isJumuah = prayer.name === 'Jumuah';
    const isCurrent = params.isCurrentPrayer(prayer);
    const isNext = prayer.name === params.nextPrayerName;
    const isSpecial = SPECIAL_PRAYERS.has(prayer.name);
    const isCompleted = params.hasPassed(prayer) && !isCurrent && !isNext;
    const showTomorrowBegins = isCompleted && !!prayer.tomorrowTime;
    const showTomorrowJamaat = isCompleted && !!prayer.tomorrowIqamah && !isSpecial && prayer.name !== 'Sunrise';

    const prayerGuidance = prayer.name === 'Fajr'
      ? 'Nafl forbidden after you prayed until Ishraq'
      : prayer.name === 'Asr'
      ? 'Forbidden to delay - 20 mins before Maghrib'
      : prayer.name === 'Zawaal'
      ? 'Nafl forbidden until Dhuhr'
      : prayer.name === 'Isha'
      ? 'Sleep and rise for Tahajjud before Fajr starts'
      : null;

    const rowState = isCurrent
      ? 'current'
      : isNext
      ? 'next'
      : isSpecial
      ? 'special'
      : 'default';

    const iconBg = isCurrent
      ? 'rgba(30,107,70,0.12)'
      : isNext
      ? 'rgba(42,95,154,0.12)'
      : isSpecial
      ? 'rgba(160,132,58,0.12)'
      : (params.nightMode ? 'rgba(255,255,255,0.08)' : 'rgba(20,33,48,0.06)');

    const iconColor = isCurrent
      ? '#1E6B46'
      : isNext
      ? '#2A5F9A'
      : isSpecial
      ? '#8A6E2F'
      : (params.nightMode ? '#C3D3E5' : '#476078');

    const jamaatText = (isSpecial || prayer.name === 'Sunrise' || prayer.iqamah === '-' || prayer.iqamah === '--:--')
      ? '—'
      : prayer.iqamah;

    return {
      prayer,
      isCurrent,
      isNext,
      isSpecial,
      isCompleted,
      showTomorrowBegins,
      showTomorrowJamaat,
      prayerGuidance,
      rowState,
      iconBg,
      iconColor,
      jamaatText,
      isJumuah,
      jumuahFirstJamaat: isJumuah ? j1 : null,
      jumuahSecondJamaat: isJumuah ? j2 : null,
    };
  });
}
