import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const DEFAULT_SOURCE_URL = 'https://mymasjid.uk/live/jamimasjidnoorani';
const DEFAULT_OFFLINE_MARKER = 'THIS MASJID IS OFFLINE';
const DEFAULT_NOTIFY_COOLDOWN_MINUTES = 15;

const APP_SETTING_IS_LIVE = 'is_live';
const APP_SETTING_LAST_SERVER_NOTIFY_TS = 'live_notify_last_sent_ts';

const LIVE_TITLE = 'JMN Radio is now live';
const LIVE_BODY = "Tap to open Jami' Masjid Noorani live stream.";

type AppSettingRow = {
  key: string;
  value: string;
};

type SyncRequestBody = {
  dryRun?: boolean;
};

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

  const normalized = html.toUpperCase();
  return !normalized.includes(marker);
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

    const liveNow = await detectMyMasjidLive(sourceUrl, offlineMarker);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [APP_SETTING_IS_LIVE, APP_SETTING_LAST_SERVER_NOTIFY_TS]);

    if (settingsError) {
      return jsonResponse({ success: false, error: settingsError.message }, 500);
    }

    const settingMap = new Map((settings ?? []).map((row: AppSettingRow) => [row.key, row.value]));
    const wasLive = settingMap.get(APP_SETTING_IS_LIVE) === 'true';
    const lastNotifyTs = Number(settingMap.get(APP_SETTING_LAST_SERVER_NOTIFY_TS) ?? '0');
    const nowMs = Date.now();

    const transitionedToLive = !wasLive && liveNow;
    const cooldownElapsed = !Number.isFinite(lastNotifyTs) || nowMs - lastNotifyTs >= cooldownMs;
    const shouldNotify = transitionedToLive && cooldownElapsed;

    if (!dryRun) {
      const { error: upsertStatusError } = await supabase
        .from('app_settings')
        .upsert(
          { key: APP_SETTING_IS_LIVE, value: String(liveNow), updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );

      if (upsertStatusError) {
        return jsonResponse({ success: false, error: upsertStatusError.message }, 500);
      }
    }

    let sent = 0;
    let subscribers = 0;

    if (shouldNotify && !dryRun) {
      const { data: subs, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('token')
        .eq('is_active', true);

      if (subsError) {
        return jsonResponse({ success: false, error: subsError.message }, 500);
      }

      const tokens = (subs ?? [])
        .map((entry: { token?: string }) => entry.token ?? '')
        .filter((token) => token.length > 0);

      subscribers = tokens.length;

      for (const chunk of chunkArray(tokens, 100)) {
        const messages = chunk.map((token) => ({
          to: token,
          sound: 'default',
          title: LIVE_TITLE,
          body: LIVE_BODY,
          priority: 'high',
          channelId: 'jmn-live',
          data: { route: '/stream', type: 'jmn-live' },
        }));

        const expoRes = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(messages),
        });

        if (expoRes.ok) {
          sent += chunk.length;
        } else {
          const text = await expoRes.text();
          console.error('sync-mymasjid-live: Expo push error', text);
        }
      }

      await supabase
        .from('app_settings')
        .upsert(
          {
            key: APP_SETTING_LAST_SERVER_NOTIFY_TS,
            value: String(nowMs),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' },
        );
    }

    return jsonResponse({
      success: true,
      sourceUrl,
      liveNow,
      wasLive,
      transitionedToLive,
      shouldNotify,
      cooldownMinutes,
      dryRun,
      subscribers,
      sent,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('sync-mymasjid-live: unexpected error', error);
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
});
