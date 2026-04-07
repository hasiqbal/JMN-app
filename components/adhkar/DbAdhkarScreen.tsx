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
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { NIGHT_PALETTE } from '@/constants/nightPalette';
import { fetchAdhkarForPrayerTime, AdhkarRow } from '@/services/contentService';

// ── Groups that use enhanced Indo-Pak paragraph formatting ───────────────
const ENHANCED_ARABIC_GROUPS = new Set([
  'Wird Abu Bakr bin Salim',
  'Dua after Surah Yaseen',
]);

// ── Prayer-time display metadata ─────────────────────────────────────────
const PRAYER_TIME_META: Record<string, { title: string; icon: string; accent: string }> = {
  'after-fajr':    { title: 'Morning Adhkar',         icon: 'wb-twilight', accent: '#1B8A5A' },
  'after-zuhr':    { title: 'After Dhuhr Adhkar',     icon: 'wb-sunny',    accent: '#0A5C9E' },
  'after-jumuah':  { title: "After Jumu'ah Adhkar",   icon: 'star',        accent: '#B8860B' },
  'after-asr':     { title: 'After Asr Adhkar',       icon: 'wb-cloudy',   accent: '#E65100' },
  'after-maghrib': { title: 'Evening Adhkar',          icon: 'bedtime',     accent: '#6A1B9A' },
  'after-isha':    { title: 'After Isha Adhkar',       icon: 'nightlight',  accent: '#1565C0' },
  'before-fajr':   { title: 'Before Fajr Adhkar',     icon: 'nights-stay', accent: '#3949AB' },
  // Group-filtered overrides
  'Surah Al-Waqiah':         { title: 'Surah Al-Waqiah',           icon: 'menu-book',   accent: '#E65100' },
  'Hizb ul Bahr':            { title: 'Hizb ul Bahr',              icon: 'waves',       accent: '#1565C0' },
  'Dua after Surah Yaseen':  { title: 'Dua after Surah Yaseen',    icon: 'favorite',    accent: '#C62828' },
  'Dua al-Waqiah':           { title: 'Dua after Surah Waqiah',    icon: 'auto-awesome',accent: '#6A1B9A' },
  'Wird Abu Bakr bin Salim': { title: 'Wird of Abu Bakr bin Salim',icon: 'stars',       accent: '#B8860B' },
  'Morning Adhkar':          { title: 'Morning Adhkar',            icon: 'wb-twilight', accent: '#1B8A5A' },
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
}

