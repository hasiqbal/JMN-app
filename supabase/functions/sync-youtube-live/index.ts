import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const LIVE_NOTIFICATION_CHANNEL_ID = 'jmn-live-v2';

const DEFAULT_CHANNEL_ID = 'UCb41kAjATcW5rzOK0Z5QGwA';
const DEFAULT_NOTIFY_COOLDOWN_MINUTES = 15;
const DEFAULT_VIDEO_SCAN_LIMIT = 5;

const APP_SETTING_IS_LIVE = 'youtube_is_live';
const APP_SETTING_LAST_SERVER_NOTIFY_TS = 'youtube_live_notify_last_sent_ts';
const APP_SETTING_LIVE_VIDEO_ID = 'youtube_live_video_id';

const LIVE_TITLE = 'JMN YouTube is now live';
const LIVE_BODY = "Tap to open Jami' Masjid Noorani on YouTube.";

type AppSettingRow = {
  key: string;
  value: string;
};

type SyncRequestBody = {
  dryRun?: boolean;
};

type SupabaseClient = ReturnType<typeof createClient>;

type VideoLiveSnapshot = {
  videoId: string;
  title: string | null;
  isLiveNow: boolean;
};

type YouTubeLiveDetection = {
  liveNow: boolean;
  liveVideoId: string | null;
  liveTitle: string | null;
  checkedVideoIds: string[];
};

type PlayerResponse = {
  videoDetails?: {
    channelId?: string;
    title?: string;
  };
  microformat?: {
    playerMicroformatRenderer?: {
      liveBroadcastDetails?: {
        isLiveNow?: boolean;
      };
    };
  };
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchText(url: string, accept: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: accept,
      'User-Agent': 'jmn-youtube-live-sync/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`request failed for ${url} with status ${response.status}`);
  }

  return await response.text();
}

function extractFeedVideoIds(feedXml: string, limit: number): string[] {
  const videoIds: string[] = [];
  const matcher = /<yt:videoId>([^<]+)<\/yt:videoId>/g;
  let match: RegExpExecArray | null = null;

  while ((match = matcher.exec(feedXml)) !== null) {
    const videoId = (match[1] ?? '').trim();
    if (!videoId) continue;
    videoIds.push(videoId);
    if (videoIds.length >= limit) {
      break;
    }
  }

  return videoIds;
}

function extractJsonObjectAfterMarker(source: string, marker: string): string | null {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;

  const objectStart = source.indexOf('{', markerIndex + marker.length);
  if (objectStart < 0) return null;

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = objectStart; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(objectStart, index + 1);
      }
    }
  }

  return null;
}

function parsePlayerResponseFromWatchHtml(html: string): PlayerResponse | null {
  const markers = [
    'var ytInitialPlayerResponse = ',
    'ytInitialPlayerResponse = ',
    'window["ytInitialPlayerResponse"] = ',
  ];

  for (const marker of markers) {
    const rawJson = extractJsonObjectAfterMarker(html, marker);
    if (!rawJson) continue;

    try {
      return JSON.parse(rawJson) as PlayerResponse;
    } catch {
      continue;
    }
  }

  return null;
}

