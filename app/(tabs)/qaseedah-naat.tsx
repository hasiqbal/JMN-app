import React from 'react';
import {
  ActivityIndicator,
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

import { Colors, Radius, Spacing } from '@/constants/theme';
import { NIGHT_PALETTE } from '@/constants/nightPalette';
import { useQaseedahNightMode } from '@/hooks/useQaseedahNightMode';
import { NightModeToggle } from '@/components/adhkar/NightModeToggle';
import { AdhkarRow, fetchQaseedahNaatEntries, resolveAdhkarUrduTranslation } from '@/services/contentService';

type FilterMode = 'all' | 'qaseedah' | 'naat';
type TextScale = 'sm' | 'md' | 'lg';

const TEXT_SCALE_FACTOR: Record<TextScale, number> = {
  sm: 0.9,
  md: 1,
  lg: 1.15,
};

const TEXT_SCALE_LABEL: Record<TextScale, string> = {
  sm: 'A-',
  md: 'A',
  lg: 'A+',
};

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
  const { nightMode, toggleManual } = useQaseedahNightMode();
  const N = nightMode ? NIGHT_PALETTE : null;

  const [rows, setRows] = React.useState<AdhkarRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filterMode, setFilterMode] = React.useState<FilterMode>('all');
  const [textScale, setTextScale] = React.useState<TextScale>('md');
  const [detailsFor, setDetailsFor] = React.useState<null | {
    name: string;
    description: string;
    tafsir: string;
  }>(null);
  const scaleFactor = TEXT_SCALE_FACTOR[textScale];
  const sized = React.useCallback((base: number) => Math.round(base * scaleFactor), [scaleFactor]);

  const loadData = React.useCallback(async (asRefresh = false) => {
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await fetchQaseedahNaatEntries();
      setRows(sortRows(data));
      setError(null);
    } catch {
      setError('Could not load qaseedahs and naats right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadData(false);
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
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 30 + Spacing.lg },
        ]}
      >
        <View style={[styles.headerCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { fontSize: sized(20) }, N && { color: N.text }]}>Qaseedahs & Naats</Text>
              <Text style={[styles.headerSubtitle, { fontSize: sized(12), lineHeight: sized(18) }, N && { color: N.textMuted }]}>Read content published from the portal, including Arabic, English, Urdu, and PDF attachments.</Text>
            </View>
            <TouchableOpacity
              style={[styles.refreshBtn, N && { borderColor: N.border, backgroundColor: N.surface }]}
              onPress={() => { void loadData(true); }}
              disabled={refreshing}
              activeOpacity={0.85}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={N ? N.accent : Colors.primary} />
              ) : (
                <MaterialIcons name="refresh" size={18} color={N ? N.accent : Colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modeRow}>
            <NightModeToggle nightMode={nightMode} onToggle={toggleManual} />
          </View>

          <View style={styles.textSizeRow}>
            <Text style={[styles.textSizeLabel, N && { color: N.textMuted }]}>Text size</Text>
            <View style={styles.textSizeChipWrap}>
              {(['sm', 'md', 'lg'] as const).map((option) => {
                const active = textScale === option;
                return (
                  <TouchableOpacity
                    key={option}
                    activeOpacity={0.85}
                    onPress={() => setTextScale(option)}
                    style={[
                      styles.textSizeChip,
                      active && styles.textSizeChipActive,
                      N && {
                        borderColor: N.border,
                        backgroundColor: active ? N.accent + '26' : N.surface,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.textSizeChipText,
                        active && styles.textSizeChipTextActive,
                        N && !active && { color: N.textSub },
                      ]}
                    >
                      {TEXT_SCALE_LABEL[option]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.countRow}>
            <View style={[styles.countChip, N && { backgroundColor: N.surface }]}> 
              <Text style={[styles.countChipText, N && { color: N.textSub }]}>All: {rows.length}</Text>
            </View>
            <View style={[styles.countChip, N && { backgroundColor: N.surface }]}> 
              <Text style={[styles.countChipText, { color: N ? NIGHT_PALETTE.qaseedahInk : Colors.qaseedahInk }]}>Qaseedah: {qaseedahCount}</Text>
            </View>
            <View style={[styles.countChip, N && { backgroundColor: N.surface }]}> 
              <Text style={[styles.countChipText, { color: N ? NIGHT_PALETTE.naatInk : Colors.naatInk }]}>Naat: {naatCount}</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {([
              { id: 'all', label: 'All' },
              { id: 'qaseedah', label: 'Qaseedah' },
              { id: 'naat', label: 'Naat' },
            ] as const).map((filter) => {
              const active = filterMode === filter.id;
              return (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => setFilterMode(filter.id)}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                    N && { borderColor: N.border, backgroundColor: active ? N.accent + '26' : N.surface },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive, N && !active && { color: N.textSub }]}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
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
            return (
            <View
              key={section.key}
              style={[
                styles.groupSection,
                { borderLeftColor: railColor },
                N && { backgroundColor: N.surfaceAlt, borderColor: N.border, borderLeftColor: railColor },
              ]}
            >
              <TouchableOpacity
                style={[styles.groupHeader, N && { borderColor: N.border }]}
                activeOpacity={0.86}
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
                <View style={styles.groupTitleWrap}>
                  <Text style={[styles.groupTitle, { fontSize: sized(15) }, N && { color: N.text }]}>{section.name}</Text>
                  <Text style={[styles.groupMeta, { fontSize: sized(11) }, N && { color: N.textMuted }]}>{section.rows.length} entries</Text>
                </View>
                <View style={styles.groupHeaderRight}>
                  <View
                    style={[
                      styles.typeBadge,
                      isNaat ? styles.typeBadgeNaat : styles.typeBadgeQaseedah,
                      N && { backgroundColor: isNaat ? N.naatChip : N.qaseedahChip },
                    ]}
                  >
                    <Text
                      style={[
                        isNaat ? styles.typeBadgeTextNaat : styles.typeBadgeTextQaseedah,
                        N && { color: isNaat ? N.naatInk : N.qaseedahInk },
                      ]}
                    >
                      {entryTypeLabel(section.type)}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={N ? N.textMuted : Colors.textSubtle} />
                </View>
              </TouchableOpacity>

              {section.description || section.tafsir ? (
                <View style={styles.groupDetailsWrap}>
                  <TouchableOpacity
                    style={[styles.viewDetailsBtn, N && { backgroundColor: N.goldSoft }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setDetailsFor({
                        name: section.name,
                        description: section.description,
                        tafsir: section.tafsir,
                      });
                    }}
                  >
                    <MaterialIcons name="auto-stories" size={14} color={N ? NIGHT_PALETTE.gold : Colors.gold} />
                    <Text style={[styles.viewDetailsText, { fontSize: sized(12) }, N && { color: NIGHT_PALETTE.goldInk }]}>View details</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

            </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={!!detailsFor}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsFor(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailsFor(null)}>
          <Pressable
            style={[styles.modalCard, N && { backgroundColor: N.surfaceElevated, borderColor: N.border }]}
            onPress={(e) => e.stopPropagation()}
          >
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
                  <Text style={[styles.modalSectionLabel, { fontSize: sized(10) }, N && { color: N.goldInk }]}>Tafsir & Notes</Text>
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
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
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
    padding: Spacing.md,
    gap: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSubtle,
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  textSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  textSizeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  textSizeChipWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  textSizeChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
  },
  textSizeChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primaryLight,
  },
  textSizeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  textSizeChipTextActive: {
    color: Colors.qaseedahInkDark,
  },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.headerBg,
  },
  countChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primaryLight,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  filterChipTextActive: {
    color: Colors.qaseedahInkDark,
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    padding: 8,
    // The type-tinted left rail is applied inline per section for precise
    // token usage (qaseedahChip vs naatChip, with night overrides).
    borderLeftWidth: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  groupTitleWrap: {
    flex: 1,
    gap: 2,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    fontFamily: SERIF_FONT,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  groupMeta: {
    fontSize: 11,
    color: Colors.textSubtle,
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
  groupDetailsWrap: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  viewDetailsBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewDetailsText: {
    fontFamily: SERIF_FONT,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.goldInk,
    letterSpacing: 0.3,
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
