import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  ADHAAN_OPTIONS,
  ADHAAN_SELECTION_STORAGE_KEY,
  BACKGROUND_PRAYER_NOTIFICATION_MODE_STORAGE_KEY,
  DEFAULT_IQAMAH_EXACT_SOUND_ENABLED,
  DEFAULT_PRAYER_AUDIO_MUTED,
  DEFAULT_ADHAAN_OPTION_ID,
  DEFAULT_BACKGROUND_PRAYER_NOTIFICATION_MODE,
  IQAMAH_EXACT_SOUND_ENABLED_STORAGE_KEY,
  PRAYER_AUDIO_MUTED_STORAGE_KEY,
  PRAYER_AUDIO_NOTIFICATION_CATEGORY_ID,
  PRAYER_NOTIFICATION_SCOPE,
  getAdhaanOptionById,
  getPrayerStartChannelId,
  type BackgroundPrayerNotificationMode,
} from '@/constants/prayerNotifications';
import { previewAdhaanOption } from '@/hooks/usePrayerAdhaanPlayer';
import { requestPrayerNotificationRefresh } from '@/services/prayerNotificationRefreshBus';
import { syncPushTokenWithBackend, YOUTUBE_LIVE_NOTIFY_KEY } from '@/services/pushRegistrationService';
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

const LIVE_NOTIFICATION_CHANNEL_ID = 'jmn-live-v3';
const LIVE_NOTIFY_KEY = 'jmn_radio_notify';
const PRAYER_TEST_LEAD_MS = 10 * 1000;
const ADHAAN_DEBUG_TAG = '[ADHAAN_DEBUG]';

