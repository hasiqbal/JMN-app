import {
  STREAM_PLAYBACK_STOP_ACTION_ID,
  STREAM_PLAYBACK_TOGGLE_ACTION_ID,
} from '@/constants/streamPlaybackNotifications';

type StreamPlaybackActionHandler = {
  togglePlayPause: () => Promise<void> | void;
  stopPlayback: () => Promise<void> | void;
};

let activeHandler: StreamPlaybackActionHandler | null = null;

export function registerStreamPlaybackActionHandler(handler: StreamPlaybackActionHandler | null): void {
  activeHandler = handler;
}

export async function handleStreamPlaybackActionFromNotification(
  actionIdentifier?: string,
): Promise<boolean> {
  if (!actionIdentifier) return false;

  const isStreamAction = actionIdentifier === STREAM_PLAYBACK_TOGGLE_ACTION_ID
    || actionIdentifier === STREAM_PLAYBACK_STOP_ACTION_ID;

  if (!isStreamAction) return false;

  if (!activeHandler) return true;

  try {
    if (actionIdentifier === STREAM_PLAYBACK_TOGGLE_ACTION_ID) {
      await activeHandler.togglePlayPause();
      return true;
    }

    if (actionIdentifier === STREAM_PLAYBACK_STOP_ACTION_ID) {
      await activeHandler.stopPlayback();
      return true;
    }
  } catch {
    // Keep notification actions resilient; UI state will self-heal on next update.
  }

  return true;
}
