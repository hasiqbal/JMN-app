import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

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
  type LanguageFontScales,
  type LayerVisibility,
  type ReadingMode,
  type VerseRole,
} from '@/components/qaseedah';
import {
  AdhkarRow,
  fetchQaseedahNaatEntries,
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
  fontScaleArabic?: number;
  fontScaleTransliteration?: number;
  fontScaleEnglish?: number;
  fontScaleUrdu?: number;
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
const DEFAULT_LANGUAGE_SCALES: LanguageFontScales = {
  arabic: 1,
  transliteration: 1,
  english: 1,
  urdu: 1,
};

type ChorusLine = {
  heading: string;
  arabic: string;
  transliteration?: string;
  translation?: string;
  urdu_translation?: string;
};

type ReaderGroupOption = {
  name: string;
  type: 'qaseedah' | 'naat';
  entryTitles: string[];
};

type ReaderEntryTarget = {
  groupName: string;
  type: 'qaseedah' | 'naat';
  entryTitle: string;
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

function hasLatinScript(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function hasLikelyUrduScript(value: string): boolean {
  // Prefer Urdu fallback only when Urdu-specific letters are present.
  // This avoids pulling Arabic-only lines into the Urdu layer.
  return /[ٹڈڑںےھہچژگپکڑ]/.test(value);
}

function hasQuranicDiacritics(value: string): boolean {
  return /[\u064B-\u065F\u0670\u06D6-\u06ED]/.test(value);
}

function parseScale(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0.7, Math.min(1.8, Number(value.toFixed(2))));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0.7, Math.min(1.8, Number(parsed.toFixed(2))));
    }
  }
  return undefined;
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

  const arabicLooksUrdu = hasLikelyUrduScript(rawArabic) && !hasQuranicDiacritics(rawArabic);
  const normalizedArabic = (!rawUrdu && arabicLooksUrdu) ? '' : rawArabic;

  const english = hasLatinScript(rawEnglish)
    ? rawEnglish
    : (!hasLatinScript(rawEnglish) && hasLatinScript(rawUrdu) ? rawUrdu : '');

  const urdu = rawUrdu
    ? rawUrdu
    : (arabicLooksUrdu
      ? rawArabic
      : (hasLikelyUrduScript(rawEnglish) ? rawEnglish : ''));

  return {
    arabic: normalizedArabic,
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
      let fontScaleArabic = 1;
      let fontScaleTransliteration = 1;
      let fontScaleEnglish = 1;
      let fontScaleUrdu = 1;
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
        const scaleArabic = parseScale((section as { font_scale_arabic?: unknown }).font_scale_arabic);
        const scaleTranslit = parseScale((section as { font_scale_transliteration?: unknown }).font_scale_transliteration);
        const scaleEnglish = parseScale((section as { font_scale_english?: unknown }).font_scale_english);
        const scaleUrdu = parseScale((section as { font_scale_urdu?: unknown }).font_scale_urdu);

        if (typeof perTranslit === 'boolean') disableAutoTransliteration = perTranslit;
        if (typeof perArabic === 'boolean') disableAutoArabic = perArabic;
        if (typeof perEnglish === 'boolean') disableAutoEnglish = perEnglish;
        if (typeof perUrdu === 'boolean') disableAutoUrdu = perUrdu;
        if (hasPrimaryLanguage) primaryLanguage = primaryLanguageRaw as PrimaryLanguage;
        if (typeof perTitleArabic === 'boolean') disableAutoTitleArabic = perTitleArabic;
        if (typeof perTitleEnglish === 'boolean') disableAutoTitleEnglish = perTitleEnglish;
        if (typeof perTitleUrdu === 'boolean') disableAutoTitleUrdu = perTitleUrdu;
        if (typeof scaleArabic === 'number') fontScaleArabic = scaleArabic;
        if (typeof scaleTranslit === 'number') fontScaleTransliteration = scaleTranslit;
        if (typeof scaleEnglish === 'number') fontScaleEnglish = scaleEnglish;
        if (typeof scaleUrdu === 'number') fontScaleUrdu = scaleUrdu;

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
          || typeof scaleArabic === 'number'
          || typeof scaleTranslit === 'number'
          || typeof scaleEnglish === 'number'
          || typeof scaleUrdu === 'number'
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
        const urduTranslation = typeof section.urdu_translation === 'string'
          ? section.urdu_translation.trim()
          : (typeof (section as { translation_urdu?: unknown }).translation_urdu === 'string'
            ? ((section as { translation_urdu?: string }).translation_urdu || '').trim()
            : '');
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
          fontScaleArabic,
          fontScaleTransliteration,
          fontScaleEnglish,
          fontScaleUrdu,
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
      fontScaleArabic: 1,
      fontScaleTransliteration: 1,
      fontScaleEnglish: 1,
      fontScaleUrdu: 1,
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

function normalizeGroupLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function extractReaderGroupOptions(rows: AdhkarRow[]): ReaderGroupOption[] {
  const grouped = new Map<string, { name: string; type: 'qaseedah' | 'naat'; entryTitles: Set<string> }>();

  rows.forEach((row) => {
    const name = (row.group_name || 'General').trim() || 'General';
    const type: 'qaseedah' | 'naat' = row.content_type === 'naat' ? 'naat' : 'qaseedah';
    const key = `${type}::${normalizeGroupLabel(name)}`;
    const existing = grouped.get(key);

    const titleCandidates = [row.title, row.arabic_title]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => normalizeInlineSpacing(value))
      .filter(Boolean);

    if (existing) {
      titleCandidates.forEach((title) => existing.entryTitles.add(title));
      return;
    }

    grouped.set(key, {
      name,
      type,
      entryTitles: new Set(titleCandidates),
    });
  });

  return Array.from(grouped.values())
    .map((item) => ({
      name: item.name,
      type: item.type,
      entryTitles: Array.from(item.entryTitles).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}

export default function QaseedahGroupScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ group?: string; type?: string }>();
  const initialGroupName = typeof params.group === 'string' ? params.group : 'Group';
  const initialType: 'qaseedah' | 'naat' = params.type === 'naat' ? 'naat' : 'qaseedah';

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
  const [languageScales, setLanguageScales] = React.useState<LanguageFontScales>(DEFAULT_LANGUAGE_SCALES);
  const [languageScalesTouched, setLanguageScalesTouched] = React.useState(false);
  const [autoTranslatedByLine, setAutoTranslatedByLine] = React.useState<Record<string, { arabic?: string; transliteration?: string; english?: string; urdu?: string }>>({});
  const [chapterTitleEnglish, setChapterTitleEnglish] = React.useState<Record<string, string>>({});
  const [chapterTitleUrdu, setChapterTitleUrdu] = React.useState<Record<string, string>>({});
  const [chapterTitleArabic, setChapterTitleArabic] = React.useState<Record<string, string>>({});
  const [activeGroupName, setActiveGroupName] = React.useState(initialGroupName);
  const [activeType, setActiveType] = React.useState<'qaseedah' | 'naat'>(initialType);
  const [stagedGroupName, setStagedGroupName] = React.useState(initialGroupName);
  const [stagedType, setStagedType] = React.useState<'qaseedah' | 'naat'>(initialType);
  const [groupOptions, setGroupOptions] = React.useState<ReaderGroupOption[]>([]);
  const [groupPickerQuery, setGroupPickerQuery] = React.useState('');
  const [focusEntryRequiredNotice, setFocusEntryRequiredNotice] = React.useState(false);
  const [pendingEntrySelection, setPendingEntrySelection] = React.useState<ReaderEntryTarget | null>(null);
  const [focusMode, setFocusMode] = React.useState(false);
  const [focusMenuOpen, setFocusMenuOpen] = React.useState(false);
  const [focusControlsVisible, setFocusControlsVisible] = React.useState(false);
  const [focusNavExpanded, setFocusNavExpanded] = React.useState(false);
  const scrollRef = React.useRef<ScrollView | null>(null);
  const chapterSignatureRef = React.useRef('');

  React.useEffect(() => {
    setActiveGroupName(initialGroupName);
    setActiveType(initialType);
    setStagedGroupName(initialGroupName);
    setStagedType(initialType);
  }, [initialGroupName, initialType]);

  React.useEffect(() => {
    if (!focusMenuOpen) return;
    setStagedGroupName(activeGroupName);
    setStagedType(activeType);
    setFocusNavExpanded(false);
  }, [focusMenuOpen, activeGroupName, activeType]);

  React.useEffect(() => {
    if (focusMode) {
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      navigation.setOptions({ tabBarStyle: undefined });
      setGroupPickerQuery('');
    }

    return () => {
      navigation.setOptions({ tabBarStyle: undefined });
    };
  }, [focusMode, navigation]);

  const loadGroupOptions = React.useCallback(async () => {
    try {
      const rows = await fetchQaseedahNaatEntries();
      const nextOptions = extractReaderGroupOptions(rows);
      setGroupOptions(nextOptions);
    } catch {
      // Ignore search index hydration failures.
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadGroupOptions();
    }, [loadGroupOptions])
  );

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

      const contentType = activeType;

      // Render quickly from cache when available, then always revalidate so
      // updated portal verses appear immediately without waiting for cache TTL.
      const cachedOrLiveRows = await fetchQaseedahNaatEntriesForGroup(
        activeGroupName,
        contentType,
      );
      applyRows(cachedOrLiveRows);

      // Revalidate on focus and pull-to-refresh; applyRows updates only on signature changes.
      const revalidatedRows = await fetchQaseedahNaatEntriesForGroup(
        activeGroupName,
        contentType,
        { forceRefresh: true },
      );
      applyRows(revalidatedRows);

      setError(null);
    } catch {
      setError('Could not load chapters for this group.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeGroupName, activeType]);

  useFocusEffect(
    React.useCallback(() => {
      void load(false, { silent: true });
    }, [load])
  );

  React.useEffect(() => {
    if (languageScalesTouched || chapters.length === 0) return;
    const first = chapters[0];
    setLanguageScales({
      arabic: first.fontScaleArabic ?? 1,
      transliteration: first.fontScaleTransliteration ?? 1,
      english: first.fontScaleEnglish ?? 1,
      urdu: first.fontScaleUrdu ?? 1,
    });
  }, [chapters, languageScalesTouched]);

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

  const groupsInStagedType = React.useMemo(
    () => groupOptions.filter((item) => item.type === stagedType),
    [groupOptions, stagedType]
  );

  const stagedGroupIndex = React.useMemo(
    () => groupsInStagedType.findIndex((item) => normalizeGroupLabel(item.name) === normalizeGroupLabel(stagedGroupName)),
    [groupsInStagedType, stagedGroupName]
  );

  const previousGroup = stagedGroupIndex > 0 ? groupsInStagedType[stagedGroupIndex - 1] : null;
  const nextGroup = stagedGroupIndex >= 0 && stagedGroupIndex < groupsInStagedType.length - 1
    ? groupsInStagedType[stagedGroupIndex + 1]
    : null;

  const hasPendingWheelSelection = stagedType !== activeType
    || normalizeGroupLabel(stagedGroupName) !== normalizeGroupLabel(activeGroupName);

  const hasOpenedEntry = React.useMemo(
    () => chapters.some((chapter) => !!expanded[chapter.id]),
    [chapters, expanded]
  );

  const filteredEntryTargets = React.useMemo(() => {
    const query = groupPickerQuery.trim().toLowerCase();
    const targets: ReaderEntryTarget[] = [];
    groupOptions.forEach((option) => {
      option.entryTitles.forEach((entryTitle) => {
        if (query && !entryTitle.toLowerCase().includes(query)) return;
        targets.push({
          groupName: option.name,
          type: option.type,
          entryTitle,
        });
      });
    });

    return targets;
  }, [groupOptions, groupPickerQuery]);

  const handleStageNavigateGroup = React.useCallback((target: ReaderGroupOption | null) => {
    if (!target) return;
    setStagedType(target.type);
    setStagedGroupName(target.name);
  }, []);

  const handleStageSwitchType = React.useCallback((targetType: 'qaseedah' | 'naat') => {
    if (targetType === stagedType) return;
    const groupsForType = groupOptions.filter((item) => item.type === targetType);
    if (groupsForType.length === 0) return;

    const sameName = groupsForType.find(
      (item) => normalizeGroupLabel(item.name) === normalizeGroupLabel(stagedGroupName)
    );
    const nextTarget = sameName ?? groupsForType[0];

    setStagedType(targetType);
    setStagedGroupName(nextTarget.name);
  }, [groupOptions, stagedGroupName, stagedType]);

  const handleConfirmWheelSelection = React.useCallback(() => {
    if (!hasPendingWheelSelection) return;
    setActiveType(stagedType);
    setActiveGroupName(stagedGroupName);
    setExpanded({});
    setPendingEntrySelection(null);
    setFocusEntryRequiredNotice(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [hasPendingWheelSelection, stagedType, stagedGroupName]);

  const handleNavigateEntry = React.useCallback((target: ReaderEntryTarget) => {
    setActiveType(target.type);
    setActiveGroupName(target.groupName);
    setPendingEntrySelection(target);
    setFocusEntryRequiredNotice(false);
    setFocusMenuOpen(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const handleToggleChapter = React.useCallback((chapterId: string) => {
    setExpanded((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }));
    setFocusEntryRequiredNotice(false);
  }, []);

  React.useEffect(() => {
    if (!pendingEntrySelection) return;
    if (pendingEntrySelection.type !== activeType) return;
    if (normalizeGroupLabel(pendingEntrySelection.groupName) !== normalizeGroupLabel(activeGroupName)) return;

    const normalizedEntry = normalizeInlineSpacing(pendingEntrySelection.entryTitle).toLowerCase();
    const matched = chapters.filter((chapter) => normalizeInlineSpacing(chapter.entryTitle).toLowerCase() === normalizedEntry);
    if (matched.length === 0) return;

    const nextExpanded: Record<string, boolean> = {};
    matched.forEach((chapter) => {
      nextExpanded[chapter.id] = true;
    });
    setExpanded(nextExpanded);
    setPendingEntrySelection(null);
  }, [activeGroupName, activeType, chapters, pendingEntrySelection]);

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
      {!focusMode || focusControlsVisible ? (
        <>
          <QaseedahHeader
            title={activeGroupName}
            subtitle={`${activeType === 'naat' ? 'Naat' : 'Qaseedah'} · ${chapters.length} ${chapters.every((chapter) => chapter.isPoem) ? (chapters.length === 1 ? 'poem' : 'poems') : (chapters.length === 1 ? 'chapter' : 'chapters')}`}
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
            languageScales={languageScales}
            onLanguageScalesChange={(next) => {
              setLanguageScalesTouched(true);
              setLanguageScales(next);
            }}
            nightMode={nightMode}
            onNightToggle={toggleManual}
            night={N}
          />
        </>
      ) : null}

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
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
            const isOpen = focusMode ? true : !!expanded[chapter.id];
            return (
              <View
                key={chapter.id}
                style={[
                  styles.chapterSurface,
                  N && { backgroundColor: N.surface, borderColor: N.border },
                ]}
              >
                {!focusMode ? (
                  <ChapterIntro
                    chapter={chapterTitleEnglish[chapter.chapter] || chapter.chapter}
                    chapterUrdu={chapter.isPoem ? undefined : (layers.urdu ? (chapter.chapterUrdu || chapterTitleUrdu[chapter.chapter]) : undefined)}
                    chapterArabic={chapter.isPoem ? undefined : (layers.arabic ? (chapter.chapterArabic || chapterTitleArabic[chapter.chapter]) : undefined)}
                    entryTitle={chapter.entryTitle}
                    lineCount={chapter.lines.length}
                    isOpen={isOpen}
                    onToggle={() => handleToggleChapter(chapter.id)}
                    isPoem={!!chapter.isPoem}
                    night={N}
                  />
                ) : null}

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
                        const renderedArabic = chapter.disableAutoArabic ? '' : effectiveArabic;
                        const renderedTranslit = chapter.disableAutoTransliteration ? '' : effectiveTranslit;
                        const renderedEnglish = chapter.disableAutoEnglish ? '' : effectiveEnglish;
                        const renderedUrdu = chapter.disableAutoUrdu ? '' : effectiveUrdu;

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
                              arabic={renderedArabic}
                              transliteration={renderedTranslit || undefined}
                              translation={renderedEnglish || undefined}
                              urdu={renderedUrdu || undefined}
                              isAutoTranslated={isAuto}
                              layers={layers}
                              scale={textScale}
                              languageScales={languageScales}
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

      <View style={[styles.focusFabWrap, { top: insets.top + 8 }]}> 
        {focusMode && focusMenuOpen ? (
          <View style={[styles.focusMenu, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}>
            <Text style={[styles.focusHintText, N && { color: N.textMuted }]}>Two fingers zoom, one finger scroll</Text>
            <TouchableOpacity
              style={[styles.focusMenuSectionToggle, N && { borderColor: N.border, backgroundColor: N.surface }]}
              activeOpacity={0.85}
              onPress={() => setFocusNavExpanded((prev) => !prev)}
            >
              <Text style={[styles.focusMenuSectionToggleText, N && { color: N.textSub }]}>Entry Navigation</Text>
              <MaterialIcons
                name={focusNavExpanded ? 'expand-less' : 'expand-more'}
                size={16}
                color={N ? N.textMuted : Colors.textSubtle}
              />
            </TouchableOpacity>

            {focusNavExpanded ? (
              <>
                <View style={[styles.focusSearchWrap, N && { borderColor: N.border, backgroundColor: N.surface }]}> 
                  <MaterialIcons name="search" size={14} color={N ? N.textMuted : Colors.textSubtle} />
                  <TextInput
                    value={groupPickerQuery}
                    onChangeText={setGroupPickerQuery}
                    placeholder="Search entry in any group"
                    placeholderTextColor={N ? N.textMuted : Colors.textSubtle}
                    style={[styles.focusSearchInput, N && { color: N.text }]}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                  {groupPickerQuery.trim().length > 0 ? (
                    <TouchableOpacity
                      style={styles.focusSearchClear}
                      activeOpacity={0.85}
                      onPress={() => setGroupPickerQuery('')}
                    >
                      <MaterialIcons name="close" size={13} color={N ? N.textMuted : Colors.textSubtle} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={[styles.quickNavCard, styles.focusWheelCard, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
                  <View style={styles.quickNavWheelRow}>
                    <TouchableOpacity
                      style={[
                        styles.quickNavArrow,
                        !previousGroup && styles.quickNavArrowDisabled,
                        N && { borderColor: N.border },
                      ]}
                      activeOpacity={0.85}
                      disabled={!previousGroup}
                      onPress={() => handleStageNavigateGroup(previousGroup)}
                    >
                      <MaterialIcons name="chevron-left" size={18} color={N ? N.textSub : Colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.quickNavTypeRow}>
                      <TouchableOpacity
                        style={[
                          styles.quickTypeChip,
                          stagedType === 'qaseedah' && styles.quickTypeChipActive,
                          N && stagedType !== 'qaseedah' && { borderColor: N.border, backgroundColor: N.surfaceAlt },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => handleStageSwitchType('qaseedah')}
                      >
                        <Text
                          style={[
                            styles.quickTypeChipText,
                            stagedType === 'qaseedah' && styles.quickTypeChipTextActive,
                            N && stagedType !== 'qaseedah' && { color: N.textSub },
                          ]}
                        >
                          Qaseedah
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.quickTypeChip,
                          stagedType === 'naat' && styles.quickTypeChipActive,
                          N && stagedType !== 'naat' && { borderColor: N.border, backgroundColor: N.surfaceAlt },
                        ]}
                        activeOpacity={0.85}
                        onPress={() => handleStageSwitchType('naat')}
                      >
                        <Text
                          style={[
                            styles.quickTypeChipText,
                            stagedType === 'naat' && styles.quickTypeChipTextActive,
                            N && stagedType !== 'naat' && { color: N.textSub },
                          ]}
                        >
                          Naat
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.quickNavArrow,
                        !nextGroup && styles.quickNavArrowDisabled,
                        N && { borderColor: N.border },
                      ]}
                      activeOpacity={0.85}
                      disabled={!nextGroup}
                      onPress={() => handleStageNavigateGroup(nextGroup)}
                    >
                      <MaterialIcons name="chevron-right" size={18} color={N ? N.textSub : Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.quickNavLabelBtn, N && { borderColor: N.border, backgroundColor: N.surfaceAlt }]}> 
                    <Text style={[styles.quickNavLabel, N && { color: N.textMuted }]} numberOfLines={1}>
                      {stagedGroupName}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.wheelConfirmBtn,
                      !hasPendingWheelSelection && styles.wheelConfirmBtnDisabled,
                      N && { borderColor: N.border, backgroundColor: hasPendingWheelSelection ? N.accent + '26' : N.surfaceAlt },
                    ]}
                    activeOpacity={0.85}
                    disabled={!hasPendingWheelSelection}
                    onPress={handleConfirmWheelSelection}
                  >
                    <MaterialIcons
                      name="check"
                      size={14}
                      color={N ? (hasPendingWheelSelection ? N.accent : N.textMuted) : (hasPendingWheelSelection ? Colors.primary : Colors.textSubtle)}
                    />
                    <Text
                      style={[
                        styles.wheelConfirmBtnText,
                        !hasPendingWheelSelection && styles.wheelConfirmBtnTextDisabled,
                        N && hasPendingWheelSelection && { color: N.accent },
                      ]}
                    >
                      Confirm Selection
                    </Text>
                  </TouchableOpacity>
                </View>

                {filteredEntryTargets.length === 0 ? (
                  <Text style={[styles.focusSearchNoMatch, N && { color: N.textMuted }]}>No entries match your search.</Text>
                ) : (
                  <ScrollView style={styles.focusEntryList} contentContainerStyle={styles.focusEntryListContent}>
                    {filteredEntryTargets.map((target) => (
                      <TouchableOpacity
                        key={`${target.type}::${target.groupName}::${target.entryTitle}`}
                        style={[styles.focusEntryItem, N && { borderColor: N.border, backgroundColor: N.surface }]}
                        activeOpacity={0.86}
                        onPress={() => handleNavigateEntry(target)}
                      >
                        <Text style={[styles.focusEntryTitle, N && { color: N.text }]} numberOfLines={1}>{target.entryTitle}</Text>
                        <Text style={[styles.focusEntryMeta, N && { color: N.textMuted }]} numberOfLines={1}>
                          {target.groupName} · {target.type === 'naat' ? 'Naat' : 'Qaseedah'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.focusMenuBtn, N && { borderColor: N.border }]}
              activeOpacity={0.85}
              onPress={() => {
                setFocusControlsVisible((prev) => !prev);
                setFocusMenuOpen(false);
              }}
            >
              <MaterialIcons
                name={focusControlsVisible ? 'visibility-off' : 'visibility'}
                size={16}
                color={N ? N.textSub : Colors.textSecondary}
              />
              <Text style={[styles.focusMenuBtnText, N && { color: N.textSub }]}>
                {focusControlsVisible ? 'Hide Controls' : 'Show Controls'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.focusMenuBtn, N && { borderColor: N.border }]}
              activeOpacity={0.85}
              onPress={() => {
                setFocusMode(false);
                setFocusMenuOpen(false);
                setFocusControlsVisible(false);
                setGroupPickerQuery('');
              }}
            >
              <MaterialIcons name="fullscreen-exit" size={16} color={N ? N.textSub : Colors.textSecondary} />
              <Text style={[styles.focusMenuBtnText, N && { color: N.textSub }]}>Exit Full Screen</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!focusMode && focusEntryRequiredNotice ? (
          <View style={[styles.focusEntryHint, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
            <Text style={[styles.focusEntryHintText, N && { color: N.textMuted }]}>Open an entry first, then use full screen.</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.focusFab,
            N
              ? { backgroundColor: N.surfaceAlt, borderColor: N.border }
              : { backgroundColor: Colors.surface, borderColor: Colors.border },
          ]}
          activeOpacity={0.85}
          onPress={() => {
            if (!focusMode) {
              if (!hasOpenedEntry) {
                setFocusEntryRequiredNotice(true);
                setFocusMenuOpen(false);
                return;
              }
              setFocusMode(true);
              setFocusControlsVisible(false);
              setFocusMenuOpen(false);
              setFocusEntryRequiredNotice(false);
              return;
            }
            setFocusMenuOpen((prev) => !prev);
          }}
        >
          <MaterialIcons
            name={!focusMode ? 'fullscreen' : 'tune'}
            size={18}
            color={N ? N.textSub : Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
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
  focusFabWrap: {
    position: 'absolute',
    right: Spacing.md,
    alignItems: 'flex-end',
    gap: 8,
  },
  focusFab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  focusMenu: {
    minWidth: 360,
    maxWidth: 430,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: 6,
    gap: 6,
  },
  focusHintText: {
    fontSize: 11,
    textAlign: 'center',
    color: Colors.textSubtle,
    paddingHorizontal: 6,
    paddingTop: 2,
  },
  focusMenuSectionToggle: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusMenuSectionToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  focusSearchWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  focusSearchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  focusSearchClear: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusSearchNoMatch: {
    fontSize: 10,
    textAlign: 'center',
    color: Colors.textSubtle,
  },
  quickNavCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  focusWheelCard: {
    width: '100%',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
  },
  quickNavWheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickNavArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  quickNavArrowDisabled: {
    opacity: 0.45,
  },
  quickNavTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 6,
  },
  quickTypeChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: Colors.surface,
  },
  quickTypeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E8F2FF',
  },
  quickTypeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  quickTypeChipTextActive: {
    color: Colors.primary,
  },
  quickNavLabel: {
    maxWidth: '90%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  quickNavLabelBtn: {
    maxWidth: '95%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  wheelConfirmBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  wheelConfirmBtnDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  wheelConfirmBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  wheelConfirmBtnTextDisabled: {
    color: Colors.textSubtle,
  },
  focusEntryList: {
    maxHeight: 260,
  },
  focusEntryListContent: {
    gap: 5,
  },
  focusEntryItem: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 2,
  },
  focusEntryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  focusEntryMeta: {
    fontSize: 10,
    color: Colors.textSubtle,
  },
  focusEntryHint: {
    maxWidth: 220,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  focusEntryHintText: {
    fontSize: 11,
    color: Colors.textSubtle,
    textAlign: 'center',
    fontWeight: '600',
  },
  focusMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
  },
  focusMenuBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