function logAdhaanDebug(stage: string, payload: Record<string, unknown> = {}): void {
  const event = {
    ts: new Date().toISOString(),
    stage,
    ...payload,
  };

  try {
    console.log(`${ADHAAN_DEBUG_TAG} ${JSON.stringify(event)}`);
  } catch {
    console.log(ADHAAN_DEBUG_TAG, stage);
  }
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
  const [youtubeLiveNotifyEnabled, setYoutubeLiveNotifyEnabled] = useState(false);
  const [selectedAdhaanOptionId, setSelectedAdhaanOptionId] = useState<typeof DEFAULT_ADHAAN_OPTION_ID>(DEFAULT_ADHAAN_OPTION_ID);
  const [prayerAudioMuted, setPrayerAudioMuted] = useState(DEFAULT_PRAYER_AUDIO_MUTED);
  const [iqamahExactSoundEnabled, setIqamahExactSoundEnabled] = useState(DEFAULT_IQAMAH_EXACT_SOUND_ENABLED);
  const [backgroundPrayerNotificationMode, setBackgroundPrayerNotificationMode] = useState<BackgroundPrayerNotificationMode>(
    DEFAULT_BACKGROUND_PRAYER_NOTIFICATION_MODE,
  );

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
        youtubeLiveRaw,
        adhaanOptionRaw,
        prayerAudioMutedRaw,
        iqamahExactSoundRaw,
        backgroundPrayerNotificationModeRaw,
      ] = await Promise.all([
        AsyncStorage.getItem(LIVE_NOTIFY_KEY).catch(() => null),
        AsyncStorage.getItem(YOUTUBE_LIVE_NOTIFY_KEY).catch(() => null),
        AsyncStorage.getItem(ADHAAN_SELECTION_STORAGE_KEY).catch(() => null),
        AsyncStorage.getItem(PRAYER_AUDIO_MUTED_STORAGE_KEY).catch(() => null),
        AsyncStorage.getItem(IQAMAH_EXACT_SOUND_ENABLED_STORAGE_KEY).catch(() => null),
        AsyncStorage.getItem(BACKGROUND_PRAYER_NOTIFICATION_MODE_STORAGE_KEY).catch(() => null),
      ]);

      if (cancelled) return;

      setLiveNotifyEnabled(liveRaw === 'true');
      setYoutubeLiveNotifyEnabled(youtubeLiveRaw === 'true');
      setSelectedAdhaanOptionId(getAdhaanOptionById(adhaanOptionRaw).id);
      setPrayerAudioMuted(prayerAudioMutedRaw == null ? DEFAULT_PRAYER_AUDIO_MUTED : prayerAudioMutedRaw === 'true');
      setIqamahExactSoundEnabled(iqamahExactSoundRaw == null ? DEFAULT_IQAMAH_EXACT_SOUND_ENABLED : iqamahExactSoundRaw === 'true');
      setBackgroundPrayerNotificationMode(
        backgroundPrayerNotificationModeRaw === 'vibration-only'
          ? 'vibration-only'
          : DEFAULT_BACKGROUND_PRAYER_NOTIFICATION_MODE,
      );
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
        enableVibrate: true,
        vibrationPattern: [0, 250, 150, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: 'default',
      }).catch(() => {});
    }

    return true;
  }, []);

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

  const onToggleYouTubeLiveNotify = useCallback(
    async (value: boolean) => {
      const Notifications = await getNotificationsModule();
      if (!Notifications) {
        setYoutubeLiveNotifyEnabled(false);
        await AsyncStorage.setItem(YOUTUBE_LIVE_NOTIFY_KEY, 'false').catch(() => {});
        return;
      }

      if (!value) {
        setYoutubeLiveNotifyEnabled(false);
        const wrote = await AsyncStorage.setItem(YOUTUBE_LIVE_NOTIFY_KEY, 'false')
          .then(() => true)
          .catch(() => false);

        if (!wrote) {
          setYoutubeLiveNotifyEnabled(true);
          return;
        }

        const result = await syncPushTokenWithBackend(Notifications, { youtubeLiveEnabled: false }).catch(() => {
          return { synced: false, reason: 'exception' } as const;
        });

        if (!result.synced && result.reason !== 'throttled' && result.reason !== 'permission-not-granted') {
          showBanner(
            'YouTube live push saved locally',
            'Your device setting was updated. Backend sync will retry on the next refresh.',
            7000,
            'warning',
          );
        }
        return;
      }

      const allowed = await ensureLiveNotificationPermission();
      setYoutubeLiveNotifyEnabled(allowed);
      const wrote = await AsyncStorage.setItem(YOUTUBE_LIVE_NOTIFY_KEY, String(allowed))
        .then(() => true)
        .catch(() => false);

      if (!wrote) {
        setYoutubeLiveNotifyEnabled(false);
        return;
      }

      if (!allowed) {
        return;
      }

      const result = await syncPushTokenWithBackend(Notifications, { youtubeLiveEnabled: true }).catch(() => {
        return { synced: false, reason: 'exception' } as const;
      });

      if (!result.synced && result.reason !== 'throttled') {
        showBanner(
          'YouTube live push saved locally',
          'Push permission is enabled, but backend sync will retry on the next refresh.',
          7000,
          'warning',
        );
      }
    },
    [ensureLiveNotificationPermission, showBanner],
  );

  const onSelectAdhaanOption = useCallback(async (optionId: typeof DEFAULT_ADHAAN_OPTION_ID) => {
    const next = getAdhaanOptionById(optionId);
    setSelectedAdhaanOptionId(next.id);
    await AsyncStorage.setItem(ADHAAN_SELECTION_STORAGE_KEY, next.id).catch(() => {});
    showBanner('Adhaan selected', `${next.label} selected for prayer-start notifications.`, 4500);
  }, [showBanner]);

  const onPreviewAdhaanOption = useCallback(async (optionId: typeof DEFAULT_ADHAAN_OPTION_ID) => {
    if (prayerAudioMuted) {
      showBanner('Prayer audio is muted', 'Disable vibration-only mode to preview adhaan.', 5000, 'warning');
      return;
    }
    const ok = await previewAdhaanOption(optionId);
    if (!ok) {
      showBanner('Preview unavailable', 'Could not play adhaan preview on this device right now.', 7000, 'warning');
    }
  }, [prayerAudioMuted, showBanner]);

  const onTogglePrayerAudioMuted = useCallback(async (value: boolean) => {
    setPrayerAudioMuted(value);
    await AsyncStorage.setItem(PRAYER_AUDIO_MUTED_STORAGE_KEY, String(value)).catch(() => {});
    requestPrayerNotificationRefresh();
    if (value) {
      showBanner('Prayer audio muted', 'All adhaan and iqamah sounds are off (foreground and background).', 6000);
      return;
    }
    showBanner('Prayer audio unmuted', 'Adhaan and iqamah sounds are enabled again (based on your background mode).', 5000);
  }, [showBanner]);

  const onToggleIqamahExactSoundEnabled = useCallback(async (value: boolean) => {
    setIqamahExactSoundEnabled(value);
    await AsyncStorage.setItem(IQAMAH_EXACT_SOUND_ENABLED_STORAGE_KEY, String(value)).catch(() => {});
    requestPrayerNotificationRefresh();
    if (value) {
      showBanner('Exact iqamah sound enabled', 'Iqamah sound will play at exact iqamah time.', 5000);
      return;
    }
    showBanner('Exact iqamah set to vibration', 'At exact iqamah time, notification will vibrate only.', 6000);
  }, [showBanner]);

  const onSelectBackgroundPrayerNotificationMode = useCallback(async (nextMode: BackgroundPrayerNotificationMode) => {
    setBackgroundPrayerNotificationMode(nextMode);
    await AsyncStorage.setItem(BACKGROUND_PRAYER_NOTIFICATION_MODE_STORAGE_KEY, nextMode).catch(() => {});
    requestPrayerNotificationRefresh();

    if (nextMode === 'vibration-only') {
      showBanner('Background mode set', 'Prayer notifications in background will vibrate only.', 5500);
      return;
    }

    showBanner('Background mode set', 'Prayer notifications in background will use sound + vibration.', 5500);
  }, [showBanner]);

  const runBackgroundAdhaanTest = useCallback(async () => {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      logAdhaanDebug('test-abort-notifications-module-missing');
      showBanner('Adhaan test unavailable', 'Notifications module is unavailable on this runtime.', 7000, 'warning');
      return;
    }

    const allowed = await ensureLiveNotificationPermission();
    if (!allowed) {
      logAdhaanDebug('test-abort-permission-denied');
      showBanner('Permission required', 'Enable notifications first to run adhaan background test.', 7000, 'warning');
      return;
    }

    const selectedAdhaanOption = getAdhaanOptionById(selectedAdhaanOptionId);
    const backgroundSilent = backgroundPrayerNotificationMode === 'vibration-only';
    const prayerStartSilent = prayerAudioMuted || backgroundSilent;
    const prayerStartChannelId = getPrayerStartChannelId(selectedAdhaanOption.id, prayerStartSilent);

    logAdhaanDebug('test-start', {
      selectedAdhaanOptionId: selectedAdhaanOption.id,
      selectedSoundFile: selectedAdhaanOption.soundFile,
      prayerAudioMuted,
      backgroundPrayerNotificationMode,
      prayerStartChannelId,
    });

    if (Platform.OS === 'android') {
      const channelsBefore = await Notifications.getNotificationChannelsAsync().catch(() => []);
      logAdhaanDebug('android-channels-before-cleanup', {
        channels: channelsBefore
          .filter((channel) => channel.id.includes('jmn-prayer-start-adhaan'))
          .map((channel) => ({ id: channel.id, sound: channel.sound ?? null, name: channel.name })),
      });

      // Always delete the audio variant before re-creating it so any stale
      // sound binding on the channel is discarded. Android caches the sound
      // chosen at first creation and never updates it later, so a fresh
      // delete + create is the only reliable way to guarantee the selected
      // adhaan plays for the test.
      if (!prayerStartSilent) {
        await Notifications.deleteNotificationChannelAsync(prayerStartChannelId).catch(() => {});
      }

      await Notifications.setNotificationChannelAsync(prayerStartChannelId, {
        name: prayerStartSilent
          ? `Prayer Start Adhaan ${selectedAdhaanOption.id} (Vibration Only)`
          : `Prayer Start Adhaan ${selectedAdhaanOption.id}`,
        importance: Notifications.AndroidImportance.HIGH,
        enableVibrate: true,
        vibrationPattern: [0, 220, 140, 220],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: prayerStartSilent ? null : selectedAdhaanOption.soundFile,
      }).catch(() => {});

      const channelsAfter = await Notifications.getNotificationChannelsAsync().catch(() => []);
      logAdhaanDebug('android-channels-after-setup', {
        channels: channelsAfter
          .filter((channel) => channel.id.includes('jmn-prayer-start-adhaan'))
          .map((channel) => ({ id: channel.id, sound: channel.sound ?? null, name: channel.name })),
      });
    }

    const fireAt = new Date(Date.now() + PRAYER_TEST_LEAD_MS);
    const testRunId = `manual-adhaan-test-${Date.now()}`;
    const trigger = Platform.OS === 'android'
      ? ({ type: 'date', date: fireAt, channelId: prayerStartChannelId } as unknown as import('expo-notifications').NotificationTriggerInput)
      : (fireAt as unknown as import('expo-notifications').NotificationTriggerInput);

    const scheduled = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Adhaan test (10s)',
        body: prayerStartSilent
          ? 'Background test for vibration-only prayer-start notification.'
          : 'Background test for prayer-start adhaan sound.',
        sound: prayerStartSilent ? false : selectedAdhaanOption.soundFile,
        categoryIdentifier: PRAYER_AUDIO_NOTIFICATION_CATEGORY_ID,
        data: {
          scope: PRAYER_NOTIFICATION_SCOPE,
          type: 'prayer-start',
          prayerName: 'Test',
          route: '/prayer',
          testRunId,
          expectedChannelId: prayerStartChannelId,
          expectedSoundFile: prayerStartSilent ? null : selectedAdhaanOption.soundFile,
        },
      },
      trigger,
    }).catch(() => null);

    if (!scheduled) {
      logAdhaanDebug('test-schedule-failed', {
        selectedAdhaanOptionId: selectedAdhaanOption.id,
        selectedSoundFile: selectedAdhaanOption.soundFile,
        prayerStartChannelId,
      });
      showBanner('Adhaan test failed', 'Could not schedule background adhaan test notification.', 7000, 'warning');
      return;
    }

    logAdhaanDebug('test-scheduled', {
      notificationId: scheduled,
      fireAtIso: fireAt.toISOString(),
      selectedAdhaanOptionId: selectedAdhaanOption.id,
      selectedSoundFile: selectedAdhaanOption.soundFile,
      prayerAudioMuted,
      backgroundPrayerNotificationMode,
      prayerStartChannelId,
      contentSound: prayerStartSilent ? false : selectedAdhaanOption.soundFile,
      testRunId,
    });

    showBanner('Adhaan test scheduled', 'Notification will fire in ~10 seconds. Lock the phone now to test background adhaan.', 9000);
  }, [
    backgroundPrayerNotificationMode,
    ensureLiveNotificationPermission,
    prayerAudioMuted,
    selectedAdhaanOptionId,
    showBanner,
  ]);

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
          <Text style={[styles.subtitle, { color: palette.sub }]}>Manage appearance and live alerts.</Text>
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

          <Text style={[styles.switchHint, { color: palette.sub }]}>Choose one of 3 adhaan options and preview before selecting.</Text>
          <Text style={[styles.switchHint, { color: palette.sub }]}>Current background mode: {backgroundPrayerNotificationMode === 'vibration-only' ? '2. Vibration only' : '1. Sound + vibration'}</Text>

          <View style={styles.optionList}>
            {ADHAAN_OPTIONS.map((option) => {
              const selected = option.id === selectedAdhaanOptionId;
              return (
                <View key={option.id} style={[styles.optionRow, { borderColor: palette.border }]}> 
                  <Text style={[styles.optionLabel, { color: palette.text }]}>{option.label}</Text>
                  <View style={styles.optionActions}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.smallButton, { borderColor: palette.border, backgroundColor: palette.chip }]}
                      onPress={() => {
                        void onPreviewAdhaanOption(option.id);
                      }}
                    >
                      <MaterialIcons name="play-arrow" size={16} color={palette.text} />
                      <Text style={[styles.smallButtonText, { color: palette.text }]}>Preview</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[
                        styles.smallButton,
                        {
                          borderColor: selected ? palette.accent : palette.border,
                          backgroundColor: selected ? `${palette.accent}20` : palette.chip,
                        },
                      ]}
                      onPress={() => {
                        void onSelectAdhaanOption(option.id);
                      }}
                    >
                      <MaterialIcons name={selected ? 'check-circle' : 'radio-button-unchecked'} size={16} color={selected ? palette.accent : palette.text} />
                      <Text style={[styles.smallButtonText, { color: palette.text }]}>{selected ? 'Selected' : 'Use'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          <SwitchRow
            label="Mute all adhaan and iqamah sounds"
            hint="Applies everywhere: foreground and background."
            value={prayerAudioMuted}
            onValueChange={onTogglePrayerAudioMuted}
            accentColor={palette.accent}
            borderColor={palette.border}
            textColor={palette.text}
            hintColor={palette.sub}
          />

          <View style={[styles.optionRow, { borderColor: palette.border }]}> 
            <View style={styles.switchTextWrap}>
              <Text style={[styles.switchLabel, { color: palette.text }]}>Background prayer notification mode</Text>
              <Text style={[styles.switchHint, { color: palette.sub }]}>1. Sound + vibration  2. Vibration only</Text>
            </View>
            <View style={styles.optionActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.smallButton,
                  {
                    borderColor: backgroundPrayerNotificationMode === 'sound' ? palette.accent : palette.border,
                    backgroundColor: backgroundPrayerNotificationMode === 'sound' ? `${palette.accent}20` : palette.chip,
                  },
                ]}
                onPress={() => {
                  void onSelectBackgroundPrayerNotificationMode('sound');
                }}
              >
                <Text style={[styles.smallButtonText, { color: palette.text }]}>1. Sound + vibe</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.smallButton,
                  {
                    borderColor: backgroundPrayerNotificationMode === 'vibration-only' ? palette.accent : palette.border,
                    backgroundColor: backgroundPrayerNotificationMode === 'vibration-only' ? `${palette.accent}20` : palette.chip,
                  },
                ]}
                onPress={() => {
                  void onSelectBackgroundPrayerNotificationMode('vibration-only');
                }}
              >
                <Text style={[styles.smallButtonText, { color: palette.text }]}>2. Vibration only</Text>
              </TouchableOpacity>
            </View>
          </View>

          <SwitchRow
            label="Exact iqamah: play sound"
            hint="If off, exact iqamah notification uses vibration only."
            value={iqamahExactSoundEnabled}
            onValueChange={onToggleIqamahExactSoundEnabled}
            disabled={prayerAudioMuted}
            accentColor={palette.accent}
            borderColor={palette.border}
            textColor={palette.text}
            hintColor={palette.sub}
          />

          <SwitchRow
            label="Notify when radio goes live"
            hint="Get a local notification when JMN Radio goes live on this device."
            value={liveNotifyEnabled}
            onValueChange={onToggleLiveNotify}
            accentColor={palette.accent}
            borderColor={palette.border}
            textColor={palette.text}
            hintColor={palette.sub}
          />

          <SwitchRow
            label="Notify when YouTube goes live"
            hint="Receive a phone push notification when JMN starts a YouTube live stream."
            value={youtubeLiveNotifyEnabled}
            onValueChange={onToggleYouTubeLiveNotify}
            accentColor={palette.accent}
            borderColor={palette.border}
            textColor={palette.text}
            hintColor={palette.sub}
          />

          {__DEV__ && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, { borderColor: palette.border, backgroundColor: palette.chip }]}
              onPress={() => {
                void runBackgroundAdhaanTest();
              }}
            >
              <MaterialIcons name="alarm" size={16} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>Run 10s background adhaan test</Text>
            </TouchableOpacity>
          )}
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
  actionButton: {
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 42,
    marginTop: 10,
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
  optionList: {
    gap: 8,
    marginTop: 8,
  },
  optionRow: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  smallButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
