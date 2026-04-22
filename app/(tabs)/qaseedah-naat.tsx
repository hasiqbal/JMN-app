import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { NIGHT_PALETTE } from '@/constants/nightPalette';
import { useNightMode } from '@/hooks/useNightMode';
import { AdhkarRow, fetchQaseedahNaatEntries, resolveAdhkarUrduTranslation } from '@/services/contentService';

type FilterMode = 'all' | 'qaseedah' | 'naat';

function sortRows(rows: AdhkarRow[]): AdhkarRow[] {
  return [...rows].sort((a, b) => {
    const keyA = (a.title?.trim() || a.arabic_title?.trim() || '').toLocaleLowerCase();
    const keyB = (b.title?.trim() || b.arabic_title?.trim() || '').toLocaleLowerCase();
    const titleSort = keyA.localeCompare(keyB, undefined, { sensitivity: 'base' });
    if (titleSort !== 0) return titleSort;
    return (a.content_type ?? '').localeCompare(b.content_type ?? '');
  });
}

function entryTypeLabel(value: string | null | undefined): string {
  if (value === 'qaseedah') return 'Qaseedah';
  if (value === 'naat') return 'Naat';
  return 'Reading';
}

function isPdf(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.pdf([?#].*)?$/i.test(url);
}

export default function QaseedahNaatScreen() {
  const router = useRouter();
  const { nightMode } = useNightMode();
  const N = nightMode ? NIGHT_PALETTE : null;

  const [rows, setRows] = React.useState<AdhkarRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filterMode, setFilterMode] = React.useState<FilterMode>('all');
  const [expandedById, setExpandedById] = React.useState<Record<string, boolean>>({});

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

  const openAttachment = React.useCallback((url: string, title: string) => {
    router.push({
      pathname: '/(tabs)/qaseedah-viewer',
      params: { url, title },
    });
  }, [router]);

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
              <Text style={[styles.headerTitle, N && { color: N.text }]}>Qaseedahs & Naats</Text>
              <Text style={[styles.headerSubtitle, N && { color: N.textMuted }]}>Read content published from the portal, including Arabic, English, Urdu, and PDF attachments.</Text>
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

          <View style={styles.countRow}>
            <View style={[styles.countChip, N && { backgroundColor: N.surface }]}> 
              <Text style={[styles.countChipText, N && { color: N.textSub }]}>All: {rows.length}</Text>
            </View>
            <View style={[styles.countChip, N && { backgroundColor: N.surface }]}> 
              <Text style={[styles.countChipText, { color: '#0F766E' }]}>Qaseedah: {qaseedahCount}</Text>
            </View>
            <View style={[styles.countChip, N && { backgroundColor: N.surface }]}> 
              <Text style={[styles.countChipText, { color: '#0369A1' }]}>Naat: {naatCount}</Text>
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
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={N ? N.accent : Colors.primary} />
            <Text style={[styles.loadingText, N && { color: N.textMuted }]}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={[styles.messageCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
            <Text style={[styles.messageText, N && { color: N.textMuted }]}>{error}</Text>
          </View>
        ) : filteredRows.length === 0 ? (
          <View style={[styles.messageCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
            <Text style={[styles.messageText, N && { color: N.textMuted }]}>No entries found for this filter.</Text>
          </View>
        ) : (
          filteredRows.map((row) => {
            const isExpanded = !!expandedById[row.id];
            const urdu = resolveAdhkarUrduTranslation(row);
            const typeLabel = entryTypeLabel(row.content_type);
            const pdfAttachment = isPdf(row.file_url);

            return (
              <View key={row.id} style={[styles.entryCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
                <TouchableOpacity
                  onPress={() => setExpandedById((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
                  activeOpacity={0.88}
                  style={styles.entryHeader}
                >
                  <View style={styles.entryTitleWrap}>
                    <View style={styles.entryTitleTopRow}>
                      <Text style={[styles.entryTitle, N && { color: N.text }]}>{row.title}</Text>
                      <View style={[styles.typeBadge, row.content_type === 'naat' ? styles.typeBadgeNaat : styles.typeBadgeQaseedah]}>
                        <Text style={styles.typeBadgeText}>{typeLabel}</Text>
                      </View>
                    </View>
                    {row.arabic_title ? (
                      <Text style={[styles.entryArabicTitle, N && { color: N.textSub }]}>{row.arabic_title}</Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      {row.group_name ? <Text style={[styles.metaText, N && { color: N.textMuted }]}>Group: {row.group_name}</Text> : null}
                      {row.reference ? <Text style={[styles.metaText, N && { color: N.textMuted }]}>Ref: {row.reference}</Text> : null}
                    </View>
                  </View>
                  <MaterialIcons
                    name={isExpanded ? 'expand-less' : 'expand-more'}
                    size={22}
                    color={N ? N.textMuted : Colors.textSubtle}
                  />
                </TouchableOpacity>

                {isExpanded ? (
                  <View style={styles.entryBody}>
                    {row.arabic ? (
                      <View style={[styles.contentBox, N && { backgroundColor: N.surface }]}> 
                        <Text style={[styles.contentLabel, N && { color: N.textMuted }]}>Arabic</Text>
                        <Text style={[styles.arabicText, N && { color: N.text }]}>{row.arabic}</Text>
                      </View>
                    ) : null}

                    {row.transliteration ? (
                      <View style={[styles.contentBox, N && { backgroundColor: N.surface }]}> 
                        <Text style={[styles.contentLabel, N && { color: N.textMuted }]}>Transliteration</Text>
                        <Text style={[styles.contentText, styles.translitText, N && { color: N.textSub }]}>{row.transliteration}</Text>
                      </View>
                    ) : null}

                    {row.translation ? (
                      <View style={[styles.contentBox, N && { backgroundColor: N.surface }]}> 
                        <Text style={[styles.contentLabel, N && { color: N.textMuted }]}>English</Text>
                        <Text style={[styles.contentText, N && { color: N.textSub }]}>{row.translation}</Text>
                      </View>
                    ) : null}

                    {urdu ? (
                      <View style={[styles.contentBox, N && { backgroundColor: N.surface }]}> 
                        <Text style={[styles.contentLabel, N && { color: N.textMuted }]}>Urdu</Text>
                        <Text style={[styles.urduText, N && { color: N.textSub }]}>{urdu}</Text>
                      </View>
                    ) : null}

                    {row.file_url ? (
                      <View style={[styles.attachmentRow, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
                        <View style={styles.attachmentTextWrap}>
                          <Text style={[styles.attachmentTitle, N && { color: N.text }]}>{pdfAttachment ? 'PDF attachment' : 'Attachment'}</Text>
                          <Text style={[styles.attachmentUrl, N && { color: N.textMuted }]} numberOfLines={2}>{row.file_url}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.openBtn}
                          onPress={() => openAttachment(row.file_url as string, row.title || 'Attachment')}
                          activeOpacity={0.85}
                        >
                          <MaterialIcons name={pdfAttachment ? 'picture-as-pdf' : 'open-in-new'} size={16} color="#FFFFFF" />
                          <Text style={styles.openBtnText}>Open</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
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
    backgroundColor: '#FFFFFF',
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F5F7F5',
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
    borderColor: '#D9E0DA',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#EAF8EF',
    borderColor: '#8ED7AA',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  filterChipTextActive: {
    color: '#12713B',
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
  entryCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    padding: Spacing.md,
  },
  entryTitleWrap: {
    flex: 1,
    gap: 4,
  },
  entryTitleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeQaseedah: {
    backgroundColor: '#DCFCE7',
  },
  typeBadgeNaat: {
    backgroundColor: '#E0F2FE',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  entryArabicTitle: {
    fontSize: 14,
    color: Colors.textSubtle,
    textAlign: 'right',
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textSubtle,
  },
  entryBody: {
    borderTopWidth: 1,
    borderTopColor: '#E5ECE7',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 10,
  },
  contentBox: {
    backgroundColor: '#F8FBF9',
    borderRadius: Radius.md,
    padding: 10,
    gap: 4,
  },
  contentLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Colors.textSubtle,
  },
  arabicText: {
    fontSize: 22,
    lineHeight: 44,
    color: Colors.textPrimary,
    textAlign: 'right',
    fontFamily: 'Scheherazade',
  },
  contentText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  translitText: {
    fontStyle: 'italic',
  },
  urduText: {
    fontSize: 16,
    lineHeight: 34,
    color: Colors.textPrimary,
    textAlign: 'right',
    fontFamily: 'NotoNastaliqUrdu',
  },
  attachmentRow: {
    borderWidth: 1,
    borderColor: '#D9E6DE',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#F8FBF9',
  },
  attachmentTextWrap: {
    flex: 1,
    gap: 2,
  },
  attachmentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  attachmentUrl: {
    fontSize: 11,
    color: Colors.textSubtle,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  openBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
