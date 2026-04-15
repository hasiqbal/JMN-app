import React from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const MASJID_BUILDING = require('@/assets/images/masjid-building.jpg');
const MASJID_PATTERN = require('@/assets/images/masjid-hero.png');

const FUNDING_STATS = [
  { label: 'Raised', value: 'GBP 182k' },
  { label: 'Target', value: 'GBP 250k' },
  { label: 'Donors', value: '641' },
];

const IMPACT_POINTS = [
  'Expanded salah space for a growing jamaah',
  'Dedicated Quran learning rooms for children',
  'Safer access, wudu, and support spaces for families',
];

function ImpactHeroVariant() {
  return (
    <ImageBackground source={MASJID_BUILDING} style={styles.heroCard} imageStyle={styles.heroImage}>
      <LinearGradient
        colors={['rgba(8,20,29,0.12)', 'rgba(8,20,29,0.42)', 'rgba(8,20,29,0.92)']}
        locations={[0, 0.46, 1]}
        style={styles.heroGradient}
      >
        <View style={styles.topRow}>
          <View style={styles.darkChip}>
            <View style={styles.liveDot} />
            <Text style={styles.darkChipText}>Capital Rebuild Appeal</Text>
          </View>

          <View style={styles.glassStatCard}>
            <Text style={styles.glassStatLabel}>Need This Month</Text>
            <Text style={styles.glassStatValue}>GBP 28k</Text>
          </View>
        </View>

        <View style={styles.heroBottomContent}>
          <Text style={styles.kicker}>Variant 1 · Impact Banner</Text>
          <Text style={styles.heroHeadline}>Help reopen a stronger home for salah and service.</Text>
          <Text style={styles.heroBody}>
            A more persuasive, campaign-led version. The image carries the emotion, while the copy,
            stats, and call to action stay focused on one clear donation ask.
          </Text>

          <View style={styles.statsRow}>
            {FUNDING_STATS.map((item) => (
              <View key={item.label} style={styles.statPill}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaRow}>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Donate to the Rebuild</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>See the plan</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

function ProgressHeroVariant() {
  return (
    <View style={styles.cleanCardWrap}>
      <ImageBackground
        source={MASJID_BUILDING}
        style={styles.cleanImageBand}
        imageStyle={styles.cleanImageBandStyle}
      >
        <LinearGradient
          colors={['rgba(7,16,24,0.10)', 'rgba(7,16,24,0.55)']}
          locations={[0.25, 1]}
          style={styles.cleanImageOverlay}
        >
          <View style={styles.cleanChip}>
            <Text style={styles.cleanChipText}>Community-funded project</Text>
          </View>
        </LinearGradient>
      </ImageBackground>

      <View style={styles.cleanPanel}>
        <View style={styles.cleanPanelHeader}>
          <View>
            <Text style={styles.cleanEyebrow}>Variant 2 · Story Panel</Text>
            <Text style={styles.cleanHeadline}>Build the next chapter of JMN.</Text>
          </View>

          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeValue}>73%</Text>
            <Text style={styles.progressBadgeLabel}>funded</Text>
          </View>
        </View>

        <Text style={styles.cleanBody}>
          This direction is cleaner and more nonprofit-coded. It feels transparent, structured, and
          trustworthy rather than cinematic, while still keeping the masjid render prominent.
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: '73%' }]} />
        </View>

        <View style={styles.progressMetaRow}>
          <Text style={styles.progressMetaStrong}>GBP 182,000 raised</Text>
          <Text style={styles.progressMetaSub}>GBP 68,000 left for phase one</Text>
        </View>

        <View style={styles.impactList}>
          {IMPACT_POINTS.map((point) => (
            <View key={point} style={styles.impactRow}>
              <View style={styles.impactMarker} />
              <Text style={styles.impactText}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <View style={styles.patternBadge}>
            <Image source={MASJID_PATTERN} style={styles.patternImage} resizeMode="cover" />
            <Text style={styles.patternBadgeText}>Transparent giving</Text>
          </View>

          <Pressable style={styles.cleanButton}>
            <Text style={styles.cleanButtonText}>Give now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function CompartmentHeroPreviewScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Donation Hero Redesign</Text>
        <Text style={styles.subtitle}>
          Two donation-specific mockups with a more modern nonprofit tone. Both use the masjid render,
          but one leans campaign-first and the other leans trust-first.
        </Text>

        <View style={styles.heroWrap}>
          <ImpactHeroVariant />
        </View>

        <View style={styles.heroWrap}>
          <ProgressHeroVariant />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF3F1',
  },
  content: {
    paddingTop: 20,
    paddingBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#102A28',
    marginHorizontal: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#56706D',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  heroWrap: {
    marginBottom: 24,
  },
  heroCard: {
    minHeight: 470,
    marginHorizontal: 16,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#0D1C1F',
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  darkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(9, 20, 25, 0.74)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#4ED0AE',
  },
  darkChipText: {
    color: '#EAF5F1',
    fontSize: 12,
    fontWeight: '700',
  },
  glassStatCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  glassStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  glassStatValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroBottomContent: {
    gap: 16,
  },
  kicker: {
    color: '#9DDED0',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroHeadline: {
    maxWidth: 300,
    color: '#FFFFFF',
    fontSize: 36,
    lineHeight: 39,
    fontWeight: '900',
  },
  heroBody: {
    maxWidth: 320,
    color: 'rgba(239,247,245,0.86)',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    color: 'rgba(231,240,238,0.78)',
    fontSize: 12,
    fontWeight: '600',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4EE65',
  },
  primaryButtonText: {
    color: '#102816',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minWidth: 124,
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  secondaryButtonText: {
    color: '#F7FAF9',
    fontSize: 15,
    fontWeight: '700',
  },
  cleanCardWrap: {
    marginHorizontal: 16,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#173430',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cleanImageBand: {
    minHeight: 228,
    justifyContent: 'flex-start',
  },
  cleanImageBandStyle: {
    resizeMode: 'cover',
  },
  cleanImageOverlay: {
    flex: 1,
    padding: 18,
    justifyContent: 'flex-start',
  },
  cleanChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  cleanChipText: {
    color: '#143130',
    fontSize: 12,
    fontWeight: '800',
  },
  cleanPanel: {
    padding: 20,
    gap: 16,
  },
  cleanPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cleanEyebrow: {
    color: '#4D6B68',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cleanHeadline: {
    maxWidth: 240,
    color: '#163231',
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
  },
  progressBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#ECF8F3',
  },
  progressBadgeValue: {
    color: '#143130',
    fontSize: 22,
    fontWeight: '900',
  },
  progressBadgeLabel: {
    color: '#5C7A74',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cleanBody: {
    color: '#4E6764',
    fontSize: 15,
    lineHeight: 22,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#E3ECE8',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#2FA784',
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressMetaStrong: {
    color: '#143130',
    fontSize: 16,
    fontWeight: '800',
  },
  progressMetaSub: {
    flex: 1,
    textAlign: 'right',
    color: '#64807B',
    fontSize: 13,
    fontWeight: '600',
  },
  impactList: {
    gap: 10,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  impactMarker: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 6,
    backgroundColor: '#2FA784',
  },
  impactText: {
    flex: 1,
    color: '#294544',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  patternBadge: {
    flex: 1,
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F6F2DD',
    justifyContent: 'center',
  },
  patternImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
    width: undefined,
    height: undefined,
  },
  patternBadgeText: {
    color: '#4F5E33',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 14,
  },
  cleanButton: {
    minWidth: 126,
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#163231',
  },
  cleanButtonText: {
    color: '#F7FBFA',
    fontSize: 15,
    fontWeight: '800',
  },
});