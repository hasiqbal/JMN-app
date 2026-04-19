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

function fallbackHadith(): SacredPanelContent {
  return {
    title: 'Hadith of the Day',
    reference: 'Reference pending',
    cardEn: 'Adhkar coming soon.',
    cardUr: '',
    popupAr: '',
    popupEn: 'Adhkar coming soon.',
    popupUr: '',
  };
}

function fallbackVerse(): SacredPanelContent {
  return {
    title: 'Verse of the Day',
    reference: 'Reference pending',
    cardEn: 'Verse coming soon.',
    cardUr: '',
    popupAr: '',
    popupEn: 'Verse coming soon.',
    popupUr: '',
  };
}

async function invokeDailyFunction<T>(
  functionName: 'daily-hadith' | 'daily-verse',
  body: Record<string, unknown>
): Promise<T | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke(functionName, { body });
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
    title: hadithRes?.title?.trim() || fallbackHadith().title,
    reference: hadithRes?.reference?.trim() || fallbackHadith().reference,
    cardEn: hadithRes?.card?.en?.trim() || fallbackHadith().cardEn,
    cardUr: hadithRes?.card?.ur?.trim() || fallbackHadith().cardUr,
    popupAr: hadithRes?.popup?.ar?.trim() || fallbackHadith().popupAr,
    popupEn: hadithRes?.popup?.en?.trim() || hadithRes?.card?.en?.trim() || fallbackHadith().popupEn,
    popupUr: hadithRes?.popup?.ur?.trim() || hadithRes?.card?.ur?.trim() || fallbackHadith().popupUr,
  };

  const verse: SacredPanelContent = {
    title: 'Verse of the Day',
    reference: verseRes?.verse?.reference?.trim() || fallbackVerse().reference,
    cardEn: verseRes?.card?.en?.trim() || fallbackVerse().cardEn,
    cardUr: verseRes?.card?.ur?.trim() || fallbackVerse().cardUr,
    popupAr: verseRes?.popup?.ar?.trim() || fallbackVerse().popupAr,
    popupEn: verseRes?.popup?.en?.trim() || verseRes?.card?.en?.trim() || fallbackVerse().popupEn,
    popupUr: verseRes?.popup?.ur?.trim() || verseRes?.card?.ur?.trim() || fallbackVerse().popupUr,
  };

  return {
    dateKey: hadithRes?.dateKey || verseRes?.dateKey || toLocalDateKey(),
    timeZone: hadithRes?.timeZone || verseRes?.timeZone || timeZone,
    hadith,
    verse,
  };
}
