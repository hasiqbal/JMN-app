import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const LIVE_NOTIFICATION_CHANNEL_ID = 'jmn-live-v2';

const DEFAULT_SOURCE_URL = 'https://mymasjid.uk/live/jamimasjidnoorani';
const DEFAULT_OFFLINE_MARKER = 'THIS MASJID IS OFFLINE';
const DEFAULT_NOTIFY_COOLDOWN_MINUTES = 15;

// Internal polling loop: check every 5 s for 50 s per cron invocation.
// This gives ≤5 s detection latency without sub-minute cron support.
const POLL_INTERVAL_MS = 5_000;
const LOOP_DURATION_MS = 50_000;
// Distributed lock TTL: prevents overlapping cron invocations running concurrent loops.
const LOCK_TTL_MS = 55_000;

const APP_SETTING_IS_LIVE = 'is_live';
const APP_SETTING_LAST_SERVER_NOTIFY_TS = 'live_notify_last_sent_ts';
const APP_SETTING_POLL_LOCK = 'live_poll_lock_ts';

const LIVE_TITLE = 'JMN Radio is now live';
const LIVE_BODY = "Tap to open Jami' Masjid Noorani live stream.";

type AppSettingRow = {
  key: string;
  value: string;
};

type SyncRequestBody = {
  dryRun?: boolean;
};

type SupabaseClient = ReturnType<typeof createClient>;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function detectMyMasjidLive(sourceUrl: string, offlineMarker: string): Promise<boolean> {
  const response = await fetch(sourceUrl, {
    headers: {
      'User-Agent': 'jmn-live-sync/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`source returned status ${response.status}`);
  }

  const html = await response.text();
  const marker = offlineMarker.trim().toUpperCase();
  if (!marker) {
    throw new Error('offline marker is empty');
  }

  return !html.toUpperCase().includes(marker);
}

async function sendPushNotifications(
  supabase: SupabaseClient,
  nowMs: number,
): Promise<{ sent: number; subscribers: number }> {
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('token')
    .eq('is_active', true);

  if (subsError) {
    console.error('sync-mymasjid-live: push_subscriptions fetch error', subsError.message);
    return { sent: 0, subscribers: 0 };
  }

  const tokens = (subs ?? [])
    .map((entry: { token?: string }) => entry.token ?? '')
    .filter((token) => token.length > 0);

  let sent = 0;
  for (const chunk of chunkArray(tokens, 100)) {
    const messages = chunk.map((token) => ({
      to: token,
      sound: 'default',
      title: LIVE_TITLE,
      body: LIVE_BODY,
      priority: 'high',
      channelId: LIVE_NOTIFICATION_CHANNEL_ID,
      data: { route: '/stream', type: 'jmn-live' },
    }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    if (expoRes.ok) {
      sent += chunk.length;
    } else {
      console.error('sync-mymasjid-live: Expo push error', await expoRes.text());
    }
  }

  await supabase
    .from('app_settings')
    .upsert(
      { key: APP_SETTING_LAST_SERVER_NOTIFY_TS, value: String(nowMs), updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );

  return { sent, subscribers: tokens.length };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const body: SyncRequestBody = req.method === 'POST'
      ? await req.json().catch(() => ({}))
      : {};

    const dryRun = body.dryRun === true;

    const sourceUrl = Deno.env.get('MYMASJID_LIVE_PAGE_URL') ?? DEFAULT_SOURCE_URL;
    const offlineMarker = Deno.env.get('MYMASJID_OFFLINE_MARKER') ?? DEFAULT_OFFLINE_MARKER;
    const cooldownMinutesRaw = Number(Deno.env.get('LIVE_NOTIFY_COOLDOWN_MINUTES') ?? DEFAULT_NOTIFY_COOLDOWN_MINUTES);
    const cooldownMinutes = Number.isFinite(cooldownMinutesRaw) && cooldownMinutesRaw > 0
      ? cooldownMinutesRaw
      : DEFAULT_NOTIFY_COOLDOWN_MINUTES;
    const cooldownMs = cooldownMinutes * 60 * 1000;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch initial DB state
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [APP_SETTING_IS_LIVE, APP_SETTING_LAST_SERVER_NOTIFY_TS, APP_SETTING_POLL_LOCK]);

    if (settingsError) {
      return jsonResponse({ success: false, error: settingsError.message }, 500);
    }

    const settingMap = new Map((settings ?? []).map((row: AppSettingRow) => [row.key, row.value]));

    // --- Distributed lock: skip if another invocation is already looping ---
    if (!dryRun) {
      const lockTs = Number(settingMap.get(APP_SETTING_POLL_LOCK) ?? '0');
      if (Number.isFinite(lockTs) && lockTs > 0 && Date.now() - lockTs < LOCK_TTL_MS) {
        return jsonResponse({ success: true, skipped: true, reason: 'another instance is polling' });
      }
      await supabase
        .from('app_settings')
        .upsert(
          { key: APP_SETTING_POLL_LOCK, value: String(Date.now()), updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );
    }

    // In-memory state seeded from DB; updated each loop iteration
    let wasLive = settingMap.get(APP_SETTING_IS_LIVE) === 'true';
    let lastNotifyTs = Number(settingMap.get(APP_SETTING_LAST_SERVER_NOTIFY_TS) ?? '0');

    const summary = { checks: 0, notified: false, sent: 0, subscribers: 0, finalLiveState: wasLive };

    const runCheck = async (): Promise<void> => {
      summary.checks++;
      const nowMs = Date.now();

      let liveNow: boolean;
      try {
        liveNow = await detectMyMasjidLive(sourceUrl, offlineMarker);
      } catch (err) {
        console.warn('sync-mymasjid-live: detectMyMasjidLive failed', err);
        return; // retain previous state; try again next iteration
      }

      summary.finalLiveState = liveNow;

      if (!dryRun && liveNow !== wasLive) {
        await supabase
          .from('app_settings')
          .upsert(
            { key: APP_SETTING_IS_LIVE, value: String(liveNow), updated_at: new Date().toISOString() },
            { onConflict: 'key' },
          );
      }

      const transitionedToLive = !wasLive && liveNow;
      const cooldownElapsed = !Number.isFinite(lastNotifyTs) || nowMs - lastNotifyTs >= cooldownMs;

      if (transitionedToLive && cooldownElapsed && !dryRun) {
        const { sent, subscribers } = await sendPushNotifications(supabase, nowMs);
        summary.notified = true;
        summary.sent += sent;
        summary.subscribers = subscribers;
        lastNotifyTs = nowMs; // prevent duplicate sends within same loop window
        console.log(`sync-mymasjid-live: sent ${sent} push notifications`);
      }

      wasLive = liveNow;
    };

    // First check immediately, then every POLL_INTERVAL_MS for LOOP_DURATION_MS
    await runCheck();

    if (!dryRun) {
      const loopEnd = Date.now() + LOOP_DURATION_MS;
      while (Date.now() + POLL_INTERVAL_MS < loopEnd) {
        await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        await runCheck();
      }

      // Release lock
      await supabase
        .from('app_settings')
        .upsert(
          { key: APP_SETTING_POLL_LOCK, value: '0', updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );
    }

    return jsonResponse({
      success: true,
      sourceUrl,
      dryRun,
      cooldownMinutes,
      ...summary,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('sync-mymasjid-live: unexpected error', error);
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
});
