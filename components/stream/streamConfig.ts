import { Asset } from 'expo-asset';
import Constants from 'expo-constants';
import { Colors } from '@/constants/theme';

export type StreamId = string;

export type PreviewVariant = 'eid-fitr' | 'eid-fitr-jumuah' | 'eid-adha' | 'eid-adha-jumuah';
export type LayoutMode = 'default' | 'split' | 'mosaic' | 'focus';

export type Station = {
  id: string;
  label: string;
  sublabel: string;
  url: string;
};

export type AudioSource = string | number;

export type StreamScreenProps = {
  previewVariant?: PreviewVariant;
  autoPlayOnMount?: boolean;
};

type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSub: string;
  textMuted: string;
  accent: string;
  primary: string;
  hero: [string, string];
  heroGlow: string;
};

export const NIGHT: Palette = {
  bg: '#08111D',
  surface: '#0F1C2D',
  surfaceAlt: '#132741',
  border: '#1D3655',
  text: '#EEF4FD',
  textSub: '#B2C6DF',
  textMuted: '#7E96B5',
  accent: '#78B2FF',
  primary: '#50E97C',
  hero: ['#132A46', '#0A1528'],
  heroGlow: 'rgba(120,178,255,0.24)',
};

export const DAY: Palette = {
  bg: '#EEF5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#E7F0EA',
  border: '#DAE6DD',
  text: '#13281E',
  textSub: '#4F675B',
  textMuted: '#758A80',
  accent: '#0E8C5E',
  primary: Colors.primary,
  hero: ['#14553E', '#0A2D22'],
  heroGlow: 'rgba(66,179,122,0.2)',
};

export const PREVIEW_THEME: Record<PreviewVariant, { hero: [string, string]; title: string; subtitle: string; mode: LayoutMode }> = {
  'eid-fitr': {
    hero: ['#0C4F5F', '#103548'],
    title: 'Eid Day Stream Center',
    subtitle: 'Unified live stream and radio control for Eid ul Fitr.',
    mode: 'split',
  },
  'eid-fitr-jumuah': {
    hero: ['#3D3B8E', '#18224D'],
    title: 'Eid + Jumuah Broadcast',
    subtitle: 'Fast access to live video and station audio on a high traffic day.',
    mode: 'focus',
  },
  'eid-adha': {
    hero: ['#7A4A17', '#412B12'],
    title: 'Eid ul Adha Live Hub',
    subtitle: 'Prayer day streaming with lightweight controls and clear hierarchy.',
    mode: 'mosaic',
  },
  'eid-adha-jumuah': {
    hero: ['#6D1C3D', '#2C1232'],
    title: 'Eid ul Adha + Jumuah Live Hub',
    subtitle: 'One-screen stream center for overlapping Eid and Friday programming.',
    mode: 'default',
  },
};

export const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatihah',
  2: 'Al-Baqarah',
  3: 'Ali Imran',
  4: 'An-Nisa',
  5: 'Al-Maidah',
  6: 'Al-Anam',
  7: 'Al-Araf',
  8: 'Al-Anfal',
  9: 'At-Tawbah',
  10: 'Yunus',
  11: 'Hud',
  12: 'Yusuf',
  13: 'Ar-Rad',
  14: 'Ibrahim',
  15: 'Al-Hijr',
  16: 'An-Nahl',
  17: 'Al-Isra',
  18: 'Al-Kahf',
  19: 'Maryam',
  20: 'Taha',
  21: 'Al-Anbiya',
  22: 'Al-Hajj',
  23: 'Al-Muminun',
  24: 'An-Nur',
  25: 'Al-Furqan',
  26: 'Ash-Shuara',
  27: 'An-Naml',
  28: 'Al-Qasas',
  29: 'Al-Ankabut',
  30: 'Ar-Rum',
  31: 'Luqman',
  32: 'As-Sajdah',
  33: 'Al-Ahzab',
  34: 'Saba',
  35: 'Fatir',
  36: 'Ya-Sin',
  37: 'As-Saffat',
  38: 'Sad',
  39: 'Az-Zumar',
  40: 'Ghafir',
  41: 'Fussilat',
  42: 'Ash-Shura',
  43: 'Az-Zukhruf',
  44: 'Ad-Dukhan',
  45: 'Al-Jathiyah',
  46: 'Al-Ahqaf',
  47: 'Muhammad',
  48: 'Al-Fath',
  49: 'Al-Hujurat',
  50: 'Qaf',
  51: 'Adh-Dhariyat',
  52: 'At-Tur',
  53: 'An-Najm',
  54: 'Al-Qamar',
  55: 'Ar-Rahman',
  56: 'Al-Waqiah',
  57: 'Al-Hadid',
  58: 'Al-Mujadila',
  59: 'Al-Hashr',
  60: 'Al-Mumtahanah',
  61: 'As-Saf',
  62: 'Al-Jumuah',
  63: 'Al-Munafiqun',
  64: 'At-Taghabun',
  65: 'At-Talaq',
  66: 'At-Tahrim',
  67: 'Al-Mulk',
  68: 'Al-Qalam',
  69: 'Al-Haqqah',
  70: 'Al-Maarij',
  71: 'Nuh',
  72: 'Al-Jinn',
  73: 'Al-Muzzammil',
  74: 'Al-Muddaththir',
  75: 'Al-Qiyamah',
  76: 'Al-Insan',
  77: 'Al-Mursalat',
  78: 'An-Naba',
  79: 'An-Naziat',
  80: 'Abasa',
  81: 'At-Takwir',
  82: 'Al-Infitar',
  83: 'Al-Mutaffifin',
  84: 'Al-Inshiqaq',
  85: 'Al-Buruj',
  86: 'At-Tariq',
  87: 'Al-Ala',
  88: 'Al-Ghashiyah',
  89: 'Al-Fajr',
  90: 'Al-Balad',
  91: 'Ash-Shams',
  92: 'Al-Layl',
  93: 'Ad-Duha',
  94: 'Ash-Sharh',
  95: 'At-Tin',
  96: 'Al-Alaq',
  97: 'Al-Qadr',
  98: 'Al-Bayyinah',
  99: 'Az-Zalzalah',
  100: 'Al-Adiyat',
  101: 'Al-Qariah',
  102: 'At-Takathur',
  103: 'Al-Asr',
  104: 'Al-Humazah',
  105: 'Al-Fil',
  106: 'Quraysh',
  107: 'Al-Maun',
  108: 'Al-Kawthar',
  109: 'Al-Kafirun',
  110: 'An-Nasr',
  111: 'Al-Masad',
  112: 'Al-Ikhlas',
  113: 'Al-Falaq',
  114: 'An-Nas',
};

