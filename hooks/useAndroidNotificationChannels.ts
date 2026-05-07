import { Platform } from 'react-native';
import {
  ADHKAR_NOTIFICATION_CHANNEL_ID,
  ADHKAR_NOTIFICATION_SILENT_CHANNEL_ID,
  getAdhaanOptionById,
  getPrayerStartChannelId,
  IQAMAH_NOTIFICATION_CHANNEL_ID,
  IQAMAH_NOTIFICATION_SILENT_CHANNEL_ID,
  IQAMAH_SOUND_FILE,
  LEGACY_PRAYER_NOTIFICATION_CHANNEL_IDS,
  PRAYER_NOTIFICATION_CHANNEL_ID,
  PRAYER_NOTIFICATION_SILENT_CHANNEL_ID,
  type AdhkarReminderSoundMode,
} from '@/constants/prayerNotifications';

export type ExpoNotificationsModule = typeof import('expo-notifications');

const LIVE_NOTIFICATION_CHANNEL_ID = 'jmn-live-v3';

let notificationsModulePromise: Promise<ExpoNotificationsModule | null> | null = null;

export async function getNotificationsModule(): Promise<ExpoNotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((mod) => mod)
      .catch(() => null);
  }
  return notificationsModulePromise;
}

export async function ensureAndroidLiveNotificationChannel(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications || Platform.OS !== 'android') return;

  try {
    try {
      await Notifications.deleteNotificationChannelAsync(LIVE_NOTIFICATION_CHANNEL_ID);
    } catch {
      // ignore
    }

    await Notifications.setNotificationChannelAsync(LIVE_NOTIFICATION_CHANNEL_ID, {
      name: 'JMN Live Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });
  } catch (error) {
    if (__DEV__) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[notif] set live channel failed', message);
    }
  }
}

export async function deleteLegacyPrayerNotificationChannels(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications || Platform.OS !== 'android') return;

  for (const channelId of LEGACY_PRAYER_NOTIFICATION_CHANNEL_IDS) {
    try {
      await Notifications.deleteNotificationChannelAsync(channelId);
    } catch {
      // ignore - channel may not exist
    }
  }
}

export async function ensureAndroidPrayerNotificationChannel(selectedAdhaanOptionId: '1' | '2' | '3'): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications || Platform.OS !== 'android') return;

  const selectedOption = getAdhaanOptionById(selectedAdhaanOptionId);
  const prayerStartChannelId = getPrayerStartChannelId(selectedOption.id, false);
  const prayerStartSilentChannelId = getPrayerStartChannelId(selectedOption.id, true);

  try {
    // Force a clean rebind of audio channels so any stale Android sound cache
    // (which is keyed per channel and never updated after first creation) is discarded.
    try {
      await Notifications.deleteNotificationChannelAsync(prayerStartChannelId);
    } catch {
      // ignore
    }
    try {
      await Notifications.deleteNotificationChannelAsync(prayerStartSilentChannelId);
    } catch {
      // ignore
    }
    try {
      await Notifications.deleteNotificationChannelAsync(IQAMAH_NOTIFICATION_CHANNEL_ID);
    } catch {
      // ignore
    }
    try {
      await Notifications.deleteNotificationChannelAsync(IQAMAH_NOTIFICATION_SILENT_CHANNEL_ID);
    } catch {
      // ignore
    }

    await Notifications.setNotificationChannelAsync(PRAYER_NOTIFICATION_CHANNEL_ID, {
      name: 'Prayer Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 220, 140, 220],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync(PRAYER_NOTIFICATION_SILENT_CHANNEL_ID, {
      name: 'Prayer Reminders (Vibration Only)',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 220, 140, 220],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null,
    });

    await Notifications.setNotificationChannelAsync(prayerStartChannelId, {
      name: `Prayer Start Adhaan ${selectedOption.id}`,
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 220, 140, 220],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: selectedOption.soundFile,
    });

    await Notifications.setNotificationChannelAsync(prayerStartSilentChannelId, {
      name: `Prayer Start Adhaan ${selectedOption.id} (Vibration Only)`,
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 220, 140, 220],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null,
    });

    await Notifications.setNotificationChannelAsync(IQAMAH_NOTIFICATION_CHANNEL_ID, {
      name: 'Iqamah Start',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 220, 140, 220],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: IQAMAH_SOUND_FILE,
    });

    await Notifications.setNotificationChannelAsync(IQAMAH_NOTIFICATION_SILENT_CHANNEL_ID, {
      name: 'Iqamah Start (Vibration Only)',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 220, 140, 220],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null,
    });
  } catch (error) {
    if (__DEV__) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[notif] set prayer channel failed', message);
    }
  }
}

export async function ensureAndroidAdhkarNotificationChannels(
  soundMode: AdhkarReminderSoundMode,
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications || Platform.OS !== 'android') return;

  try {
    try {
      await Notifications.deleteNotificationChannelAsync(ADHKAR_NOTIFICATION_CHANNEL_ID);
    } catch {
      // ignore
    }
    try {
      await Notifications.deleteNotificationChannelAsync(ADHKAR_NOTIFICATION_SILENT_CHANNEL_ID);
    } catch {
      // ignore
    }

    await Notifications.setNotificationChannelAsync(ADHKAR_NOTIFICATION_CHANNEL_ID, {
      name: 'Adhkar Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: true,
      vibrationPattern: [0, 150, 100, 150],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync(ADHKAR_NOTIFICATION_SILENT_CHANNEL_ID, {
      name: 'Adhkar Reminders (Silent)',
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: true,
      vibrationPattern: [0, 150, 100, 150],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null,
    });
  } catch (error) {
    if (__DEV__) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[notif] set adhkar channels failed', message, { soundMode });
    }
  }
}
