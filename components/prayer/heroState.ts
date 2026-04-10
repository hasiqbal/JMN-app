import { formatCountdownSeconds, type ForbiddenTimeInfo, type PrayerTime, type PrayerTimesData } from '@/services/prayerService';
import type { HeroCountdownInfo } from '@/components/prayer/PrayerHeroCard';
import { PRAYER_GRADIENTS } from '@/components/prayer/heroConfig';

type HeroPhaseInfo = {
  label: string;
  value: string;
  note: string;
};

type ForbiddenWindowMeta = {
  phase: 'Sunrise' | 'Zawaal';
  hint: string;
  progress: number;
};

export type HeroState = {
  heroImageKey: string;
  heroGradientColors: readonly [string, string, ...string[]];
  heroProgress: number;
  heroJamaatMarker: number | null;
  heroEndMarker: number | null;
  heroPrayerName: string;
  heroCountdownInfo: HeroCountdownInfo;
};

export function buildHeroState(params: {
  forbiddenInfo: ForbiddenTimeInfo | null;
  data: PrayerTimesData | null;
  now: Date;
  activePrayer: PrayerTime | null;
  nextPrayerName: string;
  nextInfo: { prayer: PrayerTime; secondsLeft: number } | null;
  hasJamaat: boolean;
  jamaatStarted: boolean;
  jamaatOngoing: boolean;
  jamaatCountdown: string;
  countdown: string;
}): HeroState {
  const forbiddenWindowMeta = getForbiddenWindowMeta(params.forbiddenInfo, params.data, params.now);
  const currentProgressMeta = getCurrentProgressMeta(params.activePrayer, params.data, params.now);
  const nextProgressMeta = getNextProgressMeta(params.nextInfo, params.activePrayer, params.data, params.now);
  const currentEndsIn = getCurrentEndsIn(params.activePrayer, params.data, params.now);

  const currentPhaseInfo = getCurrentPhaseInfo({
    forbiddenInfo: params.forbiddenInfo,
    activePrayer: params.activePrayer,
    data: params.data,
    hasJamaat: params.hasJamaat,
    jamaatStarted: params.jamaatStarted,
    jamaatCountdown: params.jamaatCountdown,
    now: params.now,
    currentEndsIn,
  });

  const heroImageKey = params.forbiddenInfo
    ? (forbiddenWindowMeta?.phase === 'Sunrise' ? 'Sunrise' : 'Dhuhr')
    : (params.activePrayer?.name ?? params.nextPrayerName);

  const heroGradientColors = params.forbiddenInfo
    ? ['rgba(122,40,14,0.82)', 'rgba(179,66,26,0.76)'] as const
    : (PRAYER_GRADIENTS[heroImageKey] ?? ['rgba(27,94,52,0.82)', 'rgba(45,138,79,0.76)'] as const);

  const heroProgress = params.forbiddenInfo
    ? (forbiddenWindowMeta?.progress ?? 0)
    : (currentProgressMeta?.progress ?? nextProgressMeta?.progress ?? 0);

  const heroJamaatMarker = params.forbiddenInfo
    ? null
    : (currentProgressMeta?.jamaatMarker ?? nextProgressMeta?.jamaatMarker ?? null);

  const heroEndMarker = params.forbiddenInfo ? null : 1;

  const heroPrayerName = params.forbiddenInfo
    ? (forbiddenWindowMeta?.phase ?? 'Zawaal')
    : (params.activePrayer?.name ?? params.nextPrayerName);

  const heroCountdownInfo = getHeroCountdownInfo({
    forbiddenInfo: params.forbiddenInfo,
    activePrayer: params.activePrayer,
    hasJamaat: params.hasJamaat,
    jamaatStarted: params.jamaatStarted,
    jamaatOngoing: params.jamaatOngoing,
    jamaatCountdown: params.jamaatCountdown,
    currentEndsIn,
    countdown: params.countdown,
    currentPhaseInfo,
  });

  return {
    heroImageKey,
    heroGradientColors,
    heroProgress,
    heroJamaatMarker,
    heroEndMarker,
    heroPrayerName,
    heroCountdownInfo,
  };
}

