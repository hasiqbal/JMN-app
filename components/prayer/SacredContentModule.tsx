import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { ReminderCard } from '@/components/prayer/ReminderCard';

export type SacredContentModuleProps = {
  hadithLabel: string;
  hadithLabelUrdu?: string;
  hadithPreview: string;
  hadithPreviewUrdu?: string;
  hadithSource: string;
  onPressHadith: () => void;
  verseLabel: string;
  verseLabelUrdu?: string;
  versePreview: string;
  versePreviewUrdu?: string;
  verseReference: string;
  onPressVerse: () => void;
  hadithExpandHint?: string;
  verseExpandHint?: string;
  autoFlipMs?: number;
  isLoading?: boolean;
  nightMode?: boolean;
};

export type SacredReadingSheetProps = {
  visible: boolean;
  title: string;
  fullText: string;
  reference: string;
  secondaryText?: string;
  footerActionLabel?: string;
  onFooterAction?: () => void;
  onClose: () => void;
  nightMode?: boolean;
};

const DAY = {
  cardBg: '#F8F3E8',
  cardBorder: 'rgba(128, 101, 46, 0.18)',
  cardShadow: 'rgba(70, 49, 14, 0.08)',
  hadithTint: 'rgba(55, 105, 69, 0.08)',
  verseTint: 'rgba(166, 129, 56, 0.09)',
  heading: '#305540',
  text: '#1F2B22',
  reference: '#55695B',
  arabicSecondary: '#355541',
  cta: '#4E5D50',
  segmentedText: '#55695B',
  segmentedTextActive: '#1F2B22',
  segmentedBorder: 'rgba(122, 138, 122, 0.3)',
  segmentedBg: 'rgba(255, 255, 255, 0.48)',
  segmentedActiveBg: 'rgba(255, 255, 255, 0.9)',
  skeleton: '#E8E0D2',
  sheetBg: '#FBF7EE',
  sheetBorder: 'rgba(120, 92, 42, 0.2)',
  sheetText: '#1F2B22',
  sheetSubText: '#4E5D50',
  sheetArabic: '#253F2E',
  sheetHandle: 'rgba(103, 89, 61, 0.35)',
  overlay: 'rgba(0, 0, 0, 0.36)',
};

const NIGHT = {
  cardBg: '#141C2C',
  cardBorder: 'rgba(193, 210, 190, 0.14)',
  cardShadow: 'rgba(0, 0, 0, 0.25)',
  hadithTint: 'rgba(99, 152, 113, 0.14)',
  verseTint: 'rgba(170, 144, 90, 0.14)',
  heading: '#B9D9C0',
  text: '#E9EFEA',
  reference: '#B8C3BC',
  arabicSecondary: '#D3E6DA',
  cta: '#C1CEC7',
  segmentedText: '#B8C3BC',
  segmentedTextActive: '#EAF2EE',
  segmentedBorder: 'rgba(193, 210, 190, 0.28)',
  segmentedBg: 'rgba(0, 0, 0, 0.12)',
  segmentedActiveBg: 'rgba(255, 255, 255, 0.12)',
  skeleton: '#273145',
  sheetBg: '#182338',
  sheetBorder: 'rgba(192, 214, 206, 0.16)',
  sheetText: '#EAF2EE',
  sheetSubText: '#C1CEC7',
  sheetArabic: '#D8EBDD',
  sheetHandle: 'rgba(203, 221, 214, 0.4)',
  overlay: 'rgba(0, 0, 0, 0.42)',
};

function getPalette(nightMode?: boolean) {
  return nightMode ? NIGHT : DAY;
}

function hasUrduGlyphs(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

function LoadingSkeleton({ nightMode }: { nightMode?: boolean }) {
  const palette = getPalette(nightMode);

  return (
    <View style={[styles.shell, styles.skeletonShell, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
      <View style={styles.skeletonPanel}>
        <View style={[styles.skeletonLine, styles.skeletonHeading, { backgroundColor: palette.skeleton }]} />
        <View style={[styles.skeletonLine, styles.skeletonBodyWide, { backgroundColor: palette.skeleton }]} />
        <View style={[styles.skeletonLine, styles.skeletonBodyShort, { backgroundColor: palette.skeleton }]} />
        <View style={[styles.skeletonLine, styles.skeletonHint, { backgroundColor: palette.skeleton }]} />
      </View>

      <View style={styles.skeletonPanel}>
        <View style={[styles.skeletonLine, styles.skeletonHeading, { backgroundColor: palette.skeleton }]} />
        <View style={[styles.skeletonLine, styles.skeletonBodyWide, { backgroundColor: palette.skeleton }]} />
        <View style={[styles.skeletonLine, styles.skeletonBodyShort, { backgroundColor: palette.skeleton }]} />
        <View style={[styles.skeletonLine, styles.skeletonHint, { backgroundColor: palette.skeleton }]} />
      </View>
    </View>
  );
}

export function SacredContentModule({
  hadithLabel,
  hadithLabelUrdu,
  hadithPreview,
  hadithPreviewUrdu,
  hadithSource,
  onPressHadith,
  verseLabel,
  verseLabelUrdu,
  versePreview,
  versePreviewUrdu,
  verseReference,
  onPressVerse,
  hadithExpandHint = 'Read more',
  verseExpandHint = 'Read more',
  isLoading,
  nightMode,
}: SacredContentModuleProps) {
  const palette = getPalette(nightMode);

  if (isLoading) {
    return <LoadingSkeleton nightMode={nightMode} />;
  }

  const hadithPreviewSafe = hadithPreview.trim();
  const hadithPreviewUrduSafe = (hadithPreviewUrdu ?? '').trim();
  const hadithSourceSafe = hadithSource.trim();
  const versePreviewSafe = versePreview.trim();
  const versePreviewUrduSafe = (versePreviewUrdu ?? '').trim();
  const verseReferenceSafe = verseReference.trim();

  const cardPalette = {
    title: palette.heading,
    text: palette.text,
    source: palette.reference,
    switchText: palette.segmentedText,
    switchActiveText: palette.segmentedTextActive,
    switchBorder: palette.segmentedBorder,
    switchBg: palette.segmentedBg,
    switchActiveBg: palette.segmentedActiveBg,
    ctaText: palette.cta,
  };

  const hasHadith = hadithPreviewSafe.length > 0 || hadithSourceSafe.length > 0;
  const hasVerse = versePreviewSafe.length > 0 || verseReferenceSafe.length > 0;

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: palette.cardBg,
          borderColor: palette.cardBorder,
          shadowColor: palette.cardShadow,
        },
      ]}
    >
      {hasHadith ? (
        <View style={styles.cardRow}>
          <ReminderCard
            title={hadithLabel}
            titleUrdu={hadithLabelUrdu}
            textEn={hadithPreviewSafe}
            textUr={hadithPreviewUrduSafe}
            source={hadithSourceSafe}
            tone="hadith"
            accentTint={palette.hadithTint}
            readMoreLabel={hadithExpandHint}
            onPressReadMore={onPressHadith}
            palette={cardPalette}
          />
        </View>
      ) : null}

      {hasVerse ? (
        <View style={styles.cardRow}>
          <ReminderCard
            title={verseLabel}
            titleUrdu={verseLabelUrdu}
            textEn={versePreviewSafe}
            textUr={versePreviewUrduSafe}
            source={verseReferenceSafe}
            tone="verse"
            accentTint={palette.verseTint}
            readMoreLabel={verseExpandHint}
            onPressReadMore={onPressVerse}
            palette={cardPalette}
          />
        </View>
      ) : null}

      {!hasHadith && !hasVerse ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: palette.reference }]}>No sacred content available.</Text>
        </View>
      ) : null}
    </View>
  );
}

