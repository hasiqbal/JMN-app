import { corsHeaders } from '../_shared/cors.ts';

const DEFAULT_STATUS_URL = 'https://portal.mymasjid.uk/api/masjids/jamimasjidnoorani';
const DEFAULT_AUDIO_LINK = 'https://lb.mymasjid.stream/nooranihalifax';

type MyMasjidApiResponse = {
  data?: {
    masjid_is_online?: number | string | boolean | null;
    links?: {
      masjid_audio_link?: string | null;
    } | null;
  } | null;
};

type StatusResponse = {
  success: boolean;
  isLive?: boolean;
  masjidIsOnline?: number | string | boolean | null;
  audioLink?: string;
  checkedAt?: string;
  error?: string;
};

function jsonResponse(payload: StatusResponse, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseLiveFlag(value: unknown): boolean {
  return value === 1 || value === '1' || value === true;
}

function parseAudioLink(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_AUDIO_LINK;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_AUDIO_LINK;
}

function buildMyMasjidHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'jmn-mymasjid-status/1.0',
  };

  const authHeaderName = (Deno.env.get('MYMASJID_AUTH_HEADER_NAME') ?? 'Authorization').trim();
  const authHeaderValue = (Deno.env.get('MYMASJID_AUTH_HEADER_VALUE') ?? '').trim();

  if (authHeaderName && authHeaderValue) {
    headers[authHeaderName] = authHeaderValue;
  }

  const apiKey = (Deno.env.get('MYMASJID_API_KEY') ?? '').trim();
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  return headers;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const statusUrl = (Deno.env.get('MYMASJID_STATUS_URL') ?? DEFAULT_STATUS_URL).trim();
    if (!statusUrl) {
      return jsonResponse({ success: false, error: 'MYMASJID_STATUS_URL is empty' }, 500);
    }

    const upstreamResponse = await fetch(statusUrl, {
      method: 'GET',
      headers: buildMyMasjidHeaders(),
    });

    if (!upstreamResponse.ok) {
      const statusCode = upstreamResponse.status;
      return jsonResponse(
        {
          success: false,
          error: `MyMasjid upstream failed with status ${statusCode}`,
        },
        502,
      );
    }

    const payload = (await upstreamResponse.json()) as MyMasjidApiResponse;
    const data = payload?.data ?? null;

    return jsonResponse({
      success: true,
      isLive: parseLiveFlag(data?.masjid_is_online),
      masjidIsOnline: data?.masjid_is_online ?? null,
      audioLink: parseAudioLink(data?.links?.masjid_audio_link),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('mymasjid-live-status: unexpected error', error);
    return jsonResponse({ success: false, error: String(error) }, 500);
  }
});
