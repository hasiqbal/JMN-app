type PrayerPeriodEntry = {
  name: string;
  timeDate: Date;
};

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

export function getCurrentPrayerPeriod<T extends PrayerPeriodEntry>(
  prayers: readonly T[],
  now: Date,
): T | null {
  const prayerByName = new Map(prayers.map((prayer) => [prayer.name, prayer] as const));
  const fajr = prayerByName.get('Fajr');
  if (!fajr) return null;

  if (now < fajr.timeDate) {
    const isha = prayerByName.get('Isha');
    if (!isha) return null;

    const previousIshaDate = new Date(isha.timeDate);
    previousIshaDate.setDate(previousIshaDate.getDate() - 1);
    return { ...isha, timeDate: previousIshaDate };
  }

  const sunrise = prayerByName.get('Sunrise');
  const dhuhr = prayerByName.get('Dhuhr');
  const fajrEndsAt = sunrise?.timeDate ?? dhuhr?.timeDate;
  if (now >= fajr.timeDate && fajrEndsAt && now < fajrEndsAt) {
    return fajr;
  }

  for (let index = 1; index < PRAYER_ORDER.length; index += 1) {
    const prayer = prayerByName.get(PRAYER_ORDER[index]);
    if (!prayer || prayer.timeDate > now) continue;

    const nextPrayer = prayerByName.get(PRAYER_ORDER[index + 1]);
    if (!nextPrayer || now < nextPrayer.timeDate) {
      return prayer;
    }
  }

  return null;
}
