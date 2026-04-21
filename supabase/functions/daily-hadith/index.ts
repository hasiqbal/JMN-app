import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type DailyHadithRequest = {
  timeZone?: string;
  nowIso?: string;
};

type HadithLane = 'hadith' | 'practical';

type FallbackHadithRow = {
  id: string;
  content_type: HadithLane;
  title: string | null;
  text_en: string;
  text_ur: string | null;
  text_ar: string | null;
  reference: string | null;
  source_collection: string | null;
  authenticity_grade: string | null;
  theme: string | null;
  season_key: string | null;
  weight: number;
};

type ResolvedHadith = {
  title: string;
  lane: HadithLane;
  cardEn: string;
  cardUr: string;
  popupAr: string;
  popupEn: string;
  popupUr: string;
  reference: string;
  sourceCollection: string;
  authenticity: string;
  theme: string;
};

type ExternalHadithPayload = {
  title?: string;
  text_en?: string;
  text_ur?: string;
  text_ar?: string;
  reference?: string;
  source_collection?: string;
  authenticity_grade?: string;
  theme?: string;
  lane?: HadithLane;
};

const DEFAULT_HADITH_RATIO = 70;

const BUILTIN_HADITH_FALLBACKS: FallbackHadithRow[] = [
  {
    id: 'builtin-hadith-1',
    content_type: 'hadith',
    title: 'Hadith of the Day',
    text_en: 'The best of you are those who have the best character.',
    text_ur: 'تم میں بہترین وہ ہیں جن کے اخلاق بہترین ہوں۔',
    text_ar: '',
    reference: 'Bukhari and Muslim',
    source_collection: 'Bukhari and Muslim',
    authenticity_grade: 'Sahih',
    theme: 'Akhlaq and character',
    season_key: null,
    weight: 5,
  },
  {
    id: 'builtin-hadith-2',
    content_type: 'hadith',
    title: 'Hadith of the Day',
    text_en: 'Whoever does not show mercy will not be shown mercy.',
    text_ur: 'جو رحم نہیں کرتا اُس پر رحم نہیں کیا جاتا۔',
    text_ar: '',
    reference: 'Bukhari and Muslim',
    source_collection: 'Bukhari and Muslim',
    authenticity_grade: 'Sahih',
    theme: 'Akhlaq and character',
    season_key: null,
    weight: 4,
  },
  {
    id: 'builtin-hadith-3',
    content_type: 'hadith',
    title: 'Hadith of the Day',
    text_en: 'The most beloved deeds to Allah are those done consistently, even if they are small.',
    text_ur: 'اللہ کے نزدیک سب سے محبوب اعمال وہ ہیں جو پابندی سے کیے جائیں، چاہے کم ہوں۔',
    text_ar: '',
    reference: 'Bukhari',
    source_collection: 'Bukhari',
    authenticity_grade: 'Sahih',
    theme: 'Repentance and hope',
    season_key: null,
    weight: 4,
  },
];

const BUILTIN_PRACTICAL_FALLBACKS: FallbackHadithRow[] = [
  {
    id: 'builtin-practical-1',
    content_type: 'practical',
    title: 'Sunnah Reminder',
    text_en: 'Send abundant salawat upon the Prophet throughout the day.',
    text_ur: 'آج کے دن نبی کریم ﷺ پر کثرت سے درود بھیجیں۔',
    text_ar: '',
    reference: 'Quran 33:56',
    source_collection: '',
    authenticity_grade: '',
    theme: 'Practical Sunnah',
    season_key: null,
    weight: 5,
  },
  {
    id: 'builtin-practical-2',
    content_type: 'practical',
    title: 'Sunnah Reminder',
    text_en: 'Recite Astaghfirullah regularly and make sincere tawbah today.',
    text_ur: 'آج کثرت سے استغفر اللہ پڑھیں اور سچی توبہ کریں۔',
    text_ar: '',
    reference: 'Quran 71:10',
    source_collection: '',
    authenticity_grade: '',
    theme: 'Practical Sunnah',
    season_key: null,
    weight: 4,
  },
  {
    id: 'builtin-practical-3',
    content_type: 'practical',
    title: 'Sunnah Reminder',
    text_en: 'Guard your tongue today: speak good or remain silent.',
    text_ur: 'آج اپنی زبان کی حفاظت کریں: بھلی بات کریں یا خاموش رہیں۔',
    text_ar: '',
    reference: 'Bukhari and Muslim',
    source_collection: 'Bukhari and Muslim',
    authenticity_grade: 'Sahih',
    theme: 'Practical Sunnah',
    season_key: null,
    weight: 4,
  },
];

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

