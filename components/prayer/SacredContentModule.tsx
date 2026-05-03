import React from 'react';
import {
  ActivityIndicator,
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
  hadithExpandHintUrdu?: string;
  verseExpandHint?: string;
  verseExpandHintUrdu?: string;
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
  showUrduToggle?: boolean;
  onRequestUrduText?: () => Promise<string>;
  footerActionLabel?: string;
  onFooterAction?: () => void;
  secondaryFooterActionLabel?: string;
  onSecondaryFooterAction?: (languageMode: 'english' | 'urdu') => void;
  onClose: () => void;
  nightMode?: boolean;
};

const DAY = {
  cardBg: '#F3F8F4',
  cardBorder: 'rgba(63, 174, 90, 0.22)',
  cardShadow: 'rgba(53, 70, 57, 0.10)',
  hadithTint: 'rgba(63, 174, 90, 0.10)',
  verseTint: 'rgba(44, 106, 80, 0.10)',
  heading: '#2C6A50',
  text: '#1F2A24',
  reference: '#4F665B',
  arabicSecondary: '#2E614A',
  cta: '#2C6A50',
  segmentedText: '#55695B',
  segmentedTextActive: '#1F2B22',
  segmentedBorder: 'rgba(63, 174, 90, 0.24)',
  segmentedBg: 'rgba(255, 255, 255, 0.48)',
  segmentedActiveBg: 'rgba(255, 255, 255, 0.9)',
  skeleton: '#DDEADF',
  sheetBg: '#F4FAF6',
  sheetBorder: 'rgba(63, 174, 90, 0.22)',
  sheetText: '#1F2A24',
  sheetSubText: '#4F665B',
  sheetArabic: '#2E614A',
  sheetHandle: 'rgba(44, 106, 80, 0.35)',
  overlay: 'rgba(0, 0, 0, 0.36)',
};

