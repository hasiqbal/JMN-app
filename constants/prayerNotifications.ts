export const ADHAAN_AUDIO_STORAGE_KEY = 'jmn_selected_adhaan_url';
export const ADHAAN_MUTED_STORAGE_KEY = 'jmn_adhaan_muted';
export const IQAMAH_MUTED_STORAGE_KEY = 'jmn_iqamah_muted';
export const PRAYER_REMINDER_LIVE_ALERTS_STORAGE_KEY = 'jmn_prayer_live_alerts_mode';
export const NOTIFICATION_LANGUAGE_PREFERENCE_STORAGE_KEY = 'jmn_notification_language_preference_v1';
export const SIMPLE_URDU_MODE_STORAGE_KEY = 'jmn_simple_urdu_mode_v1';
export const ADHKAR_REMINDERS_ENABLED_STORAGE_KEY = 'jmn_adhkar_reminders_enabled';
export const ADHKAR_REMINDER_SOUND_MODE_STORAGE_KEY = 'jmn_adhkar_reminder_sound_mode';

export type AdhkarReminderSoundMode = 'sound' | 'silent';
export type NotificationLanguagePreference = 'english-first' | 'urdu-first' | 'urdu-only';

export type AdhaanAudioOption = {
  id: string;
  label: string;
  url: string;
  backgroundSoundFile: string;
};

export const ADHAAN_AUDIO_OPTIONS: AdhaanAudioOption[] = [
  {
    id: 'adhaan-1',
    label: 'Adhaan 1',
    url: 'https://praytimes.org/audio/sunni/Adhan-Alaqsa.mp3',
    backgroundSoundFile: 'adhaan_1.mp3',
  },
  {
    id: 'adhaan-2',
    label: 'Adhaan 2',
    url: 'https://www.islamcan.com/audio/adhan/azan20.mp3',
    backgroundSoundFile: 'adhaan_2.mp3',
  },
  {
    id: 'adhaan-3',
    label: 'Adhaan 3',
    url: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    backgroundSoundFile: 'adhaan_3.mp3',
  },
  {
    id: 'adhaan-4',
    label: 'Adhaan 4',
    url: 'https://www.islamcan.com/audio/adhan/azan8.mp3',
    backgroundSoundFile: 'adhaan_4.mp3',
  },
  {
    id: 'adhaan-5',
    label: 'Adhaan 5',
    url: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
    backgroundSoundFile: 'adhaan_5.mp3',
  },
];

export const DEFAULT_ADHAAN_AUDIO_URL = ADHAAN_AUDIO_OPTIONS[0].url;
export const DEFAULT_ADHAAN_BACKGROUND_SOUND_FILE = ADHAAN_AUDIO_OPTIONS[0].backgroundSoundFile;
export const IQAMAH_BACKGROUND_SOUND_FILE = 'iqamah.mp3';
export const PRAYER_JAMAAT_CHANNEL_ID = 'jmn-prayer-jamaat-v7';
export const PRAYER_SILENT_CHANNEL_ID = 'jmn-prayer-silent-v3';
export const PRAYER_ALERT_CHANNEL_ID = 'jmn-prayer-alerts-v1';
export const ADHKAR_NOTIFICATION_SCOPE = 'jmn-adhkar';
export const ADHKAR_NOTIFICATION_ROUTE = '/duas';
export const ADHKAR_NOTIFICATION_CHANNEL_ID = 'jmn-adhkar-v1';
export const ADHKAR_NOTIFICATION_SILENT_CHANNEL_ID = 'jmn-adhkar-silent-v1';
export const ADHKAR_NOTIFICATION_TYPE = 'adhkar-due-summary';
export const ADHKAR_NOTIFICATION_MIN_LEAD_MS = 30 * 1000;
export const DEFAULT_ADHKAR_REMINDERS_ENABLED = true;
export const DEFAULT_ADHKAR_REMINDER_SOUND_MODE: AdhkarReminderSoundMode = 'sound';
export const DEFAULT_NOTIFICATION_LANGUAGE_PREFERENCE: NotificationLanguagePreference = 'english-first';
export const DEFAULT_SIMPLE_URDU_MODE = false;

const ADHAAN_AUDIO_URL_SET = new Set(ADHAAN_AUDIO_OPTIONS.map((item) => item.url));

export function isValidAdhaanAudioUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  return ADHAAN_AUDIO_URL_SET.has(value);
}

export function getAdhaanOptionByUrl(value: string | null | undefined): AdhaanAudioOption | null {
  if (!value) return null;
  return ADHAAN_AUDIO_OPTIONS.find((option) => option.url === value) ?? null;
}

export function getPrayerAdhaanChannelId(optionId: string): string {
  return `jmn-prayer-adhaan-${optionId}-v7`;
}

export function getPrayerAdhaanRecoveryChannelId(optionId: string): string {
  return `jmn-prayer-adhaan-${optionId}-recover-v1`;
}

export function getPrayerAdhaanRecoveryNoExtChannelId(optionId: string): string {
  return `jmn-prayer-adhaan-${optionId}-recover-noext-v1`;
}
