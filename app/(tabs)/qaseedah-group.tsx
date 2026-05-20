import React from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
} from '@/services/contentService';
import { setTabBarHidden } from '@/services/tabBarVisibility';

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
const PREFS_STORAGE_PREFIX = 'qaseedah-prefs:';
const MASTER_SCALE_KEY = `${PREFS_STORAGE_PREFIX}master`;

function computeDefaultLanguageScales(primary?: PrimaryLanguage): LanguageFontScales {
  const main = 1.6;
  const other = 1.2;
  if (primary === 'arabic') return { arabic: main, transliteration: other, english: other, urdu: other };
  if (primary === 'urdu') return { arabic: other, transliteration: other, english: other, urdu: main };
  if (primary === 'english') return { arabic: other, transliteration: other, english: main, urdu: other };
  if (primary === 'transliteration') return { arabic: other, transliteration: main, english: other, urdu: other };
  // auto / undefined → assume Arabic-led (qaseedah/naat default)
  return { arabic: main, transliteration: other, english: other, urdu: other };
}

const DEFAULT_LANGUAGE_SCALES: LanguageFontScales = computeDefaultLanguageScales('arabic');

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
  entries: { title: string; subtitle?: string }[];
};

type ReaderEntryTarget = {
  groupName: string;
  type: 'qaseedah' | 'naat';
  entryTitle: string;
  entrySubtitle?: string;
};

function normalizeInlineSpacing(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();
}

