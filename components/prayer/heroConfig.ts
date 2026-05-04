export const PRAYER_ICONS: Record<string, string> = {
  Fajr: 'bedtime',
  Sunrise: 'wb-sunny',
  Ishraq: 'flare',
  Zawaal: 'blur-on',
  Dhuhr: 'wb-sunny',
  Asr: 'wb-cloudy',
  Maghrib: 'nights-stay',
  Isha: 'nightlight-round',
  Jumuah: 'star',
  Eid: 'celebration',
  EidAdha: 'celebration',
};

export const PRAYER_GRADIENTS: Record<string, readonly [string, string, ...string[]]> = {
  Fajr: ['rgba(34,58,122,0.32)', 'rgba(110,154,224,0.24)'],
  Sunrise: ['rgba(150,70,10,0.38)', 'rgba(215,140,40,0.35)'],
  Ishraq: ['rgba(166,86,16,0.37)', 'rgba(233,174,70,0.33)'],
  Zawaal: ['rgba(95,92,70,0.39)', 'rgba(136,130,102,0.36)'],
  Dhuhr: ['rgba(12,80,130,0.39)', 'rgba(20,138,178,0.35)'],
  Asr: ['rgba(130,66,18,0.39)', 'rgba(198,112,45,0.35)'],
  Maghrib: ['rgba(62,25,95,0.40)', 'rgba(135,54,96,0.36)'],
  Isha: ['rgba(12,22,58,0.42)', 'rgba(36,46,98,0.39)'],
  Jumuah: ['rgba(44,84,66,0.41)', 'rgba(92,136,116,0.37)'],
  Eid: ['rgba(150,114,28,0.42)', 'rgba(203,163,70,0.39)'],
  EidAdha: ['rgba(126,105,34,0.42)', 'rgba(182,156,74,0.39)'],
};

export type PrayerSkyKey =
  | 'tahajjud'
  | 'fajr'
  | 'ishraq'
  | 'zawaal'
  | 'zuhr'
  | 'asr'
  | 'maghrib'
  | 'isha';

export type PrayerSkyGradient = readonly [string, string, string, string];

export const prayerSkyGradients: Record<PrayerSkyKey, PrayerSkyGradient> = {
  tahajjud: ['#050D18', '#0A1830', '#10294A', '#1A4368'],
  fajr: ['#1E314D', '#436287', '#8EAFCC', '#E8F1F8'],
  ishraq: ['#56759A', '#97B6CF', '#F2D6A0', '#FFF4DA'],
  zawaal: ['#E3EDF5', '#F0F6FA', '#FAFCFD', '#FFF7EE'],
  zuhr: ['#7FB3E0', '#A7CFF0', '#DCEFFC', '#F7FCFF'],
  asr: ['#688CAD', '#9FB7C7', '#D9C39A', '#F3E7CC'],
  maghrib: ['#62466E', '#A55A56', '#E38A57', '#F8C88E'],
  isha: ['#06111F', '#0D203A', '#173152', '#264A72'],
};

const PRAYER_SKY_KEY_ALIASES: Record<string, PrayerSkyKey> = {
  tahajjud: 'tahajjud',
  tahjjud: 'tahajjud',
  fajr: 'fajr',
  sunrise: 'ishraq',
  ishraq: 'ishraq',
  zawaal: 'zawaal',
  zuhr: 'zuhr',
  dhuhr: 'zuhr',
  asr: 'asr',
  maghrib: 'maghrib',
  isha: 'isha',
  jumuah: 'zuhr',
  jummah: 'zuhr',
  eid: 'zuhr',
  eidadha: 'zuhr',
};