export function DbAdhkarScreen({
  prayerTime,
  nightMode,
  onBack,
  groupFilter,
  titleOverride,
}: Props) {
  const N = nightMode ? NIGHT_PALETTE : null;
  const useEnhancedFont = !!(groupFilter && ENHANCED_ARABIC_GROUPS.has(groupFilter));

  const [adhkar, setAdhkar] = React.useState<AdhkarRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setLoading(true);
    fetchAdhkarForPrayerTime(prayerTime).then(rows => {
      const filtered = groupFilter ? rows.filter(r => r.group_name === groupFilter) : rows;
      setAdhkar(filtered);
      // Auto-expand all groups on load
      const groups: Record<string, boolean> = {};
      filtered.forEach(r => { if (r.group_name) groups[r.group_name] = true; });
      setExpandedGroups(groups);
      // Auto-expand single item so content shows immediately
      if (filtered.length === 1) setExpandedId(filtered[0].id);
      setLoading(false);
    });
  }, [prayerTime, groupFilter]);

  const meta = groupFilter
    ? (PRAYER_TIME_META[groupFilter] ?? PRAYER_TIME_META[prayerTime] ?? { title: groupFilter, icon: 'auto-awesome', accent: '#1B8A5A' })
    : (PRAYER_TIME_META[prayerTime] ?? { title: 'Adhkar', icon: 'auto-awesome', accent: '#1B8A5A' });
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
    return (
      <View style={styles.centred}>
        <MaterialIcons name="auto-awesome" size={40} color={N ? N.textMuted : Colors.textSubtle} style={{ opacity: 0.4 }} />
        <Text style={[styles.emptyText, N && { color: N.textMuted }]}>
          {'No adhkar found in the database.\nAdd them via Cloud \u2192 Data \u2192 adhkar table.'}
        </Text>
      </View>
    );
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

  const singleItem = adhkar.length === 1;
  const showFlat = !!groupFilter || sortedGroups.length <= 1;
  const flatItems = showFlat
    ? [...ungrouped, ...sortedGroups.flatMap(([, { items }]) => items)]
    : [];

  // ── Item renderer ─────────────────────────────────────────────────────
  const renderItem = (item: AdhkarRow) => {
    const isOpen = singleItem || expandedId === item.id;
    const arabicFontSize   = useEnhancedFont ? 26 : 24;
    const arabicLineHeight = useEnhancedFont ? 58 : 52;

    const arabicParas = useEnhancedFont
      ? item.arabic.split('\n').map(l => l.trim()).filter(Boolean)
      : [item.arabic];
    const transParas = useEnhancedFont && item.translation
      ? item.translation.split('\n').map(l => l.trim()).filter(Boolean)
      : [];
    const translitParas = useEnhancedFont && item.transliteration
      ? item.transliteration.split('\n').map(l => l.trim()).filter(Boolean)
      : [];

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.itemCard,
          N && { backgroundColor: N.surfaceAlt, borderColor: N.border },
          isOpen && { borderColor: accent },
          useEnhancedFont && isOpen && styles.itemCardEnhanced,
        ]}
        onPress={() => { if (!singleItem) setExpandedId(isOpen ? null : item.id); }}
        activeOpacity={singleItem ? 1 : 0.85}
      >
        {/* ── Header row ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.itemDot, { backgroundColor: accent + '33' }]}>
            <MaterialIcons name="format-quote" size={16} color={accent} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[styles.itemTitle, N && { color: N.text }]}>{item.title}</Text>
            {item.arabic_title ? (
              <Text style={[styles.itemArabicTitle, { color: accent }]}>{item.arabic_title}</Text>
            ) : null}
          </View>
          {item.count ? (
            <View style={[styles.badge, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
              <Text style={[styles.badgeText, { color: accent }]}>×{item.count}</Text>
            </View>
          ) : null}
          {!singleItem ? (
            <MaterialIcons
              name={isOpen ? 'expand-less' : 'expand-more'}
              size={20}
              color={N ? N.textMuted : Colors.textSubtle}
            />
          ) : null}
        </View>

        {/* ── Expanded body ── */}
        {isOpen ? (
          <View style={{ marginTop: 14, gap: 12 }}>
            {useEnhancedFont ? (
              // Enhanced paragraph-by-paragraph layout
              <View style={{ gap: 16 }}>
                <View style={[styles.arabicTopMeta, { borderBottomColor: accent + '25', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 4 }]}>
                  <Text style={[styles.arabicTopMetaText, { color: accent }]}>{item.arabic_title || item.title}</Text>
                </View>
                {arabicParas.map((para, pi) => (
                  <View key={pi} style={styles.paraBlock}>
                    <View style={[styles.paraArabicBox, { backgroundColor: accent + '0E', borderColor: accent + '28' }, N && { backgroundColor: accent + '18', borderColor: accent + '40' }]}>
                      <Text style={[styles.arabicText, { fontSize: arabicFontSize, lineHeight: arabicLineHeight, fontFamily: 'MarwanIndoPak', textAlign: 'right', letterSpacing: 0.5 }, N && { color: N.text }]}>
                        {para}
                      </Text>
                    </View>
                    {translitParas[pi] ? (
                      <Text style={[styles.translit, { marginTop: 4, fontSize: 13, lineHeight: 21, fontStyle: 'italic' }, N && { color: N.textSub }]}>
                        {translitParas[pi]}
                      </Text>
                    ) : null}
                    {transParas[pi] ? (
                      <View style={[styles.paraTransBox, { borderLeftColor: accent }, N && { backgroundColor: accent + '12' }]}>
                        <Text style={[styles.translation, { fontSize: 14, lineHeight: 22 }, N && { color: N.text }]}>
                          {transParas[pi]}
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
                    {sec.transliteration ? <Text style={[styles.translit, N && { color: N.textSub }]}>{sec.transliteration}</Text> : null}
                    {sec.translation ? <Text style={[styles.translation, { marginTop: 4 }, N && { color: N.text }]}>{sec.translation}</Text> : null}
                  </View>
                )) : null}
                {item.transliteration ? (
                  <Text style={[styles.translit, { marginBottom: 8 }, N && { color: N.textSub }]}>{item.transliteration}</Text>
                ) : null}
                {item.translation ? (
                  <Text style={[styles.translation, { marginBottom: item.reference ? 10 : 0 }, N && { color: N.text }]}>
                    {item.translation}
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
      </TouchableOpacity>
    );
  };

  const totalCount = adhkar.length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 32, gap: 10 }}
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

        <View style={[styles.tip, N && { backgroundColor: N.surface, borderColor: N.border }]}>
          <MaterialIcons name="info-outline" size={14} color={N ? N.textMuted : Colors.textSubtle} />
          <Text style={[styles.tipText, N && { color: N.textMuted }]}>
            Managed via the masjid database. Add groups and their duas directly in Cloud → Data → adhkar.
          </Text>
        </View>
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
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  headerSub:   { fontSize: 11, fontWeight: '500', color: Colors.textSubtle, marginTop: 1 },

  // Item card
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  itemCardEnhanced: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemDot: {
    width: 36, height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemTitle:      { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  itemArabicTitle:{ fontSize: 14, fontWeight: '600' } as any,

  // Badge
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },

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
  arabicTopMeta:     { alignItems: 'center' },
  arabicTopMetaText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4, fontStyle: 'italic' },
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
  translit:    { fontSize: 13, fontStyle: 'italic', color: Colors.textSecondary, lineHeight: 21 },
  translation: { fontSize: 14, color: Colors.textPrimary, lineHeight: 22 },

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
  groupCount: { fontSize: 11, fontWeight: '500', color: Colors.textSubtle, marginTop: 1 },
  groupItems: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },

  // Footer tip
  tip: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginTop: 4,
  },
  tipText: { flex: 1, fontSize: 11, lineHeight: 16, color: Colors.textSubtle },
});
