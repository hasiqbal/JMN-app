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
import { useQaseedahNightMode } from '@/hooks/useQaseedahNightMode';
import {
  ChapterIntro,
  type PrimaryLanguage,
  QaseedahHeader,
  ReadingPreferencesBar,
  VerseBlock,
  VerseDivider,
  type LayerVisibility,
  type ReadingMode,
  type VerseRole,
} from '@/components/qaseedah';
import {
  AdhkarRow,
  fetchQaseedahNaatEntriesForGroup,
  translateTextToArabic,
  translateTextToEnglish,
  translateTextToUrdu,
} from '@/services/contentService';

type GroupChapterItem = {
  id: string;
  chapter: string;
  chapterArabic?: string;
  chapterUrdu?: string;
  primaryLanguage?: PrimaryLanguage;
  disableAutoTransliteration?: boolean;
  disableAutoArabic?: boolean;
  disableAutoEnglish?: boolean;
  disableAutoUrdu?: boolean;
  disableAutoTitleArabic?: boolean;
  disableAutoTitleEnglish?: boolean;
  disableAutoTitleUrdu?: boolean;
  isPoem?: boolean;
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
const SETTINGS_MARKER = '__settings__';

type ChorusLine = {
  heading: string;
  arabic: string;
  transliteration?: string;
  translation?: string;
  urdu_translation?: string;
};

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

function normalizeInlineSpacing(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
}

function hasArabicScript(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

function hasLatinScript(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function normalizeLineFields(line: GroupChapterItem['lines'][number]): {
  arabic: string;
  transliteration: string;
  english: string;
  urdu: string;
} {
  const rawArabic = line.arabic?.trim() || '';
  const rawTranslit = line.transliteration?.trim() || '';
  const rawEnglish = line.translation?.trim() || '';
  const rawUrdu = line.urdu_translation?.trim() || '';

  const english = hasLatinScript(rawEnglish)
    ? rawEnglish
    : (!hasLatinScript(rawEnglish) && hasLatinScript(rawUrdu) ? rawUrdu : '');

  const urdu = hasArabicScript(rawUrdu)
    ? rawUrdu
    : (!hasArabicScript(rawUrdu) && hasArabicScript(rawEnglish) ? rawEnglish : '');

  return {
    arabic: rawArabic,
    transliteration: rawTranslit,
    english,
    urdu,
  };
}

function formatTransliterationText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .flatMap((line) => line.split(/\s+-\s+/))
    .map((line) => normalizeInlineSpacing(line))
    .filter(Boolean)
    .join('\n');
}

function formatEnglishTranslationText(value: string): string {
  let next = value.replace(/\r\n?/g, '\n').trim();
  if (!next) return '';

  // Some auto translations return transliteration first, then numbered meaning.
  const firstMeaningIndex = next.search(/\b1\.\s+/);
  if (firstMeaningIndex > 0) {
    const leadIn = next.slice(0, firstMeaningIndex).trim();
    if (leadIn.length >= 12) {
      next = next.slice(firstMeaningIndex);
    }
  }

  next = next.replace(/^\d+\.\s*/, '');
  next = next.replace(/\s+(?=\d+\.\s)/g, '\n');
  next = next.replace(/\s+-\s+/g, '\n');

  return next
    .split('\n')
    .map((line) => normalizeInlineSpacing(line))
    .filter(Boolean)
    .join('\n');
}

function isDefaultChapterLabel(value: string): boolean {
  return /^chapter\s*\d+$/i.test(value.trim());
}

function extractChapterItems(rows: AdhkarRow[]): GroupChapterItem[] {
  const items: GroupChapterItem[] = [];

  rows.forEach((row) => {
    if (Array.isArray(row.sections) && row.sections.length > 0) {
      // First pass: find the chorus marker, if any.
      let chorus: ChorusLine | null = null;
      let disableAutoTranslation = false;
      let disableAutoTransliteration = false;
      let disableAutoArabic = false;
      let disableAutoEnglish = false;
      let disableAutoUrdu = false;
      let primaryLanguage: PrimaryLanguage = 'auto';
      let disableAutoTitleArabic = false;
      let disableAutoTitleEnglish = false;
      let disableAutoTitleUrdu = false;
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

      for (const section of row.sections) {
        if (!section || typeof section !== 'object') continue;
        const chapterStr = typeof section.chapter === 'string' ? section.chapter.trim() : '';
        if (chapterStr !== SETTINGS_MARKER) continue;
        const disable = (section as { disable_auto_translation?: unknown }).disable_auto_translation;
        if (typeof disable === 'boolean') {
          disableAutoTranslation = disable;
        }

        const perTranslit = (section as { disable_auto_transliteration?: unknown }).disable_auto_transliteration;
        const perArabic = (section as { disable_auto_arabic?: unknown }).disable_auto_arabic;
        const perEnglish = (section as { disable_auto_english?: unknown }).disable_auto_english;
        const perUrdu = (section as { disable_auto_urdu?: unknown }).disable_auto_urdu;
        const primaryLanguageRaw = (section as { primary_language?: unknown }).primary_language;
        const hasPrimaryLanguage =
          primaryLanguageRaw === 'auto'
          || primaryLanguageRaw === 'arabic'
          || primaryLanguageRaw === 'transliteration'
          || primaryLanguageRaw === 'english'
          || primaryLanguageRaw === 'urdu';
        const perTitleArabic = (section as { disable_auto_title_arabic?: unknown }).disable_auto_title_arabic;
        const perTitleEnglish = (section as { disable_auto_title_english?: unknown }).disable_auto_title_english;
        const perTitleUrdu = (section as { disable_auto_title_urdu?: unknown }).disable_auto_title_urdu;

        if (typeof perTranslit === 'boolean') disableAutoTransliteration = perTranslit;
        if (typeof perArabic === 'boolean') disableAutoArabic = perArabic;
        if (typeof perEnglish === 'boolean') disableAutoEnglish = perEnglish;
        if (typeof perUrdu === 'boolean') disableAutoUrdu = perUrdu;
        if (hasPrimaryLanguage) primaryLanguage = primaryLanguageRaw as PrimaryLanguage;
        if (typeof perTitleArabic === 'boolean') disableAutoTitleArabic = perTitleArabic;
        if (typeof perTitleEnglish === 'boolean') disableAutoTitleEnglish = perTitleEnglish;
        if (typeof perTitleUrdu === 'boolean') disableAutoTitleUrdu = perTitleUrdu;

        if (
          typeof disable === 'boolean'
          || typeof perTranslit === 'boolean'
          || typeof perArabic === 'boolean'
          || typeof perEnglish === 'boolean'
          || typeof perUrdu === 'boolean'
          || hasPrimaryLanguage
          || typeof perTitleArabic === 'boolean'
          || typeof perTitleEnglish === 'boolean'
          || typeof perTitleUrdu === 'boolean'
        ) {
          break;
        }
      }

      // Backward compatibility: legacy single toggle disables every auto translation.
      if (disableAutoTranslation) {
        disableAutoTransliteration = true;
        disableAutoArabic = true;
        disableAutoEnglish = true;
        disableAutoUrdu = true;
        disableAutoTitleArabic = true;
        disableAutoTitleEnglish = true;
        disableAutoTitleUrdu = true;
      }

      const authoredChapterLabels = row.sections
        .map((section) => {
          if (!section || typeof section !== 'object') return '';
          const chapterStr = typeof section.chapter === 'string' ? section.chapter.trim() : '';
          if (chapterStr === CHORUS_MARKER || chapterStr === SETTINGS_MARKER) return '';
          return chapterStr;
        })
        .filter((chapter) => chapter.length > 0);

      const uniqueAuthoredChapters = new Set(authoredChapterLabels.map((chapter) => chapter.toLowerCase()));
      const hasCustomChapterName = authoredChapterLabels.some((chapter) => !isDefaultChapterLabel(chapter));
      const hasExplicitChapterTitles = hasCustomChapterName || uniqueAuthoredChapters.size > 1;
      const isPoem = !hasExplicitChapterTitles;
      const poemTitle = row.title?.trim() || 'Poem';

      const chapterMap = new Map<string, GroupChapterItem['lines']>();
      const chapterArabicTitle = new Map<string, string>();
      const chapterUrduTitle = new Map<string, string>();

      row.sections.forEach((section, index) => {
        if (!section || typeof section !== 'object') return;

        const chapterStr = typeof section.chapter === 'string' ? section.chapter.trim() : '';
        if (chapterStr === CHORUS_MARKER || chapterStr === SETTINGS_MARKER) return;

        const arabic = typeof section.arabic === 'string' ? section.arabic.trim() : '';
        const transliteration = typeof section.transliteration === 'string' ? section.transliteration.trim() : '';
        const translation = typeof section.translation === 'string' ? section.translation.trim() : '';
        const urduTranslation = typeof section.urdu_translation === 'string' ? section.urdu_translation.trim() : '';
        if (!arabic && !transliteration && !translation && !urduTranslation) return;

        const chapter = isPoem
          ? poemTitle
          : (chapterStr.length > 0 ? chapterStr : 'Chapter 1');

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
          transliteration: transliteration || undefined,
          translation: translation || undefined,
          urdu_translation: urduTranslation || undefined,
        };

        const list = chapterMap.get(chapter);
        if (list) {
          list.push(line);
        } else {
          chapterMap.set(chapter, [line]);
        }
      });

      Array.from(chapterMap.entries()).forEach(([chapter, lines], chapterIndex) => {
        const withChorus = chorus && (isPoem || chapter.toLowerCase().startsWith('chapter '))
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
          primaryLanguage,
          disableAutoTransliteration,
          disableAutoArabic,
          disableAutoEnglish,
          disableAutoUrdu,
          disableAutoTitleArabic,
          disableAutoTitleEnglish,
          disableAutoTitleUrdu,
          isPoem,
          entryTitle: row.title || 'Untitled',
          lines: withChorus,
        });
      });

      return;
    }

    // Fallback: no sections. Treat the entry as one poem and split by verse lines.
    const fallbackArabic = (row.arabic || '').trim();
    const translitLines = (row.transliteration || '').split(/\r?\n+/).map((s) => s.trim());
    const englishLines = (row.translation || '').split(/\r?\n+/).map((s) => s.trim());
    const urduLines = (row.urdu_translation || row.translation_urdu || '').split(/\r?\n+/).map((s) => s.trim());
    const arabicLines = fallbackArabic.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);

    const lineCount = Math.max(arabicLines.length, translitLines.length, englishLines.length, urduLines.length);
    if (lineCount === 0) return;

    const poemLabel = row.title?.trim() || 'Poem';

    const lines = Array.from({ length: lineCount }, (_, idx) => ({
      heading: `Verse ${idx + 1}`,
      arabic: arabicLines[idx] || '',
      transliteration: translitLines[idx] || undefined,
      translation: englishLines[idx] || undefined,
      urdu_translation: urduLines[idx] || undefined,
    })).filter((line) => line.arabic || line.transliteration || line.translation || line.urdu_translation);

    if (lines.length === 0) return;

    items.push({
      id: `${row.id}-entry`,
      chapter: poemLabel,
      primaryLanguage: 'auto',
      disableAutoTransliteration: false,
      disableAutoArabic: false,
      disableAutoEnglish: false,
      disableAutoUrdu: false,
      disableAutoTitleArabic: false,
      disableAutoTitleEnglish: false,
      disableAutoTitleUrdu: false,
      isPoem: true,
      entryTitle: row.title || 'Untitled',
      lines,
    });
  });

  // Preserve chapter order exactly as authored in portal content.
  return items;
}

