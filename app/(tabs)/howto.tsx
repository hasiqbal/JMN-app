import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { HOW_TO_GUIDES } from '@/howtoguides';
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
      {/* Hero Header */}
      <ImageBackground
        source={require('@/assets/images/masjid-building.jpg')}
        style={styles.heroHeader}
        imageStyle={{ opacity: N ? 0.25 : 0.75 }}
      >
        <LinearGradient
          colors={N
            ? ['rgba(3,5,12,0.94)', 'rgba(6,9,18,0.90)', 'rgba(6,9,18,0.97)']
            : ['rgba(20,65,100,0.65)', 'rgba(10,40,70,0.55)', 'rgba(5,20,55,0.60)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroNav}>
          <View style={styles.headerTitleRow}>
            <Image
              source={require('@/assets/images/masjid-logo.png')}
              style={styles.headerLogo}
              contentFit="contain"
            />
            <View>
              <Text style={styles.heroMasjidName}>Jami&apos; Masjid Noorani</Text>
              <Text style={styles.heroTitle}>How To Pray</Text>
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* Content */}
      <HowToContent nightMode={nightMode} />
    </View>
  );
}

// ── How To Content ────────────────────────────────────────────────────────
function HowToContent({ nightMode }: { nightMode: boolean }) {
  const N = nightMode ? NIGHT : null;
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'urdu' | null>(null);
  const [selectedParentGroup, setSelectedParentGroup] = useState<string | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const scrollRef = useRef<ScrollView>(null);
  const sectionYRefs = useRef<Record<string, number>>({});
  const guideYRefs = useRef<Record<string, number>>({});

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Static guide content for now; keep gesture for consistency across tabs.
      setLastUpdated(new Date());
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

  const renderArabicPanel = (content: string, key: string) => {
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
            {transliterationFromText(line) ? (
              <Text style={[howToStyles.transliterationText, N && { color: N.textSub }]}> 
                {transliterationFromText(line)}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderStepDetail = (detail: string) => {
    const pieces = detail.split(/```([\s\S]*?)```/g);

    return pieces.map((piece, idx) => {
      if (idx % 2 === 1) {
        return renderArabicPanel(piece, `block-${idx}`);
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
            {renderArabicPanel(longArabicAfterColon[2], `inline-block-${idx}`)}
          </View>
        );
      }

      const transliteration = transliterationFromText(text);

      return (
        <View key={`plain-${idx}`} style={howToStyles.detailChunk}>
          <Text style={[howToStyles.stepDetail, N && { color: N.textSub }]}>
            {renderInlineArabic(text)}
          </Text>
          {transliteration ? (
            <Text style={[howToStyles.transliterationText, N && { color: N.textSub }]}> 
              {transliteration}
            </Text>
          ) : null}
        </View>
      );
    });
  };

  const renderGuideCard = (guide: (typeof guideCards)[number]) => {
    const isOpen = expandedGuide === guide.id;
    return (
      <View
        key={guide.id}
        style={[howToStyles.guideCard, N && { backgroundColor: N.surface, borderColor: N.border }]}
        onLayout={(e) => { guideYRefs.current[guide.id] = e.nativeEvent.layout.y; }}
      >
        <TouchableOpacity
          style={howToStyles.guideHeader}
          onPress={() => handleGuideToggle(guide.id, isOpen)}
          activeOpacity={0.8}
        >
          <View style={[howToStyles.guideIcon, { backgroundColor: guide.color + '22' }]}>
            <MaterialIcons name={guide.icon as any} size={22} color={guide.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[howToStyles.guideTitle, N && { color: N.text }]}>{guide.title}</Text>
            <Text style={[howToStyles.guideSub, N && { color: N.textSub }]}>{guide.subtitle}</Text>
          </View>
          <MaterialIcons name={isOpen ? 'expand-less' : 'expand-more'} size={24} color={N ? N.textMuted : Colors.textSubtle} />
        </TouchableOpacity>

        {isOpen ? (
          <View style={howToStyles.guideBody}>
            <View style={[howToStyles.introBand, { borderLeftColor: guide.color }, N && { backgroundColor: guide.color + '15' }]}>
              <Text style={[howToStyles.introText, N && { color: N.textSub }]}>{guide.intro}</Text>
            </View>

            {guide.sections.map((section, si) => {
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
                      {section.steps.map((step) => (
                        <View key={step.step} style={[howToStyles.stepRow, N && { borderBottomColor: N.border }]}>
                          <View style={[howToStyles.stepNum, { backgroundColor: guide.color }]}>
                            <Text style={howToStyles.stepNumText}>{step.step}</Text>
                          </View>
                          <View style={{ flex: 1, gap: 4 }}>
                            <Text style={[howToStyles.stepTitle, N && { color: N.text }]}>{step.title}</Text>
                                    <View style={howToStyles.stepDetailWrap}>{renderStepDetail(step.detail)}</View>
                            {step.note ? (
                              <View style={[howToStyles.noteBand, { borderLeftColor: guide.color + '80' }, N && { backgroundColor: guide.color + '12' }]}>
                                <Text style={[howToStyles.noteText, { color: guide.color }]}>{step.note}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ))}
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
                {guide.notes.map((note, ni) => (
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
        <View style={[howToStyles.headerBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
          <MaterialIcons name="translate" size={22} color={N ? '#69A8FF' : Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[howToStyles.headerTitle, N && { color: N.text }]}>Choose Guide Language</Text>
            <Text style={[howToStyles.headerSub, N && { color: N.textSub }]}>Select English now or Urdu (coming soon)</Text>
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
        <View style={[howToStyles.headerBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
          <MaterialIcons name="hourglass-empty" size={22} color={N ? '#69A8FF' : Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[howToStyles.headerTitle, N && { color: N.text }]}>Urdu Guides Coming Soon</Text>
            <Text style={[howToStyles.headerSub, N && { color: N.textSub }]}>Use English guides for now while Urdu is prepared</Text>
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

  return (
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
      {/* Header band */}
      <View style={[howToStyles.headerBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="school" size={22} color={N ? '#69A8FF' : Colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[howToStyles.headerTitle, N && { color: N.text }]}>{selectedParentGroup ? `${selectedParentGroup} Guides` : 'Step-by-Step Prayer Guides'}</Text>
          <Text style={[howToStyles.headerSub, N && { color: N.textSub }]}>{selectedParentGroup ? 'Select a guide to open details' : 'Hanafi School · Jami&apos; Masjid Noorani'}</Text>
          <Text style={[howToStyles.headerSub, N && { color: N.textMuted }]}>Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[howToStyles.languageBackBtn, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}
        onPress={() => {
          if (selectedParentGroup) {
            setSelectedParentGroup(null);
          } else {
            setSelectedLanguage(null);
          }
          setExpandedGuide(null);
          setExpandedSection(null);
        }}
        activeOpacity={0.85}
      >
        <MaterialIcons
          name={selectedParentGroup ? 'arrow-back' : 'translate'}
          size={16}
          color={N ? N.textSub : Colors.textSecondary}
        />
        <Text style={[howToStyles.languageBackText, N && { color: N.textSub }]}>
          {selectedParentGroup ? 'Back to categories' : 'Change language'}
        </Text>
      </TouchableOpacity>

      {selectedParentGroup ? (
        selectedGroupGuides.length > 0 ? (
          selectedGroupGuides.map(renderGuideCard)
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
                    <View style={[howToStyles.parentTileIconWrap, N && { backgroundColor: `${N.accent}20` }]}>
                      <MaterialIcons name="folder" size={24} color={N ? N.accent : Colors.primary} />
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
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroHeader: {
    overflow: 'hidden',
    paddingBottom: 6,
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: '#fff',
  },
  heroMasjidName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFE88A',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

const howToStyles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  languageCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
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
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 2,
  },
  languageBackText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  parentTileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
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
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  parentTileTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
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
    paddingHorizontal: 10, paddingVertical: 8,
  },
  groupTitle: { flex: 1, fontSize: 12, fontWeight: '800', color: Colors.textPrimary },
  headerBand: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: 4,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 11, fontWeight: '500', color: Colors.textSubtle, marginTop: 1 },
  guideCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
    boxShadow: '0px 2px 6px rgba(0,0,0,0.06)',
  },
  guideHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.md,
  },
  guideIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  guideTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  guideSub: { fontSize: 11, fontWeight: '500', color: Colors.textSubtle, marginTop: 2 },
  guideBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: 10 },
  introBand: {
    borderLeftWidth: 3, borderRadius: 4,
    backgroundColor: Colors.primarySoft,
    padding: 10, marginBottom: 4,
  },
  introText: { fontSize: 13, fontWeight: '400', lineHeight: 20, color: Colors.textSecondary },
  sectionBlock: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  sectionBullet: { width: 6, height: 6, borderRadius: 3 },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  stepsContainer: { padding: 10, gap: 12 },
  stepRow: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  stepNumText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  stepTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  stepDetailWrap: { gap: 8 },
  detailChunk: { gap: 8 },
  stepDetail: { fontSize: 12, fontWeight: '400', lineHeight: 18, color: Colors.textSecondary },
  arabicInline: {
    fontFamily: 'IndopakNastaleeq',
    fontSize: 23,
    lineHeight: 34,
    color: '#131B2B',
  },
  arabicPanel: {
    backgroundColor: '#ECEFF3',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#D2D8E2',
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  arabicLineWrap: { gap: 4 },
  arabicPanelText: {
    fontFamily: 'IndopakNastaleeq',
    writingDirection: 'rtl',
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 42,
    color: '#121A2A',
  },
  transliterationText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#4E617D',
    textAlign: 'left',
    fontStyle: 'italic',
  },
  noteBand: {
    borderLeftWidth: 2.5, borderRadius: 3,
    backgroundColor: Colors.primarySoft, padding: 8, marginTop: 4,
  },
  noteText: { fontSize: 11, fontWeight: '500', lineHeight: 17 },
  notesBlock: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 10, gap: 7,
  },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  notesTitle: { fontSize: 11, fontWeight: '700', color: Colors.textSubtle, letterSpacing: 0.4 },
  noteItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteDot: { width: 5, height: 5, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  noteItemText: { fontSize: 11, fontWeight: '400', lineHeight: 17, color: Colors.textSecondary, flex: 1 },
  noteTransliterationText: { fontSize: 10, lineHeight: 15, fontStyle: 'italic', color: Colors.textSubtle },
  disclaimer: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 10, marginTop: 4,
  },
  disclaimerText: { flex: 1, fontSize: 10, fontWeight: '400', lineHeight: 15, color: Colors.textSubtle },
});
