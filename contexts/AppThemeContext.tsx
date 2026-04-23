import React, { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_DARK_MODE_KEY = 'jmn_app_dark_mode';

type AppThemeContextType = {
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
};

export const AppThemeContext = createContext<AppThemeContextType>({
  darkMode: false,
  setDarkMode: () => {},
  toggleDarkMode: () => {},
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(APP_DARK_MODE_KEY).then((raw) => {
      if (raw === 'true') setDarkModeState(true);
      if (raw === 'false') setDarkModeState(false);
    });
  }, []);

  const setDarkMode = useCallback((enabled: boolean) => {
    setDarkModeState(enabled);
    AsyncStorage.setItem(APP_DARK_MODE_KEY, enabled ? 'true' : 'false');
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkModeState((prev) => {
      const next = !prev;
      AsyncStorage.setItem(APP_DARK_MODE_KEY, next ? 'true' : 'false');
      return next;
    });
  }, []);

  return (
    <AppThemeContext.Provider value={{ darkMode, setDarkMode, toggleDarkMode }}>
      {children}
    </AppThemeContext.Provider>
  );
}
