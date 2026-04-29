import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  isAdhaanMutedEnabled,
  isIqamahMutedEnabled,
  setAdhaanMutedEnabled,
  setIqamahMutedEnabled,
  stopActiveAdhaan,
} from '@/hooks/useQuranPrayerPopups';
import {
  ADHAAN_AUDIO_OPTIONS,
  ADHAAN_AUDIO_STORAGE_KEY,
  DEFAULT_ADHAAN_AUDIO_URL,
  IQAMAH_BACKGROUND_SOUND_FILE,
  PRAYER_JAMAAT_CHANNEL_ID,
  PRAYER_SILENT_CHANNEL_ID,
  getAdhaanOptionByUrl,
  getPrayerAdhaanChannelId,
  getPrayerAdhaanRecoveryChannelId,
  getPrayerAdhaanRecoveryNoExtChannelId,
  PRAYER_REMINDER_LIVE_ALERTS_STORAGE_KEY,
  isValidAdhaanAudioUrl,
} from '@/constants/prayerNotifications';
import { useInAppBanner } from '@/template';

type ExpoNotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<ExpoNotificationsModule | null> | null = null;

async function getNotificationsModule(): Promise<ExpoNotificationsModule | null> {
  if (Platform.OS === 'web') return null;
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((mod) => mod)
      .catch(() => null);
  }
  return notificationsModulePromise;
}

const LIVE_NOTIFICATION_CHANNEL_ID = 'jmn-live-v2';
const LIVE_NOTIFY_KEY = 'jmn_radio_notify';
const PRAYER_NOTIFICATION_CATEGORY_ID = 'jmn-prayer-controls';
const PRAYER_NOTIFICATION_SCOPE = 'jmn-prayer';
const BG_ADHAAN_TEST_LOG_KEY = 'jmn_bg_adhaan_test_log_v1';
const BG_IQAMAH_TEST_LOG_KEY = 'jmn_bg_iqamah_test_log_v1';

type AndroidChannelSnapshot = Awaited<ReturnType<ExpoNotificationsModule['getNotificationChannelAsync']>>;

function getChannelSoundLabel(channel: AndroidChannelSnapshot): string {
  if (!channel) return 'missing-channel';
  return channel.sound === null ? 'null' : String(channel.sound);
}

function getChannelVibrationLabel(channel: AndroidChannelSnapshot): string {
  if (!channel) return 'missing-channel';
  return Array.isArray(channel.vibrationPattern) && channel.vibrationPattern.length > 0 ? 'configured' : 'missing';
}

async function ensureAndroidSilentPrayerChannel(Notifications: ExpoNotificationsModule): Promise<void> {
  await Notifications.setNotificationChannelAsync(PRAYER_SILENT_CHANNEL_ID, {
    name: 'JMN Prayer Alerts (Silent)',
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
    vibrationPattern: [0, 80],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: null,
  }).catch(() => {});
}

async function ensureAndroidCustomPrayerChannel(args: {
  Notifications: ExpoNotificationsModule;
  channelId: string;
  name: string;
  sound: string;
}): Promise<AndroidChannelSnapshot> {
  const existingChannel = await args.Notifications
    .getNotificationChannelAsync(args.channelId)
    .catch(() => null);

  const shouldResetChannel = !!existingChannel && (
    existingChannel.sound === 'default'
    || existingChannel.sound == null
    || !Array.isArray(existingChannel.vibrationPattern)
    || existingChannel.vibrationPattern.length === 0
  );

  if (shouldResetChannel) {
    await args.Notifications.deleteNotificationChannelAsync(args.channelId).catch(() => {});
  }

  await args.Notifications.setNotificationChannelAsync(args.channelId, {
    name: args.name,
    importance: args.Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
    vibrationPattern: [0, 200, 120, 200],
    lockscreenVisibility: args.Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: args.sound,
  }).catch(() => {});

  return await args.Notifications.getNotificationChannelAsync(args.channelId).catch(() => null);
}