export const SURAH_LIST = Object.entries(SURAH_NAMES).map(([num, name]) => ({
  num: Number(num),
  name,
  label: `${num}. ${name}`,
}));

export const JUZ_START_SURAH: Record<number, number> = {
  1: 1,
  2: 2,
  3: 2,
  4: 3,
  5: 4,
  6: 4,
  7: 5,
  8: 6,
  9: 7,
  10: 8,
  11: 9,
  12: 11,
  13: 12,
  14: 15,
  15: 17,
  16: 18,
  17: 21,
  18: 23,
  19: 25,
  20: 27,
  21: 29,
  22: 33,
  23: 36,
  24: 39,
  25: 41,
  26: 46,
  27: 51,
  28: 58,
  29: 67,
  30: 78,
};

export const HADR_JUZ_TRACKS: Partial<Record<number, number>> = {
  1: require('../../assets/quran-hadr/juz-01.mp3'),
  2: require('../../assets/quran-hadr/juz-02.mp3'),
  3: require('../../assets/quran-hadr/juz-03.mp3'),
  4: require('../../assets/quran-hadr/juz-04.mp3'),
  5: require('../../assets/quran-hadr/juz-05.mp3'),
  6: require('../../assets/quran-hadr/juz-06.mp3'),
  7: require('../../assets/quran-hadr/juz-07.mp3'),
  8: require('../../assets/quran-hadr/juz-08.mp3'),
  9: require('../../assets/quran-hadr/juz-09.mp3'),
  10: require('../../assets/quran-hadr/juz-10.mp3'),
  11: require('../../assets/quran-hadr/juz-11.mp3'),
  12: require('../../assets/quran-hadr/juz-12.mp3'),
  13: require('../../assets/quran-hadr/juz-13.mp3'),
  14: require('../../assets/quran-hadr/juz-14.mp3'),
  15: require('../../assets/quran-hadr/juz-15.mp3'),
  16: require('../../assets/quran-hadr/juz-16.mp3'),
  17: require('../../assets/quran-hadr/juz-17.mp3'),
  18: require('../../assets/quran-hadr/juz-18.mp3'),
  19: require('../../assets/quran-hadr/juz-19.mp3'),
  20: require('../../assets/quran-hadr/juz-20.mp3'),
  21: require('../../assets/quran-hadr/juz-21.mp3'),
  22: require('../../assets/quran-hadr/juz-22.mp3'),
  23: require('../../assets/quran-hadr/juz-23.mp3'),
  24: require('../../assets/quran-hadr/juz-24.mp3'),
  25: require('../../assets/quran-hadr/juz-25.mp3'),
  26: require('../../assets/quran-hadr/juz-26.mp3'),
  27: require('../../assets/quran-hadr/juz-27.mp3'),
  28: require('../../assets/quran-hadr/juz-28.mp3'),
  29: require('../../assets/quran-hadr/juz-29.mp3'),
  30: require('../../assets/quran-hadr/juz-30.mp3'),
};

