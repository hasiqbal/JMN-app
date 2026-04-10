import type { PrayerTime } from '@/services/prayerService';

const JAMAAT_ONGOING_MS = 7 * 60 * 1000;

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

  const jamaatDate: Date | null = (() => {
    if (!activePrayer) return null;
    const iq = activePrayer.iqamah;
    if (!iq || iq === '-' || iq === '--:--') return null;
    const [h, m] = iq.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;

    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  })();

  const jamaatStarted = jamaatDate ? now >= jamaatDate : false;
  const jamaatOngoing = jamaatDate ? now < new Date(jamaatDate.getTime() + JAMAAT_ONGOING_MS) : false;
  const alertMode = activePrayer !== null;

  const secondsToJamaat = jamaatDate && !jamaatStarted
    ? Math.max(0, Math.floor((jamaatDate.getTime() - now.getTime()) / 1000))
    : 0;

  const jmm = Math.floor(secondsToJamaat / 60);
  const jss = secondsToJamaat % 60;
  const jamaatCountdown = `${String(jmm).padStart(2, '0')}:${String(jss).padStart(2, '0')}`;
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
