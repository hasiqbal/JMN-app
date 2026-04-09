import { getSupabaseClient } from '@/template';

/**
 * Fetch the current live status from the database.
 */
export async function fetchLiveStatus(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'is_live')
      .maybeSingle();
    if (error || !data) return false;
    return data.value === 'true';
  } catch {
    return false;
  }
}

/**
 * Set the live status in the database.
 */
export async function setLiveStatus(isLive: boolean): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'is_live', value: String(isLive), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return !error;
  } catch {
    return false;
  }
}
