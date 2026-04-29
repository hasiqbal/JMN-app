import React, { createContext, useEffect, useCallback, ReactNode, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppThemeContext } from '@/contexts/AppThemeContext';

const NIGHT_MODE_KEY = 'jmn_night_mode_pref'; // 'day' | 'night'
const APP_DARK_MODE_KEY = 'jmn_app_dark_mode'; // 'true' | 'false'

export type NightModePref = 'day' | 'night';

interface NightModeContextType {
  nightMode: boolean;
  modePref: NightModePref;
  manualOverride: boolean;
  toggleManual: () => void;
  setModePref: (pref: NightModePref) => void;
}

export const NightModeContext = createContext<NightModeContextType>({
  nightMode: false,
  modePref: 'day',
  manualOverride: true,
  toggleManual: () => {},
  setModePref: () => {},
});

export function NightModeProvider({ children }: { children: ReactNode }) {
  const { darkMode, setDarkMode, toggleDarkMode } = useContext(AppThemeContext);
  const migratedRef = useRef(false);

  // One-time migration from legacy preference key to the shared app theme key.
  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;

    const migrateLegacyNightMode = async () => {
      try {
        const [appThemeRaw, legacyNightRaw] = await Promise.all([
          AsyncStorage.getItem(APP_DARK_MODE_KEY),
          AsyncStorage.getItem(NIGHT_MODE_KEY),
        ]);

        if ((appThemeRaw === 'true' || appThemeRaw === 'false') || !legacyNightRaw) return;

        if (legacyNightRaw === 'night') setDarkMode(true);
        if (legacyNightRaw === 'day') setDarkMode(false);
      } catch {
        // Keep defaults if storage is unavailable.
      }
    };

    void migrateLegacyNightMode();
  }, [setDarkMode]);

  // Keep legacy key in sync so older consumers remain consistent.
  useEffect(() => {
    AsyncStorage.setItem(NIGHT_MODE_KEY, darkMode ? 'night' : 'day').catch(() => {});
  }, [darkMode]);

  const modePref: NightModePref = darkMode ? 'night' : 'day';
  const nightMode = darkMode;
  const manualOverride = true;

  const toggleManual = useCallback(() => {
    toggleDarkMode();
  }, [toggleDarkMode]);

  const setModePref = useCallback((pref: NightModePref) => {
    setDarkMode(pref === 'night');
  }, [setDarkMode]);

  return (
    <NightModeContext.Provider value={{ nightMode, modePref, manualOverride, toggleManual, setModePref }}>
      {children}
    </NightModeContext.Provider>
  );
}
