import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  getJmnLiveStatusSnapshot,
  JmnLiveStatusSnapshot,
  JMN_LIVE_POLL_DEFAULT_MS,
  refreshJmnLiveStatus,
  subscribeJmnLiveStatus,
} from '@/services/liveService';

type UseJmnLiveStatusOptions = {
  enabled?: boolean;
  pollIntervalMs?: number;
  pauseInBackground?: boolean;
};

type UseJmnLiveStatusResult = JmnLiveStatusSnapshot & {
  refresh: () => Promise<void>;
};

export function useJmnLiveStatus(options: UseJmnLiveStatusOptions = {}): UseJmnLiveStatusResult {
  const {
    enabled = true,
    pollIntervalMs = JMN_LIVE_POLL_DEFAULT_MS,
    pauseInBackground = true,
  } = options;

  const [snapshot, setSnapshot] = useState<JmnLiveStatusSnapshot>(() => getJmnLiveStatusSnapshot());
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!pauseInBackground) return;

    const sub = AppState.addEventListener('change', (nextState) => {
      setAppState(nextState);
    });

    return () => sub.remove();
  }, [pauseInBackground]);

  const shouldSubscribe = enabled && (!pauseInBackground || appState === 'active');

  useEffect(() => {
    if (!shouldSubscribe) return;

    return subscribeJmnLiveStatus(setSnapshot, { pollIntervalMs });
  }, [pollIntervalMs, shouldSubscribe]);

  const refresh = useCallback(async () => {
    await refreshJmnLiveStatus();
  }, []);

  return useMemo(() => ({ ...snapshot, refresh }), [refresh, snapshot]);
}