function parseClockOnToday(now: Date, clock?: string | null): Date | null {
  if (!clock || clock === '-' || clock === '--:--') return null;
  const [hh, mm] = clock.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date(now);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function getForbiddenWindowMeta(
  forbiddenInfo: ForbiddenTimeInfo | null,
  data: PrayerTimesData | null,
  now: Date,
): ForbiddenWindowMeta | null {
  if (!forbiddenInfo || !data) return null;

  const sunrise = data.prayers.find((p) => p.name === 'Sunrise')?.timeDate;
  const ishraq = data.prayers.find((p) => p.name === 'Ishraq')?.timeDate;
  const zawaal = data.prayers.find((p) => p.name === 'Zawaal')?.timeDate;
  const dhuhr = data.prayers.find((p) => p.name === 'Dhuhr')?.timeDate;

  let phase: 'Sunrise' | 'Zawaal' = 'Zawaal';
  let start: Date | undefined;
  let end: Date | undefined;
  let hint = 'Prepare for Dhuhr and keep the tongue busy with dhikr.';

  if (sunrise && ishraq && now >= sunrise && now < ishraq) {
    phase = 'Sunrise';
    start = sunrise;
    end = ishraq;
    hint = 'Use this pause for dhikr and istighfar until Ishraq begins.';
  } else if (zawaal && dhuhr && now >= zawaal && now < dhuhr) {
    phase = 'Zawaal';
    start = zawaal;
    end = dhuhr;
    hint = 'Use this pause for dhikr and get ready for Dhuhr.';
  }

  const totalMs = start && end ? Math.max(1, end.getTime() - start.getTime()) : 1;
  const elapsedMs = start ? Math.max(0, now.getTime() - start.getTime()) : 0;
  const progress = Math.max(0, Math.min(1, elapsedMs / totalMs));

  return {
    phase,
    hint,
    progress,
  };
}

function getCurrentProgressMeta(
  activePrayer: PrayerTime | null,
  data: PrayerTimesData | null,
  now: Date,
): { progress: number; jamaatMarker: number | null } | null {
  if (!activePrayer || !data) return null;

  const idx = data.prayers.findIndex((p) => p.name === activePrayer.name);
  const start = activePrayer.timeDate;
  const end = data.prayers[idx + 1]?.timeDate ?? new Date(start.getTime() + 60 * 60 * 1000);
  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = Math.max(0, now.getTime() - start.getTime());
  const progress = Math.max(0, Math.min(1, elapsed / total));

  const iqamahDate = parseClockOnToday(now, activePrayer.iqamah);
  const jamaatMarker = iqamahDate && iqamahDate >= start && iqamahDate <= end
    ? Math.max(0, Math.min(1, (iqamahDate.getTime() - start.getTime()) / total))
    : null;

  return {
    progress,
    jamaatMarker,
  };
}

function getNextProgressMeta(
  nextInfo: { prayer: PrayerTime; secondsLeft: number } | null,
  activePrayer: PrayerTime | null,
  data: PrayerTimesData | null,
  now: Date,
): { progress: number; jamaatMarker: number | null } | null {
  if (!nextInfo || !data) return null;

  const start = activePrayer?.timeDate ?? new Date(now.getTime() - 20 * 60 * 1000);
  const nextAthan = nextInfo.prayer.timeDate;
  const nextIqamahDate = parseClockOnToday(now, nextInfo.prayer.iqamah);
  const end = nextIqamahDate && nextIqamahDate > nextAthan ? nextIqamahDate : nextAthan;

  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = Math.max(0, now.getTime() - start.getTime());
  const progress = Math.max(0, Math.min(1, elapsed / total));

  const jamaatMarker = nextIqamahDate && nextIqamahDate >= start && nextIqamahDate <= end
    ? Math.max(0, Math.min(1, (nextIqamahDate.getTime() - start.getTime()) / total))
    : null;

  return {
    progress,
    jamaatMarker,
  };
}

function getCurrentEndsIn(
  activePrayer: PrayerTime | null,
  data: PrayerTimesData | null,
  now: Date,
): string {
  if (!activePrayer || !data) return '';

  const idx = data.prayers.findIndex((p) => p.name === activePrayer.name);
  const end = data.prayers[idx + 1]?.timeDate;
  if (!end) return '';

  const sec = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
  return formatCountdownSeconds(sec);
}

function getCurrentPhaseInfo(params: {
  forbiddenInfo: ForbiddenTimeInfo | null;
  activePrayer: PrayerTime | null;
  data: PrayerTimesData | null;
  hasJamaat: boolean;
  jamaatStarted: boolean;
  jamaatCountdown: string;
  now: Date;
  currentEndsIn: string;
}): HeroPhaseInfo {
  if (params.forbiddenInfo) {
    return {
      label: 'Until Resume',
      value: formatCountdownSeconds(params.forbiddenInfo.secondsLeft),
      note: '',
    };
  }

  if (!params.activePrayer || !params.data) {
    return {
      label: '',
      value: '',
      note: '',
    };
  }

  if (params.hasJamaat && !params.jamaatStarted) {
    return {
      label: 'Until Jamaat',
      value: params.jamaatCountdown,
      note: '',
    };
  }

  if (params.activePrayer.name === 'Fajr') {
    const sunrise = params.data.prayers.find((p) => p.name === 'Sunrise')?.timeDate;
    if (sunrise) {
      const sec = Math.max(0, Math.floor((sunrise.getTime() - params.now.getTime()) / 1000));
      if (sec > 0) {
        return {
          label: 'Until Makrooh',
          value: formatCountdownSeconds(sec),
          note: 'Makrooh starts at Sunrise',
        };
      }
    }
  }

  if (params.activePrayer.name === 'Asr') {
    const maghrib = params.data.prayers.find((p) => p.name === 'Maghrib')?.timeDate;
    if (maghrib) {
      const makroohStart = new Date(maghrib.getTime() - 20 * 60 * 1000);
      const sec = Math.max(0, Math.floor((makroohStart.getTime() - params.now.getTime()) / 1000));
      if (sec > 0) {
        return {
          label: 'Until Makrooh',
          value: formatCountdownSeconds(sec),
          note: '20 mins before Maghrib',
        };
      }

      return {
        label: 'Makrooh Window',
        value: params.currentEndsIn,
        note: 'Nafl discouraged before Maghrib',
      };
    }
  }

  return {
    label: 'Until Next Prayer',
    value: params.currentEndsIn,
    note: '',
  };
}

function getHeroCountdownInfo(params: {
  forbiddenInfo: ForbiddenTimeInfo | null;
  activePrayer: PrayerTime | null;
  hasJamaat: boolean;
  jamaatStarted: boolean;
  jamaatOngoing: boolean;
  jamaatCountdown: string;
  currentEndsIn: string;
  countdown: string;
  currentPhaseInfo: HeroPhaseInfo;
}): HeroCountdownInfo {
  if (params.forbiddenInfo) {
    return {
      label: params.currentPhaseInfo.label || 'Until Resume',
      value: params.currentPhaseInfo.value,
      note: params.currentPhaseInfo.note,
      flash: false,
    };
  }

  if (params.activePrayer) {
    if (params.hasJamaat && !params.jamaatStarted) {
      return {
        label: 'Until Jamaat',
        value: params.jamaatCountdown,
        note: '',
        flash: false,
      };
    }

    if (params.hasJamaat && params.jamaatStarted && params.jamaatOngoing) {
      return {
        label: 'Jamaat On Going',
        value: 'ON GOING',
        note: 'Run to the masjid now',
        flash: true,
      };
    }

    return {
      label: 'Until Next Prayer',
      value: params.currentEndsIn || params.countdown,
      note: '',
      flash: false,
    };
  }

  return {
    label: params.currentPhaseInfo.label || 'Until Next Prayer',
    value: params.currentPhaseInfo.value || params.countdown,
    note: '',
    flash: false,
  };
}
