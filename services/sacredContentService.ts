import { getSupabaseClient } from '@/template';

export type SacredPanelContent = {
  title: string;
  reference: string;
  cardEn: string;
  cardUr: string;
  popupAr: string;
  popupEn: string;
  popupUr: string;
};

export type DailySacredContent = {
  dateKey: string;
  timeZone: string;
  hadith: SacredPanelContent;
  verse: SacredPanelContent;
};

type DailyHadithResponse = {
  dateKey?: string;
  timeZone?: string;
  title?: string;
  reference?: string;
  card?: {
    en?: string;
    ur?: string;
  };
  popup?: {
    ar?: string;
    en?: string;
    ur?: string;
  };
};

type DailyVerseResponse = {
  dateKey?: string;
  timeZone?: string;
  verse?: {
    reference?: string;
  };
  card?: {
    en?: string;
    ur?: string;
  };
  popup?: {
    ar?: string;
    en?: string;
    ur?: string;
  };
};

const INVOKE_TIMEOUT_MS = 8000;

function getSupabaseEnv() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

function resolveDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function toLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function invokeDailyFunction<T>(
  functionName: 'daily-hadith' | 'daily-verse',
  body: Record<string, unknown>
): Promise<T | null> {
  const { url, anonKey } = getSupabaseEnv();

  if (url && anonKey) {
    try {
      const endpoint = `${url}/functions/v1/${functionName}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), INVOKE_TIMEOUT_MS);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const parsed = await response.json();
      return (parsed as T) ?? null;
    } catch {
      // Fall through to Supabase client invoke as secondary path.
    }
  }

  try {
    const supabase = getSupabaseClient();
    const invokePromise = supabase.functions.invoke(functionName, { body });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Function invoke timeout')), INVOKE_TIMEOUT_MS);
    });
    const { data, error } = await Promise.race([invokePromise, timeoutPromise]);
    if (error) return null;
    return (data as T) ?? null;
  } catch {
    return null;
  }
}

export async function fetchDailySacredContent(): Promise<DailySacredContent> {
  const timeZone = resolveDeviceTimeZone();
  const payload = { timeZone };

  const [hadithRes, verseRes] = await Promise.all([
    invokeDailyFunction<DailyHadithResponse>('daily-hadith', payload),
    invokeDailyFunction<DailyVerseResponse>('daily-verse', payload),
  ]);

  const hadith: SacredPanelContent = {
    title: hadithRes?.title?.trim() || '',
    reference: hadithRes?.reference?.trim() || '',
    cardEn: hadithRes?.card?.en?.trim() || '',
    cardUr: hadithRes?.card?.ur?.trim() || '',
    popupAr: hadithRes?.popup?.ar?.trim() || '',
    popupEn: hadithRes?.popup?.en?.trim() || hadithRes?.card?.en?.trim() || '',
    popupUr: hadithRes?.popup?.ur?.trim() || hadithRes?.card?.ur?.trim() || '',
  };

  const verse: SacredPanelContent = {
    title: '',
    reference: verseRes?.verse?.reference?.trim() || '',
    cardEn: verseRes?.card?.en?.trim() || '',
    cardUr: verseRes?.card?.ur?.trim() || '',
    popupAr: verseRes?.popup?.ar?.trim() || '',
    popupEn: verseRes?.popup?.en?.trim() || verseRes?.card?.en?.trim() || '',
    popupUr: verseRes?.popup?.ur?.trim() || verseRes?.card?.ur?.trim() || '',
  };

  return {
    dateKey: hadithRes?.dateKey || verseRes?.dateKey || toLocalDateKey(),
    timeZone: hadithRes?.timeZone || verseRes?.timeZone || timeZone,
    hadith,
    verse,
  };
}