export function getPrayerGradient(prayerName: string | null | undefined): PrayerSkyGradient {
  const normalized = (prayerName ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
  const key = PRAYER_SKY_KEY_ALIASES[normalized] ?? 'zuhr';
  return prayerSkyGradients[key];
}

// Sequence of sky phases across the day — used to pick the "next" sky for
// smooth gradient transitions as the current prayer window progresses.
const PRAYER_SKY_SEQUENCE: Record<PrayerSkyKey, PrayerSkyKey> = {
  tahajjud: 'fajr',
  fajr: 'ishraq',
  ishraq: 'zuhr',
  zawaal: 'zuhr',
  zuhr: 'asr',
  asr: 'maghrib',
  maghrib: 'isha',
  isha: 'tahajjud',
};

function resolveSkyKey(prayerName: string | null | undefined): PrayerSkyKey {
  const normalized = (prayerName ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
  return PRAYER_SKY_KEY_ALIASES[normalized] ?? 'zuhr';
}

// Parse "#RRGGBB" into [r,g,b].
function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function toHex(n: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(n)));
  return clamped.toString(16).padStart(2, '0');
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const r = ar + (br - ar) * t;
  const g = ag + (bg - ag) * t;
  const bl = ab + (bb - ab) * t;
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function lerpGradient(
  a: PrayerSkyGradient,
  b: PrayerSkyGradient,
  t: number
): PrayerSkyGradient {
  // Smoothstep easing for a softer mid-transition.
  const eased = t * t * (3 - 2 * t);
  return [
    lerpColor(a[0], b[0], eased),
    lerpColor(a[1], b[1], eased),
    lerpColor(a[2], b[2], eased),
    lerpColor(a[3], b[3], eased),
  ] as const as PrayerSkyGradient;
}

/**
 * Return a sky gradient that interpolates between the current prayer's sky
 * and the next prayer's sky based on `progress` (0..1) through the current
 * window. Falls back to the static gradient when progress is not a finite
 * number in [0,1].
 */
export function getInterpolatedPrayerGradient(
  prayerName: string | null | undefined,
  progress: number | null | undefined
): PrayerSkyGradient {
  const currentKey = resolveSkyKey(prayerName);
  const current = prayerSkyGradients[currentKey];
  if (progress == null || !Number.isFinite(progress)) return current;
  const t = Math.max(0, Math.min(1, progress));
  const nextKey = PRAYER_SKY_SEQUENCE[currentKey];
  const next = prayerSkyGradients[nextKey];
  if (next === current) return current;
  return lerpGradient(current, next, t);
}

type SkyCycleStop = {
  at: number;
  key: PrayerSkyKey;
};

// Continuous day-cycle stops (0=fajr start, 1=next fajr start).
// Repeating `fajr` at both ends guarantees seamless wrap-around.
const SKY_DAY_CYCLE_STOPS: readonly SkyCycleStop[] = [
  { at: 0.00, key: 'fajr' },
  { at: 0.08, key: 'ishraq' },
  { at: 0.22, key: 'zuhr' },
  { at: 0.42, key: 'asr' },
  { at: 0.62, key: 'maghrib' },
  { at: 0.80, key: 'isha' },
  { at: 0.92, key: 'tahajjud' },
  { at: 1.00, key: 'fajr' },
] as const;

/**
 * Day-driven sky blend that fades continuously across the full day, rather
 * than snapping when prayer labels change.
 */
export function getContinuousDaySkyGradient(
  dayProgress: number | null | undefined,
  fallbackPrayerName?: string | null | undefined,
): PrayerSkyGradient {
  if (dayProgress == null || !Number.isFinite(dayProgress)) {
    return getPrayerGradient(fallbackPrayerName ?? 'Dhuhr');
  }

  const t = Math.max(0, Math.min(1, dayProgress));
  for (let i = 0; i < SKY_DAY_CYCLE_STOPS.length - 1; i++) {
    const start = SKY_DAY_CYCLE_STOPS[i];
    const end = SKY_DAY_CYCLE_STOPS[i + 1];
    if (t >= start.at && t <= end.at) {
      const span = Math.max(0.0001, end.at - start.at);
      const localT = (t - start.at) / span;
      return lerpGradient(prayerSkyGradients[start.key], prayerSkyGradients[end.key], localT);
    }
  }

  return getPrayerGradient(fallbackPrayerName ?? 'Dhuhr');
}

// ─── rgba overlay interpolation (PRAYER_GRADIENTS) ──────────────────────
// Natural next key for the rgba overlay used above the hero background image.
const PRAYER_OVERLAY_SEQUENCE: Record<string, string> = {
  Fajr: 'Sunrise',
  Sunrise: 'Ishraq',
  Ishraq: 'Zawaal',
  Zawaal: 'Dhuhr',
  Dhuhr: 'Asr',
  Asr: 'Maghrib',
  Maghrib: 'Isha',
  Isha: 'Fajr',
  Jumuah: 'Asr',
  Eid: 'Dhuhr',
  EidAdha: 'Dhuhr',
};

function parseRgba(color: string): [number, number, number, number] {
  const m = color.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (!m) return [0, 0, 0, 1];
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] != null ? Number(m[4]) : 1];
}

