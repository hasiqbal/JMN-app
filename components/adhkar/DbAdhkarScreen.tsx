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
  TouchableOpacity,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { NIGHT_PALETTE } from '@/constants/nightPalette';
import { fetchAdhkarForPrayerTime, AdhkarRow, resolveAdhkarUrduTranslation } from '@/services/contentService';
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
const ADHKAR_CARD_TITLE = '#1F2A24';
const ADHKAR_CARD_TEXT = '#6B7A72';
const ADHKAR_META_TEXT = '#7A887F';
const ADHKAR_DESCRIPTION_TEXT = '#4F5D56';
const ADHKAR_ICON_BG = '#F0F7F3';
const ADHKAR_TAG_BG = '#E6F4EA';
const ADHKAR_ARROW = '#A0A8A2';
const ADHKAR_BENEFITS_GOLD = '#B88917';
const ADHKAR_BENEFITS_GOLD_SOFT = '#FFF4D6';

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
  paddingHorizontal: 14,
  paddingVertical: 12,
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
  const [loading, setLoading] = React.useState(true);
  const [expandedById, setExpandedById] = React.useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});
  const [urduById, setUrduById] = React.useState<Record<string, boolean>>({});
  const [benefitsById, setBenefitsById] = React.useState<Record<string, boolean>>({});
  const [transliterationById, setTransliterationById] = React.useState<Record<string, boolean>>({});
  const [translationById, setTranslationById] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setLoading(true);
    fetchAdhkarForPrayerTime(prayerTime).then((rows) => {
      const filtered = groupFilter ? rows.filter(r => r.group_name === groupFilter) : rows;
      setAdhkar(filtered);

      // Auto-expand all groups on load
      const groups: Record<string, boolean> = {};
      filtered.forEach(r => { if (r.group_name) groups[r.group_name] = true; });
      setExpandedGroups(groups);
      // Keep cards collapsed by default; user can tap to expand.
      setExpandedById({});
      setBenefitsById({});
      setTransliterationById({});
      setTranslationById({});
      setLoading(false);
    });
  }, [prayerTime, groupFilter]);

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
    const isBenefitsOpen = !!benefitsById[item.id];
    const isTransliterationOpen = !!transliterationById[item.id];
    const isTranslationOpen = !!translationById[item.id];
    const arabicFontSize = useEnhancedFont
      ? (isCompactPhone ? 23 : 26)
      : (isCompactPhone ? 22 : 24);
    const arabicLineHeight = useEnhancedFont
      ? (isCompactPhone ? 50 : 58)
      : (isCompactPhone ? 46 : 52);
    const itemBenefits = (item.benefits ?? item.description ?? '').trim();
    const hasBenefits = itemBenefits.length > 0;
    const urduTranslation = resolveAdhkarUrduTranslation(item);
    const hasUrduTranslation = urduTranslation.length > 0;
    const showUrdu = !!urduById[item.id] && hasUrduTranslation;
    const selectedTranslation = showUrdu ? urduTranslation : item.translation;

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
      hasUrduTranslation
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

          setExpandedById((prev) => ({
            ...prev,
            [item.id]: !prev[item.id],
          }));
        }}
      >
        {({ pressed }) => (
          <>
            {/* ── Header row ── */}
            <View style={styles.itemHeader}>
              <View style={styles.itemDot}>
                <MaterialIcons name="format-quote" size={16} color={ADHKAR_ACCENT_GREEN} />
              </View>
              <View style={styles.itemHeaderBody}>
                <View style={styles.itemHeaderTopRow}>
                  <Text style={[styles.itemTitle, N && { color: N.text }]}>{item.title}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Adhkar</Text>
                  </View>
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
                {hasBenefits ? (
                  <View style={styles.benefitsWrap}>
                    <TouchableOpacity
                      style={[
                        styles.benefitsBtn,
                        { borderColor: ADHKAR_BENEFITS_GOLD + '99', backgroundColor: ADHKAR_BENEFITS_GOLD_SOFT },
                        isBenefitsOpen && { backgroundColor: '#F4E1A6', borderColor: ADHKAR_BENEFITS_GOLD },
                      ]}
                      onPress={(event) => {
                        event.stopPropagation();
                        setBenefitsById(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.benefitsBtnText, { color: ADHKAR_BENEFITS_GOLD }]}>Benefits</Text>
                      <MaterialIcons
                        name={isBenefitsOpen ? 'expand-less' : 'expand-more'}
                        size={16}
                        color={ADHKAR_BENEFITS_GOLD}
                      />
                    </TouchableOpacity>
                    {isBenefitsOpen ? (
                      <View style={[styles.benefitsBox, { borderLeftColor: ADHKAR_BENEFITS_GOLD, backgroundColor: ADHKAR_BENEFITS_GOLD_SOFT }, N && { backgroundColor: '#4A3B13' }]}>
                        <Text style={[styles.benefitsText, N && { color: N.textSub }]}>{itemBenefits}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {useEnhancedFont ? (
              // Enhanced paragraph-by-paragraph layout
              <View style={{ gap: 16 }}>
                <View style={[styles.arabicTopMeta, { borderBottomColor: accent + '25', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 4 }]}>
                  <Text style={[styles.arabicTopMetaText, isCompactPhone && styles.arabicTopMetaTextCompact, { color: accent }]}>{item.arabic_title || item.title}</Text>
                </View>
                {arabicParas.map((para, pi) => (
                  <View key={pi} style={styles.paraBlock}>
                    <View style={[styles.paraArabicBox, { backgroundColor: accent + '0E', borderColor: accent + '28' }, N && { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
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
                      <View style={styles.translationToggleRow}>
                        <View style={styles.actionLeftGroup}>
                          {hasTransliteration ? (
                            <TouchableOpacity
                              style={[
                                styles.transliterationBtn,
                                { borderColor: accent + '66' },
                                isTransliterationOpen && { backgroundColor: accent + '14', borderColor: accent },
                              ]}
                              onPress={(event) => {
                                event.stopPropagation();
                                setTransliterationById(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.transliterationBtnText, { color: accent }]}>Transliteration</Text>
                              <MaterialIcons
                                name={isTransliterationOpen ? 'expand-less' : 'expand-more'}
                                size={16}
                                color={accent}
                              />
                            </TouchableOpacity>
                          ) : null}
                          {hasTranslation ? (
                            <TouchableOpacity
                              style={[
                                styles.translationBtn,
                                { borderColor: accent + '66' },
                                isTranslationOpen && { backgroundColor: accent + '14', borderColor: accent },
                              ]}
                              onPress={(event) => {
                                event.stopPropagation();
                                setTranslationById(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.translationBtnText, { color: accent }]}>Translation</Text>
                              <MaterialIcons
                                name={isTranslationOpen ? 'expand-less' : 'expand-more'}
                                size={16}
                                color={accent}
                              />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.translationToggleBtn,
                            { borderColor: accent + '88' },
                            showUrdu && { backgroundColor: accent + '22', borderColor: accent },
                            !hasUrduTranslation && { opacity: 0.55 },
                          ]}
                          onPress={() => {
                            if (!hasUrduTranslation) return;
                            setUrduById(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.translationToggleText, { color: accent }]}> 
                            {hasUrduTranslation ? 'Urdu' : 'Urdu (N/A)'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    {isTranslationOpen && (showUrdu ? (pi === 0 && selectedTranslation) : transParas[pi]) ? (
                      <View style={[styles.paraTransBox, { borderLeftColor: accent }, N && { backgroundColor: accent + '12' }]}>
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
                <View style={[styles.arabicBox, { backgroundColor: accent + '10', borderColor: accent + '30', marginBottom: 14 }]}>
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
                    <View style={[styles.arabicBox, { backgroundColor: accent + '08', borderColor: accent + '20' }]}>
                      <Text style={[styles.arabicText, { fontSize: 20, lineHeight: 42 }, N && { color: N.text }]}>
                        {sec.arabic}
                      </Text>
                    </View>
                    {isTransliterationOpen && sec.transliteration ? <Text style={[styles.translit, N && { color: N.textSub }]}>{sec.transliteration}</Text> : null}
                    {isTranslationOpen && sec.translation ? <Text style={[styles.translation, { marginTop: 4 }, N && { color: N.text }]}>{sec.translation}</Text> : null}
                  </View>
                )) : null}
                {isTransliterationOpen && item.transliteration ? (
                  <Text style={[styles.translit, { marginBottom: 8 }, N && { color: N.textSub }]}>{item.transliteration}</Text>
                ) : null}
                <View style={styles.translationToggleRow}>
                  <View style={styles.actionLeftGroup}>
                    {hasTransliteration ? (
                      <TouchableOpacity
                        style={[
                          styles.transliterationBtn,
                          { borderColor: accent + '66' },
                          isTransliterationOpen && { backgroundColor: accent + '14', borderColor: accent },
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          setTransliterationById(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.transliterationBtnText, { color: accent }]}>Transliteration</Text>
                        <MaterialIcons
                          name={isTransliterationOpen ? 'expand-less' : 'expand-more'}
                          size={16}
                          color={accent}
                        />
                      </TouchableOpacity>
                    ) : null}
                    {hasTranslation ? (
                      <TouchableOpacity
                        style={[
                          styles.translationBtn,
                          { borderColor: accent + '66' },
                          isTranslationOpen && { backgroundColor: accent + '14', borderColor: accent },
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          setTranslationById(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.translationBtnText, { color: accent }]}>Translation</Text>
                        <MaterialIcons
                          name={isTranslationOpen ? 'expand-less' : 'expand-more'}
                          size={16}
                          color={accent}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.translationToggleBtn,
                      { borderColor: accent + '88' },
                      showUrdu && { backgroundColor: accent + '22', borderColor: accent },
                      !hasUrduTranslation && { opacity: 0.55 },
                    ]}
                    onPress={() => {
                      if (!hasUrduTranslation) return;
                      setUrduById(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.translationToggleText, { color: accent }]}> 
                      {hasUrduTranslation ? 'Urdu' : 'Urdu (N/A)'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {isTranslationOpen && selectedTranslation ? (
                  <Text style={[styles.translation, { marginBottom: item.reference ? 10 : 0 }, N && { color: N.text }, showUrdu && styles.translationUrdu]}>
                    {selectedTranslation}
                  </Text>
                ) : null}
                {item.reference ? (
                  <View style={[styles.refRow, { paddingTop: 6, borderTopWidth: 1, borderTopColor: N ? N.border : Colors.border + '80' }]}>
                    <MaterialIcons name="info-outline" size={11} color={N ? N.textMuted : Colors.textSubtle} />
                    <Text style={[styles.refLabel, N && { color: N.textMuted }]}>{item.reference}</Text>
                  </View>
                ) : null}
              </View>
                )}
              </View>
            ) : null}
          </>
        )}
      </Pressable>
    );
  };

  const totalCount = adhkar.length;

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
  itemBody: { marginTop: 16, gap: 12 },
  itemDot: {
    width: 44, height: 44,
    borderRadius: 14,
    backgroundColor: ADHKAR_ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    opacity: 0.9,
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
    color: ADHKAR_DESCRIPTION_TEXT,
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
    color: Colors.textPrimary,
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
  paraBlock:         { gap: 8 },
  paraArabicBox: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  paraTransBox: {
    borderLeftWidth: 3,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
  },

  // Transliteration / Translation
  translit:    { fontSize: 13, fontStyle: 'italic', color: Colors.textSecondary, lineHeight: 20 },
  translation: { fontSize: 14, color: Colors.textPrimary, lineHeight: 21 },
  translationUrdu: { writingDirection: 'rtl', textAlign: 'right', fontFamily: 'UrduNastaliq', fontSize: 22, lineHeight: 40 } as any,
  translationToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 },
  actionLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  translationToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  translationToggleText: { fontSize: 11, fontWeight: '700' },

  // Translation toggle
  translationBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },
  translationBtnText: { fontSize: 11, fontWeight: '700' },

  // Transliteration toggle
  transliterationBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },
  transliterationBtnText: { fontSize: 11, fontWeight: '700' },

  // DB description / benefits
  benefitsWrap: { gap: 8 },
  benefitsBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  benefitsBtnText: { fontSize: 11, fontWeight: '700' },
  benefitsBox: {
    borderLeftWidth: 3,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  benefitsText: { fontSize: 14, lineHeight: 21, color: ADHKAR_DESCRIPTION_TEXT },

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
