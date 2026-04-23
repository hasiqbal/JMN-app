import { APP_CONFIG } from '@/constants/config';
import { getSupabaseClient } from '@/template';

const MYMASJID_STATUS_FUNCTION = 'mymasjid-live-status';

export const JMN_LIVE_POLL_MIN_MS = 2000;
export const JMN_LIVE_POLL_MAX_MS = 5000;
export const JMN_LIVE_POLL_DEFAULT_MS = 3000;

type MyMasjidApiResponse = {
  success?: boolean;
  error?: string;
  isLive?: boolean;
  masjidIsOnline?: number | string | boolean | null;
  audioLink?: string;
  checkedAt?: string | number | null;
  links?: {
    masjid_audio_link?: string | null;
  } | null;
};

export type JmnLiveStatus = {
  isLive: boolean;
  audioLink: string;
  checkedAt: number;
};

export type JmnLiveStatusSnapshot = {
  isLive: boolean;
  audioLink: string;
  checkedAt: number | null;
  transitionedToLive: boolean;
  isLoading: boolean;
};

type LiveStatusListener = (snapshot: JmnLiveStatusSnapshot) => void;

const listeners = new Map<LiveStatusListener, number>();
let pollIntervalHandle: ReturnType<typeof setInterval> | null = null;
let activePollIntervalMs = JMN_LIVE_POLL_DEFAULT_MS;
let pollInFlight: Promise<JmnLiveStatusSnapshot> | null = null;
let previousLiveState: boolean | null = null;
let mockTransitionTimer: ReturnType<typeof setTimeout> | null = null;

let liveSnapshot: JmnLiveStatusSnapshot = {
  isLive: false,
  audioLink: APP_CONFIG.audioStreamUrl,
  checkedAt: null,
  transitionedToLive: false,
  isLoading: true,
};

function parseLiveFlag(value: unknown): boolean {
  return value === 1 || value === '1' || value === true;
}

function parseAudioLink(value: unknown): string {
  if (typeof value !== 'string') return APP_CONFIG.audioStreamUrl;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : APP_CONFIG.audioStreamUrl;
}

function normalizePollIntervalMs(pollIntervalMs?: number): number {
  if (!Number.isFinite(pollIntervalMs)) return JMN_LIVE_POLL_DEFAULT_MS;
  const rounded = Math.round(pollIntervalMs as number);
  return Math.min(JMN_LIVE_POLL_MAX_MS, Math.max(JMN_LIVE_POLL_MIN_MS, rounded));
}

function resolveActivePollIntervalMs(): number {
  if (listeners.size === 0) return JMN_LIVE_POLL_DEFAULT_MS;
  let next = JMN_LIVE_POLL_MAX_MS;
  for (const ms of listeners.values()) {
    if (ms < next) next = ms;
  }
  return normalizePollIntervalMs(next);
}

function notifyListeners(): void {
  for (const listener of listeners.keys()) {
    listener(liveSnapshot);
  }
}

function stopPoller(): void {
  if (!pollIntervalHandle) return;
  clearInterval(pollIntervalHandle);
  pollIntervalHandle = null;
}

function ensurePoller(): void {
  const nextMs = resolveActivePollIntervalMs();

  if (listeners.size === 0) {
    stopPoller();
    return;
  }

  const intervalChanged = nextMs !== activePollIntervalMs;
  if (!pollIntervalHandle || intervalChanged) {
    stopPoller();
    activePollIntervalMs = nextMs;
    pollIntervalHandle = setInterval(() => {
      void refreshJmnLiveStatus();
    }, activePollIntervalMs);
  }
}

