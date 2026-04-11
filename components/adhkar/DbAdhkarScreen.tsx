/**
 * DbAdhkarScreen.tsx
 * Fetches and renders adhkar rows from the database for a given prayer_time,
 * with optional group filtering and enhanced Indo-Pak typography for selected groups.
 *
 * All Supabase calls, business logic, and rendering are preserved exactly.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { NIGHT_PALETTE } from '@/constants/nightPalette';
import { fetchAdhkarForPrayerTime, AdhkarRow, resolveAdhkarUrduTranslation, translateTextToUrdu } from '@/services/contentService';
import {
  ASR_GROUP_TO_SELECTION,
  BEFORE_FAJR_GROUP_TO_SELECTION,
  DHUHR_GROUP_TO_SELECTION,
  FAJR_GROUP_TO_SELECTION,
  ISHA_GROUP_TO_SELECTION,
  JUMUAH_GROUP_TO_SELECTION,
  MAGHRIB_GROUP_TO_SELECTION,
  resolveGroupSelection,
} from '@/constants/duasGroups';
import { AdhkarSelection } from '@/types/duasTypes';

const ADHKAR_ACCENT_GREEN = '#3FAE5A';
const ADHKAR_CARD_TITLE = '#111827';
const ADHKAR_CARD_TEXT = '#374151';
const ADHKAR_META_TEXT = '#4B5563';
const ADHKAR_DESCRIPTION_TEXT = '#374151';
const ADHKAR_ICON_BG = '#F0F7F3';
const ADHKAR_TAG_BG = '#E6F4EA';
const ADHKAR_ARROW = '#A0A8A2';
const ADHKAR_BENEFITS_GOLD = '#B88917';
const ADHKAR_BENEFITS_GOLD_SOFT = '#FFF4D6';
const ADHKAR_TAFSIR_TEAL = '#0D7C6E';
const ADHKAR_TAFSIR_TEAL_SOFT = '#E6F7F4';
const DEFAULT_MUSLIM_ENTRY_ICONS = [
  'brightness-3',
  'nights-stay',
  'nightlight-round',
  'wb-sunny',
  'wb-twilight',
  'bedtime',
  'flare',
  'stars',
  'star',
  'star-border',
  'auto-awesome',
  'auto-fix-high',
  'spa',
  'self-improvement',
  'favorite',
  'favorite-border',
  'volunteer-activism',
  'diversity-3',
  'groups',
  'group',
  'public',
  'language',
  'travel-explore',
  'eco',
  'nature',
  'park',
  'local-florist',
  'water-drop',
  'opacity',
  'filter-vintage',
  'waves',
  'cloud',
  'cloud-queue',
  'cloud-done',
  'light-mode',
  'dark-mode',
  'brightness-auto',
  'brightness-5',
  'brightness-2',
  'shield-moon',
  'verified',
  'verified-user',
  'security',
  'bookmarks',
  'bookmark',
  'bookmark-border',
  'menu-book',
  'library-books',
  'import-contacts',
  'translate',
  'history-edu',
  'hourglass-empty',
  'schedule',
  'access-time',
  'psychology',
  'insights',
  'emoji-objects',
  'emoji-symbols',
  'emoji-nature',
  'emoji-people',
  'diamond',
  'check-circle',
  'check-circle-outline',
  'thumb-up',
  'volunteer-activism',
];

type EntryLeadVisual =
  | { kind: 'icon'; value: string }
  | { kind: 'text'; value: string };

function normalizeMetaText(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim();
}

function containsHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function pickStableDefaultIcon(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i)) % 997;
  }
  return DEFAULT_MUSLIM_ENTRY_ICONS[hash % DEFAULT_MUSLIM_ENTRY_ICONS.length];
}

function resolveEntryLeadVisual(
  groupFilter: string | undefined,
  item: Pick<AdhkarRow, 'group_name' | 'title' | 'arabic_title' | 'reference'>,
  salawatGroupName?: string | null
): EntryLeadVisual {
  // Check if this entry belongs to the Salawat group from database
  if (salawatGroupName && item.group_name === salawatGroupName) {
    return { kind: 'text', value: 'ﷺ' };
  }

  const normalized = normalizeMetaText([
    groupFilter,
    item.group_name,
    item.title,
    item.arabic_title,
    item.reference,
  ]
    .filter(Boolean)
    .join(' '));

  if (/(^|\s)(quran|qur an|القران|القرآن)(\s|$)|surah\s*\d+|kahf|yaseen|yasin|waqiah|sajdah|mulk|luqman|imran|الكهف|يس|الواقعة|السجدة|الملك|لقمان|عمران/.test(normalized)) {
    return { kind: 'icon', value: 'menu-book' };
  }

  return { kind: 'icon', value: pickStableDefaultIcon(normalized || 'default') };
}

// ── Groups that use enhanced Indo-Pak paragraph formatting ───────────────
const ENHANCED_ARABIC_GROUPS = new Set([
  'Wird Abu Bakr bin Salim',
  'Dua after Surah Yaseen',
]);

// ── Prayer-time display metadata ─────────────────────────────────────────
const PRAYER_TIME_META: Record<string, { title: string; icon: string; accent: string }> = {
  'after-fajr':    { title: 'Morning Adhkar',         icon: 'wb-twilight', accent: ADHKAR_ACCENT_GREEN },
  'after-zuhr':    { title: 'After Dhuhr Adhkar',     icon: 'wb-sunny',    accent: ADHKAR_ACCENT_GREEN },
  'after-jumuah':  { title: "After Jumu'ah Adhkar",   icon: 'star',        accent: ADHKAR_ACCENT_GREEN },
  'after-asr':     { title: 'After Asr Adhkar',       icon: 'wb-cloudy',   accent: ADHKAR_ACCENT_GREEN },
  'after-maghrib': { title: 'Evening Adhkar',         icon: 'bedtime',     accent: ADHKAR_ACCENT_GREEN },
  'after-isha':    { title: 'After Isha Adhkar',      icon: 'nightlight',  accent: ADHKAR_ACCENT_GREEN },
  'before-fajr':   { title: 'Before Fajr & Tahajjud Adhkar', icon: 'nights-stay', accent: ADHKAR_ACCENT_GREEN },
  // Group-filtered overrides
  'Surah Al-Waqiah':         { title: 'Surah Al-Waqiah',           icon: 'menu-book',   accent: ADHKAR_ACCENT_GREEN },
  'Hizb ul Bahr':            { title: 'Hizb ul Bahr',              icon: 'waves',       accent: ADHKAR_ACCENT_GREEN },
  'Dua after Surah Yaseen':  { title: 'Dua after Surah Yaseen',    icon: 'favorite',    accent: ADHKAR_ACCENT_GREEN },
  'Dua al-Waqiah':           { title: 'Dua after Surah Waqiah',    icon: 'auto-awesome',accent: ADHKAR_ACCENT_GREEN },
  'Wird Abu Bakr bin Salim': { title: 'Wird of Abu Bakr bin Salim',icon: 'stars',       accent: ADHKAR_ACCENT_GREEN },
  'Morning Adhkar':          { title: 'Morning Adhkar',            icon: 'wb-twilight', accent: ADHKAR_ACCENT_GREEN },
};

// ── Shared Arabic/wording styles ─────────────────────────────────────────
const arabicBoxBase = {
  borderWidth: 1,
  borderRadius: Radius.md,
  borderColor: '#E5E7EB',
  backgroundColor: '#F8FAF9',
  paddingHorizontal: 20,
  paddingVertical: 20,
} as const;

// ── Props ─────────────────────────────────────────────────────────────────
interface Props {
  prayerTime: AdhkarRow['prayer_time'];
  nightMode: boolean;
  onBack?: () => void;
  groupFilter?: string;
  titleOverride?: string;
  onOpenSpecialGroup?: (selection: AdhkarSelection) => void;
}

function resolveSpecialSelectionForDbGroup(
  prayerTime: AdhkarRow['prayer_time'],
  groupName: string
): AdhkarSelection | undefined {
  const routeMapByPrayerTime: Partial<Record<string, Record<string, AdhkarSelection>>> = {
    'before-fajr': BEFORE_FAJR_GROUP_TO_SELECTION,
    'after-fajr': FAJR_GROUP_TO_SELECTION,
    'after-dhuhr': DHUHR_GROUP_TO_SELECTION,
    'after-zuhr': DHUHR_GROUP_TO_SELECTION,
    'after-jumuah': JUMUAH_GROUP_TO_SELECTION,
    'after-asr': ASR_GROUP_TO_SELECTION,
    'after-maghrib': MAGHRIB_GROUP_TO_SELECTION,
    'after-isha': ISHA_GROUP_TO_SELECTION,
  };

  const routeMap = routeMapByPrayerTime[prayerTime];
  if (routeMap) {
    const mapped = resolveGroupSelection(routeMap, groupName);
    if (mapped) return mapped;
  }

  const normalized = groupName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim();

  if (/(surah\s*18|kahf|kaaf|khf|kafh|kahaf|khaf|الكهف)/.test(normalized)) return 'kahf-mushaf';
  if (/(dua|dua\s+after|supplication)/.test(normalized) && /(surah\s*36|yaseen|yasin|ya\s*seen|يس)/.test(normalized)) return 'yaseen-dua';
  if (/(surah\s*36|yaseen|yasin|ya\s*seen|يس)/.test(normalized)) return 'yaseen';
  if (/(surah\s*56|waqiah|waqia|waqea|waqeah|الواقعة)/.test(normalized)) return 'waqiah';
  if (/(surah\s*32|sajdah|sajda|sajadah|السجدة)/.test(normalized)) return 'sajdah-mushaf';
  if (/(surah\s*67|mulk|الملك)/.test(normalized)) return 'mulk-mushaf';
  if (/(surah\s*31|luqman|luqmaan|لقمان)/.test(normalized)) return 'luqman-mushaf';
  if (/(ali?\s*imran|aal\s*imran|al\s*imran|عمران)/.test(normalized)) return 'imran-mushaf';

  return undefined;
}

function resolveSpecialSelectionForDbEntry(
  prayerTime: AdhkarRow['prayer_time'],
  item: Pick<AdhkarRow, 'title' | 'arabic_title' | 'group_name' | 'reference'>
): AdhkarSelection | undefined {
  const searchable = [item.title, item.arabic_title, item.group_name, item.reference]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim();

  const compact = searchable.replace(/\s+/g, '');

  if (/(surah\s*18|kahf|kaaf|khf|kafh|kahaf|khaf|الكهف)/.test(searchable) || /(k+a*h+f|k+h+f)/.test(compact)) {
    return 'kahf-mushaf';
  }
  if (/(dua|dua\s+after|supplication)/.test(searchable) && /(surah\s*36|yaseen|yasin|ya\s*seen|يس)/.test(searchable)) {
    return 'yaseen-dua';
  }
  if (/(surah\s*36|yaseen|yasin|ya\s*seen|يس)/.test(searchable)) {
    return 'yaseen';
  }
  if (/(surah\s*56|waqiah|waqia|waqea|waqeah|الواقعة)/.test(searchable)) {
    return 'waqiah';
  }
  if (/(surah\s*32|sajdah|sajda|sajadah|السجدة)/.test(searchable)) {
    return 'sajdah-mushaf';
  }
  if (/(surah\s*67|mulk|الملك)/.test(searchable)) {
    return 'mulk-mushaf';
  }
  if (/(surah\s*31|luqman|luqmaan|لقمان)/.test(searchable)) {
    return 'luqman-mushaf';
  }
  if (/(ali?\s*imran|aal\s*imran|al\s*imran|عمران)/.test(searchable)) {
    return 'imran-mushaf';
  }

  return resolveSpecialSelectionForDbGroup(prayerTime, item.group_name ?? '');
}

export function DbAdhkarScreen({
  prayerTime,
  nightMode,
  onBack,
  groupFilter,
  titleOverride,
  onOpenSpecialGroup,
}: Props) {
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 390;
  const N = nightMode ? NIGHT_PALETTE : null;
  const useEnhancedFont = !!(groupFilter && ENHANCED_ARABIC_GROUPS.has(groupFilter));

  const [adhkar, setAdhkar] = React.useState<AdhkarRow[]>([]);
  const [salawatGroupName, setSalawatGroupName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expandedById, setExpandedById] = React.useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});
  const [urduById, setUrduById] = React.useState<Record<string, boolean>>({});
  const [urduFallbackById, setUrduFallbackById] = React.useState<Record<string, string>>({});
  const [urduLoadingById, setUrduLoadingById] = React.useState<Record<string, boolean>>({});
  const [benefitsOverlayItemId, setBenefitsOverlayItemId] = React.useState<string | null>(null);
  const [tafsirOverlayItemId, setTafsirOverlayItemId] = React.useState<string | null>(null);
  const [urduBenefitsFallbackById, setUrduBenefitsFallbackById] = React.useState<Record<string, string>>({});
  const [urduBenefitsLoadingById, setUrduBenefitsLoadingById] = React.useState<Record<string, boolean>>({});
  const [urduTafsirFallbackById, setUrduTafsirFallbackById] = React.useState<Record<string, string>>({});
  const [urduTafsirLoadingById, setUrduTafsirLoadingById] = React.useState<Record<string, boolean>>({});
  const [transliterationById, setTransliterationById] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  React.useEffect(() => {
    setLoading(true);
    fetchAdhkarForPrayerTime(prayerTime).then((rows) => {
      // Detect Salawat group from database
      let foundSalawatGroup: string | null = null;
      for (const row of rows) {
        if (row.group_name) {
          const normalized = normalizeMetaText(row.group_name);
          if (/(salawat|salawaat|salat|salaat|salaah|durud|durood|darood|صلوات)/.test(normalized)) {
            foundSalawatGroup = row.group_name;
            break;
          }
        }
      }
      setSalawatGroupName(foundSalawatGroup);

      const filtered = groupFilter ? rows.filter(r => r.group_name === groupFilter) : rows;
      setAdhkar(filtered);

      // Auto-expand all groups on load
      const groups: Record<string, boolean> = {};
      filtered.forEach(r => { if (r.group_name) groups[r.group_name] = true; });
      setExpandedGroups(groups);
      // Keep cards collapsed by default; user can tap to expand.
      setExpandedById({});
      setUrduById({});
      setUrduFallbackById({});
      setUrduLoadingById({});
      setBenefitsOverlayItemId(null);
      setTafsirOverlayItemId(null);
      setUrduBenefitsFallbackById({});
      setUrduBenefitsLoadingById({});
      setUrduTafsirFallbackById({});
      setUrduTafsirLoadingById({});
      setTransliterationById({});
      setLoading(false);
    });
  }, [prayerTime, groupFilter]);

  const resolveEnglishTranslationSource = React.useCallback((item: AdhkarRow): string => {
    const direct = (item.translation ?? '').trim();
    if (direct) return direct;

    const fromSections = (item.sections ?? [])
      .map((sec) => (sec.translation ?? '').trim())
      .filter(Boolean)
      .join('\n\n');

    return fromSections;
  }, []);

  const prefetchUrduForItem = React.useCallback(async (item: AdhkarRow): Promise<string> => {
    const dbUrdu = resolveAdhkarUrduTranslation(item);
    if (dbUrdu) return dbUrdu;

    const cached = (urduFallbackById[item.id] ?? '').trim();
    if (cached) return cached;

    if (urduLoadingById[item.id]) return '';

    const english = resolveEnglishTranslationSource(item);
    if (!english) return '';

    setUrduLoadingById(prev => ({ ...prev, [item.id]: true }));
    const translated = await translateTextToUrdu(english);
    setUrduLoadingById(prev => ({ ...prev, [item.id]: false }));

    if (!translated) return '';

    setUrduFallbackById(prev => ({ ...prev, [item.id]: translated }));
    return translated;
  }, [resolveEnglishTranslationSource, urduFallbackById, urduLoadingById]);

  const ensureUrduBenefits = React.useCallback(async (id: string, plainText: string) => {
    const cached = (urduBenefitsFallbackById[id] ?? '').trim();
    if (cached) return;
    if (urduBenefitsLoadingById[id] || !plainText) return;
    setUrduBenefitsLoadingById(prev => ({ ...prev, [id]: true }));
    const translated = await translateTextToUrdu(plainText);
    setUrduBenefitsLoadingById(prev => ({ ...prev, [id]: false }));
    if (translated) {
      setUrduBenefitsFallbackById(prev => ({ ...prev, [id]: translated }));
    }
  }, [urduBenefitsFallbackById, urduBenefitsLoadingById]);

  const ensureUrduTafsir = React.useCallback(async (id: string, plainText: string) => {
    const cached = (urduTafsirFallbackById[id] ?? '').trim();
    if (cached) return;
    if (urduTafsirLoadingById[id] || !plainText) return;
    setUrduTafsirLoadingById(prev => ({ ...prev, [id]: true }));
    const translated = await translateTextToUrdu(plainText);
    setUrduTafsirLoadingById(prev => ({ ...prev, [id]: false }));
    if (translated) {
      setUrduTafsirFallbackById(prev => ({ ...prev, [id]: translated }));
    }
  }, [urduTafsirFallbackById, urduTafsirLoadingById]);

  const handleUrduToggle = React.useCallback(async (item: AdhkarRow) => {
    if (urduById[item.id]) {
      setUrduById(prev => ({ ...prev, [item.id]: false }));
      return;
    }

    const dbUrdu = resolveAdhkarUrduTranslation(item);
    const fallbackUrdu = (urduFallbackById[item.id] ?? '').trim();
    const hasUrdu = !!(dbUrdu || fallbackUrdu);

    const rawBenefits = (item.description ?? item.benefits ?? '').trim();
    const plainBenefits = containsHtml(rawBenefits) ? rawBenefits.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : rawBenefits;
    const rawTafsir = (item.tafsir ?? '').trim();
    const plainTafsir = containsHtml(rawTafsir) ? rawTafsir.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : rawTafsir;

    if (!hasUrdu) {
      await prefetchUrduForItem(item);
    }
    if (plainBenefits) {
      await ensureUrduBenefits(item.id, plainBenefits);
    }
    if (plainTafsir) {
      await ensureUrduTafsir(item.id, plainTafsir);
    }

    setUrduById(prev => ({ ...prev, [item.id]: true }));
  }, [ensureUrduBenefits, ensureUrduTafsir, prefetchUrduForItem, urduById, urduFallbackById]);

  const handleOpenTafsirOverlay = React.useCallback(async (item: AdhkarRow, plainText: string) => {
    if (!!urduById[item.id] && plainText) {
      await ensureUrduTafsir(item.id, plainText);
    }
    setTafsirOverlayItemId(item.id);
  }, [ensureUrduTafsir, urduById]);

  const handleCloseTafsirOverlay = React.useCallback(() => {
    setTafsirOverlayItemId(null);
  }, []);

  const handleOpenBenefitsOverlay = React.useCallback(async (item: AdhkarRow, plainText: string) => {
    if (!!urduById[item.id] && plainText) {
      await ensureUrduBenefits(item.id, plainText);
    }
    setBenefitsOverlayItemId(item.id);
  }, [ensureUrduBenefits, urduById]);

  const handleCloseBenefitsOverlay = React.useCallback(() => {
    setBenefitsOverlayItemId(null);
  }, []);

  const meta = groupFilter
    ? (PRAYER_TIME_META[groupFilter] ?? PRAYER_TIME_META[prayerTime] ?? { title: groupFilter, icon: 'auto-awesome', accent: ADHKAR_ACCENT_GREEN })
    : (PRAYER_TIME_META[prayerTime] ?? { title: 'Adhkar', icon: 'auto-awesome', accent: ADHKAR_ACCENT_GREEN });
  const displayTitle = titleOverride ?? meta.title;
  const accent = meta.accent;

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centred}>
        <Text style={{ color: N ? N.textMuted : Colors.textSubtle, fontSize: 13 }}>Loading...</Text>
      </View>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────
  if (adhkar.length === 0) {
    return <View style={styles.centred} />;
  }

  // ── Group items by group_name, ordered by group_order then display_order ──
  const groupMap = new Map<string, { order: number; items: AdhkarRow[] }>();
  const ungrouped: AdhkarRow[] = [];

  adhkar.forEach(item => {
    if (item.group_name) {
      if (!groupMap.has(item.group_name)) {
        groupMap.set(item.group_name, { order: item.group_order, items: [] });
      }
      groupMap.get(item.group_name)!.items.push(item);
    } else {
      ungrouped.push(item);
    }
  });

  const sortedGroups = Array.from(groupMap.entries()).sort((a, b) => a[1].order - b[1].order);
  const toggleGroup = (name: string) =>
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));

  const showFlat = !!groupFilter || sortedGroups.length <= 1;
  const flatItems = showFlat
    ? [...ungrouped, ...sortedGroups.flatMap(([, { items }]) => items)]
    : [];

  // ── Item renderer ─────────────────────────────────────────────────────
  const renderItem = (item: AdhkarRow) => {
    const isOpen = !!expandedById[item.id];
    const isBenefitsOverlayOpen = benefitsOverlayItemId === item.id;
    const isTafsirOverlayOpen = tafsirOverlayItemId === item.id;
    const isTransliterationOpen = !!transliterationById[item.id];
    const arabicFontSize = useEnhancedFont
      ? (isCompactPhone ? 23 : 26)
      : (isCompactPhone ? 22 : 24);
    const arabicLineHeight = useEnhancedFont
      ? (isCompactPhone ? 52 : 60)
      : (isCompactPhone ? 48 : 54);
    const itemBenefits = (item.description ?? item.benefits ?? '').trim();
    const hasBenefits = itemBenefits.length > 0;
    const benefitsIsHtml = hasBenefits && containsHtml(itemBenefits);
    const itemBenefitsPlain = benefitsIsHtml ? itemBenefits.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : itemBenefits;
    const itemTafsir = (item.tafsir ?? '').trim();
    const hasTafsir = itemTafsir.length > 0;
    const tafsirIsHtml = hasTafsir && containsHtml(itemTafsir);
    const itemTafsirPlain = tafsirIsHtml ? itemTafsir.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : itemTafsir;
    const urduBenefitsText = (urduBenefitsFallbackById[item.id] ?? '').trim();
    const isUrduBenefitsLoading = !!urduBenefitsLoadingById[item.id];
    const urduTafsirText = (urduTafsirFallbackById[item.id] ?? '').trim();
    const isUrduTafsirLoading = !!urduTafsirLoadingById[item.id];
    const dbUrduTranslation = resolveAdhkarUrduTranslation(item);
    const fallbackUrduTranslation = (urduFallbackById[item.id] ?? '').trim();
    const urduTranslation = dbUrduTranslation || fallbackUrduTranslation;
    const hasUrduTranslation = urduTranslation.length > 0;
    const isUrduLoading = !!urduLoadingById[item.id];
    const englishTranslationSource = resolveEnglishTranslationSource(item);
    const hasEnglishTranslation = englishTranslationSource.length > 0;
    const canResolveUrdu = hasUrduTranslation || hasEnglishTranslation;
    const itemBadge = (item.card_badge ?? '').trim();
    const showUrdu = !!urduById[item.id] && hasUrduTranslation;
    const showUrduBenefits = showUrdu && urduBenefitsText.length > 0;
    const showUrduTafsir = showUrdu && urduTafsirText.length > 0;
    const isLanguageSwitchLoading = isUrduLoading || isUrduBenefitsLoading || isUrduTafsirLoading;
    const selectedTranslation = showUrdu ? urduTranslation : englishTranslationSource;
    const itemLeadVisual = resolveEntryLeadVisual(groupFilter, item, salawatGroupName);

    const arabicParas = useEnhancedFont
      ? item.arabic.split('\n').map(l => l.trim()).filter(Boolean)
      : [item.arabic];
    const transParas = useEnhancedFont && item.translation
      ? item.translation.split('\n').map(l => l.trim()).filter(Boolean)
      : [];
    const translitParas = useEnhancedFont && item.transliteration
      ? item.transliteration.split('\n').map(l => l.trim()).filter(Boolean)
      : [];
    const hasSectionTransliteration = !!item.sections?.some((sec) => !!sec.transliteration?.trim());
    const hasSectionTranslation = !!item.sections?.some((sec) => !!sec.translation?.trim());
    const hasTransliteration = !!(
      item.transliteration?.trim() ||
      translitParas.length > 0 ||
      hasSectionTransliteration
    );
    const hasTranslation = !!(
      item.translation?.trim() ||
      transParas.length > 0 ||
      hasSectionTranslation ||
      canResolveUrdu
    );

    return (
      <Pressable
        key={item.id}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${item.title}. ${isOpen ? 'Collapse details' : 'Expand details'}`}
        style={({ pressed }) => [
          styles.itemCard,
          pressed && styles.itemCardPressed,
          N && { backgroundColor: N.surfaceAlt, borderColor: N.border, shadowColor: '#000' },
          isOpen && styles.itemCardOpen,
          useEnhancedFont && isOpen && styles.itemCardEnhanced,
        ]}
        onPress={() => {
          const specialSelection = onOpenSpecialGroup
            ? resolveSpecialSelectionForDbEntry(prayerTime, item)
            : undefined;

          if (specialSelection && onOpenSpecialGroup) {
            onOpenSpecialGroup(specialSelection);
            return;
          }

          setExpandedById((prev) => {
            const nextOpen = !prev[item.id];
            if (nextOpen) {
              void prefetchUrduForItem(item);
            }
            return {
              ...prev,
              [item.id]: nextOpen,
            };
          });
        }}
      >
        {({ pressed }) => (
          <>
            {/* ── Header row ── */}
            <View style={styles.itemHeader}>
              <View style={styles.itemDot}>
                {itemLeadVisual.kind === 'text' ? (
                  <Text style={styles.itemDotText}>{itemLeadVisual.value}</Text>
                ) : (
                  <MaterialIcons name={itemLeadVisual.value as any} size={16} color={ADHKAR_ACCENT_GREEN} />
                )}
              </View>
              <View style={styles.itemHeaderBody}>
                <View style={styles.itemHeaderTopRow}>
                  <Text style={[styles.itemTitle, N && { color: N.text }]}>{item.title}</Text>
                  {itemBadge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{itemBadge}</Text>
                    </View>
                  ) : null}
                </View>
                {item.arabic_title ? (
                  <Text style={[styles.itemArabicTitle, isCompactPhone && styles.itemArabicTitleCompact, N && { color: N.textSub }]}>{item.arabic_title}</Text>
                ) : null}
              </View>
              <View style={[styles.itemChevronWrap, pressed && styles.itemChevronWrapPressed]}>
                <MaterialIcons
                  name={isOpen ? 'expand-less' : 'expand-more'}
                  size={20}
                  color={N ? N.textMuted : ADHKAR_ARROW}
                />
              </View>
            </View>

            {/* ── Expanded body ── */}
            {isOpen ? (
              <View style={styles.itemBody}>
                {useEnhancedFont ? (
              // Enhanced paragraph-by-paragraph layout
              <View style={{ gap: 20 }}>
                <View style={[styles.arabicTopMeta, { borderBottomColor: accent + '25', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 4 }]}>
                  <Text style={[styles.arabicTopMetaText, isCompactPhone && styles.arabicTopMetaTextCompact, { color: accent }]}>{item.arabic_title || item.title}</Text>
                </View>
                {arabicParas.map((para, pi) => (
                  <View key={pi} style={styles.paraBlock}>
                    <View style={[styles.paraArabicBox, N && { backgroundColor: N.surface, borderColor: N.border }]}>
                      <Text style={[styles.arabicText, { fontSize: arabicFontSize, lineHeight: arabicLineHeight, fontFamily: 'MarwanIndoPak', textAlign: 'right', letterSpacing: 0 }, N && { color: N.text }]}>
                        {para}
                      </Text>
                    </View>
                    {isTransliterationOpen && translitParas[pi] ? (
                      <Text style={[styles.translit, { marginTop: 4, fontSize: 13, lineHeight: 21, fontStyle: 'italic' }, N && { color: N.textSub }]}>
                        {translitParas[pi]}
                      </Text>
                    ) : null}
                    {pi === 0 ? (
                      <View style={styles.inlineControlsRow}>
                        {hasTranslation ? (
                          <View style={styles.languageSwitch}>
                            <TouchableOpacity
                              style={[styles.languageSwitchOption, !showUrdu ? styles.languageOptionActive : styles.languageOptionInactive]}
                              onPress={(event) => {
                                event.stopPropagation();
                                setUrduById(prev => ({ ...prev, [item.id]: false }));
                              }}
                              activeOpacity={0.85}
                            >
                              <Text style={[styles.languageSwitchText, !showUrdu ? styles.controlTextActive : styles.controlTextInactive]}>ENGLISH</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.languageSwitchOption,
                                showUrdu ? styles.languageOptionActive : styles.languageOptionInactive,
                                !canResolveUrdu && styles.languageSwitchOptionDisabled,
                              ]}
                              onPress={(event) => {
                                event.stopPropagation();
                                if (!canResolveUrdu || showUrdu) return;
                                void handleUrduToggle(item);
                              }}
                              activeOpacity={0.85}
                            >
                              <Text style={[styles.languageSwitchUrduText, showUrdu ? styles.controlTextActive : styles.controlTextInactive]}>
                                {isLanguageSwitchLoading ? 'اردو...' : 'اردو'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}

                        {hasTransliteration ? (
                          <TouchableOpacity
                            style={[
                              styles.transliterationBtn,
                              isTransliterationOpen ? styles.controlPillActive : styles.controlPillInactive,
                            ]}
                            onPress={(event) => {
                              event.stopPropagation();
                              setTransliterationById(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.transliterationBtnText, isTransliterationOpen ? styles.controlTextActive : styles.controlTextInactive]}>Transliteration</Text>
                            <MaterialIcons
                              name={isTransliterationOpen ? 'expand-less' : 'expand-more'}
                              size={16}
                              color={isTransliterationOpen ? '#FFFFFF' : '#6B7280'}
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                    {hasTranslation && (showUrdu ? (pi === 0 && selectedTranslation) : transParas[pi]) ? (
                      <View style={[styles.paraTransBox, N && { backgroundColor: N.surface, borderColor: N.border }]}>
                        <Text style={[styles.translation, { fontSize: 14, lineHeight: 22 }, N && { color: N.text }, showUrdu && styles.translationUrdu]}>
                          {showUrdu ? selectedTranslation : transParas[pi]}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
                {item.reference ? (
                  <View style={[styles.refRowEnhanced, { backgroundColor: accent + '0A', borderColor: accent + '25' }]}>
                    <MaterialIcons name="info-outline" size={12} color={N ? N.textMuted : Colors.textSubtle} />
                    <Text style={[styles.refLabel, N && { color: N.textMuted }]}>{item.reference}</Text>
                  </View>
                ) : null}
              </View>
                ) : (
              // Standard layout: arabic → transliteration → translation
              <View style={{ gap: 0 }}>
                <View style={[styles.arabicBox, { marginBottom: 20 }, N && { backgroundColor: N.surface, borderColor: N.border }]}>
                  <Text style={[styles.arabicText, { fontSize: arabicFontSize, lineHeight: arabicLineHeight }, N && { color: N.text }]}>
                    {item.arabic}
                  </Text>
                </View>
                {/* Section blocks (optional structured content) */}
                {item.sections ? item.sections.map((sec, si) => (
                  <View key={si} style={{ gap: 6, marginBottom: 10 }}>
                    {sec.heading ? (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: accent, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {sec.heading}
                      </Text>
                    ) : null}
                    <View style={[styles.arabicBox, N && { backgroundColor: N.surface, borderColor: N.border }]}>
                      <Text style={[styles.arabicText, { fontSize: 20, lineHeight: 42 }, N && { color: N.text }]}>
                        {sec.arabic}
                      </Text>
                    </View>
                    {isTransliterationOpen && sec.transliteration ? <Text style={[styles.translit, N && { color: N.textSub }]}>{sec.transliteration}</Text> : null}
                    {hasTranslation && !showUrdu && sec.translation ? <Text style={[styles.translation, { marginTop: 4 }, N && { color: N.text }]}>{sec.translation}</Text> : null}
                  </View>
                )) : null}
                {isTransliterationOpen && item.transliteration ? (
                  <Text style={[styles.translit, { marginBottom: 20 }, N && { color: N.textSub }]}>{item.transliteration}</Text>
                ) : null}
                <View style={styles.inlineControlsRow}>
                  {hasTranslation ? (
                    <View style={styles.languageSwitch}>
                      <TouchableOpacity
                        style={[styles.languageSwitchOption, !showUrdu ? styles.languageOptionActive : styles.languageOptionInactive]}
                        onPress={(event) => {
                          event.stopPropagation();
                          setUrduById(prev => ({ ...prev, [item.id]: false }));
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.languageSwitchText, !showUrdu ? styles.controlTextActive : styles.controlTextInactive]}>ENGLISH</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.languageSwitchOption,
                          showUrdu ? styles.languageOptionActive : styles.languageOptionInactive,
                          !canResolveUrdu && styles.languageSwitchOptionDisabled,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          if (!canResolveUrdu || showUrdu) return;
                          void handleUrduToggle(item);
                        }}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.languageSwitchUrduText, showUrdu ? styles.controlTextActive : styles.controlTextInactive]}>
                          {isLanguageSwitchLoading ? 'اردو...' : 'اردو'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {hasTransliteration ? (
                    <TouchableOpacity
                      style={[
                        styles.transliterationBtn,
                        isTransliterationOpen ? styles.controlPillActive : styles.controlPillInactive,
                      ]}
                      onPress={(event) => {
                        event.stopPropagation();
                        setTransliterationById(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.transliterationBtnText, isTransliterationOpen ? styles.controlTextActive : styles.controlTextInactive]}>Transliteration</Text>
                      <MaterialIcons
                        name={isTransliterationOpen ? 'expand-less' : 'expand-more'}
                        size={16}
                        color={isTransliterationOpen ? '#FFFFFF' : '#6B7280'}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
                {hasTranslation && selectedTranslation ? (
                  <View style={[styles.translationBox, { marginBottom: item.reference ? 20 : 0 }, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
                    <Text style={[styles.translation, N && { color: N.text }, showUrdu && styles.translationUrdu]}>
                      {selectedTranslation}
                    </Text>
                  </View>
                ) : null}
                {item.reference ? (
                  <View style={[styles.refRow, { paddingTop: 6, borderTopWidth: 1, borderTopColor: N ? N.border : Colors.border + '80' }]}>
                    <MaterialIcons name="info-outline" size={11} color={N ? N.textMuted : Colors.textSubtle} />
                    <Text style={[styles.refLabel, N && { color: N.textMuted }]}>{item.reference}</Text>
                  </View>
                ) : null}

              </View>
                )}

              {/* ── Secondary accordions: Benefits + Tafsir ── */}
              {(hasBenefits || hasTafsir) ? (
                <View style={styles.accordionWrap}>
                  {hasBenefits ? (
                    <View style={styles.accordionBlock}>
                      <TouchableOpacity
                        style={[
                          styles.accordionHeader,
                          { backgroundColor: '#FEF9E7', borderColor: '#FDE68A' },
                          isBenefitsOverlayOpen && styles.accordionHeaderActive,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          void handleOpenBenefitsOverlay(item, itemBenefitsPlain);
                        }}
                        activeOpacity={0.8}
                      >
                        {showUrdu ? <Text style={[styles.accordionHeaderUrdu, { color: ADHKAR_BENEFITS_GOLD }]}>فوائد</Text> : null}
                        {!showUrdu ? <Text style={[styles.accordionHeaderEn, { color: ADHKAR_BENEFITS_GOLD }]}>Benefits</Text> : null}
                        <MaterialIcons name="open-in-full" size={18} color={ADHKAR_BENEFITS_GOLD} />
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {hasTafsir ? (
                    <View style={styles.accordionBlock}>
                      <TouchableOpacity
                        style={[
                          styles.accordionHeader,
                          { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
                          isTafsirOverlayOpen && styles.accordionHeaderActive,
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          void handleOpenTafsirOverlay(item, itemTafsirPlain);
                        }}
                        activeOpacity={0.8}
                      >
                        {showUrdu ? <Text style={[styles.accordionHeaderUrdu, { color: ADHKAR_TAFSIR_TEAL }]}>تفسیر</Text> : null}
                        {!showUrdu ? <Text style={[styles.accordionHeaderEn, { color: ADHKAR_TAFSIR_TEAL }]}>Tafsir</Text> : null}
                        <MaterialIcons name="open-in-full" size={18} color={ADHKAR_TAFSIR_TEAL} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ) : null}

              </View>
            ) : null}
          </>
        )}
      </Pressable>
    );
  };

  const totalCount = adhkar.length;
  const benefitsOverlayItem = benefitsOverlayItemId
    ? (adhkar.find((row) => row.id === benefitsOverlayItemId) ?? null)
    : null;
  const overlayBenefits = (benefitsOverlayItem?.description ?? benefitsOverlayItem?.benefits ?? '').trim();
  const overlayBenefitsIsHtml = containsHtml(overlayBenefits);
  const overlayUrduBenefits = benefitsOverlayItem ? (urduBenefitsFallbackById[benefitsOverlayItem.id] ?? '').trim() : '';
  const overlayBenefitsUrduMode = !!(benefitsOverlayItem && urduById[benefitsOverlayItem.id]);
  const overlayShowUrduBenefits = !!(benefitsOverlayItem && urduById[benefitsOverlayItem.id] && overlayUrduBenefits);
  const overlayIsUrduBenefitsLoading = !!(benefitsOverlayItem && urduBenefitsLoadingById[benefitsOverlayItem.id]);

  const overlayItem = tafsirOverlayItemId
    ? (adhkar.find((row) => row.id === tafsirOverlayItemId) ?? null)
    : null;
  const overlayTafsir = (overlayItem?.tafsir ?? '').trim();
  const overlayTafsirIsHtml = containsHtml(overlayTafsir);
  const overlayUrduTafsir = overlayItem ? (urduTafsirFallbackById[overlayItem.id] ?? '').trim() : '';
  const overlayTafsirUrduMode = !!(overlayItem && urduById[overlayItem.id]);
  const overlayShowUrdu = !!(overlayItem && urduById[overlayItem.id] && overlayUrduTafsir);
  const overlayIsUrduLoading = !!(overlayItem && urduTafsirLoadingById[overlayItem.id]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 32, gap: 16 }}
      >
        {/* Page header */}
        <View style={[styles.headerBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
          <MaterialIcons name={meta.icon as any} size={22} color={accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, N && { color: N.text }]}>{displayTitle}</Text>
            <Text style={[styles.headerSub, N && { color: N.textSub }]}>
              {totalCount} adhkar{!showFlat && sortedGroups.length > 0 ? ` · ${sortedGroups.length} groups` : ''}
            </Text>
          </View>
        </View>

        {showFlat ? (
          flatItems.map(renderItem)
        ) : (
          <>
            {ungrouped.map(renderItem)}
            {sortedGroups.map(([groupName, { items }]) => {
              const isGroupOpen = expandedGroups[groupName] !== false;
              return (
                <View key={groupName} style={[styles.groupBlock, N && { borderColor: N.border }]}>
                  <TouchableOpacity
                    style={[styles.groupHeader, N && { backgroundColor: N.surface }]}
                    onPress={() => toggleGroup(groupName)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.groupIconBox, { backgroundColor: accent + '22' }]}>
                      <MaterialIcons name="layers" size={18} color={accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.groupTitle, N && { color: N.text }]}>{groupName}</Text>
                      <Text style={[styles.groupCount, N && { color: N.textMuted }]}>
                        {items.length} dua{items.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
                      <Text style={[styles.badgeText, { color: accent }]}>Group</Text>
                    </View>
                    <MaterialIcons
                      name={isGroupOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={22}
                      color={N ? N.textMuted : Colors.textSubtle}
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                  {isGroupOpen ? (
                    <View style={[styles.groupItems, N && { backgroundColor: N.bg }]}>
                      {items.map(renderItem)}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={!!benefitsOverlayItem}
        animationType="slide"
        transparent
        onRequestClose={handleCloseBenefitsOverlay}
      >
        <View style={styles.overlayBackdrop}>
          <Pressable style={styles.overlayDismissZone} onPress={handleCloseBenefitsOverlay} />
          <View style={[styles.overlaySheet, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}>
            <View style={styles.overlayHeader}>
              <View style={{ flex: 1 }}>
                {overlayBenefitsUrduMode ? <Text style={[styles.overlayTitleUrdu, { color: ADHKAR_BENEFITS_GOLD }]}>فوائد</Text> : null}
                {!overlayBenefitsUrduMode ? <Text style={[styles.overlayTitleEn, N && { color: N.text }]}>Benefits</Text> : null}
              </View>
              <TouchableOpacity style={styles.overlayCloseBtn} onPress={handleCloseBenefitsOverlay} activeOpacity={0.85}>
                <MaterialIcons name="close" size={20} color={N ? N.text : '#334155'} />
              </TouchableOpacity>
            </View>

            <ScrollView nestedScrollEnabled style={styles.overlayScroll} contentContainerStyle={styles.overlayScrollContent}>
              {overlayShowUrduBenefits ? (
                <Text style={[styles.insightUrduText, N && { color: N.text }]}>{overlayUrduBenefits}</Text>
              ) : (benefitsOverlayItem && urduById[benefitsOverlayItem.id] && overlayIsUrduBenefitsLoading) ? (
                <Text style={[styles.insightUrduText, N && { color: N.textMuted }]}>ترجمہ تیار کیا جا رہا ہے...</Text>
              ) : overlayBenefitsIsHtml ? (
                <RenderHtml
                  contentWidth={Math.max(240, width - 56)}
                  source={{ html: overlayBenefits }}
                  baseStyle={{ color: N ? N.textSub : ADHKAR_DESCRIPTION_TEXT, fontSize: 15, lineHeight: 24 }}
                  tagsStyles={{ p: { marginTop: 0, marginBottom: 8 }, li: { marginBottom: 4 }, ul: { marginTop: 0, marginBottom: 8, paddingLeft: 18 }, ol: { marginTop: 0, marginBottom: 8, paddingLeft: 18 }, strong: { fontWeight: '700' }, em: { fontStyle: 'italic' } }}
                />
              ) : (
                <Text style={[styles.benefitsText, N && { color: N.textSub }]}>{overlayBenefits || 'No benefits available.'}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!overlayItem}
        animationType="slide"
        transparent
        onRequestClose={handleCloseTafsirOverlay}
      >
        <View style={styles.overlayBackdrop}>
          <Pressable style={styles.overlayDismissZone} onPress={handleCloseTafsirOverlay} />
          <View style={[styles.overlaySheet, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
            <View style={styles.overlayHeader}>
              <View style={{ flex: 1 }}>
                {overlayTafsirUrduMode ? <Text style={[styles.overlayTitleUrdu, { color: ADHKAR_TAFSIR_TEAL }]}>تفسیر</Text> : null}
                {!overlayTafsirUrduMode ? <Text style={[styles.overlayTitleEn, N && { color: N.text }]}>Tafsir</Text> : null}
              </View>
              <TouchableOpacity style={styles.overlayCloseBtn} onPress={handleCloseTafsirOverlay} activeOpacity={0.85}>
                <MaterialIcons name="close" size={20} color={N ? N.text : '#334155'} />
              </TouchableOpacity>
            </View>

            <ScrollView nestedScrollEnabled style={styles.overlayScroll} contentContainerStyle={styles.overlayScrollContent}>
              {overlayShowUrdu ? (
                <Text style={[styles.insightUrduText, N && { color: N.text }]}>{overlayUrduTafsir}</Text>
              ) : (overlayItem && urduById[overlayItem.id] && overlayIsUrduLoading) ? (
                <Text style={[styles.insightUrduText, N && { color: N.textMuted }]}>ترجمہ تیار کیا جا رہا ہے...</Text>
              ) : overlayTafsirIsHtml ? (
                <RenderHtml
                  contentWidth={Math.max(240, width - 64)}
                  source={{ html: overlayTafsir }}
                  baseStyle={{ color: N ? N.textSub : ADHKAR_DESCRIPTION_TEXT, fontSize: 15, lineHeight: 24 }}
                  tagsStyles={{ p: { marginTop: 0, marginBottom: 8 }, li: { marginBottom: 4 }, ul: { marginTop: 0, marginBottom: 8, paddingLeft: 18 }, ol: { marginTop: 0, marginBottom: 8, paddingLeft: 18 }, strong: { fontWeight: '700' }, em: { fontStyle: 'italic' } }}
                />
              ) : (
                <Text style={[styles.benefitsText, N && { color: N.textSub }]}>{overlayTafsir || 'No tafsir available.'}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSubtle,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Header band
  headerBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: Colors.textPrimary },
  headerSub:   { fontSize: 12, lineHeight: 16, fontWeight: '500', color: Colors.textSubtle, marginTop: 1 },

  // Item card
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(31, 42, 36, 0.06)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.045,
    shadowRadius: 14,
    elevation: 4,
  },
  itemCardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  itemCardOpen: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 6,
    transform: [{ scale: 1.01 }],
    marginVertical: 2,
  },
  itemCardEnhanced: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemHeaderBody: { flex: 1, gap: 0, paddingTop: 1, justifyContent: 'center' },
  itemHeaderTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  itemBody: { marginTop: 20, gap: 20 },
  itemDot: {
    width: 44, height: 44,
    borderRadius: 14,
    backgroundColor: ADHKAR_ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    opacity: 0.9,
  },
  itemDotText: {
    fontSize: 16,
    fontWeight: '700',
    color: ADHKAR_ACCENT_GREEN,
    textAlign: 'center',
    includeFontPadding: false,
  },
  itemTitle:      { fontSize: 17, fontWeight: '700', color: ADHKAR_CARD_TITLE, flexShrink: 1, lineHeight: 22 },
  itemArabicTitle:{
    fontFamily: 'MarwanIndoPak',
    writingDirection: 'rtl',
    textAlign: 'right',
    includeFontPadding: false,
    alignSelf: 'flex-end',
    fontSize: 20,
    lineHeight: 30,
    color: '#4B5563',
    marginTop: 8,
  } as any,
  itemArabicTitleCompact: {
    fontSize: 18,
    lineHeight: 28,
  },
  itemChevronWrap: { alignSelf: 'center', marginRight: -2, opacity: 0.78, transform: [{ translateX: 0 }] },
  itemChevronWrapPressed: { transform: [{ translateX: 3 }] },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: ADHKAR_TAG_BG,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: ADHKAR_ACCENT_GREEN },

  // Arabic text
  arabicBox: {
    ...arabicBoxBase,
  },
  arabicText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'MarwanIndoPak',
    color: '#111827',
    includeFontPadding: false,
  } as any,

  // Enhanced paragraph layout
  arabicTopMeta:     { alignItems: 'flex-end' },
  arabicTopMetaText: {
    fontFamily: 'MarwanIndoPak',
    writingDirection: 'rtl',
    textAlign: 'right',
    includeFontPadding: false,
    fontSize: 24,
    lineHeight: 34,
  } as any,
  arabicTopMetaTextCompact: {
    fontSize: 21,
    lineHeight: 30,
  },
  paraBlock:         { gap: 10 },
  paraArabicBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAF9',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  paraTransBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
  },

  // Transliteration / Translation
  translit:    { fontSize: 13, fontStyle: 'italic', color: '#6B7280', lineHeight: 21 },
  translation: { fontSize: 14, color: '#374151', lineHeight: 22 },
  translationUrdu: { writingDirection: 'rtl', textAlign: 'right', fontFamily: 'UrduNastaliq', fontSize: 22, lineHeight: 40 } as any,
  inlineControlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2, marginBottom: 20 },
  controlPillInactive: {
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  controlPillActive: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A',
  },
  controlTextActive: {
    color: '#FFFFFF',
  },
  controlTextInactive: {
    color: '#6B7280',
  },
  translationBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    minHeight: 76,
  },
  languageSwitch: {
    flexDirection: 'row',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    padding: 4,
  },
  languageSwitchOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  languageOptionActive: {
    backgroundColor: '#16A34A',
  },
  languageOptionInactive: {
    backgroundColor: 'transparent',
  },
  languageSwitchOptionDisabled: {
    opacity: 0.45,
  },
  languageSwitchText: {
    fontSize: 12,
    fontWeight: '700',
  },
  languageSwitchUrduText: {
    fontFamily: 'UrduNastaliq',
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
  } as any,

  // Transliteration toggle
  transliterationBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  transliterationBtnText: { fontSize: 13, fontWeight: '600' },

  // DB benefits / tafsir accordions
  benefitsWrap: { gap: 8 },
  benefitsText: { fontSize: 14, lineHeight: 22, color: ADHKAR_DESCRIPTION_TEXT },
  accordionWrap: {
    gap: 8,
    marginTop: 0,
  },
  accordionBlock: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  accordionHeaderActive: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  accordionHeaderUrdu: {
    fontFamily: 'UrduNastaliq',
    fontSize: 17,
    lineHeight: 24,
    includeFontPadding: false,
    marginTop: -1,
  } as any,
  accordionHeaderEn: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    color: '#4B5563',
  },
  accordionPanel: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    marginTop: 6,
  },
  accordionPanelTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  accordionScroll: {
    maxHeight: 200,
  },
  accordionScrollContent: {
    paddingBottom: 6,
  },
  insightUrduText: {
    writingDirection: 'rtl',
    textAlign: 'right',
    fontFamily: 'UrduNastaliq',
    fontSize: 20,
    lineHeight: 38,
    color: ADHKAR_DESCRIPTION_TEXT,
    includeFontPadding: false,
  } as any,

  // Tafsir overlay
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 20,
  },
  overlayDismissZone: {
    ...StyleSheet.absoluteFillObject,
  },
  overlaySheet: {
    width: '97%',
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  overlayTitleUrdu: {
    fontFamily: 'UrduNastaliq',
    fontSize: 20,
    lineHeight: 30,
    includeFontPadding: false,
  } as any,
  overlayTitleEn: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  overlayCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  overlayScroll: {
    maxHeight: 620,
  },
  overlayScrollContent: {
    paddingBottom: 12,
  },

  // Reference rows
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  refRowEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  refLabel: { fontSize: 11, color: Colors.textSubtle, flex: 1, lineHeight: 16 },

  // Group collapsible
  groupBlock: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  groupIconBox: {
    width: 38, height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  groupCount: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: Colors.textSubtle, marginTop: 1 },
  groupItems: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },

});
