/**
 * contentService.ts
 * Fetches prayer times, adhkar, and announcements from the cloud backend.
 * Falls back to local data when offline or table is empty.
 */
import { getSupabaseClient } from '@/template';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HowToGuide, GuideBlock, HowToStepImage } from '@/howtoguides/types';

const URDU_TRANSLATION_CACHE_PREFIX = '@adhkar_urdu_cache_v1:';
const urduTranslationMemoryCache = new Map<string, string>();
const ENGLISH_TRANSLATION_CACHE_PREFIX = '@adhkar_english_cache_v1:';
const englishTranslationMemoryCache = new Map<string, string>();
const ANNOUNCEMENTS_CACHE_KEY = '@announcements_feed_cache_v1';
const HOWTO_GUIDES_CACHE_PREFIX = '@howto_guides_cache_v1:';
const HOWTO_GUIDES_TTL_MS = 15 * 60 * 1000;
const ANNOUNCEMENTS_FETCH_TIMEOUT_MS = 8000;
const TRANSLATE_URDU_BACKOFF_MS = 5 * 60 * 1000;

let translateUrduBackoffUntil = 0;

type AnnouncementsCachePayload = {
  updatedAt: number;
  rows: AnnouncementRow[];
};

type HowToCachePayload = {
  updatedAt: number;
  rows: HowToGuide[];
};

let announcementsMemoryCache: AnnouncementsCachePayload | null = null;
const howToGuidesMemoryCache = new Map<string, HowToCachePayload>();

function buildHowToCacheKey(language: 'en' | 'ur'): string {
  return `${HOWTO_GUIDES_CACHE_PREFIX}${language}`;
}

async function readCachedHowToGuides(language: 'en' | 'ur'): Promise<HowToGuide[] | null> {
  const memory = howToGuidesMemoryCache.get(language);
  if (memory && Date.now() - memory.updatedAt <= HOWTO_GUIDES_TTL_MS) {
    return memory.rows;
  }

  try {
    const raw = await AsyncStorage.getItem(buildHowToCacheKey(language));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HowToCachePayload;
    if (!parsed || !Array.isArray(parsed.rows) || typeof parsed.updatedAt !== 'number') return null;

    howToGuidesMemoryCache.set(language, parsed);
    if (Date.now() - parsed.updatedAt <= HOWTO_GUIDES_TTL_MS) {
      return parsed.rows;
    }
  } catch {
    return null;
  }

  return null;
}

async function writeCachedHowToGuides(language: 'en' | 'ur', rows: HowToGuide[]): Promise<void> {
  const payload: HowToCachePayload = {
    updatedAt: Date.now(),
    rows,
  };

  howToGuidesMemoryCache.set(language, payload);
  try {
    await AsyncStorage.setItem(buildHowToCacheKey(language), JSON.stringify(payload));
  } catch {
    // ignore storage write issues
  }
}

function normalizeTranslationSourceKey(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildTranslationCacheKey(text: string): string {
  return `${URDU_TRANSLATION_CACHE_PREFIX}${normalizeTranslationSourceKey(text)}`;
}

function buildEnglishTranslationCacheKey(text: string): string {
  return `${ENGLISH_TRANSLATION_CACHE_PREFIX}${normalizeTranslationSourceKey(text)}`;
}

async function readCachedUrduTranslation(text: string): Promise<string> {
  const normalizedKey = normalizeTranslationSourceKey(text);
  const memoryHit = urduTranslationMemoryCache.get(normalizedKey);
  if (memoryHit) return memoryHit;

  try {
    const stored = await AsyncStorage.getItem(buildTranslationCacheKey(text));
    const value = (stored ?? '').trim();
    if (value) {
      urduTranslationMemoryCache.set(normalizedKey, value);
      return value;
    }
  } catch {
    // ignore storage issues and continue with live translation
  }

  return '';
}

async function writeCachedUrduTranslation(text: string, urdu: string): Promise<void> {
  const normalizedKey = normalizeTranslationSourceKey(text);
  const value = urdu.trim();
  if (!normalizedKey || !value) return;

  urduTranslationMemoryCache.set(normalizedKey, value);

  try {
    await AsyncStorage.setItem(buildTranslationCacheKey(text), value);
  } catch {
    // ignore storage issues; memory cache still helps current session
  }
}

async function readCachedEnglishTranslation(text: string): Promise<string> {
  const normalizedKey = normalizeTranslationSourceKey(text);
  const memoryHit = englishTranslationMemoryCache.get(normalizedKey);
  if (memoryHit) return memoryHit;

  try {
    const stored = await AsyncStorage.getItem(buildEnglishTranslationCacheKey(text));
    const value = (stored ?? '').trim();
    if (value) {
      englishTranslationMemoryCache.set(normalizedKey, value);
      return value;
    }
  } catch {
    // ignore storage issues and continue with live translation
  }

  return '';
}

async function writeCachedEnglishTranslation(text: string, english: string): Promise<void> {
  const normalizedKey = normalizeTranslationSourceKey(text);
  const value = english.trim();
  if (!normalizedKey || !value) return;

  englishTranslationMemoryCache.set(normalizedKey, value);

  try {
    await AsyncStorage.setItem(buildEnglishTranslationCacheKey(text), value);
  } catch {
    // ignore storage issues; memory cache still helps current session
  }
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface HijriCalendarRow {
  gregorian_date: string;
  hijri_date: string;
  gregorian_year: number;
  gregorian_month: number;
  gregorian_day: number;
}

function toIsoLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function fetchHijriDateForGregorian(date: Date): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const iso = toIsoLocalDate(date);

    const { data, error } = await supabase
      .from('hijri_calendar')
      .select('hijri_date')
      .eq('gregorian_date', iso)
      .maybeSingle();

    if (error || !data) return null;
    return (data as Pick<HijriCalendarRow, 'hijri_date'>).hijri_date ?? null;
  } catch {
    return null;
  }
}

