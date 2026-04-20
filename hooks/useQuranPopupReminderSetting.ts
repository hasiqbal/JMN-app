import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const QURAN_POPUP_REMINDERS_ENABLED_KEY = 'quran_popup_reminders_enabled_v1';

type ReminderSettingListener = (enabled: boolean) => void;
const reminderSettingListeners = new Set<ReminderSettingListener>();

function notifyReminderSettingListeners(enabled: boolean): void {
  reminderSettingListeners.forEach((listener) => {
    try {
      listener(enabled);
    } catch {
      // Keep notifying remaining listeners even if one handler fails.
    }
  });
}

export function subscribeQuranPopupReminderEnabled(listener: ReminderSettingListener): () => void {
  reminderSettingListeners.add(listener);
  return () => {
    reminderSettingListeners.delete(listener);
  };
}

export async function getQuranPopupReminderEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(QURAN_POPUP_REMINDERS_ENABLED_KEY);
    if (value === null) return true;
    return value === 'true';
  } catch {
    return true;
  }
}

export async function setQuranPopupReminderEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(QURAN_POPUP_REMINDERS_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore storage errors to avoid blocking UI interactions
  }

  notifyReminderSettingListeners(enabled);
}

export function useQuranPopupReminderSetting() {
  const [enabled, setEnabled] = React.useState(true);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    const unsubscribe = subscribeQuranPopupReminderEnabled((value) => {
      if (!active) return;
      setEnabled(value);
      setLoaded(true);
    });

    getQuranPopupReminderEnabled().then((value) => {
      if (!active) return;
      setEnabled(value);
      setLoaded(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const updateEnabled = React.useCallback(async (next: boolean) => {
    setEnabled(next);
    await setQuranPopupReminderEnabled(next);
  }, []);

  return { enabled, loaded, setEnabled: updateEnabled };
}
