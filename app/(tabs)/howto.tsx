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
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors, Spacing, Radius } from '@/constants/theme';
import type { HowToGuide, HowToSection, HowToStep, HowToStepImage } from '@/howtoguides/types';
import { useNightMode } from '@/hooks/useNightMode';
import { fetchHowToGuides } from '@/services/contentService';
import {
  GuideStepCard,
  GuideSectionHeading,
  InlineArabicText,
  ARABIC_SEGMENT_MATCH_REGEX,
  hasArabic,
  transliterationFromText,
} from '@/components/howto';

const PARENT_TILE_BACKGROUND_BY_GROUP: Partial<Record<string, any>> = {
  Purification: require('@/assets/images/background/wudhu.jpg'),
  طہارت: require('@/assets/images/background/wudhu.jpg'),
  Salah: require('@/assets/images/background/salah.jpg'),
  نماز: require('@/assets/images/background/salah.jpg'),
  Fasting: require('@/assets/images/background/kiswahkaabah.jpg'),
  روزہ: require('@/assets/images/background/kiswahkaabah.jpg'),
  'Hajj & Umrah': require('@/assets/images/sky/arafat.jpeg'),
  'حج و عمرہ': require('@/assets/images/sky/arafat.jpeg'),
  Zakaat: require('@/assets/images/background/zakaat.jpg'),
  زکوٰۃ: require('@/assets/images/background/zakaat.jpg'),
};

const PARENT_TILE_ICON_BY_GROUP: Partial<Record<string, keyof typeof MaterialIcons.glyphMap>> = {
  Purification: 'water-drop',
  طہارت: 'water-drop',
  Salah: 'self-improvement',
  نماز: 'self-improvement',
  Fasting: 'nights-stay',
  روزہ: 'nights-stay',
  Zakaat: 'volunteer-activism',
  زکوٰۃ: 'volunteer-activism',
  'Hajj & Umrah': 'travel-explore',
  'حج و عمرہ': 'travel-explore',
};

// Night palette used by the screen shell (parent tiles, guide cards, image viewer).
// Content-level components import their own palette via `pickPalette(nightMode)`.
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

const MATERIAL_ICON_NAME_REGEX = /^[a-z0-9_-]+$/i;

