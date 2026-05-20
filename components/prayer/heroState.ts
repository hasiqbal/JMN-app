import { formatCountdownSeconds, type ForbiddenTimeInfo, type PrayerTime, type PrayerTimesData } from '@/services/prayerService';
import type { HeroCountdownInfo } from '@/components/prayer/PrayerHeroCard';
import { PRAYER_GRADIENTS, getInterpolatedPrayerOverlay } from '@/components/prayer/heroConfig';

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
  heroAthanMarker: number | null;
  heroJamaatMarker: number | null;
  heroEndMarker: number | null;
  heroMidMarker: number | null;
  heroPrayerName: string;
  heroCountdownInfo: HeroCountdownInfo;
  heroStartLabel: string;
  heroStartTime: string;
  heroEndLabel: string;
  heroEndTime: string;
  heroMidLabel: string;
  heroMidTime: string;
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
  const sunrisePrayer = params.data?.prayers.find((p) => p.name === 'Sunrise');
  const ishraqPrayer = params.data?.prayers.find((p) => p.name === 'Ishraq');
  const zawaalPrayer = params.data?.prayers.find((p) => p.name === 'Zawaal');
  const dhuhrPrayer = params.data?.prayers.find((p) => p.name === 'Dhuhr');

  const isIshraqToDhuhrPhase = !!(
    !params.forbiddenInfo
    && ishraqPrayer?.timeDate
    && (zawaalPrayer?.timeDate || dhuhrPrayer?.timeDate)
    && params.now >= ishraqPrayer.timeDate
    && params.now < (zawaalPrayer?.timeDate ?? dhuhrPrayer!.timeDate)
  );

  const ishraqToDhuhrProgress = (() => {
    if (!isIshraqToDhuhrPhase || !ishraqPrayer?.timeDate) return null;
    const ishraqPhaseEnd = zawaalPrayer?.timeDate ?? dhuhrPrayer?.timeDate;
    if (!ishraqPhaseEnd) return null;
    const total = Math.max(1, ishraqPhaseEnd.getTime() - ishraqPrayer.timeDate.getTime());
    const elapsed = Math.max(0, params.now.getTime() - ishraqPrayer.timeDate.getTime());
    return Math.max(0, Math.min(1, elapsed / total));
  })();

  const zawaalMidMarker = null;

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

  const heroImageKey = isIshraqToDhuhrPhase
    ? 'Ishraq'
    : params.forbiddenInfo
    ? (forbiddenWindowMeta?.phase === 'Sunrise' ? 'Sunrise' : 'Dhuhr')
    : (params.activePrayer?.name ?? params.nextPrayerName);

  const heroProgress = isIshraqToDhuhrPhase
    ? (ishraqToDhuhrProgress ?? 0)
    : params.forbiddenInfo
    ? (forbiddenWindowMeta?.progress ?? 0)
    : (currentProgressMeta?.progress ?? nextProgressMeta?.progress ?? 0);

  const heroGradientColors = params.forbiddenInfo
    ? ['rgba(122,40,14,0.82)', 'rgba(179,66,26,0.76)'] as const
    : (getInterpolatedPrayerOverlay(heroImageKey, heroProgress)
        ?? PRAYER_GRADIENTS[heroImageKey]
        ?? ['rgba(27,94,52,0.82)', 'rgba(45,138,79,0.76)'] as const);

  const heroAthanMarker = params.forbiddenInfo
    ? null
    : (currentProgressMeta?.athanMarker ?? nextProgressMeta?.athanMarker ?? null);

  const heroJamaatMarker = (params.forbiddenInfo || isIshraqToDhuhrPhase)
    ? null
    : (currentProgressMeta?.jamaatMarker ?? nextProgressMeta?.jamaatMarker ?? null);

  const heroEndMarker = 1;
  const heroMidMarker = isIshraqToDhuhrPhase ? zawaalMidMarker : null;

  const heroPrayerName = isIshraqToDhuhrPhase
    ? 'Ishraq'
    : params.forbiddenInfo
    ? (forbiddenWindowMeta?.phase ?? 'Zawaal')
    : (params.activePrayer?.name ?? params.nextPrayerName);

  const heroCountdownInfo = isIshraqToDhuhrPhase
    ? (() => {
        if (!zawaalPrayer?.timeDate || !dhuhrPrayer?.timeDate) {
          return {
            label: 'Until Dhuhr',
            value: params.countdown,
            note: 'Ishraq window active before Dhuhr.',
            flash: false,
          };
        }

        if (params.now < zawaalPrayer.timeDate) {
          const sec = Math.max(0, Math.floor((zawaalPrayer.timeDate.getTime() - params.now.getTime()) / 1000));
          return {
            label: 'Until Zawaal',
            value: formatCountdownSeconds(sec),
            note: 'Zawaal is a forbidden prayer window before Dhuhr.',
            flash: false,
          };
        }

        const sec = Math.max(0, Math.floor((dhuhrPrayer.timeDate.getTime() - params.now.getTime()) / 1000));
        return {
          label: 'Forbidden Window',
          value: formatCountdownSeconds(sec),
          note: 'Zawaal time: prayer is forbidden until Dhuhr starts.',
          flash: false,
        };
      })()
    : getHeroCountdownInfo({
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

  let heroStartLabel = 'Start';
  let heroStartTime = params.activePrayer?.time ?? nextInfoToTime(params.nextInfo) ?? '--:--';
  let heroEndLabel = 'Next Prayer';
  let heroEndTime = nextInfoToTime(params.nextInfo) ?? '--:--';
  let heroMidLabel = '';
  let heroMidTime = '';

  if (params.activePrayer?.name === 'Fajr' && sunrisePrayer?.time) {
    heroEndLabel = 'Sunrise';
    heroEndTime = sunrisePrayer.time;
  }

  if (params.forbiddenInfo && forbiddenWindowMeta?.phase === 'Sunrise' && sunrisePrayer?.time && ishraqPrayer?.time) {
    heroStartLabel = 'Sunrise';
    heroStartTime = sunrisePrayer.time;
    heroEndLabel = 'Ishraq';
    heroEndTime = ishraqPrayer.time;
  }

  if (isIshraqToDhuhrPhase && ishraqPrayer?.time) {
    heroStartLabel = 'Ishraq';
    heroStartTime = ishraqPrayer.time;
    heroMidLabel = zawaalPrayer?.time ? 'Zawaal' : '';
    heroMidTime = zawaalPrayer?.time ?? '';
    heroEndLabel = 'Dhuhr';
    heroEndTime = dhuhrPrayer?.time ?? zawaalPrayer?.time ?? '--:--';
  }

  return {
    heroImageKey,
    heroGradientColors,
    heroProgress,
    heroAthanMarker,
    heroJamaatMarker,
    heroEndMarker,
    heroMidMarker,
    heroPrayerName,
    heroCountdownInfo,
    heroStartLabel,
    heroStartTime,
    heroEndLabel,
    heroEndTime,
    heroMidLabel,
    heroMidTime,
  };
}

function nextInfoToTime(nextInfo: { prayer: PrayerTime; secondsLeft: number } | null): string | null {
  return nextInfo?.prayer?.time ?? null;
}

function parseClockOnAnchorDay(anchor: Date, clock?: string | null): Date | null {
  if (!clock || clock === '-' || clock === '--:--') return null;
  const [hh, mm] = clock.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const d = new Date(anchor);
  d.setHours(hh, mm, 0, 0);
  return d;
}

function resolveCurrentPrayerEnd(
  activePrayer: PrayerTime | null,
  data: PrayerTimesData | null,
): Date | null {
  if (!activePrayer || !data) return null;

  const idx = data.prayers.findIndex((p) => p.name === activePrayer.name);
  const rawEnd = data.prayers[idx + 1]?.timeDate
    ?? (activePrayer.name === 'Isha' ? data.prayers[0]?.timeDate : undefined)
    ?? null;

  if (!rawEnd) return null;

  // If the boundary is earlier than the active prayer start, it belongs to next day.
  // Use strict '<' so equal-time boundaries do not inflate into +24h countdowns.
  if (rawEnd.getTime() < activePrayer.timeDate.getTime()) {
    const rolledEnd = new Date(rawEnd);
    rolledEnd.setDate(rolledEnd.getDate() + 1);
    return rolledEnd;
  }

  return rawEnd;
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
    hint = 'Forbidden time: prayer is paused between Sunrise and Ishraq.';
  } else if (zawaal && dhuhr && now >= zawaal && now < dhuhr) {
    phase = 'Zawaal';
    start = zawaal;
    end = dhuhr;
    hint = 'Forbidden time: prayer is paused at Zawaal until Dhuhr begins.';
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
): { progress: number; athanMarker: number | null; jamaatMarker: number | null } | null {
  if (!activePrayer || !data) return null;

  const start = activePrayer.timeDate;
  const end = resolveCurrentPrayerEnd(activePrayer, data)
    ?? new Date(start.getTime() + 60 * 60 * 1000);
  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = Math.max(0, now.getTime() - start.getTime());
  const progress = Math.max(0, Math.min(1, elapsed / total));

  const iqamahDate = parseClockOnAnchorDay(activePrayer.timeDate, activePrayer.iqamah);
  const jamaatMarker = iqamahDate && iqamahDate >= start && iqamahDate <= end
    ? Math.max(0, Math.min(1, (iqamahDate.getTime() - start.getTime()) / total))
    : null;

  return {
    progress,
    athanMarker: null, // bar starts at athan — start dot marks it already
    jamaatMarker,
  };
}

function getNextProgressMeta(
  nextInfo: { prayer: PrayerTime; secondsLeft: number } | null,
  activePrayer: PrayerTime | null,
  data: PrayerTimesData | null,
  now: Date,
): { progress: number; athanMarker: number | null; jamaatMarker: number | null } | null {
  if (!nextInfo || !data) return null;

  const start = activePrayer?.timeDate ?? new Date(now.getTime() - 20 * 60 * 1000);
  const nextAthan = nextInfo.prayer.timeDate;
  const nextIqamahDate = parseClockOnAnchorDay(nextAthan, nextInfo.prayer.iqamah);
  const hasIqamahAfterAthan = !!(nextIqamahDate && nextIqamahDate > nextAthan);
  const end = hasIqamahAfterAthan ? nextIqamahDate! : nextAthan;

  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = Math.max(0, now.getTime() - start.getTime());
  const progress = Math.max(0, Math.min(1, elapsed / total));

  // Athan marker: only needed when bar extends past athan to iqamah
  const athanMarker = hasIqamahAfterAthan
    ? Math.max(0, Math.min(1, (nextAthan.getTime() - start.getTime()) / total))
    : null;

  const jamaatMarker = nextIqamahDate && nextIqamahDate >= start && nextIqamahDate <= end
    ? Math.max(0, Math.min(1, (nextIqamahDate.getTime() - start.getTime()) / total))
    : null;

  return {
    progress,
    athanMarker,
    jamaatMarker,
  };
}

function getCurrentEndsIn(
  activePrayer: PrayerTime | null,
  data: PrayerTimesData | null,
  now: Date,
): string {
  if (!activePrayer || !data) return '';

  const end = resolveCurrentPrayerEnd(activePrayer, data);
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
    if (params.activePrayer?.name === 'Sunrise') {
      return {
        label: 'Until Ishraq',
        value: formatCountdownSeconds(params.forbiddenInfo.secondsLeft),
        note: 'Prayer is paused between Sunrise and Ishraq.',
      };
    }

    if (params.activePrayer?.name === 'Zawaal') {
      return {
        label: 'Until Dhuhr',
        value: formatCountdownSeconds(params.forbiddenInfo.secondsLeft),
        note: 'Prayer is paused at Zawaal until Dhuhr begins.',
      };
    }

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

  if (params.activePrayer.name === 'Ishraq') {
    const zawaal = params.data.prayers.find((p) => p.name === 'Zawaal')?.timeDate;
    const dhuhr = params.data.prayers.find((p) => p.name === 'Dhuhr')?.timeDate;
    const boundary = zawaal ?? dhuhr;
    if (boundary) {
      const sec = Math.max(0, Math.floor((boundary.getTime() - params.now.getTime()) / 1000));
      return {
        label: zawaal ? 'Until Zawaal' : 'Until Dhuhr',
        value: formatCountdownSeconds(sec),
        note: zawaal
          ? 'Ishraq window remains until Zawaal.'
          : 'Ishraq window remains until Dhuhr.',
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
        label: 'Jamaat in progress',
        value: 'ON GOING',
        note: 'Run to the masjid now',
        flash: true,
      };
    }

    return {
      label: params.currentPhaseInfo.label || 'Until Next Prayer',
      value: params.currentPhaseInfo.value || params.currentEndsIn || params.countdown,
      note: params.currentPhaseInfo.note,
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
