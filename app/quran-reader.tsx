import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import {
  fetchPageTafsirById,
  fetchPageTranslationById,
  fetchPageVerses,
  fetchTafsirResources,
  fetchTranslationResources,
  QuranPageVerse,
  QuranTafsirResource,
  QuranTranslationResource,
} from '@/services/quranApiService';
import { getJuzEndPage, getJuzStartPage, getMushafTotalPages, getQuarterStartsInJuz } from '@/constants/mushafJuzPages';
import { TAFSIR_FONT_MAX, TAFSIR_FONT_MIN, TAFSIR_FONT_SCALE_STORAGE_KEY, TAFSIR_FONT_STEP, clampTafsirScale } from '@/constants/tafsirSettings';
import { SURAH_NAMES } from '@/components/stream/streamConfig';
import { getCachedQuranPageUri } from '@/services/quranPageCacheService';

const NIGHT = {
  bg: '#0A0F1E',
  text: '#EEF3FC',
  textSub: '#93B4D8',
  panel: '#101829',
  border: '#1E2D47',
};

const DEFAULT_TRANSLATION_ID_BY_LANG: Record<'en' | 'ur', number> = {
  en: 131,
  ur: 819,
};

const DEFAULT_TAFSIR_ID_BY_LANG: Record<'en' | 'ur', number> = {
  en: 169,
  ur: 160,
};

const URDU_TRANSLATOR_LABEL_OVERRIDES: Record<number, string> = {
  819: 'مولانا وحید الدین خان',
};

const ADHKAR_QURAN_SOURCE = 'adhkar-duas';
const VALID_PRAYER_TIME_IDS = new Set([
  'before-fajr',
  'after-fajr',
  'after-zuhr',
  'after-jumuah',
  'after-asr',
  'after-maghrib',
  'after-isha',
]);

type ContentMode = 'translation' | 'tafsir';
type ContentLanguage = 'en' | 'ur';
type MushafMode = '15line' | '16line';

interface TafsirBlock {
  id: number;
  label: string;
  byVerseKey: Record<string, string>;
}

function toNumber(value: string | string[] | undefined, fallback: number): number {
  const text = Array.isArray(value) ? value[0] : value;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? '').trim();
}

function toArabicIndicDigits(value: number): string {
  return String(value).replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
}

function isLanguageMatch(languageName: string | undefined, locale: ContentLanguage): boolean {
  const raw = (languageName ?? '').trim().toLowerCase();
  if (!raw) return false;
  return locale === 'ur' ? raw.includes('urdu') : raw.includes('english');
}

function shouldExcludeTranslationOption(option: QuranTranslationResource): boolean {
  const searchable = `${option.name} ${option.translatedName ?? ''} ${option.authorName ?? ''}`.toLowerCase();
  return /taqi\s*usmani|taqi\s*usman|maududi|tafhim|shaykh\s*al\s*hind|shaikh\s*al\s*hind|mahmud\s*al[-\s]*hasan|mahmood\s*al[-\s]*hasan|tafsir\s*e\s*usmani|tafsir[-\s]*usmani/.test(searchable);
}

function normalizeTranslationOptions(locale: ContentLanguage, options: QuranTranslationResource[]): QuranTranslationResource[] {
  const languageScoped = options.filter((opt) => isLanguageMatch(opt.languageName, locale));
  const scoped = languageScoped.length > 0 ? languageScoped : options;
  const visible = scoped.filter((opt) => !shouldExcludeTranslationOption(opt));
  const filtered = visible.length > 0 ? visible : scoped;
  const preferred = locale === 'en' ? [131, 20, 85, 84, 22, 21] : [819, 54];
  const ordered = [
    ...preferred.map((id) => filtered.find((opt) => opt.id === id)).filter(Boolean) as QuranTranslationResource[],
    ...filtered.filter((opt) => !preferred.includes(opt.id)),
  ];
  return ordered.length > 0 ? ordered : filtered;
}

function normalizeTafsirOptions(locale: ContentLanguage, options: QuranTafsirResource[]): QuranTafsirResource[] {
  const languageScoped = options.filter((opt) => isLanguageMatch(opt.languageName, locale));
  const filtered = languageScoped.length > 0 ? languageScoped : options;
  const preferred = locale === 'en' ? [169] : [160];
  const ordered = [
    ...preferred.map((id) => filtered.find((opt) => opt.id === id)).filter(Boolean) as QuranTafsirResource[],
    ...filtered.filter((opt) => !preferred.includes(opt.id)),
  ];
  return ordered.length > 0 ? ordered : filtered;
}

function hasSameIds<T extends { id: number }>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((item, index) => item.id === b[index]?.id);
}

function pickDefaultTranslationId(language: ContentLanguage, options: QuranTranslationResource[]): number | null {
  if (options.length === 0) return null;

  const normalized = options.map((option) => ({
    ...option,
    search: `${option.name} ${option.translatedName ?? ''} ${option.authorName ?? ''}`.toLowerCase(),
  }));

  if (language === 'en') {
    const clearQuran = normalized.find((option) => /clear\s*quran|mustafa\s*khattab/.test(option.search));
    if (clearQuran) return clearQuran.id;
    const fallbackEn = normalized.find((option) => option.id === DEFAULT_TRANSLATION_ID_BY_LANG.en);
    return fallbackEn?.id ?? normalized[0].id;
  }

  const urduPreferred = normalized.find((option) => /waheed\s*uddin|wahid\s*uddin|وحید\s*الدین/.test(option.search));
  if (urduPreferred) return urduPreferred.id;
  const fallbackUrdu = normalized.find(
    (option) => option.id === DEFAULT_TRANSLATION_ID_BY_LANG.ur || option.id === 54,
  );
  return fallbackUrdu?.id ?? normalized[0].id;
}

function pickDefaultTafsirId(language: ContentLanguage, options: QuranTafsirResource[]): number | null {
  if (options.length === 0) return null;

  const normalized = options.map((option) => ({
    ...option,
    search: `${option.name} ${option.translatedName ?? ''} ${option.authorName ?? ''}`.toLowerCase(),
  }));

  const ibnKathir = normalized.find((option) => /ibn\s*kathir|ibn\s*katheer|ابن\s*کثیر|ابن\s*كثير/.test(option.search));
  if (ibnKathir) return ibnKathir.id;

  const fallback = normalized.find((option) => option.id === DEFAULT_TAFSIR_ID_BY_LANG[language]);
  return fallback?.id ?? normalized[0].id;
}

