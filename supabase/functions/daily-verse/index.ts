import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type DailyVerseRequest = {
  timeZone?: string;
  nowIso?: string;
};

type VersePoolRow = {
  id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  season_key: string | null;
  theme: string | null;
  card_english: string | null;
  card_urdu: string | null;
  weight: number;
};

type QuranFetchResponse = {
  arabic?: string;
  translation?: string;
  reference?: string;
  translationId?: number;
};

const DEFAULT_TRANSLATION_EN = Number(Deno.env.get('QURAN_DAILY_TRANSLATION_ID_EN') ?? '131');
const DEFAULT_TRANSLATION_UR = Number(Deno.env.get('QURAN_DAILY_TRANSLATION_ID_UR') ?? '819');


type BuiltinVerseContent = {
  ar: string;
  en: string;
  ur: string;
};



function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toDateKey(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function resolveTimeZone(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) return 'UTC';
  const candidate = input.trim();
  try {
    // Validation by attempting to instantiate an Intl formatter.
    new Intl.DateTimeFormat('en-US', { timeZone: candidate });
    return candidate;
  } catch {
    return 'UTC';
  }
}

function firstMeaningfulLine(text: string): string {
  const line = text
    .split('\n')
    .map((entry) => entry.trim())
    .find(Boolean);

  if (!line) return '';
  return line.replace(/\s*\(\d+\)\s*$/, '').trim();
}

function pickWeighted<T extends { weight: number }>(rows: T[], seed: number): T {
  const total = rows.reduce((sum, row) => sum + Math.max(1, row.weight || 1), 0);
  if (total <= 0) return rows[0];

  let cursor = seed % total;
  for (const row of rows) {
    cursor -= Math.max(1, row.weight || 1);
    if (cursor < 0) return row;
  }

  return rows[rows.length - 1];
}

async function invokeQuranFetch(
  supabaseUrl: string,
  accessToken: string,
  payload: { surah: number; ayahFrom: number; ayahTo: number; translationId: number },
): Promise<QuranFetchResponse> {
  const res = await fetch(`${supabaseUrl}/functions/v1/quran-fetch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: accessToken,
    },
    body: JSON.stringify({
      action: 'fetch',
      surah: payload.surah,
      ayahFrom: payload.ayahFrom,
      ayahTo: payload.ayahTo,
      translationId: payload.translationId,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`quran-fetch failed [${res.status}] ${body}`);
  }

  return res.json() as Promise<QuranFetchResponse>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as DailyVerseRequest;
    const timeZone = resolveTimeZone(body.timeZone);
    const now = body.nowIso ? new Date(body.nowIso) : new Date();
    const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
    const dateKey = toDateKey(safeNow, timeZone);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: seasonRows } = await supabase
      .from('sacred_season_windows')
      .select('season_key')
      .eq('is_active', true)
      .lte('start_date', dateKey)
      .gte('end_date', dateKey)
      .order('priority', { ascending: false })
      .order('start_date', { ascending: false })
      .limit(1);

    const seasonKey = seasonRows?.[0]?.season_key ?? null;

    let versePool: VersePoolRow[] = [];

    if (seasonKey) {
      const { data: seasonalRows } = await supabase
        .from('sacred_verse_pool')
        .select('id,surah,ayah_from,ayah_to,season_key,theme,card_english,card_urdu,weight')
        .eq('is_active', true)
        .eq('is_home_safe', true)
        .eq('season_key', seasonKey);

      versePool = (seasonalRows as VersePoolRow[] | null) ?? [];
    }

    if (versePool.length === 0) {
      const { data: neutralRows } = await supabase
        .from('sacred_verse_pool')
        .select('id,surah,ayah_from,ayah_to,season_key,theme,card_english,card_urdu,weight')
        .eq('is_active', true)
        .eq('is_home_safe', true)
        .is('season_key', null);

      versePool = (neutralRows as VersePoolRow[] | null) ?? [];
    }

    const usingFallbackPool = versePool.length === 0;
    const effectivePool = usingFallbackPool ? FALLBACK_POOL : versePool;

    const verseSeed = stableHash(`${dateKey}|${timeZone}|verse`);
    const selected = pickWeighted(effectivePool, verseSeed);

    let englishResponse: QuranFetchResponse | null = null;
    let urduResponse: QuranFetchResponse | null = null;

    try {
      [englishResponse, urduResponse] = await Promise.all([
        invokeQuranFetch(supabaseUrl, serviceRoleKey, {
          surah: selected.surah,
          ayahFrom: selected.ayah_from,
          ayahTo: selected.ayah_to,
          translationId: DEFAULT_TRANSLATION_EN,
        }),
        invokeQuranFetch(supabaseUrl, serviceRoleKey, {
          surah: selected.surah,
          ayahFrom: selected.ayah_from,
          ayahTo: selected.ayah_to,
          translationId: DEFAULT_TRANSLATION_UR,
        }),
      ]);
    } catch (err) {
      console.error('[daily-verse] quran-fetch error', err);
    }

    const builtin = BUILTIN_VERSE_CONTENT[selected.id] ?? null;
    const popupEn = (englishResponse?.translation ?? '').trim() || (builtin?.en ?? '');
    const popupUr = (urduResponse?.translation ?? '').trim() || (builtin?.ur ?? '');
    const popupAr = (englishResponse?.arabic ?? '').trim() || (builtin?.ar ?? '');

    const cardEn =
      firstMeaningfulLine(popupEn) ||
      (selected.card_english ?? '').trim() ||
      'Verse coming soon.';

    const cardUr =
      firstMeaningfulLine(popupUr) ||
      (selected.card_urdu ?? '').trim();

    const reference =
      (englishResponse?.reference ?? '').trim() ||
      `Quran ${selected.surah}:${selected.ayah_from}${selected.ayah_to > selected.ayah_from ? `-${selected.ayah_to}` : ''}`;

    return jsonResponse({
      ok: true,
      source: 'daily-verse',
      dateKey,
      timeZone,
      seasonKey,
      fallbackUsed: usingFallbackPool || !englishResponse,
      verse: {
        surah: selected.surah,
        ayahFrom: selected.ayah_from,
        ayahTo: selected.ayah_to,
        theme: selected.theme,
        reference,
      },
      card: {
        en: cardEn,
        ur: cardUr,
      },
      popup: {
        ar: popupAr,
        en: popupEn || cardEn,
        ur: popupUr || cardUr,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[daily-verse] error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
