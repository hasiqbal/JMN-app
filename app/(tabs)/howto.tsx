import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { HOW_TO_GUIDES } from '@/services/quranService';
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
  primary:    '#4DCF88',
};

// ── Night Mode Toggle ────────────────────────────────────────────────────
function NightModeToggle({ nightMode, onToggle }: { nightMode: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      style={[nmStyles.btn, nightMode ? nmStyles.btnNight : nmStyles.btnDay]}
    >
      <MaterialIcons
        name={nightMode ? 'nights-stay' : 'wb-sunny'}
        size={15}
        color={nightMode ? '#C0D8FF' : Colors.textSubtle}
      />
      <Text style={[nmStyles.label, { color: nightMode ? '#C0D8FF' : Colors.textSubtle }]}>
        {nightMode ? 'Night' : 'Day'}
      </Text>
    </TouchableOpacity>
  );
}

const nmStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  btnNight: { backgroundColor: '#0D1E3C', borderColor: '#2A4A7A' },
  btnDay:   { backgroundColor: Colors.primarySoft, borderColor: Colors.border },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});

// ── Main Screen ───────────────────────────────────────────────────────────
export default function HowToScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode, toggleManual } = useNightMode();
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
              <Text style={styles.heroMasjidName}>Jami' Masjid Noorani</Text>
              <Text style={styles.heroTitle}>How To Pray</Text>
            </View>
          </View>
          <NightModeToggle nightMode={nightMode} onToggle={toggleManual} />
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
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const sectionYRefs = useRef<Record<string, number>>({});
  const guideYRefs = useRef<Record<string, number>>({});

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

  return (
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[howToStyles.container, N && { backgroundColor: N.bg }]}
    >
      {/* Header band */}
      <View style={[howToStyles.headerBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="school" size={22} color={N ? '#69A8FF' : Colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[howToStyles.headerTitle, N && { color: N.text }]}>Step-by-Step Prayer Guides</Text>
          <Text style={[howToStyles.headerSub, N && { color: N.textSub }]}>Hanafi School · Jami' Masjid Noorani</Text>
        </View>
      </View>

      {HOW_TO_GUIDES.map((guide) => {
        const isOpen = expandedGuide === guide.id;
        return (
          <View
            key={guide.id}
            style={[howToStyles.guideCard, N && { backgroundColor: N.surface, borderColor: N.border }]}
            onLayout={(e) => { guideYRefs.current[guide.id] = e.nativeEvent.layout.y; }}
          >
            {/* Guide Header */}
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
                {/* Intro */}
                <View style={[howToStyles.introBand, { borderLeftColor: guide.color }, N && { backgroundColor: guide.color + '15' }]}>
                  <Text style={[howToStyles.introText, N && { color: N.textSub }]}>{guide.intro}</Text>
                </View>

                {/* Sections */}
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
                                <Text style={[howToStyles.stepDetail, N && { color: N.textSub }]}>{step.detail}</Text>
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

                {/* Notes */}
                {guide.notes && guide.notes.length > 0 ? (
                  <View style={[howToStyles.notesBlock, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}>
                    <View style={howToStyles.notesHeader}>
                      <MaterialIcons name="info-outline" size={14} color={N ? N.textMuted : Colors.textSubtle} />
                      <Text style={[howToStyles.notesTitle, N && { color: N.textSub }]}>Important Notes</Text>
                    </View>
                    {guide.notes.map((note, ni) => (
                      <View key={ni} style={howToStyles.noteItem}>
                        <View style={[howToStyles.noteDot, { backgroundColor: guide.color }]} />
                        <Text style={[howToStyles.noteItemText, N && { color: N.textSub }]}>{note}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

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
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
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
  stepDetail: { fontSize: 12, fontWeight: '400', lineHeight: 18, color: Colors.textSecondary },
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
  disclaimer: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 10, marginTop: 4,
  },
  disclaimerText: { flex: 1, fontSize: 10, fontWeight: '400', lineHeight: 15, color: Colors.textSubtle },
});
