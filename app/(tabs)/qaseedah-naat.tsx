import React from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { NIGHT_PALETTE } from '@/constants/nightPalette';
import { useQaseedahNightMode } from '@/hooks/useQaseedahNightMode';
import { NightModeToggle } from '@/components/adhkar/NightModeToggle';
import { AdhkarRow, fetchQaseedahNaatEntries } from '@/services/contentService';

// Professional serif font for devotional prose. Uses Georgia on iOS/web,
// and Android's bundled "serif" family as a close visual fallback.
const SERIF_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) as string;

// Lightweight rich-text renderer. Supports markdown-ish tokens authored from
// the portal: **bold**, __underline__, and ==highlight==. Tokens may be
// nested in any order. Unknown text falls through as plain text.
type RichSpan = { text: string; bold?: boolean; underline?: boolean; highlight?: boolean };
function parseRichText(input: string): RichSpan[] {
  const spans: RichSpan[] = [];
  const stack: { bold: boolean; underline: boolean; highlight: boolean } = {
    bold: false,
    underline: false,
    highlight: false,
  };
  let buf = '';
  const flush = () => {
    if (!buf) return;
    spans.push({ text: buf, bold: stack.bold, underline: stack.underline, highlight: stack.highlight });
    buf = '';
  };
  let i = 0;
  while (i < input.length) {
    const two = input.slice(i, i + 2);
    if (two === '**') {
      flush();
      stack.bold = !stack.bold;
      i += 2;
      continue;
    }
    if (two === '__') {
      flush();
      stack.underline = !stack.underline;
      i += 2;
      continue;
    }
    if (two === '==') {
      flush();
      stack.highlight = !stack.highlight;
      i += 2;
      continue;
    }
    buf += input[i];
    i += 1;
  }
  flush();
  return spans;
}

function RichText({ value, baseStyle, dark }: { value: string; baseStyle: TextStyle; dark?: boolean }) {
  // Split on blank lines to create paragraphs; preserve internal line breaks.
  const paragraphs = value.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return (
    <View style={{ gap: 10 }}>
      {paragraphs.map((para, idx) => {
        const spans = parseRichText(para);
        return (
          <Text key={idx} style={baseStyle}>
            {spans.map((span, sIdx) => {
              const style: TextStyle = {};
              if (span.bold) style.fontWeight = '700';
              if (span.underline) style.textDecorationLine = 'underline';
              if (span.highlight) {
                style.backgroundColor = dark ? NIGHT_PALETTE.highlight : Colors.highlight;
                style.color = dark ? NIGHT_PALETTE.highlightInk : Colors.highlightInk;
              }
              return (
                <Text key={sIdx} style={style}>
                  {span.text}
                </Text>
              );
            })}
          </Text>
        );
      })}
    </View>
  );
}

type FilterMode = 'all' | 'qaseedah' | 'naat';

const GATES_BG = require('@/assets/images/background/gates.jpg');

function sortRows(rows: AdhkarRow[]): AdhkarRow[] {
  return [...rows].sort((a, b) => {
    const typeSort = (a.content_type ?? '').localeCompare(b.content_type ?? '');
    if (typeSort !== 0) return typeSort;

    const groupSort = (a.group_order ?? 0) - (b.group_order ?? 0);
    if (groupSort !== 0) return groupSort;

    const groupNameSort = (a.group_name ?? '').localeCompare(b.group_name ?? '', undefined, { sensitivity: 'base' });
    if (groupNameSort !== 0) return groupNameSort;

    const orderSort = (a.display_order ?? 0) - (b.display_order ?? 0);
    if (orderSort !== 0) return orderSort;

    const keyA = (a.title?.trim() || a.arabic_title?.trim() || '').toLocaleLowerCase();
    const keyB = (b.title?.trim() || b.arabic_title?.trim() || '').toLocaleLowerCase();
    return keyA.localeCompare(keyB, undefined, { sensitivity: 'base' });
  });
}

function entryTypeLabel(value: string | null | undefined): string {
  if (value === 'qaseedah') return 'Qaseedah';
  if (value === 'naat') return 'Naat';
  return 'Reading';
}

