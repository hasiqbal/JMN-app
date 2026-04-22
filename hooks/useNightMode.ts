import { useContext } from 'react';
import { NightModeContext } from '@/contexts/NightModeContext';

export function useNightMode() {
  return useContext(NightModeContext);
}
