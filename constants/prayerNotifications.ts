export const NOTIFICATION_LANGUAGE_PREFERENCE_STORAGE_KEY = 'jmn_notification_language_preference_v1';
export const SIMPLE_URDU_MODE_STORAGE_KEY = 'jmn_simple_urdu_mode_v1';
export const ADHKAR_REMINDERS_ENABLED_STORAGE_KEY = 'jmn_adhkar_reminders_enabled';
export const ADHKAR_REMINDER_SOUND_MODE_STORAGE_KEY = 'jmn_adhkar_reminder_sound_mode';

export type AdhkarReminderSoundMode = 'sound' | 'silent';
export type NotificationLanguagePreference = 'english-first' | 'urdu-first' | 'urdu-only';

export const PRAYER_NOTIFICATION_SCOPE = 'jmn-prayer';
export const PRAYER_NOTIFICATION_ROUTE = '/prayer';
export const PRAYER_NOTIFICATION_CHANNEL_ID = 'jmn-prayer-alerts-v1';
export const PRAYER_START_NOTIFICATION_CHANNEL_ID = 'jmn-prayer-start-adhaan-v1';
export const PRAYER_START_NOTIFICATION_SOUND_FILE = 'adhaan_1.mp3';
export const PRAYER_NOTIFICATION_MIN_LEAD_MS = 30 * 1000;
export const PRAYER_NOTIFICATION_NEAR_END_MINUTES = 45;
export const PRAYER_NOTIFICATION_JAMAAT_LEAD_MINUTES = 10;

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