function buildTafsirPreviewSnippet(text: string, language: ContentLanguage): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const maxChars = language === 'ur' ? 170 : 140;
  if (normalized.length <= maxChars) return normalized;

  const slice = normalized.slice(0, maxChars);
  const boundaryChars = language === 'ur' ? ['۔', '!', '?', '.'] : ['.', '!', '?'];
  let lastBoundary = -1;
  for (const char of boundaryChars) {
    const idx = slice.lastIndexOf(char);
    if (idx > lastBoundary) lastBoundary = idx;
  }

  if (lastBoundary >= Math.floor(maxChars * 0.55)) {
    return slice.slice(0, lastBoundary + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(' ');
  const clipped = lastSpace >= Math.floor(maxChars * 0.45)
    ? slice.slice(0, lastSpace)
    : slice;
  return `${clipped.trim()}…`;
}

function buildTafsirParagraphs(text: string, language: ContentLanguage): string[] {
  const normalized = text.replace(/\r/g, '\n').replace(/\u00A0/g, ' ').trim();
  if (!normalized) return [];

  const withStructuralBreaks = normalized
    .replace(/\s+([0-9]{1,2}[\.)])\s+/g, '\n$1 ')
    .replace(/\s+([٠-٩]{1,2}[\.)])\s+/g, '\n$1 ')
    .replace(/\s+[•▪◦]\s+/g, '\n• ');

  const explicitBlocks = withStructuralBreaks
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (explicitBlocks.length > 1) return explicitBlocks;

  const sentenceRegex = language === 'ur'
    ? /[^.!?۔\n]+[.!?۔]?/g
    : /[^.!?\n]+[.!?]?/g;
  const sentenceCandidates = withStructuralBreaks.match(sentenceRegex) ?? [];
  const sentences = sentenceCandidates.map((part) => part.trim()).filter(Boolean);

  if (sentences.length < 3) return [withStructuralBreaks];

  const grouped: string[] = [];
  const targetChars = language === 'ur' ? 220 : 180;
  let chunk = '';

  for (const sentence of sentences) {
    const candidate = chunk ? `${chunk} ${sentence}` : sentence;
    if (chunk && candidate.length > targetChars) {
      grouped.push(chunk.trim());
      chunk = sentence;
      continue;
    }
    chunk = candidate;
  }

  if (chunk.trim()) {
    grouped.push(chunk.trim());
  }

  return grouped;
}

