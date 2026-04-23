import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NIGHT_MODE_KEY = 'jmn_night_mode_pref'; // 'day' | 'night'

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
  const [modePref, setModePrefState] = useState<NightModePref>('day');

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(NIGHT_MODE_KEY).then(val => {
      if (val === 'day' || val === 'night') {
        setModePrefState(val);
      }
    });
  }, []);

  const nightMode = modePref === 'night';
  const manualOverride = true;

  const toggleManual = useCallback(() => {
    setModePrefState(prev => {
      const next: NightModePref = prev === 'night' ? 'day' : 'night';
      AsyncStorage.setItem(NIGHT_MODE_KEY, next);
      return next;
    });
  }, []);

  const setModePref = useCallback((pref: NightModePref) => {
    setModePrefState(pref);
    AsyncStorage.setItem(NIGHT_MODE_KEY, pref);
  }, []);

  return (
    <NightModeContext.Provider value={{ nightMode, modePref, manualOverride, toggleManual, setModePref }}>
      {children}
    </NightModeContext.Provider>
  );
}
