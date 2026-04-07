import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPrayerTimesFromTimetable } from '@/services/prayerService';

const NIGHT_MODE_KEY = 'jmn_night_mode_pref'; // 'auto' | 'day' | 'night'

export type NightModePref = 'auto' | 'day' | 'night';

interface NightModeContextType {
  nightMode: boolean;
  modePref: NightModePref;
  manualOverride: boolean;
  toggleManual: () => void;
  setModePref: (pref: NightModePref) => void;
}

export const NightModeContext = createContext<NightModeContextType>({
  nightMode: false,
  modePref: 'auto',
  manualOverride: false,
  toggleManual: () => {},
  setModePref: () => {},
});

function isAutoNightPeriod(): boolean {
  try {
    const data = getPrayerTimesFromTimetable();
    if (!data) return false;
    const now = new Date();
    const maghrib = data.prayers.find(p => p.name === 'Maghrib');
    const fajr = data.prayers.find(p => p.name === 'Fajr');
    if (!maghrib || !fajr) return false;
    return now >= maghrib.timeDate || now < fajr.timeDate;
  } catch {
    return false;
  }
}

export function NightModeProvider({ children }: { children: ReactNode }) {
  const [autoNight, setAutoNight] = useState(isAutoNightPeriod);
  const [modePref, setModePrefState] = useState<NightModePref>('auto');

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(NIGHT_MODE_KEY).then(val => {
      if (val === 'day' || val === 'night' || val === 'auto') {
        setModePrefState(val);
      }
    });
  }, []);

  // Re-check auto every 30s
  useEffect(() => {
    const id = setInterval(() => setAutoNight(isAutoNightPeriod()), 30000);
    return () => clearInterval(id);
  }, []);

  const nightMode =
    modePref === 'night' ? true :
    modePref === 'day'   ? false :
    autoNight;

  const manualOverride = modePref !== 'auto';

  // Legacy toggle: cycles day → night → auto
  const toggleManual = useCallback(() => {
    setModePrefState(prev => {
      const next: NightModePref =
        prev === 'auto'  ? (autoNight ? 'day' : 'night') :
        prev === 'night' ? 'day' :
        'night';
      AsyncStorage.setItem(NIGHT_MODE_KEY, next);
      return next;
    });
  }, [autoNight]);

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
