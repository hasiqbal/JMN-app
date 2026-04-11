import type { NightModePref } from '@/contexts/NightModeContext';

// Night mode removed — always day mode. Rebuild later.
export function useNightMode() {
  return {
    nightMode: false,
    modePref: 'day' as NightModePref,
    manualOverride: false,
    toggleManual: () => {},
    setModePref: (_pref: NightModePref) => {},
  };
}
