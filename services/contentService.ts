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
const HOWTO_GUIDES_TTL_MS = 12 * 60 * 60 * 1000;
const QASEEDAH_NAAT_CACHE_KEY = '@qaseedah_naat_cache_v1';
const QASEEDAH_NAAT_GROUP_CACHE_PREFIX = '@qaseedah_naat_group_cache_v1:';
const QASEEDAH_NAAT_TTL_MS = 12 * 60 * 60 * 1000;
const ANNOUNCEMENTS_FETCH_TIMEOUT_MS = 8000;
const ANNOUNCEMENTS_EDGE_PAGE_SIZE = 200;
const ANNOUNCEMENTS_EDGE_MAX_PAGES = 10;
const TRANSLATE_URDU_BACKOFF_MS = 5 * 60 * 1000;
const legacyEventDateWarningIds = new Set<string>();

let translateUrduBackoffUntil = 0;

type AnnouncementsCachePayload = {
  updatedAt: number;
  rows: AnnouncementRow[];
};

type HowToCachePayload = {
  updatedAt: number;
  rows: HowToGuide[];
};

type QaseedahNaatCachePayload = {
  updatedAt: number;
  rows: AdhkarRow[];
};

let announcementsMemoryCache: AnnouncementsCachePayload | null = null;
const howToGuidesMemoryCache = new Map<string, HowToCachePayload>();
let qaseedahNaatMemoryCache: QaseedahNaatCachePayload | null = null;
const qaseedahNaatGroupMemoryCache = new Map<string, QaseedahNaatCachePayload>();
let qaseedahNaatFetchInFlight: Promise<AdhkarRow[]> | null = null;
const qaseedahNaatGroupFetchInFlight = new Map<string, Promise<AdhkarRow[]>>();
const howToFetchInFlight = new Map<'en' | 'ur', Promise<HowToGuide[]>>();

function isCacheFresh(updatedAt: number, ttlMs: number): boolean {
  return Date.now() - updatedAt <= ttlMs;
}

function buildHowToCacheKey(language: 'en' | 'ur'): string {
  return `${HOWTO_GUIDES_CACHE_PREFIX}${language}`;
}

