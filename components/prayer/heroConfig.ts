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
