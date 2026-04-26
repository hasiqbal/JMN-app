import { formatCountdownHMS, type PrayerTime } from '@/services/prayerService';

const JAMAAT_ONGOING_MS = 15 * 60 * 1000;

export type ActivePrayerState = {
  activePrayer: PrayerTime | null;
  jamaatDate: Date | null;
  jamaatStarted: boolean;
  jamaatOngoing: boolean;
  alertMode: boolean;
  secondsToJamaat: number;
  jamaatCountdown: string;
  hasJamaat: boolean;
};

export function buildActivePrayerState(prayers: PrayerTime[] | undefined, now: Date): ActivePrayerState {
  const prayerTimeline = prayers ?? [];

  let activePrayer: PrayerTime | null = null;
  for (let i = 0; i < prayerTimeline.length; i++) {
    const cur = prayerTimeline[i];
    const nxt = prayerTimeline[i + 1];
    if (cur.timeDate <= now && (!nxt || nxt.timeDate > now)) {
      activePrayer = cur;
      break;
    }
  }

  // Pre-Fajr window (midnight → first prayer): Isha from yesterday carries forward
  if (!activePrayer && prayerTimeline.length > 0 && now < prayerTimeline[0].timeDate) {
    const isha = prayerTimeline.find(p => p.name === 'Isha');
    if (isha) {
      const prevIshaDate = new Date(isha.timeDate.getTime() - 24 * 60 * 60 * 1000);
      activePrayer = { ...isha, timeDate: prevIshaDate };
    }
  }

  const jamaatDate: Date | null = (() => {
    if (!activePrayer) return null;
    const iq = activePrayer.iqamah;
    if (!iq || iq === '-' || iq === '--:--') return null;
    const [h, m] = iq.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;

    // Anchor iqamah to the active prayer's day so overnight carried prayers
    // (e.g. pre-Fajr still in yesterday's Isha) don't jump to tonight's iqamah.
    const d = new Date(activePrayer.timeDate);
    d.setHours(h, m, 0, 0);

    // Safety: if parsed iqamah somehow ends up before athan, roll once to next day.
    if (d < activePrayer.timeDate) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  })();

  const jamaatStarted = jamaatDate ? now >= jamaatDate : false;
  const jamaatOngoing = jamaatDate ? now < new Date(jamaatDate.getTime() + JAMAAT_ONGOING_MS) : false;
  const alertMode = activePrayer !== null;

  const secondsToJamaat = jamaatDate && !jamaatStarted
    ? Math.max(0, Math.floor((jamaatDate.getTime() - now.getTime()) / 1000))
    : 0;

  const jamaatCountdown = formatCountdownHMS(secondsToJamaat);
  const hasJamaat = jamaatDate !== null;

  return {
    activePrayer,
    jamaatDate,
    jamaatStarted,
    jamaatOngoing,
    alertMode,
    secondsToJamaat,
    jamaatCountdown,
    hasJamaat,
  };
}
