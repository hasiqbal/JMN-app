import React from 'react';

import { useNightMode } from './useNightMode';

export type QaseedahNightModePref = 'day' | 'night';

type QaseedahNightModeState = {
  nightMode: boolean;
  modePref: QaseedahNightModePref;
  manualOverride: boolean;
  toggleManual: () => void;
  setModePref: (pref: QaseedahNightModePref) => void;
};

let sessionModePref: QaseedahNightModePref | null = null;
let activeHookCount = 0;
let resetTimer: ReturnType<typeof setTimeout> | null = null;
const sessionListeners = new Set<(pref: QaseedahNightModePref | null) => void>();

function publishSessionModePref(pref: QaseedahNightModePref | null): void {
  sessionModePref = pref;
  sessionListeners.forEach((listener) => listener(pref));
}

function clearResetTimer(): void {
  if (!resetTimer) return;
  clearTimeout(resetTimer);
  resetTimer = null;
}

function scheduleResetWhenIdle(): void {
  clearResetTimer();
  resetTimer = setTimeout(() => {
    resetTimer = null;
    if (activeHookCount === 0) {
      publishSessionModePref(null);
    }
  }, 0);
}

export function useQaseedahNightMode(): QaseedahNightModeState {
  const { nightMode: appNightMode } = useNightMode();
  const appModePref: QaseedahNightModePref = appNightMode ? 'night' : 'day';
  const appModePrefRef = React.useRef(appModePref);
  const [modePref, setModePrefState] = React.useState<QaseedahNightModePref>(() => sessionModePref ?? appModePref);

  React.useEffect(() => {
    appModePrefRef.current = appModePref;
    if (sessionModePref === null) {
      setModePrefState(appModePref);
    }
  }, [appModePref]);

  React.useEffect(() => {
    const listener = (nextPref: QaseedahNightModePref | null) => {
      setModePrefState(nextPref ?? appModePrefRef.current);
    };
    sessionListeners.add(listener);
    return () => {
      sessionListeners.delete(listener);
    };
  }, []);

  React.useEffect(() => {
    activeHookCount += 1;
    clearResetTimer();

    return () => {
      activeHookCount = Math.max(0, activeHookCount - 1);
      if (activeHookCount === 0) {
        scheduleResetWhenIdle();
      }
    };
  }, []);

  const setModePref = React.useCallback((pref: QaseedahNightModePref) => {
    publishSessionModePref(pref);
  }, []);

  const toggleManual = React.useCallback(() => {
    const base = sessionModePref ?? appModePrefRef.current;
    const next: QaseedahNightModePref = base === 'night' ? 'day' : 'night';
    publishSessionModePref(next);
  }, []);

  return {
    nightMode: modePref === 'night',
    modePref,
    manualOverride: sessionModePref !== null,
    toggleManual,
    setModePref,
  };
}