function toRgba(r: number, g: number, b: number, a: number): string {
  const rr = Math.max(0, Math.min(255, Math.round(r)));
  const gg = Math.max(0, Math.min(255, Math.round(g)));
  const bb = Math.max(0, Math.min(255, Math.round(b)));
  const aa = Math.max(0, Math.min(1, a));
  return `rgba(${rr},${gg},${bb},${Number(aa.toFixed(3))})`;
}

function lerpRgba(a: string, b: string, t: number): string {
  const [ar, ag, ab, aA] = parseRgba(a);
  const [br, bg, bb, bA] = parseRgba(b);
  return toRgba(
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t,
    aA + (bA - aA) * t,
  );
}

/**
 * Return an rgba overlay gradient that interpolates between the current
 * prayer's overlay and the next prayer's overlay based on `progress` (0..1).
 * Works for any heroKey in PRAYER_GRADIENTS; unknown keys fall back to the
 * provided key's static value (or an empty neutral if missing).
 */
export function getInterpolatedPrayerOverlay(
  heroKey: string | null | undefined,
  progress: number | null | undefined
): readonly [string, string, ...string[]] {
  const fallback = ['rgba(27,94,52,0.82)', 'rgba(45,138,79,0.76)'] as const;
  const key = (heroKey ?? '').toString();
  const current = PRAYER_GRADIENTS[key] ?? fallback;
  if (progress == null || !Number.isFinite(progress)) return current;
  const nextKey = PRAYER_OVERLAY_SEQUENCE[key];
  const next = nextKey ? PRAYER_GRADIENTS[nextKey] : undefined;
  if (!next || next === current) return current;
  const t = Math.max(0, Math.min(1, progress));
  const eased = t * t * (3 - 2 * t);
  // Interpolate pairwise across the two common stops (both entries have
  // at least 2 stops; extra stops on either side are preserved from the
  // current gradient after the first two).
  const out: string[] = [
    lerpRgba(current[0], next[0], eased),
    lerpRgba(current[1], next[1], eased),
    ...current.slice(2),
  ];
  return out as unknown as readonly [string, string, ...string[]];
}

// Optional depth layer above sky gradient to improve text/card contrast.
export const PRAYER_SKY_DEPTH_OVERLAY: readonly [string, string, string] = [
  'rgba(2,9,19,0.08)',
  'rgba(2,9,19,0.16)',
  'rgba(2,9,19,0.24)',
];

export const PRAYER_BG_IMAGES: Record<string, any> = {
  Tahjjud: require('@/assets/images/sky/tahjjud.jpg'),
  Fajr: require('@/assets/images/sky/fajr.jpg'),
  Sunrise: require('@/assets/images/sky/sunrise.jpg'),
  Ishraq: require('@/assets/images/sky/ishraq.jpg'),
  Zawaal: require('@/assets/images/sky/zawaal.jpg'),
  Dhuhr: require('@/assets/images/sky/zuhr.jpg'),
  Asr: require('@/assets/images/sky/asr.jpg'),
  Maghrib: require('@/assets/images/sky/maghrib.jpg'),
  Isha: require('@/assets/images/sky/isha.jpg'),
  Jumuah: require('@/assets/images/sky/nabwi.jpg'),
  Eid: require('@/assets/images/sky/nabwi.jpg'),
  EidAdha: require('@/assets/images/sky/arafat.jpeg'),
};

export const SKY_CROSS_FADE_DURATION_MS = 1400;
export const SKY_CYCLE_CHECK_MS = 60_000;
export const SKY_DAY_CYCLE_KEYS = [
  'Tahjjud',
  'Fajr',
  'Sunrise',
  'Ishraq',
  'Zawaal',
  'Dhuhr',
  'Asr',
  'Maghrib',
  'Isha',
] as const;