export async function fetchHijriCalendarForMonth(
  year: number,
  month: number
): Promise<HijriCalendarRow[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('hijri_calendar')
      .select('gregorian_date,hijri_date,gregorian_year,gregorian_month,gregorian_day')
      .eq('gregorian_year', year)
      .eq('gregorian_month', month)
      .order('gregorian_day', { ascending: true });

    if (error || !data) return [];
    return data as HijriCalendarRow[];
  } catch {
    return [];
  }
}

export interface PrayerTimeRow {
  id: string;
  month: number;
  day: number;
  date: string | null;
  fajr: string;
  sunrise: string;
  ishraq: string | null;
  zawaal: string | null;
  zuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jumu_ah_1: string | null;
  jumu_ah_2: string | null;
  fajr_jamat: string | null;
  zuhr_jamat: string | null;
  asr_jamat: string | null;
  maghrib_jamat: string | null;
  isha_jamat: string | null;
}

export interface AdhkarRow {
  id: string;
  prayer_time: string;
  title: string;
  arabic_title: string | null;
  arabic: string;
  transliteration: string | null;
  translation: string | null;
  translation_urdu?: string | null;
  urdu_translation?: string | null;
  translation_ur?: string | null;
  reference: string | null;
  count: string | null;
  display_order: number;
  is_active: boolean;
  sections: {
    heading: string;
    chapter?: string;
    chapter_arabic?: string;
    chapter_urdu?: string;
    arabic: string;
    transliteration?: string;
    translation?: string;
    urdu_translation?: string;
  }[] | null;
  group_name: string | null;
  group_order: number;
  benefits?: string | null;
  tafsir?: string | null;
  description: string | null;
  card_color?: string | null;
  content_type?: 'adhkar' | 'quran' | 'qaseedah' | 'naat' | null;     // New: how to render this group
  content_source?: 'db' | 'local' | 'api' | null;  // New: where is content stored
  content_key?: string | null;                    // New: e.g., 'surah-36' for local Quran
  card_icon?: string | null;                      // New: card display icon
  card_badge?: string | null;                     // New: card badge text
  group_description?: string | null;
  file_url?: string | null;
}

type HowToGuideRow = {
  id: string;
  group_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  intro: string | null;
  language: 'en' | 'ur';
  icon: string | null;
  color: string | null;
  display_order: number;
};

type HowToGroupRow = {
  id: string;
  name: string;
};

type HowToSectionRow = {
  id: string;
  guide_id: string;
  heading: string;
  section_order: number;
};

type HowToStepRow = {
  id: string;
  section_id: string;
  step_order: number;
  title: string;
  detail: string | null;
  note: string | null;
};

type HowToStepBlockRow = {
  step_id: string;
  block_order: number;
  kind: GuideBlock['kind'];
  payload: Record<string, unknown>;
};

type HowToStepImageRow = {
  step_id: string;
  display_order: number;
  image_url: string;
  caption: string | null;
  source: string | null;
};

// Resolve Urdu translation from supported portal column variants.
// Keep this centralized so all entry renderers stay consistent by default.
export function resolveAdhkarUrduTranslation(row: AdhkarRow): string {
  return (
    row.translation_urdu ??
    row.urdu_translation ??
    row.translation_ur ??
    ''
  ).trim();
}

// Runtime Urdu translation fallback for rows that only have English translation.
// Database Urdu columns still take priority at render time.
export async function translateTextToUrdu(text: string): Promise<string> {
  const source = text.trim();
  if (!source) return '';

  const cached = await readCachedUrduTranslation(source);
  if (cached) return cached;

  const normalizeGoogleTranslatePayload = (payload: unknown): string => {
    // google translate public endpoint returns nested arrays where [0][i][0]
    // holds translated text fragments.
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) return '';
    const firstChunk = payload[0] as unknown[];
    const translated = firstChunk
      .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
      .join('')
      .trim();
    return translated;
  };

  const translateViaGoogleFallback = async (): Promise<string> => {
    try {
      const url =
        'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=' +
        encodeURIComponent(source);
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return '';
      const payload = await res.json();
      return normalizeGoogleTranslatePayload(payload);
    } catch {
      return '';
    }
  };

  if (Date.now() < translateUrduBackoffUntil) {
    const fallbackUrdu = await translateViaGoogleFallback();
    if (fallbackUrdu) {
      await writeCachedUrduTranslation(source, fallbackUrdu);
    }
    return fallbackUrdu;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('translate-urdu', {
      body: { text: source },
    });

    if (error) {
      translateUrduBackoffUntil = Date.now() + TRANSLATE_URDU_BACKOFF_MS;
      const fallbackUrdu = await translateViaGoogleFallback();
      if (fallbackUrdu) {
        await writeCachedUrduTranslation(source, fallbackUrdu);
      }
      return fallbackUrdu;
    }

    const urdu = typeof data?.urdu === 'string' ? data.urdu.trim() : '';
    if (urdu) {
      await writeCachedUrduTranslation(source, urdu);
      return urdu;
    }

    const fallbackUrdu = await translateViaGoogleFallback();
    if (fallbackUrdu) {
      await writeCachedUrduTranslation(source, fallbackUrdu);
    }
    return fallbackUrdu;
  } catch {
    translateUrduBackoffUntil = Date.now() + TRANSLATE_URDU_BACKOFF_MS;
    const fallbackUrdu = await translateViaGoogleFallback();
    if (fallbackUrdu) {
      await writeCachedUrduTranslation(source, fallbackUrdu);
    }
    return fallbackUrdu;
  }
}

