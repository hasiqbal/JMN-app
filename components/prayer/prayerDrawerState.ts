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
  tomorrowTime?: string;
  tomorrowIqamah?: string;
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
  const hasJumuahRow = sourceRows.some((entry) => entry.name === 'Jumuah');
  const asrFromInput = prayers?.find((entry) => entry.name === 'Asr');
  const shouldForceThursdayPreview = now.getDay() === 4 && !!asrFromInput?.timeDate && now >= asrFromInput.timeDate;

  const prayerOrder = (hasJumuahRow || shouldForceThursdayPreview)
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
      const jumuahReferenceDate = new Date(now);
      if (shouldForceThursdayPreview && !hasJumuahRow) {
        jumuahReferenceDate.setDate(jumuahReferenceDate.getDate() + 1);
      }

      const bst = isBST(jumuahReferenceDate);
      const j1 = bst ? '13:30' : '12:45';
      const j2 = bst ? '14:30' : '13:30';
      const dhuhrFromInput = prayers?.find((entry) => entry.name === 'Dhuhr');
      const begins = prayer?.time
        ?? (shouldForceThursdayPreview ? dhuhrFromInput?.tomorrowTime : dhuhrFromInput?.time)
        ?? j1;

      return {
        name: prayerName,
        begins: normalizeClock(begins),
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
