import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { HOW_TO_GUIDES } from '@/howtoguides';
import type { HowToGuide, HowToSection, HowToStep, HowToStepImage } from '@/howtoguides/types';
import { useNightMode } from '@/hooks/useNightMode';

// ── Night palette ────────────────────────────────────────────────────────
const NIGHT = {
  bg:         '#06090F',
  surface:    '#0C1220',
  surfaceAlt: '#111C32',
  border:     '#1B2E4A',
  text:       '#EEF3FC',
  textSub:    '#93B4D8',
  textMuted:  '#5A7A9E',
  accent:     '#6AAEFF',
  primary:    '#4FE948',
};

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ARABIC_SEGMENT_REGEX = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u0640\u064B-\u065F\u0670\u06D6-\u06ED]*)/g;
const ARABIC_SEGMENT_MATCH_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u0640\u064B-\u065F\u0670\u06D6-\u06ED]*/g;
const MATERIAL_ICON_NAME_REGEX = /^[a-z0-9_-]+$/i;

const ARABIC_TO_LATIN: Record<string, string> = {
  ا: 'a', أ: 'a', إ: 'i', آ: 'aa', ٱ: 'a', ء: "'", ؤ: "'u", ئ: "'i",
  ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh', د: 'd', ذ: 'dh', ر: 'r',
  ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: "'", غ: 'gh',
  ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', ة: 'h', و: 'w', ي: 'y',
  ى: 'a', ـ: '',
};

const TASHKEEL_TO_LATIN: Record<string, string> = {
  '\u064B': 'an',
  '\u064C': 'un',
  '\u064D': 'in',
  '\u064E': 'a',
  '\u064F': 'u',
  '\u0650': 'i',
  '\u0652': '',
  '\u0670': 'a',
};

const stripArabicDiacritics = (text: string) => text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');

// ── Main Screen ───────────────────────────────────────────────────────────
export default function HowToScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const N = nightMode ? NIGHT : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }, N && { backgroundColor: N.bg }]}>
      {/* Page Header — calm, JMN-style */}
      <View style={[styles.pageHeader, N && { borderBottomColor: N.border }]}>
        <View style={styles.pageHeaderRow}>
          <Image
            source={require('@/assets/images/masjid-logo.png')}
            style={styles.headerLogo}
            contentFit="contain"
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.pageMasjidName, N && { color: N.textSub }]}>Jami&apos; Masjid Noorani</Text>
            <Text style={[styles.pageTitle, N && { color: N.text }]}>How To Pray</Text>
            <Text style={[styles.pageSubtitle, N && { color: N.textMuted }]}>Step-by-step Salah guides</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <HowToContent nightMode={nightMode} />
    </View>
  );
}

