import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { syncPushTokenWithBackend } from '@/services/pushRegistrationService';
import {
  isAdhaanMutedEnabled,
  isIqamahMutedEnabled,
  setAdhaanMutedEnabled,
  setIqamahMutedEnabled,
  stopActiveAdhaan,
} from '@/hooks/useQuranPrayerPopups';
import { PRAYER_REMINDER_LIVE_ALERTS_STORAGE_KEY } from '@/constants/prayerNotifications';

type ExpoNotificationsModule = typeof import('expo-notifications');

const Notifications: ExpoNotificationsModule | null =
  Platform.OS === 'web' ? null : require('expo-notifications');

const LIVE_NOTIFICATION_CHANNEL_ID = 'jmn-live-v2';
const LIVE_NOTIFY_KEY = 'jmn_radio_notify';
const EXPO_GO_NOTIFICATIONS_FALLBACK =
  Constants.appOwnership === 'expo' &&
  Number((Constants.expoConfig?.sdkVersion ?? '0').split('.')[0] || 0) >= 53;

function formatPushSyncHint(reason: string | undefined): string {
  const value = (reason ?? '').trim();
  if (!value) return 'unknown';

  if (value.includes('firebase-not-configured')) {
    return 'Firebase is not configured for Android build. Add google-services.json and rebuild the dev app.';
  }

  if (value.includes('missing-project-id')) {
    return 'Expo EAS project id is missing from app config.';
  }

  if (value.includes('permission-blocked-open-settings')) {
    return 'Notifications are blocked at system level. Open system settings and allow notifications.';
  }

  if (value.includes('permission-not-granted')) {
    return 'Notification permission has not been granted yet.';
  }

  return value;
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

  const [liveNotifyEnabled, setLiveNotifyEnabled] = useState(false);
  const [prayerLiveAlertsEnabled, setPrayerLiveAlertsEnabled] = useState(true);
  const [adhaanMuted, setAdhaanMuted] = useState(false);
  const [iqamahMuted, setIqamahMuted] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState('unknown');
  const [pushPermissionHint, setPushPermissionHint] = useState('');

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
      const [liveRaw, prayerLiveRaw, adhaanMutedValue, iqamahMutedValue] = await Promise.all([
        AsyncStorage.getItem(LIVE_NOTIFY_KEY).catch(() => null),
        AsyncStorage.getItem(PRAYER_REMINDER_LIVE_ALERTS_STORAGE_KEY).catch(() => null),
        isAdhaanMutedEnabled(),
        isIqamahMutedEnabled(),
      ]);

      if (cancelled) return;

      setLiveNotifyEnabled(liveRaw === 'true');
      setPrayerLiveAlertsEnabled(prayerLiveRaw !== 'false');
      setAdhaanMuted(adhaanMutedValue);
      setIqamahMuted(iqamahMutedValue);
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshNotificationPermissionStatus = useCallback(async (): Promise<string> => {
    if (Platform.OS === 'web' || !Notifications) {
      setNotificationPermissionStatus('web');
      return 'web';
    }

    const current = await Notifications.getPermissionsAsync().catch(() => null);
    const status = current?.status ?? 'unknown';
    setNotificationPermissionStatus(status);
    return status;
  }, []);

  useEffect(() => {
    void refreshNotificationPermissionStatus();
  }, [refreshNotificationPermissionStatus]);

  const ensureLiveNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !Notifications) return false;
    if (EXPO_GO_NOTIFICATIONS_FALLBACK) return true;

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

  const onRequestNotificationPermission = useCallback(async () => {
    if (Platform.OS === 'web' || !Notifications) {
      setPushPermissionHint('Push notifications are not available on web.');
      return;
    }

    const requested = await Notifications.requestPermissionsAsync().catch(() => null);
    const status = requested?.status ?? 'unknown';
    setNotificationPermissionStatus(status);

    if (status !== 'granted') {
      if (requested?.canAskAgain === false) {
        setPushPermissionHint('Permission is blocked by system. Use Open System Settings.');
      } else {
        setPushPermissionHint('Permission not granted yet. Try again and accept the OS prompt.');
      }
      return;
    }

    const sync = await syncPushTokenWithBackend(Notifications);
    if (sync.synced) {
      setPushPermissionHint('Permission granted and this phone is now registered.');
      return;
    }

    setPushPermissionHint(`Permission granted, but token not synced: ${formatPushSyncHint(sync.reason)}`);
  }, []);

  const onOpenSystemSettings = useCallback(() => {
    Linking.openSettings()
      .then(() => {
        setPushPermissionHint('Opened system settings. Enable notifications, then return to the app.');
      })
      .catch(() => {
        setPushPermissionHint('Could not open settings automatically. Open app settings manually.');
      });
  }, []);

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

          <View style={[styles.inlineNotice, { backgroundColor: palette.chip, borderColor: palette.border }]}> 
            <MaterialIcons name="shield" size={14} color={palette.sub} />
            <View style={styles.permissionNoticeContent}>
              <Text style={[styles.inlineNoticeText, { color: palette.sub }]}>
                Push permission status: {notificationPermissionStatus}
              </Text>
              {pushPermissionHint ? (
                <Text style={[styles.inlineNoticeText, { color: palette.sub }]}>{pushPermissionHint}</Text>
              ) : null}
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, { borderColor: palette.border, backgroundColor: palette.chip }]}
              onPress={() => {
                void onRequestNotificationPermission();
              }}
            >
              <MaterialIcons name="notifications" size={16} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>Request notification permission</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, { borderColor: palette.border, backgroundColor: palette.chip }]}
              onPress={onOpenSystemSettings}
            >
              <MaterialIcons name="open-in-new" size={16} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>Open system settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.actionButton, { borderColor: palette.border, backgroundColor: palette.chip }]}
              onPress={() => {
                void refreshNotificationPermissionStatus();
              }}
            >
              <MaterialIcons name="refresh" size={16} color={palette.text} />
              <Text style={[styles.actionButtonText, { color: palette.text }]}>Refresh permission status</Text>
            </TouchableOpacity>
          </View>

          {EXPO_GO_NOTIFICATIONS_FALLBACK ? (
            <View style={[styles.inlineNotice, { backgroundColor: palette.chip, borderColor: palette.border }]}> 
              <MaterialIcons name="info" size={14} color={palette.sub} />
              <Text style={[styles.inlineNoticeText, { color: palette.sub }]}>
                Expo Go SDK 53+ shows in-app alerts. Use a development build for full system notifications.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <View style={styles.cardHeader}>
            <MaterialIcons name="volume-up" size={18} color={palette.accent} />
            <Text style={[styles.cardTitle, { color: palette.text }]}>Prayer Audio Controls</Text>
          </View>

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
  permissionNoticeContent: {
    flex: 1,
    gap: 2,
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