function hasLatinScript(value: string): boolean {
  return /[A-Za-z]/.test(value);
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

function isDefaultChapterLabel(value: string): boolean {
  return /^chapter\s*\d+$/i.test(value.trim());
}

function extractChapterItems(rows: AdhkarRow[]): GroupChapterItem[] {
  const items: GroupChapterItem[] = [];

  rows.forEach((row) => {
    if (Array.isArray(row.sections) && row.sections.length > 0) {
      // First pass: find the chorus marker, if any.
      let chorus: ChorusLine | null = null;
      // Auto translation / transliteration is OFF by default. Portal must
      // explicitly opt-in via `disable_auto_*: false` (or a legacy
      // `disable_auto_translation: false`) for any auto fallback to run.
      let disableAutoTranslation = true;
      let disableAutoTransliteration = true;
      let disableAutoArabic = true;
      let disableAutoEnglish = true;
      let disableAutoUrdu = true;
      let primaryLanguage: PrimaryLanguage = 'auto';
      let disableAutoTitleArabic = true;
      let disableAutoTitleEnglish = true;
      let disableAutoTitleUrdu = true;
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

      // Backward compatibility: legacy single toggle controls every auto translation
      // unless overridden per-language above. When the legacy flag is explicitly false,
      // auto is enabled across all languages; when explicitly true, auto stays off.
      if (disableAutoTranslation === false) {
        disableAutoTransliteration = false;
        disableAutoArabic = false;
        disableAutoEnglish = false;
        disableAutoUrdu = false;
        disableAutoTitleArabic = false;
        disableAutoTitleEnglish = false;
        disableAutoTitleUrdu = false;
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

        // Default per-language portal font scales: 1 means "unset" → fall through
        // to the runtime smart defaults derived from primary language.
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
          entryTitle: row.title || row.arabic_title || 'Untitled',
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

    const poemLabel = row.title?.trim() || row.arabic_title?.trim() || 'Poem';

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
      disableAutoTransliteration: true,
      disableAutoArabic: true,
      disableAutoEnglish: true,
      disableAutoUrdu: true,
      disableAutoTitleArabic: true,
      disableAutoTitleEnglish: true,
      disableAutoTitleUrdu: true,
      fontScaleArabic: 1,
      fontScaleTransliteration: 1,
      fontScaleEnglish: 1,
      fontScaleUrdu: 1,
      isPoem: true,
      entryTitle: row.title || row.arabic_title || 'Untitled',
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

function hasArabicScript(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

function deriveEntryDisplay(row: AdhkarRow): { title: string; subtitle?: string } {
  const urduTitle = (row as { urdu_title?: string }).urdu_title;
  const candidates = [row.title, row.arabic_title, urduTitle]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => normalizeInlineSpacing(value))
    .filter(Boolean);

  if (candidates.length === 0) {
    return { title: 'Untitled' };
  }

  const latinPreferred = candidates.find((value) => hasLatinScript(value));
  const primary = latinPreferred ?? candidates[0];
  const arabicOrUrdu = candidates.find((value) => hasArabicScript(value) && value !== primary);
  const secondary = arabicOrUrdu ?? candidates.find((value) => value !== primary);

  return {
    title: primary,
    subtitle: secondary,
  };
}

function extractReaderGroupOptions(rows: AdhkarRow[]): ReaderGroupOption[] {
  const grouped = new Map<string, {
    name: string;
    type: 'qaseedah' | 'naat';
    entries: Map<string, { title: string; subtitle?: string }>;
  }>();

  rows.forEach((row) => {
    const name = (row.group_name || 'General').trim() || 'General';
    const type: 'qaseedah' | 'naat' = row.content_type === 'naat' ? 'naat' : 'qaseedah';
    const key = `${type}::${normalizeGroupLabel(name)}`;
    const existing = grouped.get(key);

    const display = deriveEntryDisplay(row);
    const entryKey = `${normalizeGroupLabel(display.title)}::${normalizeGroupLabel(display.subtitle ?? '')}`;

    if (existing) {
      existing.entries.set(entryKey, display);
      return;
    }

    grouped.set(key, {
      name,
      type,
      entries: new Map([[entryKey, display]]),
    });
  });

  return Array.from(grouped.values())
    .map((item) => ({
      name: item.name,
      type: item.type,
      entries: Array.from(item.entries.values()).sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })),
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}

export default function QaseedahGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
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
  const [activeGroupName, setActiveGroupName] = React.useState(initialGroupName);
  const [activeType, setActiveType] = React.useState<'qaseedah' | 'naat'>(initialType);
  const [stagedGroupName, setStagedGroupName] = React.useState(initialGroupName);
  const [stagedType, setStagedType] = React.useState<'qaseedah' | 'naat'>(initialType);
  const [groupOptions, setGroupOptions] = React.useState<ReaderGroupOption[]>([]);
  const [groupPickerQuery, setGroupPickerQuery] = React.useState('');
  const [focusEntryRequiredNotice, setFocusEntryRequiredNotice] = React.useState(false);
  const [stagedEntrySelection, setStagedEntrySelection] = React.useState<ReaderEntryTarget | null>(null);
  const [pendingEntrySelection, setPendingEntrySelection] = React.useState<ReaderEntryTarget | null>(null);
  const [focusMode, setFocusMode] = React.useState(false);
  const [focusMenuOpen, setFocusMenuOpen] = React.useState(false);
  const [focusControlsVisible, setFocusControlsVisible] = React.useState(false);
  const [focusNavExpanded, setFocusNavExpanded] = React.useState(false);
  const [entrySwitchNotice, setEntrySwitchNotice] = React.useState('');
  const [focusFabPosition, setFocusFabPosition] = React.useState({ x: 0, y: 0 });
  const [focusFabMovedByUser, setFocusFabMovedByUser] = React.useState(false);
  const scrollRef = React.useRef<ScrollView | null>(null);
  const chapterSignatureRef = React.useRef('');
  const focusFabDragStartRef = React.useRef({ x: 0, y: 0 });
  const switchNoticeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLandscape = windowWidth > windowHeight;
  const focusFabSize = 38;
  const focusFabEdgePadding = Spacing.md;

  const getFocusFabBounds = React.useCallback(() => {
    const minX = insets.left + focusFabEdgePadding;
    const maxX = Math.max(minX, windowWidth - insets.right - focusFabSize - focusFabEdgePadding);
    const minY = insets.top + (isLandscape ? 44 : 8);
    const maxY = Math.max(minY, windowHeight - insets.bottom - focusFabSize - focusFabEdgePadding);
    return { minX, maxX, minY, maxY };
  }, [focusFabEdgePadding, insets.bottom, insets.left, insets.right, insets.top, isLandscape, windowHeight, windowWidth]);

  const clampFocusFabPosition = React.useCallback((x: number, y: number) => {
    const { minX, maxX, minY, maxY } = getFocusFabBounds();
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  }, [getFocusFabBounds]);

  const getDefaultFocusFabPosition = React.useCallback(() => {
    const { maxX, minY, maxY } = getFocusFabBounds();
    return {
      x: maxX,
      y: Math.min(maxY, minY + (isLandscape ? 28 : 0)),
    };
  }, [getFocusFabBounds, isLandscape]);

  const focusFabPanResponder = React.useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        focusMode && (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4),
      onPanResponderGrant: () => {
        focusFabDragStartRef.current = focusFabPosition;
      },
      onPanResponderMove: (_, gestureState) => {
        const nextX = focusFabDragStartRef.current.x + gestureState.dx;
        const nextY = focusFabDragStartRef.current.y + gestureState.dy;
        setFocusFabPosition(clampFocusFabPosition(nextX, nextY));
      },
      onPanResponderRelease: () => {
        setFocusFabMovedByUser(true);
      },
      onPanResponderTerminate: () => {
        setFocusFabMovedByUser(true);
      },
    }),
    [clampFocusFabPosition, focusFabPosition, focusMode]
  );

  const focusMenuWidth = React.useMemo(
    () => Math.max(280, Math.min(430, windowWidth - Spacing.md * 2)),
    [windowWidth]
  );

  const focusMenuLeft = React.useMemo(() => {
    const minLeft = insets.left + Spacing.xs;
    const maxLeft = Math.max(minLeft, windowWidth - insets.right - focusMenuWidth - Spacing.xs);
    const preferredLeft = focusFabPosition.x + focusFabSize - focusMenuWidth;
    return Math.min(maxLeft, Math.max(minLeft, preferredLeft));
  }, [focusFabPosition.x, focusFabSize, focusMenuWidth, insets.left, insets.right, windowWidth]);

  const focusMenuMaxHeight = React.useMemo(
    () => Math.max(220, windowHeight - insets.top - insets.bottom - 24),
    [insets.bottom, insets.top, windowHeight]
  );

  const focusMenuTop = React.useMemo(() => {
    const minTop = insets.top + 6;
    const maxTop = Math.max(minTop, windowHeight - insets.bottom - focusMenuMaxHeight - 6);
    return Math.min(maxTop, Math.max(minTop, focusFabPosition.y));
  }, [focusFabPosition.y, focusMenuMaxHeight, insets.bottom, insets.top, windowHeight]);

  React.useEffect(() => {
    if (!focusFabMovedByUser) {
      setFocusFabPosition(getDefaultFocusFabPosition());
      return;
    }
    setFocusFabPosition((current) => clampFocusFabPosition(current.x, current.y));
  }, [clampFocusFabPosition, focusFabMovedByUser, getDefaultFocusFabPosition]);

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
    setStagedEntrySelection(null);
  }, [focusMenuOpen, activeGroupName, activeType]);

  React.useEffect(() => {
    setTabBarHidden(focusMode);

    if (!focusMode) {
      setGroupPickerQuery('');
    }

    return () => {
      setTabBarHidden(false);
    };
  }, [focusMode]);

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

  // Resolve current chapter's primary language for prefs persistence keys.
  const activePrimaryLanguage: PrimaryLanguage = chapters[0]?.primaryLanguage ?? 'auto';
  const langStorageKey = React.useMemo(
    () => `${PREFS_STORAGE_PREFIX}lang:${activePrimaryLanguage}`,
    [activePrimaryLanguage]
  );

  // Hydrate text/language scales from storage; otherwise apply portal-set
  // values (when explicit) or smart defaults derived from primary language.
  React.useEffect(() => {
    if (chapters.length === 0) return;
    const first = chapters[0];
    let cancelled = false;

    (async () => {
      try {
        const [masterRaw, langRaw] = await Promise.all([
          AsyncStorage.getItem(MASTER_SCALE_KEY),
          AsyncStorage.getItem(langStorageKey),
        ]);
        if (cancelled) return;

        if (masterRaw) {
          const n = Number.parseFloat(masterRaw);
          if (Number.isFinite(n)) {
            setTextScale(Math.max(0.8, Math.min(1.8, Number(n.toFixed(2)))));
          }
        }

        let nextScales: LanguageFontScales | null = null;
        if (langRaw) {
          try {
            const obj = JSON.parse(langRaw) as Partial<LanguageFontScales> | null;
            if (obj && typeof obj === 'object') {
              nextScales = {
                arabic: typeof obj.arabic === 'number' ? obj.arabic : 1,
                transliteration: typeof obj.transliteration === 'number' ? obj.transliteration : 1,
                english: typeof obj.english === 'number' ? obj.english : 1,
                urdu: typeof obj.urdu === 'number' ? obj.urdu : 1,
              };
            }
          } catch {}
        }

        if (!nextScales) {
          // Smart defaults: main language at 160%, others at 120%.
          // Portal-set explicit scales (anything other than 1) take precedence.
          const fallback = computeDefaultLanguageScales(first.primaryLanguage);
          nextScales = {
            arabic: first.fontScaleArabic && first.fontScaleArabic !== 1 ? first.fontScaleArabic : fallback.arabic,
            transliteration: first.fontScaleTransliteration && first.fontScaleTransliteration !== 1 ? first.fontScaleTransliteration : fallback.transliteration,
            english: first.fontScaleEnglish && first.fontScaleEnglish !== 1 ? first.fontScaleEnglish : fallback.english,
            urdu: first.fontScaleUrdu && first.fontScaleUrdu !== 1 ? first.fontScaleUrdu : fallback.urdu,
          };
        }

        if (!cancelled) {
          setLanguageScales(nextScales);
        }
      } catch {
        // Storage failures are non-fatal; keep current state.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chapters, langStorageKey]);

  const handleTextScaleChange = React.useCallback((next: number) => {
    const clamped = Math.max(0.8, Math.min(1.8, Number(next.toFixed(2))));
    setTextScale(clamped);
    AsyncStorage.setItem(MASTER_SCALE_KEY, String(clamped)).catch(() => {});
  }, []);

  const handleLanguageScalesChange = React.useCallback((next: LanguageFontScales) => {
    setLanguageScales(next);
    AsyncStorage.setItem(langStorageKey, JSON.stringify(next)).catch(() => {});
  }, [langStorageKey]);


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
    const query = normalizeInlineSpacing(groupPickerQuery).toLowerCase();
    const targets: ReaderEntryTarget[] = [];
    groupOptions.forEach((option) => {
      option.entries.forEach((entry) => {
        targets.push({
          groupName: option.name,
          type: option.type,
          entryTitle: entry.title,
          entrySubtitle: entry.subtitle,
        });
      });
    });

    if (!query) {
      return targets
        .filter((target) => (
          target.type === stagedType
          && normalizeGroupLabel(target.groupName) === normalizeGroupLabel(stagedGroupName)
        ))
        .sort((a, b) => a.entryTitle.localeCompare(b.entryTitle, undefined, { sensitivity: 'base' }));
    }

    const scored = targets
      .map((target) => {
        const title = normalizeInlineSpacing(target.entryTitle).toLowerCase();
        const subtitle = normalizeInlineSpacing(target.entrySubtitle ?? '').toLowerCase();
        const group = normalizeInlineSpacing(target.groupName).toLowerCase();
        const type = target.type === 'naat' ? 'naat' : 'qaseedah';
        const combined = `${title} ${subtitle} ${group} ${type}`;
        if (!combined.includes(query)) return null;

        let score = 4;
        if (title === query) score = 0;
        else if (title.startsWith(query)) score = 1;
        else if (title.includes(query)) score = 2;
        else if (group.includes(query) || subtitle.includes(query)) score = 3;

        return { target, score };
      })
      .filter((item): item is { target: ReaderEntryTarget; score: number } => Boolean(item));

    return scored
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.target.entryTitle.localeCompare(b.target.entryTitle, undefined, { sensitivity: 'base' });
      })
      .map((item) => item.target);
  }, [groupOptions, groupPickerQuery, stagedGroupName, stagedType]);

  const visibleEntryTargets = React.useMemo(
    () => filteredEntryTargets.slice(0, 120),
    [filteredEntryTargets]
  );

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

  const toEntryKey = React.useCallback(
    (target: ReaderEntryTarget) => `${target.type}::${target.groupName}::${target.entryTitle}::${target.entrySubtitle ?? ''}`,
    []
  );

  const currentActiveEntryTitle = React.useMemo(() => {
    const expandedChapter = chapters.find((chapter) => !!expanded[chapter.id]);
    const fallback = expandedChapter ?? chapters[0];
    return normalizeInlineSpacing(fallback?.entryTitle ?? '');
  }, [chapters, expanded]);

  const isCurrentEntryTarget = React.useCallback((target: ReaderEntryTarget) => {
    if (target.type !== activeType) return false;
    if (normalizeGroupLabel(target.groupName) !== normalizeGroupLabel(activeGroupName)) return false;
    return normalizeInlineSpacing(target.entryTitle).toLowerCase() === currentActiveEntryTitle.toLowerCase();
  }, [activeGroupName, activeType, currentActiveEntryTitle]);

  const showEntrySwitchNotice = React.useCallback((entryTitle: string) => {
    if (switchNoticeTimerRef.current) {
      clearTimeout(switchNoticeTimerRef.current);
    }
    setEntrySwitchNotice(`Now reading: ${normalizeInlineSpacing(entryTitle)}`);
    switchNoticeTimerRef.current = setTimeout(() => {
      setEntrySwitchNotice('');
    }, 1600);
  }, []);

  const selectedEntryKey = React.useMemo(
    () => (stagedEntrySelection ? toEntryKey(stagedEntrySelection) : ''),
    [stagedEntrySelection, toEntryKey]
  );

  const hasEntrySelection = selectedEntryKey.length > 0;

  const handleNavigateEntry = React.useCallback((target: ReaderEntryTarget) => {
    setStagedEntrySelection(target);
  }, []);

  const handleConfirmEntrySelection = React.useCallback(() => {
    if (!stagedEntrySelection) return;
    showEntrySwitchNotice(stagedEntrySelection.entryTitle);
    setActiveType(stagedEntrySelection.type);
    setActiveGroupName(stagedEntrySelection.groupName);
    setPendingEntrySelection(stagedEntrySelection);
    setFocusEntryRequiredNotice(false);
    setFocusMenuOpen(false);
    setFocusNavExpanded(false);
    setStagedEntrySelection(null);
    setGroupPickerQuery('');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [showEntrySwitchNotice, stagedEntrySelection]);

  React.useEffect(() => {
    return () => {
      if (switchNoticeTimerRef.current) {
        clearTimeout(switchNoticeTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!stagedEntrySelection) return;
    const selectedKey = toEntryKey(stagedEntrySelection);
    const stillVisible = visibleEntryTargets.some((target) => toEntryKey(target) === selectedKey);
    if (!stillVisible) {
      setStagedEntrySelection(null);
    }
  }, [stagedEntrySelection, toEntryKey, visibleEntryTargets]);

  React.useEffect(() => {
    if (!focusMenuOpen || !focusNavExpanded || stagedEntrySelection) return;
    const currentTarget = visibleEntryTargets.find((target) => isCurrentEntryTarget(target));
    if (currentTarget) {
      setStagedEntrySelection(currentTarget);
    }
  }, [focusMenuOpen, focusNavExpanded, isCurrentEntryTarget, stagedEntrySelection, visibleEntryTargets]);

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


  return (
    <View style={[styles.screen, N && { backgroundColor: N.bg }]}>
      <ImageBackground
        source={require('@/assets/images/background/gates.jpg')}
        style={[styles.bgWrap, { paddingTop: insets.top }]}
        imageStyle={styles.bgImage}
      >
        <View
          pointerEvents="none"
          style={[styles.bgOverlay, N && styles.bgOverlayNight]}
        />
      {!focusMode || focusControlsVisible ? (
        <>
          <QaseedahHeader
            title={activeGroupName}
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
            onTextScaleChange={handleTextScaleChange}
            languageScales={languageScales}
            onLanguageScalesChange={handleLanguageScalesChange}
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
                  N && { backgroundColor: 'rgba(12, 20, 34, 0.92)', borderColor: 'rgba(230, 194, 112, 0.34)' },
                ]}
              >
                {!focusMode ? (
                  <ChapterIntro
                    chapter={chapter.chapter}
                    chapterUrdu={chapter.isPoem ? undefined : (layers.urdu ? chapter.chapterUrdu : undefined)}
                    chapterArabic={chapter.isPoem ? undefined : (layers.arabic ? chapter.chapterArabic : undefined)}
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
                        const renderedArabic = (line.arabic || '').trim();
                        const renderedTranslit = (line.transliteration || '').trim();
                        const renderedEnglish = (line.translation || '').trim();
                        const renderedUrdu = (line.urdu_translation || '').trim();

                        const headingLower = (line.heading || '').toLowerCase();
                        let role: VerseRole = 'verse';
                        if (headingLower.includes('chorus (opening)')) role = 'opening-chorus';
                        else if (headingLower.includes('chorus (closing)')) role = 'closing-chorus';

                        let verseNumber: number | undefined;
                        if (role === 'verse') {
                          verseCounter += 1;
                          verseNumber = verseCounter;
                        }

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
                              isAutoTranslated={false}
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

      <View
        style={[
          styles.focusFabWrap,
          {
            top: focusMode && focusMenuOpen ? focusMenuTop : focusFabPosition.y,
            left: focusMode && focusMenuOpen ? focusMenuLeft : focusFabPosition.x,
          },
        ]}
      > 
        {focusMode && focusMenuOpen ? (
          <View
            style={[
              styles.focusMenu,
              { width: focusMenuWidth, maxWidth: focusMenuWidth, maxHeight: focusMenuMaxHeight },
              N && { backgroundColor: N.surfaceAlt, borderColor: N.border },
            ]}
          >
            <ScrollView
              style={styles.focusMenuScroll}
              contentContainerStyle={styles.focusMenuScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.focusMenuTopRow}>
                <Text style={[styles.focusHintText, N && { color: N.textMuted }]}>Two fingers zoom, one finger scroll</Text>
                <TouchableOpacity
                  style={[styles.focusMenuCloseBtn, N && { borderColor: N.border, backgroundColor: N.surface }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setFocusMenuOpen(false);
                    setStagedEntrySelection(null);
                  }}
                  hitSlop={6}
                >
                  <MaterialIcons name="close" size={14} color={N ? N.textSub : Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.focusMenuSectionToggle, N && { borderColor: N.border, backgroundColor: N.surface }]}
                activeOpacity={0.85}
                onPress={() => setFocusNavExpanded((prev) => !prev)}
              >
                <Text style={[styles.focusMenuSectionToggleText, N && { color: N.text }]}>Browse Entries</Text>
                <MaterialIcons
                  name={focusNavExpanded ? 'expand-less' : 'expand-more'}
                  size={16}
                  color={N ? N.textSub : Colors.textSecondary}
                />
              </TouchableOpacity>

              {focusNavExpanded ? (
                <>
                  <View style={[styles.focusSearchWrap, N && { borderColor: N.border, backgroundColor: N.surface }]}> 
                    <MaterialIcons name="search" size={14} color={N ? N.textMuted : Colors.textSubtle} />
                    <TextInput
                      value={groupPickerQuery}
                      onChangeText={setGroupPickerQuery}
                      placeholder="Search by title, subtitle, group"
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

                  <Text style={[styles.focusSearchSummary, N && { color: N.textMuted }]}>
                    {groupPickerQuery.trim()
                      ? `${filteredEntryTargets.length} matches${filteredEntryTargets.length > visibleEntryTargets.length ? ` (showing first ${visibleEntryTargets.length})` : ''}`
                      : `${visibleEntryTargets.length} entries in ${stagedGroupName}`}
                  </Text>

                  {currentActiveEntryTitle ? (
                    <Text style={[styles.focusCurrentEntryLine, N && { color: N.textSub }]} numberOfLines={1}>
                      Current: {currentActiveEntryTitle}
                    </Text>
                  ) : null}

                  {filteredEntryTargets.length === 0 ? (
                    <Text style={[styles.focusSearchNoMatch, N && { color: N.textMuted }]}>
                      No entries found. Try a shorter search word.
                    </Text>
                  ) : (
                    <ScrollView
                      style={styles.focusEntryList}
                      contentContainerStyle={styles.focusEntryListContent}
                      keyboardShouldPersistTaps="handled"
                    >
                      {visibleEntryTargets.map((target) => {
                        const targetKey = toEntryKey(target);
                        const isSelected = selectedEntryKey === targetKey;
                        const isCurrent = isCurrentEntryTarget(target);
                        return (
                          <TouchableOpacity
                            key={targetKey}
                            style={[
                              styles.focusEntryItem,
                              N && { borderColor: N.border, backgroundColor: N.surface },
                              isCurrent && styles.focusEntryItemCurrent,
                              isCurrent && (N
                                ? { borderColor: N.goldHairline, backgroundColor: `${N.gold}14` }
                                : { borderColor: 'rgba(184, 134, 11, 0.42)', backgroundColor: 'rgba(255, 248, 226, 0.65)' }),
                              isSelected && styles.focusEntryItemSelected,
                              isSelected && (N
                                ? { borderColor: N.accent, backgroundColor: `${N.accent}1A` }
                                : { borderColor: Colors.primary, backgroundColor: '#E8F2FF' }),
                            ]}
                            activeOpacity={0.86}
                            onPress={() => handleNavigateEntry(target)}
                          >
                            <View style={styles.focusEntryBadgeRow}>
                              {isCurrent ? (
                                <View style={[styles.focusEntryBadge, styles.focusEntryBadgeCurrent, N && { borderColor: N.goldHairline }]}> 
                                  <Text style={[styles.focusEntryBadgeText, N && { color: N.goldInk ?? N.gold }]}>Current</Text>
                                </View>
                              ) : null}
                              {isSelected ? (
                                <View style={[styles.focusEntryBadge, N && { borderColor: N.accent }]}> 
                                  <Text style={[styles.focusEntryBadgeText, N && { color: N.accent }]}>Selected</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={[styles.focusEntryTitle, N && { color: N.text }]} numberOfLines={1}>{target.entryTitle}</Text>
                            {target.entrySubtitle ? (
                              <Text
                                style={[
                                  styles.focusEntrySubtitle,
                                  N && { color: N.textSub },
                                  hasArabicScript(target.entrySubtitle) && styles.focusEntrySubtitleRtl,
                                ]}
                                numberOfLines={1}
                              >
                                {target.entrySubtitle}
                              </Text>
                            ) : null}
                            <Text style={[styles.focusEntryMeta, N && { color: N.textMuted }]} numberOfLines={1}>
                              {target.groupName} · {target.type === 'naat' ? 'Naat' : 'Qaseedah'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {entrySwitchNotice ? (
                    <Text style={[styles.focusSwitchNotice, N && { color: N.accent }]}>
                      {entrySwitchNotice}
                    </Text>
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.entryConfirmBtn,
                      !hasEntrySelection && styles.entryConfirmBtnDisabled,
                      N && {
                        borderColor: hasEntrySelection ? N.accent : N.border,
                        backgroundColor: hasEntrySelection ? `${N.accent}24` : N.surfaceAlt,
                      },
                    ]}
                    activeOpacity={0.86}
                    disabled={!hasEntrySelection}
                    onPress={handleConfirmEntrySelection}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={15}
                      color={N ? (hasEntrySelection ? N.accent : N.textMuted) : (hasEntrySelection ? Colors.primary : Colors.textSubtle)}
                    />
                    <Text
                      style={[
                        styles.entryConfirmBtnText,
                        !hasEntrySelection && styles.entryConfirmBtnTextDisabled,
                        N && hasEntrySelection && { color: N.accent },
                      ]}
                    >
                      Confirm Entry
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.focusMenuFooter}>
              <TouchableOpacity
                style={[styles.focusMenuBtn, N && { borderColor: N.border }]}
                activeOpacity={0.85}
                onPress={() => {
                  setFocusControlsVisible((prev) => !prev);
                  setFocusMenuOpen(false);
                  setStagedEntrySelection(null);
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
                  setStagedEntrySelection(null);
                }}
              >
                <MaterialIcons name="fullscreen-exit" size={16} color={N ? N.textSub : Colors.textSecondary} />
                <Text style={[styles.focusMenuBtnText, N && { color: N.textSub }]}>Exit Full Screen</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {!focusMode && focusEntryRequiredNotice ? (
          <View style={[styles.focusEntryHint, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
            <Text style={[styles.focusEntryHintText, N && { color: N.textMuted }]}>Open an entry first, then use full screen.</Text>
          </View>
        ) : null}

        {!(focusMode && focusMenuOpen) ? (
          <TouchableOpacity
            style={[
              styles.focusFab,
              N
                ? { backgroundColor: N.surfaceAlt, borderColor: N.border }
                : { backgroundColor: Colors.surface, borderColor: Colors.border },
            ]}
            activeOpacity={0.85}
            {...(focusMode ? focusFabPanResponder.panHandlers : {})}
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
                setFocusFabMovedByUser(false);
                setStagedEntrySelection(null);
                setFocusEntryRequiredNotice(false);
                return;
              }
              setFocusMenuOpen((prev) => !prev);
            }}
            onLongPress={() => {
              if (focusMode) {
                setFocusFabMovedByUser(false);
              }
            }}
          >
            <MaterialIcons
              name={!focusMode ? 'fullscreen' : 'tune'}
              size={18}
              color={N ? N.textSub : Colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      </ImageBackground>
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
    opacity: 0.55,
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    // Warm sandstone wash so the cream cards read clearly on top.
    backgroundColor: 'rgba(38, 44, 36, 0.42)',
  },
  bgOverlayNight: {
    backgroundColor: 'rgba(4, 10, 18, 0.82)',
  },
  content: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  chapterSurface: {
    backgroundColor: 'rgba(252, 249, 240, 0.96)',
    marginHorizontal: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(184, 134, 11, 0.30)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  chapterBody: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
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
    alignItems: 'flex-end',
    gap: 8,
    zIndex: 40,
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
    minWidth: 0,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: 6,
    gap: 6,
  },
  focusMenuScroll: {
    flexGrow: 0,
  },
  focusMenuScrollContent: {
    gap: 6,
    paddingBottom: 2,
  },
  focusMenuTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  focusMenuCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  focusMenuFooter: {
    gap: 6,
    paddingTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  focusHintText: {
    flex: 1,
    fontSize: 11,
    textAlign: 'left',
    color: Colors.textSubtle,
    paddingHorizontal: 2,
    paddingTop: 1,
  },
  focusMenuSectionToggle: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusMenuSectionToggleText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.2,
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
    paddingVertical: 4,
  },
  focusSearchSummary: {
    fontSize: 10,
    color: Colors.textSubtle,
    textAlign: 'center',
    fontWeight: '600',
  },
  focusCurrentEntryLine: {
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: -2,
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
    minHeight: 120,
    maxHeight: 320,
  },
  focusEntryListContent: {
    gap: 5,
    paddingBottom: 2,
  },
  focusEntryItem: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 8,
    gap: 2,
    alignItems: 'flex-start',
  },
  focusEntryItemCurrent: {
    borderColor: 'rgba(184, 134, 11, 0.42)',
    backgroundColor: 'rgba(255, 248, 226, 0.65)',
  },
  focusEntryItemSelected: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: '#E8F2FF',
  },
  focusEntryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 16,
    marginBottom: 2,
  },
  focusEntryBadge: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: 'rgba(63, 174, 90, 0.08)',
  },
  focusEntryBadgeCurrent: {
    borderColor: 'rgba(184, 134, 11, 0.42)',
    backgroundColor: 'rgba(184, 134, 11, 0.12)',
  },
  focusEntryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  focusEntryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'left',
    width: '100%',
  },
  focusEntrySubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'left',
    width: '100%',
  },
  focusEntrySubtitleRtl: {
    fontFamily: 'UrduNastaliq',
    writingDirection: 'rtl',
    lineHeight: 22,
  } as any,
  focusEntryMeta: {
    fontSize: 10,
    color: Colors.textSubtle,
    textAlign: 'left',
    width: '100%',
  },
  entryConfirmBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  entryConfirmBtnDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  entryConfirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  entryConfirmBtnTextDisabled: {
    color: Colors.textSubtle,
  },
  focusSwitchNotice: {
    fontSize: 11,
    textAlign: 'center',
    color: Colors.primary,
    fontWeight: '700',
    paddingVertical: 2,
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
