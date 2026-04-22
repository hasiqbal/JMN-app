import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { NIGHT_PALETTE } from '@/constants/nightPalette';
import { useNightMode } from '@/hooks/useNightMode';
import {
  ChapterIntro,
  QaseedahHeader,
  ReadingPreferencesBar,
  VerseBlock,
  VerseDivider,
  type LayerVisibility,
  type ReadingMode,
  type VerseRole,
} from '@/components/qaseedah';
import { AdhkarRow, fetchQaseedahNaatEntries, translateTextToArabic, translateTextToEnglish, translateTextToUrdu } from '@/services/contentService';

type GroupChapterItem = {
  id: string;
  chapter: string;
  chapterArabic?: string;
  chapterUrdu?: string;
  entryTitle: string;
  lines: {
    heading: string;
    arabic: string;
    transliteration?: string;
    translation?: string;
    urdu_translation?: string;
  }[];
};

const CHORUS_MARKER = '__chorus__';

type ChorusLine = {
  heading: string;
  arabic: string;
  transliteration?: string;
  translation?: string;
  urdu_translation?: string;
};

function chapterOrderValue(chapter: string): number {
  const normalized = chapter.trim().toLowerCase();
  const numberMatch = normalized.match(/chapter\s+(\d+)/i);
  if (numberMatch) return Number(numberMatch[1]);

  const wordMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };

  const wordMatch = normalized.match(/chapter\s+([a-z]+)/i);
  if (wordMatch && wordMap[wordMatch[1]]) return wordMap[wordMatch[1]];

  return Number.MAX_SAFE_INTEGER;
}

