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
import { NightModeToggle } from '@/components/adhkar/NightModeToggle';
import { AdhkarRow, fetchQaseedahNaatEntries, resolveAdhkarUrduTranslation } from '@/services/contentService';

type FilterMode = 'all' | 'qaseedah' | 'naat';
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
  const { nightMode, toggleManual } = useNightMode();
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
        const description = (lead.group_description ?? lead.description ?? '').trim();
        return {
          key,
          name: lead.group_name || 'General',
          type: lead.content_type,
          description,
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

          <View style={styles.modeRow}>
            <NightModeToggle nightMode={nightMode} onToggle={toggleManual} />
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
        ) : groupedRows.length === 0 ? (
          <View style={[styles.messageCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
            <Text style={[styles.messageText, N && { color: N.textMuted }]}>No entries found for this filter.</Text>
          </View>
        ) : (
          groupedRows.map((section) => (
            <View key={section.key} style={[styles.groupSection, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
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
                  <Text style={[styles.groupTitle, N && { color: N.text }]}>{section.name}</Text>
                  <Text style={[styles.groupMeta, N && { color: N.textMuted }]}>{section.rows.length} entries</Text>
                </View>
                <View style={styles.groupHeaderRight}>
                  <View style={[styles.typeBadge, section.type === 'naat' ? styles.typeBadgeNaat : styles.typeBadgeQaseedah]}>
                    <Text style={styles.typeBadgeText}>{entryTypeLabel(section.type)}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={N ? N.textMuted : Colors.textSubtle} />
                </View>
              </TouchableOpacity>

              {section.description ? (
                <View style={styles.groupDescriptionWrap}>
                  <Text style={[styles.groupDescription, N && { color: N.textSub }]}>{section.description}</Text>
                </View>
              ) : null}

            </View>
          ))
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
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
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
  groupSection: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    padding: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E6ECE7',
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
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  groupMeta: {
    fontSize: 11,
    color: Colors.textSubtle,
  },
  groupDescriptionWrap: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  groupDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSubtle,
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
});
