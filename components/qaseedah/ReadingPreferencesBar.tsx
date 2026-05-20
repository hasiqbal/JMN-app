import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import type { LanguageFontScales, LayerVisibility, NightPaletteType, ReadingMode } from './types';

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
  const borderColor = night ? night.border : 'rgba(36, 50, 61, 0.16)';
  const accentColor = night ? '#cfd9e5' : '#2f4153';
  const activeChipFill = night ? 'rgba(255,255,255,0.10)' : 'rgba(36, 50, 61, 0.09)';

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
              { borderColor },
              active && { borderColor: accentColor, backgroundColor: activeChipFill },
            ]}
          >
            <Text
              style={[
                styles.presetChipText,
                night && { color: night.textMuted },
                active && { color: accentColor, fontWeight: '700' },
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
        { borderColor },
        active && { borderColor: accentColor, backgroundColor: activeChipFill },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          night && { color: night.textMuted },
          active && { color: accentColor, fontWeight: '700' },
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
        night && { backgroundColor: 'rgba(10, 16, 28, 0.88)', borderBottomColor: borderColor },
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

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setScalesOpen(true)}
          style={[styles.gearBtn, { borderColor }]}
          hitSlop={6}
          accessibilityLabel="Reading sizes"
        >
          <MaterialIcons name="format-size" size={14} color={night ? night.textMuted : Colors.textSecondary} />
          <Text style={[styles.gearLabel, night && { color: night.textMuted }]}>Sizes</Text>
        </TouchableOpacity>

        <View style={[styles.themeToggle, { borderColor }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={nightMode ? onNightToggle : undefined}
            disabled={!nightMode}
            style={[
              styles.themeOption,
              !nightMode && { backgroundColor: activeChipFill },
            ]}
          >
            <Text style={[styles.themeText, !nightMode && { color: accentColor, fontWeight: '700' }]}>Day</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={nightMode ? undefined : onNightToggle}
            disabled={nightMode}
            style={[
              styles.themeOption,
              nightMode && { backgroundColor: activeChipFill },
            ]}
          >
            <Text style={[styles.themeText, nightMode && { color: accentColor, fontWeight: '700' }]}>Night</Text>
          </TouchableOpacity>
        </View>
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
              night && { backgroundColor: 'rgba(10, 16, 28, 0.92)', borderColor },
            ]}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalKicker, night && { color: night.textMuted }]}>Reading sizes</Text>
              <Text style={[styles.modalTitle, night && { color: night.text }]}>Language Font Sizes</Text>
            </View>

            <View style={styles.modalGrid}>
              <View style={[styles.languageScaleCard, styles.masterScaleCard, { borderColor }]}>
                <Text style={[styles.languageScaleLabel, night && { color: night.textMuted }]}>
                  Master
                </Text>
                <View style={[styles.languageScaleControl, { borderColor }]}> 
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
                <View key={`scale-${item.key}`} style={[styles.languageScaleCard, { borderColor }]}>
                  <Text style={[styles.languageScaleLabel, night && { color: night.textMuted }]}>
                    {item.label}
                  </Text>
                  <View style={[styles.languageScaleControl, { borderColor }]}> 
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
              style={[styles.modalCloseBtn, { borderColor }]}
            >
              <Text style={[styles.modalCloseText, { color: accentColor }]}>Done</Text>
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
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
    backgroundColor: 'rgba(252, 252, 250, 0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(36, 50, 61, 0.16)',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
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
  },
  gearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gearLabel: {
    fontSize: 11,
    letterSpacing: 0.2,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  themeOption: {
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  themeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
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
    backgroundColor: 'rgba(250, 251, 252, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(36, 50, 61, 0.16)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  modalHeader: {
    alignItems: 'center',
    gap: 3,
  },
  modalKicker: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
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
    backgroundColor: 'rgba(36, 50, 61, 0.05)',
  },
  languageScaleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
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
    letterSpacing: 0.1,
  },
});
