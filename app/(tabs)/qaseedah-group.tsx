import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { NIGHT_PALETTE } from '@/constants/nightPalette';
import { useNightMode } from '@/hooks/useNightMode';
import { NightModeToggle } from '@/components/adhkar/NightModeToggle';
import { AdhkarRow, fetchQaseedahNaatEntries, translateTextToEnglish, translateTextToUrdu } from '@/services/contentService';

type GroupChapterItem = {
  id: string;
  chapter: string;
  entryTitle: string;
  lines: {
    heading: string;
    arabic: string;
    transliteration?: string;
    translation?: string;
    urdu_translation?: string;
  }[];
};

function extractChapterItems(rows: AdhkarRow[]): GroupChapterItem[] {
  const items: GroupChapterItem[] = [];

  rows.forEach((row) => {
    if (Array.isArray(row.sections) && row.sections.length > 0) {
      const chapterMap = new Map<string, GroupChapterItem['lines']>();

      row.sections.forEach((section, index) => {
        if (!section || typeof section !== 'object') return;

        const arabic = typeof section.arabic === 'string' ? section.arabic.trim() : '';
        if (!arabic) return;

        const chapter = typeof section.chapter === 'string' && section.chapter.trim().length > 0
          ? section.chapter.trim()
          : 'Chapter 1';

        const heading = typeof section.heading === 'string' && section.heading.trim().length > 0
          ? section.heading.trim()
          : `${chapter} · Line ${index + 1}`;

        const line = {
          heading,
          arabic,
          transliteration: typeof section.transliteration === 'string' ? section.transliteration : undefined,
          translation: typeof section.translation === 'string' ? section.translation : undefined,
          urdu_translation: typeof section.urdu_translation === 'string' ? section.urdu_translation : undefined,
        };

        const list = chapterMap.get(chapter);
        if (list) {
          list.push(line);
        } else {
          chapterMap.set(chapter, [line]);
        }
      });

      Array.from(chapterMap.entries()).forEach(([chapter, lines], chapterIndex) => {
        items.push({
          id: `${row.id}-${chapterIndex}-${chapter}`,
          chapter,
          entryTitle: row.title || 'Untitled',
          lines,
        });
      });

      return;
    }

    const fallbackArabic = (row.arabic || '').trim();
    if (!fallbackArabic) return;

    items.push({
      id: `${row.id}-full`,
      chapter: 'Full Text',
      entryTitle: row.title || 'Untitled',
      lines: [{
        heading: 'Full Text',
        arabic: fallbackArabic,
        transliteration: row.transliteration ?? undefined,
        translation: row.translation ?? undefined,
        urdu_translation: row.urdu_translation ?? undefined,
      }],
    });
  });

  return items.sort((a, b) => a.chapter.localeCompare(b.chapter, undefined, { sensitivity: 'base' }));
}

