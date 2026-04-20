import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const QURAN_POPUP_REMINDERS_ENABLED_KEY = 'quran_popup_reminders_enabled_v1';

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
}

export function useQuranPopupReminderSetting() {
  const [enabled, setEnabled] = React.useState(true);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    getQuranPopupReminderEnabled().then((value) => {
      if (!active) return;
      setEnabled(value);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateEnabled = React.useCallback(async (next: boolean) => {
    setEnabled(next);
    await setQuranPopupReminderEnabled(next);
  }, []);

  return { enabled, loaded, setEnabled: updateEnabled };
}