async function resolveAndroidAdhaanTestChannel(args: {
  Notifications: ExpoNotificationsModule;
  selectedOptionId: string;
  selectedSoundFile: string;
}): Promise<{
  channelId: string;
  notificationSound: string;
  channel: AndroidChannelSnapshot;
  failureDetails: string;
}> {
  const attempts = [
    {
      channelId: getPrayerAdhaanChannelId(args.selectedOptionId),
      name: 'JMN Adhaan Alerts',
      soundForChannel: args.selectedSoundFile,
      notificationSound: args.selectedSoundFile,
    },
    {
      channelId: getPrayerAdhaanRecoveryChannelId(args.selectedOptionId),
      name: 'JMN Adhaan Alerts (Recovery)',
      soundForChannel: args.selectedSoundFile,
      notificationSound: args.selectedSoundFile,
    },
    {
      channelId: getPrayerAdhaanRecoveryNoExtChannelId(args.selectedOptionId),
      name: 'JMN Adhaan Alerts (Recovery NoExt)',
      soundForChannel: args.selectedSoundFile.replace(/\.[^/.]+$/, ''),
      notificationSound: args.selectedSoundFile,
    },
  ] as const;

  const failureDetails: string[] = [];

  for (const attempt of attempts) {
    const channel = await ensureAndroidCustomPrayerChannel({
      Notifications: args.Notifications,
      channelId: attempt.channelId,
      name: attempt.name,
      sound: attempt.soundForChannel,
    });

    if (channel?.sound === 'custom') {
      return {
        channelId: attempt.channelId,
        notificationSound: attempt.notificationSound,
        channel,
        failureDetails: '',
      };
    }

    failureDetails.push(
      `${attempt.channelId}[expected=${attempt.soundForChannel},actual=${String(channel?.sound ?? null)}]`
    );
  }

  return {
    channelId: attempts[0].channelId,
    notificationSound: args.selectedSoundFile,
    channel: await args.Notifications.getNotificationChannelAsync(attempts[0].channelId).catch(() => null),
    failureDetails: failureDetails.join('; '),
  };
}

async function resolveAndroidIqamahTestChannel(args: {
  Notifications: ExpoNotificationsModule;
}): Promise<{
  channelId: string;
  notificationSound: string;
  channel: AndroidChannelSnapshot;
  failureDetails: string;
}> {
  const noExtIqamahSound = IQAMAH_BACKGROUND_SOUND_FILE.replace(/\.[^/.]+$/, '');
  const attempts = [
    {
      soundForChannel: IQAMAH_BACKGROUND_SOUND_FILE,
      name: 'JMN Jamaat Alerts',
    },
    {
      soundForChannel: noExtIqamahSound,
      name: 'JMN Jamaat Alerts (NoExt)',
    },
  ] as const;

  const failureDetails: string[] = [];

  for (const attempt of attempts) {
    const channel = await ensureAndroidCustomPrayerChannel({
      Notifications: args.Notifications,
      channelId: PRAYER_JAMAAT_CHANNEL_ID,
      name: attempt.name,
      sound: attempt.soundForChannel,
    });

    if (channel?.sound === 'custom') {
      return {
        channelId: PRAYER_JAMAAT_CHANNEL_ID,
        notificationSound: IQAMAH_BACKGROUND_SOUND_FILE,
        channel,
        failureDetails: '',
      };
    }

    failureDetails.push(
      `${PRAYER_JAMAAT_CHANNEL_ID}[expected=${attempt.soundForChannel},actual=${String(channel?.sound ?? null)}]`
    );
  }

  return {
    channelId: PRAYER_JAMAAT_CHANNEL_ID,
    notificationSound: IQAMAH_BACKGROUND_SOUND_FILE,
    channel: await args.Notifications.getNotificationChannelAsync(PRAYER_JAMAAT_CHANNEL_ID).catch(() => null),
    failureDetails: failureDetails.join('; '),
  };
}

type SwitchRowProps = {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accentColor: string;
  borderColor: string;
  textColor: string;
  hintColor: string;
};

