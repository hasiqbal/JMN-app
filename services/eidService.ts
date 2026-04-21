import { getSupabaseClient } from '@/template';

export type EidType = 'eid_al_fitr' | 'eid_al_adha';

export interface EidPrayerEntry {
  id: string;
  eid_type: EidType;
  jamaat_number: number;
  time: string | null;
  is_active: boolean;
  notes?: string | null;
}

export interface EidPrayerSchedule {
  eid_type: EidType;
  prayer_time: string;
  jamaat_time: string;
  jamaats: EidPrayerEntry[];
}

function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23 || minutes > 59) {
    return trimmed;
  }

  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

function buildSchedule(eidType: EidType, rows: EidPrayerEntry[]): EidPrayerSchedule | null {
  const jamaats = rows
    .filter((row) => row.eid_type === eidType && row.is_active && !!row.time)
    .sort((left, right) => left.jamaat_number - right.jamaat_number)
    .map((row) => ({ ...row, time: normalizeTime(row.time) }));

  const firstTime = jamaats[0]?.time;
  if (!firstTime) return null;

  return {
    eid_type: eidType,
    prayer_time: firstTime,
    jamaat_time: firstTime,
    jamaats,
  };
}

/**
 * Fetch all permanent Eid jamaat entries.
 */
export async function fetchEidPrayers(): Promise<EidPrayerEntry[]> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('eid_prayers')
      .select('id,eid_type,jamaat_number,time,is_active,notes')
      .eq('is_active', true)
      .order('eid_type')
      .order('jamaat_number');

    if (error) {
      if (__DEV__) {
        console.warn('[Eid] fetch error:', error.message ?? error);
      }
      return [];
    }

    return (data ?? []).map((row) => ({
      ...row,
      time: normalizeTime(row.time),
    })) as EidPrayerEntry[];
  } catch (err) {
    if (__DEV__) {
      console.warn('[Eid] fetch exception:', err);
    }
    return [];
  }
}

/**
 * Fetch the permanent Eid al-Fitr schedule.
 * The first jamaat is used as the primary Eid time for screens that expect a single value.
 */
export async function fetchEidUlFitr(): Promise<EidPrayerSchedule | null> {
  const rows = await fetchEidPrayers();
  return buildSchedule('eid_al_fitr', rows);
}

/**
 * Fetch the permanent Eid al-Adha schedule.
 * The first jamaat is used as the primary Eid time for screens that expect a single value.
 */
export async function fetchEidUlAdha(): Promise<EidPrayerSchedule | null> {
  const rows = await fetchEidPrayers();
  return buildSchedule('eid_al_adha', rows);
}