function transliterateArabicToLatin(text: string): string {
  const map: Record<string, string> = {
    ا: 'a', أ: 'a', إ: 'i', آ: 'aa', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
    د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z',
    ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w',
    ي: 'y', ى: 'a', ة: 'h', ء: '\'', ئ: 'y', ؤ: 'w', ' ': ' ', '\n': '\n',
  };

  return text
    .split('')
    .map((ch) => map[ch] ?? '')
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractChapterItems(rows: AdhkarRow[]): GroupChapterItem[] {
  const items: GroupChapterItem[] = [];

  rows.forEach((row) => {
    if (Array.isArray(row.sections) && row.sections.length > 0) {
      // First pass: find the chorus marker, if any.
      let chorus: ChorusLine | null = null;
      for (const section of row.sections) {
        if (!section || typeof section !== 'object') continue;
        const chapterStr = typeof section.chapter === 'string' ? section.chapter.trim() : '';
        if (chapterStr !== CHORUS_MARKER) continue;
        const chorusArabic = typeof section.arabic === 'string' ? section.arabic.trim() : '';
        if (!chorusArabic) continue;
        chorus = {
          heading: 'Chorus',
          arabic: chorusArabic,
          transliteration: typeof section.transliteration === 'string' ? section.transliteration : undefined,
          translation: typeof section.translation === 'string' ? section.translation : undefined,
          urdu_translation: typeof section.urdu_translation === 'string' ? section.urdu_translation : undefined,
        };
        break;
      }

      const chapterMap = new Map<string, GroupChapterItem['lines']>();
      const chapterArabicTitle = new Map<string, string>();
      const chapterUrduTitle = new Map<string, string>();

      row.sections.forEach((section, index) => {
        if (!section || typeof section !== 'object') return;

        const chapterStr = typeof section.chapter === 'string' ? section.chapter.trim() : '';
        if (chapterStr === CHORUS_MARKER) return;

        const arabic = typeof section.arabic === 'string' ? section.arabic.trim() : '';
        if (!arabic) return;

        const chapter = chapterStr.length > 0 ? chapterStr : 'Chapter 1';

        const arabicTitleOverride = typeof section.chapter_arabic === 'string' ? section.chapter_arabic.trim() : '';
        const urduTitleOverride = typeof section.chapter_urdu === 'string' ? section.chapter_urdu.trim() : '';
        if (arabicTitleOverride && !chapterArabicTitle.has(chapter)) {
          chapterArabicTitle.set(chapter, arabicTitleOverride);
        }
        if (urduTitleOverride && !chapterUrduTitle.has(chapter)) {
          chapterUrduTitle.set(chapter, urduTitleOverride);
        }

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
        const withChorus = chorus && chapter.toLowerCase().startsWith('chapter ')
          ? [
            { ...chorus, heading: `${chapter} · Chorus (Opening)` },
            ...lines,
            { ...chorus, heading: `${chapter} · Chorus (Closing)` },
          ]
          : lines;

        items.push({
          id: `${row.id}-${chapterIndex}-${chapter}`,
          chapter,
          chapterArabic: chapterArabicTitle.get(chapter) || undefined,
          chapterUrdu: chapterUrduTitle.get(chapter) || undefined,
          entryTitle: row.title || 'Untitled',
          lines: withChorus,
        });
      });

      return;
    }

    // Fallback: no sections. Split the entry by newlines into per-verse lines
    // and treat the row as its own chapter (matches Burdah formatting).
    const fallbackArabic = (row.arabic || '').trim();
    if (!fallbackArabic) return;

    const arabicLines = fallbackArabic.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
    const translitLines = (row.transliteration || '').split(/\r?\n+/).map((s) => s.trim());
    const englishLines = (row.translation || '').split(/\r?\n+/).map((s) => s.trim());
    const urduLines = (row.urdu_translation || row.translation_urdu || '').split(/\r?\n+/).map((s) => s.trim());

    const chapterLabel = row.title || 'Chapter';

    const lines = arabicLines.map((arabic, idx) => ({
      heading: `${chapterLabel} · Verse ${idx + 1}`,
      arabic,
      transliteration: translitLines[idx] || undefined,
      translation: englishLines[idx] || undefined,
      urdu_translation: urduLines[idx] || undefined,
    }));

    items.push({
      id: `${row.id}-entry`,
      chapter: chapterLabel,
      entryTitle: row.title || 'Untitled',
      lines,
    });
  });

  return items
    .map((item, originalIndex) => ({ item, originalIndex }))
    .sort((a, b) => {
      const aOrder = chapterOrderValue(a.item.chapter);
      const bOrder = chapterOrderValue(b.item.chapter);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.originalIndex - b.originalIndex;
    })
    .map((entry) => entry.item);
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
  const [readingMode, setReadingMode] = React.useState<ReadingMode>('full');
  const [layers, setLayers] = React.useState<LayerVisibility>({ arabic: true, transliteration: true, english: true, urdu: true });
  const [textScale, setTextScale] = React.useState(1);
  const [autoTranslatedByLine, setAutoTranslatedByLine] = React.useState<Record<string, { transliteration?: string; english?: string; urdu?: string }>>({});
  const [chapterTitleUrdu, setChapterTitleUrdu] = React.useState<Record<string, string>>({});
  const [chapterTitleArabic, setChapterTitleArabic] = React.useState<Record<string, string>>({});

  const handleModeChange = React.useCallback((next: ReadingMode) => {
    setReadingMode(next);
    if (next === 'arabic') setLayers({ arabic: true, transliteration: false, english: false, urdu: false });
    else if (next === 'translit') setLayers({ arabic: true, transliteration: true, english: false, urdu: false });
    else if (next === 'translation') setLayers({ arabic: true, transliteration: false, english: true, urdu: false });
    else if (next === 'urdu') setLayers({ arabic: true, transliteration: false, english: false, urdu: true });
    else if (next === 'full') setLayers({ arabic: true, transliteration: true, english: true, urdu: true });
  }, []);

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
      const nextMap: Record<string, { transliteration?: string; english?: string; urdu?: string }> = {};

      for (const chapter of chapters) {
        for (let idx = 0; idx < chapter.lines.length; idx += 1) {
          const line = chapter.lines[idx];
          const key = `${chapter.id}-${idx}`;

          const hasEnglish = !!line.translation?.trim();
          const hasUrdu = !!line.urdu_translation?.trim();
          const hasTranslit = !!line.transliteration?.trim();

          let transliteration = '';
          let english = '';
          let urdu = '';

          if (!hasTranslit) {
            const sourceArabic = line.arabic?.trim() || '';
            if (sourceArabic) {
              transliteration = transliterateArabicToLatin(sourceArabic);
            }
          }

          if (!hasEnglish) {
            const source = line.arabic?.trim() || line.transliteration?.trim() || transliteration || '';
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

          if (transliteration || english || urdu) {
            nextMap[key] = {
              transliteration: transliteration || undefined,
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

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const overrideTitles = new Set(
        chapters.filter((c) => c.chapterUrdu?.trim()).map((c) => c.chapter)
      );
      const unique = Array.from(new Set(chapters.map((c) => c.chapter).filter(Boolean)))
        .filter((t) => !overrideTitles.has(t));
      const next: Record<string, string> = {};

      for (const title of unique) {
        // Skip titles that are already in Urdu/Arabic script.
        if (/[\u0600-\u06FF]/.test(title)) {
          next[title] = title;
          continue;
        }
        try {
          const translated = await translateTextToUrdu(title);
          if (translated) next[title] = translated;
        } catch {
          // ignore failures; fall back to no Urdu title
        }
      }

      if (!cancelled) {
        setChapterTitleUrdu(next);
      }
    };

    if (chapters.length > 0) {
      void run();
    } else {
      setChapterTitleUrdu({});
    }

    return () => {
      cancelled = true;
    };
  }, [chapters]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const overrideTitles = new Set(
        chapters.filter((c) => c.chapterArabic?.trim()).map((c) => c.chapter)
      );
      const unique = Array.from(new Set(chapters.map((c) => c.chapter).filter(Boolean)))
        .filter((t) => !overrideTitles.has(t));
      const next: Record<string, string> = {};

      for (const title of unique) {
        // Skip titles already in Arabic/Urdu script.
        if (/[\u0600-\u06FF]/.test(title)) {
          next[title] = title;
          continue;
        }
        try {
          const translated = await translateTextToArabic(title);
          if (translated) next[title] = translated;
        } catch {
          // ignore
        }
      }

      if (!cancelled) {
        setChapterTitleArabic(next);
      }
    };

    if (chapters.length > 0) {
      void run();
    } else {
      setChapterTitleArabic({});
    }

    return () => {
      cancelled = true;
    };
  }, [chapters]);

  return (
    <View style={[styles.screen, N && { backgroundColor: N.bg }]}>
      <QaseedahHeader
        title={groupName}
        subtitle={`${type === 'naat' ? 'Naat' : 'Qaseedah'} · ${chapters.length} ${chapters.length === 1 ? 'chapter' : 'chapters'}`}
        onBack={() => router.back()}
        onRefresh={() => { void load(true); }}
        refreshing={refreshing}
        night={N}
      />

      <ReadingPreferencesBar
        mode={readingMode}
        onModeChange={handleModeChange}
        layers={layers}
        onLayersChange={setLayers}
        textScale={textScale}
        onTextScaleChange={setTextScale}
        nightMode={nightMode}
        onNightToggle={toggleManual}
        night={N}
      />

      <ScrollView contentContainerStyle={styles.content}>
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
              <View
                key={chapter.id}
                style={[
                  styles.chapterSurface,
                  N && { backgroundColor: N.surface, borderColor: N.border },
                ]}
              >
                <ChapterIntro
                  chapter={chapter.chapter}
                  chapterUrdu={layers.urdu ? (chapter.chapterUrdu || chapterTitleUrdu[chapter.chapter]) : undefined}
                  chapterArabic={layers.arabic ? (chapter.chapterArabic || chapterTitleArabic[chapter.chapter]) : undefined}
                  entryTitle={chapter.entryTitle}
                  lineCount={chapter.lines.length}
                  isOpen={isOpen}
                  onToggle={() => setExpanded((prev) => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
                  night={N}
                />

                {isOpen ? (
                  <View style={styles.chapterBody}>
                    {(() => {
                      let verseCounter = 0;
                      return chapter.lines.map((line, idx) => {
                        const lineKey = `${chapter.id}-${idx}`;
                        const auto = autoTranslatedByLine[lineKey];
                        const effectiveTranslit = line.transliteration?.trim() || auto?.transliteration || '';
                        const effectiveEnglish = line.translation?.trim() || auto?.english || '';
                        const effectiveUrdu = line.urdu_translation?.trim() || auto?.urdu || '';

                        const headingLower = (line.heading || '').toLowerCase();
                        let role: VerseRole = 'verse';
                        if (headingLower.includes('chorus (opening)')) role = 'opening-chorus';
                        else if (headingLower.includes('chorus (closing)')) role = 'closing-chorus';

                        let verseNumber: number | undefined;
                        if (role === 'verse') {
                          verseCounter += 1;
                          verseNumber = verseCounter;
                        }

                        const isAuto =
                          (!line.transliteration?.trim() || !line.translation?.trim() || !line.urdu_translation?.trim()) &&
                          Boolean(auto?.transliteration || auto?.english || auto?.urdu);

                        return (
                          <React.Fragment key={lineKey}>
                            {idx > 0 ? <VerseDivider night={N} variant="dot" /> : null}
                            <VerseBlock
                              role={role}
                              verseNumber={verseNumber}
                              chapterLabel={chapter.chapter}
                              arabic={line.arabic}
                              transliteration={effectiveTranslit || undefined}
                              translation={effectiveEnglish || undefined}
                              urdu={effectiveUrdu || undefined}
                              isAutoTranslated={isAuto}
                              layers={layers}
                              scale={textScale}
                              night={N}
                            />
                          </React.Fragment>
                        );
                      });
                    })()}
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
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  chapterSurface: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  chapterBody: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop: 4,
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
    marginHorizontal: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
  },
  messageText: {
    fontSize: 13,
    color: Colors.textSubtle,
    textAlign: 'center',
  },
});