export function SacredReadingSheet({
  visible,
  title,
  fullText,
  reference,
  secondaryText,
  footerActionLabel,
  onFooterAction,
  onClose,
  nightMode,
}: SacredReadingSheetProps) {
  const palette = getPalette(nightMode);
  const sheetSegments = fullText
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable
          style={[styles.sheetBackdrop, { backgroundColor: palette.overlay }]}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.sheetBg,
              borderColor: palette.sheetBorder,
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: palette.sheetHandle }]} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: palette.sheetText }]} numberOfLines={2}>
              {title}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close reading panel"
              style={styles.sheetCloseButton}
              onPress={onClose}
            >
              <MaterialIcons name="close" size={20} color={palette.sheetSubText} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.sheetBodyScroll}
            contentContainerStyle={styles.sheetBodyContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.sheetReference, { color: palette.sheetSubText }]}>{reference}</Text>

            {!!secondaryText?.trim() && (
              <Text style={[styles.sheetArabicText, { color: palette.sheetArabic }]}>{secondaryText.trim()}</Text>
            )}

            {sheetSegments.length > 0 ? (
              sheetSegments.map((segment, index) => {
                const segmentIsUrdu = hasUrduGlyphs(segment);
                return (
                  <Text
                    key={`${segment.slice(0, 24)}-${index}`}
                    style={[
                      styles.sheetBodyText,
                      { color: palette.sheetText },
                      segmentIsUrdu && styles.sheetBodyTextUrdu,
                    ]}
                  >
                    {segment}
                  </Text>
                );
              })
            ) : (
              <Text style={[styles.sheetBodyText, { color: palette.sheetText }]}>{fullText}</Text>
            )}
          </ScrollView>

          {!!footerActionLabel && !!onFooterAction && (
            <Pressable
              onPress={onFooterAction}
              style={({ pressed }) => [styles.sheetFooterAction, pressed && styles.sheetFooterActionPressed]}
            >
              <Text style={[styles.sheetFooterActionText, { color: palette.sheetSubText }]}>{footerActionLabel}</Text>
              <MaterialIcons name="arrow-forward" size={15} color={palette.sheetSubText} />
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginTop: 8,
    marginBottom: 12,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 6px 20px rgba(42, 33, 18, 0.08)' }
      : {
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
        }),
    elevation: 3,
  },
  cardRow: {
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    minHeight: 128,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skeletonShell: {
    alignItems: 'stretch',
  },
  skeletonPanel: {
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  skeletonLine: {
    borderRadius: Radius.md,
  },
  skeletonHeading: {
    width: '56%',
    height: 14,
    marginBottom: 12,
  },
  skeletonBodyWide: {
    width: '95%',
    height: 14,
    marginBottom: 8,
  },
  skeletonBodyShort: {
    width: '72%',
    height: 14,
    marginBottom: 12,
  },
  skeletonHint: {
    width: '28%',
    height: 12,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '92%',
    minHeight: '62%',
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    paddingBottom: 14,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,120,120,0.08)',
  },
  sheetBodyScroll: {
    flex: 1,
    minHeight: 220,
  },
  sheetBodyContent: {
    paddingBottom: 12,
  },
  sheetReference: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 12,
  },
  sheetArabicText: {
    fontSize: 23,
    lineHeight: 38,
    fontWeight: '400',
    textAlign: 'right',
    marginBottom: 14,
  },
  sheetBodyText: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '500',
    marginBottom: 12,
  },
  sheetBodyTextUrdu: {
    fontFamily: 'UrduNastaliqBold',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontSize: 24,
    lineHeight: 40,
    fontWeight: '400',
  },
  sheetFooterAction: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  sheetFooterActionPressed: {
    opacity: 0.72,
  },
  sheetFooterActionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});