export default function QaseedahGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ group?: string; type?: string }>();
  const groupName = typeof params.group === 'string' ? params.group : 'Group';
  const type = typeof params.type === 'string' ? params.type : 'qaseedah';

  const { nightMode, toggleManual } = useNightMode();
  const N = nightMode ? NIGHT_PALETTE : null;

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [chapters, setChapters] = React.useState<GroupChapterItem[]>([]);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [showArabic, setShowArabic] = React.useState(true);
  const [showTransliteration, setShowTransliteration] = React.useState(true);
  const [showEnglish, setShowEnglish] = React.useState(true);
  const [showUrdu, setShowUrdu] = React.useState(true);
  const [textScale, setTextScale] = React.useState(1);
  const [autoTranslatedByLine, setAutoTranslatedByLine] = React.useState<Record<string, { english?: string; urdu?: string }>>({});

  const load = React.useCallback(async (asRefresh = false) => {
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const rows = await fetchQaseedahNaatEntries();
      const filtered = rows.filter((row) => (
        (row.group_name || 'General') === groupName
        && (row.content_type || 'qaseedah') === type
      ));
      setChapters(extractChapterItems(filtered));
      setError(null);
    } catch {
      setError('Could not load chapters for this group.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupName, type]);

  useFocusEffect(
    React.useCallback(() => {
      void load(false);
    }, [load])
  );

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const nextMap: Record<string, { english?: string; urdu?: string }> = {};

      for (const chapter of chapters) {
        for (let idx = 0; idx < chapter.lines.length; idx += 1) {
          const line = chapter.lines[idx];
          const key = `${chapter.id}-${idx}`;

          const hasEnglish = !!line.translation?.trim();
          const hasUrdu = !!line.urdu_translation?.trim();

          let english = '';
          let urdu = '';

          if (!hasEnglish) {
            const source = line.arabic?.trim() || line.transliteration?.trim() || '';
            if (source) {
              english = await translateTextToEnglish(source);
            }
          }

          if (!hasUrdu) {
            const sourceForUrdu = line.translation?.trim() || english;
            if (sourceForUrdu) {
              urdu = await translateTextToUrdu(sourceForUrdu);
            }
          }

          if (english || urdu) {
            nextMap[key] = {
              english: english || undefined,
              urdu: urdu || undefined,
            };
          }
        }
      }

      if (!cancelled) {
        setAutoTranslatedByLine(nextMap);
      }
    };

    if (chapters.length > 0) {
      void run();
    } else {
      setAutoTranslatedByLine({});
    }

    return () => {
      cancelled = true;
    };
  }, [chapters]);

  return (
    <View style={[styles.screen, N && { backgroundColor: N.bg }]}> 
      <View style={[styles.topBar, N && { borderColor: N.border, backgroundColor: N.surfaceAlt }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.86}>
          <MaterialIcons name="arrow-back" size={22} color={N ? N.text : Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.topTitleWrap}>
          <Text style={[styles.topTitle, N && { color: N.text }]} numberOfLines={1}>{groupName}</Text>
          <Text style={[styles.topMeta, N && { color: N.textMuted }]}>{type === 'naat' ? 'Naat' : 'Qaseedah'} · {chapters.length} chapters</Text>
        </View>
        <TouchableOpacity
          onPress={() => { void load(true); }}
          style={[styles.refreshBtn, N && { borderColor: N.border, backgroundColor: N.surface }]}
          activeOpacity={0.86}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={N ? N.accent : Colors.primary} />
          ) : (
            <MaterialIcons name="refresh" size={18} color={N ? N.accent : Colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.modeRow, N && { borderColor: N.border, backgroundColor: N.surfaceAlt }]}> 
        <NightModeToggle nightMode={nightMode} onToggle={toggleManual} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.readerControls, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
          <Text style={[styles.controlLabel, N && { color: N.textMuted }]}>Show</Text>
          <View style={styles.toggleRow}>
            {[
              { key: 'ar', label: 'Arabic', value: showArabic, setValue: setShowArabic },
              { key: 'tr', label: 'Translit', value: showTransliteration, setValue: setShowTransliteration },
              { key: 'en', label: 'English', value: showEnglish, setValue: setShowEnglish },
              { key: 'ur', label: 'Urdu', value: showUrdu, setValue: setShowUrdu },
            ].map((item) => (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.85}
                onPress={() => item.setValue(!item.value)}
                style={[
                  styles.toggleChip,
                  item.value && styles.toggleChipActive,
                  N && {
                    borderColor: N.border,
                    backgroundColor: item.value ? `${N.accent}24` : N.surface,
                  },
                ]}
              >
                <Text style={[styles.toggleChipText, item.value && styles.toggleChipTextActive, N && !item.value && { color: N.textSub }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.scaleRow}>
            <Text style={[styles.controlLabel, N && { color: N.textMuted }]}>Text Size</Text>
            <View style={styles.scaleActions}>
              <TouchableOpacity
                style={[styles.scaleButton, N && { borderColor: N.border, backgroundColor: N.surface }]}
                onPress={() => setTextScale((prev) => Math.max(0.8, Number((prev - 0.1).toFixed(2))))}
                activeOpacity={0.85}
              >
                <MaterialIcons name="remove" size={18} color={N ? N.text : Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.scaleValue, N && { color: N.text }]}>{Math.round(textScale * 100)}%</Text>
              <TouchableOpacity
                style={[styles.scaleButton, N && { borderColor: N.border, backgroundColor: N.surface }]}
                onPress={() => setTextScale((prev) => Math.min(1.8, Number((prev + 0.1).toFixed(2))))}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add" size={18} color={N ? N.text : Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={N ? N.accent : Colors.primary} />
            <Text style={[styles.loadingText, N && { color: N.textMuted }]}>Loading chapters...</Text>
          </View>
        ) : error ? (
          <View style={[styles.messageCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
            <Text style={[styles.messageText, N && { color: N.textMuted }]}>{error}</Text>
          </View>
        ) : chapters.length === 0 ? (
          <View style={[styles.messageCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
            <Text style={[styles.messageText, N && { color: N.textMuted }]}>No chapters found for this group.</Text>
          </View>
        ) : (
          chapters.map((chapter) => {
            const isOpen = !!expanded[chapter.id];
            return (
              <View key={chapter.id} style={[styles.chapterCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
                <TouchableOpacity
                  style={styles.chapterHeader}
                  activeOpacity={0.88}
                  onPress={() => setExpanded((prev) => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
                >
                  <View style={styles.chapterTitleWrap}>
                    <Text style={[styles.chapterTitle, N && { color: N.text }]}>{chapter.chapter}</Text>
                    <Text style={[styles.chapterMeta, N && { color: N.textMuted }]}>{chapter.entryTitle} · {chapter.lines.length} lines</Text>
                  </View>
                  <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={22} color={N ? N.textMuted : Colors.textSubtle} />
                </TouchableOpacity>

                {isOpen ? (
                  <View style={styles.chapterBody}>
                    {chapter.lines.map((line, idx) => (
                      <View key={`${chapter.id}-${idx}`} style={[styles.lineCard, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
                        {(() => {
                          const lineKey = `${chapter.id}-${idx}`;
                          const autoData = autoTranslatedByLine[lineKey];
                          const effectiveEnglish = line.translation?.trim() || autoData?.english || '';
                          const effectiveUrdu = line.urdu_translation?.trim() || autoData?.urdu || '';

                          return (
                            <>
                        <Text style={[styles.lineHeading, N && { color: N.textMuted }]}>{line.heading}</Text>
                        {showArabic ? (
                          <Text
                            style={[
                              styles.arabicText,
                              { fontSize: Math.round(22 * textScale), lineHeight: Math.round(40 * textScale) },
                              N && { color: N.text },
                            ]}
                          >
                            {line.arabic}
                          </Text>
                        ) : null}
                        {showTransliteration && line.transliteration ? (
                          <Text
                            style={[
                              styles.lineText,
                              styles.italic,
                              { fontSize: Math.round(14 * textScale), lineHeight: Math.round(21 * textScale) },
                              N && { color: N.textSub },
                            ]}
                          >
                            {line.transliteration}
                          </Text>
                        ) : null}
                        {showEnglish && effectiveEnglish ? (
                          <Text
                            style={[
                              styles.lineText,
                              { fontSize: Math.round(14 * textScale), lineHeight: Math.round(21 * textScale) },
                              N && { color: N.textSub },
                            ]}
                          >
                            {effectiveEnglish}
                          </Text>
                        ) : null}
                        {showUrdu && effectiveUrdu ? (
                          <Text
                            style={[
                              styles.urduText,
                              { fontSize: Math.round(16 * textScale), lineHeight: Math.round(30 * textScale) },
                              N && { color: N.textSub },
                            ]}
                          >
                            {effectiveUrdu}
                          </Text>
                        ) : null}
                        {(!line.translation?.trim() || !line.urdu_translation?.trim()) && (effectiveEnglish || effectiveUrdu) ? (
                          <Text style={[styles.autoTranslatedHint, N && { color: N.textMuted }]}>Auto-translated fallback</Text>
                        ) : null}
                        {!showArabic && !showTransliteration && !showEnglish && !showUrdu ? (
                          <Text style={[styles.hiddenHint, N && { color: N.textMuted }]}>All languages are hidden. Turn on at least one.</Text>
                        ) : null}
                            </>
                          );
                        })()}
                      </View>
                    ))}
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
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingTop: 12,
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitleWrap: {
    flex: 1,
    gap: 2,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  topMeta: {
    fontSize: 12,
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
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  modeRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingBottom: 8,
  },
  readerControls: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    gap: 10,
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleChip: {
    borderWidth: 1,
    borderColor: '#D9E0DA',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  toggleChipActive: {
    backgroundColor: '#EAF8EF',
    borderColor: '#8ED7AA',
  },
  toggleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  toggleChipTextActive: {
    color: '#12713B',
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  scaleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scaleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleValue: {
    minWidth: 44,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  loadingWrap: {
    paddingVertical: 20,
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
  chapterCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 10,
  },
  chapterTitleWrap: {
    flex: 1,
    gap: 3,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  chapterMeta: {
    fontSize: 11,
    color: Colors.textSubtle,
  },
  chapterBody: {
    borderTopWidth: 1,
    borderTopColor: '#E5ECE7',
    padding: Spacing.sm,
    gap: 8,
  },
  lineCard: {
    borderWidth: 1,
    borderColor: '#DDE7DF',
    borderRadius: Radius.md,
    backgroundColor: '#F8FBF9',
    padding: 10,
    gap: 4,
  },
  lineHeading: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  arabicText: {
    fontSize: 22,
    lineHeight: 40,
    color: Colors.textPrimary,
    textAlign: 'right',
    fontFamily: 'IndopakNastaleeq',
  },
  lineText: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  italic: {
    fontStyle: 'italic',
  },
  urduText: {
    fontSize: 16,
    lineHeight: 30,
    color: Colors.textPrimary,
    textAlign: 'right',
    fontFamily: 'NotoNastaliqUrdu',
  },
  hiddenHint: {
    fontSize: 12,
    color: Colors.textSubtle,
    fontStyle: 'italic',
  },
  autoTranslatedHint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});
