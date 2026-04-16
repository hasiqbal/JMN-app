import { buildTodayRowsWithJumuah } from '@/components/prayer/todayRows';
import { isBST, type PrayerTime } from '@/services/prayerService';

export type DrawerPrayerState = 'past' | 'current' | 'next' | 'future';

export type DrawerPrayerRow = {
  name: string;
  begins: string;
  jamaat: string;
  jamaat2?: string;
  state: DrawerPrayerState;
};

type PrayerLike = {
  name: string;
  time?: string;
  iqamah?: string;
  timeDate?: Date;
};

type BuildPrayerDrawerRowsArgs = {
  prayers: PrayerLike[] | undefined;
  now: Date;
  currentPrayerName?: string | null;
  nextPrayerName?: string | null;
};

const DEFAULT_PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function normalizePrayerNameForJumuah(name: string | null | undefined): string | null | undefined {
  if (!name) return name;
  return name === 'Dhuhr' ? 'Jumuah' : name;
}

function normalizeClock(value: string | undefined): string {
  if (!value || value === '-') return '--:--';
  return value;
}

export function buildPrayerDrawerRows({
  prayers,
  now,
  currentPrayerName,
  nextPrayerName,
}: BuildPrayerDrawerRowsArgs): DrawerPrayerRow[] {
  const sourceRows = prayers
    ? buildTodayRowsWithJumuah(prayers as PrayerTime[], now)
    : [];
  const prayerOrder = sourceRows.some((entry) => entry.name === 'Jumuah')
    ? ['Fajr', 'Jumuah', 'Asr', 'Maghrib', 'Isha']
    : DEFAULT_PRAYER_ORDER;

  const normalizedCurrent = normalizePrayerNameForJumuah(currentPrayerName);
  const normalizedNext = normalizePrayerNameForJumuah(nextPrayerName);

  return prayerOrder.map((prayerName) => {
    const prayer = sourceRows.find((entry) => entry.name === prayerName);

    let state: DrawerPrayerState = 'future';

    if (normalizedCurrent === prayerName) {
      state = 'current';
    } else if (normalizedNext === prayerName) {
      state = 'next';
    } else if (prayer?.timeDate && prayer.timeDate.getTime() < now.getTime()) {
      state = 'past';
    }

    let jamaat2: string | undefined;
    if (prayerName === 'Jumuah') {
      const bst = isBST(now);
      const j1 = bst ? '13:30' : '12:45';
      const j2 = bst ? '14:30' : '13:30';
      return {
        name: prayerName,
        begins: normalizeClock(prayer?.time),
        jamaat: j1,
        jamaat2: j2,
        state,
      };
    }

    return {
      name: prayerName,
      begins: normalizeClock(prayer?.time),
      jamaat: normalizeClock(prayer?.iqamah),
      jamaat2,
      state,
    };
  });
}