function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
  disabled = false,
  accentColor,
  borderColor,
  textColor,
  hintColor,
}: SwitchRowProps) {
  return (
    <View style={[styles.switchRow, { borderBottomColor: borderColor }]}> 
      <View style={styles.switchTextWrap}>
        <Text style={[styles.switchLabel, { color: textColor }]}>{label}</Text>
        <Text style={[styles.switchHint, { color: hintColor }]}>{hint}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: borderColor, true: `${accentColor}80` }}
        thumbColor={value ? accentColor : hintColor}
        ios_backgroundColor={borderColor}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { darkMode, setDarkMode } = useAppTheme();
  const { showBanner } = useInAppBanner();

  const [liveNotifyEnabled, setLiveNotifyEnabled] = useState(false);
  const [prayerLiveAlertsEnabled, setPrayerLiveAlertsEnabled] = useState(true);
  const [adhaanMuted, setAdhaanMuted] = useState(false);
  const [iqamahMuted, setIqamahMuted] = useState(false);
  const [selectedAdhaanUrl, setSelectedAdhaanUrl] = useState(DEFAULT_ADHAAN_AUDIO_URL);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            bg: '#0A0F1E',
            card: '#121929',
            border: '#1E2D47',
            text: '#EEF3FC',
            sub: '#93B4D8',
            accent: '#69A8FF',
            chip: '#1A2640',
          }
        : {
            bg: Colors.background,
            card: Colors.surface,
            border: Colors.border,
            text: Colors.textPrimary,
            sub: Colors.textSecondary,
            accent: Colors.primary,
            chip: '#EDF5FF',
          },
    [darkMode],
  );

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      const [
        liveRaw,
        prayerLiveRaw,
        adhaanMutedValue,
        iqamahMutedValue,
        selectedAdhaanRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(LIVE_NOTIFY_KEY).catch(() => null),
        AsyncStorage.getItem(PRAYER_REMINDER_LIVE_ALERTS_STORAGE_KEY).catch(() => null),
        isAdhaanMutedEnabled(),
        isIqamahMutedEnabled(),
        AsyncStorage.getItem(ADHAAN_AUDIO_STORAGE_KEY).catch(() => null),
      ]);

      if (cancelled) return;

      setLiveNotifyEnabled(liveRaw === 'true');
      setPrayerLiveAlertsEnabled(prayerLiveRaw !== 'false');
      setAdhaanMuted(adhaanMutedValue);
      setIqamahMuted(iqamahMutedValue);
      setSelectedAdhaanUrl(isValidAdhaanAudioUrl(selectedAdhaanRaw) ? selectedAdhaanRaw : DEFAULT_ADHAAN_AUDIO_URL);
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const ensureLiveNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;

    const Notifications = await getNotificationsModule();
    if (!Notifications) return false;

    const current = await Notifications.getPermissionsAsync();
    let finalStatus = current.status;

    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(LIVE_NOTIFICATION_CHANNEL_ID, {
        name: 'JMN Live Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 150, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
      }).catch(() => {});
    }

    return true;
  }, []);

  const runAdhaanBackgroundTest = useCallback(async () => {
    if (Platform.OS === 'web') {
      showBanner('Adhaan test unavailable', 'Background notification tests are not supported on web.', 7000, 'warning');
      return;
    }

    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      showBanner('Adhaan test failed', 'Notifications module is unavailable on this runtime.', 8000, 'warning');
      return;
    }

    const current = await Notifications.getPermissionsAsync().catch(() => null);
    let status = current?.status ?? 'undetermined';
    const adhaanMutedNow = await isAdhaanMutedEnabled();
    const selectedAdhaanOption = getAdhaanOptionByUrl(selectedAdhaanUrl) ?? ADHAAN_AUDIO_OPTIONS[0];
    let activeAdhaanChannelId = getPrayerAdhaanChannelId(selectedAdhaanOption.id);
    let activeAdhaanSoundFile = selectedAdhaanOption.backgroundSoundFile;
    let resolvedChannel: AndroidChannelSnapshot = null;

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync().catch(() => null);
      status = requested?.status ?? status;
    }

    if (status !== 'granted') {
      const reason = 'Notifications permission is not granted.';
      await AsyncStorage.setItem(BG_ADHAAN_TEST_LOG_KEY, JSON.stringify({
        ts: new Date().toISOString(),
        ok: false,
        reason,
      })).catch(() => {});
      showBanner('Adhaan test failed', reason, 9000, 'warning');
      return;
    }

    if (Platform.OS === 'android') {
      if (adhaanMutedNow) {
        await ensureAndroidSilentPrayerChannel(Notifications);
        resolvedChannel = await Notifications.getNotificationChannelAsync(PRAYER_SILENT_CHANNEL_ID).catch(() => null);
      } else {
        const resolved = await resolveAndroidAdhaanTestChannel({
          Notifications,
          selectedOptionId: selectedAdhaanOption.id,
          selectedSoundFile: selectedAdhaanOption.backgroundSoundFile,
        });

        activeAdhaanChannelId = resolved.channelId;
        activeAdhaanSoundFile = resolved.notificationSound;
        resolvedChannel = resolved.channel;

        if (resolvedChannel?.sound !== 'custom') {
          const reason = resolved.failureDetails || `channel=${activeAdhaanChannelId}, actual=${String(resolvedChannel?.sound ?? null)}`;
          await AsyncStorage.setItem(BG_ADHAAN_TEST_LOG_KEY, JSON.stringify({
            ts: new Date().toISOString(),
            ok: false,
            reason,
          })).catch(() => {});
          showBanner(
            'Adhaan test setup failed',
            `Could not bind custom adhaan channel sound. ${reason}`,
            10000,
            'warning',
          );
          return;
        }
      }
    }

    const channelSound = Platform.OS === 'android'
      ? getChannelSoundLabel(resolvedChannel)
      : 'ios';

    const channelVibration = Platform.OS === 'android'
      ? getChannelVibrationLabel(resolvedChannel)
      : 'ios';

    const fireAt = new Date(Date.now() + 10_000);
    const trigger = Platform.OS === 'android'
      ? ({ type: 'date', date: fireAt, channelId: adhaanMutedNow ? PRAYER_SILENT_CHANNEL_ID : activeAdhaanChannelId } as unknown as import('expo-notifications').NotificationTriggerInput)
      : (fireAt as unknown as import('expo-notifications').NotificationTriggerInput);

    const scheduledId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Adhaan (10s)',
        body: `Background test: ${activeAdhaanSoundFile} should ring even if app is not open.`,
        sound: adhaanMutedNow ? false : activeAdhaanSoundFile,
        categoryIdentifier: PRAYER_NOTIFICATION_CATEGORY_ID,
        data: {
          scope: PRAYER_NOTIFICATION_SCOPE,
          type: 'prayer-start',
          prayerName: 'Test Adhaan',
          route: '/prayer',
        },
      },
      trigger,
    }).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      await AsyncStorage.setItem(BG_ADHAAN_TEST_LOG_KEY, JSON.stringify({
        ts: new Date().toISOString(),
        ok: false,
        reason: message,
      })).catch(() => {});
      showBanner('Adhaan test schedule error', message.slice(0, 200), 10000, 'warning');
      return null;
    });

    if (!scheduledId) return;

    const allScheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    const ownPrayerCount = allScheduled.filter((item) => {
      const data = item.content.data as Record<string, unknown> | undefined;
      return data?.scope === PRAYER_NOTIFICATION_SCOPE;
    }).length;

    const info = `ID ${scheduledId.slice(0, 8)}..., fires in 10s. Close app now.`;
    await AsyncStorage.setItem(BG_ADHAAN_TEST_LOG_KEY, JSON.stringify({
      ts: new Date().toISOString(),
      ok: true,
      scheduledId,
      scheduledCount: ownPrayerCount,
      fireAtIso: fireAt.toISOString(),
      channelSound,
      channelVibration,
      channelId: adhaanMutedNow ? PRAYER_SILENT_CHANNEL_ID : activeAdhaanChannelId,
    })).catch(() => {});

    const mutedInfo = adhaanMutedNow ? 'Muted is ON, so this test should be silent.' : 'Muted is OFF, so adhaan should play at fire time.';
    showBanner('Adhaan test scheduled', `${info} Prayer schedules: ${ownPrayerCount}. ${mutedInfo} Selected asset: ${activeAdhaanSoundFile}. Channel sound: ${channelSound}. Vibration: ${channelVibration}. Channel ID: ${adhaanMutedNow ? PRAYER_SILENT_CHANNEL_ID : activeAdhaanChannelId}.`, 10000);
  }, [selectedAdhaanUrl, showBanner]);

  const runIqamahBackgroundTest = useCallback(async () => {
    if (Platform.OS === 'web') {
      showBanner('Iqamah test unavailable', 'Background notification tests are not supported on web.', 7000, 'warning');
      return;
    }

    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      showBanner('Iqamah test failed', 'Notifications module is unavailable on this runtime.', 8000, 'warning');
      return;
    }

    const current = await Notifications.getPermissionsAsync().catch(() => null);
    let status = current?.status ?? 'undetermined';
    const iqamahMutedNow = await isIqamahMutedEnabled();
    let activeIqamahChannelId = PRAYER_JAMAAT_CHANNEL_ID;
    let activeIqamahSoundFile = IQAMAH_BACKGROUND_SOUND_FILE;
    let resolvedChannel: AndroidChannelSnapshot = null;

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync().catch(() => null);
      status = requested?.status ?? status;
    }

    if (status !== 'granted') {
      const reason = 'Notifications permission is not granted.';
      await AsyncStorage.setItem(BG_IQAMAH_TEST_LOG_KEY, JSON.stringify({
        ts: new Date().toISOString(),
        ok: false,
        reason,
      })).catch(() => {});
      showBanner('Iqamah test failed', reason, 9000, 'warning');
      return;
    }

    if (Platform.OS === 'android') {
      if (iqamahMutedNow) {
        await ensureAndroidSilentPrayerChannel(Notifications);
        resolvedChannel = await Notifications.getNotificationChannelAsync(PRAYER_SILENT_CHANNEL_ID).catch(() => null);
      } else {
        const resolved = await resolveAndroidIqamahTestChannel({ Notifications });
        activeIqamahChannelId = resolved.channelId;
        activeIqamahSoundFile = resolved.notificationSound;
        resolvedChannel = resolved.channel;

        if (resolvedChannel?.sound !== 'custom') {
          const reason = resolved.failureDetails || `channel=${activeIqamahChannelId}, actual=${String(resolvedChannel?.sound ?? null)}`;
          await AsyncStorage.setItem(BG_IQAMAH_TEST_LOG_KEY, JSON.stringify({
            ts: new Date().toISOString(),
            ok: false,
            reason,
          })).catch(() => {});
          showBanner(
            'Iqamah test setup failed',
            `Could not bind custom iqamah channel sound. ${reason}`,
            10000,
            'warning',
          );
          return;
        }
      }
    }

    const channelSound = Platform.OS === 'android'
      ? getChannelSoundLabel(resolvedChannel)
      : 'ios';

    const channelVibration = Platform.OS === 'android'
      ? getChannelVibrationLabel(resolvedChannel)
      : 'ios';

    const fireAt = new Date(Date.now() + 10_000);
    const trigger = Platform.OS === 'android'
      ? ({ type: 'date', date: fireAt, channelId: iqamahMutedNow ? PRAYER_SILENT_CHANNEL_ID : activeIqamahChannelId } as unknown as import('expo-notifications').NotificationTriggerInput)
      : (fireAt as unknown as import('expo-notifications').NotificationTriggerInput);

    const scheduledId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Iqamah (10s)',
        body: 'Background test: this should ring even if app is not open.',
        sound: iqamahMutedNow ? false : activeIqamahSoundFile,
        categoryIdentifier: PRAYER_NOTIFICATION_CATEGORY_ID,
        data: {
          scope: PRAYER_NOTIFICATION_SCOPE,
          type: 'jamaat-10',
          prayerName: 'Test Iqamah',
          route: '/prayer',
        },
      },
      trigger,
    }).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      await AsyncStorage.setItem(BG_IQAMAH_TEST_LOG_KEY, JSON.stringify({
        ts: new Date().toISOString(),
        ok: false,
        reason: message,
      })).catch(() => {});
      showBanner('Iqamah test schedule error', message.slice(0, 200), 10000, 'warning');
      return null;
    });

    if (!scheduledId) return;

    const allScheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    const ownPrayerCount = allScheduled.filter((item) => {
      const data = item.content.data as Record<string, unknown> | undefined;
      return data?.scope === PRAYER_NOTIFICATION_SCOPE;
    }).length;

    const info = `ID ${scheduledId.slice(0, 8)}..., fires in 10s. Close app now.`;
    await AsyncStorage.setItem(BG_IQAMAH_TEST_LOG_KEY, JSON.stringify({
      ts: new Date().toISOString(),
      ok: true,
      scheduledId,
      scheduledCount: ownPrayerCount,
      fireAtIso: fireAt.toISOString(),
      channelSound,
      channelVibration,
      channelId: iqamahMutedNow ? PRAYER_SILENT_CHANNEL_ID : activeIqamahChannelId,
    })).catch(() => {});

    const mutedInfo = iqamahMutedNow ? 'Muted is ON, so this test should be silent.' : 'Muted is OFF, so iqamah should play at fire time.';
    showBanner('Iqamah test scheduled', `${info} Prayer schedules: ${ownPrayerCount}. ${mutedInfo} Selected asset: ${activeIqamahSoundFile}. Channel sound: ${channelSound}. Vibration: ${channelVibration}. Channel ID: ${iqamahMutedNow ? PRAYER_SILENT_CHANNEL_ID : activeIqamahChannelId}.`, 10000);
  }, [showBanner]);

  const showLastAdhaanTestLog = useCallback(async () => {
    const raw = await AsyncStorage.getItem(BG_ADHAAN_TEST_LOG_KEY).catch(() => null);
    if (!raw) {
      showBanner('No test log found', 'Run the 10-second adhaan background test first.', 7000, 'warning');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        ts?: string;
        ok?: boolean;
        reason?: string;
        scheduledCount?: number;
        fireAtIso?: string;
        channelSound?: string;
        channelVibration?: string;
        channelId?: string;
      };

      if (parsed.ok) {
        showBanner(
          'Last test log',
          `Scheduled at ${parsed.ts ?? 'unknown'}. fireAt=${parsed.fireAtIso ?? 'n/a'}, count=${parsed.scheduledCount ?? 0}, channelSound=${parsed.channelSound ?? 'n/a'}, vibration=${parsed.channelVibration ?? 'n/a'}, channelId=${parsed.channelId ?? 'n/a'}.`,
          10000,
        );
      } else {
        showBanner(
          'Last test error',
          `${parsed.reason ?? 'Unknown error'} (at ${parsed.ts ?? 'unknown'}).`,
          10000,
          'warning',
        );
      }
    } catch {
      showBanner('Last test log', raw.slice(0, 200), 10000, 'warning');
    }
  }, [showBanner]);

  const showLastIqamahTestLog = useCallback(async () => {
    const raw = await AsyncStorage.getItem(BG_IQAMAH_TEST_LOG_KEY).catch(() => null);
    if (!raw) {
      showBanner('No iqamah test log found', 'Run the 10-second iqamah background test first.', 7000, 'warning');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        ts?: string;
        ok?: boolean;
        reason?: string;
        scheduledCount?: number;
        fireAtIso?: string;
        channelSound?: string;
        channelVibration?: string;
        channelId?: string;
      };

      if (parsed.ok) {
        showBanner(
          'Last iqamah test log',
          `Scheduled at ${parsed.ts ?? 'unknown'}. fireAt=${parsed.fireAtIso ?? 'n/a'}, count=${parsed.scheduledCount ?? 0}, channelSound=${parsed.channelSound ?? 'n/a'}, vibration=${parsed.channelVibration ?? 'n/a'}, channelId=${parsed.channelId ?? 'n/a'}.`,
          10000,
        );
      } else {
        showBanner(
          'Last iqamah test error',
          `${parsed.reason ?? 'Unknown error'} (at ${parsed.ts ?? 'unknown'}).`,
          10000,
          'warning',
        );
      }
    } catch {
      showBanner('Last iqamah test log', raw.slice(0, 200), 10000, 'warning');
    }
  }, [showBanner]);

  const onToggleLiveNotify = useCallback(
    async (value: boolean) => {
      if (!value) {
        setLiveNotifyEnabled(false);
        await AsyncStorage.setItem(LIVE_NOTIFY_KEY, 'false').catch(() => {});
        return;
      }

      const allowed = await ensureLiveNotificationPermission();
      setLiveNotifyEnabled(allowed);
      await AsyncStorage.setItem(LIVE_NOTIFY_KEY, String(allowed)).catch(() => {});
    },
    [ensureLiveNotificationPermission],
  );

  const onTogglePrayerLiveAlerts = useCallback(async (value: boolean) => {
    setPrayerLiveAlertsEnabled(value);
    const written = await AsyncStorage
      .setItem(PRAYER_REMINDER_LIVE_ALERTS_STORAGE_KEY, value ? 'true' : 'false')
      .then(() => true)
      .catch(() => false);

    if (!written) {
      setPrayerLiveAlertsEnabled((current) => !current);
    }
  }, []);

  const onToggleAdhaanMuted = useCallback(async (value: boolean) => {
    setAdhaanMuted(value);
    const ok = await setAdhaanMutedEnabled(value)
      .then(() => true)
      .catch(() => false);

    if (!ok) {
      setAdhaanMuted((current) => !current);
    }
  }, []);

  const onToggleIqamahMuted = useCallback(async (value: boolean) => {
    setIqamahMuted(value);
    const ok = await setIqamahMutedEnabled(value)
      .then(() => true)
      .catch(() => false);

    if (!ok) {
      setIqamahMuted((current) => !current);
    }
  }, []);

  const onSelectAdhaan = useCallback(async (url: string) => {
    setSelectedAdhaanUrl(url);
    const wrote = await AsyncStorage.setItem(ADHAAN_AUDIO_STORAGE_KEY, url)
      .then(() => true)
      .catch(() => false);

    if (!wrote) {
      showBanner('Adhaan selection failed', 'Could not save selected adhaan option.', 7000, 'warning');
      return;
    }

    showBanner('Adhaan updated', 'Selected adhaan will be used for in-app prayer audio.', 4500);
  }, [showBanner]);

  return (
    <View style={[styles.container, { backgroundColor: palette.bg, paddingTop: insets.top + 8 }]}> 
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(22, insets.bottom + 14) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: palette.sub }]}>Manage appearance, prayer reminders, and live alerts.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <View style={styles.cardHeader}>
            <MaterialIcons name="palette" size={18} color={palette.accent} />
            <Text style={[styles.cardTitle, { color: palette.text }]}>Appearance</Text>
          </View>

          <SwitchRow
            label="Day / Night mode"
            hint="This controls the Home and app shell theme."
            value={darkMode}
            onValueChange={setDarkMode}
            accentColor={palette.accent}
            borderColor={palette.border}
            textColor={palette.text}
            hintColor={palette.sub}
          />
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <View style={styles.cardHeader}>
            <MaterialIcons name="notifications-active" size={18} color={palette.accent} />
            <Text style={[styles.cardTitle, { color: palette.text }]}>Notifications</Text>
          </View>

          <View style={[styles.inlineNotice, { borderColor: palette.border, backgroundColor: palette.chip }]}> 
            <MaterialIcons name="info" size={14} color={palette.accent} />
            <Text style={[styles.inlineNoticeText, { color: palette.sub }]}>Iqamah reminder notification with iqamah MP3 is scheduled 10 minutes before each jamaat.</Text>
          </View>

          <SwitchRow
            label="Prayer reminders use live-style alerts"
            hint="When on, prayer reminders alert and vibrate like Live Radio notifications."
            value={prayerLiveAlertsEnabled}
            onValueChange={onTogglePrayerLiveAlerts}
            accentColor={palette.accent}
            borderColor={palette.border}
            textColor={palette.text}
            hintColor={palette.sub}
          />

          <SwitchRow
            label="Notify when live starts"
            hint="Get a local notification when JMN Radio goes live."
            value={liveNotifyEnabled}
            onValueChange={onToggleLiveNotify}
            accentColor={palette.accent}
            borderColor={palette.border}
            textColor={palette.text}
            hintColor={palette.sub}
          />
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <View style={styles.cardHeader}>
            <MaterialIcons name="volume-up" size={18} color={palette.accent} />
            <Text style={[styles.cardTitle, { color: palette.text }]}>Prayer Audio Controls</Text>
          </View>

          <Text style={[styles.switchHint, { color: palette.sub }]}>Choose your preferred adhaan recitation for in-app playback.</Text>

          <View style={styles.buttonRow}>
            {ADHAAN_AUDIO_OPTIONS.map((option) => {
              const selected = option.url === selectedAdhaanUrl;
              return (
                <TouchableOpacity
                  key={option.id}
                  activeOpacity={0.85}
                  style={[
                    styles.actionButton,
                    {
                      borderColor: selected ? palette.accent : palette.border,
                      backgroundColor: selected ? `${palette.accent}20` : palette.chip,
                    },
                  ]}
                  onPress={() => {
                    void onSelectAdhaan(option.url);
                  }}
                >
                  <MaterialIcons name={selected ? 'check-circle' : 'radio-button-unchecked'} size={16} color={selected ? palette.accent : palette.text} />
                  <Text style={[styles.actionButtonText, { color: palette.text }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.switchHint, { color: palette.sub }]}>Background notifications use bundled native sounds.</Text>

          <SwitchRow
            label="Mute adhaan audio"
            hint="Stops adhaan sound playback for in-app reminders."
            value={adhaanMuted}
            onValueChange={onToggleAdhaanMuted}
            accentColor={palette.accent}
            borderColor={palette.border}
            textColor={palette.text}
            hintColor={palette.sub}
          />

          <SwitchRow
            label="Mute iqamah audio"
            hint="Stops iqamah cue playback for in-app reminders."
            value={iqamahMuted}
            onValueChange={onToggleIqamahMuted}
            accentColor={palette.accent}
            borderColor={palette.border}
            textColor={palette.text}
            hintColor={palette.sub}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, { borderColor: palette.border, backgroundColor: palette.chip }]}
              onPress={() => {
                void stopActiveAdhaan();
              }}
            >
              <MaterialIcons name="stop" size={16} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>Stop active adhaan</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <View style={styles.cardHeader}>
            <MaterialIcons name="bug-report" size={18} color={palette.accent} />
            <Text style={[styles.cardTitle, { color: palette.text }]}>Adhaan Background Test</Text>
          </View>

          <Text style={[styles.switchHint, { color: palette.sub }]}>Press test, then close app immediately. It should ring in 10 seconds.</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, { borderColor: palette.border, backgroundColor: palette.chip }]}
              onPress={() => {
                void runAdhaanBackgroundTest();
              }}
            >
              <MaterialIcons name="alarm" size={16} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>Run 10s adhaan-only background test</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, { borderColor: palette.border, backgroundColor: palette.chip }]}
              onPress={() => {
                void showLastAdhaanTestLog();
              }}
            >
              <MaterialIcons name="receipt-long" size={16} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>Show last adhaan test error/log</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <View style={styles.cardHeader}>
            <MaterialIcons name="bug-report" size={18} color={palette.accent} />
            <Text style={[styles.cardTitle, { color: palette.text }]}>Iqamah Background Test</Text>
          </View>

          <Text style={[styles.switchHint, { color: palette.sub }]}>Press test, then close app immediately. It should ring in 10 seconds.</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, { borderColor: palette.border, backgroundColor: palette.chip }]}
              onPress={() => {
                void runIqamahBackgroundTest();
              }}
            >
              <MaterialIcons name="alarm" size={16} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>Run 10s iqamah background test</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, { borderColor: palette.border, backgroundColor: palette.chip }]}
              onPress={() => {
                void showLastIqamahTestLog();
              }}
            >
              <MaterialIcons name="receipt-long" size={16} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>Show last iqamah test error/log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    gap: 12,
  },
  header: {
    marginBottom: 2,
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  switchTextWrap: {
    flex: 1,
    gap: 2,
    paddingRight: 10,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  switchHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  inlineNotice: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  inlineNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  buttonRow: {
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