function getEnglishTranslationSource(row: AdhkarRow): string {
  const direct = (row.translation ?? '').trim();
  if (direct) return direct;
  return (row.sections ?? [])
    .map((sec) => (sec.translation ?? '').trim())
    .filter(Boolean)
    .join('\n\n');
}

// Runtime English translation fallback for rows that only have Arabic.
export async function translateTextToEnglish(text: string): Promise<string> {
  const source = text.trim();
  if (!source) return '';

  const cached = await readCachedEnglishTranslation(source);
  if (cached) return cached;

  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=' +
      encodeURIComponent(source);
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return '';

    const payload = await res.json();
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) return '';

    const translated = (payload[0] as unknown[])
      .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
      .join('')
      .trim();

    if (translated) {
      await writeCachedEnglishTranslation(source, translated);
    }
    return translated;
  } catch {
    return '';
  }
}

// In-memory Arabic translation cache for the current session.
const arabicTranslationCache = new Map<string, string>();

// Runtime Arabic translation (e.g. for chapter titles).
export async function translateTextToArabic(text: string): Promise<string> {
  const source = text.trim();
  if (!source) return '';

  const cached = arabicTranslationCache.get(source);
  if (cached) return cached;

  try {
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ar&dt=t&q=' +
      encodeURIComponent(source);
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return '';

    const payload = await res.json();
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) return '';

    const translated = (payload[0] as unknown[])
      .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
      .join('')
      .trim();

    if (translated) arabicTranslationCache.set(source, translated);
    return translated;
  } catch {
    return '';
  }
}

export async function prewarmAdhkarUrduTranslationCache(maxItems = Number.MAX_SAFE_INTEGER): Promise<void> {
  const rows = await fetchAllAdhkar();
  if (rows.length === 0) return;

  let processed = 0;

  for (const row of rows) {
    if (processed >= maxItems) break;

    const dbUrdu = resolveAdhkarUrduTranslation(row);
    if (dbUrdu) continue;

    const english = getEnglishTranslationSource(row);
    if (!english) continue;

    const alreadyCached = await readCachedUrduTranslation(english);
    if (!alreadyCached) {
      await translateTextToUrdu(english);
    }

    processed += 1;
  }
}

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  category: string;
  is_active: boolean;
  pinned: boolean;
  published_at: string;
  expires_at: string | null;
  type?: string | null;
  tag?: boolean;
  body_html?: string | null;
  body_plain?: string | null;
  urdu_title?: string | null;
  urdu_body?: string | null;
  lead_names?: string | null;
  urdu_lead_names?: string | null;
  start_time?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  display_order?: number | null;
  updated_at?: string | null;
}

export interface AnnouncementFetchMeta {
  source: 'edge' | 'fallback-table' | 'cache' | 'empty';
  usedFallback: boolean;
  fromCache: boolean;
  notice: string | null;
  error: string | null;
  fetchedAt: number;
}

export interface AnnouncementFetchResult {
  rows: AnnouncementRow[];
  meta: AnnouncementFetchMeta;
}

// ── Prayer Times ─────────────────────────────────────────────────────────

export async function fetchPrayerTimeForDay(
  month: number,
  day: number
): Promise<PrayerTimeRow | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('month', month)
      .eq('day', day)
      .single();
    if (error || !data) return null;
    return data as PrayerTimeRow;
  } catch {
    return null;
  }
}

export async function fetchPrayerTimesForMonth(
  month: number
): Promise<PrayerTimeRow[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('month', month)
      .order('day', { ascending: true });
    if (error || !data) return [];
    return data as PrayerTimeRow[];
  } catch {
    return [];
  }
}

export async function hasPrayerTimesInDB(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from('prayer_times')
      .select('id', { count: 'exact', head: true });
    return !error && (count ?? 0) > 0;
  } catch {
    return false;
  }
}

// ── Adhkar ────────────────────────────────────────────────────────────────

export async function fetchAdhkarForPrayerTime(
  prayerTime: AdhkarRow['prayer_time'],
  options?: { contentTypes?: Array<'adhkar' | 'quran' | 'qaseedah' | 'naat'> }
): Promise<AdhkarRow[]> {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('adhkar')
      .select('*')
      .eq('prayer_time', prayerTime)
      .eq('is_active', true)
      .order('group_order', { ascending: true })
      .order('display_order', { ascending: true });

    if (options?.contentTypes && options.contentTypes.length > 0) {
      query = query.in('content_type', options.contentTypes);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data as AdhkarRow[];
  } catch {
    return [];
  }
}

