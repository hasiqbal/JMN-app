import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { NightModeToggle } from '@/components/adhkar/NightModeToggle';
import type { LanguageFontScales, LayerVisibility, NightPaletteType, ReadingMode } from './types';

const SERIF_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

type Props = {
  mode: ReadingMode;
  onModeChange: (mode: ReadingMode) => void;
  layers: LayerVisibility;
  onLayersChange: (layers: LayerVisibility) => void;
  textScale: number;
  onTextScaleChange: (next: number) => void;
  languageScales: LanguageFontScales;
  onLanguageScalesChange: (next: LanguageFontScales) => void;
  nightMode: boolean;
  onNightToggle: () => void;
  night: NightPaletteType | null;
};

const LAYER_OPTIONS: { key: keyof LayerVisibility; label: string }[] = [
  { key: 'arabic', label: 'Arabic' },
  { key: 'transliteration', label: 'Translit' },
  { key: 'english', label: 'English' },
  { key: 'urdu', label: 'اردو' },
];

const SCALE_PRESETS = [1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6, 1.65, 1.7, 1.75, 1.8];

export function ReadingPreferencesBar({
  layers,
  onLayersChange,
  textScale,
  onTextScaleChange,
  languageScales,
  onLanguageScalesChange,
  nightMode,
  onNightToggle,
  night,
}: Props) {
  const [scalesOpen, setScalesOpen] = React.useState(false);
  const goldHairline = night ? night.goldHairline : Colors.goldHairline;
  const goldColor = night ? night.gold : Colors.gold;
  const goldInk = night ? night.goldInk : Colors.goldInk;

  const allOn = layers.arabic && layers.transliteration && layers.english && layers.urdu;

  const updateLanguageScale = (key: keyof LanguageFontScales, delta: number) => {
    const nextValue = Math.max(0.7, Math.min(1.8, Number((languageScales[key] + delta).toFixed(2))));
    onLanguageScalesChange({ ...languageScales, [key]: nextValue });
  };

  const renderScalePresets = (activeScale: number, onSelect: (scale: number) => void) => (
    <View style={styles.presetWrap}>
      {SCALE_PRESETS.map((preset) => {
        const active = Math.abs(activeScale - preset) < 0.001;
        return (
          <TouchableOpacity
            key={`preset-${preset}`}
            activeOpacity={0.85}
            onPress={() => onSelect(preset)}
            style={[
              styles.presetChip,
              { borderColor: goldHairline },
              active && { borderColor: goldColor, backgroundColor: `${goldColor}18` },
            ]}
          >
            <Text
              style={[
                styles.presetChipText,
                night && { color: night.textMuted },
                active && { color: goldInk, fontWeight: '700' },
              ]}
            >
              {Math.round(preset * 100)}%
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderChip = (label: string, active: boolean, onPress: () => void, key?: string) => (
    <TouchableOpacity
      key={key}
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: goldHairline },
        active && { borderColor: goldColor },
      ]}
    >
      {active ? <Text style={[styles.chipGlyph, { color: goldColor }]}>✦</Text> : null}
      <Text
        style={[
          styles.chipText,
          night && { color: night.textMuted },
          active && { color: goldInk, fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.wrap,
        night && { backgroundColor: 'rgba(10, 16, 28, 0.88)', borderBottomColor: goldHairline },
      ]}
    >
      <View style={styles.chipsRow}>
        {LAYER_OPTIONS.map((item) =>
          renderChip(
            item.label,
            layers[item.key],
            () => onLayersChange({ ...layers, [item.key]: !layers[item.key] }),
            item.key,
          ),
        )}
        {renderChip('All', allOn, () => {
          if (allOn) onLayersChange({ arabic: true, transliteration: false, english: false, urdu: false });
          else onLayersChange({ arabic: true, transliteration: true, english: true, urdu: true });
        }, 'all')}

        <View style={styles.spacer} />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setScalesOpen(true)}
          style={[styles.gearBtn, { borderColor: goldHairline }]}
          hitSlop={6}
          accessibilityLabel="Reading sizes"
        >
          <MaterialIcons name="format-size" size={14} color={night ? night.textMuted : Colors.textSecondary} />
          <Text style={[styles.gearLabel, { color: goldInk }]}>Sizes</Text>
        </TouchableOpacity>

        <NightModeToggle nightMode={nightMode} onToggle={onNightToggle} size="sm" />
      </View>

      <Modal
        visible={scalesOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setScalesOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setScalesOpen(false)}>
          <Pressable
            style={[
              styles.modalSheet,
              night && { backgroundColor: 'rgba(10, 16, 28, 0.92)', borderColor: goldHairline },
            ]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalKicker, { color: goldInk }]}>Reading sizes</Text>
              <View style={styles.modalTitleRow}>
                <Text style={[styles.modalTitleGlyph, { color: goldColor }]}>﹏</Text>
                <Text style={[styles.modalTitle, night && { color: night.text }]}>Language Font Sizes</Text>
                <Text style={[styles.modalTitleGlyph, { color: goldColor }]}>﹏</Text>
              </View>
            </View>

            <View style={styles.modalGrid}>
              <View style={[styles.languageScaleCard, styles.masterScaleCard, { borderColor: goldHairline }]}>
                <Text style={[styles.languageScaleLabel, night && { color: night.textMuted }]}>
                  Master
                </Text>
                <View style={[styles.languageScaleControl, { borderColor: goldHairline }]}>
                  <TouchableOpacity
                    style={styles.scaleBtn}
                    activeOpacity={0.8}
                    onPress={() => onTextScaleChange(Math.max(0.8, Number((textScale - 0.05).toFixed(2))))}
                    hitSlop={6}
                  >
                    <MaterialIcons name="remove" size={15} color={night ? night.textMuted : Colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={[styles.scaleValue, night && { color: night.text }]}>
                    {Math.round(textScale * 100)}%
                  </Text>
                  <TouchableOpacity
                    style={styles.scaleBtn}
                    activeOpacity={0.8}
                    onPress={() => onTextScaleChange(Math.min(1.8, Number((textScale + 0.05).toFixed(2))))}
                    hitSlop={6}
                  >
                    <MaterialIcons name="add" size={15} color={night ? night.textMuted : Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                {renderScalePresets(textScale, onTextScaleChange)}
              </View>
              {LAYER_OPTIONS.map((item) => (
                <View key={`scale-${item.key}`} style={[styles.languageScaleCard, { borderColor: goldHairline }]}>
                  <Text style={[styles.languageScaleLabel, night && { color: night.textMuted }]}>
                    {item.label}
                  </Text>
                  <View style={[styles.languageScaleControl, { borderColor: goldHairline }]}>
                    <TouchableOpacity
                      style={styles.scaleBtn}
                      activeOpacity={0.8}
                      onPress={() => updateLanguageScale(item.key, -0.05)}
                      hitSlop={6}
                    >
                      <MaterialIcons name="remove" size={15} color={night ? night.textMuted : Colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.scaleValue, night && { color: night.text }]}>
                      {Math.round(languageScales[item.key] * 100)}%
                    </Text>
                    <TouchableOpacity
                      style={styles.scaleBtn}
                      activeOpacity={0.8}
                      onPress={() => updateLanguageScale(item.key, 0.05)}
                      hitSlop={6}
                    >
                      <MaterialIcons name="add" size={15} color={night ? night.textMuted : Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {renderScalePresets(languageScales[item.key], (preset) => {
                    onLanguageScalesChange({ ...languageScales, [item.key]: preset });
                  })}
                </View>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setScalesOpen(false)}
              style={[styles.modalCloseBtn, { borderColor: goldHairline }]}
            >
              <Text style={[styles.modalCloseText, { color: goldInk }]}>✦  Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: 9,
    paddingBottom: 9,
    gap: 7,
    backgroundColor: 'rgba(252, 249, 240, 0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(184, 134, 11, 0.32)',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  spacer: {
    flex: 1,
    minWidth: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipGlyph: {
    fontSize: 9,
    fontWeight: '700',
  },
  chipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontFamily: SERIF_FONT,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  scaleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  scaleBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleValue: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: SERIF_FONT,
  },
  gearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  gearLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 14, 22, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(252, 249, 240, 0.97)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.55)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 3,
  },
  modalKicker: {
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitleGlyph: {
    fontSize: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageScaleCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: 7,
    paddingHorizontal: 9,
    gap: 6,
    minWidth: 140,
    flex: 1,
  },
  masterScaleCard: {
    minWidth: '100%',
    backgroundColor: 'rgba(184, 134, 11, 0.06)',
  },
  languageScaleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: SERIF_FONT,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  languageScaleControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: 'space-between',
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.surface,
  },
  presetChipText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    fontFamily: SERIF_FONT,
  },
  modalCloseBtn: {
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  modalCloseText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
    letterSpacing: 1,
  },
});