async function fetchFromMyMasjid(): Promise<JmnLiveStatus> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(MYMASJID_STATUS_FUNCTION, {
    body: {},
  });

  if (error) {
    throw new Error(`mymasjid status function failed: ${error.message}`);
  }

  const payload = (data ?? {}) as MyMasjidApiResponse;
  if (payload.success === false) {
    throw new Error(payload.error ?? 'mymasjid status function returned failure');
  }

  const checkedAt = typeof payload.checkedAt === 'number'
    ? payload.checkedAt
    : typeof payload.checkedAt === 'string'
    ? Date.parse(payload.checkedAt)
    : Date.now();

  const hasExplicitBoolean = typeof payload.isLive === 'boolean';
  const isLive = hasExplicitBoolean
    ? Boolean(payload.isLive)
    : parseLiveFlag(payload.masjidIsOnline);

  return {
    isLive,
    audioLink: parseAudioLink(payload.audioLink ?? payload.links?.masjid_audio_link),
    checkedAt: Number.isFinite(checkedAt) ? checkedAt : Date.now(),
  };
}

export async function fetchJmnLiveStatus(): Promise<JmnLiveStatus> {
  return fetchFromMyMasjid();
}

export function getJmnLiveStatusSnapshot(): JmnLiveStatusSnapshot {
  return { ...liveSnapshot };
}

export async function refreshJmnLiveStatus(): Promise<JmnLiveStatusSnapshot> {
  if (pollInFlight) {
    return pollInFlight;
  }

  pollInFlight = (async () => {
    try {
      const status = await fetchFromMyMasjid();
      const transitionedToLive = previousLiveState === false && status.isLive;

      previousLiveState = status.isLive;
      liveSnapshot = {
        isLive: status.isLive,
        audioLink: status.audioLink,
        checkedAt: status.checkedAt,
        transitionedToLive,
        isLoading: false,
      };
    } catch {
      if (previousLiveState === null) {
        previousLiveState = liveSnapshot.isLive;
      }

      liveSnapshot = {
        ...liveSnapshot,
        checkedAt: Date.now(),
        transitionedToLive: false,
        isLoading: false,
      };
    }

    notifyListeners();
    return liveSnapshot;
  })().finally(() => {
    pollInFlight = null;
  });

  return pollInFlight;
}

export function subscribeJmnLiveStatus(
  listener: LiveStatusListener,
  options: { pollIntervalMs?: number } = {},
): () => void {
  const pollIntervalMs = normalizePollIntervalMs(options.pollIntervalMs);

  listeners.set(listener, pollIntervalMs);
  listener(getJmnLiveStatusSnapshot());

  ensurePoller();
  void refreshJmnLiveStatus();

  return () => {
    listeners.delete(listener);
    ensurePoller();
  };
}

export function triggerJmnMockLiveTransition(delayMs = 450): void {
  if (!__DEV__) return;

  const safeDelayMs = Math.max(120, Math.round(delayMs));

  if (mockTransitionTimer) {
    clearTimeout(mockTransitionTimer);
    mockTransitionTimer = null;
  }

  previousLiveState = false;
  liveSnapshot = {
    ...liveSnapshot,
    isLive: false,
    transitionedToLive: false,
    checkedAt: Date.now(),
    isLoading: false,
  };
  notifyListeners();

  mockTransitionTimer = setTimeout(() => {
    previousLiveState = true;
    liveSnapshot = {
      ...liveSnapshot,
      isLive: true,
      transitionedToLive: true,
      checkedAt: Date.now(),
      isLoading: false,
    };
    notifyListeners();

    // Keep transition true only briefly so it behaves like a one-shot event.
    setTimeout(() => {
      liveSnapshot = {
        ...liveSnapshot,
        transitionedToLive: false,
      };
      notifyListeners();
    }, 90);

    mockTransitionTimer = null;
  }, safeDelayMs);
}

/**
 * Backward-compatible boolean helper for screens that only need on/off.
 */
export async function fetchLiveStatus(): Promise<boolean> {
  try {
    const status = await refreshJmnLiveStatus();
    return status.isLive;
  } catch {
    return false;
  }
}

/**
 * Set the live status in the database.
 */
export async function setLiveStatus(isLive: boolean): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'is_live', value: String(isLive), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return !error;
  } catch {
    return false;
  }
}