export async function fetchQaseedahNaatEntries(): Promise<AdhkarRow[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('qaseedah_naat_entries')
      .select('id,content_type,title,arabic_title,arabic,transliteration,translation,urdu_translation,reference,count,prayer_time,display_order,is_active,sections,file_url,tafsir,description,qaseedah_naat_groups(name,description,display_order)')
      .eq('is_active', true)
      .in('content_type', ['qaseedah', 'naat'])
      .order('content_type', { ascending: true })
      .order('group_id', { ascending: true })
      .order('display_order', { ascending: true });

    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((row) => {
      const groupMetaRaw = row.qaseedah_naat_groups;
      const groupMeta = Array.isArray(groupMetaRaw) ? groupMetaRaw[0] : groupMetaRaw;
      const groupName = typeof groupMeta === 'object' && groupMeta && typeof (groupMeta as { name?: unknown }).name === 'string'
        ? ((groupMeta as { name: string }).name || null)
        : null;
      const groupDescription = typeof groupMeta === 'object' && groupMeta && typeof (groupMeta as { description?: unknown }).description === 'string'
        ? ((groupMeta as { description: string }).description || null)
        : null;
      const groupOrder = typeof groupMeta === 'object' && groupMeta && typeof (groupMeta as { display_order?: unknown }).display_order === 'number'
        ? ((groupMeta as { display_order: number }).display_order ?? 0)
        : 0;

      return {
        id: String(row.id ?? ''),
        prayer_time: typeof row.prayer_time === 'string' ? row.prayer_time : 'general',
        title: typeof row.title === 'string' ? row.title : '',
        arabic_title: typeof row.arabic_title === 'string' ? row.arabic_title : null,
        arabic: typeof row.arabic === 'string' ? row.arabic : '',
        transliteration: typeof row.transliteration === 'string' ? row.transliteration : null,
        translation: typeof row.translation === 'string' ? row.translation : null,
        urdu_translation: typeof row.urdu_translation === 'string' ? row.urdu_translation : null,
        translation_urdu: typeof row.urdu_translation === 'string' ? row.urdu_translation : null,
        reference: typeof row.reference === 'string' ? row.reference : null,
        count: typeof row.count === 'string' ? row.count : '1',
        display_order: typeof row.display_order === 'number' ? row.display_order : 0,
        is_active: row.is_active !== false,
        sections: (row.sections as AdhkarRow['sections']) ?? null,
        group_name: groupName,
        group_order: groupOrder,
        description: typeof row.description === 'string' ? row.description : groupDescription,
        group_description: groupDescription,
        file_url: typeof row.file_url === 'string' ? row.file_url : null,
        tafsir: typeof row.tafsir === 'string' ? row.tafsir : null,
        content_type: row.content_type === 'naat' ? 'naat' : 'qaseedah',
      } satisfies AdhkarRow;
    });
  } catch {
    return [];
  }
}