async function readVideoLiveSnapshot(videoId: string, expectedChannelId: string): Promise<VideoLiveSnapshot> {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&bpctr=9999999999&has_verified=1`;
  const html = await fetchText(watchUrl, 'text/html,application/xhtml+xml');
  const playerResponse = parsePlayerResponseFromWatchHtml(html);

  if (!playerResponse) {
    throw new Error(`ytInitialPlayerResponse missing for ${videoId}`);
  }

  const responseChannelId = (playerResponse.videoDetails?.channelId ?? '').trim();
  if (responseChannelId && responseChannelId !== expectedChannelId) {
    return {
      videoId,
      title: playerResponse.videoDetails?.title ?? null,
      isLiveNow: false,
    };
  }

  return {
    videoId,
    title: playerResponse.videoDetails?.title ?? null,
    isLiveNow: playerResponse.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow === true,
  };
}

async function detectYouTubeLive(channelId: string, scanLimit: number): Promise<YouTubeLiveDetection> {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const feedXml = await fetchText(feedUrl, 'application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8');
  const videoIds = extractFeedVideoIds(feedXml, scanLimit);

  for (const videoId of videoIds) {
    try {
      const snapshot = await readVideoLiveSnapshot(videoId, channelId);
      if (snapshot.isLiveNow) {
        return {
          liveNow: true,
          liveVideoId: snapshot.videoId,
          liveTitle: snapshot.title,
          checkedVideoIds: videoIds,
        };
      }
    } catch (error) {
      console.warn('sync-youtube-live: failed to inspect video', { videoId, error: String(error) });
    }
  }

  return {
    liveNow: false,
    liveVideoId: null,
    liveTitle: null,
    checkedVideoIds: videoIds,
  };
}

async function sendPushNotifications(args: {
  supabase: SupabaseClient;
  nowMs: number;
  liveVideoId: string | null;
  liveTitle: string | null;
}): Promise<{ sent: number; subscribers: number }> {
  const { data: subs, error: subsError } = await args.supabase
    .from('push_subscriptions')
    .select('token')
    .eq('is_active', true)
    .eq('youtube_live_enabled', true);

  if (subsError) {
    console.error('sync-youtube-live: push_subscriptions fetch error', subsError.message);
    return { sent: 0, subscribers: 0 };
  }

  const tokens = Array.from(new Set((subs ?? [])
    .map((entry: { token?: string }) => (entry.token ?? '').trim())
    .filter((token) => token.length > 0)));

  let sent = 0;
  for (const chunk of chunkArray(tokens, 100)) {
    const messages = chunk.map((token) => ({
      to: token,
      sound: 'default',
      title: LIVE_TITLE,
      body: args.liveTitle ? `${LIVE_BODY} ${args.liveTitle}` : LIVE_BODY,
      priority: 'high',
      channelId: LIVE_NOTIFICATION_CHANNEL_ID,
      data: {
        route: '/youtube-live',
        type: 'jmn-youtube-live',
        youtubeVideoId: args.liveVideoId,
      },
    }));

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    if (expoRes.ok) {
      sent += chunk.length;
    } else {
      console.error('sync-youtube-live: Expo push error', await expoRes.text());
    }
  }

  await args.supabase
    .from('app_settings')
    .upsert(
      { key: APP_SETTING_LAST_SERVER_NOTIFY_TS, value: String(args.nowMs), updated_at: new Date().toISOString() },
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
    const channelId = (Deno.env.get('YOUTUBE_LIVE_CHANNEL_ID') ?? DEFAULT_CHANNEL_ID).trim() || DEFAULT_CHANNEL_ID;
    const cooldownMinutesRaw = Number(Deno.env.get('YOUTUBE_LIVE_NOTIFY_COOLDOWN_MINUTES') ?? DEFAULT_NOTIFY_COOLDOWN_MINUTES);
    const cooldownMinutes = Number.isFinite(cooldownMinutesRaw) && cooldownMinutesRaw > 0
      ? cooldownMinutesRaw
      : DEFAULT_NOTIFY_COOLDOWN_MINUTES;
    const cooldownMs = cooldownMinutes * 60 * 1000;

    const scanLimitRaw = Number(Deno.env.get('YOUTUBE_LIVE_SCAN_LIMIT') ?? DEFAULT_VIDEO_SCAN_LIMIT);
    const scanLimit = Number.isFinite(scanLimitRaw) && scanLimitRaw > 0
      ? Math.min(Math.floor(scanLimitRaw), 10)
      : DEFAULT_VIDEO_SCAN_LIMIT;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [APP_SETTING_IS_LIVE, APP_SETTING_LAST_SERVER_NOTIFY_TS, APP_SETTING_LIVE_VIDEO_ID]);

    if (settingsError) {
      return jsonResponse({ success: false, error: settingsError.message }, 500);
    }

    const settingMap = new Map((settings ?? []).map((row: AppSettingRow) => [row.key, row.value]));
    const wasLive = settingMap.get(APP_SETTING_IS_LIVE) === 'true';
    const lastNotifyTs = Number(settingMap.get(APP_SETTING_LAST_SERVER_NOTIFY_TS) ?? '0');
    const previousLiveVideoId = (settingMap.get(APP_SETTING_LIVE_VIDEO_ID) ?? '').trim();

    const detection = await detectYouTubeLive(channelId, scanLimit);
    const nowMs = Date.now();
    const cooldownElapsed = !Number.isFinite(lastNotifyTs) || nowMs - lastNotifyTs >= cooldownMs;
    const transitionedToLive = !wasLive && detection.liveNow;
    const switchedToNewLiveVideo = detection.liveNow
      && !!detection.liveVideoId
      && detection.liveVideoId !== previousLiveVideoId;

    let sent = 0;
    let subscribers = 0;
    let notified = false;

    if (!dryRun) {
      await supabase
        .from('app_settings')
        .upsert([
          { key: APP_SETTING_IS_LIVE, value: String(detection.liveNow), updated_at: new Date().toISOString() },
          { key: APP_SETTING_LIVE_VIDEO_ID, value: detection.liveVideoId ?? '', updated_at: new Date().toISOString() },
        ], { onConflict: 'key' });

      if ((transitionedToLive || switchedToNewLiveVideo) && cooldownElapsed) {
        const pushResult = await sendPushNotifications({
          supabase,
          nowMs,
          liveVideoId: detection.liveVideoId,
          liveTitle: detection.liveTitle,
        });
        sent = pushResult.sent;
        subscribers = pushResult.subscribers;
        notified = true;
        console.log(`sync-youtube-live: sent ${sent} push notifications`);
      }
    }

    return jsonResponse({
      success: true,
      dryRun,
      channelId,
      cooldownMinutes,
      scanLimit,
      liveNow: detection.liveNow,
      liveVideoId: detection.liveVideoId,
      liveTitle: detection.liveTitle,
      checkedVideoIds: detection.checkedVideoIds,
      notified,
      sent,
      subscribers,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('sync-youtube-live: unexpected error', error);
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
});