export default function QuranReaderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { nightMode } = useNightMode();
  const params = useLocalSearchParams();

  const startPage = useMemo(() => Math.max(1, toNumber(params.startPage, 1)), [params.startPage]);
  const endPage = useMemo(() => Math.max(startPage, toNumber(params.endPage, startPage)), [params.endPage, startPage]);
  const navMode = useMemo(() => {
    const raw = Array.isArray(params.navMode) ? params.navMode[0] : params.navMode;
    return raw === 'juz' || raw === 'quarter' ? raw : null;
  }, [params.navMode]);
  const paramJuz = useMemo(() => {
    const parsed = toNumber(params.juz, 0);
    return parsed >= 1 && parsed <= 30 ? parsed : null;
  }, [params.juz]);
  const paramQuarter = useMemo(() => {
    const parsed = toNumber(params.quarter, 0);
    return parsed >= 1 && parsed <= 4 ? parsed : null;
  }, [params.quarter]);
  const mushaf = useMemo(() => {
    const raw = Array.isArray(params.mushaf) ? params.mushaf[0] : params.mushaf;
    return raw === '16line' ? '16line' : '15line';
  }, [params.mushaf]);
  const source = useMemo(() => {
    const raw = Array.isArray(params.source) ? params.source[0] : params.source;
    return raw === ADHKAR_QURAN_SOURCE ? ADHKAR_QURAN_SOURCE : null;
  }, [params.source]);
  const sourcePrayerTime = useMemo(() => {
    const raw = Array.isArray(params.prayerTime) ? params.prayerTime[0] : params.prayerTime;
    const normalized = raw === 'after-dhuhr' ? 'after-zuhr' : raw;
    return normalized && VALID_PRAYER_TIME_IDS.has(normalized) ? normalized : null;
  }, [params.prayerTime]);
  const sourceGroup = useMemo(() => {
    const raw = Array.isArray(params.group) ? params.group[0] : params.group;
    const trimmed = raw?.trim();
    return trimmed ? trimmed : null;
  }, [params.group]);
  const initialContentMode = useMemo<ContentMode | null>(() => {
    const raw = toText(params.contentMode).toLowerCase();
    return raw === 'tafsir' || raw === 'translation' ? raw : null;
  }, [params.contentMode]);
  const initialContentLang = useMemo<ContentLanguage | null>(() => {
    const raw = toText(params.contentLang).toLowerCase();
    return raw === 'ur' || raw === 'en' ? raw : null;
  }, [params.contentLang]);
  const openContentPanelParam = useMemo(() => {
    const raw = toText(params.openContentPanel).toLowerCase();
    return raw === '1' || raw === 'true' || raw === 'yes';
  }, [params.openContentPanel]);
  const focusVerseKey = useMemo(() => {
    const raw = toText(params.verseKey);
    return raw.length > 0 ? raw : null;
  }, [params.verseKey]);

  const [currentJuz, setCurrentJuz] = useState<number | null>(paramJuz);
  const [currentQuarter, setCurrentQuarter] = useState<number | null>(navMode === 'quarter' ? paramQuarter : null);
  const pendingPageRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentJuz(paramJuz);
    setCurrentQuarter(navMode === 'quarter' ? paramQuarter : null);
  }, [paramJuz, paramQuarter, navMode]);

  const activeRange = useMemo(() => {
    if (navMode === 'juz' && currentJuz) {
      return {
        start: getJuzStartPage(mushaf, currentJuz),
        end: getJuzEndPage(mushaf, currentJuz),
      };
    }

    if (navMode === 'quarter' && currentJuz && currentQuarter) {
      const starts = getQuarterStartsInJuz(mushaf, currentJuz);
      const start = starts.find((q) => q.quarter === currentQuarter)?.page ?? getJuzStartPage(mushaf, currentJuz);
      const end = currentQuarter < 4
        ? (starts.find((q) => q.quarter === currentQuarter + 1)?.page ?? (getJuzEndPage(mushaf, currentJuz) + 1)) - 1
        : getJuzEndPage(mushaf, currentJuz);
      return { start, end };
    }

    return { start: startPage, end: endPage };
  }, [navMode, currentJuz, currentQuarter, mushaf, startPage, endPage]);

  const [page, setPage] = useState(activeRange.start);
  const N = nightMode ? NIGHT : null;
  const quranTintOverlay = nightMode ? 'rgba(255, 239, 196, 0.06)' : 'rgba(255, 239, 196, 0.14)';
  const mushafTotalPages = useMemo(() => getMushafTotalPages(mushaf), [mushaf]);
  const displayPage = page + 1;
  const displayStart = activeRange.start + 1;
  const displayEnd = activeRange.end + 1;

  const [showContentPanel, setShowContentPanel] = useState(false);
  const [contentMode, setContentMode] = useState<ContentMode>('translation');
  const [contentLang, setContentLang] = useState<ContentLanguage>('en');
  const [toggleLabelLang, setToggleLabelLang] = useState<ContentLanguage>('en');
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTranslit, setShowTranslit] = useState(false);
  const [isLoadingPanelContent, setIsLoadingPanelContent] = useState(false);
  const [isLoadingPageImage, setIsLoadingPageImage] = useState(false);
  const [pageImageUri, setPageImageUri] = useState<string | null>(null);
  const [pageImageError, setPageImageError] = useState<string | null>(null);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [imageRenderNonce, setImageRenderNonce] = useState(0);
  const [translationOptionsByLang, setTranslationOptionsByLang] = useState<Record<ContentLanguage, QuranTranslationResource[]>>({ en: [], ur: [] });
  const [tafsirOptionsByLang, setTafsirOptionsByLang] = useState<Record<ContentLanguage, QuranTafsirResource[]>>({ en: [], ur: [] });
  const [selectedTranslationIdByLang, setSelectedTranslationIdByLang] = useState<Record<ContentLanguage, number | null>>({
    en: DEFAULT_TRANSLATION_ID_BY_LANG.en,
    ur: DEFAULT_TRANSLATION_ID_BY_LANG.ur,
  });
  const [selectedTafsirIdsByLang, setSelectedTafsirIdsByLang] = useState<Record<ContentLanguage, number[]>>({
    en: [DEFAULT_TAFSIR_ID_BY_LANG.en],
    ur: [DEFAULT_TAFSIR_ID_BY_LANG.ur],
  });
  const [expandedTafsirAyahByKey, setExpandedTafsirAyahByKey] = useState<Record<string, boolean>>({});
  const [tafsirFontScaleByLang, setTafsirFontScaleByLang] = useState<Record<ContentLanguage, number>>({ en: 1, ur: 1 });

  const goBackFromReader = React.useCallback(() => {
    if (source === ADHKAR_QURAN_SOURCE) {
      const nextParams: Record<string, string> = {};
      if (sourcePrayerTime) {
        nextParams.prayerTime = sourcePrayerTime;
      }
      if (sourceGroup) {
        nextParams.group = sourceGroup;
      }

      if (Object.keys(nextParams).length > 0) {
        router.replace({ pathname: '/(tabs)/duas', params: nextParams } as any);
      } else {
        router.replace('/(tabs)/duas');
      }
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/quran');
  }, [router, source, sourceGroup, sourcePrayerTime]);

  useFocusEffect(
    React.useCallback(() => {
      if (source !== ADHKAR_QURAN_SOURCE) return undefined;

      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goBackFromReader();
        return true;
      });

      return () => subscription.remove();
    }, [goBackFromReader, source])
  );
  const [pageVerses, setPageVerses] = useState<QuranPageVerse[]>([]);
  const [translationByVerseKey, setTranslationByVerseKey] = useState<Record<string, string>>({});
  const [tafsirBlocks, setTafsirBlocks] = useState<TafsirBlock[]>([]);

  const pageVersesCacheRef = useRef<Record<number, QuranPageVerse[]>>({});
  const pageTranslationCacheRef = useRef<Record<string, Record<string, string>>>({});
  const pageTafsirCacheRef = useRef<Record<string, TafsirBlock>>({});
  const contentBodyScrollRef = useRef<ScrollView | null>(null);
  const tafsirAyahOffsetRef = useRef<Record<string, number>>({});

  const zoomScale = useSharedValue(1);
  const savedZoomScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    if (pendingPageRef.current !== null) {
      const target = pendingPageRef.current;
      pendingPageRef.current = null;
      setPage(Math.min(activeRange.end, Math.max(activeRange.start, target)));
      return;
    }
    setPage(activeRange.start);
  }, [activeRange.start, activeRange.end]);

  useEffect(() => {
    zoomScale.value = 1;
    savedZoomScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [page, zoomScale, savedZoomScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const goToNextSegment = useMemo(
    () => () => {
      if (navMode === 'juz' && currentJuz && currentJuz < 30) {
        setCurrentJuz(currentJuz + 1);
      }
      if (navMode === 'quarter' && currentJuz && currentQuarter) {
        if (currentQuarter < 4) {
          setCurrentQuarter(currentQuarter + 1);
          return;
        }
        if (currentJuz < 30) {
          setCurrentJuz(currentJuz + 1);
          setCurrentQuarter(1);
        }
      }
    },
    [navMode, currentJuz, currentQuarter]
  );

  const goToPreviousSegment = useMemo(
    () => () => {
      if (navMode === 'juz' && currentJuz && currentJuz > 1) {
        const previousJuz = currentJuz - 1;
        pendingPageRef.current = getJuzEndPage(mushaf, previousJuz);
        setCurrentJuz(previousJuz);
      }
      if (navMode === 'quarter' && currentJuz && currentQuarter) {
        if (currentQuarter > 1) {
          const starts = getQuarterStartsInJuz(mushaf, currentJuz);
          const currentQuarterStart =
            starts.find((item) => item.quarter === currentQuarter)?.page ?? getJuzStartPage(mushaf, currentJuz);
          pendingPageRef.current = Math.max(getJuzStartPage(mushaf, currentJuz), currentQuarterStart - 1);
          setCurrentQuarter(currentQuarter - 1);
          return;
        }
        if (currentJuz > 1) {
          const previousJuz = currentJuz - 1;
          pendingPageRef.current = getJuzEndPage(mushaf, previousJuz);
          setCurrentJuz(previousJuz);
          setCurrentQuarter(4);
        }
      }
    },
    [navMode, currentJuz, currentQuarter, mushaf]
  );

  const goToPreviousPage = useMemo(
    () => () => {
      if (page > activeRange.start) {
        setPage((p) => p - 1);
        return;
      }

      if (navMode === 'juz' || navMode === 'quarter') {
        goToPreviousSegment();
        return;
      }

      if (page > 1) {
        setPage((p) => p - 1);
      }
    },
    [page, activeRange.start, navMode, goToPreviousSegment]
  );

  const goToNextPage = useMemo(
    () => () => {
      if (page < activeRange.end) {
        setPage((p) => p + 1);
        return;
      }

      if (navMode === 'juz' || navMode === 'quarter') {
        goToNextSegment();
        return;
      }

      if (page < mushafTotalPages) {
        setPage((p) => p + 1);
      }
    },
    [page, activeRange.end, navMode, mushafTotalPages, goToNextSegment]
  );

  useEffect(() => {
    if (!showContentPanel) {
      setShowSourcePicker(false);
      // On native, expo-image can occasionally keep a stale surface after
      // closing the overlay panel. Remounting the image forces a clean draw.
      setImageRenderNonce((prev) => prev + 1);
    }
  }, [showContentPanel]);

  useEffect(() => {
    if (!showContentPanel || contentMode !== 'tafsir') return;
    setExpandedTafsirAyahByKey({});
  }, [showContentPanel, contentMode, contentLang, displayPage, selectedTafsirIdsByLang]);

  useEffect(() => {
    let cancelled = false;

    const resolvePageImage = async () => {
      setIsLoadingPageImage(true);
      setPageImageError(null);

      try {
        const cachedUri = await getCachedQuranPageUri(mushaf as MushafMode, page);
        if (cancelled) return;
        setPageImageUri(cachedUri);
      } catch {
        if (cancelled) return;
        setPageImageUri(null);
        setPageImageError('Unable to download this Quran page. Check internet once to cache it.');
      } finally {
        if (!cancelled) {
          setIsLoadingPageImage(false);
        }
      }
    };

    void resolvePageImage();
    return () => {
      cancelled = true;
    };
  }, [mushaf, page, imageRenderNonce]);

  useEffect(() => {
    let mounted = true;
    const loadSavedTafsirScale = async () => {
      try {
        const raw = await AsyncStorage.getItem(TAFSIR_FONT_SCALE_STORAGE_KEY);
        if (!raw || !mounted) return;
        const parsed = JSON.parse(raw) as Partial<Record<ContentLanguage, number>>;
        setTafsirFontScaleByLang({
          en: clampTafsirScale(parsed.en ?? 1),
          ur: clampTafsirScale(parsed.ur ?? 1),
        });
      } catch {
        // Ignore malformed persisted value and keep defaults.
      }
    };

    void loadSavedTafsirScale();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(TAFSIR_FONT_SCALE_STORAGE_KEY, JSON.stringify(tafsirFontScaleByLang)).catch(() => {
      // Best-effort persistence only.
    });
  }, [tafsirFontScaleByLang]);

  useEffect(() => {
    if (!openContentPanelParam) return;
    setShowContentPanel(true);
    if (initialContentMode) {
      setContentMode(initialContentMode);
    }
    if (initialContentLang) {
      setContentLang(initialContentLang);
    }
  }, [initialContentLang, initialContentMode, openContentPanelParam]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setToggleLabelLang((prev) => (prev === 'en' ? 'ur' : 'en'));
    }, 4000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setShowSourcePicker(false);
  }, [contentMode, contentLang]);

  useEffect(() => {
    if (!showContentPanel) return;
    let cancelled = false;

    const loadSources = async () => {
      if (contentMode === 'translation') {
        const existing = translationOptionsByLang[contentLang] ?? [];
        if (existing.length > 0) {
          const normalizedExisting = normalizeTranslationOptions(contentLang, existing);
          if (!hasSameIds(existing, normalizedExisting)) {
            setTranslationOptionsByLang((prev) => ({ ...prev, [contentLang]: normalizedExisting }));
          }
          return;
        }
      }

      if (contentMode === 'tafsir') {
        const existing = tafsirOptionsByLang[contentLang] ?? [];
        if (existing.length > 0) {
          const normalizedExisting = normalizeTafsirOptions(contentLang, existing);
          if (!hasSameIds(existing, normalizedExisting)) {
            setTafsirOptionsByLang((prev) => ({ ...prev, [contentLang]: normalizedExisting }));
          }
          return;
        }
      }

      setIsLoadingSources(true);
      try {
        if (contentMode === 'translation') {
          const options = await fetchTranslationResources(contentLang);
          if (cancelled) return;

          const finalOptions = normalizeTranslationOptions(contentLang, options);

          setTranslationOptionsByLang((prev) => ({ ...prev, [contentLang]: finalOptions }));
          if (finalOptions.length > 0) {
            const preferredDefaultId = pickDefaultTranslationId(contentLang, finalOptions);
            setSelectedTranslationIdByLang((prev) => {
              const current = prev[contentLang];
              const hasCurrent = current !== null && finalOptions.some((opt) => opt.id === current);
              if (hasCurrent) return prev;
              return { ...prev, [contentLang]: preferredDefaultId ?? finalOptions[0].id };
            });
          }
        } else {
          const options = await fetchTafsirResources(contentLang);
          if (cancelled) return;

          const finalOptions = normalizeTafsirOptions(contentLang, options);

          setTafsirOptionsByLang((prev) => ({ ...prev, [contentLang]: finalOptions }));
          if (selectedTafsirIdsByLang[contentLang].length === 0 && finalOptions.length > 0) {
            const preferredDefaultId = pickDefaultTafsirId(contentLang, finalOptions);
            setSelectedTafsirIdsByLang((prev) => ({
              ...prev,
              [contentLang]: [preferredDefaultId ?? finalOptions[0].id],
            }));
          }
        }
      } finally {
        if (!cancelled) setIsLoadingSources(false);
      }
    };

    void loadSources();
    return () => {
      cancelled = true;
    };
  }, [
    contentLang,
    contentMode,
    selectedTafsirIdsByLang,
    selectedTranslationIdByLang,
    showContentPanel,
    tafsirOptionsByLang,
    translationOptionsByLang,
  ]);

  useEffect(() => {
    if (contentMode !== 'translation') return;
    const options = translationOptionsByLang[contentLang] ?? [];
    if (options.length === 0) return;

    const validIds = new Set(options.map((opt) => opt.id));
    const preferredDefaultId = pickDefaultTranslationId(contentLang, options);
    const fallbackId = preferredDefaultId && validIds.has(preferredDefaultId) ? preferredDefaultId : options[0].id;

    setSelectedTranslationIdByLang((prev) => {
      const current = prev[contentLang];
      const next = current !== null && validIds.has(current) ? current : fallbackId;
      if (current === next) return prev;
      return { ...prev, [contentLang]: next };
    });
  }, [contentLang, contentMode, translationOptionsByLang]);

  useEffect(() => {
    if (contentMode !== 'tafsir') return;
    const options = tafsirOptionsByLang[contentLang] ?? [];
    if (options.length === 0) return;

    const validIds = new Set(options.map((opt) => opt.id));
    const preferredDefaultId = pickDefaultTafsirId(contentLang, options);
    const fallbackId = preferredDefaultId && validIds.has(preferredDefaultId) ? preferredDefaultId : options[0].id;
    setSelectedTafsirIdsByLang((prev) => {
      const current = prev[contentLang] ?? [];
      const retained = current.filter((id) => validIds.has(id));
      const next = retained.length > 0 ? retained : [fallbackId];
      const unchanged = current.length === next.length && current.every((id, index) => id === next[index]);
      if (unchanged) return prev;
      return { ...prev, [contentLang]: next };
    });
  }, [contentLang, contentMode, tafsirOptionsByLang]);

  useEffect(() => {
    if (!showContentPanel) return;

    let cancelled = false;
    const selectedTranslationId = selectedTranslationIdByLang[contentLang] ?? null;
    const selectedTafsirIds = selectedTafsirIdsByLang[contentLang] ?? [];

    const loadPanelContent = async () => {
      setIsLoadingPanelContent(true);
      try {
        let verses = pageVersesCacheRef.current[displayPage];
        if (!verses) {
          verses = await fetchPageVerses(displayPage);
          pageVersesCacheRef.current[displayPage] = verses;
        }
        if (cancelled) return;
        setPageVerses(verses);

        if (contentMode === 'translation') {
          setTafsirBlocks([]);
          if (!selectedTranslationId) {
            setTranslationByVerseKey({});
            return;
          }

          const cacheKey = `${displayPage}:${contentLang}:${selectedTranslationId}`;
          let nextMap = pageTranslationCacheRef.current[cacheKey];
          if (!nextMap) {
            nextMap = await fetchPageTranslationById(displayPage, selectedTranslationId, contentLang);
            pageTranslationCacheRef.current[cacheKey] = nextMap;
          }
          if (cancelled) return;
          setTranslationByVerseKey(nextMap);
          return;
        }

        const tafsirTranslationId = selectedTranslationIdByLang[contentLang] ?? DEFAULT_TRANSLATION_ID_BY_LANG[contentLang];
        const tafsirTranslationCacheKey = `${displayPage}:${contentLang}:${tafsirTranslationId}`;
        let tafsirTranslationMap = pageTranslationCacheRef.current[tafsirTranslationCacheKey];
        if (!tafsirTranslationMap) {
          tafsirTranslationMap = await fetchPageTranslationById(displayPage, tafsirTranslationId, contentLang);
          pageTranslationCacheRef.current[tafsirTranslationCacheKey] = tafsirTranslationMap;
        }
        if (cancelled) return;
        setTranslationByVerseKey(tafsirTranslationMap);

        if (selectedTafsirIds.length === 0) {
          setTafsirBlocks([]);
          return;
        }

        const blocks: TafsirBlock[] = [];
        for (const tafsirId of selectedTafsirIds) {
          const cacheKey = `${displayPage}:${contentLang}:${tafsirId}`;
          let cachedBlock = pageTafsirCacheRef.current[cacheKey];
          if (!cachedBlock) {
            const payload = await fetchPageTafsirById(displayPage, tafsirId, contentLang);
            cachedBlock = {
              id: tafsirId,
              label: payload.label || `Tafsir ${tafsirId}`,
              byVerseKey: payload.byVerseKey,
            };
            pageTafsirCacheRef.current[cacheKey] = cachedBlock;
          }
          blocks.push(cachedBlock);
        }
        if (cancelled) return;
        setTafsirBlocks(blocks);
      } finally {
        if (!cancelled) setIsLoadingPanelContent(false);
      }
    };

    void loadPanelContent();
    return () => {
      cancelled = true;
    };
  }, [contentLang, contentMode, displayPage, selectedTafsirIdsByLang, selectedTranslationIdByLang, showContentPanel]);

  const activeTranslationOptions = translationOptionsByLang[contentLang] ?? [];
  const activeTafsirOptions = tafsirOptionsByLang[contentLang] ?? [];
  const selectedTranslationId = selectedTranslationIdByLang[contentLang] ?? null;
  const selectedTafsirIds = selectedTafsirIdsByLang[contentLang] ?? [];
  const focusVerseRows = focusVerseKey
    ? pageVerses.filter((verse) => verse.verseKey === focusVerseKey)
    : [];
  const visibleVerses = focusVerseRows.length > 0 ? focusVerseRows : pageVerses;
  const hasTranslationRows = visibleVerses.some((verse) => !!translationByVerseKey[verse.verseKey]);

  const formatVerseNumber = (verseNumber: number) => {
    return contentLang === 'ur' ? toArabicIndicDigits(verseNumber) : String(verseNumber);
  };

  const getSurahName = (surahNumber: number): string => {
    return SURAH_NAMES[surahNumber] ?? `Surah ${surahNumber}`;
  };

  const getTafsirVerseMeta = (verse: QuranPageVerse): string => {
    const surahLabel = contentLang === 'ur'
      ? `سورۃ ${toArabicIndicDigits(verse.surahNumber)}`
      : getSurahName(verse.surahNumber);
    const ayahLabel = contentLang === 'ur'
      ? `آیت ${formatVerseNumber(verse.verseNumber)}`
      : `Ayah ${verse.verseNumber}`;
    return `${surahLabel} • ${ayahLabel}`;
  };

  const translationFallback = contentLang === 'ur' ? 'ترجمہ جلد دستیاب ہوگا۔' : 'Translation coming soon.';
  const tafsirFallback = contentLang === 'ur' ? 'تفسیر جلد دستیاب ہوگی۔' : 'Tafsir coming soon.';
  const contentPanelHeight = Math.min(windowHeight * 0.9, windowHeight - insets.top - 12);
  const toggleButtonLabel = toggleLabelLang === 'ur' ? 'ترجمہ / تفسیر' : 'Translation / Tafsir';
  const sourceListHeight = contentLang === 'ur' ? 62 : 52;
  const getTranslationOptionLabel = (option: QuranTranslationResource) =>
    contentLang === 'ur'
      ? (URDU_TRANSLATOR_LABEL_OVERRIDES[option.id] || option.translatedName || option.name)
      : option.name;
  const getTafsirOptionLabel = (option: QuranTafsirResource) =>
    contentLang === 'ur'
      ? (option.translatedName || option.name)
      : option.name;
  const tafsirFontScale = tafsirFontScaleByLang[contentLang] ?? 1;
  const previewLineCount = contentLang === 'ur' ? 3 : 2;
  const nextAyahLabel = contentLang === 'ur' ? 'اگلی آیت' : 'Next ayah';
  const textSizeLabel = contentLang === 'ur' ? 'متن' : 'Text';
  const canZoomOut = tafsirFontScale > TAFSIR_FONT_MIN + 0.001;
  const canZoomIn = tafsirFontScale < TAFSIR_FONT_MAX - 0.001;
  const previewFadeColors: readonly [string, string] = N
    ? ['rgba(16,24,41,0)', 'rgba(16,24,41,0.96)']
    : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.96)'];
  const scaledPreviewTextStyle = contentLang === 'ur'
    ? { fontSize: Math.round(19 * tafsirFontScale), lineHeight: Math.round(32 * tafsirFontScale) }
    : { fontSize: Math.round(13 * tafsirFontScale), lineHeight: Math.round(22 * tafsirFontScale) };
  const scaledTafsirTextStyle = contentLang === 'ur'
    ? { fontSize: Math.round(22 * tafsirFontScale), lineHeight: Math.round(42 * tafsirFontScale) }
    : { fontSize: Math.round(15 * tafsirFontScale), lineHeight: Math.round(27 * tafsirFontScale) };
  const scaledTafsirMetaStyle = contentLang === 'ur'
    ? { fontSize: Math.round(18 * Math.max(0.9, tafsirFontScale * 0.95)), lineHeight: Math.round(30 * Math.max(0.9, tafsirFontScale * 0.95)) }
    : { fontSize: Math.round(12 * Math.max(0.92, tafsirFontScale * 0.95)), lineHeight: Math.round(17 * Math.max(0.92, tafsirFontScale * 0.95)) };

  const imageGestures = useMemo(
    () => Gesture.Simultaneous(
      Gesture.Pan()
        .enabled(!showContentPanel)
        .activeOffsetX([-8, 8])
        .activeOffsetY([-8, 8])
        .onUpdate((e) => {
          if (zoomScale.value <= 1.05) return;

          const maxOffset = 320 * (zoomScale.value - 1);
          const nextX = savedTranslateX.value + e.translationX;
          const nextY = savedTranslateY.value + e.translationY;
          translateX.value = Math.max(-maxOffset, Math.min(maxOffset, nextX));
          translateY.value = Math.max(-maxOffset, Math.min(maxOffset, nextY));
        })
        .onEnd((e) => {
          if (zoomScale.value > 1.05) {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
            return;
          }

          const absX = Math.abs(e.translationX);
          const absY = Math.abs(e.translationY);
          if (absX < 16 && absY < 16) return;

          // Support both horizontal and vertical page swipes.
          if (absY > absX) {
            if (e.translationY < -24 || e.velocityY < -250) runOnJS(goToNextPage)();
            else if (e.translationY > 24 || e.velocityY > 250) runOnJS(goToPreviousPage)();
            return;
          }

          if (e.translationX < -24 || e.velocityX < -250) runOnJS(goToPreviousPage)();
          else if (e.translationX > 24 || e.velocityX > 250) runOnJS(goToNextPage)();
        }),
      Gesture.Pinch()
        .enabled(!showContentPanel)
        .onUpdate((e) => {
          zoomScale.value = Math.max(1, Math.min(savedZoomScale.value * e.scale, 4));
        })
        .onEnd(() => {
          if (zoomScale.value < 1.05) {
            zoomScale.value = withSpring(1, { damping: 20, stiffness: 280 });
            savedZoomScale.value = 1;
            translateX.value = withSpring(0, { damping: 20, stiffness: 280 });
            translateY.value = withSpring(0, { damping: 20, stiffness: 280 });
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            return;
          }
          savedZoomScale.value = zoomScale.value;

          const maxOffset = 320 * (zoomScale.value - 1);
          translateX.value = Math.max(-maxOffset, Math.min(maxOffset, translateX.value));
          translateY.value = Math.max(-maxOffset, Math.min(maxOffset, translateY.value));
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        })
    ),
    [goToNextPage, goToPreviousPage, showContentPanel, zoomScale, savedZoomScale, translateX, translateY, savedTranslateX, savedTranslateY]
  );

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: zoomScale.value }],
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
    <View style={[styles.container, { backgroundColor: N ? N.bg : '#000' }]}>
      <GestureDetector gesture={imageGestures}>
      <View
        style={[styles.viewerPanel, N && { backgroundColor: N.panel, borderColor: N.border }]}
      >
        <View style={[styles.topOverlay, { top: insets.top + 8 }, N && { backgroundColor: 'rgba(16,24,41,0.72)', borderColor: N.border }]}> 
        <TouchableOpacity
          onPress={goBackFromReader}
          style={[styles.backBtn, N && { borderColor: N.border }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.backBtnText, N && { color: N.text }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.sub, N && { color: N.textSub }]}>Pages {displayStart}-{displayEnd}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[
            styles.translateToggleBtn,
            N && { borderColor: N.border },
            showContentPanel && styles.translateToggleBtnActive,
          ]}
          onPress={() => setShowContentPanel((prev) => !prev)}
          activeOpacity={0.85}
        >
          <Text style={[
            styles.translateToggleText,
            toggleLabelLang === 'ur' && styles.translateToggleTextUrdu,
            N && { color: N.text },
            showContentPanel && styles.translateToggleTextActive,
          ]}>
            {toggleButtonLabel}
          </Text>
        </TouchableOpacity>
      </View>

        {pageImageUri ? (
          <Reanimated.View style={[styles.imageWrap, zoomStyle]}>
            <Image
              key={`quran-image-${mushaf}-${page}-${imageRenderNonce}`}
              source={{ uri: pageImageUri }}
              style={styles.image}
              contentFit="contain"
              transition={80}
            />
            <View pointerEvents="none" style={[styles.quranTintOverlay, { backgroundColor: quranTintOverlay }]} />
          </Reanimated.View>
        ) : isLoadingPageImage ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color={N ? '#9FC8FF' : '#4B7BE5'} />
            <Text style={[styles.emptyTitle, N && { color: N.text }]}>Downloading Quran page...</Text>
            <Text style={[styles.emptySub, N && { color: N.textSub }]}>Page: {displayPage}</Text>
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, N && { color: N.text }]}>Unable to load Quran page</Text>
            <Text style={[styles.emptySub, N && { color: N.textSub }]}>{pageImageError ?? 'Please check your internet and try again.'}</Text>
            <Text style={[styles.emptySub, N && { color: N.textSub }]}>Requested page: {displayPage}</Text>
          </View>
        )}

        <View style={[styles.bottomOverlay, N && { backgroundColor: 'rgba(16,24,41,0.72)', borderColor: N.border }]}>
          <Text style={[styles.pageText, N && { color: N.textSub }]}>Page {displayPage}</Text>
        </View>

        {showContentPanel ? (
          <View style={styles.contentOverlayWrap}>
            <TouchableOpacity style={styles.contentOverlayBackdrop} activeOpacity={1} onPress={() => setShowContentPanel(false)} />
            <View
              style={[
                styles.contentPanel,
                { height: contentPanelHeight },
                N && { backgroundColor: N.panel, borderTopColor: N.border },
              ]}
            >
              <View style={styles.contentPanelHeader}>
                <View style={styles.contentNavGroup}>
                  <TouchableOpacity
                    style={[styles.contentNavBtn, page <= 1 && styles.contentNavBtnDisabled]}
                    onPress={goToPreviousPage}
                    disabled={page <= 1}
                  >
                    <Text style={styles.contentNavBtnText}>{'<'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.contentPanelPage, N && { color: N.textSub }]}>
                    {contentLang === 'ur' ? `صفحہ ${toArabicIndicDigits(displayPage)}` : `Page ${displayPage}`}
                  </Text>
                  <TouchableOpacity
                    style={[styles.contentNavBtn, page >= mushafTotalPages && styles.contentNavBtnDisabled]}
                    onPress={goToNextPage}
                    disabled={page >= mushafTotalPages}
                  >
                    <Text style={styles.contentNavBtnText}>{'>'}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setShowContentPanel(false)} style={styles.contentCloseBtn}>
                  <Text style={styles.contentCloseBtnText}>Close</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.selectorRow}>
                <TouchableOpacity
                  style={[styles.selectorChip, contentMode === 'translation' && styles.selectorChipActive]}
                  onPress={() => setContentMode('translation')}
                >
                  <Text style={[styles.selectorChipText, contentMode === 'translation' && styles.selectorChipTextActive]}>Translation</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectorChip, contentMode === 'tafsir' && styles.selectorChipActive]}
                  onPress={() => setContentMode('tafsir')}
                >
                  <Text style={[styles.selectorChipText, contentMode === 'tafsir' && styles.selectorChipTextActive]}>Tafsir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectorChip, contentLang === 'en' && styles.selectorChipActive]}
                  onPress={() => setContentLang('en')}
                >
                  <Text style={[styles.selectorChipText, contentLang === 'en' && styles.selectorChipTextActive]}>English</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.selectorChip, contentLang === 'ur' && styles.selectorChipActive]}
                  onPress={() => setContentLang('ur')}
                >
                  <Text style={[styles.selectorChipText, contentLang === 'ur' && styles.selectorChipTextActive]}>اردو</Text>
                </TouchableOpacity>
                {contentMode === 'translation' ? (
                  <TouchableOpacity
                    style={[styles.selectorChip, showTranslit && styles.selectorChipActive]}
                    onPress={() => setShowTranslit((prev) => !prev)}
                  >
                    <Text style={[styles.selectorChipText, showTranslit && styles.selectorChipTextActive]}>Translit</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.sourceToggleRow}>
                <TouchableOpacity
                  style={[styles.sourcePickerBtn, showSourcePicker && styles.sourcePickerBtnActive]}
                  onPress={() => setShowSourcePicker((prev) => !prev)}
                >
                  <Text style={[styles.sourcePickerBtnText, showSourcePicker && styles.sourcePickerBtnTextActive]}>
                    {contentMode === 'translation'
                      ? (contentLang === 'ur' ? 'مترجم منتخب کریں' : 'Select Translation')
                      : (contentLang === 'ur' ? 'تفسیر منتخب کریں' : 'Select Tafsir')}
                  </Text>
                </TouchableOpacity>
                {contentMode === 'tafsir' ? (
                  <View style={styles.tafsirZoomGroup}>
                    <Text style={[styles.tafsirZoomLabel, N && { color: N.textSub }]}>{textSizeLabel}</Text>
                    <TouchableOpacity
                      style={[styles.tafsirZoomBtn, !canZoomOut && styles.tafsirZoomBtnDisabled]}
                      disabled={!canZoomOut}
                      onPress={() => {
                        setTafsirFontScaleByLang((prev) => ({
                          ...prev,
                          [contentLang]: clampTafsirScale((prev[contentLang] ?? 1) - TAFSIR_FONT_STEP),
                        }));
                      }}
                    >
                      <Text style={styles.tafsirZoomBtnText}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tafsirZoomBtn, !canZoomIn && styles.tafsirZoomBtnDisabled]}
                      disabled={!canZoomIn}
                      onPress={() => {
                        setTafsirFontScaleByLang((prev) => ({
                          ...prev,
                          [contentLang]: clampTafsirScale((prev[contentLang] ?? 1) + TAFSIR_FONT_STEP),
                        }));
                      }}
                    >
                      <Text style={styles.tafsirZoomBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {isLoadingSources ? <ActivityIndicator size="small" color="#3FAE5A" /> : null}
              </View>

              {showSourcePicker ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={[
                    styles.sourceListScroll,
                    { height: sourceListHeight },
                    N && { borderBottomColor: 'rgba(255,255,255,0.1)' },
                  ]}
                  contentContainerStyle={styles.sourceListRow}
                >
                  {contentMode === 'translation'
                    ? activeTranslationOptions.map((opt) => {
                        const selected = selectedTranslationId === opt.id;
                        return (
                          <TouchableOpacity
                            key={`tr-${opt.id}`}
                            style={[styles.sourceChip, selected && styles.sourceChipActive]}
                            onPress={() => {
                              setSelectedTranslationIdByLang((prev) => ({ ...prev, [contentLang]: opt.id }));
                              setShowSourcePicker(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.sourceChipText,
                                contentLang === 'ur' && styles.sourceChipTextUrdu,
                                selected && styles.sourceChipTextActive,
                              ]}
                            >
                              {getTranslationOptionLabel(opt)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    : activeTafsirOptions.map((opt) => {
                        const selected = selectedTafsirIds.includes(opt.id);
                        return (
                          <TouchableOpacity
                            key={`tf-${opt.id}`}
                            style={[styles.sourceChip, selected && styles.sourceChipActive]}
                            onPress={() => {
                              setSelectedTafsirIdsByLang((prev) => {
                                const current = prev[contentLang] ?? [];
                                if (current.includes(opt.id)) {
                                  return { ...prev, [contentLang]: current.filter((id) => id !== opt.id) };
                                }
                                return { ...prev, [contentLang]: [...current, opt.id] };
                              });
                            }}
                          >
                            <Text
                              style={[
                                styles.sourceChipText,
                                contentLang === 'ur' && styles.sourceChipTextUrdu,
                                selected && styles.sourceChipTextActive,
                              ]}
                            >
                              {getTafsirOptionLabel(opt)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                </ScrollView>
              ) : null}

              {contentMode === 'tafsir' && selectedTafsirIds.length > 3 ? (
                <Text style={[styles.performanceHint, N && { color: N.textSub }]}>Using more than 3 tafsir sources may be slower on weak networks.</Text>
              ) : null}

              <ScrollView
                ref={contentBodyScrollRef}
                style={styles.contentBodyScroll}
                contentContainerStyle={[styles.contentBodyWrap, contentMode === 'tafsir' && styles.contentBodyWrapTafsir]}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {isLoadingPanelContent ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color="#3FAE5A" />
                    <Text style={[styles.loadingText, N && { color: N.textSub }]}>Loading page content...</Text>
                  </View>
                ) : contentMode === 'translation' ? (
                  hasTranslationRows ? (
                    visibleVerses.map((verse) => (
                      <View
                        key={`tr-row-${verse.verseKey}`}
                        style={[
                          styles.verseRow,
                          contentLang === 'ur' && styles.verseRowUrdu,
                          N && { borderBottomColor: 'rgba(255,255,255,0.1)' },
                        ]}
                      >
                        <View style={styles.verseNumberPill}>
                          <Text style={styles.verseNumberText}>{formatVerseNumber(verse.verseNumber)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.verseText, contentLang === 'ur' && styles.verseTextUrdu, N && { color: N.text }]}>
                            {translationByVerseKey[verse.verseKey] || translationFallback}
                          </Text>
                          {showTranslit && verse.transliteration ? (
                            <Text style={[styles.translitText, N && { color: N.textSub }]}>{verse.transliteration}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.fallbackText, contentLang === 'ur' && styles.fallbackTextUrdu, N && { color: N.textSub }]}>{translationFallback}</Text>
                  )
                ) : tafsirBlocks.length > 0 ? (
                  tafsirBlocks.map((block) => {
                    const blockRows = visibleVerses.filter((verse) => !!block.byVerseKey[verse.verseKey]);
                    const hasRows = blockRows.length > 0;
                    return (
                      <View key={`tf-block-${block.id}`} style={styles.tafsirBlock}>
                        <Text style={[styles.tafsirTitle, contentLang === 'ur' && styles.tafsirTitleUrdu, N && { color: N.text }]}>{block.label}</Text>
                        {hasRows ? (
                          blockRows.map((verse, verseIdx) => {
                            const text = block.byVerseKey[verse.verseKey];
                            if (!text) return null;
                            const nextVerse = blockRows[verseIdx + 1] ?? null;
                            const rowKey = `${block.id}:${verse.verseKey}`;
                            const isExpanded = !!expandedTafsirAyahByKey[rowKey];
                            const preview = buildTafsirPreviewSnippet(text, contentLang);
                            return (
                              <View
                                key={`tf-row-${block.id}-${verse.verseKey}`}
                                onLayout={(event) => {
                                  tafsirAyahOffsetRef.current[rowKey] = event.nativeEvent.layout.y;
                                }}
                                style={[
                                  styles.tafsirAyahCard,
                                  N && { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' },
                                ]}
                              >
                                <TouchableOpacity
                                  style={[styles.tafsirAyahHeader, contentLang === 'ur' && styles.tafsirAyahHeaderUrdu]}
                                  onPress={() => {
                                    setExpandedTafsirAyahByKey((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
                                  }}
                                  activeOpacity={0.85}
                                >
                                  <View style={styles.verseNumberPill}>
                                    <Text style={styles.verseNumberText}>{formatVerseNumber(verse.verseNumber)}</Text>
                                  </View>
                                  <View style={styles.tafsirAyahHeaderTextWrap}>
                                    <Text
                                      style={[
                                        styles.tafsirVerseMeta,
                                        contentLang === 'ur' && styles.tafsirVerseMetaUrdu,
                                        scaledTafsirMetaStyle,
                                        N && { color: N.textSub },
                                      ]}
                                    >
                                      {getTafsirVerseMeta(verse)}
                                    </Text>
                                  </View>
                                  <Text style={[styles.tafsirAyahToggleIcon, N && { color: N.textSub }]}>{isExpanded ? '−' : '+'}</Text>
                                </TouchableOpacity>
                                {!isExpanded ? (
                                  <View style={styles.tafsirPreviewWrap}>
                                    <Text
                                      numberOfLines={previewLineCount}
                                      style={[
                                        styles.tafsirPreviewText,
                                        contentLang === 'ur' && styles.tafsirPreviewTextUrdu,
                                        scaledPreviewTextStyle,
                                        N && { color: N.textSub },
                                      ]}
                                    >
                                      {preview}
                                    </Text>
                                    <LinearGradient
                                      pointerEvents="none"
                                      colors={previewFadeColors}
                                      style={styles.tafsirPreviewFade}
                                    />
                                  </View>
                                ) : null}
                                {isExpanded ? (
                                  <>
                                    {verse.arabicText ? (
                                      <View style={[styles.tafsirAyahArabicQuoteWrap, N && { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                                        <Text style={[styles.tafsirAyahArabicQuoteText, N && { color: N.text }]}>
                                          {verse.arabicText}
                                        </Text>
                                        {translationByVerseKey[verse.verseKey] ? (
                                          <Text
                                            style={[
                                              styles.tafsirAyahQuoteTranslation,
                                              contentLang === 'ur' && styles.tafsirAyahQuoteTranslationUrdu,
                                              N && { color: N.textSub },
                                            ]}
                                          >
                                            {translationByVerseKey[verse.verseKey]}
                                          </Text>
                                        ) : null}
                                      </View>
                                    ) : null}
                                    <View style={styles.tafsirExpandedWrap}>
                                      {buildTafsirParagraphs(text, contentLang).map((paragraph, idx) => (
                                        <Text
                                          key={`tf-para-${rowKey}-${idx}`}
                                          style={[
                                            styles.tafsirParagraph,
                                            styles.tafsirBodyText,
                                            contentLang === 'ur' && styles.tafsirBodyTextUrdu,
                                            scaledTafsirTextStyle,
                                            idx > 0 && styles.tafsirParagraphSpaced,
                                            N && { color: N.text },
                                          ]}
                                        >
                                          {paragraph}
                                        </Text>
                                      ))}
                                    </View>
                                    {nextVerse ? (
                                      <TouchableOpacity
                                        style={[styles.nextAyahBtn, contentLang === 'ur' && styles.nextAyahBtnUrdu]}
                                        onPress={() => {
                                          const nextKey = `${block.id}:${nextVerse.verseKey}`;
                                          setExpandedTafsirAyahByKey({ [nextKey]: true });
                                          requestAnimationFrame(() => {
                                            const y = tafsirAyahOffsetRef.current[nextKey];
                                            if (typeof y !== 'number') return;
                                            contentBodyScrollRef.current?.scrollTo({ y: Math.max(0, y - 10), animated: true });
                                          });
                                        }}
                                        activeOpacity={0.82}
                                      >
                                        <Text style={styles.nextAyahBtnText}>{nextAyahLabel}</Text>
                                        <Text style={styles.nextAyahBtnArrow}>{contentLang === 'ur' ? '‹' : '›'}</Text>
                                      </TouchableOpacity>
                                    ) : null}
                                  </>
                                ) : null}
                              </View>
                            );
                          })
                        ) : (
                          <Text style={[styles.fallbackText, contentLang === 'ur' && styles.fallbackTextUrdu, N && { color: N.textSub }]}>{tafsirFallback}</Text>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={[styles.fallbackText, contentLang === 'ur' && styles.fallbackTextUrdu, N && { color: N.textSub }]}>{tafsirFallback}</Text>
                )}
              </ScrollView>
            </View>
          </View>
        ) : null}
      </View>
      </GestureDetector>
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#274638',
  },
  headerTextWrap: {
    marginLeft: 10,
  },
  sub: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  translateToggleBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  translateToggleBtnActive: {
    backgroundColor: '#4FE948',
    borderColor: '#4FE948',
  },
  translateToggleText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#E2E8F0',
  },
  translateToggleTextUrdu: {
    fontFamily: 'UrduNastaliq',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  } as any,
  translateToggleTextActive: {
    color: '#0B2817',
  },
  viewerPanel: {
    flex: 1,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageWrap: {
    flex: 1,
  },
  quranTintOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSubtle,
    textAlign: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  contentOverlayWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    justifyContent: 'flex-end',
  },
  contentOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  contentPanel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  contentPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  contentNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(79,233,72,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentNavBtnDisabled: {
    opacity: 0.35,
  },
  contentNavBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D5A2A',
  },
  contentPanelPage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5568',
  },
  contentCloseBtn: {
    borderWidth: 1,
    borderColor: '#C7D8CE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contentCloseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3E5F4D',
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  selectorChip: {
    borderWidth: 1,
    borderColor: '#A3C5AB',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FCF9',
  },
  selectorChipActive: {
    backgroundColor: '#4FE948',
    borderColor: '#4FE948',
  },
  selectorChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2F5B40',
  },
  selectorChipTextActive: {
    color: '#0B2817',
  },
  sourceToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  sourcePickerBtn: {
    borderWidth: 1,
    borderColor: '#8DB79B',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5FBF7',
  },
  sourcePickerBtnActive: {
    backgroundColor: '#4FE948',
    borderColor: '#4FE948',
  },
  sourcePickerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#24573A',
  },
  sourcePickerBtnTextActive: {
    color: '#0B2817',
  },
  tafsirZoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tafsirZoomLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#5A6F63',
  },
  tafsirZoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#8DB79B',
    backgroundColor: '#F5FBF7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tafsirZoomBtnDisabled: {
    opacity: 0.35,
  },
  tafsirZoomBtnText: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '800',
    color: '#24573A',
  },
  sourceListRow: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  sourceListScroll: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  sourceChip: {
    borderWidth: 1,
    borderColor: '#9EC0A7',
    borderRadius: 999,
    backgroundColor: '#F8FCF9',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sourceChipActive: {
    backgroundColor: '#4FE948',
    borderColor: '#4FE948',
  },
  sourceChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D5B3C',
  },
  sourceChipTextUrdu: {
    fontFamily: 'UrduNastaliq',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  } as any,
  sourceChipTextActive: {
    color: '#0B2817',
  },
  performanceHint: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    fontSize: 11,
    color: '#557767',
    fontWeight: '600',
  },
  contentBodyScroll: {
    flex: 1,
  },
  contentBodyWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 22,
  },
  contentBodyWrapTafsir: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 28,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  loadingText: {
    fontSize: 12,
    color: '#5A6F63',
    fontWeight: '600',
  },
  verseRow: {
    flexDirection: 'row',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 9,
    alignItems: 'flex-start',
  },
  verseRowUrdu: {
    flexDirection: 'row-reverse',
  },
  verseNumberPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,233,72,0.22)',
    marginTop: 2,
  },
  verseNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E5F30',
  },
  verseText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#1F2937',
    fontWeight: '500',
  },
  verseTextUrdu: {
    writingDirection: 'rtl',
    fontFamily: 'UrduNastaliq',
    fontSize: 21,
    lineHeight: 38,
    textAlign: 'right',
    letterSpacing: 0,
  } as any,
  translitText: {
    marginTop: 4,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    color: '#6B7280',
  },
  fallbackText: {
    paddingVertical: 16,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  fallbackTextUrdu: {
    writingDirection: 'rtl',
    textAlign: 'right',
    fontFamily: 'UrduNastaliq',
    fontSize: 20,
    lineHeight: 34,
    letterSpacing: 0,
  } as any,
  tafsirBlock: {
    marginBottom: 12,
  },
  tafsirTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A2E',
    marginBottom: 4,
  },
  tafsirTitleUrdu: {
    writingDirection: 'rtl',
    textAlign: 'right',
    fontFamily: 'UrduNastaliq',
    fontSize: 17,
    lineHeight: 28,
    letterSpacing: 0,
  } as any,
  tafsirVerseMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 4,
  },
  tafsirVerseMetaUrdu: {
    writingDirection: 'rtl',
    textAlign: 'right',
    fontFamily: 'UrduNastaliq',
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 0,
  } as any,
  tafsirAyahCard: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  tafsirAyahHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tafsirAyahHeaderUrdu: {
    flexDirection: 'row-reverse',
  },
  tafsirAyahHeaderTextWrap: {
    flex: 1,
  },
  tafsirAyahToggleIcon: {
    width: 18,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#4B5563',
    lineHeight: 20,
  },
  tafsirPreviewText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 22,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'left',
  },
  tafsirPreviewWrap: {
    marginTop: 2,
    position: 'relative',
    minHeight: 56,
    justifyContent: 'flex-end',
  },
  tafsirPreviewFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 18,
  },
  tafsirPreviewTextUrdu: {
    writingDirection: 'rtl',
    textAlign: 'right',
    fontFamily: 'UrduNastaliq',
    fontSize: 19,
    lineHeight: 32,
    letterSpacing: 0,
  } as any,
  tafsirExpandedWrap: {
    marginTop: 4,
  },
  tafsirAyahArabicQuoteWrap: {
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(12,74,110,0.2)',
    backgroundColor: 'rgba(236,253,245,0.85)',
  },
  tafsirAyahArabicQuoteText: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontFamily: 'MarwanIndoPak',
    fontSize: 24,
    lineHeight: 44,
    color: '#0F172A',
    letterSpacing: 0,
  } as any,
  tafsirAyahQuoteTranslation: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 21,
    color: '#4B5563',
    fontWeight: '500',
    textAlign: 'left',
  },
  tafsirAyahQuoteTranslationUrdu: {
    writingDirection: 'rtl',
    textAlign: 'right',
    fontFamily: 'UrduNastaliq',
    fontSize: 19,
    lineHeight: 31,
    letterSpacing: 0,
  } as any,
  tafsirBodyText: {
    fontSize: 15,
    lineHeight: 27,
    color: '#1F2937',
    fontWeight: '400',
    letterSpacing: 0.12,
    textAlign: 'left',
  },
  tafsirBodyTextUrdu: {
    writingDirection: 'rtl',
    textAlign: 'right',
    fontFamily: 'UrduNastaliq',
    fontSize: 22,
    lineHeight: 42,
    letterSpacing: 0,
    fontWeight: '400',
  } as any,
  tafsirParagraph: {
    textAlignVertical: 'top',
  },
  tafsirParagraphSpaced: {
    marginTop: 12,
  },
  nextAyahBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(44,106,80,0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(44,106,80,0.08)',
  },
  nextAyahBtnUrdu: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  nextAyahBtnText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#2C6A50',
  },
  nextAyahBtnArrow: {
    fontSize: 15,
    lineHeight: 15,
    fontWeight: '800',
    color: '#2C6A50',
  },
});
