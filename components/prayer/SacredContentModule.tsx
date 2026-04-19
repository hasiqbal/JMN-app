import React, { useEffect, useMemo, useState } from 'react';
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

type SacredPanelProps = {
  label: string;
  labelUrdu?: string;
  previewFront: string;
  previewBack?: string;
  reference: string;
  hint: string;
  onPress: () => void;
  isFlipped: boolean;
  onToggleFlip: () => void;
  tone: 'hadith' | 'verse';
  fullWidth?: boolean;
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
  divider: 'rgba(127, 102, 50, 0.18)',
  hadithTint: 'rgba(55, 105, 69, 0.08)',
  verseTint: 'rgba(166, 129, 56, 0.09)',
  heading: '#305540',
  text: '#1F2B22',
  reference: '#55695B',
  hint: '#6E7B72',
  icon: '#7A8A7A',
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
  divider: 'rgba(193, 210, 190, 0.18)',
  hadithTint: 'rgba(99, 152, 113, 0.14)',
  verseTint: 'rgba(170, 144, 90, 0.14)',
  heading: '#B9D9C0',
  text: '#E9EFEA',
  reference: '#B8C3BC',
  hint: '#9DA9A1',
  icon: '#9FB5A4',
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

function SacredPanel({
  label,
  labelUrdu,
  previewFront,
  previewBack,
  reference,
  hint,
  onPress,
  isFlipped,
  onToggleFlip,
  tone,
  fullWidth,
  nightMode,
}: SacredPanelProps) {
  const palette = getPalette(nightMode);
  const backText = (previewBack ?? '').trim();
  const canFlip = backText.length > 0;
  const activePreview = isFlipped && canFlip ? backText : previewFront;
  const previewIsUrdu = hasUrduGlyphs(activePreview);
  const defaultUrduLabel = tone === 'hadith' ? 'آج کی سنت' : 'آج کی آیت';
  const activeLabel = isFlipped && canFlip ? (labelUrdu?.trim() || defaultUrduLabel) : label;
  const titleIsUrdu = hasUrduGlyphs(activeLabel);
  const flipLabel = isFlipped ? 'انگلش دکھائیں' : 'اردو دکھائیں';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.panel,
        {
          backgroundColor: tone === 'hadith' ? palette.hadithTint : palette.verseTint,
        },
        fullWidth && styles.panelFull,
        pressed && styles.panelPressed,
      ]}
    >
      <Text
        style={[
          styles.panelHeading,
          { color: palette.heading },
          titleIsUrdu && styles.panelHeadingUrdu,
        ]}
        numberOfLines={1}
      >
        {activeLabel}
      </Text>

      <Text
        style={[
          styles.panelPreview,
          { color: palette.text },
          previewIsUrdu && styles.panelPreviewUrdu,
        ]}
        numberOfLines={3}
      >
        {activePreview}
      </Text>

      <Text style={[styles.panelReference, { color: palette.reference }]} numberOfLines={1}>
        {reference}
      </Text>

      <View style={styles.hintRow}>
        {canFlip ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={flipLabel}
            onPress={onToggleFlip}
            style={({ pressed }) => [styles.flipBtn, pressed && styles.flipBtnPressed]}
          >
            <MaterialIcons
              name="flip"
              size={14}
              color={palette.icon}
            />
            <Text style={[styles.flipBtnText, { color: palette.hint }]}>{flipLabel}</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.panelHint, { color: palette.hint }]} numberOfLines={1}>
          {hint}
        </Text>
        <MaterialIcons
          name="chevron-right"
          size={16}
          color={palette.icon}
          style={styles.hintIcon}
        />
      </View>
    </Pressable>
  );
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

      <View style={[styles.innerDivider, { backgroundColor: palette.divider }]} />

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
  hadithExpandHint = 'Tap to expand',
  verseExpandHint = 'Tap to expand',
  autoFlipMs = 6000,
  isLoading,
  nightMode,
}: SacredContentModuleProps) {
  const palette = getPalette(nightMode);
  const [hadithFlipped, setHadithFlipped] = useState(false);
  const [verseFlipped, setVerseFlipped] = useState(false);

  const canFlipHadith = useMemo(() => (hadithPreviewUrdu ?? '').trim().length > 0, [hadithPreviewUrdu]);
  const canFlipVerse = useMemo(() => (versePreviewUrdu ?? '').trim().length > 0, [versePreviewUrdu]);

  useEffect(() => {
    if (!canFlipHadith && !canFlipVerse) return;

    const timerId = setInterval(() => {
      if (canFlipHadith) setHadithFlipped((prev) => !prev);
      if (canFlipVerse) setVerseFlipped((prev) => !prev);
    }, Math.max(3000, autoFlipMs));

    return () => clearInterval(timerId);
  }, [autoFlipMs, canFlipHadith, canFlipVerse]);

  if (isLoading) {
    return <LoadingSkeleton nightMode={nightMode} />;
  }

  const hadithPreviewSafe = hadithPreview.trim();
  const hadithSourceSafe = hadithSource.trim();
  const versePreviewSafe = versePreview.trim();
  const verseReferenceSafe = verseReference.trim();

  const hasHadith = hadithPreviewSafe.length > 0 || hadithSourceSafe.length > 0;
  const hasVerse = versePreviewSafe.length > 0 || verseReferenceSafe.length > 0;
  const showBothPanels = hasHadith && hasVerse;

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
        <SacredPanel
          label={hadithLabel}
          labelUrdu={hadithLabelUrdu}
          previewFront={hadithPreviewSafe || 'Adhkar coming soon.'}
          previewBack={hadithPreviewUrdu}
          reference={hadithSourceSafe || 'Reference pending'}
          hint={hadithExpandHint}
          onPress={onPressHadith}
          isFlipped={hadithFlipped}
          onToggleFlip={() => setHadithFlipped((prev) => !prev)}
          tone="hadith"
          fullWidth={!showBothPanels}
          nightMode={nightMode}
        />
      ) : null}

      {showBothPanels ? (
        <View style={[styles.innerDivider, { backgroundColor: palette.divider }]} />
      ) : null}

      {hasVerse ? (
        <SacredPanel
          label={verseLabel}
          labelUrdu={verseLabelUrdu}
          previewFront={versePreviewSafe || 'Verse coming soon.'}
          previewBack={versePreviewUrdu}
          reference={verseReferenceSafe || 'Reference pending'}
          hint={verseExpandHint}
          onPress={onPressVerse}
          isFlipped={verseFlipped}
          onToggleFlip={() => setVerseFlipped((prev) => !prev)}
          tone="verse"
          fullWidth={!showBothPanels}
          nightMode={nightMode}
        />
      ) : null}

      {!hasHadith && !hasVerse ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: palette.reference }]}>Adhkar coming soon.</Text>
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
    flexDirection: 'row',
    minHeight: 158,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 6px 20px rgba(42, 33, 18, 0.08)' }
      : {
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
        }),
    elevation: 3,
  },
  panel: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  panelFull: {
    flex: 1,
  },
  panelPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.994 }],
  },
  innerDivider: {
    width: 1,
  },
  panelHeading: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  panelHeadingUrdu: {
    fontFamily: 'UrduNastaliqBold',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '400',
  },
  panelPreview: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    minHeight: 66,
  },
  panelPreviewUrdu: {
    fontFamily: 'UrduNastaliqBold',
    writingDirection: 'rtl',
    textAlign: 'right',
    fontSize: 22,
    lineHeight: 34,
    fontWeight: '400',
  },
  panelReference: {
    marginTop: 8,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
  },
  hintRow: {
    marginTop: 'auto',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(122,138,122,0.28)',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  flipBtnPressed: {
    opacity: 0.76,
  },
  flipBtnText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
  },
  panelHint: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '500',
    flex: 1,
  },
  hintIcon: {
    marginLeft: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skeletonShell: {
    alignItems: 'stretch',
  },
  skeletonPanel: {
    flex: 1,
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
    marginBottom: 18,
  },
  skeletonHint: {
    width: '42%',
    height: 12,
    marginTop: 'auto',
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