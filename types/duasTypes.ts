/**
 * duasTypes.ts
 * Shared type definitions for the Adhkar / Duas screens.
 */

export type PrayerTimeId =
  | 'before-fajr'
  | 'after-fajr'
  | 'after-zuhr'
  | 'after-jumuah'
  | 'after-asr'
  | 'after-maghrib'
  | 'after-isha';

export type AdhkarSelection =
  | null
  | string;  // Any group name (completely DB-driven routing)

/**
 * Content rendering type — how should this group's content be displayed?
 */
export type ContentType = 'adhkar' | 'quran';

/**
 * Content source — where is the content stored?
 */
export type ContentSource = 'db' | 'local' | 'api';

/**
 * Group metadata for routing and rendering.
 * All UI decisions are driven by this data from the database.
 */
export interface AdhkarGroupMetadata {
  group_name: string;
  prayer_time: string;
  content_type: ContentType;        // 'adhkar' or 'quran'
  content_source: ContentSource;    // 'db', 'local', or 'api'
  content_key?: string;             // e.g., 'surah-36' for Yaseen (null if DB-stored)
  card_color?: string | null;
  card_icon?: string | null;
  card_badge?: string | null;
  description?: string;
  arabic_title?: string;
  item_count: number;
}

/**
 * Render configuration determined by content metadata.
 * This tells the app exactly how to render a group.
 */
export interface RenderConfig {
  type: 'local-quran' | 'api-quran' | 'db-adhkar';  // Which component to show
  groupName: string;
  contentKey?: string;  // For Quran (surah number/name)
  prayerTime: string;
}

/**
 * Resolve group metadata to a render configuration.
 * Single source of truth for routing logic.
 */
export function getRenderConfig(metadata: AdhkarGroupMetadata): RenderConfig {
  const { group_name, prayer_time, content_type, content_source, content_key } = metadata;

  if (content_type === 'quran' && content_source === 'local') {
    return { type: 'local-quran', groupName: group_name, contentKey: content_key, prayerTime: prayer_time };
  }
  if (content_type === 'quran' && content_source === 'api') {
    return { type: 'api-quran', groupName: group_name, contentKey: content_key, prayerTime: prayer_time };
  }
  // Default: DB-stored adhkar
  return { type: 'db-adhkar', groupName: group_name, prayerTime: prayer_time };
}

export interface PrayerTimeEntry {
  id: PrayerTimeId;
  label: string;
  arabicLabel: string;
  icon: string;
  color: string;
  accentBg: string;
}

export const PRAYER_TIMES: PrayerTimeEntry[] = [
  { id: 'before-fajr',   label: 'Before Fajr & Tahajjud',   arabicLabel: 'قَبْلَ الفَجْر',   icon: 'nights-stay',  color: '#3949AB', accentBg: '#3949AB15' },
  { id: 'after-fajr',    label: 'After Fajr',    arabicLabel: 'بَعْدَ الفَجْر',   icon: 'wb-twilight',  color: '#1B8A5A', accentBg: '#1B8A5A15' },
  { id: 'after-zuhr',    label: 'After Dhuhr',   arabicLabel: 'بَعْدَ الظُّهْر',  icon: 'wb-sunny',     color: '#0A5C9E', accentBg: '#0A5C9E15' },
  { id: 'after-jumuah',  label: "After Jumu'ah", arabicLabel: 'بَعْدَ الجُمُعَة', icon: 'star',         color: '#B8860B', accentBg: '#B8860B15' },
  { id: 'after-asr',     label: 'After Asr',     arabicLabel: 'بَعْدَ العَصْر',   icon: 'wb-cloudy',    color: '#E65100', accentBg: '#E6510015' },
  { id: 'after-maghrib', label: 'After Maghrib', arabicLabel: 'بَعْدَ المَغْرِب', icon: 'bedtime',      color: '#6A1B9A', accentBg: '#6A1B9A15' },
  { id: 'after-isha',    label: 'After Isha',    arabicLabel: 'بَعْدَ العِشَاء',  icon: 'nightlight',   color: '#1565C0', accentBg: '#1565C015' },
];
