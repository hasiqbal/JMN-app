import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from '@/template';

const NOTIFICATION_TEMPLATES_APP_SETTING_KEY = 'notification_templates_v1';
const NOTIFICATION_TEMPLATES_CACHE_KEY = 'jmn_notification_templates_cache_v1';
const TEMPLATE_CACHE_TTL_MS = 10 * 60 * 1000;

type TemplateEntry = {
  title: string;
  body: string;
};

export type NotificationTemplateCatalog = {
  prayerStart: TemplateEntry;
  jamaatReminder: TemplateEntry;
  adhkarReminder: TemplateEntry;
  liveNow: TemplateEntry;
  livePrayerStart: TemplateEntry;
  liveJamaatReminder: TemplateEntry;
};

type NotificationTemplateCachePayload = {
  fetchedAt: number;
  templates: NotificationTemplateCatalog;
};

let memoryCache: NotificationTemplateCachePayload | null = null;

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseEntry(value: unknown): TemplateEntry | null {
  if (!value || typeof value !== 'object') return null;

  const source = value as Record<string, unknown>;
  const title = asText(source.title);
  const body = asText(source.body);

  if (!title || !body) return null;
  return { title, body };
}

function parseCatalog(raw: string): NotificationTemplateCatalog | null {
  if (!raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const prayerStart = parseEntry(parsed.prayerStart);
    const jamaatReminder = parseEntry(parsed.jamaatReminder);
    const adhkarReminder = parseEntry(parsed.adhkarReminder);
    const liveNow = parseEntry(parsed.liveNow);
    const livePrayerStart = parseEntry(parsed.livePrayerStart);
    const liveJamaatReminder = parseEntry(parsed.liveJamaatReminder);

    if (!prayerStart || !jamaatReminder || !adhkarReminder || !liveNow || !livePrayerStart || !liveJamaatReminder) {
      return null;
    }

    return {
      prayerStart,
      jamaatReminder,
      adhkarReminder,
      liveNow,
      livePrayerStart,
      liveJamaatReminder,
    };
  } catch {
    return null;
  }
}

function isCacheFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt <= TEMPLATE_CACHE_TTL_MS;
}

async function readCachedTemplates(): Promise<NotificationTemplateCatalog | null> {
  if (memoryCache && isCacheFresh(memoryCache.fetchedAt)) {
    return memoryCache.templates;
  }

  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_TEMPLATES_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as NotificationTemplateCachePayload;
    if (!parsed || typeof parsed.fetchedAt !== 'number' || !parsed.templates) return null;

    if (!isCacheFresh(parsed.fetchedAt)) return null;

    memoryCache = parsed;
    return parsed.templates;
  } catch {
    return null;
  }
}

async function writeCachedTemplates(templates: NotificationTemplateCatalog): Promise<void> {
  const payload: NotificationTemplateCachePayload = {
    fetchedAt: Date.now(),
    templates,
  };

  memoryCache = payload;

  try {
    await AsyncStorage.setItem(NOTIFICATION_TEMPLATES_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures; live fetch still succeeded.
  }
}

export async function fetchNotificationTemplateCatalog(): Promise<NotificationTemplateCatalog | null> {
  if (memoryCache && isCacheFresh(memoryCache.fetchedAt)) {
    return memoryCache.templates;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', NOTIFICATION_TEMPLATES_APP_SETTING_KEY)
      .maybeSingle();

    if (!error && data?.value) {
      const parsed = parseCatalog(data.value);
      if (parsed) {
        await writeCachedTemplates(parsed);
        return parsed;
      }
    }
  } catch {
    // Fall through to cache.
  }

  return readCachedTemplates();
}

export function renderNotificationTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = vars[key];
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    return '';
  }).trim();
}
