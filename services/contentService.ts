/**
 * contentService.ts
 * Fetches prayer times, adhkar, and announcements from the cloud backend.
 * Falls back to local data when offline or table is empty.
 */
import { getSupabaseClient } from '@/template';

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
  prayer_time: 'before-fajr' | 'after-fajr' | 'after-dhuhr' | 'after-jumuah' | 'after-asr' | 'after-maghrib' | 'after-isha';
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
  sections: { heading: string; arabic: string; transliteration?: string; translation?: string }[] | null;
  group_name: string | null;
  group_order: number;
  benefits?: string | null;
  description: string | null;
  card_color?: string | null;
  content_type?: 'adhkar' | 'quran' | null;     // New: how to render this group
  content_source?: 'db' | 'local' | 'api' | null;  // New: where is content stored
  content_key?: string | null;                    // New: e.g., 'surah-36' for local Quran
  card_icon?: string | null;                      // New: card display icon
  card_badge?: string | null;                     // New: card badge text
}

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

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  category: string;
  is_active: boolean;
  pinned: boolean;
  published_at: string;
  expires_at: string | null;
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
  prayerTime: AdhkarRow['prayer_time']
): Promise<AdhkarRow[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('adhkar')
      .select('*')
      .eq('prayer_time', prayerTime)
      .eq('is_active', true)
      .order('group_order', { ascending: true })
      .order('display_order', { ascending: true });
    if (error || !data) return [];
    return data as AdhkarRow[];
  } catch {
    return [];
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
  content_type: 'adhkar' | 'quran' | null;     // New: portal-defined rendering type
  content_source: 'db' | 'local' | 'api' | null;  // New: where content is stored
  content_key: string | null;                   // New: e.g., 'surah-36' for local Quran
  card_icon: string | null;                     // New: portal-defined card icon
  card_badge: string | null;                    // New: portal-defined badge text
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
            content_type:
              raw.content_type === 'adhkar' || raw.content_type === 'quran'
                ? raw.content_type
                : existing?.content_type ?? null,
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
                : existing?.card_badge ?? null,
          };

          map.set(groupName, merged);
        }
      }
    } catch {
      // Keep row-derived group metadata when adhkar_groups is unavailable.
    }

    return Array.from(map.values()).sort((a, b) => a.group_order - b.group_order);
  } catch {
    return [];
  }
}

// ── Sunnah Reminders ──────────────────────────────────────────────────────

export interface SunnahReminderRow {
  id: string;
  title: string;
  detail: string | null;
  reference: string | null;
  icon: string | null;
  friday_only: boolean;
  display_order: number;
  is_active: boolean;
}

export async function fetchSunnahReminders(): Promise<SunnahReminderRow[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('sunnah_reminders')
      .select('id, title, detail, reference, icon, friday_only, display_order, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error || !data || data.length === 0) return [];
    return data as SunnahReminderRow[];
  } catch {
    return [];
  }
}

// ── Announcements ─────────────────────────────────────────────────────────

export async function fetchAnnouncements(): Promise<AnnouncementRow[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false });
    if (error || !data) return [];
    return data as AnnouncementRow[];
  } catch {
    return [];
  }
}
