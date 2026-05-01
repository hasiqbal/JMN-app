import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { getSupabaseClient } from '@/template';

type ExpoNotificationsModule = typeof import('expo-notifications');

type SyncResult = {
  synced: boolean;
  reason?: string;
};

type SyncPushTokenOptions = {
  youtubeLiveEnabled?: boolean;
};

export const YOUTUBE_LIVE_NOTIFY_KEY = 'jmn_youtube_live_notify';

const TOKEN_SYNC_THROTTLE_MS = 10 * 60 * 1000;

let lastSyncedToken: string | null = null;
let lastSyncedAtMs = 0;
let lastSyncedYoutubeLiveEnabled: boolean | null = null;

function resolveProjectId(): string | null {
  const easProjectId = Constants.easConfig?.projectId;
  if (typeof easProjectId === 'string' && easProjectId.trim().length > 0) {
    return easProjectId.trim();
  }

  const expoProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof expoProjectId === 'string' && expoProjectId.trim().length > 0) {
    return expoProjectId.trim();
  }

  return null;
}

function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').trim();
}

async function resolveDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      return Application.getAndroidId() ?? null;
    }
    if (Platform.OS === 'ios') {
      return (await Application.getIosIdForVendorAsync()) ?? null;
    }
  } catch {
    // Ignore — device ID is best-effort.
  }
  return null;
}

async function upsertDeviceToken(token: string): Promise<void> {
  const client = getSupabaseClient();
  const nowIso = new Date().toISOString();
  const appVersion = Application.nativeApplicationVersion ?? null;
  const deviceModel = Device.modelName ?? null;
  const deviceId = await resolveDeviceId();
  const rowPayload = {
    token,
    platform: Platform.OS,
    app_version: appVersion,
    device_model: deviceModel,
    device_id: deviceId,
    is_active: true,
    last_active: nowIso,
  };

  // If we know the physical device ID, deactivate any stale token rows
  // for this device before inserting the current one.  This prevents
  // the same phone from accumulating multiple active rows when the
  // Expo push token rotates (e.g. after app reload or channel change).
  if (deviceId) {
    try {
      await client
        .from('device_tokens')
        .update({ is_active: false })
        .eq('device_id', deviceId)
        .neq('token', token);
    } catch {
      // Best-effort cleanup; continue with upsert even if this fails.
    }

    // If a row for this physical device already exists, update it in place.
    // This avoids conflicts with unique(device_id) when Expo rotates token.
    const { data: byDeviceRows, error: byDeviceError } = await client
      .from('device_tokens')
      .update(rowPayload)
      .eq('device_id', deviceId)
      .select('id')
      .limit(1);

    if (byDeviceError) {
      throw new Error(`device_tokens update-by-device failed: ${byDeviceError.message}`);
    }

    if (Array.isArray(byDeviceRows) && byDeviceRows.length > 0) {
      return;
    }
  }

  const { error } = await client
    .from('device_tokens')
    .upsert(rowPayload, { onConflict: 'token' });

  if (error) {
    throw new Error(`device_tokens upsert failed: ${error.message}`);
  }
}

async function upsertLegacyPushSubscription(token: string, youtubeLiveEnabled: boolean): Promise<void> {
  const client = getSupabaseClient();

  // Keep legacy compatibility while push_subscriptions exists in backend flows.
  const { error } = await client
    .from('push_subscriptions')
    .upsert(
      {
        token,
        platform: Platform.OS,
        is_active: true,
        youtube_live_enabled: youtubeLiveEnabled,
      },
      { onConflict: 'token' },
    );

  if (error) {
    throw new Error(`push_subscriptions upsert failed: ${error.message}`);
  }
}

export async function syncPushTokenWithBackend(
  notificationsModule: ExpoNotificationsModule,
  options: SyncPushTokenOptions = {},
): Promise<SyncResult> {
  try {
    if (Platform.OS === 'web') {
      return { synced: false, reason: 'web-platform' };
    }

    const maybeStorage = (globalThis as { localStorage?: unknown }).localStorage;
    if (
      maybeStorage &&
      typeof maybeStorage === 'object' &&
      typeof (maybeStorage as { getItem?: unknown }).getItem !== 'function'
    ) {
      return { synced: false, reason: 'unsupported-localstorage-runtime' };
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      return { synced: false, reason: 'missing-project-id' };
    }

    const youtubeLiveEnabled = options.youtubeLiveEnabled === true;

    const permissions = await notificationsModule.getPermissionsAsync();
    if (permissions.status !== 'granted') {
      return {
        synced: false,
        reason: permissions.canAskAgain === false
          ? 'permission-blocked-open-settings'
          : 'permission-not-granted',
      };
    }

    const tokenResponse = await notificationsModule
      .getExpoPushTokenAsync({ projectId })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        const lower = message.toLowerCase();
        const firebaseMissing =
          lower.includes('firebaseapp') ||
          lower.includes('default firebaseapp is not initialized') ||
          lower.includes('no firebase app') ||
          lower.includes('firebase app');

        if (firebaseMissing) {
          return { __tokenError: 'token-fetch-failed:firebase-not-configured' } as const;
        }

        return { __tokenError: `token-fetch-failed:${message.slice(0, 120)}` } as const;
      });

    if ('__tokenError' in tokenResponse) {
      return { synced: false, reason: tokenResponse.__tokenError };
    }

    const token = normalizeToken(tokenResponse.data);
    if (!token) {
      return { synced: false, reason: 'empty-token' };
    }

    const nowMs = Date.now();
    if (
      token === lastSyncedToken
      && lastSyncedYoutubeLiveEnabled === youtubeLiveEnabled
      && nowMs - lastSyncedAtMs < TOKEN_SYNC_THROTTLE_MS
    ) {
      return { synced: false, reason: 'throttled' };
    }

    try {
      await upsertDeviceToken(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { synced: false, reason: `device-upsert-failed:${message.slice(0, 120)}` };
    }

    try {
      await upsertLegacyPushSubscription(token, youtubeLiveEnabled);
    } catch {
      // Legacy table may be removed later; device_tokens remains canonical.
    }

    lastSyncedToken = token;
    lastSyncedAtMs = nowMs;
    lastSyncedYoutubeLiveEnabled = youtubeLiveEnabled;

    return { synced: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { synced: false, reason: `unexpected-sync-error:${message.slice(0, 120)}` };
  }
}