// ── Main Screen ───────────────────────────────────────────────────────────
export default function HowToScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const N = nightMode ? NIGHT : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }, N && { backgroundColor: N.bg }]}>
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
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteGuides, setRemoteGuides] = useState<HowToGuide[]>([]);
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

  const applyViewerScale = useCallback((targetScale: number) => {
    const boundedScale = Math.max(1, Math.min(targetScale, 4));
    imageZoomScale.value = withSpring(boundedScale, { damping: 20, stiffness: 260 });
    imageSavedZoomScale.value = boundedScale;

    if (boundedScale <= 1.01) {
      imageTranslateX.value = withSpring(0, { damping: 20, stiffness: 260 });
      imageTranslateY.value = withSpring(0, { damping: 20, stiffness: 260 });
      imageSavedTranslateX.value = 0;
      imageSavedTranslateY.value = 0;
      return;
    }

    const maxOffsetX = Math.max(0, ((viewerBaseWidth * boundedScale) - viewerBaseWidth) / 2);
    const maxOffsetY = Math.max(0, ((viewerBaseHeight * boundedScale) - viewerBaseHeight) / 2);
    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, imageTranslateX.value));
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, imageTranslateY.value));

    imageTranslateX.value = withSpring(clampedX, { damping: 20, stiffness: 260 });
    imageTranslateY.value = withSpring(clampedY, { damping: 20, stiffness: 260 });
    imageSavedTranslateX.value = clampedX;
    imageSavedTranslateY.value = clampedY;
  }, [
    imageSavedTranslateX,
    imageSavedTranslateY,
    imageSavedZoomScale,
    imageTranslateX,
    imageTranslateY,
    imageZoomScale,
    viewerBaseHeight,
    viewerBaseWidth,
  ]);

  const zoomInImage = useCallback(() => {
    applyViewerScale(imageSavedZoomScale.value + 0.35);
  }, [applyViewerScale, imageSavedZoomScale]);

  const zoomOutImage = useCallback(() => {
    applyViewerScale(imageSavedZoomScale.value - 0.35);
  }, [applyViewerScale, imageSavedZoomScale]);

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

  const selectedLanguageCode = selectedLanguage === 'urdu' ? 'ur' : 'en';
  const stripUpdatedLabel = useMemo(
    () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    []
  );

  const renderHowToStrip = () => (
    <View style={[howToStyles.moduleStrip, N && { backgroundColor: N.surface, borderColor: N.border }]}>
      <Image
        source={require('@/assets/images/masjid-logo.png')}
        style={howToStyles.moduleStripLogo}
        contentFit="contain"
        tintColor={undefined}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[howToStyles.moduleStripMasjid, N && { color: N.primary }]}>JMN</Text>
        <Text style={[howToStyles.moduleStripTitle, N && { color: N.text }]}>How To Guides</Text>
        <Text style={[howToStyles.moduleStripMeta, N && { color: N.textMuted }]}>Updated {stripUpdatedLabel}</Text>
      </View>
    </View>
  );

  const loadRemoteGuides = useCallback(async (asRefresh = false) => {
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setLoadingRemote(true);
    }

    try {
      if (asRefresh) {
        const rows = await fetchHowToGuides(selectedLanguageCode, { forceRefresh: true });
        setRemoteGuides(rows);
      } else {
        // Render quickly from cache, then revalidate from network so portal edits appear without manual refresh.
        const cachedRows = await fetchHowToGuides(selectedLanguageCode, { forceRefresh: false });
        setRemoteGuides(cachedRows);

        const liveRows = await fetchHowToGuides(selectedLanguageCode, { forceRefresh: true });
        setRemoteGuides(liveRows);
      }
      setRemoteError(null);
    } catch {
      setRemoteGuides([]);
      setRemoteError('Could not load how-to guides right now.');
    } finally {
      setRefreshing(false);
      setLoadingRemote(false);
    }
  }, [selectedLanguageCode]);

  const onPullRefresh = useCallback(async () => {
    await loadRemoteGuides(true);
  }, [loadRemoteGuides]);

  React.useEffect(() => {
    if (!selectedLanguage) return;
    void loadRemoteGuides(false);
  }, [loadRemoteGuides, selectedLanguage]);

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
    () => {
      if (remoteGuides.length > 0) return remoteGuides;
      return [];
    },
    [remoteGuides]
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

    const groupOrder: Record<string, number> = {
      Purification: 1,
      طہارت: 1,
      Salah: 2,
      نماز: 2,
      Fasting: 3,
      روزہ: 3,
      Zakaat: 4,
      زکوٰۃ: 4,
      'Hajj & Umrah': 5,
      'حج و عمرہ': 5,
      General: 999,
      عمومی: 999,
    };

    const orderedNames = Array.from(groups.keys()).sort((a, b) => {
      const rankA = groupOrder[a] ?? 100;
      const rankB = groupOrder[b] ?? 100;

      if (rankA !== rankB) {
        return rankA - rankB;
      }

      return a.localeCompare(b);
    });

    return orderedNames.map((name) => ({
      name,
      guides: groups.get(name) ?? [],
    }));
  }, [guideCards]);

  const parentGroupTiles = useMemo(
    () => groupedGuideCards.filter((group) => group.name !== 'General' && group.name !== 'عمومی'),
    [groupedGuideCards]
  );

  const generalGuides = useMemo(
    () => groupedGuideCards.find((group) => group.name === 'General' || group.name === 'عمومی')?.guides ?? [],
    [groupedGuideCards]
  );

  const selectedGroupGuides = useMemo(
    () => groupedGuideCards.find((group) => group.name === selectedParentGroup)?.guides ?? [],
    [groupedGuideCards, selectedParentGroup]
  );

  const splitBilingualTitle = (title: string) => {
    // Strip pronunciation helpers in parentheses like "(Witr)" — redundant when we show English + Arabic separately.
    const withoutParens = title.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    const matches = withoutParens.match(ARABIC_SEGMENT_MATCH_REGEX);
    if (!matches || matches.length === 0) return { english: withoutParens, arabic: null as string | null };
    const arabic = matches.join(' ').replace(/\s+/g, ' ').trim();
    const english = withoutParens.replace(ARABIC_SEGMENT_MATCH_REGEX, ' ').replace(/\s+/g, ' ').trim();
    return { english, arabic };
  };

  const renderGuideCard = (guide: HowToGuide) => {
    const isOpen = expandedGuide === guide.id;
    const isSalahPilot = true;
    const { english, arabic } = splitBilingualTitle(guide.title);
    const arabicForCard = selectedLanguageCode === 'ur' ? arabic : null;
    const totalSteps = guide.sections.reduce((count, section) => count + section.steps.length, 0);
    const totalImages = guide.sections.reduce(
      (count, section) => count + section.steps.reduce((stepCount, step) => stepCount + (step.images?.length ?? 0), 0),
      0,
    );
    const recitationBlocks = guide.sections.reduce(
      (count, section) => count + section.steps.reduce(
        (stepCount, step) => stepCount + ((step.blocks ?? []).filter((block) => block.kind === 'recitation').length),
        0,
      ),
      0,
    );

    return (
      <View
        key={guide.id}
        style={[
          howToStyles.guideCard,
          isSalahPilot && howToStyles.salahPilotGuideCard,
          N && { backgroundColor: N.surface, borderColor: N.border },
        ]}
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
            {english ? <Text style={[howToStyles.guideTitle, N && { color: N.text }]}>{english}</Text> : null}
            {arabicForCard ? (
              <Text style={[howToStyles.guideTitleArabic, N && { color: N.textSub }]}>{arabicForCard}</Text>
            ) : null}
            <Text style={[howToStyles.guideSub, N && { color: N.textMuted }]}>{guide.subtitle}</Text>
          </View>
          <MaterialIcons name={isOpen ? 'expand-less' : 'chevron-right'} size={20} color={N ? N.textMuted : Colors.textSubtle} />
        </TouchableOpacity>

        {isOpen ? (
          <View style={howToStyles.guideBody}>
            {isSalahPilot ? (
              <View style={[
                howToStyles.salahPilotHero,
                N
                  ? { backgroundColor: N.surfaceAlt, borderColor: N.border }
                  : { backgroundColor: guide.color + '12', borderColor: guide.color + '4A' },
              ]}>
                <View style={howToStyles.salahPilotHeroHeader}>
                  <Text style={[howToStyles.salahPilotEyebrow, { color: N ? N.accent : guide.color }]}>GUIDED LESSON MODE</Text>
                  <View style={[howToStyles.salahPilotBadge, { borderColor: guide.color + '66', backgroundColor: guide.color + '18' }]}>
                    <Text style={[howToStyles.salahPilotBadgeText, { color: guide.color }]}>Focused learning</Text>
                  </View>
                </View>
                <Text style={[howToStyles.salahPilotMeta, N && { color: N.textSub }]}> 
                  {guide.sections.length} sections · {totalSteps} steps · {recitationBlocks} recitations{totalImages > 0 ? ` · ${totalImages} visuals` : ''}
                </Text>
                {guide.intro ? (
                  <View style={[
                    howToStyles.salahPilotIntroBand,
                    { borderLeftColor: guide.color },
                    N
                      ? { backgroundColor: guide.color + '18' }
                      : { backgroundColor: guide.color + '14' },
                  ]}>
                    <Text style={[howToStyles.introText, N && { color: N.textSub }]}>{guide.intro}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={[howToStyles.introBand, { borderLeftColor: guide.color }, N && { backgroundColor: guide.color + '15' }]}>
                <Text style={[howToStyles.introText, N && { color: N.textSub }]}>{guide.intro}</Text>
              </View>
            )}

            {guide.sections.map((section: HowToSection, si: number) => {
              const secKey = guide.id + '-' + si;
              const secOpen = expandedSection === secKey;
              return (
                <View
                  key={secKey}
                  style={[howToStyles.sectionBlock, isSalahPilot && howToStyles.sectionBlockPilot, N && { borderColor: N.border }]}
                  onLayout={(e) => {
                    const guideY = guideYRefs.current[guide.id] ?? 0;
                    sectionYRefs.current[secKey] = guideY + e.nativeEvent.layout.y;
                  }}
                >
                  <GuideSectionHeading
                    heading={section.heading}
                    accentColor={guide.color}
                    expanded={secOpen}
                    onToggle={() => handleSectionToggle(secKey)}
                    nightMode={nightMode}
                  />

                  {!secOpen && isSalahPilot ? (
                    <View style={[
                      howToStyles.salahPilotSectionPreview,
                      N
                        ? { backgroundColor: N.surface }
                        : { backgroundColor: guide.color + '0D', borderTopColor: guide.color + '3A' },
                    ]}>
                      <Text style={[howToStyles.salahPilotSectionMeta, N && { color: N.textMuted }]}>
                        {section.steps.length} {section.steps.length === 1 ? 'step' : 'steps'} in this section
                      </Text>
                      {section.steps.slice(0, 2).map((step, index) => (
                        <View key={`${secKey}-preview-${index}`} style={howToStyles.salahPilotPreviewRow}>
                          <Text style={[howToStyles.salahPilotPreviewBullet, { color: guide.color }]}>•</Text>
                          <Text numberOfLines={1} style={[howToStyles.salahPilotPreviewText, N && { color: N.textSub }]}>
                            {step.title}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {secOpen ? (
                    <View style={howToStyles.stepsContainer}>
                      {section.steps.map((step: HowToStep, stepIdx: number) => {
                        const isLastStep = stepIdx === section.steps.length - 1;
                        return (
                          <GuideStepCard
                            key={step.step}
                            step={step.step}
                            title={step.title}
                            blocks={step.blocks}
                            detail={step.detail}
                            note={step.note}
                            accentColor={guide.color}
                            isLast={isLastStep}
                            nightMode={nightMode}
                            contentLanguage={selectedLanguageCode}
                            learningMode={isSalahPilot ? 'salah-pilot' : 'default'}
                          >
                            {step.images && step.images.length > 0 ? (
                              <View style={howToStyles.stepMediaList}>
                                {step.images.map((photo: HowToStepImage, photoIdx: number) => (
                                  <TouchableOpacity
                                    key={`${step.step}-media-${photoIdx}`}
                                    style={[
                                      howToStyles.stepMediaCard,
                                      isSalahPilot && howToStyles.stepMediaCardPilot,
                                      isSalahPilot && !N && { backgroundColor: guide.color + '0E', borderColor: guide.color + '3F' },
                                      N && { backgroundColor: N.surfaceAlt, borderColor: N.border },
                                    ]}
                                    onPress={() => openImageViewer(photo)}
                                    activeOpacity={0.9}
                                  >
                                    <View style={howToStyles.stepMediaImageWrap}>
                                      <Image
                                        source={{ uri: photo.uri }}
                                        style={howToStyles.stepMediaImage}
                                        contentFit="cover"
                                        transition={120}
                                      />
                                      <View style={howToStyles.stepMediaExpandBadge}>
                                        <MaterialIcons name="zoom-in" size={14} color="#FFFFFF" />
                                      </View>
                                    </View>
                                    <View style={howToStyles.stepMediaMeta}>
                                      <Text style={[howToStyles.stepMediaCaption, N && { color: N.textSub }]}>{photo.caption}</Text>
                                      <Text style={[howToStyles.stepMediaHint, N && { color: N.textMuted }]}>
                                        Tap to enlarge, pinch to zoom, drag to pan
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            ) : null}
                          </GuideStepCard>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}

            {guide.notes && guide.notes.length > 0 ? (
              <View style={[
                howToStyles.notesBlock,
                isSalahPilot && howToStyles.notesBlockPilot,
                isSalahPilot && !N && { backgroundColor: guide.color + '10', borderColor: guide.color + '40' },
                N && { backgroundColor: N.surfaceAlt, borderColor: N.border },
              ]}>
                <View style={howToStyles.notesHeader}>
                  <MaterialIcons name="info-outline" size={14} color={N ? N.textMuted : Colors.textSubtle} />
                  <Text style={[howToStyles.notesTitle, N && { color: N.textSub }]}>{isSalahPilot ? 'Study Notes' : 'Important Notes'}</Text>
                </View>
                {guide.notes.map((note: string, ni: number) => (
                  <View key={ni} style={howToStyles.noteItem}>
                    <View style={[howToStyles.noteDot, { backgroundColor: guide.color }]} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <InlineArabicText
                        text={note}
                        nightMode={nightMode}
                        style={[howToStyles.noteItemText, N && { color: N.textSub }]}
                      />
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
        contentContainerStyle={[howToStyles.container, howToStyles.languageSelectionContainer, N && { backgroundColor: N.bg }]}
      >
        {renderHowToStrip()}
        <View style={howToStyles.languageOptionsArea}>
          <TouchableOpacity
            style={[howToStyles.languageCard, howToStyles.languageCardLarge, N && { backgroundColor: N.surface, borderColor: N.border }]}
            onPress={() => {
              setSelectedLanguage('english');
              setSelectedParentGroup(null);
              setExpandedGuide(null);
              setExpandedSection(null);
            }}
            activeOpacity={0.85}
          >
            <View style={[howToStyles.guideIcon, howToStyles.languageCardIcon, { backgroundColor: '#4FE94822' }]}> 
              <MaterialIcons name="menu-book" size={26} color="#4FE948" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[howToStyles.guideTitle, howToStyles.languageCardTitle, N && { color: N.text }]}>English Guides</Text>
              <Text style={[howToStyles.guideSub, howToStyles.languageCardSub, N && { color: N.textSub }]}>Open current detailed Hanafi guides</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={18} color={N ? N.textMuted : Colors.textSubtle} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[howToStyles.languageCard, howToStyles.languageCardLarge, N && { backgroundColor: N.surface, borderColor: N.border }]}
            onPress={() => {
              setSelectedLanguage('urdu');
              setSelectedParentGroup(null);
              setExpandedGuide(null);
              setExpandedSection(null);
            }}
            activeOpacity={0.85}
          >
            <View style={[howToStyles.guideIcon, howToStyles.languageCardIcon, { backgroundColor: '#1E88E522' }]}> 
              <MaterialIcons name="g-translate" size={26} color="#1E88E5" />
            </View>
            <View style={{ flex: 1 }}>
              <InlineArabicText text="اردو گائیڈز" nightMode={nightMode} style={[howToStyles.guideTitle, howToStyles.languageCardTitle, N && { color: N.text }]} />
              <InlineArabicText text="موجودہ تفصیلی حنفی رہنما کھولیں" nightMode={nightMode} style={[howToStyles.guideSub, howToStyles.languageCardSub, N && { color: N.textSub }]} />
            </View>
            <MaterialIcons name="arrow-forward-ios" size={18} color={N ? N.textMuted : Colors.textSubtle} />
          </TouchableOpacity>
        </View>
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
      <GestureHandlerRootView style={howToStyles.viewerRoot}>
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
        <View style={howToStyles.viewerControls}>
          <TouchableOpacity style={howToStyles.viewerControlBtn} onPress={zoomOutImage} activeOpacity={0.8}>
            <MaterialIcons name="remove" size={22} color="#E8F0FF" />
          </TouchableOpacity>
          <TouchableOpacity style={[howToStyles.viewerControlBtn, howToStyles.viewerControlBtnPrimary]} onPress={resetImageTransform} activeOpacity={0.8}>
            <MaterialIcons name="center-focus-weak" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={howToStyles.viewerControlBtn} onPress={zoomInImage} activeOpacity={0.8}>
            <MaterialIcons name="add" size={22} color="#E8F0FF" />
          </TouchableOpacity>
        </View>
      </View>
      </GestureHandlerRootView>
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
        {renderHowToStrip()}

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

        {loadingRemote ? (
          <View style={[howToStyles.emptyGroupCard, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
            <Text style={[howToStyles.emptyGroupText, N && { color: N.textSub }]}>Loading guides...</Text>
          </View>
        ) : null}

        {remoteError ? (
          <View style={[howToStyles.emptyGroupCard, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
            <Text style={[howToStyles.emptyGroupText, N && { color: N.textSub }]}>Unable to load guides right now.</Text>
          </View>
        ) : null}

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
                      style={[howToStyles.parentTile, N && { borderColor: N.border }]}
                      onPress={() => {
                        setSelectedParentGroup(group.name);
                        setExpandedGuide(null);
                        setExpandedSection(null);
                      }}
                      activeOpacity={0.88}
                    >
                      {PARENT_TILE_BACKGROUND_BY_GROUP[group.name] ? (
                        <Image
                          source={PARENT_TILE_BACKGROUND_BY_GROUP[group.name]}
                          style={howToStyles.parentTileBackgroundImage}
                          contentFit="cover"
                        />
                      ) : null}
                      <View style={[howToStyles.parentTileOverlay, N && { backgroundColor: 'rgba(6, 9, 15, 0.56)' }]} />
                      <View style={[howToStyles.parentTileIconWrap, N && { backgroundColor: 'rgba(6, 9, 15, 0.6)', borderColor: `${N.accent}66` }]}>
                        <MaterialIcons name={PARENT_TILE_ICON_BY_GROUP[group.name] ?? 'menu-book'} size={24} color="#FFFFFF" />
                      </View>
                      <Text style={howToStyles.parentTileTitle}>{group.name}</Text>
                      <Text style={howToStyles.parentTileCount}>{group.guides.length} guides</Text>
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
          {selectedLanguageCode === 'ur' ? (
            <InlineArabicText
              text="یہ رہنما حنفی مسلک کے مطابق ہیں۔ ذاتی مسائل کے لیے ہمیشہ اپنے مقامی مستند عالم سے رہنمائی لیں۔"
              nightMode={nightMode}
              style={[howToStyles.disclaimerText, N && { color: N.textMuted }]}
            />
          ) : (
            <Text style={[howToStyles.disclaimerText, N && { color: N.textMuted }]}>These guides follow the Hanafi school. For personal rulings, always consult a qualified local scholar.</Text>
          )}
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
  container: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  languageSelectionContainer: {
    flexGrow: 1,
  },
  languageOptionsArea: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.md,
  },
  moduleStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EEF2EF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#D8E0DA',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  moduleStripLogo: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3EAE5',
  },
  moduleStripMasjid: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E9C57',
    letterSpacing: 0.25,
  },
  moduleStripTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 1,
  },
  moduleStripMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
    marginTop: 2,
  },
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
  languageCardLarge: {
    paddingVertical: Spacing.md + 4,
  },
  languageCardIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
  },
  languageCardTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  languageCardSub: {
    fontSize: 12,
    marginTop: 4,
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
  parentTileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: Spacing.md,
  },
  parentTile: {
    width: '48.5%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: '#16263A',
    position: 'relative',
  },
  parentTileBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  parentTileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 18, 30, 0.48)',
  },
  parentTileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 18, 30, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  parentTileTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  parentTileCount: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
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
  salahPilotGuideCard: {
    borderRadius: Radius.xl,
    borderColor: '#CBDDCE',
    backgroundColor: '#FBFEFC',
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
    fontFamily: 'UrduNastaliq',
    fontWeight: '400',
    fontSize: 18,
    lineHeight: 28,
    color: Colors.textSecondary,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  guideSub: { fontSize: 11, fontWeight: '500', color: Colors.textSubtle, marginTop: 3, letterSpacing: 0.2 },
  guideBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: 14 },
  salahPilotHero: {
    borderWidth: 1,
    borderColor: '#CFE0D2',
    borderRadius: Radius.md,
    backgroundColor: '#F7FBF8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  salahPilotHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  salahPilotEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.15,
    color: '#2D6A47',
  },
  salahPilotBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  salahPilotBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  salahPilotMeta: {
    fontSize: 11,
    lineHeight: 16,
    color: '#436253',
  },
  salahPilotIntroBand: {
    borderLeftWidth: 4,
    borderRadius: 8,
    backgroundColor: '#EDF8F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  introBand: {
    borderLeftWidth: 4, borderRadius: 8,
    backgroundColor: Colors.primarySoft,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 2,
  },
  introText: { fontSize: 14, fontWeight: '400', lineHeight: 22, color: Colors.textSecondary },
  sectionBlock: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden',
  },
  sectionBlockPilot: {
    borderRadius: Radius.lg,
    borderColor: '#D0E0D2',
    backgroundColor: '#FCFEFC',
  },
  salahPilotSectionPreview: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D8E7DA',
    backgroundColor: '#F3FAF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 5,
  },
  salahPilotSectionMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6A8073',
  },
  salahPilotPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  salahPilotPreviewBullet: {
    fontSize: 12,
    lineHeight: 14,
  },
  salahPilotPreviewText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#476154',
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
  // ── Devotional block (unified for both structured verse + plain arabic panel) ──
  devotionalBlock: {
    borderWidth: 1,
    borderColor: '#D8DEE7',
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  devotionalLabelWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E3E7ED',
  },
  devotionalLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#8B95A3',
  },
  arabicZone: {
    paddingHorizontal: 18,
    paddingVertical: 22,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  arabicZoneText: {
    fontFamily: 'IndopakNastaleeq',
    writingDirection: 'rtl',
    textAlign: 'center',
    fontSize: 30,
    lineHeight: 46,
    color: '#0E1726',
  },
  translitZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E3E7ED',
    backgroundColor: '#F3F5F9',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 4,
  },
  translitZoneText: {
    fontSize: 13,
    lineHeight: 21,
    color: '#546578',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  meaningZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E3E7ED',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 4,
  },
  meaningLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#8B95A3',
    marginBottom: 2,
  },
  meaningText: {
    fontSize: 13.5,
    lineHeight: 21,
    color: '#2F3B34',
    textAlign: 'left',
  },
  // ── Guidance callout (Note:/Tip:/Important:/…) ──
  guidanceCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F1F5FA',
    borderWidth: 1,
    borderColor: '#D9E3EE',
    borderLeftWidth: 3,
    borderLeftColor: '#6A8AAE',
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  guidanceIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 1,
  },
  guidanceLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#4A6A8A',
  },
  guidanceBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#243240',
  },
  // ── Legacy styles kept for backward compatibility ──
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
  verseStack: {
    borderWidth: 1,
    borderColor: '#D2D8E2',
    borderRadius: Radius.lg,
    backgroundColor: '#ECEFF3',
    overflow: 'hidden',
  },
  versePairRow: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 5,
  },
  versePairRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#D2D8E2',
  },
  verseTranslationText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#2F3B34',
    textAlign: 'left',
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
  stepMediaCardPilot: {
    borderRadius: Radius.lg,
    borderColor: '#CADDCD',
    backgroundColor: '#F7FBF8',
  },
  stepMediaImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#E6ECE8',
  },
  stepMediaImageWrap: {
    position: 'relative',
  },
  stepMediaExpandBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12, 22, 36, 0.78)',
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
  viewerRoot: {
    flex: 1,
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
  viewerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  viewerControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  viewerControlBtnPrimary: {
    backgroundColor: 'rgba(106,174,255,0.34)',
    borderColor: 'rgba(106,174,255,0.65)',
  },
  notesBlock: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 12, gap: 8,
  },
  notesBlockPilot: {
    borderRadius: Radius.lg,
    paddingVertical: 10,
    borderColor: '#CFE0D2',
    backgroundColor: '#F6FBF7',
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