export const NOTIF_KEY = 'jmn_radio_notify';
export const LIVE_NOTIFICATION_CHANNEL_ID = 'jmn-live-v3';
export const REWIND_STEP_SEC = 10;
export const MAX_TIMESHIFT_SEC = 120;
export const REWIND_SEEK_SETTLE_MS = 90;
export const SEEK_EPSILON_SEC = 0.35;
export const BOTTOM_PLAYER_COLLAPSED_HEIGHT = 200;
export const ANDROID_PLAYER_BOOTSTRAP_DELAY_MS = 40;
export const EXPO_GO_NOTIFICATIONS_FALLBACK =
  Constants.appOwnership === 'expo' &&
  Number((Constants.expoConfig?.sdkVersion ?? '0').split('.')[0] || 0) >= 53;

export function readSingleQueryParam(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

export function formatPlaybackClock(rawSeconds: number): string {
  const totalSec = Math.max(0, Math.floor(rawSeconds));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function sanitizeQariPathSegment(value: string | null): string {
  const fallback = 'mansour-al-salmi';
  if (!value) return fallback;
  const normalized = value.trim().replace(/^\/+|\/+$/g, '');
  return normalized.length ? normalized : fallback;
}

export function normalizeTrackFile(value: string | null): string {
  const fallback = '008.mp3';
  if (!value) return fallback;

  const trimmed = value.trim();
  const digitMatch = trimmed.match(/\d{1,3}/);
  if (!digitMatch) return fallback;

  const padded = digitMatch[0].padStart(3, '0');
  return `${padded}.mp3`;
}

export function buildQiraatTrackUrl(
  template: string,
  qariPath: string,
  trackFile: string,
): string {
  return template
    .replace('{QARI_PATH}', qariPath)
    .replace('{TRACK_FILE}', trackFile);
}

function isSurahTemplateUrl(url: string): boolean {
  return url.includes('{}') || url.includes('{SURAH_PADDED}') || url.includes('{SURAH}');
}

export function getNextSurahNumber(current: number): number {
  if (!Number.isFinite(current) || current < 1 || current > 114) return 1;
  return current >= 114 ? 1 : current + 1;
}

export function getPreviousSurahNumber(current: number): number {
  if (!Number.isFinite(current) || current < 1 || current > 114) return 114;
  return current <= 1 ? 114 : current - 1;
}

export function buildSurahTrackUrl(template: string, surah: number): string {
  const normalizedSurah = Math.max(1, Math.min(114, Math.round(surah)));
  const padded = String(normalizedSurah).padStart(3, '0');
  const braceReplacement = template.includes('{}.mp3') ? padded : `${padded}.mp3`;

  return template
    .replace('{}', braceReplacement)
    .replace('{SURAH_PADDED}', padded)
    .replace('{SURAH}', String(normalizedSurah));
}

export function isSurahTemplateStation(stream: Station): boolean {
  return stream.id !== 'hadr' && isSurahTemplateUrl(stream.url);
}

export function getNextJuzNumber(current: number): number {
  if (!Number.isFinite(current) || current < 1 || current > 30) return 1;
  return current >= 30 ? 1 : current + 1;
}

export function getPreviousJuzNumber(current: number): number {
  if (!Number.isFinite(current) || current < 1 || current > 30) return 30;
  return current <= 1 ? 30 : current - 1;
}

export async function resolveAudioSourceUri(source: AudioSource): Promise<string> {
  if (typeof source === 'string') {
    return source;
  }

  const asset = Asset.fromModule(source);
  const immediateUri = asset.localUri ?? asset.uri;
  if (immediateUri) {
    if (!asset.localUri) {
      void asset.downloadAsync().catch(() => {});
    }
    return immediateUri;
  }

  await asset.downloadAsync().catch(() => {});
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error('audio-asset-uri-missing');
  }
  return uri;
}

export function stationImageSource(id: string) {
  if (id === 'masjid') return require('@/assets/images/masjid-logo.png');
  if (id === 'qiraat') return require('@/assets/images/quran-radio-thumb.jpg');
  if (id === 'hadr') return require('@/assets/images/quran-radio-thumb.jpg');
  if (id === 'minshawi-mujawwad') return require('@/assets/images/reciters/minshawi.jpg');
  if (id === 'abdul-basit-mujawwad') return require('@/assets/images/reciters/basit.jpg');
  if (id === 'sadaqat-ali') return require('@/assets/images/reciters/sadaqat-ali.jpg');
  if (id === 'ibrahim-kashidan') return require('@/assets/images/reciters/ibrahim.png');
  if (id === 'tablawy-mujawwad') return require('@/assets/images/reciters/tablawy.jpg');
  if (id === 'noreen-siddiq') return require('@/assets/images/reciters/noreen.jpg');
  return require('@/assets/images/quran-radio-thumb.jpg');
}

export function isQariReciterStation(station: Station): boolean {
  if (station.id === 'masjid' || station.id === 'qiraat' || station.id === 'hadr') {
    return false;
  }

  return station.label.toLowerCase().includes('qari');
}