export async function fetchHowToGuides(language: 'en' | 'ur' = 'en', options?: { forceRefresh?: boolean }): Promise<HowToGuide[]> {
  const forceRefresh = options?.forceRefresh === true;
  const cached = forceRefresh ? null : await readCachedHowToGuides(language);
  if (!forceRefresh && cached && cached.length > 0) {
    return cached;
  }

  try {
    const supabase = getSupabaseClient();
    const nowIso = new Date().toISOString();

    const { data: guides, error: guidesError } = await supabase
      .from('howto_guides')
      .select('id,group_id,slug,title,subtitle,intro,language,icon,color,display_order,publish_start_at,publish_end_at')
      .eq('is_active', true)
      .eq('language', language)
      .or(`publish_start_at.is.null,publish_start_at.lte.${nowIso}`)
      .or(`publish_end_at.is.null,publish_end_at.gt.${nowIso}`)
      .order('display_order', { ascending: true })
      .order('title', { ascending: true });

    if (guidesError || !guides || guides.length === 0) return [];

    const guideRows = guides as HowToGuideRow[];
    const guideIds = guideRows.map((row) => row.id);
    const groupIds = Array.from(new Set(guideRows.map((row) => row.group_id)));

    const [groupsResult, sectionsResult] = await Promise.all([
      supabase
        .from('howto_groups')
        .select('id,name')
        .in('id', groupIds),
      supabase
        .from('howto_sections')
        .select('id,guide_id,heading,section_order')
        .in('guide_id', guideIds)
        .order('section_order', { ascending: true }),
    ]);

    if (groupsResult.error || sectionsResult.error) return [];

    const sectionRows = (sectionsResult.data ?? []) as HowToSectionRow[];
    const sectionIds = sectionRows.map((section) => section.id);

    const { data: steps, error: stepsError } = sectionIds.length > 0
      ? await supabase
          .from('howto_steps')
          .select('id,section_id,step_order,title,detail,note')
          .in('section_id', sectionIds)
          .order('step_order', { ascending: true })
      : { data: [], error: null };

    if (stepsError) return [];

    const stepRows = (steps ?? []) as HowToStepRow[];
    const stepIds = stepRows.map((step) => step.id);

    const [blocksResult, imagesResult] = stepIds.length > 0
      ? await Promise.all([
          supabase
            .from('howto_step_blocks')
            .select('step_id,block_order,kind,payload')
            .in('step_id', stepIds)
            .order('block_order', { ascending: true }),
          supabase
            .from('howto_step_images')
            .select('step_id,display_order,image_url,caption,source')
            .in('step_id', stepIds)
            .order('display_order', { ascending: true }),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

    if (blocksResult.error || imagesResult.error) return [];

    const groupNameById = new Map<string, string>();
    for (const group of (groupsResult.data ?? []) as HowToGroupRow[]) {
      groupNameById.set(group.id, group.name);
    }

    const sectionsByGuideId = new Map<string, HowToSectionRow[]>();
    for (const section of sectionRows) {
      const list = sectionsByGuideId.get(section.guide_id) ?? [];
      list.push(section);
      sectionsByGuideId.set(section.guide_id, list);
    }

    const stepsBySectionId = new Map<string, HowToStepRow[]>();
    for (const step of stepRows) {
      const list = stepsBySectionId.get(step.section_id) ?? [];
      list.push(step);
      stepsBySectionId.set(step.section_id, list);
    }

    const blocksByStepId = new Map<string, GuideBlock[]>();
    for (const block of (blocksResult.data ?? []) as HowToStepBlockRow[]) {
      const list = blocksByStepId.get(block.step_id) ?? [];
      list.push({ kind: block.kind, ...block.payload } as GuideBlock);
      blocksByStepId.set(block.step_id, list);
    }

    const imagesByStepId = new Map<string, HowToStepImage[]>();
    for (const image of (imagesResult.data ?? []) as HowToStepImageRow[]) {
      const list = imagesByStepId.get(image.step_id) ?? [];
      list.push({
        uri: image.image_url,
        caption: image.caption ?? '',
        source: image.source ?? undefined,
      });
      imagesByStepId.set(image.step_id, list);
    }

    const mapped = guideRows.map((guide) => ({
      id: guide.slug || guide.id,
      language: guide.language,
      parentGroup: groupNameById.get(guide.group_id) ?? 'General',
      title: guide.title,
      subtitle: guide.subtitle ?? '',
      icon: guide.icon ?? 'menu-book',
      color: guide.color ?? '#2e7d32',
      intro: guide.intro ?? '',
      sections: (sectionsByGuideId.get(guide.id) ?? []).map((section) => ({
        heading: section.heading,
        steps: (stepsBySectionId.get(section.id) ?? []).map((step, index) => ({
          step: index + 1,
          title: step.title,
          detail: step.detail ?? '',
          blocks: blocksByStepId.get(step.id) ?? undefined,
          note: step.note ?? undefined,
          images: imagesByStepId.get(step.id) ?? undefined,
        })),
      })),
    }));

    if (mapped.length > 0) {
      await writeCachedHowToGuides(language, mapped);
    }

    return mapped;
  } catch {
    return cached ?? [];
  }
}

export async function fetchAllAdhkar(): Promise<AdhkarRow[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('adhkar')
      .select('*')
      .eq('is_active', true)
      .order('prayer_time')
      .order('group_order', { ascending: true })
      .order('display_order', { ascending: true });
    if (error || !data) return [];
    return data as AdhkarRow[];
  } catch {
    return [];
  }
}

// ── Adhkar Group Metadata ─────────────────────────────────────────────────

export interface AdhkarGroupMeta {
  group_name: string;
  name: string | null;
  group_order: number;
  item_count: number;
  arabic_title: string | null;
  card_subtitle: string | null;
  description: string | null;
  card_reference: string | null;
  card_color: string | null;
  content_type: 'adhkar' | 'quran' | 'qaseedah' | 'naat' | null;     // New: portal-defined rendering type
  content_source: 'db' | 'local' | 'api' | null;  // New: where content is stored
  content_key: string | null;                   // New: e.g., 'surah-36' for local Quran
  card_icon: string | null;                     // New: portal-defined card icon
  card_badge: string | null;                    // New: portal-defined badge text
}

export interface AdhkarGroupWarmupRow {
  group_name: string | null;
  name: string | null;
  content_key: string | null;
  content_type: 'adhkar' | 'quran' | 'qaseedah' | 'naat' | null;
  card_subtitle: string | null;
  description: string | null;
  arabic_title: string | null;
  is_active: boolean | null;
}

const ADHKAR_GROUPS_SCHEMA_BACKOFF_MS = 5 * 60 * 1000;
let adhkarGroupsSchemaBackoffUntil = 0;

function shouldSkipAdhkarGroupsMetadataQuery(now = Date.now()): boolean {
  return now < adhkarGroupsSchemaBackoffUntil;
}

function markAdhkarGroupsSchemaBackoff(): void {
  adhkarGroupsSchemaBackoffUntil = Date.now() + ADHKAR_GROUPS_SCHEMA_BACKOFF_MS;
}

function isAdhkarGroupsSchemaMismatch(message: string | null | undefined): boolean {
  const value = (message ?? '').toLowerCase();
  if (!value) return false;

  return (
    (value.includes('adhkar_groups')
      && (value.includes('schema cache') || value.includes('column') || value.includes('relation') || value.includes('does not exist')))
    || (value.includes('is_active') && value.includes('schema cache'))
  );
}

function normalizeAdhkarContentType(value: unknown): AdhkarGroupWarmupRow['content_type'] {
  if (value === 'adhkar' || value === 'quran' || value === 'qaseedah' || value === 'naat') {
    return value;
  }
  return null;
}

function mapWarmupRows(rows: Array<Record<string, unknown>>): AdhkarGroupWarmupRow[] {
  return rows
    .map((row) => ({
      group_name: typeof row.group_name === 'string' ? row.group_name : '',
      name: typeof row.name === 'string' ? row.name : null,
      content_key: typeof row.content_key === 'string' ? row.content_key : null,
      content_type: normalizeAdhkarContentType(row.content_type),
      card_subtitle: typeof row.card_subtitle === 'string' ? row.card_subtitle : null,
      description: typeof row.description === 'string' ? row.description : null,
      arabic_title: typeof row.arabic_title === 'string' ? row.arabic_title : null,
      is_active: row.is_active !== false,
    }))
    .filter((row) => row.group_name.length > 0 && row.is_active !== false);
}

function normalizeGroupKey(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim();
}

function resolvePrayerTimeAliases(prayerTime: string): string[] {
  if (prayerTime === 'after-zuhr') return ['after-zuhr', 'after-dhuhr'];
  if (prayerTime === 'after-dhuhr') return ['after-dhuhr', 'after-zuhr'];
  return [prayerTime];
}

export async function fetchAdhkarGroupsForPrayerTime(
  prayerTime: AdhkarRow['prayer_time']
): Promise<AdhkarGroupMeta[]> {
  try {
    const rows = await fetchAdhkarForPrayerTime(prayerTime);
    const map = new Map<string, AdhkarGroupMeta>();
    for (const row of rows) {
      if (!row.group_name) continue;
      if (!map.has(row.group_name)) {
        map.set(row.group_name, {
          group_name: row.group_name,
          name: null,
          group_order: row.group_order,
          item_count: 0,
          arabic_title: row.arabic_title,
          card_subtitle: null,
          description: null,
          card_reference: row.reference ?? null,
          card_color: row.card_color ?? null,
          content_type: row.content_type ?? null,
          content_source: row.content_source ?? null,
          content_key: row.content_key ?? null,
          card_icon: row.card_icon ?? null,
          card_badge: row.card_badge ?? null,
        });
      } else {
        // Keep card metadata coming from adhkar_groups when possible.
        const existing = map.get(row.group_name)!;
        if (!existing.card_color && row.card_color) {
          existing.card_color = row.card_color;
        }
        if (!existing.content_type && row.content_type) {
          existing.content_type = row.content_type;
        }
        if (!existing.content_source && row.content_source) {
          existing.content_source = row.content_source;
        }
        if (!existing.content_key && row.content_key) {
          existing.content_key = row.content_key;
        }
        if (!existing.card_icon && row.card_icon) {
          existing.card_icon = row.card_icon;
        }
        if (!existing.card_badge && row.card_badge) {
          existing.card_badge = row.card_badge;
        }
      }
      map.get(row.group_name)!.item_count += 1;
    }

    // Merge portal-managed group metadata when available.
    // This keeps UI coupled to `adhkar_groups.description` and related fields.
    try {
      if (shouldSkipAdhkarGroupsMetadataQuery()) {
        return Array.from(map.values()).sort((a, b) => a.group_order - b.group_order);
      }

      const supabase = getSupabaseClient();
      const prayerTimeAliases = resolvePrayerTimeAliases(prayerTime);
      const { data: groupRows, error: groupError } = await supabase
        .from('adhkar_groups')
        .select('*')
        .in('prayer_time', prayerTimeAliases);

      if (!groupError && Array.isArray(groupRows)) {
        const mapEntries = Array.from(map.entries());
        for (const raw of groupRows as Record<string, unknown>[]) {
          const isActive = raw.is_active;
          if (typeof isActive === 'boolean' && !isActive) continue;

          const rawGroupName = typeof raw.group_name === 'string' ? raw.group_name : null;
          const rawName = typeof raw.name === 'string' ? raw.name : null;
          const primaryKey = rawGroupName ?? rawName;
          if (!primaryKey) continue;

          let matchedKey = map.has(primaryKey) ? primaryKey : null;
          if (!matchedKey) {
            const normalizedPrimary = normalizeGroupKey(primaryKey);
            const matchedEntry = mapEntries.find(([key]) => normalizeGroupKey(key) === normalizedPrimary);
            matchedKey = matchedEntry?.[0] ?? null;
          }

          const existing = matchedKey ? map.get(matchedKey) : undefined;
          const groupName = matchedKey ?? primaryKey;
          const merged: AdhkarGroupMeta = {
            group_name: groupName,
            name:
              rawName ?? existing?.name ?? null,
            group_order:
              typeof raw.group_order === 'number'
                ? raw.group_order
                : existing?.group_order ?? 999,
            item_count: existing?.item_count ?? 0,
            arabic_title:
              typeof raw.arabic_title === 'string'
                ? raw.arabic_title
                : existing?.arabic_title ?? null,
            card_subtitle:
              typeof raw.card_subtitle === 'string'
                ? raw.card_subtitle
                : existing?.card_subtitle ?? null,
            description:
              typeof raw.description === 'string'
                ? raw.description
                : existing?.description ?? null,
            card_reference:
              typeof raw.card_reference === 'string'
                ? raw.card_reference
                : existing?.card_reference ?? null,
            card_color:
              typeof raw.card_color === 'string'
                ? raw.card_color
                : existing?.card_color ?? null,
            content_type: normalizeAdhkarContentType(raw.content_type) ?? existing?.content_type ?? null,
            content_source:
              raw.content_source === 'db' || raw.content_source === 'local' || raw.content_source === 'api'
                ? raw.content_source
                : existing?.content_source ?? null,
            content_key:
              typeof raw.content_key === 'string'
                ? raw.content_key
                : existing?.content_key ?? null,
            card_icon:
              typeof raw.card_icon === 'string'
                ? raw.card_icon
                : existing?.card_icon ?? null,
            card_badge:
              typeof raw.card_badge === 'string'
                ? raw.card_badge
                : (typeof (raw as { tag?: unknown }).tag === 'string'
                    ? ((raw as { tag?: string }).tag ?? null)
                    : existing?.card_badge ?? null),
          };

          map.set(groupName, merged);
        }
      } else if (groupError && isAdhkarGroupsSchemaMismatch(groupError.message)) {
        markAdhkarGroupsSchemaBackoff();
      }
    } catch {
      // Keep row-derived group metadata when adhkar_groups is unavailable.
    }

    return Array.from(map.values()).sort((a, b) => a.group_order - b.group_order);
  } catch {
    return [];
  }
}

export async function fetchAllActiveAdhkarGroupsForWarmup(): Promise<AdhkarGroupWarmupRow[]> {
  try {
    if (shouldSkipAdhkarGroupsMetadataQuery()) return [];

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('adhkar_groups')
      .select('*')
      .eq('is_active', true);

    if (error) {
      if (!isAdhkarGroupsSchemaMismatch(error.message)) return [];

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('adhkar_groups')
        .select('*');

      if (fallbackError || !Array.isArray(fallbackData)) {
        if (fallbackError && isAdhkarGroupsSchemaMismatch(fallbackError.message)) {
          markAdhkarGroupsSchemaBackoff();
        }
        return [];
      }

      return mapWarmupRows(fallbackData as Array<Record<string, unknown>>);
    }

    if (!Array.isArray(data)) return [];
    return mapWarmupRows(data as Array<Record<string, unknown>>);
  } catch {
    return [];
  }
}

// ── Sunnah Reminders ──────────────────────────────────────────────────────

export interface SunnahReminderRow {
  id: string;
  title: string;
  description: string | null;
  reference: string | null;
  icon: string | null;
  friday_only: boolean;
  category?: string | null;
  display_order: number;
  is_active: boolean;
}

function isMissingSunnahIconColumn(message: string | null | undefined): boolean {
  const value = (message ?? '').toLowerCase();
  return value.includes('sunnah_reminders.icon') && value.includes('does not exist');
}

export async function fetchSunnahReminders(): Promise<SunnahReminderRow[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sunnah_reminders')
      .select('id, title, description, reference, icon, category, display_order, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      if (!isMissingSunnahIconColumn(error.message)) return [];

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('sunnah_reminders')
        .select('id, title, description, reference, category, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fallbackError || !fallbackData || fallbackData.length === 0) return [];

      return (fallbackData as Array<{
        id: string;
        title: string;
        description: string | null;
        reference: string | null;
        category: string | null;
        display_order: number;
        is_active: boolean;
      }>).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        reference: row.reference,
        icon: 'star',
        friday_only: (row.category ?? '').toLowerCase() === 'friday',
        category: row.category,
        display_order: row.display_order,
        is_active: row.is_active,
      }));
    }

    if (!data || data.length === 0) return [];

    return (data as Array<{
      id: string;
      title: string;
      description: string | null;
      reference: string | null;
      icon: string | null;
      category: string | null;
      display_order: number;
      is_active: boolean;
    }>).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      reference: row.reference,
      icon: row.icon ?? 'star',
      friday_only: (row.category ?? '').toLowerCase() === 'friday',
      category: row.category,
      display_order: row.display_order,
      is_active: row.is_active,
    }));
  } catch {
    return [];
  }
}