function normalizeQaseedahGroupKeyPart(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildQaseedahGroupCacheKey(groupName: string, contentType: 'qaseedah' | 'naat'): string {
  const normalizedGroup = normalizeQaseedahGroupKeyPart(groupName);
  return `${QASEEDAH_NAAT_GROUP_CACHE_PREFIX}${contentType}:${normalizedGroup}`;
}

async function readCachedHowToGuides(
  language: 'en' | 'ur',
  options?: { allowExpired?: boolean },
): Promise<HowToGuide[] | null> {
  const allowExpired = options?.allowExpired === true;
  const memory = howToGuidesMemoryCache.get(language);
  if (memory && (allowExpired || isCacheFresh(memory.updatedAt, HOWTO_GUIDES_TTL_MS))) {
    return memory.rows;
  }

  try {
    const raw = await AsyncStorage.getItem(buildHowToCacheKey(language));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HowToCachePayload;
    if (!parsed || !Array.isArray(parsed.rows) || typeof parsed.updatedAt !== 'number') return null;

    howToGuidesMemoryCache.set(language, parsed);
    if (allowExpired || isCacheFresh(parsed.updatedAt, HOWTO_GUIDES_TTL_MS)) {
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

async function readCachedQaseedahNaatEntries(options?: { allowExpired?: boolean }): Promise<AdhkarRow[] | null> {
  const allowExpired = options?.allowExpired === true;

  if (qaseedahNaatMemoryCache && (allowExpired || isCacheFresh(qaseedahNaatMemoryCache.updatedAt, QASEEDAH_NAAT_TTL_MS))) {
    return qaseedahNaatMemoryCache.rows;
  }

  try {
    const raw = await AsyncStorage.getItem(QASEEDAH_NAAT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QaseedahNaatCachePayload;
    if (!parsed || !Array.isArray(parsed.rows) || typeof parsed.updatedAt !== 'number') return null;

    qaseedahNaatMemoryCache = parsed;
    if (allowExpired || isCacheFresh(parsed.updatedAt, QASEEDAH_NAAT_TTL_MS)) {
      return parsed.rows;
    }
  } catch {
    return null;
  }

  return null;
}

async function writeCachedQaseedahNaatEntries(rows: AdhkarRow[]): Promise<void> {
  const payload: QaseedahNaatCachePayload = {
    updatedAt: Date.now(),
    rows,
  };

  qaseedahNaatMemoryCache = payload;
  try {
    await AsyncStorage.setItem(QASEEDAH_NAAT_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage write issues
  }
}

async function readCachedQaseedahNaatGroupEntries(
  groupName: string,
  contentType: 'qaseedah' | 'naat',
  options?: { allowExpired?: boolean },
): Promise<AdhkarRow[] | null> {
  const allowExpired = options?.allowExpired === true;
  const cacheKey = buildQaseedahGroupCacheKey(groupName, contentType);
  const memory = qaseedahNaatGroupMemoryCache.get(cacheKey);

  if (memory && (allowExpired || isCacheFresh(memory.updatedAt, QASEEDAH_NAAT_TTL_MS))) {
    return memory.rows;
  }

  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QaseedahNaatCachePayload;
    if (!parsed || !Array.isArray(parsed.rows) || typeof parsed.updatedAt !== 'number') return null;

    qaseedahNaatGroupMemoryCache.set(cacheKey, parsed);
    if (allowExpired || isCacheFresh(parsed.updatedAt, QASEEDAH_NAAT_TTL_MS)) {
      return parsed.rows;
    }
  } catch {
    return null;
  }

  return null;
}

async function writeCachedQaseedahNaatGroupEntries(
  groupName: string,
  contentType: 'qaseedah' | 'naat',
  rows: AdhkarRow[],
): Promise<void> {
  const cacheKey = buildQaseedahGroupCacheKey(groupName, contentType);
  const payload: QaseedahNaatCachePayload = {
    updatedAt: Date.now(),
    rows,
  };

  qaseedahNaatGroupMemoryCache.set(cacheKey, payload);
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
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

export interface IslamicCalendarEventRow {
  id: string;
  title: string;
  event_type: 'important_date' | 'masjid_event';
  field_label: string | null;
  region: string | null;
  notes: string | null;
  source_name: string | null;
  linked_hijri_label: string;
  linked_gregorian_date: string;
  auto_delete_grace_days: number;
  source_announcement_id?: string | null;
  source_link_url?: string | null;
}

type RawIslamicCalendarEventRow = IslamicCalendarEventRow & {
  linked_hijri_day?: number | null;
  linked_hijri_month?: number | null;
  linked_hijri_year?: number | null;
};

const HIJRI_MONTH_ALIASES: Record<string, number> = {
  muharram: 1,
  safar: 2,
  rabialawwal: 3,
  rabialawal: 3,
  rabiulawwal: 3,
  rabiulawal: 3,
  rabialthani: 4,
  rabialakhir: 4,
  rabiuthani: 4,
  rabiulakhir: 4,
  jumadaalula: 5,
  jumadaula: 5,
  jumadaalawwal: 5,
  jumadaalakhirah: 6,
  jumadaalthaniah: 6,
  rajab: 7,
  shaban: 8,
  shaaban: 8,
  ramadan: 9,
  shawwal: 10,
  dhulqadah: 11,
  dhualqadah: 11,
  dhulhijjah: 12,
  dhualhijjah: 12,
};

function normalizeHijriMonthName(value: string): string {
  // NFD decomposes e.g. ā→a+combining-macron, ī→i+combining-macron
  // then strip combining diacritics (0300-036f) and Arabic-style modifier letters (02b0-02ff, e.g. ʿ ayin)
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u02b0-\u02ff]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

function parseHijriDayMonth(value: string | null | undefined): { day: number; month: number } | null {
  const text = (value ?? '').trim();
  if (!text) return null;

  // Match "12 Rabīʿ al-awwal 1448 AH" — capture day then month name (stop before 4-digit year)
  const match = text.match(/\b(\d{1,2})\s+(.+?)\s+\d{4}/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  if (!Number.isFinite(day) || day < 1 || day > 30) return null;

  const month = HIJRI_MONTH_ALIASES[normalizeHijriMonthName(match[2])];
  if (!month) return null;

  return { day, month };
}

function isIsoDateInRange(value: string | null | undefined, start: string, end: string): boolean {
  const text = (value ?? '').trim();
  if (!text) return false;
  return text >= start && text <= end;
}

function mapRawIslamicEventRow(row: RawIslamicCalendarEventRow): IslamicCalendarEventRow {
  return {
    id: row.id,
    title: row.title,
    event_type: row.event_type,
    field_label: row.field_label,
    region: row.region,
    notes: row.notes,
    source_name: row.source_name,
    linked_hijri_label: row.linked_hijri_label,
    linked_gregorian_date: row.linked_gregorian_date,
    auto_delete_grace_days: row.auto_delete_grace_days,
    source_announcement_id: row.source_announcement_id,
    source_link_url: row.source_link_url,
  };
}

export async function fetchIslamicCalendarEventsForMonth(
  year: number,
  month: number
): Promise<IslamicCalendarEventRow[]> {
  try {
    const supabase = getSupabaseClient();
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEndDate = new Date(year, month, 0);
    const monthEnd = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth() + 1).padStart(2, '0')}-${String(monthEndDate.getDate()).padStart(2, '0')}`;
    const selectFields = 'id,title,event_type,field_label,region,notes,source_name,linked_hijri_label,linked_hijri_day,linked_hijri_month,linked_hijri_year,linked_gregorian_date,auto_delete_grace_days';

    // Fetch ALL important_date events (no Gregorian date filter).
    // Many rows have stale linked_gregorian_date from a previous year; we remap them
    // below using the current year's hijri_calendar so they show at the correct date.
    const { data: allData, error: allError } = await supabase
      .from('islamic_calendar_events')
      .select(selectFields)
      .eq('event_type', 'important_date')
      .order('linked_hijri_month', { ascending: true })
      .order('linked_hijri_day', { ascending: true });

    if (allError || !Array.isArray(allData) || allData.length === 0) return [];

    // Build a full-year Hijri→Gregorian map from the hijri_calendar table.
    // Using the whole year (not just the viewed month) means events in any
    // Hijri month can be remapped to their correct Gregorian date in this year.
    const { data: hijriYearData } = await supabase
      .from('hijri_calendar')
      .select('gregorian_date,hijri_date')
      .eq('gregorian_year', year)
      .order('gregorian_date', { ascending: true });

    const gregorianByHijriKey = new Map<string, string>();
    if (Array.isArray(hijriYearData)) {
      hijriYearData.forEach((entry: { gregorian_date: string; hijri_date: string }) => {
        const parsed = parseHijriDayMonth(entry.hijri_date);
        if (!parsed) return;
        const key = `${parsed.month}:${parsed.day}`;
        // First occurrence wins (earlier in year = current Hijri year for that month)
        if (!gregorianByHijriKey.has(key)) {
          gregorianByHijriKey.set(key, entry.gregorian_date);
        }
      });
    }

    const results: RawIslamicCalendarEventRow[] = [];
    const seenIds = new Set<string>();

    (allData as RawIslamicCalendarEventRow[]).forEach((row) => {
      // Step 1: if the stored Gregorian date is already in the viewed month, use it as-is.
      if (isIsoDateInRange(row.linked_gregorian_date, monthStart, monthEnd)) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          results.push(row);
        }
        return;
      }

      // Step 2: remap via Hijri day+month to the current year.
      // This handles events whose linked_gregorian_date is from a prior year.
      const hijriDay = typeof row.linked_hijri_day === 'number' ? row.linked_hijri_day : null;
      const hijriMonth = typeof row.linked_hijri_month === 'number' ? row.linked_hijri_month : null;
      const parsedFromLabel = parseHijriDayMonth(row.linked_hijri_label);

      const resolvedDay = (hijriDay && hijriDay >= 1 && hijriDay <= 30) ? hijriDay : (parsedFromLabel?.day ?? null);
      const resolvedMonth = (hijriMonth && hijriMonth >= 1 && hijriMonth <= 12) ? hijriMonth : (parsedFromLabel?.month ?? null);
      if (!resolvedDay || !resolvedMonth) return;

      const mappedDate = gregorianByHijriKey.get(`${resolvedMonth}:${resolvedDay}`);
      if (!mappedDate) return;

      // Only include if the remapped date falls inside the viewed month.
      if (!isIsoDateInRange(mappedDate, monthStart, monthEnd)) return;

      if (!seenIds.has(row.id)) {
        seenIds.add(row.id);
        results.push({ ...row, linked_gregorian_date: mappedDate });
      }
    });

    return results
      .map(mapRawIslamicEventRow)
      .sort((a, b) => a.linked_gregorian_date.localeCompare(b.linked_gregorian_date) || a.title.localeCompare(b.title));
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
    primary_language?: 'auto' | 'arabic' | 'transliteration' | 'urdu' | 'english';
    disable_auto_translation?: boolean;
    disable_auto_transliteration?: boolean;
    disable_auto_arabic?: boolean;
    disable_auto_english?: boolean;
    disable_auto_urdu?: boolean;
    disable_auto_title_arabic?: boolean;
    disable_auto_title_english?: boolean;
    disable_auto_title_urdu?: boolean;
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
  urdu_name: string | null;
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
  event_date?: string | null;
  recurrence_type?: 'none' | 'weekly' | 'monthly' | null;
  recurrence_interval?: number | null;
  recurrence_weekday?: number | null;
  recurrence_month_day?: number | null;
  recurrence_until?: string | null;
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

function mapQaseedahNaatRows(data: Array<Record<string, unknown>>): AdhkarRow[] {
  return data.map((row) => {
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
}

async function seedQaseedahGroupCaches(rows: AdhkarRow[]): Promise<void> {
  if (rows.length === 0) return;

  const grouped = new Map<string, AdhkarRow[]>();
  for (const row of rows) {
    const groupName = (row.group_name ?? '').trim();
    const contentType = row.content_type === 'naat' ? 'naat' : 'qaseedah';
    if (!groupName) continue;

    const bucketKey = `${contentType}:${groupName}`;
    const bucket = grouped.get(bucketKey) ?? [];
    bucket.push(row);
    grouped.set(bucketKey, bucket);
  }

  await Promise.allSettled(
    Array.from(grouped.entries()).map(([bucketKey, bucketRows]) => {
      const separatorIndex = bucketKey.indexOf(':');
      const contentType = bucketKey.slice(0, separatorIndex) as 'qaseedah' | 'naat';
      const groupName = bucketKey.slice(separatorIndex + 1);
      return writeCachedQaseedahNaatGroupEntries(groupName, contentType, bucketRows);
    })
  );
}

async function fetchQaseedahNaatEntriesFromNetwork(): Promise<AdhkarRow[]> {
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

  const mapped = mapQaseedahNaatRows(data as Array<Record<string, unknown>>);

  if (mapped.length > 0) {
    await writeCachedQaseedahNaatEntries(mapped);
    void seedQaseedahGroupCaches(mapped);
  }

  return mapped;
}

async function fetchQaseedahNaatEntriesForGroupFromNetwork(
  groupName: string,
  contentType: 'qaseedah' | 'naat',
): Promise<AdhkarRow[]> {
  const supabase = getSupabaseClient();
  const normalizedGroupName = groupName.trim();
  if (!normalizedGroupName) return [];

  const { data: groups, error: groupError } = await supabase
    .from('qaseedah_naat_groups')
    .select('id')
    .eq('name', normalizedGroupName)
    .limit(1);

  if (groupError || !groups || groups.length === 0) {
    return [];
  }

  const groupId = typeof groups[0].id === 'string' ? groups[0].id : '';
  if (!groupId) return [];

  const { data, error } = await supabase
    .from('qaseedah_naat_entries')
    .select('id,content_type,title,arabic_title,arabic,transliteration,translation,urdu_translation,reference,count,prayer_time,display_order,is_active,sections,file_url,tafsir,description,qaseedah_naat_groups(name,description,display_order)')
    .eq('is_active', true)
    .eq('content_type', contentType)
    .eq('group_id', groupId)
    .order('display_order', { ascending: true });

  if (error || !data) return [];

  const mapped = mapQaseedahNaatRows(data as Array<Record<string, unknown>>);

  if (mapped.length > 0) {
    await writeCachedQaseedahNaatGroupEntries(normalizedGroupName, contentType, mapped);
  }

  return mapped;
}

function fetchQaseedahNaatEntriesFromNetworkDeduped(): Promise<AdhkarRow[]> {
  if (qaseedahNaatFetchInFlight) {
    return qaseedahNaatFetchInFlight;
  }

  qaseedahNaatFetchInFlight = fetchQaseedahNaatEntriesFromNetwork().finally(() => {
    qaseedahNaatFetchInFlight = null;
  });

  return qaseedahNaatFetchInFlight;
}

function fetchQaseedahNaatEntriesForGroupFromNetworkDeduped(
  groupName: string,
  contentType: 'qaseedah' | 'naat',
): Promise<AdhkarRow[]> {
  const cacheKey = buildQaseedahGroupCacheKey(groupName, contentType);
  const inflight = qaseedahNaatGroupFetchInFlight.get(cacheKey);
  if (inflight) return inflight;

  const request = fetchQaseedahNaatEntriesForGroupFromNetwork(groupName, contentType).finally(() => {
    if (qaseedahNaatGroupFetchInFlight.get(cacheKey) === request) {
      qaseedahNaatGroupFetchInFlight.delete(cacheKey);
    }
  });

  qaseedahNaatGroupFetchInFlight.set(cacheKey, request);
  return request;
}

export async function fetchQaseedahNaatEntries(options?: { forceRefresh?: boolean }): Promise<AdhkarRow[]> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh) {
    const freshCache = await readCachedQaseedahNaatEntries();
    if (freshCache && freshCache.length > 0) {
      return freshCache;
    }

    const staleCache = await readCachedQaseedahNaatEntries({ allowExpired: true });
    if (staleCache && staleCache.length > 0) {
      // Keep stale content fast while refreshing in the background.
      void fetchQaseedahNaatEntriesFromNetworkDeduped().catch(() => {});
      return staleCache;
    }
  }

  try {
    const liveRows = await fetchQaseedahNaatEntriesFromNetworkDeduped();
    return liveRows;
  } catch {
    // fall back to the latest cached payload below
  }

  const fallback = await readCachedQaseedahNaatEntries({ allowExpired: true });
  return fallback ?? [];
}

export async function fetchQaseedahNaatEntriesForGroup(
  groupName: string,
  contentType: 'qaseedah' | 'naat',
  options?: { forceRefresh?: boolean },
): Promise<AdhkarRow[]> {
  const normalizedGroupName = groupName.trim();
  if (!normalizedGroupName) return [];

  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh) {
    const freshGroupCache = await readCachedQaseedahNaatGroupEntries(normalizedGroupName, contentType);
    if (freshGroupCache && freshGroupCache.length > 0) {
      return freshGroupCache;
    }

    const freshGlobalCache = await readCachedQaseedahNaatEntries();
    if (freshGlobalCache && freshGlobalCache.length > 0) {
      const filtered = freshGlobalCache.filter((row) => (
        (row.group_name || 'General') === normalizedGroupName
        && (row.content_type || 'qaseedah') === contentType
      ));
      if (filtered.length > 0) {
        void writeCachedQaseedahNaatGroupEntries(normalizedGroupName, contentType, filtered).catch(() => {});
        return filtered;
      }
    }

    const staleGroupCache = await readCachedQaseedahNaatGroupEntries(normalizedGroupName, contentType, { allowExpired: true });
    if (staleGroupCache && staleGroupCache.length > 0) {
      // Keep stale group content fast while refreshing in the background.
      void fetchQaseedahNaatEntriesForGroupFromNetworkDeduped(normalizedGroupName, contentType).catch(() => {});
      return staleGroupCache;
    }
  }

  try {
    const liveRows = await fetchQaseedahNaatEntriesForGroupFromNetworkDeduped(normalizedGroupName, contentType);
    return liveRows;
  } catch {
    // fall back to stale cache below
  }

  const fallbackGroup = await readCachedQaseedahNaatGroupEntries(normalizedGroupName, contentType, { allowExpired: true });
  if (fallbackGroup && fallbackGroup.length > 0) {
    return fallbackGroup;
  }

  const fallbackGlobal = await readCachedQaseedahNaatEntries({ allowExpired: true });
  if (!fallbackGlobal || fallbackGlobal.length === 0) {
    return [];
  }

  return fallbackGlobal.filter((row) => (
    (row.group_name || 'General') === normalizedGroupName
    && (row.content_type || 'qaseedah') === contentType
  ));
}

async function fetchHowToGuidesFromNetwork(language: 'en' | 'ur'): Promise<HowToGuide[]> {
  const supabase = getSupabaseClient();

  const { data: guides, error: guidesError } = await supabase
    .from('howto_guides')
    .select('id,group_id,slug,title,subtitle,intro,notes,language,icon,color,display_order,publish_start_at,publish_end_at')
    .eq('is_active', true)
    .eq('language', language)
    .order('display_order', { ascending: true })
    .order('title', { ascending: true });

  if (guidesError || !guides || guides.length === 0) return [];

  const now = Date.now();
  const guidesFiltered = guides.filter((g: { publish_start_at: string | null; publish_end_at: string | null }) => {
    const start = g.publish_start_at ? new Date(g.publish_start_at).getTime() : null;
    const end = g.publish_end_at ? new Date(g.publish_end_at).getTime() : null;
    if (start !== null && start > now) return false;
    if (end !== null && end <= now) return false;
    return true;
  });
  if (guidesFiltered.length === 0) return [];

  const guideRows = guidesFiltered as HowToGuideRow[];
  const guideIds = guideRows.map((row) => row.id);
  const groupIds = Array.from(new Set(guideRows.map((row) => row.group_id)));

  const groupsResult = await supabase
    .from('howto_groups')
    .select('id,name,urdu_name')
    .in('id', groupIds);

  const groupRows = groupsResult.error ? [] : ((groupsResult.data ?? []) as HowToGroupRow[]);

  const QUERY_CHUNK_SIZE = 120;

  const guideIdChunks: string[][] = [];
  for (let i = 0; i < guideIds.length; i += QUERY_CHUNK_SIZE) {
    guideIdChunks.push(guideIds.slice(i, i + QUERY_CHUNK_SIZE));
  }

  let sectionRows: HowToSectionRow[] = [];
  if (guideIdChunks.length > 0) {
    const sectionChunkResults = await Promise.all(
      guideIdChunks.map(async (chunk) => supabase
        .from('howto_sections')
        .select('id,guide_id,heading,section_order')
        .in('guide_id', chunk)
        .order('section_order', { ascending: true })),
    );

    for (const result of sectionChunkResults) {
      if (!result.error) {
        sectionRows.push(...((result.data ?? []) as HowToSectionRow[]));
      }
    }
  }

  const sectionIds = sectionRows.map((section) => section.id);

  let stepRows: HowToStepRow[] = [];
  if (sectionIds.length > 0) {
    const sectionIdChunks: string[][] = [];
    for (let i = 0; i < sectionIds.length; i += QUERY_CHUNK_SIZE) {
      sectionIdChunks.push(sectionIds.slice(i, i + QUERY_CHUNK_SIZE));
    }

    const stepChunkResults = await Promise.all(
      sectionIdChunks.map(async (chunk) => supabase
        .from('howto_steps')
        .select('id,section_id,step_order,title,detail,note')
        .in('section_id', chunk)
        .order('step_order', { ascending: true })),
    );

    for (const result of stepChunkResults) {
      if (!result.error) {
        stepRows.push(...((result.data ?? []) as HowToStepRow[]));
      }
    }
  }

  const stepIds = stepRows.map((step) => step.id);

  let blockRows: HowToStepBlockRow[] = [];
  let imageRows: HowToStepImageRow[] = [];
  if (stepIds.length > 0) {
    // Large `in(...)` filters can exceed transport/query limits and return empty datasets.
    // Query step-linked rows in chunks so structured blocks keep loading for big guide trees.
    const STEP_ID_CHUNK_SIZE = 120;
    const stepIdChunks: string[][] = [];
    for (let i = 0; i < stepIds.length; i += STEP_ID_CHUNK_SIZE) {
      stepIdChunks.push(stepIds.slice(i, i + STEP_ID_CHUNK_SIZE));
    }

    const [blockChunkResults, imageChunkResults] = await Promise.all([
      Promise.all(
        stepIdChunks.map(async (chunk) => supabase
          .from('howto_step_blocks')
          .select('step_id,block_order,kind,payload')
          .in('step_id', chunk)
          .order('block_order', { ascending: true })),
      ),
      Promise.all(
        stepIdChunks.map(async (chunk) => supabase
          .from('howto_step_images')
          .select('step_id,display_order,image_url,caption,source')
          .in('step_id', chunk)
          .order('display_order', { ascending: true })),
      ),
    ]);

    for (const result of blockChunkResults) {
      if (!result.error) {
        blockRows.push(...((result.data ?? []) as HowToStepBlockRow[]));
      }
    }

    for (const result of imageChunkResults) {
      if (!result.error) {
        imageRows.push(...((result.data ?? []) as HowToStepImageRow[]));
      }
    }
  }

  const groupNameById = new Map<string, string>();
  for (const group of groupRows) {
    const urduName = typeof group.urdu_name === 'string' ? group.urdu_name.trim() : '';
    groupNameById.set(group.id, language === 'ur' ? (urduName || group.name) : group.name);
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
  for (const block of blockRows) {
    const list = blocksByStepId.get(block.step_id) ?? [];
    list.push({ kind: block.kind, ...block.payload } as GuideBlock);
    blocksByStepId.set(block.step_id, list);
  }

  const imagesByStepId = new Map<string, HowToStepImage[]>();
  for (const image of imageRows) {
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
    notes: Array.isArray((guide as { notes?: unknown }).notes)
      ? ((guide as { notes?: unknown[] }).notes ?? []).filter((note): note is string => typeof note === 'string' && note.trim().length > 0)
      : undefined,
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
}

function fetchHowToGuidesFromNetworkDeduped(language: 'en' | 'ur'): Promise<HowToGuide[]> {
  const inflight = howToFetchInFlight.get(language);
  if (inflight) return inflight;

  const request = fetchHowToGuidesFromNetwork(language).finally(() => {
    if (howToFetchInFlight.get(language) === request) {
      howToFetchInFlight.delete(language);
    }
  });

  howToFetchInFlight.set(language, request);
  return request;
}

export async function fetchHowToGuides(language: 'en' | 'ur' = 'en', options?: { forceRefresh?: boolean }): Promise<HowToGuide[]> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh) {
    const freshCache = await readCachedHowToGuides(language);
    if (freshCache && freshCache.length > 0) {
      return freshCache;
    }

    const staleCache = await readCachedHowToGuides(language, { allowExpired: true });
    if (staleCache && staleCache.length > 0) {
      // Keep stale content fast while refreshing in the background.
      void fetchHowToGuidesFromNetworkDeduped(language).catch(() => {});
      return staleCache;
    }
  }

  try {
    const liveRows = await fetchHowToGuidesFromNetworkDeduped(language);
    return liveRows;
  } catch {
    // fall back to the latest cached payload below
  }

  const fallback = await readCachedHowToGuides(language, { allowExpired: true });
  return fallback ?? [];
}

export async function prewarmQaseedahAndHowToCaches(): Promise<void> {
  const qaseedahTask = fetchQaseedahNaatEntries()
    .then((rows) => {
      void seedQaseedahGroupCaches(rows);

      // Revalidate startup cache in background so users get updates quickly
      // without blocking first render of qaseedah/naat screens.
      return fetchQaseedahNaatEntries({ forceRefresh: true })
        .then((liveRows) => seedQaseedahGroupCaches(liveRows))
        .catch(() => {});
    });

  await Promise.allSettled([
    qaseedahTask,
    fetchHowToGuides('en'),
    fetchHowToGuides('ur'),
  ]);
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

function asInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeRecurrenceType(value: unknown): 'none' | 'weekly' | 'monthly' | null {
  const normalized = asTrimmedString(value)?.toLowerCase() ?? '';
  if (normalized === 'none' || normalized === 'weekly' || normalized === 'monthly') {
    return normalized;
  }
  return null;
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

function resolveAnnouncementEventDateWithSource(raw: Record<string, unknown>): {
  eventDate: string | null;
  source: 'event_date' | 'legacy' | 'none';
} {
  const canonical = asTrimmedString(raw.event_date);
  if (canonical) {
    return { eventDate: canonical, source: 'event_date' };
  }

  const legacy =
    asTrimmedString(raw.event_day)
    ?? asTrimmedString(raw.event_on)
    ?? asTrimmedString(raw.date)
    ?? null;

  if (legacy) {
    return { eventDate: legacy, source: 'legacy' };
  }

  return { eventDate: null, source: 'none' };
}

function mapAnnouncementRow(raw: Record<string, unknown>): AnnouncementRow {
  const resolvedId = asTrimmedString(raw.id);
  const fallbackId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const rowId = resolvedId ?? fallbackId;
  const { eventDate, source: eventDateSource } = resolveAnnouncementEventDateWithSource(raw);

  if (eventDateSource === 'legacy' && !legacyEventDateWarningIds.has(rowId)) {
    legacyEventDateWarningIds.add(rowId);
    console.warn('[announcements] Using legacy event date field; migrate this row to event_date', {
      id: rowId,
      event_day: asTrimmedString(raw.event_day),
      event_on: asTrimmedString(raw.event_on),
      date: asTrimmedString(raw.date),
    });
  }

  const typeValue =
    asTrimmedString(raw.type)
    ?? asTrimmedString(raw.event_type)
    ?? asTrimmedString(raw.category)
    ?? asTrimmedString(raw.tag)
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
    id: rowId,
    title: asTrimmedString(raw.title) ?? 'Announcement',
    body: bodyPlain,
    category,
    is_active: raw.is_active !== false,
    pinned: asBoolean(raw.pinned),
    published_at: publishedAt,
    expires_at: asTrimmedString(raw.expires_at),
    event_date: eventDate,
    recurrence_type: normalizeRecurrenceType(raw.recurrence_type),
    recurrence_interval: asInteger(raw.recurrence_interval),
    recurrence_weekday: asInteger(raw.recurrence_weekday),
    recurrence_month_day: asInteger(raw.recurrence_month_day),
    recurrence_until: asTrimmedString(raw.recurrence_until),
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
      ?? asTrimmedString(raw.event_time)
      ?? asTrimmedString(raw.time)
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

function isEventTaggedAnnouncement(row: AnnouncementRow): boolean {
  if (row.tag === true) return true;

  const hasExplicitEventDate = Boolean((row.event_date ?? '').trim());
  if (hasExplicitEventDate) return true;

  const hasTimeSlots = Boolean((row.start_time ?? '').trim());
  if (hasTimeSlots) return true;

  const normalizedType = (row.type ?? row.category ?? '').trim().toLowerCase();
  if (!normalizedType) return false;

  if (normalizedType.includes('event')) return true;

  const eventLikeTypes = new Set([
    'event',
    'events',
    'jalsa',
    'class',
    'special',
    'ramadan',
    'eid',
    'jumuah',
    'jumu\'ah',
    'lecture',
    'workshop',
    'community',
    'youth',
    'funeral',
    'nikah',
  ]);

  if (eventLikeTypes.has(normalizedType)) return true;

  return normalizedType === 'event';
}

function parseUtcDateParts(raw: string | null | undefined): { year: number; month: number; day: number; iso: string } | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth() + 1;
  const day = parsed.getUTCDate();
  return {
    year,
    month,
    day,
    iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

const TEXT_MONTH_TO_NUMBER: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function buildDateParts(year: number, month: number, day: number): { year: number; month: number; day: number; iso: string } | null {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() + 1 !== month
    || parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
    iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

function parseDatePartsFromText(
  raw: string | null | undefined,
  options?: { defaultYear?: number; defaultMonth?: number },
): { year: number; month: number; day: number; iso: string } | null {
  const text = (raw ?? '').trim();
  if (!text) return null;

  const defaultYear = options?.defaultYear;
  const defaultMonth = options?.defaultMonth;

  const isoMatch = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    return buildDateParts(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10),
      parseInt(isoMatch[3], 10),
    );
  }

  const dmyMatch = text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (dmyMatch) {
    return buildDateParts(
      parseInt(dmyMatch[3], 10),
      parseInt(dmyMatch[2], 10),
      parseInt(dmyMatch[1], 10),
    );
  }

  const dayMonthYearMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?\s*,?\s*(\d{4})\b/i);
  if (dayMonthYearMatch) {
    const monthKey = dayMonthYearMatch[2].toLowerCase().replace(/\./g, '');
    const month = TEXT_MONTH_TO_NUMBER[monthKey];
    if (month) {
      return buildDateParts(
        parseInt(dayMonthYearMatch[3], 10),
        month,
        parseInt(dayMonthYearMatch[1], 10),
      );
    }
  }

  const monthDayYearMatch = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})\b/i);
  if (monthDayYearMatch) {
    const monthKey = monthDayYearMatch[1].toLowerCase().replace(/\./g, '');
    const month = TEXT_MONTH_TO_NUMBER[monthKey];
    if (month) {
      return buildDateParts(
        parseInt(monthDayYearMatch[3], 10),
        month,
        parseInt(monthDayYearMatch[2], 10),
      );
    }
  }

  if (defaultYear) {
    const dayMonthMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\b/i);
    if (dayMonthMatch) {
      const monthKey = dayMonthMatch[2].toLowerCase().replace(/\./g, '');
      const month = TEXT_MONTH_TO_NUMBER[monthKey];
      if (month) {
        return buildDateParts(defaultYear, month, parseInt(dayMonthMatch[1], 10));
      }
    }

    const monthDayMatch = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
    if (monthDayMatch) {
      const monthKey = monthDayMatch[1].toLowerCase().replace(/\./g, '');
      const month = TEXT_MONTH_TO_NUMBER[monthKey];
      if (month) {
        return buildDateParts(defaultYear, month, parseInt(monthDayMatch[2], 10));
      }
    }

    const slashNoYear = text.match(/\b(\d{1,2})[\/-](\d{1,2})\b/);
    if (slashNoYear) {
      return buildDateParts(defaultYear, parseInt(slashNoYear[2], 10), parseInt(slashNoYear[1], 10));
    }

    if (defaultMonth) {
      const looksLikeTimeOnly = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(text) || /\b\d{1,2}:\d{2}\b/.test(text);
      if (!looksLikeTimeOnly) {
        const dayOnly = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
        if (dayOnly) {
          return buildDateParts(defaultYear, defaultMonth, parseInt(dayOnly[1], 10));
        }
      }
    }
  }

  return null;
}

function hasLikelyDateToken(raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;

  if (/\b\d{4}-\d{1,2}-\d{1,2}\b/.test(text)) return true;
  if (/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/.test(text)) return true;
  if (/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\b/i.test(text)) return true;
  if (/\b\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\b/i.test(text)) return true;
  if (/\b[A-Za-z]{3,9}\.?(?:\s+)\d{1,2}(?:st|nd|rd|th)?\b/i.test(text)) return true;

  return false;
}

function resolveAnnouncementEventDateParts(
  row: AnnouncementRow,
  fallbackYear?: number,
  fallbackMonth?: number,
): { year: number; month: number; day: number; iso: string } | null {
  const parseCandidate = (value: string | null | undefined) => (
    parseDatePartsFromText(value, { defaultYear: fallbackYear, defaultMonth: fallbackMonth })
    ?? parseUtcDateParts(value)
  );

  const explicitEventDate = parseCandidate(row.event_date);
  if (explicitEventDate) return explicitEventDate;

  const startTimeEntries = (row.start_time ?? '')
    .split(/\s*\|\s*|\n+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  for (const entry of startTimeEntries) {
    if (!hasLikelyDateToken(entry)) continue;
    const parsed = parseDatePartsFromText(entry, { defaultYear: fallbackYear, defaultMonth: fallbackMonth })
      ?? parseUtcDateParts(entry);
    if (parsed) return parsed;
  }

  const textCandidates = [row.title, row.body_plain ?? row.body];
  for (const candidate of textCandidates) {
    const parsed = parseDatePartsFromText(candidate, { defaultYear: fallbackYear, defaultMonth: fallbackMonth });
    if (parsed) return parsed;
  }

  const publishedDate = parseCandidate(row.published_at);
  if (publishedDate) return publishedDate;

  return parseCandidate(row.expires_at);
}

function normalizeAnnouncementRecurrenceType(value: string | null | undefined): 'none' | 'weekly' | 'monthly' {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'weekly' || normalized === 'monthly') return normalized;
  return 'none';
}

function isoFromUtcTimestamp(utcTimestamp: number): string {
  const date = new Date(utcTimestamp);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function resolveAnnouncementOccurrenceDatesForMonth(
  row: AnnouncementRow,
  year: number,
  month: number,
): string[] {
  const baseDate = resolveAnnouncementEventDateParts(row, year, month);
  if (!baseDate) return [];

  const recurrenceType = normalizeAnnouncementRecurrenceType(row.recurrence_type ?? null);
  const recurrenceInterval = Math.max(1, Math.min(52, Number(row.recurrence_interval) || 1));
  const untilParts = parseUtcDateParts(row.recurrence_until ?? null);

  const dayMs = 24 * 60 * 60 * 1000;
  const baseUtc = Date.UTC(baseDate.year, baseDate.month - 1, baseDate.day);
  const monthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStartUtc = Date.UTC(year, month - 1, 1);
  const monthEndUtc = Date.UTC(year, month - 1, monthDays);
  const untilUtc = untilParts ? Date.UTC(untilParts.year, untilParts.month - 1, untilParts.day) : null;

  if (recurrenceType === 'none') {
    if (baseDate.year !== year || baseDate.month !== month) return [];
    if (untilUtc !== null && baseUtc > untilUtc) return [];
    return [baseDate.iso];
  }

  if (recurrenceType === 'weekly') {
    const weekdayRaw = typeof row.recurrence_weekday === 'number' ? row.recurrence_weekday : null;
    const targetWeekday = weekdayRaw !== null && weekdayRaw >= 0 && weekdayRaw <= 6
      ? weekdayRaw
      : new Date(baseUtc).getUTCDay();

    const baseWeekday = new Date(baseUtc).getUTCDay();
    const weekdayShift = (targetWeekday - baseWeekday + 7) % 7;
    const anchorUtc = baseUtc + (weekdayShift * dayMs);

    const occurrenceDates: string[] = [];
    for (let day = 1; day <= monthDays; day += 1) {
      const occurrenceUtc = Date.UTC(year, month - 1, day);
      if (occurrenceUtc < monthStartUtc || occurrenceUtc > monthEndUtc) continue;
      if (untilUtc !== null && occurrenceUtc > untilUtc) continue;
      if (new Date(occurrenceUtc).getUTCDay() !== targetWeekday) continue;

      const diffDays = Math.floor((occurrenceUtc - anchorUtc) / dayMs);
      if (diffDays % 7 !== 0) continue;

      const diffWeeks = diffDays / 7;
      if (Math.abs(diffWeeks) % recurrenceInterval !== 0) continue;

      occurrenceDates.push(isoFromUtcTimestamp(occurrenceUtc));
    }

    return occurrenceDates;
  }

  const monthDayRaw = typeof row.recurrence_month_day === 'number' ? row.recurrence_month_day : null;
  const targetDay = monthDayRaw !== null && monthDayRaw >= 1 && monthDayRaw <= 31
    ? monthDayRaw
    : baseDate.day;

  if (targetDay > monthDays) return [];

  const occurrenceUtc = Date.UTC(year, month - 1, targetDay);
  if (untilUtc !== null && occurrenceUtc > untilUtc) return [];

  const baseMonthIndex = (baseDate.year * 12) + (baseDate.month - 1);
  const targetMonthIndex = (year * 12) + (month - 1);
  const diffMonths = targetMonthIndex - baseMonthIndex;
  if (Math.abs(diffMonths) % recurrenceInterval !== 0) return [];

  return [isoFromUtcTimestamp(occurrenceUtc)];
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
    const normalizedType = (typeFilter ?? '').trim() || undefined;
    const allRows: AnnouncementFeedItem[] = [];

    for (let pageIndex = 0; pageIndex < ANNOUNCEMENTS_EDGE_MAX_PAGES; pageIndex += 1) {
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
          limit: ANNOUNCEMENTS_EDGE_PAGE_SIZE,
          offset: pageIndex * ANNOUNCEMENTS_EDGE_PAGE_SIZE,
          type: normalizedType,
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

      if (sourceRows.length === 0) {
        break;
      }

      allRows.push(...sourceRows);

      if (sourceRows.length < ANNOUNCEMENTS_EDGE_PAGE_SIZE) {
        break;
      }
    }

    return sortAnnouncements(allRows.map((row) => mapAnnouncementRow(row)));
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

export async function fetchMasjidAnnouncementEventsForMonth(
  year: number,
  month: number
): Promise<IslamicCalendarEventRow[]> {
  try {
    const { rows, meta } = await fetchAnnouncementsWithMeta();

    if (meta.error) {
      console.warn('[announcements] Meta reported an announcement fetch issue for masjid events', {
        source: meta.source,
        notice: meta.notice,
        error: meta.error,
      });
    }

    const mapped = rows
      .filter((row) => row.is_active)
      .filter(isEventTaggedAnnouncement)
      .flatMap((row) => {
        const noteParts = [row.start_time, row.lead_names]
          .map((item) => (item ?? '').trim())
          .filter((item) => item.length > 0);

        const occurrenceDates = resolveAnnouncementOccurrenceDatesForMonth(row, year, month);
        if (occurrenceDates.length === 0) {
          console.warn('[announcements] Event-tagged row produced no in-month occurrences', {
            id: row.id,
            year,
            month,
            event_date: row.event_date ?? null,
            recurrence_type: row.recurrence_type ?? null,
            recurrence_interval: row.recurrence_interval ?? null,
            recurrence_until: row.recurrence_until ?? null,
          });
        }
        return occurrenceDates.map((isoDate) => ({
          id: `announcement-${row.id}-${isoDate}`,
          title: row.title,
          event_type: 'masjid_event' as const,
          field_label: row.type ?? row.category ?? null,
          region: null,
          notes: noteParts.length > 0 ? noteParts.join(' • ') : null,
          source_name: 'announcements',
          linked_hijri_label: '',
          linked_gregorian_date: isoDate,
          auto_delete_grace_days: 0,
          source_announcement_id: row.id,
          source_link_url: row.link_url ?? null,
        }));
      })
      .sort((a, b) => a.linked_gregorian_date.localeCompare(b.linked_gregorian_date) || a.title.localeCompare(b.title));

    return mapped;
  } catch (error) {
    console.error('[announcements] Failed to fetch masjid announcement events for month', {
      year,
      month,
      error,
    });
    return [];
  }
}
