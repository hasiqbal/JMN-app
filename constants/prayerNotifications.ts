export const NOTIFICATION_LANGUAGE_PREFERENCE_STORAGE_KEY = 'jmn_notification_language_preference_v1';
export const SIMPLE_URDU_MODE_STORAGE_KEY = 'jmn_simple_urdu_mode_v1';
export const ADHKAR_REMINDERS_ENABLED_STORAGE_KEY = 'jmn_adhkar_reminders_enabled';
export const ADHKAR_REMINDER_SOUND_MODE_STORAGE_KEY = 'jmn_adhkar_reminder_sound_mode';
export const ADHAAN_SELECTION_STORAGE_KEY = 'jmn_selected_adhaan_option_v1';
export const PRAYER_AUDIO_MUTED_STORAGE_KEY = 'jmn_prayer_audio_muted_v1';
export const IQAMAH_EXACT_SOUND_ENABLED_STORAGE_KEY = 'jmn_iqamah_exact_sound_enabled_v1';

export type AdhkarReminderSoundMode = 'sound' | 'silent';
export type NotificationLanguagePreference = 'english-first' | 'urdu-first' | 'urdu-only';

export type AdhaanOption = {
	id: '1' | '2' | '3';
	label: string;
	soundFile: string;
};

export const ADHAAN_OPTIONS: AdhaanOption[] = [
	{ id: '1', label: 'Adhaan 1', soundFile: 'adhaan_1.mp3' },
	{ id: '2', label: 'Adhaan 2', soundFile: 'adhaan_2.mp3' },
	{ id: '3', label: 'Adhaan 3', soundFile: 'adhaan_3.mp3' },
];

export const DEFAULT_ADHAAN_OPTION_ID: AdhaanOption['id'] = '1';

export function getAdhaanOptionById(value: string | null | undefined): AdhaanOption {
	return ADHAAN_OPTIONS.find((option) => option.id === value) ?? ADHAAN_OPTIONS[0];
}

export function getPrayerStartChannelId(optionId: AdhaanOption['id'], silent = false): string {
	return silent
		? `jmn-prayer-start-adhaan-${optionId}-silent-v3`
		: `jmn-prayer-start-adhaan-${optionId}-v4`;
}

// Legacy channel IDs to be deleted on app launch (Android caches sound bindings per channel,
// so when sound config changes we bump the version and clean up the old IDs).
export const LEGACY_PRAYER_NOTIFICATION_CHANNEL_IDS: readonly string[] = [
	'jmn-prayer-start-adhaan-1-v3',
	'jmn-prayer-start-adhaan-2-v3',
	'jmn-prayer-start-adhaan-3-v3',
	'jmn-prayer-start-adhaan-1-silent-v2',
	'jmn-prayer-start-adhaan-2-silent-v2',
	'jmn-prayer-start-adhaan-3-silent-v2',
	'jmn-iqamah-start-v4',
	'jmn-iqamah-start-silent-v2',
	'jmn-prayer-alerts-v1',
];

export const IQAMAH_NOTIFICATION_CHANNEL_ID = 'jmn-iqamah-start-v5';
export const IQAMAH_NOTIFICATION_SILENT_CHANNEL_ID = 'jmn-iqamah-start-silent-v3';
export const PRAYER_AUDIO_NOTIFICATION_CATEGORY_ID = 'jmnPrayerAudio';
export const PRAYER_AUDIO_MUTE_ACTION_ID = 'jmnPrayerAudioMute';

export const PRAYER_NOTIFICATION_SCOPE = 'jmn-prayer';
export const PRAYER_NOTIFICATION_ROUTE = '/prayer';
export const PRAYER_NOTIFICATION_CHANNEL_ID = 'jmn-prayer-alerts-v2';
export const PRAYER_NOTIFICATION_SILENT_CHANNEL_ID = 'jmn-prayer-alerts-silent-v1';
export const PRAYER_START_NOTIFICATION_SOUND_FILE = ADHAAN_OPTIONS[0].soundFile;
export const IQAMAH_SOUND_FILE = 'iqamah_new.mp3';
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
export const DEFAULT_PRAYER_AUDIO_MUTED = false;
export const DEFAULT_IQAMAH_EXACT_SOUND_ENABLED = true;
export const DEFAULT_NOTIFICATION_LANGUAGE_PREFERENCE: NotificationLanguagePreference = 'english-first';
export const DEFAULT_SIMPLE_URDU_MODE = false;
