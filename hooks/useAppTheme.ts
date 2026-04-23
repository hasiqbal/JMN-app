import { useContext } from 'react';
import { AppThemeContext } from '@/contexts/AppThemeContext';

export function useAppTheme() {
  return useContext(AppThemeContext);
}