function buildChapterSignature(chapters: GroupChapterItem[]): string {
  return chapters
    .map((chapter) => `${chapter.id}:${chapter.lines.length}:${chapter.lines[0]?.heading ?? ''}`)
    .join('|');
}

export default function QaseedahGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ group?: string; type?: string }>();
  const groupName = typeof params.group === 'string' ? params.group : 'Group';
  const type = typeof params.type === 'string' ? params.type : 'qaseedah';

  const { nightMode, toggleManual } = useQaseedahNightMode();
  const N = nightMode ? NIGHT_PALETTE : null;

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [chapters, setChapters] = React.useState<GroupChapterItem[]>([]);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [readingMode, setReadingMode] = React.useState<ReadingMode>('full');
  const [layers, setLayers] = React.useState<LayerVisibility>({ arabic: true, transliteration: true, english: true, urdu: true });
  const [textScale, setTextScale] = React.useState(1);
  const [autoTranslatedByLine, setAutoTranslatedByLine] = React.useState<Record<string, { arabic?: string; transliteration?: string; english?: string; urdu?: string }>>({});
  const [chapterTitleEnglish, setChapterTitleEnglish] = React.useState<Record<string, string>>({});
  const [chapterTitleUrdu, setChapterTitleUrdu] = React.useState<Record<string, string>>({});
  const [chapterTitleArabic, setChapterTitleArabic] = React.useState<Record<string, string>>({});
  const chapterSignatureRef = React.useRef('');

  const handleModeChange = React.useCallback((next: ReadingMode) => {
    setReadingMode(next);
    if (next === 'arabic') setLayers({ arabic: true, transliteration: false, english: false, urdu: false });
    else if (next === 'translit') setLayers({ arabic: true, transliteration: true, english: false, urdu: false });
    else if (next === 'translation') setLayers({ arabic: true, transliteration: false, english: true, urdu: false });
    else if (next === 'urdu') setLayers({ arabic: true, transliteration: false, english: false, urdu: true });
    else if (next === 'full') setLayers({ arabic: true, transliteration: true, english: true, urdu: true });
  }, []);

  const load = React.useCallback(async (asRefresh = false, options?: { silent?: boolean }) => {
    if (asRefresh) {
      setRefreshing(true);
    } else if (!options?.silent) {
      setLoading(true);
    }
    try {
      const applyRows = (rows: AdhkarRow[]) => {
        const nextChapters = extractChapterItems(rows);
        const nextSignature = buildChapterSignature(nextChapters);
        if (nextSignature !== chapterSignatureRef.current) {
          chapterSignatureRef.current = nextSignature;
          setChapters(nextChapters);
        }
      };

      // Always render from cache first for a stable, fast experience.
      const cachedOrLiveRows = await fetchQaseedahNaatEntriesForGroup(
        groupName,
        type === 'naat' ? 'naat' : 'qaseedah',
      );
      applyRows(cachedOrLiveRows);

      if (asRefresh) {
        // Revalidate on pull-to-refresh and only apply if content actually changed.
        const revalidatedRows = await fetchQaseedahNaatEntriesForGroup(
          groupName,
          type === 'naat' ? 'naat' : 'qaseedah',
          { forceRefresh: true },
        );
        applyRows(revalidatedRows);
      }

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
      void load(false, { silent: true });
    }, [load])
  );

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const nextMap: Record<string, { arabic?: string; transliteration?: string; english?: string; urdu?: string }> = {};

      for (const chapter of chapters) {
        for (let idx = 0; idx < chapter.lines.length; idx += 1) {
          const line = chapter.lines[idx];
          const key = `${chapter.id}-${idx}`;

          const normalized = normalizeLineFields(line);

          const hasArabic = normalized.arabic.length > 0;
          const hasEnglish = normalized.english.length > 0;
          const hasUrdu = normalized.urdu.length > 0;
          const hasTranslit = normalized.transliteration.length > 0;
          const arabicDisabled = !!chapter.disableAutoArabic;
          const translitDisabled = !!chapter.disableAutoTransliteration;
          const englishDisabled = !!chapter.disableAutoEnglish;
          const urduDisabled = !!chapter.disableAutoUrdu;

          let arabic = '';
          let transliteration = '';
          let english = '';
          let urdu = '';

          if (!arabicDisabled && !hasArabic) {
            const sourceForArabic = normalized.transliteration || normalized.english || normalized.urdu || '';
            if (sourceForArabic) {
              arabic = await translateTextToArabic(sourceForArabic);
            }
          }

          const effectiveArabic = normalized.arabic || arabic;

          if (!translitDisabled && !hasTranslit) {
            const sourceArabic = effectiveArabic;
            if (sourceArabic) {
              transliteration = transliterateArabicToLatin(sourceArabic);
            }
          }

          transliteration = formatTransliterationText(transliteration);

          if (!englishDisabled && !hasEnglish) {
            const source = effectiveArabic || normalized.transliteration || transliteration || normalized.urdu || '';
            if (source) {
              english = await translateTextToEnglish(source);
            }
          }

          english = formatEnglishTranslationText(english);

          if (!urduDisabled && !hasUrdu) {
            const sourceForUrdu = normalized.english || english || effectiveArabic;
            if (sourceForUrdu) {
              urdu = await translateTextToUrdu(sourceForUrdu);
            }
          }

          if (arabic || transliteration || english || urdu) {
            nextMap[key] = {
              arabic: arabic || undefined,
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
        chapters.filter((c) => c.isPoem || c.disableAutoTitleEnglish).map((c) => c.chapter)
      );
      const unique = Array.from(new Set(chapters.map((c) => c.chapter).filter(Boolean)))
        .filter((t) => !overrideTitles.has(t));
      const next: Record<string, string> = {};

      for (const title of unique) {
        next[title] = normalizeInlineSpacing(title);
      }

      if (!cancelled) {
        setChapterTitleEnglish(next);
      }
    };

    if (chapters.length > 0) {
      void run();
    } else {
      setChapterTitleEnglish({});
    }

    return () => {
      cancelled = true;
    };
  }, [chapters]);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const overrideTitles = new Set(
        chapters.filter((c) => c.isPoem || c.chapterUrdu?.trim() || c.disableAutoTitleUrdu).map((c) => c.chapter)
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
        chapters.filter((c) => c.isPoem || c.chapterArabic?.trim() || c.disableAutoTitleArabic).map((c) => c.chapter)
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
        subtitle={`${type === 'naat' ? 'Naat' : 'Qaseedah'} · ${chapters.length} ${chapters.every((chapter) => chapter.isPoem) ? (chapters.length === 1 ? 'poem' : 'poems') : (chapters.length === 1 ? 'chapter' : 'chapters')}`}
        onBack={() => router.replace('/(tabs)/qaseedah-naat')}
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
                  chapter={chapterTitleEnglish[chapter.chapter] || chapter.chapter}
                  chapterUrdu={chapter.isPoem ? undefined : (layers.urdu ? (chapter.chapterUrdu || chapterTitleUrdu[chapter.chapter]) : undefined)}
                  chapterArabic={chapter.isPoem ? undefined : (layers.arabic ? (chapter.chapterArabic || chapterTitleArabic[chapter.chapter]) : undefined)}
                  entryTitle={chapter.entryTitle}
                  lineCount={chapter.lines.length}
                  isOpen={isOpen}
                  onToggle={() => setExpanded((prev) => ({ ...prev, [chapter.id]: !prev[chapter.id] }))}
                  isPoem={!!chapter.isPoem}
                  night={N}
                />

                {isOpen ? (
                  <View style={styles.chapterBody}>
                    {(() => {
                      let verseCounter = 0;
                      return chapter.lines.map((line, idx) => {
                        const lineKey = `${chapter.id}-${idx}`;
                        const auto = autoTranslatedByLine[lineKey];
                        const normalized = normalizeLineFields(line);
                        const effectiveArabic = normalized.arabic || auto?.arabic || '';
                        const effectiveTranslit = formatTransliterationText(normalized.transliteration || auto?.transliteration || '');
                        const effectiveEnglish = formatEnglishTranslationText(normalized.english || auto?.english || '');
                        const effectiveUrdu = normalized.urdu || auto?.urdu || '';

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
                          (!normalized.transliteration || !normalized.english || !normalized.urdu) &&
                          Boolean(auto?.transliteration || auto?.english || auto?.urdu);

                        return (
                          <React.Fragment key={lineKey}>
                            {idx > 0 ? <VerseDivider night={N} variant="dot" /> : null}
                            <VerseBlock
                              role={role}
                              verseNumber={verseNumber}
                              chapterLabel={chapter.isPoem ? undefined : chapter.chapter}
                              primaryLanguage={chapter.primaryLanguage}
                              arabic={effectiveArabic}
                              transliteration={effectiveTranslit || undefined}
                              translation={effectiveEnglish || undefined}
                              urdu={effectiveUrdu || undefined}
                              isAutoTranslated={isAuto}
                              layers={layers}
                              scale={textScale}
                              isPoem={!!chapter.isPoem}
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
