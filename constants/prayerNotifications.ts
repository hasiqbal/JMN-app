export const ADHAAN_AUDIO_STORAGE_KEY = 'jmn_selected_adhaan_url';
export const ADHAAN_MUTED_STORAGE_KEY = 'jmn_adhaan_muted';
export const IQAMAH_MUTED_STORAGE_KEY = 'jmn_iqamah_muted';

export type AdhaanAudioOption = {
  id: string;
  label: string;
  url: string;
};

export const ADHAAN_AUDIO_OPTIONS: AdhaanAudioOption[] = [
  {
    id: 'adhaan-1',
    label: 'Adhaan 1',
    url: 'https://praytimes.org/audio/sunni/Adhan-Alaqsa.mp3',
  },
  {
    id: 'adhaan-2',
    label: 'Adhaan 2',
    url: 'https://www.islamcan.com/audio/adhan/azan20.mp3',
  },
  {
    id: 'adhaan-3',
    label: 'Adhaan 3',
    url: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
  },
  {
    id: 'adhaan-4',
    label: 'Adhaan 4',
    url: 'https://www.islamcan.com/audio/adhan/azan8.mp3',
  },
  {
    id: 'adhaan-5',
    label: 'Adhaan 5',
    url: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
  },
];

export const DEFAULT_ADHAAN_AUDIO_URL = ADHAAN_AUDIO_OPTIONS[0].url;

const ADHAAN_AUDIO_URL_SET = new Set(ADHAAN_AUDIO_OPTIONS.map((item) => item.url));

export function isValidAdhaanAudioUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  return ADHAAN_AUDIO_URL_SET.has(value);
}
