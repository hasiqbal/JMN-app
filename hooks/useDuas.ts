/**
 * useDuas.ts
 * Main state hook for DuasScreen.
 * Handles selected prayer time, sub-screen selection, flow activation,
 * and URL-param-driven deep navigation.
 * All logic is preserved exactly as it was in duas.tsx.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { PrayerTimeId, AdhkarSelection, PRAYER_TIMES } from '@/types/duasTypes';

export function useDuas() {
  const [selectedPrayerTime, setSelectedPrayerTime] = useState<PrayerTimeId>('after-fajr');
  const [fajrSelection, setFajrSelection] = useState<AdhkarSelection>(null);
  const [adhkarFlowActive, setAdhkarFlowActive] = useState(false);
  const [adhkarFlowStep, setAdhkarFlowStep] = useState<1 | 2 | 3 | 4>(1);
  const [asrFlowActive, setAsrFlowActive] = useState(false);
  const [asrFlowStep, setAsrFlowStep] = useState<1 | 2 | 3 | 4>(1);

  // Deep-link param handling (e.g. from Home "For You" cards)
  const { prayerTime: prayerTimeParam, group: groupParam } =
    useLocalSearchParams<{ prayerTime?: string; group?: string }>();
  const lastAppliedParam = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prayerTimeParam && prayerTimeParam !== lastAppliedParam.current) {
      lastAppliedParam.current = prayerTimeParam;
      // Normalise legacy 'after-dhuhr' param to 'after-zuhr'
      const normParam =
        prayerTimeParam === 'after-dhuhr' ? 'after-zuhr' : prayerTimeParam;
      if (PRAYER_TIMES.some(pt => pt.id === normParam)) {
        setSelectedPrayerTime(normParam as PrayerTimeId);
        setAdhkarFlowActive(false);
        setAsrFlowActive(false);
        if (groupParam) {
          setFajrSelection(groupParam);
        } else {
          setFajrSelection(null);
        }
      }
    }
  }, [prayerTimeParam, groupParam]);

  // Reset to root chip-bar when the tab is tapped again (on blur/focus cycle)
  useFocusEffect(
    useCallback(() => {
      return () => {
        // no-op on blur — intentionally kept to mirror original behaviour
      };
    }, [])
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  const resetToMain = useCallback(() => {
    setAdhkarFlowActive(false);
    setAdhkarFlowStep(1);
    setAsrFlowActive(false);
    setAsrFlowStep(1);
    setFajrSelection(null);
  }, []);

  const startAdhkarFlow = useCallback(() => {
    setAdhkarFlowActive(true);
    setAdhkarFlowStep(1);
    setFajrSelection(null);
    setSelectedPrayerTime('after-fajr');
  }, []);

  const exitAdhkarFlow = useCallback(() => {
    setAdhkarFlowActive(false);
    setAdhkarFlowStep(1);
  }, []);

  const startAsrFlow = useCallback(() => {
    setAsrFlowActive(true);
    setAsrFlowStep(1);
    setFajrSelection(null);
    setSelectedPrayerTime('after-asr');
  }, []);

  const exitAsrFlow = useCallback(() => {
    setAsrFlowActive(false);
    setAsrFlowStep(1);
  }, []);

  // Derived flag: any sub-screen active (drives "Back to Adhkar" bar visibility)
  const isSubScreenActive =
    asrFlowActive || adhkarFlowActive || fajrSelection !== null;

  return {
    // State
    selectedPrayerTime,
    setSelectedPrayerTime,
    fajrSelection,
    setFajrSelection,
    adhkarFlowActive,
    adhkarFlowStep,
    setAdhkarFlowStep,
    asrFlowActive,
    asrFlowStep,
    setAsrFlowStep,
    isSubScreenActive,
    // Actions
    resetToMain,
    startAdhkarFlow,
    exitAdhkarFlow,
    startAsrFlow,
    exitAsrFlow,
  };
}