// ── How To Content ────────────────────────────────────────────────────────
function HowToContent({ nightMode }: { nightMode: boolean }) {
  const N = nightMode ? NIGHT : null;
  const { width: viewportWidth } = useWindowDimensions();
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'urdu' | null>(null);
  const [selectedParentGroup, setSelectedParentGroup] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeImage, setActiveImage] = useState<{ uri: string; caption: string; source?: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const sectionYRefs = useRef<Record<string, number>>({});
  const guideYRefs = useRef<Record<string, number>>({});
  const imageZoomScale = useSharedValue(1);
  const imageSavedZoomScale = useSharedValue(1);
  const imageTranslateX = useSharedValue(0);
  const imageTranslateY = useSharedValue(0);
  const imageSavedTranslateX = useSharedValue(0);
  const imageSavedTranslateY = useSharedValue(0);

  const imageViewerVisible = activeImage !== null;
  const viewerBaseWidth = Math.max(260, viewportWidth - 28);
  const viewerBaseHeight = viewerBaseWidth * 0.62;

  const resetImageTransform = useCallback(() => {
    imageZoomScale.value = 1;
    imageSavedZoomScale.value = 1;
    imageTranslateX.value = 0;
    imageTranslateY.value = 0;
    imageSavedTranslateX.value = 0;
    imageSavedTranslateY.value = 0;
  }, [
    imageSavedTranslateX,
    imageSavedTranslateY,
    imageSavedZoomScale,
    imageTranslateX,
    imageTranslateY,
    imageZoomScale,
  ]);

  const openImageViewer = useCallback((photo: { uri: string; caption: string; source?: string }) => {
    setActiveImage(photo);
    resetImageTransform();
  }, [resetImageTransform]);

  const closeImageViewer = useCallback(() => {
    setActiveImage(null);
    resetImageTransform();
  }, [resetImageTransform]);

  const imageGestures = useMemo(
    () => Gesture.Simultaneous(
      Gesture.Pinch()
        .onUpdate((e) => {
          const nextScale = Math.max(1, Math.min(imageSavedZoomScale.value * e.scale, 4));
          imageZoomScale.value = nextScale;

          const maxOffsetX = Math.max(0, ((viewerBaseWidth * nextScale) - viewerBaseWidth) / 2);
          const maxOffsetY = Math.max(0, ((viewerBaseHeight * nextScale) - viewerBaseHeight) / 2);
          imageTranslateX.value = Math.max(-maxOffsetX, Math.min(maxOffsetX, imageTranslateX.value));
          imageTranslateY.value = Math.max(-maxOffsetY, Math.min(maxOffsetY, imageTranslateY.value));
        })
        .onEnd(() => {
          if (imageZoomScale.value < 1.03) {
            imageZoomScale.value = withSpring(1, { damping: 20, stiffness: 260 });
            imageSavedZoomScale.value = 1;
            imageTranslateX.value = withSpring(0, { damping: 20, stiffness: 260 });
            imageTranslateY.value = withSpring(0, { damping: 20, stiffness: 260 });
            imageSavedTranslateX.value = 0;
            imageSavedTranslateY.value = 0;
            return;
          }

          imageSavedZoomScale.value = imageZoomScale.value;
          const maxOffsetX = Math.max(0, ((viewerBaseWidth * imageZoomScale.value) - viewerBaseWidth) / 2);
          const maxOffsetY = Math.max(0, ((viewerBaseHeight * imageZoomScale.value) - viewerBaseHeight) / 2);
          imageTranslateX.value = Math.max(-maxOffsetX, Math.min(maxOffsetX, imageTranslateX.value));
          imageTranslateY.value = Math.max(-maxOffsetY, Math.min(maxOffsetY, imageTranslateY.value));
          imageSavedTranslateX.value = imageTranslateX.value;
          imageSavedTranslateY.value = imageTranslateY.value;
        }),
      Gesture.Pan()
        .onUpdate((e) => {
          if (imageZoomScale.value <= 1.01) return;

          const maxOffsetX = Math.max(0, ((viewerBaseWidth * imageZoomScale.value) - viewerBaseWidth) / 2);
          const maxOffsetY = Math.max(0, ((viewerBaseHeight * imageZoomScale.value) - viewerBaseHeight) / 2);
          const nextX = imageSavedTranslateX.value + e.translationX;
          const nextY = imageSavedTranslateY.value + e.translationY;

          imageTranslateX.value = Math.max(-maxOffsetX, Math.min(maxOffsetX, nextX));
          imageTranslateY.value = Math.max(-maxOffsetY, Math.min(maxOffsetY, nextY));
        })
        .onEnd(() => {
          imageSavedTranslateX.value = imageTranslateX.value;
          imageSavedTranslateY.value = imageTranslateY.value;
        }),
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
          imageZoomScale.value = withSpring(1, { damping: 20, stiffness: 260 });
          imageSavedZoomScale.value = 1;
          imageTranslateX.value = withSpring(0, { damping: 20, stiffness: 260 });
          imageTranslateY.value = withSpring(0, { damping: 20, stiffness: 260 });
          imageSavedTranslateX.value = 0;
          imageSavedTranslateY.value = 0;
        })
    ),
    [
      imageSavedTranslateX,
      imageSavedTranslateY,
      imageSavedZoomScale,
      imageTranslateX,
      imageTranslateY,
      imageZoomScale,
      viewerBaseHeight,
      viewerBaseWidth,
    ]
  );

  const imageTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: imageTranslateX.value },
      { translateY: imageTranslateY.value },
      { scale: imageZoomScale.value },
    ],
  }));

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Static guide content for now; keep gesture for consistency across tabs.
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleSectionToggle = (secKey: string) => {
    const opening = expandedSection !== secKey;
    setExpandedSection(opening ? secKey : null);
    if (opening) {
      setTimeout(() => {
        const y = sectionYRefs.current[secKey];
        if (y !== undefined) {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
        }
      }, 80);
    }
  };

  const handleGuideToggle = (guideId: string, isOpen: boolean) => {
    setExpandedGuide(isOpen ? null : guideId);
    setExpandedSection(null);
    if (!isOpen) {
      setTimeout(() => {
        const y = guideYRefs.current[guideId];
        if (y !== undefined) {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
        }
      }, 80);
    }
  };

  const activeGuides = useMemo(
    () => HOW_TO_GUIDES.filter((guide) => (guide.language ?? 'en') === (selectedLanguage === 'urdu' ? 'ur' : 'en')),
    [selectedLanguage]
  );

  const guideCards = useMemo(
    () => activeGuides.filter((guide, index, arr) => arr.findIndex(g => g.title === guide.title) === index),
    [activeGuides]
  );

  const groupedGuideCards = useMemo(() => {
    const groups = new Map<string, typeof guideCards>();
    guideCards.forEach((guide) => {
      const key = guide.parentGroup ?? 'General';
      const existing = groups.get(key) ?? [];
      existing.push(guide);
      groups.set(key, existing);
    });

    const orderedNames = Array.from(groups.keys()).sort((a, b) => {
      if (a === 'Salah') return -1;
      if (b === 'Salah') return 1;
      if (a === 'General') return 1;
      if (b === 'General') return -1;
      return a.localeCompare(b);
    });

    return orderedNames.map((name) => ({
      name,
      guides: groups.get(name) ?? [],
    }));
  }, [guideCards]);

  const parentGroupTiles = useMemo(
    () => groupedGuideCards.filter((group) => group.name !== 'General'),
    [groupedGuideCards]
  );

  const generalGuides = useMemo(
    () => groupedGuideCards.find((group) => group.name === 'General')?.guides ?? [],
    [groupedGuideCards]
  );

  const selectedGroupGuides = useMemo(
    () => groupedGuideCards.find((group) => group.name === selectedParentGroup)?.guides ?? [],
    [groupedGuideCards, selectedParentGroup]
  );

  const hasArabic = (text: string) => ARABIC_CHAR_REGEX.test(text);

  const extractArabicSegments = (text: string) => {
    const matches = text.match(ARABIC_SEGMENT_MATCH_REGEX) ?? [];
    return matches.map((m) => m.trim()).filter(Boolean);
  };

  const transliterateArabic = (text: string) => {
    const normalizedArabic = stripArabicDiacritics(text).replace(/\s+/g, ' ').trim();
    if (normalizedArabic === 'الله أكبر' || normalizedArabic === 'الله اكبر') {
      return 'allahu akbar';
    }

    let out = '';
    let prevLatin = '';

    for (const ch of Array.from(text)) {
      if (ch === 'ّ') {
        out += prevLatin;
        continue;
      }

      if (ch === ' ') {
        out += ' ';
        prevLatin = '';
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(TASHKEEL_TO_LATIN, ch)) {
        out += TASHKEEL_TO_LATIN[ch] ?? '';
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(ARABIC_TO_LATIN, ch)) {
        const latin = ARABIC_TO_LATIN[ch] ?? '';
        out += latin;
        prevLatin = latin;
        continue;
      }

      if (/[.,;:!?()\[\]{}"'\-]/.test(ch)) {
        out += ch;
        continue;
      }
    }

    return out.replace(/\s+/g, ' ').trim();
  };

  const transliterationFromText = (text: string) => {
    const segments = extractArabicSegments(text);
    const translits = segments
      .map((segment) => transliterateArabic(segment))
      .filter(Boolean);
    if (translits.length === 0) return null;
    return translits.join(' | ');
  };

  const normalizeLatin = (value: string) => value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const hasManualTransliteration = (sourceText: string, autoTransliteration: string | null) => {
    if (!autoTransliteration) return false;
    if (/transliteration\s*:/i.test(sourceText)) return true;

    const sourceLatin = normalizeLatin(sourceText.replace(ARABIC_SEGMENT_MATCH_REGEX, ' '));
    const translitLatin = normalizeLatin(autoTransliteration);
    if (!sourceLatin || !translitLatin) return false;

    const sourceTokens = new Set(sourceLatin.split(' ').filter((token) => token.length > 1));
    const translitTokens = translitLatin.split(' ').filter((token) => token.length > 1);

    if (translitTokens.length < 3) {
      return sourceLatin.includes(translitLatin);
    }

    const overlapCount = translitTokens.filter((token) => sourceTokens.has(token)).length;
    return overlapCount >= Math.min(6, Math.ceil(translitTokens.length * 0.45));
  };

  const shouldRenderAutoTransliteration = (sourceText: string, autoTransliteration: string | null) => (
    Boolean(autoTransliteration) && !hasManualTransliteration(sourceText, autoTransliteration)
  );

  const renderInlineArabic = (text: string) => {
    const chunks = text.split(ARABIC_SEGMENT_REGEX);
    return chunks.map((chunk, idx) => {
      if (!chunk) return null;
      if (hasArabic(chunk)) {
        return (
          <Text key={`ar-${idx}`} style={[howToStyles.arabicInline, N && { color: N.text }]}> 
            {chunk}
          </Text>
        );
      }
      return <React.Fragment key={`tx-${idx}`}>{chunk}</React.Fragment>;
    });
  };

  const renderArabicPanel = (content: string, key: string, sourceForDedup?: string) => {
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return (
      <View key={key} style={[howToStyles.arabicPanel, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}> 
        {lines.map((line, li) => (
          <View key={`${key}-${li}`} style={howToStyles.arabicLineWrap}>
            <Text style={[howToStyles.arabicPanelText, N && { color: N.text }]}> 
              {line}
            </Text>
            {(() => {
              const lineTransliteration = transliterationFromText(line);
              const source = sourceForDedup ?? line;
              return shouldRenderAutoTransliteration(source, lineTransliteration) ? (
              <Text style={[howToStyles.transliterationText, N && { color: N.textSub }]}> 
                {lineTransliteration}
              </Text>
              ) : null;
            })()}
          </View>
        ))}
      </View>
    );
  };

  const renderStepDetail = (detail: string) => {
    const pieces = detail.split(/```([\s\S]*?)```/g);

    return pieces.map((piece, idx) => {
      if (idx % 2 === 1) {
        return renderArabicPanel(piece, `block-${idx}`, detail);
      }

      const text = piece.trim();
      if (!text) return null;

      const longArabicAfterColon = text.match(/^([\s\S]*?:)\s*([\s\S]+)$/);
      const hasLatinLetters = /[A-Za-z]/.test(longArabicAfterColon?.[2] ?? '');
      if (
        longArabicAfterColon
        && hasArabic(longArabicAfterColon[2])
        && longArabicAfterColon[2].length > 34
        && !hasLatinLetters
      ) {
        return (
          <View key={`plain-${idx}`} style={howToStyles.detailChunk}>
            <Text style={[howToStyles.stepDetail, N && { color: N.textSub }]}>{longArabicAfterColon[1]}</Text>
            {renderArabicPanel(longArabicAfterColon[2], `inline-block-${idx}`, text)}
          </View>
        );
      }

      const transliteration = transliterationFromText(text);
      const showAutoTransliteration = shouldRenderAutoTransliteration(text, transliteration);

      return (
        <View key={`plain-${idx}`} style={howToStyles.detailChunk}>
          <Text style={[howToStyles.stepDetail, N && { color: N.textSub }]}>
            {renderInlineArabic(text)}
          </Text>
          {showAutoTransliteration ? (
            <Text style={[howToStyles.transliterationText, N && { color: N.textSub }]}> 
              {transliteration}
            </Text>
          ) : null}
        </View>
      );
    });
  };

  const splitBilingualTitle = (title: string) => {
    // Strip pronunciation helpers in parentheses like "(Witr)" — redundant when we show English + Arabic separately.
    const withoutParens = title.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const matches = withoutParens.match(ARABIC_SEGMENT_MATCH_REGEX);
    if (!matches || matches.length === 0) return { english: withoutParens, arabic: null as string | null };
    const arabic = matches.join(' ').replace(/\s+/g, ' ').trim();
    const english = withoutParens.replace(ARABIC_SEGMENT_MATCH_REGEX, ' ').replace(/\s+/g, ' ').trim();
    return { english: english || withoutParens, arabic };
  };

  const renderGuideCard = (guide: HowToGuide) => {
    const isOpen = expandedGuide === guide.id;
    const { english, arabic } = splitBilingualTitle(guide.title);
    return (
      <View
        key={guide.id}
        style={[howToStyles.guideCard, N && { backgroundColor: N.surface, borderColor: N.border }]}
        onLayout={(e) => { guideYRefs.current[guide.id] = e.nativeEvent.layout.y; }}
      >
        <TouchableOpacity
          style={howToStyles.guideHeader}
          onPress={() => handleGuideToggle(guide.id, isOpen)}
          activeOpacity={0.85}
        >
          <View style={[howToStyles.guideIcon, { backgroundColor: guide.color + '18' }]}>
            {MATERIAL_ICON_NAME_REGEX.test(guide.icon) ? (
              <MaterialIcons name={guide.icon as any} size={20} color={guide.color} />
            ) : (
              <Text style={[howToStyles.guideIconSymbol, { color: guide.color }]}>{guide.icon}</Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[howToStyles.guideTitle, N && { color: N.text }]}>{english}</Text>
            {arabic ? (
              <Text style={[howToStyles.guideTitleArabic, N && { color: N.textSub }]}>{arabic}</Text>
            ) : null}
            <Text style={[howToStyles.guideSub, N && { color: N.textMuted }]}>{guide.subtitle}</Text>
          </View>
          <MaterialIcons name={isOpen ? 'expand-less' : 'chevron-right'} size={20} color={N ? N.textMuted : Colors.textSubtle} />
        </TouchableOpacity>

        {isOpen ? (
          <View style={howToStyles.guideBody}>
            <View style={[howToStyles.introBand, { borderLeftColor: guide.color }, N && { backgroundColor: guide.color + '15' }]}>
              <Text style={[howToStyles.introText, N && { color: N.textSub }]}>{guide.intro}</Text>
            </View>

            {guide.sections.map((section: HowToSection, si: number) => {
              const secKey = guide.id + '-' + si;
              const secOpen = expandedSection === secKey;
              return (
                <View
                  key={secKey}
                  style={[howToStyles.sectionBlock, N && { borderColor: N.border }]}
                  onLayout={(e) => {
                    const guideY = guideYRefs.current[guide.id] ?? 0;
                    sectionYRefs.current[secKey] = guideY + e.nativeEvent.layout.y;
                  }}
                >
                  <TouchableOpacity
                    style={[howToStyles.sectionHeader, N && { backgroundColor: N.surfaceAlt }]}
                    onPress={() => handleSectionToggle(secKey)}
                    activeOpacity={0.8}
                  >
                    <View style={[howToStyles.sectionBullet, { backgroundColor: guide.color }]} />
                    <Text style={[howToStyles.sectionTitle, N && { color: N.text }]}>{section.heading}</Text>
                    <MaterialIcons name={secOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={18} color={N ? N.textMuted : Colors.textSubtle} />
                  </TouchableOpacity>

                  {secOpen ? (
                    <View style={howToStyles.stepsContainer}>
                      {section.steps.map((step: HowToStep, stepIdx: number) => {
                        const isWarningStep = /^warning[:\s]/i.test(step.title);
                        const warningColor = N ? '#FF7B7B' : '#D32F2F';
                        const accentColor = isWarningStep ? warningColor : guide.color;
                        const isLastStep = stepIdx === section.steps.length - 1;

                        return (
                          <View
                            key={step.step}
                            style={[
                              howToStyles.stepRow,
                              N && { borderBottomColor: N.border },
                              isLastStep && howToStyles.stepRowLast,
                            ]}
                          >
                            <View style={[howToStyles.stepNum, { backgroundColor: accentColor }]}>
                              <Text style={howToStyles.stepNumText}>{step.step}</Text>
                            </View>
                            <View style={{ flex: 1, gap: 6 }}>
                              <Text style={[howToStyles.stepTitle, { color: accentColor }, !isWarningStep && N && { color: N.text }]}>{step.title}</Text>
                              <View
                                style={[
                                  howToStyles.stepDetailWrap,
                                  isWarningStep && howToStyles.warningDetailWrap,
                                  isWarningStep && (N
                                    ? { backgroundColor: 'rgba(255,123,123,0.12)', borderColor: 'rgba(255,123,123,0.38)' }
                                    : { backgroundColor: '#FDECEC', borderColor: '#F3B8B8' }),
                                ]}
                              >
                                {renderStepDetail(step.detail)}
                              </View>
                              {step.note ? (
                                <View style={[howToStyles.noteBand, { borderLeftColor: accentColor + '80' }, N && { backgroundColor: accentColor + '12' }]}>
                                  <Text style={[howToStyles.noteText, { color: accentColor }]}>{step.note}</Text>
                                </View>
                              ) : null}
                              {step.images && step.images.length > 0 ? (
                                <View style={howToStyles.stepMediaList}>
                                  {step.images.map((photo: HowToStepImage, photoIdx: number) => (
                                    <TouchableOpacity
                                      key={`${step.step}-media-${photoIdx}`}
                                      style={[howToStyles.stepMediaCard, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}
                                      onPress={() => openImageViewer(photo)}
                                      activeOpacity={0.9}
                                    >
                                      <Image
                                        source={{ uri: photo.uri }}
                                        style={howToStyles.stepMediaImage}
                                        contentFit="cover"
                                        transition={120}
                                      />
                                      <View style={howToStyles.stepMediaMeta}>
                                        <Text style={[howToStyles.stepMediaCaption, N && { color: N.textSub }]}>{photo.caption}</Text>
                                        <Text style={[howToStyles.stepMediaHint, N && { color: N.textMuted }]}>Tap to enlarge, pinch to zoom, drag to pan</Text>
                                      </View>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}

            {guide.notes && guide.notes.length > 0 ? (
              <View style={[howToStyles.notesBlock, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}>
                <View style={howToStyles.notesHeader}>
                  <MaterialIcons name="info-outline" size={14} color={N ? N.textMuted : Colors.textSubtle} />
                  <Text style={[howToStyles.notesTitle, N && { color: N.textSub }]}>Important Notes</Text>
                </View>
                {guide.notes.map((note: string, ni: number) => (
                  <View key={ni} style={howToStyles.noteItem}>
                    <View style={[howToStyles.noteDot, { backgroundColor: guide.color }]} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[howToStyles.noteItemText, N && { color: N.textSub }]}>{renderInlineArabic(note)}</Text>
                      {hasArabic(note) ? (
                        <Text style={[howToStyles.noteTransliterationText, N && { color: N.textMuted }]}>
                          {transliterationFromText(note)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  if (!selectedLanguage) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[howToStyles.container, N && { backgroundColor: N.bg }]}
      >
        <View style={[howToStyles.introCard, N && { backgroundColor: N.surface, borderColor: N.border }]}>
          <View style={[howToStyles.introIcon, N && { backgroundColor: `${N.accent}18` }]}>
            <MaterialIcons name="translate" size={20} color={N ? N.accent : Colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[howToStyles.introTitle, N && { color: N.text }]}>Choose Guide Language</Text>
            <Text style={[howToStyles.introSub, N && { color: N.textSub }]}>Select English now or Urdu (coming soon)</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[howToStyles.languageCard, N && { backgroundColor: N.surface, borderColor: N.border }]}
          onPress={() => {
            setSelectedLanguage('english');
            setSelectedParentGroup(null);
            setExpandedGuide(null);
            setExpandedSection(null);
          }}
          activeOpacity={0.85}
        >
          <View style={[howToStyles.guideIcon, { backgroundColor: '#4FE94822' }]}> 
            <MaterialIcons name="menu-book" size={22} color="#4FE948" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[howToStyles.guideTitle, N && { color: N.text }]}>English Guides</Text>
            <Text style={[howToStyles.guideSub, N && { color: N.textSub }]}>Open current detailed Hanafi guides</Text>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={16} color={N ? N.textMuted : Colors.textSubtle} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[howToStyles.languageCard, N && { backgroundColor: N.surface, borderColor: N.border }]}
          onPress={() => {
            setSelectedLanguage('urdu');
            setSelectedParentGroup(null);
            setExpandedGuide(null);
            setExpandedSection(null);
          }}
          activeOpacity={0.85}
        >
          <View style={[howToStyles.guideIcon, { backgroundColor: '#1E88E522' }]}> 
            <MaterialIcons name="g-translate" size={22} color="#1E88E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[howToStyles.guideTitle, N && { color: N.text }]}>Urdu Guides</Text>
            <Text style={[howToStyles.guideSub, N && { color: N.textSub }]}>Urdu content will be added next</Text>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={16} color={N ? N.textMuted : Colors.textSubtle} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (selectedLanguage === 'urdu') {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[howToStyles.container, N && { backgroundColor: N.bg }]}
      >
        <View style={[howToStyles.introCard, N && { backgroundColor: N.surface, borderColor: N.border }]}>
          <View style={[howToStyles.introIcon, N && { backgroundColor: `${N.accent}18` }]}>
            <MaterialIcons name="hourglass-empty" size={20} color={N ? N.accent : Colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[howToStyles.introTitle, N && { color: N.text }]}>Urdu Guides Coming Soon</Text>
            <Text style={[howToStyles.introSub, N && { color: N.textSub }]}>Use English guides for now while Urdu is prepared</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[howToStyles.languageBackBtn, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}
          onPress={() => setSelectedLanguage(null)}
          activeOpacity={0.85}
        >
          <MaterialIcons name="arrow-back" size={16} color={N ? N.textSub : Colors.textSecondary} />
          <Text style={[howToStyles.languageBackText, N && { color: N.textSub }]}>Back to language selection</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const renderImageViewerModal = () => (
    <Modal
      visible={imageViewerVisible}
      transparent
      animationType="fade"
      onRequestClose={closeImageViewer}
    >
      <View style={howToStyles.viewerBackdrop}>
        <View style={[howToStyles.viewerHeader, N && { borderBottomColor: N.border }]}> 
          <View style={{ flex: 1 }}>
            <Text numberOfLines={2} style={[howToStyles.viewerTitle, N && { color: N.text }]}> 
              {activeImage?.caption ?? 'Image Preview'}
            </Text>
            {activeImage?.source ? (
              <Text numberOfLines={1} style={[howToStyles.viewerSource, N && { color: N.textMuted }]}> 
                {activeImage.source}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity style={howToStyles.viewerCloseBtn} onPress={closeImageViewer} activeOpacity={0.8}>
            <MaterialIcons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={howToStyles.viewerBody}>
          <GestureDetector gesture={imageGestures}>
            <View style={howToStyles.viewerGestureArea}>
              <Reanimated.View
                style={[
                  howToStyles.viewerImageFrame,
                  {
                    width: viewerBaseWidth,
                    height: viewerBaseHeight,
                  },
                  imageTransformStyle,
                ]}
              >
                {activeImage ? (
                  <Image
                    source={{ uri: activeImage.uri }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="contain"
                    transition={120}
                  />
                ) : null}
              </Reanimated.View>
            </View>
          </GestureDetector>
        </View>

        <Text style={howToStyles.viewerHint}>Pinch to zoom, drag to pan, and double-tap to reset.</Text>
      </View>
    </Modal>
  );

  return (
    <>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[howToStyles.container, N && { backgroundColor: N.bg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onPullRefresh}
            tintColor={N ? N.primary : Colors.primary}
          />
        }
      >
        {/* Intro card — JMN card system */}
        <View style={[howToStyles.introCard, N && { backgroundColor: N.surface, borderColor: N.border }]}>
          <View style={[howToStyles.introIcon, N && { backgroundColor: `${N.accent}18` }]}>
            <MaterialIcons name="menu-book" size={20} color={N ? N.accent : Colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[howToStyles.introTitle, N && { color: N.text }]}>{selectedParentGroup ? `${selectedParentGroup} Guides` : 'How-To Guides'}</Text>
            <Text style={[howToStyles.introSub, N && { color: N.textSub }]}>Learn step by step — tap a guide to explore.</Text>
            <Text style={[howToStyles.introMeta, N && { color: N.textMuted }]}>Based on Hanafi fiqh · Jami&apos; Masjid Noorani</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[howToStyles.backLink]}
          onPress={() => {
            if (selectedParentGroup) {
              setSelectedParentGroup(null);
            } else {
              setSelectedLanguage(null);
            }
            setExpandedGuide(null);
            setExpandedSection(null);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name={selectedParentGroup ? 'chevron-left' : 'translate'}
            size={16}
            color={N ? N.textSub : Colors.textSecondary}
          />
          <Text style={[howToStyles.backLinkText, N && { color: N.textSub }]}>
            {selectedParentGroup ? 'Back to categories' : 'Change language'}
          </Text>
        </TouchableOpacity>

        {selectedParentGroup ? (
          selectedGroupGuides.length > 0 ? (
            (() => {
              const startHere = selectedGroupGuides.slice(0, 2);
              const continueLearning = selectedGroupGuides.slice(2);
              return (
                <>
                  {startHere.length > 0 ? (
                    <>
                      <Text style={[howToStyles.sectionLabel, N && { color: N.textSub }]}>Start Here</Text>
                      {startHere.map(renderGuideCard)}
                    </>
                  ) : null}
                  {continueLearning.length > 0 ? (
                    <>
                      <Text style={[howToStyles.sectionLabel, N && { color: N.textSub }]}>Continue Learning</Text>
                      {continueLearning.map(renderGuideCard)}
                    </>
                  ) : null}
                </>
              );
            })()
          ) : (
            <View style={[howToStyles.emptyGroupCard, N && { backgroundColor: N.surface, borderColor: N.border }]}>
              <Text style={[howToStyles.emptyGroupText, N && { color: N.textSub }]}>No guides found in this group yet.</Text>
            </View>
          )
        ) : (
          <>
            {parentGroupTiles.length > 0 ? (
              <>
                <Text style={[howToStyles.sectionLabel, N && { color: N.textSub }]}>Parent Groups</Text>
                <View style={howToStyles.parentTileGrid}>
                  {parentGroupTiles.map((group) => (
                    <TouchableOpacity
                      key={group.name}
                      style={[howToStyles.parentTile, N && { backgroundColor: N.surface, borderColor: N.border }]}
                      onPress={() => {
                        setSelectedParentGroup(group.name);
                        setExpandedGuide(null);
                        setExpandedSection(null);
                      }}
                      activeOpacity={0.88}
                    >
                      <View style={[howToStyles.parentTileIconWrap, N && { backgroundColor: `${N.accent}18` }]}>
                        <MaterialIcons name="menu-book" size={22} color={N ? N.accent : Colors.primary} />
                      </View>
                      <Text style={[howToStyles.parentTileTitle, N && { color: N.text }]}>{group.name}</Text>
                      <Text style={[howToStyles.parentTileCount, N && { color: N.textMuted }]}>{group.guides.length} guides</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            {generalGuides.length > 0 ? (
              <>
                <Text style={[howToStyles.sectionLabel, N && { color: N.textSub }]}>Other Guides</Text>
                {generalGuides.map(renderGuideCard)}
              </>
            ) : null}
          </>
        )}

        {/* Disclaimer */}
        <View style={[howToStyles.disclaimer, N && { backgroundColor: N.surface, borderColor: N.border }]}>
          <MaterialIcons name="menu-book" size={14} color={N ? N.textMuted : Colors.textSubtle} />
          <Text style={[howToStyles.disclaimerText, N && { color: N.textMuted }]}>
            These guides follow the Hanafi madhab. Always verify with a qualified local scholar for personal queries.
          </Text>
        </View>
        <View style={{ height: 64 }} />
      </ScrollView>
      {renderImageViewerModal()}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  pageHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  pageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
  },
  pageMasjidName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 1,
    letterSpacing: 0.1,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSubtle,
    marginTop: 2,
  },
});

const howToStyles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 10,
    marginBottom: 2,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  languageCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
  },
  languageBackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 2,
  },
  languageBackText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  backLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: -4,
    marginBottom: 0,
  },
  backLinkText: { fontSize: 13, fontWeight: '500', color: Colors.primary },
  parentTileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  parentTile: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  parentTileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  parentTileTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  parentTileCount: { fontSize: 12, fontWeight: '500', color: Colors.textSubtle },
  emptyGroupCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  emptyGroupText: { fontSize: 13, color: Colors.textSecondary },
  groupBlock: { gap: Spacing.sm },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  groupTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  headerBand: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: 2,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.1 },
  headerSub: { fontSize: 13, fontWeight: '400', color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  headerMeta: { fontSize: 11, fontWeight: '500', color: Colors.textSubtle, marginTop: 4, letterSpacing: 0.3 },
  introCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
  },
  introIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  introTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.1 },
  introSub: { fontSize: 13, fontWeight: '400', color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  introMeta: { fontSize: 11, fontWeight: '500', color: Colors.textSubtle, marginTop: 4, letterSpacing: 0.3 },
  guideCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  guideHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.md,
  },
  guideIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  guideIconSymbol: {
    fontFamily: 'IndopakNastaleeq',
    fontSize: 22,
    lineHeight: 24,
  },
  guideTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.1, lineHeight: 20 },
  guideTitleArabic: {
    fontFamily: 'IndopakNastaleeq',
    fontSize: 18,
    lineHeight: 28,
    color: Colors.textSecondary,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  guideSub: { fontSize: 11, fontWeight: '500', color: Colors.textSubtle, marginTop: 3, letterSpacing: 0.2 },
  guideBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: 14 },
  introBand: {
    borderLeftWidth: 4, borderRadius: 8,
    backgroundColor: Colors.primarySoft,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 2,
  },
  introText: { fontSize: 14, fontWeight: '400', lineHeight: 22, color: Colors.textSecondary },
  sectionBlock: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  sectionBullet: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.1 },
  stepsContainer: { paddingHorizontal: 14, paddingVertical: 4, gap: 2 },
  stepRow: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stepRowLast: { borderBottomWidth: 0 },
  stepNum: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 20, letterSpacing: 0.1 },
  stepDetailWrap: { gap: 8 },
  warningDetailWrap: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    padding: 10,
  },
  detailChunk: { gap: 6 },
  stepDetail: { fontSize: 13, fontWeight: '400', lineHeight: 20, color: Colors.textSecondary },
  arabicInline: {
    fontFamily: 'IndopakNastaleeq',
    fontSize: 23,
    lineHeight: 36,
    color: '#131B2B',
  },
  arabicPanel: {
    backgroundColor: '#ECEFF3',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#D2D8E2',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 6,
  },
  arabicLineWrap: { gap: 4 },
  arabicPanelText: {
    fontFamily: 'IndopakNastaleeq',
    writingDirection: 'rtl',
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 38,
    color: '#121A2A',
  },
  transliterationText: {
    fontSize: 12,
    lineHeight: 20,
    color: '#4E617D',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noteBand: {
    borderLeftWidth: 3, borderRadius: 6,
    backgroundColor: Colors.primarySoft, paddingVertical: 8, paddingHorizontal: 10, marginTop: 6,
  },
  noteText: { fontSize: 12, fontWeight: '500', lineHeight: 18 },
  stepMediaList: { gap: 10, marginTop: 6 },
  stepMediaCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  stepMediaImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#E6ECE8',
  },
  stepMediaMeta: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  stepMediaCaption: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    color: Colors.textPrimary,
  },
  stepMediaHint: {
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textSubtle,
    fontStyle: 'italic',
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 8, 18, 0.96)',
    paddingTop: 48,
    paddingBottom: 26,
    paddingHorizontal: 12,
    gap: 12,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.14)',
    paddingBottom: 10,
    minHeight: 46,
  },
  viewerTitle: {
    color: '#F6FAFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  viewerSource: {
    color: '#93A8C5',
    fontSize: 11,
    marginTop: 2,
  },
  viewerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  viewerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerGestureArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  viewerImageFrame: {
    borderRadius: Radius.md,
    backgroundColor: '#0F1A2D',
    overflow: 'hidden',
  },
  viewerHint: {
    color: '#BFD0E8',
    fontSize: 12,
    textAlign: 'center',
  },
  notesBlock: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 8,
  },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  notesTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSubtle, letterSpacing: 0.6, textTransform: 'uppercase' },
  noteItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noteDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  noteItemText: { fontSize: 13, fontWeight: '400', lineHeight: 19, color: Colors.textSecondary, flex: 1 },
  noteTransliterationText: { fontSize: 11, lineHeight: 16, fontStyle: 'italic', color: Colors.textSubtle },
  disclaimer: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 12, marginTop: 4,
  },
  disclaimerText: { flex: 1, fontSize: 11, fontWeight: '400', lineHeight: 17, color: Colors.textSubtle },
});