function resolveTimeZone(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) return 'UTC';
  const candidate = input.trim();
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate });
    return candidate;
  } catch {
    return 'UTC';
  }
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

function clampRatio(input: number): number {
  if (Number.isNaN(input)) return DEFAULT_HADITH_RATIO;
  return Math.max(1, Math.min(99, Math.round(input)));
}

function trimToCardLine(text: string, maxLength = 150): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return '';
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}...`;
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

function normalizeExternalPayload(payload: unknown): ResolvedHadith | null {
  const candidate = (() => {
    if (!payload || typeof payload !== 'object') return null;
    const direct = payload as Record<string, unknown>;
    const nested = direct.data;
    if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
    return direct;
  })();

  if (!candidate) return null;

  const textEn = String(candidate.text_en ?? candidate.english ?? candidate.en ?? '').trim();
  if (!textEn) return null;

  const textUr = String(candidate.text_ur ?? candidate.urdu ?? candidate.ur ?? '').trim();
  const textAr = String(candidate.text_ar ?? candidate.arabic ?? candidate.ar ?? '').trim();
  const laneRaw = String(candidate.lane ?? '').trim().toLowerCase();
  const lane: HadithLane = laneRaw === 'practical' ? 'practical' : 'hadith';

  return {
    title: String(candidate.title ?? (lane === 'hadith' ? 'Hadith of the Day' : 'Sunnah of the Day')).trim(),
    lane,
    cardEn: trimToCardLine(textEn),
    cardUr: trimToCardLine(textUr),
    popupAr: textAr,
    popupEn: textEn,
    popupUr: textUr,
    reference: String(candidate.reference ?? '').trim() || 'Reference pending',
    sourceCollection: String(candidate.source_collection ?? candidate.source ?? '').trim(),
    authenticity: String(candidate.authenticity_grade ?? candidate.grade ?? '').trim(),
    theme: String(candidate.theme ?? '').trim(),
  };
}

async function fetchExternalHadith(
  dateKey: string,
  timeZone: string,
  lane: HadithLane,
  seasonKey: string | null,
): Promise<ResolvedHadith | null> {
  const endpoint = Deno.env.get('HADITH_DAILY_API_URL');
  if (!endpoint) return null;

  const key = Deno.env.get('HADITH_DAILY_API_KEY');
  const keyHeader = Deno.env.get('HADITH_DAILY_API_KEY_HEADER') ?? 'x-api-key';

  try {
    const url = new URL(endpoint);
    url.searchParams.set('dateKey', dateKey);
    url.searchParams.set('timeZone', timeZone);
    url.searchParams.set('lane', lane);
    if (seasonKey) url.searchParams.set('seasonKey', seasonKey);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (key) headers[keyHeader] = key;

    const res = await fetch(url.toString(), { method: 'GET', headers });
    if (!res.ok) return null;

    const payload = await res.json();
    return normalizeExternalPayload(payload);
  } catch {
    return null;
  }
}

function toResolvedFromFallback(row: FallbackHadithRow): ResolvedHadith {
  const lane = row.content_type;
  const popupEn = row.text_en.trim();
  const popupUr = (row.text_ur ?? '').trim();

  return {
    title: (row.title ?? '').trim() || (lane === 'hadith' ? 'Hadith of the Day' : 'Sunnah of the Day'),
    lane,
    cardEn: trimToCardLine(popupEn) || 'Adhkar coming soon.',
    cardUr: trimToCardLine(popupUr),
    popupAr: (row.text_ar ?? '').trim(),
    popupEn,
    popupUr,
    reference: (row.reference ?? '').trim() || 'Reference pending',
    sourceCollection: (row.source_collection ?? '').trim(),
    authenticity: (row.authenticity_grade ?? '').trim(),
    theme: (row.theme ?? '').trim(),
  };
}

function isMeaningfulEnglish(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length >= 20;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as DailyHadithRequest;
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

    const hadithRatio = clampRatio(Number(Deno.env.get('SACRED_HADITH_RATIO') ?? `${DEFAULT_HADITH_RATIO}`));
    const laneSeed = stableHash(`${dateKey}|${timeZone}|lane`);
    const lane: HadithLane = laneSeed % 100 < hadithRatio ? 'hadith' : 'practical';

    let externalUsed = false;
    let selected: ResolvedHadith | null = await fetchExternalHadith(dateKey, timeZone, lane, seasonKey);
    if (selected) {
      externalUsed = true;
    }

    if (!selected) {
      let fallbackRows: FallbackHadithRow[] = [];

      if (seasonKey) {
        const { data: seasonalFallbackRows } = await supabase
          .from('sacred_hadith_fallbacks')
          .select('id,content_type,title,text_en,text_ur,text_ar,reference,source_collection,authenticity_grade,theme,season_key,weight')
          .eq('is_active', true)
          .eq('is_home_safe', true)
          .eq('content_type', lane)
          .eq('season_key', seasonKey);

        fallbackRows = (seasonalFallbackRows as FallbackHadithRow[] | null) ?? [];
      }

      if (fallbackRows.length === 0) {
        const { data: neutralFallbackRows } = await supabase
          .from('sacred_hadith_fallbacks')
          .select('id,content_type,title,text_en,text_ur,text_ar,reference,source_collection,authenticity_grade,theme,season_key,weight')
          .eq('is_active', true)
          .eq('is_home_safe', true)
          .eq('content_type', lane)
          .is('season_key', null);

        fallbackRows = (neutralFallbackRows as FallbackHadithRow[] | null) ?? [];
      }

      if (fallbackRows.length === 0 && lane === 'practical') {
        const { data: reminderRows } = await supabase
          .from('sunnah_reminders')
          .select('id,title,description,urdu_translation,arabic,reference,display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        const mappedRows = ((reminderRows as Array<Record<string, unknown>> | null) ?? []).map((row) => {
          const english = String(row.description ?? row.title ?? '').trim() || 'Adhkar coming soon.';
          const urdu = String(row.urdu_translation ?? '').trim();

          return {
            id: String(row.id ?? crypto.randomUUID()),
            content_type: 'practical' as const,
            title: 'Sunnah Reminder',
            text_en: english,
            text_ur: urdu || null,
            text_ar: String(row.arabic ?? '').trim() || null,
            reference: String(row.reference ?? '').trim() || null,
            source_collection: null,
            authenticity_grade: null,
            theme: 'Practical Sunnah',
            season_key: null,
            weight: 1,
          } satisfies FallbackHadithRow;
        });

        fallbackRows = mappedRows;
      }

      if (fallbackRows.length > 0) {
        const selectedRow = pickWeighted(fallbackRows, stableHash(`${dateKey}|${timeZone}|${lane}|hadith`));
        const candidate = toResolvedFromFallback(selectedRow);
        if (isMeaningfulEnglish(candidate.popupEn)) {
          selected = candidate;
        }
      }

      if (!selected) {
        const builtinPool = lane === 'hadith' ? BUILTIN_HADITH_FALLBACKS : BUILTIN_PRACTICAL_FALLBACKS;
        const selectedRow = pickWeighted(builtinPool, stableHash(`${dateKey}|${timeZone}|builtin-${lane}-safety`));
        selected = toResolvedFromFallback(selectedRow);
      }
    }

    if (!selected) {
      selected = {
        title: lane === 'hadith' ? 'Hadith of the Day' : 'Sunnah of the Day',
        lane,
        cardEn: 'Adhkar coming soon.',
        cardUr: '',
        popupAr: '',
        popupEn: 'Adhkar coming soon.',
        popupUr: '',
        reference: 'Reference pending',
        sourceCollection: '',
        authenticity: '',
        theme: '',
      };
    }

    return jsonResponse({
      ok: true,
      source: 'daily-hadith',
      dateKey,
      timeZone,
      seasonKey,
      lane: selected.lane,
      fallbackUsed: !externalUsed,
      title: selected.title,
      reference: selected.reference,
      sourceCollection: selected.sourceCollection,
      authenticity: selected.authenticity,
      theme: selected.theme,
      card: {
        en: selected.cardEn,
        ur: selected.cardUr,
      },
      popup: {
        ar: selected.popupAr,
        en: selected.popupEn,
        ur: selected.popupUr,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[daily-hadith] error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