export default function QaseedahNaatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { nightMode, toggleManual } = useQaseedahNightMode();
  const N = nightMode ? NIGHT_PALETTE : null;

  const [rows, setRows] = React.useState<AdhkarRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filterMode, setFilterMode] = React.useState<FilterMode>('all');
  const [detailsFor, setDetailsFor] = React.useState<null | {
    name: string;
    description: string;
    tafsir: string;
  }>(null);
  const sized = React.useCallback((base: number) => base, []);

  const rowsEqual = React.useCallback((a: AdhkarRow[], b: AdhkarRow[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
        return false;
      }
    }
    return true;
  }, []);

  const applyRows = React.useCallback((nextRows: AdhkarRow[]) => {
    const sortedNext = sortRows(nextRows);
    setRows((prev) => (rowsEqual(prev, sortedNext) ? prev : sortedNext));
  }, [rowsEqual]);

  const loadData = React.useCallback(async (asRefresh = false, options?: { silent?: boolean }) => {
    if (asRefresh) {
      setRefreshing(true);
    } else if (!options?.silent) {
      setLoading(true);
    }

    try {
      // Always serve cache first to keep the list stable and responsive.
      const cachedOrLive = await fetchQaseedahNaatEntries();
      applyRows(cachedOrLive);

      if (asRefresh) {
        // On explicit refresh, revalidate in foreground and only apply true diffs.
        const revalidated = await fetchQaseedahNaatEntries({ forceRefresh: true });
        applyRows(revalidated);
      }

      setError(null);
    } catch {
      setError('Could not load qaseedahs and naats right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyRows]);

  useFocusEffect(
    React.useCallback(() => {
      void loadData(false, { silent: true });
    }, [loadData])
  );

  const qaseedahCount = React.useMemo(
    () => rows.filter((row) => row.content_type === 'qaseedah').length,
    [rows]
  );

  const naatCount = React.useMemo(
    () => rows.filter((row) => row.content_type === 'naat').length,
    [rows]
  );

  const filteredRows = React.useMemo(() => {
    if (filterMode === 'all') return rows;
    return rows.filter((row) => row.content_type === filterMode);
  }, [filterMode, rows]);

  const groupedRows = React.useMemo(() => {
    const grouped = new Map<string, AdhkarRow[]>();

    for (const row of filteredRows) {
      const key = `${row.content_type || 'qaseedah'}::${row.group_name || 'General'}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.push(row);
      } else {
        grouped.set(key, [row]);
      }
    }

    return Array.from(grouped.entries())
      .map(([key, sectionRows]) => {
        const lead = sectionRows[0];
        const description = (
          lead.group_description
          ?? sectionRows.find((row) => (row.group_description ?? '').trim())?.group_description
          ?? lead.description
          ?? sectionRows.find((row) => (row.description ?? '').trim())?.description
          ?? ''
        ).trim();
        const tafsir = (
          lead.tafsir
          ?? sectionRows.find((row) => (row.tafsir ?? '').trim())?.tafsir
          ?? ''
        ).trim();
        return {
          key,
          name: lead.group_name || 'General',
          type: lead.content_type,
          description,
          tafsir,
          rows: sectionRows,
        };
      })
      .sort((a, b) => {
        const typeSort = (a.type ?? '').localeCompare(b.type ?? '');
        if (typeSort !== 0) return typeSort;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
  }, [filteredRows]);

  return (
    <View style={[styles.screen, N && { backgroundColor: N.bg }]}> 
      <ImageBackground source={GATES_BG} style={styles.bgWrap} imageStyle={styles.bgImage}>
        <View
          pointerEvents="none"
          style={[
            styles.bgOverlay,
            N && styles.bgOverlayNight,
          ]}
        />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 30 + Spacing.lg },
            { paddingTop: Math.max(Spacing.md, insets.top + 8) },
          ]}
        >
        <View style={[styles.headerCard, styles.headerCardSpiritual, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
          <TouchableOpacity
            style={[styles.refreshBtnFloating, N && { borderColor: N.border, backgroundColor: N.surface }]}
            onPress={() => { void loadData(true); }}
            disabled={refreshing}
            activeOpacity={0.85}
            hitSlop={8}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={N ? N.accent : Colors.primary} />
            ) : (
              <MaterialIcons name="refresh" size={15} color={N ? N.accent : Colors.primary} />
            )}
          </TouchableOpacity>

          <Text style={[styles.heroEyebrow, { fontSize: sized(9) }, N && { color: N.goldInk }]}>Sacred Recitations</Text>

          <View style={styles.titleRow}>
            <Text style={[styles.heroTitleCentered, { fontSize: sized(22) }, N && { color: N.text }]}>Qaseedahs & Naats</Text>
          </View>

          <Text style={[styles.heroVerse, { fontSize: sized(11), lineHeight: sized(16) }, N && { color: N.textMuted }]}>
            “Recite with presence and reflection — in praise, remembrance, and longing.”
          </Text>

          {/* Mid divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, N && { backgroundColor: N.goldHairline }]} />
          </View>

          {/* Single combined filter row with inline counts — quiet hairline + glyph active state */}
          <View style={styles.filterRowCentered}>
            {([
              { id: 'all' as const, label: 'All', count: rows.length, ink: null },
              { id: 'qaseedah' as const, label: 'Qaseedah', count: qaseedahCount, ink: Colors.qaseedahInk, inkNight: NIGHT_PALETTE.qaseedahInk },
              { id: 'naat' as const, label: 'Naat', count: naatCount, ink: Colors.naatInk, inkNight: NIGHT_PALETTE.naatInk },
            ]).map((filter) => {
              const active = filterMode === filter.id;
              const inkColor = filter.ink
                ? (N ? filter.inkNight : filter.ink)
                : (N ? N.textSub : Colors.textSubtle);
              const goldColor = N ? N.gold : Colors.gold;
              return (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => setFilterMode(filter.id)}
                  style={[
                    styles.filterPill,
                    active && styles.filterPillActive,
                    N && { borderColor: active ? N.gold : N.goldHairline },
                  ]}
                  activeOpacity={0.85}
                >
                  {active ? (
                    <Text style={[styles.filterPillGlyph, { color: goldColor }]}>✦</Text>
                  ) : null}
                  <Text style={[styles.filterPillText, { color: inkColor }, active && styles.filterPillTextActive, active && N && { color: N.goldInk }]}>
                    {filter.label}
                  </Text>
                  <Text style={[styles.filterPillCount, { color: goldColor }]}>
                    {' · '}
                  </Text>
                  <Text style={[styles.filterPillCount, { color: inkColor }, active && styles.filterPillTextActive, active && N && { color: N.goldInk }]}>
                    {filter.count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.preferencesRow}>
            <View style={styles.nightToggleCompactWrap}>
              <NightModeToggle nightMode={nightMode} onToggle={toggleManual} size="sm" />
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.skeletonWrap}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.skeletonCard,
                  N && { backgroundColor: N.surfaceAlt, borderColor: N.border },
                ]}
              >
                <View
                  style={[
                    styles.skeletonLineWide,
                    N && { backgroundColor: N.border },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLineNarrow,
                    N && { backgroundColor: N.border },
                  ]}
                />
              </View>
            ))}
          </View>
        ) : error ? (
          <View style={[styles.messageCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
            <Text style={[styles.messageText, N && { color: N.textMuted }]}>{error}</Text>
          </View>
        ) : groupedRows.length === 0 ? (
          <View style={[styles.messageCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
            <Text style={[styles.messageText, N && { color: N.textMuted }]}>No entries found for this filter.</Text>
          </View>
        ) : (
          groupedRows.map((section) => {
            const isNaat = section.type === 'naat';
            const railColor = N
              ? (isNaat ? N.naatInk : N.qaseedahInk)
              : (isNaat ? Colors.naatInk : Colors.qaseedahInk);
            const goldColor = N ? N.gold : Colors.gold;
            const goldInk = N ? N.goldInk : Colors.goldInk;
            return (
            <View
              key={section.key}
              style={[
                styles.groupSection,
                N && styles.groupSectionNight,
              ]}
            >
              {/* Gold-and-type-tinted vertical accent (illuminated edge) */}
              <LinearGradient
                colors={[goldColor, railColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.groupAccent}
              />

              <TouchableOpacity
                style={styles.groupHeader}
                activeOpacity={0.82}
                onPress={() => {
                  router.push({
                    pathname: '/(tabs)/qaseedah-group',
                    params: {
                      group: section.name,
                      type: section.type ?? 'qaseedah',
                    },
                  });
                }}
              >
                <View style={[styles.groupGlyphCircle, N && { borderColor: N.goldHairline, backgroundColor: 'rgba(255,253,247,0.20)' }]}>
                  <Text style={[styles.groupGlyph, { color: goldColor }]}>۞</Text>
                </View>

                <View style={styles.groupTitleWrap}>
                  <View style={styles.groupTitleTopRow}>
                    <Text style={[styles.groupKicker, { color: goldInk }]} numberOfLines={1}>
                      {entryTypeLabel(section.type)}
                    </Text>
                    {section.description ? (
                      <TouchableOpacity
                        style={[
                          styles.descriptionTabBtn,
                          N && { borderColor: N.goldHairline, backgroundColor: 'rgba(230, 194, 112, 0.16)' },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          setDetailsFor({
                            name: section.name,
                            description: section.description,
                            tafsir: section.tafsir,
                          });
                        }}
                      >
                        <MaterialIcons name="menu-book" size={11} color={goldInk} />
                        <Text style={[styles.descriptionTabText, { color: goldInk }]}>
                          {section.tafsir ? 'Description & Notes' : 'Description'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <Text style={[styles.groupTitle, { fontSize: sized(14) }, N && { color: N.text }]} numberOfLines={2}>
                    {section.name}
                  </Text>
                </View>

                <MaterialIcons name="chevron-right" size={18} color={N ? N.textMuted : Colors.textSubtle} />
              </TouchableOpacity>

            </View>
            );
          })
        )}
        </ScrollView>
      </ImageBackground>

      <Modal
        visible={!!detailsFor}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsFor(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropDismissArea} onPress={() => setDetailsFor(null)} />
          <View style={[styles.modalCard, N && { backgroundColor: N.surfaceElevated, borderColor: N.border }]}> 
            <View style={styles.modalHeader}>
              <Text style={[styles.modalOrnament, N && { color: N.gold }]}>۞</Text>
              <Text style={[styles.modalTitle, { fontSize: sized(19) }, N && { color: N.text }]} numberOfLines={2}>
                {detailsFor?.name ?? ''}
              </Text>
              <Text style={[styles.modalOrnament, N && { color: N.gold }]}>۞</Text>
            </View>
            <View style={[styles.modalDivider, N && { backgroundColor: N.goldHairline }]} />

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {detailsFor?.description ? (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionLabel, { fontSize: sized(10) }, N && { color: N.goldInk }]}>Description</Text>
                  <RichText
                    value={detailsFor.description}
                    dark={!!N}
                    baseStyle={{
                      ...styles.modalBody,
                      fontSize: sized(15),
                      lineHeight: sized(24),
                      color: N ? N.text : Colors.textPrimary,
                    }}
                  />
                </View>
              ) : null}

              {detailsFor?.description && detailsFor?.tafsir ? (
                <View style={styles.modalSectionSeparator}>
                  <Text style={[styles.modalSeparatorOrnament, N && { color: N.gold }]}>﹏ ۞ ﹏</Text>
                </View>
              ) : null}

              {detailsFor?.tafsir ? (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionLabel, { fontSize: sized(10) }, N && { color: N.goldInk }]}>Notes</Text>
                  <RichText
                    value={detailsFor.tafsir}
                    dark={!!N}
                    baseStyle={{
                      ...styles.modalBody,
                      fontSize: sized(15),
                      lineHeight: sized(24),
                      color: N ? N.text : Colors.textPrimary,
                    }}
                  />
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.modalDivider, N && { backgroundColor: N.goldHairline }]} />
            <TouchableOpacity
              style={[styles.modalCloseBtn, N && { backgroundColor: N.goldSoft, borderColor: N.goldHairline }]}
              activeOpacity={0.85}
              onPress={() => setDetailsFor(null)}
            >
              <Text style={[styles.modalCloseText, { fontSize: sized(13) }, N && { color: N.goldInk }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgWrap: {
    flex: 1,
  },
  bgImage: {
    opacity: 0.58,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 24, 20, 0.46)',
  },
  bgOverlayNight: {
    backgroundColor: 'rgba(4, 10, 18, 0.84)',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  headerCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
    position: 'relative',
  },
  headerCardSpiritual: {
    backgroundColor: 'rgba(252, 249, 240, 0.96)',
    borderColor: 'rgba(150, 108, 24, 0.42)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 3,
  },
  refreshBtnFloating: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.goldHairline,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 253, 247, 0.95)',
    zIndex: 2,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    marginBottom: 2,
  },
  ornamentLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.goldHairline,
  },
  ornamentGlyph: {
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2.4,
    color: Colors.goldInk,
    textAlign: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginTop: 1,
  },
  heroTitleCentered: {
    fontFamily: SERIF_FONT,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  heroVerse: {
    fontFamily: SERIF_FONT,
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  dividerRow: {
    paddingHorizontal: 44,
    marginTop: 4,
    marginBottom: 4,
  },
  dividerLine: {
    height: 1,
    backgroundColor: Colors.goldHairline,
    opacity: 0.65,
  },
  filterRowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.40)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: 'transparent',
  },
  filterPillActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(255, 253, 247, 0.92)',
  },
  filterPillGlyph: {
    fontSize: 8,
    color: Colors.gold,
    marginRight: 4,
    letterSpacing: 0.5,
  },
  filterPillText: {
    fontFamily: SERIF_FONT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  filterPillTextActive: {
    color: Colors.goldInk,
  },
  filterPillCount: {
    fontFamily: SERIF_FONT,
    fontSize: 10,
    fontWeight: '700',
  },
  preferencesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 4,
  },
  nightToggleCompactWrap: {
    marginRight: 2,
  },
  countChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: Colors.headerBg,
  },
  countChipSpiritual: {
    borderWidth: 1,
    borderColor: Colors.goldHairline,
    backgroundColor: 'rgba(255, 248, 226, 0.92)',
  },
  countChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
  },
  filterChipSpiritual: {
    borderColor: Colors.goldHairline,
    backgroundColor: 'rgba(250, 245, 230, 0.96)',
  },
  filterChipActive: {
    backgroundColor: Colors.goldSoft,
    borderColor: Colors.gold,
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  filterChipTextActive: {
    color: Colors.goldInk,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSubtle,
  },
  skeletonWrap: {
    gap: Spacing.md,
  },
  skeletonCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    opacity: 0.65,
    gap: 10,
  },
  skeletonLineWide: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
    width: '55%',
  },
  skeletonLineNarrow: {
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.border,
    width: '30%',
    opacity: 0.7,
  },
  messageCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
  },
  messageText: {
    fontSize: 13,
    color: Colors.textSubtle,
  },
  groupSection: {
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(146, 102, 24, 0.50)',
    borderRadius: Radius.md,
    backgroundColor: 'rgba(252, 249, 240, 0.94)',
    overflow: 'hidden',
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 2,
  },
  groupSectionNight: {
    backgroundColor: 'rgba(8, 13, 22, 0.46)',
    borderColor: 'rgba(170, 140, 82, 0.40)',
  },
  groupAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  groupGlyphCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    backgroundColor: 'rgba(255, 253, 247, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupGlyph: {
    fontSize: 10,
    color: Colors.gold,
    lineHeight: 11,
  },
  groupTitleWrap: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  groupTitleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  groupKicker: {
    fontFamily: SERIF_FONT,
    fontSize: 8,
    fontWeight: '700',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    color: Colors.goldInk,
    flexShrink: 1,
  },
  descriptionTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.goldHairline,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(184, 134, 11, 0.08)',
  },
  descriptionTabText: {
    fontFamily: SERIF_FONT,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  groupTitle: {
    fontFamily: SERIF_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
    lineHeight: 18,
    flexShrink: 1,
  },
  groupDescriptionWrap: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
  },
  groupDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSubtle,
  },
  detailBlock: {
    gap: 3,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Colors.textSubtle,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 23, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  modalBackdropDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '82%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.goldHairline,
    paddingTop: Spacing.md,
    paddingBottom: 10,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  modalOrnament: {
    fontSize: 16,
    color: Colors.gold,
  },
  modalTitle: {
    flexShrink: 1,
    fontFamily: SERIF_FONT,
    fontSize: 19,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: Colors.goldHairline,
    marginVertical: 6,
  },
  modalScroll: {
    maxHeight: 460,
  },
  modalScrollContent: {
    paddingVertical: 8,
    gap: 14,
  },
  modalSection: {
    gap: 6,
  },
  modalSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    color: Colors.goldInk,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: SERIF_FONT,
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textPrimary,
    textAlign: 'left',
  },
  modalSectionSeparator: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  modalSeparatorOrnament: {
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 4,
  },
  modalCloseBtn: {
    marginTop: 6,
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.goldHairline,
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: 22,
    paddingVertical: 8,
  },
  modalCloseText: {
    fontFamily: SERIF_FONT,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.goldInk,
    letterSpacing: 0.5,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeQaseedah: {
    backgroundColor: Colors.qaseedahChip,
  },
  typeBadgeNaat: {
    backgroundColor: Colors.naatChip,
  },
  typeBadgeTextQaseedah: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.qaseedahInk,
    letterSpacing: 0.4,
  },
  typeBadgeTextNaat: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.naatInk,
    letterSpacing: 0.4,
  },
});