const NIGHT = {
  cardBg: '#141C2C',
  cardBorder: 'rgba(193, 210, 190, 0.14)',
  cardShadow: 'rgba(0, 0, 0, 0.25)',
  hadithTint: 'rgba(99, 152, 113, 0.14)',
  verseTint: 'rgba(111, 194, 133, 0.16)',
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
  hadithExpandHintUrdu,
  verseExpandHint = 'Read more',
  verseExpandHintUrdu,
  autoFlipMs = 3200,
  isLoading,
  nightMode,
}: SacredContentModuleProps) {
  const palette = getPalette(nightMode);

  const hadithLabelSafe = hadithLabel.trim();
  const hadithLabelUrduSafe = (hadithLabelUrdu ?? '').trim();
  const hadithPreviewSafe = hadithPreview.trim();
  const hadithPreviewUrduSafe = (hadithPreviewUrdu ?? '').trim();
  const hadithSourceSafe = hadithSource.trim();
  const hadithExpandHintSafe = hadithExpandHint.trim();
  const hadithExpandHintUrduSafe = (hadithExpandHintUrdu ?? '').trim();

  const verseLabelSafe = verseLabel.trim();
  const verseLabelUrduSafe = (verseLabelUrdu ?? '').trim();
  const versePreviewSafe = versePreview.trim();
  const versePreviewUrduSafe = (versePreviewUrdu ?? '').trim();
  const verseReferenceSafe = verseReference.trim();
  const verseExpandHintSafe = verseExpandHint.trim();
  const verseExpandHintUrduSafe = (verseExpandHintUrdu ?? '').trim();

  const shouldAutoFlipLanguage = !!(
    (hadithLabelSafe && hadithLabelUrduSafe)
    || (verseLabelSafe && verseLabelUrduSafe)
    || (hadithExpandHintSafe && hadithExpandHintUrduSafe)
    || (verseExpandHintSafe && verseExpandHintUrduSafe)
  );

  const [showUrduCopy, setShowUrduCopy] = React.useState(false);

  React.useEffect(() => {
    if (!shouldAutoFlipLanguage || autoFlipMs <= 0) {
      setShowUrduCopy(false);
      return;
    }

    const intervalId = setInterval(() => {
      setShowUrduCopy((prev) => !prev);
    }, autoFlipMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoFlipMs, shouldAutoFlipLanguage]);

  if (isLoading) {
    return <LoadingSkeleton nightMode={nightMode} />;
  }

  const hadithDisplayLabel = showUrduCopy && hadithLabelUrduSafe
    ? hadithLabelUrduSafe
    : (hadithLabelSafe || hadithLabelUrduSafe);
  const verseDisplayLabel = showUrduCopy && verseLabelUrduSafe
    ? verseLabelUrduSafe
    : (verseLabelSafe || verseLabelUrduSafe);
  const hadithDisplayHint = showUrduCopy && hadithExpandHintUrduSafe
    ? hadithExpandHintUrduSafe
    : (hadithExpandHintSafe || hadithExpandHintUrduSafe);
  const verseDisplayHint = showUrduCopy && verseExpandHintUrduSafe
    ? verseExpandHintUrduSafe
    : (verseExpandHintSafe || verseExpandHintUrduSafe);

  const hasHadith = hadithLabelSafe.length > 0
    || hadithLabelUrduSafe.length > 0
    || hadithPreviewSafe.length > 0
    || hadithPreviewUrduSafe.length > 0
    || hadithSourceSafe.length > 0;
  const hasVerse = verseLabelSafe.length > 0
    || verseLabelUrduSafe.length > 0
    || versePreviewSafe.length > 0
    || versePreviewUrduSafe.length > 0
    || verseReferenceSafe.length > 0;

  return (
    <View style={styles.moduleRoot}>
      <View style={styles.moduleHeaderRow}>
        <View style={[styles.moduleHeaderBar, { backgroundColor: palette.heading }]} />
        <Text style={[styles.moduleHeaderText, { color: palette.heading }]}>Your Reminder</Text>
      </View>

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
        {hasHadith || hasVerse ? (
          <View style={styles.tileGrid}>
            {hasHadith ? (
              <Pressable
                accessibilityRole="button"
                onPress={onPressHadith}
                style={({ pressed }) => [
                  styles.tile,
                  { borderColor: palette.cardBorder, backgroundColor: palette.hadithTint },
                  pressed && styles.tilePressed,
                ]}
              >
                <View style={styles.tileTitleRow}>
                  <MaterialIcons name="auto-stories" size={16} color={palette.heading} />
                  <Text
                    style={[
                      styles.tileTitle,
                      { color: palette.text },
                      hasUrduGlyphs(hadithDisplayLabel) && styles.tileTitleUrdu,
                    ]}
                    numberOfLines={2}
                  >
                    {hadithDisplayLabel}
                  </Text>
                </View>
                {!!hadithPreviewSafe && (
                  <Text style={[styles.tileHint, { color: palette.reference }]} numberOfLines={2}>{hadithPreviewSafe}</Text>
                )}
                {!!hadithPreviewUrduSafe && (
                  <Text style={[styles.tileHintUrdu, { color: palette.sheetSubText }]} numberOfLines={1}>{hadithPreviewUrduSafe}</Text>
                )}
                {!!hadithSourceSafe && (
                  <Text style={[styles.tileSource, { color: palette.reference }]} numberOfLines={1}>{hadithSourceSafe}</Text>
                )}
                {!!hadithDisplayHint && (
                  <Text
                    style={[
                      styles.tileAction,
                      { color: palette.cta },
                      hasUrduGlyphs(hadithDisplayHint) && styles.tileActionUrdu,
                    ]}
                  >
                    {hadithDisplayHint}
                  </Text>
                )}
              </Pressable>
            ) : null}

            {hasVerse ? (
              <Pressable
                accessibilityRole="button"
                onPress={onPressVerse}
                style={({ pressed }) => [
                  styles.tile,
                  { borderColor: palette.cardBorder, backgroundColor: palette.verseTint },
                  pressed && styles.tilePressed,
                ]}
              >
                <View style={styles.tileTitleRow}>
                  <MaterialIcons name="menu-book" size={16} color={palette.heading} />
                  <Text
                    style={[
                      styles.tileTitle,
                      { color: palette.text },
                      hasUrduGlyphs(verseDisplayLabel) && styles.tileTitleUrdu,
                    ]}
                    numberOfLines={2}
                  >
                    {verseDisplayLabel}
                  </Text>
                </View>
                {!!versePreviewSafe && (
                  <Text style={[styles.tileHint, { color: palette.reference }]} numberOfLines={2}>{versePreviewSafe}</Text>
                )}
                {!!versePreviewUrduSafe && (
                  <Text style={[styles.tileHintUrdu, { color: palette.sheetSubText }]} numberOfLines={1}>{versePreviewUrduSafe}</Text>
                )}
                {!!verseReferenceSafe && (
                  <Text style={[styles.tileSource, { color: palette.reference }]} numberOfLines={1}>{verseReferenceSafe}</Text>
                )}
                {!!verseDisplayHint && (
                  <Text
                    style={[
                      styles.tileAction,
                      { color: palette.cta },
                      hasUrduGlyphs(verseDisplayHint) && styles.tileActionUrdu,
                    ]}
                  >
                    {verseDisplayHint}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: palette.reference }]}>No sacred content available.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function SacredReadingSheet({
  visible,
  title,
  fullText,
  reference,
  secondaryText,
  showUrduToggle,
  onRequestUrduText,
  footerActionLabel,
  onFooterAction,
  secondaryFooterActionLabel,
  onSecondaryFooterAction,
  onClose,
  nightMode,
}: SacredReadingSheetProps) {
  const palette = getPalette(nightMode);
  const [languageMode, setLanguageMode] = React.useState<'english' | 'urdu'>('english');
  const [resolvedUrduText, setResolvedUrduText] = React.useState('');
  const [translatingUrdu, setTranslatingUrdu] = React.useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setLanguageMode('english');
    setResolvedUrduText('');
    setTranslatingUrdu(false);
  }, [visible, title, fullText]);

  const supportsUrduToggle = showUrduToggle === true && !!onRequestUrduText;
  const displayText = languageMode === 'urdu' && resolvedUrduText ? resolvedUrduText : fullText;
  const sheetSegments = displayText
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const arabicSegments = (secondaryText ?? '')
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const handleSelectEnglish = React.useCallback(() => {
    setLanguageMode('english');
  }, []);

  const handleSelectUrdu = React.useCallback(async () => {
    setLanguageMode('urdu');

    if (!onRequestUrduText || translatingUrdu || resolvedUrduText.trim()) {
      return;
    }

    setTranslatingUrdu(true);
    try {
      const translated = (await onRequestUrduText()).trim();
      if (translated) {
        setResolvedUrduText(translated);
      }
    } catch {
      // Keep English visible when translation is unavailable.
    } finally {
      setTranslatingUrdu(false);
    }
  }, [onRequestUrduText, resolvedUrduText, translatingUrdu]);

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

            {supportsUrduToggle && (
              <View style={[styles.sheetLanguageToggle, { borderColor: palette.sheetBorder, backgroundColor: palette.segmentedBg }]}>
                <Pressable
                  onPress={handleSelectEnglish}
                  style={[
                    styles.sheetLanguageToggleOption,
                    languageMode === 'english' && { backgroundColor: palette.segmentedActiveBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.sheetLanguageToggleOptionText,
                      { color: languageMode === 'english' ? palette.segmentedTextActive : palette.segmentedText },
                    ]}
                  >
                    English
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    void handleSelectUrdu();
                  }}
                  style={[
                    styles.sheetLanguageToggleOption,
                    languageMode === 'urdu' && { backgroundColor: palette.segmentedActiveBg },
                  ]}
                >
                  <View style={styles.sheetLanguageToggleUrduRow}>
                    <Text
                      style={[
                        styles.sheetLanguageToggleOptionText,
                        { color: languageMode === 'urdu' ? palette.segmentedTextActive : palette.segmentedText },
                      ]}
                    >
                      اردو
                    </Text>
                    {translatingUrdu && languageMode === 'urdu' && !resolvedUrduText ? (
                      <ActivityIndicator size="small" color={palette.segmentedTextActive} />
                    ) : null}
                  </View>
                </Pressable>

                {!!secondaryFooterActionLabel && !!onSecondaryFooterAction && (
                  <Pressable
                    onPress={() => onSecondaryFooterAction(languageMode)}
                    style={styles.sheetLanguageToggleOption}
                  >
                    <Text
                      style={[
                        styles.sheetLanguageToggleOptionText,
                        { color: palette.segmentedText },
                      ]}
                    >
                      {secondaryFooterActionLabel}
                    </Text>
                  </Pressable>
                )}
              </View>
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
              <Text style={[styles.sheetBodyText, { color: palette.sheetText }]}>{displayText}</Text>
            )}

            {arabicSegments.length > 0 ? (
              arabicSegments.map((segment, index) => (
                <Text
                  key={`arabic-${segment.slice(0, 24)}-${index}`}
                  style={[styles.sheetArabicText, { color: palette.sheetArabic }]}
                >
                  {segment}
                </Text>
              ))
            ) : !!secondaryText?.trim() ? (
              <Text style={[styles.sheetArabicText, { color: palette.sheetArabic }]}>{secondaryText.trim()}</Text>
            ) : null}
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
  moduleRoot: {
    marginTop: 4,
    marginBottom: 8,
  },
  moduleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  moduleHeaderBar: {
    width: 3,
    height: 11,
    borderRadius: 2,
  },
  moduleHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  shell: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
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
  tileGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 9,
    minHeight: 112,
    justifyContent: 'flex-start',
  },
  tilePressed: {
    opacity: 0.82,
  },
  tileTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  tileTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    flexShrink: 1,
  },
  tileTitleUrdu: {
    marginTop: 1,
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'UrduNastaliqBold',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  tileHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  tileHintUrdu: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'UrduNastaliqBold',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  tileSource: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  tileAction: {
    marginTop: 'auto',
    paddingTop: 10,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  tileActionUrdu: {
    marginTop: 'auto',
    paddingTop: 8,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'UrduNastaliqBold',
    writingDirection: 'rtl',
    textAlign: 'right',
    letterSpacing: 0,
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
    fontWeight: '400',
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
    fontWeight: '400',
    marginBottom: 12,
  },
  sheetLanguageToggle: {
    borderWidth: 1,
    borderRadius: Radius.full,
    padding: 3,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 4,
  },
  sheetLanguageToggleOption: {
    flex: 1,
    minHeight: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  sheetLanguageToggleOptionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  sheetLanguageToggleUrduRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetArabicText: {
    fontSize: 23,
    lineHeight: 38,
    fontWeight: '400',
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 10,
  },
  sheetBodyText: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '400',
    marginBottom: 12,
  },
  sheetBodyTextUrdu: {
    fontFamily: 'UrduNastaliq',
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
    fontWeight: '400',
  },
});