// ── Announcements ─────────────────────────────────────────────────────────

type AnnouncementFeedItem = Record<string, unknown>;

type AnnouncementFeedResponse = {
  announcements?: AnnouncementFeedItem[];
  data?: AnnouncementFeedItem[];
};

function getSupabaseEnv() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

function normalizeNameList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

function joinNameList(value: unknown): string | null {
  const names = normalizeNameList(value);
  return names.length > 0 ? names.join(', ') : null;
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapAnnouncementRow(raw: Record<string, unknown>): AnnouncementRow {
  const typeValue =
    asTrimmedString(raw.type)
    ?? asTrimmedString(raw.event_type)
    ?? asTrimmedString(raw.category)
    ?? null;

  const bodyHtml =
    asTrimmedString(raw.body_html)
    ?? asTrimmedString(raw.body)
    ?? null;

  const bodyPlain =
    asTrimmedString(raw.body_plain)
    ?? (bodyHtml ? stripHtml(bodyHtml) : '');

  const legacyUrduTitle = asTrimmedString(raw['Urdu title']);
  const legacyUrduGuests = raw['Urdu guests'];

  const urduTitle =
    asTrimmedString(raw.urdu_title)
    ?? legacyUrduTitle
    ?? null;

  const urduBody =
    asTrimmedString(raw.urdu_body)
    ?? asTrimmedString(raw.urdu_translation)
    ?? null;

  const leadNames =
    joinNameList(raw.lead_names)
    ?? joinNameList(raw.guests)
    ?? joinNameList(raw.guest_speakers)
    ?? joinNameList(raw.teacher_name)
    ?? null;

  const urduLeadNames =
    joinNameList(raw.urdu_lead_names)
    ?? joinNameList(raw.guest_urdu)
    ?? joinNameList(legacyUrduGuests)
    ?? joinNameList(raw.urdu_guest_speakers)
    ?? joinNameList(raw.urdu_teacher_name)
    ?? null;

  const publishedAt =
    asTrimmedString(raw.published_at)
    ?? asTrimmedString(raw.created_at)
    ?? new Date().toISOString();

  const category =
    asTrimmedString(raw.category)
    ?? typeValue
    ?? 'General';

  return {
    id: asTrimmedString(raw.id) ?? `${publishedAt}-${Math.random().toString(16).slice(2, 8)}`,
    title: asTrimmedString(raw.title) ?? 'Announcement',
    body: bodyPlain,
    category,
    is_active: raw.is_active !== false,
    pinned: asBoolean(raw.pinned),
    published_at: publishedAt,
    expires_at: asTrimmedString(raw.expires_at),
    type: typeValue,
    tag: asBoolean(raw.tag),
    body_html: bodyHtml,
    body_plain: bodyPlain,
    urdu_title: urduTitle,
    urdu_body: urduBody,
    lead_names: leadNames,
    urdu_lead_names: urduLeadNames,
    start_time:
      asTrimmedString(raw.start_time)
      ?? asTrimmedString(raw.time)
      ?? asTrimmedString(raw.event_time)
      ?? null,
    image_url: asTrimmedString(raw.image_url),
    link_url: asTrimmedString(raw.link_url),
    display_order: typeof raw.display_order === 'number' ? raw.display_order : null,
    updated_at: asTrimmedString(raw.updated_at),
  };
}

function applyTypeFilter(rows: AnnouncementRow[], typeFilter?: string | null): AnnouncementRow[] {
  const typeValue = (typeFilter ?? '').trim();
  if (!typeValue || typeValue.toLowerCase() === 'all') {
    return rows;
  }

  const normalized = typeValue.toLowerCase();
  return rows.filter((row) => {
    const typeCandidate = (row.type ?? row.category ?? '').trim().toLowerCase();
    return typeCandidate === normalized;
  });
}

function sortAnnouncements(rows: AnnouncementRow[]): AnnouncementRow[] {
  return [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const aDate = Date.parse(a.published_at || '');
    const bDate = Date.parse(b.published_at || '');
    const safeADate = Number.isFinite(aDate) ? aDate : 0;
    const safeBDate = Number.isFinite(bDate) ? bDate : 0;
    if (safeADate !== safeBDate) return safeBDate - safeADate;
    const aOrder = typeof a.display_order === 'number' ? a.display_order : Number.MAX_SAFE_INTEGER;
    const bOrder = typeof b.display_order === 'number' ? b.display_order : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

function isAnnouncementArray(value: unknown): value is AnnouncementRow[] {
  return Array.isArray(value);
}

async function writeAnnouncementsCache(rows: AnnouncementRow[]): Promise<void> {
  const payload: AnnouncementsCachePayload = {
    updatedAt: Date.now(),
    rows,
  };
  announcementsMemoryCache = payload;

  try {
    await AsyncStorage.setItem(ANNOUNCEMENTS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failures and continue with memory cache
  }
}

async function readAnnouncementsCache(): Promise<AnnouncementRow[]> {
  if (announcementsMemoryCache && isAnnouncementArray(announcementsMemoryCache.rows)) {
    return announcementsMemoryCache.rows;
  }

  try {
    const stored = await AsyncStorage.getItem(ANNOUNCEMENTS_CACHE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Partial<AnnouncementsCachePayload>;
    if (!parsed || !Array.isArray(parsed.rows)) return [];
    const rows = parsed.rows
      .map((row) => mapAnnouncementRow(row as unknown as Record<string, unknown>));
    announcementsMemoryCache = {
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      rows,
    };
    return rows;
  } catch {
    return [];
  }
}

async function invokeAnnouncementsFeed(typeFilter?: string | null): Promise<AnnouncementRow[] | null> {
  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANNOUNCEMENTS_FETCH_TIMEOUT_MS);

    const response = await fetch(`${url}/functions/v1/announcements-feed-format`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: 100,
        offset: 0,
        type: (typeFilter ?? '').trim() || undefined,
        includeUrdu: true,
        formatRichText: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as AnnouncementFeedResponse;
    const sourceRows = Array.isArray(payload.announcements)
      ? payload.announcements
      : (Array.isArray(payload.data) ? payload.data : []);

    return sortAnnouncements(sourceRows.map((row) => mapAnnouncementRow(row)));
  } catch {
    return null;
  }
}

async function fetchAnnouncementsDirect(): Promise<AnnouncementRow[] | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true);

    if (error || !Array.isArray(data)) return null;

    const rows = data
      .map((row) => mapAnnouncementRow(row as Record<string, unknown>));

    return sortAnnouncements(rows);
  } catch {
    return null;
  }
}

export async function fetchAnnouncementsWithMeta(options?: { typeFilter?: string | null }): Promise<AnnouncementFetchResult> {
  const fetchedAt = Date.now();
  const typeFilter = options?.typeFilter ?? null;

  const edgeRows = await invokeAnnouncementsFeed(typeFilter);
  if (edgeRows) {
    const filtered = applyTypeFilter(edgeRows, typeFilter);
    await writeAnnouncementsCache(filtered);
    return {
      rows: filtered,
      meta: {
        source: 'edge',
        usedFallback: false,
        fromCache: false,
        notice: null,
        error: null,
        fetchedAt,
      },
    };
  }

  const directRows = await fetchAnnouncementsDirect();
  if (directRows) {
    const filtered = applyTypeFilter(directRows, typeFilter);
    await writeAnnouncementsCache(filtered);
    return {
      rows: filtered,
      meta: {
        source: 'fallback-table',
        usedFallback: true,
        fromCache: false,
        notice: 'Live feed unavailable. Showing fallback data.',
        error: null,
        fetchedAt,
      },
    };
  }

  const cachedRows = await readAnnouncementsCache();
  if (cachedRows.length > 0) {
    const filtered = applyTypeFilter(cachedRows, typeFilter);
    return {
      rows: filtered,
      meta: {
        source: 'cache',
        usedFallback: true,
        fromCache: true,
        notice: 'Offline mode. Showing cached announcements.',
        error: null,
        fetchedAt,
      },
    };
  }

  return {
    rows: [],
    meta: {
      source: 'empty',
      usedFallback: true,
      fromCache: false,
      notice: null,
      error: 'Refresh failed. Please retry.',
      fetchedAt,
    },
  };
}

export async function fetchAnnouncements(): Promise<AnnouncementRow[]> {
  const result = await fetchAnnouncementsWithMeta();
  return result.rows;
}
