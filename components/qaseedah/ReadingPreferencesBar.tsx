import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { NightModeToggle } from '@/components/adhkar/NightModeToggle';
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
  const [showLanguageScale, setShowLanguageScale] = React.useState(false);
  const accent = night ? night.accent : Colors.primary;
  const accentSoft = night ? `${night.accent}22` : Colors.primarySoft;
  const softBorder = night ? night.border : Colors.border;

  const allOn = layers.arabic && layers.transliteration && layers.english && layers.urdu;

  const updateLanguageScale = (key: keyof LanguageFontScales, delta: number) => {
    const nextValue = Math.max(0.7, Math.min(1.8, Number((languageScales[key] + delta).toFixed(2))));
    onLanguageScalesChange({
      ...languageScales,
      [key]: nextValue,
    });
  };

  return (
    <View
      style={[
        styles.wrap,
        night && { backgroundColor: night.surface, borderBottomColor: night.border },
      ]}
    >
      <View style={styles.chipsRow}>
        {LAYER_OPTIONS.map((item) => {
          const active = layers[item.key];
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.85}
              onPress={() => onLayersChange({ ...layers, [item.key]: !active })}
              style={[
                styles.chip,
                { borderColor: softBorder },
                active && { backgroundColor: accentSoft, borderColor: accent },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  night && { color: night.textMuted },
                  active && { color: accent, fontWeight: '700' },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            if (allOn) {
              onLayersChange({ arabic: true, transliteration: false, english: false, urdu: false });
            } else {
              onLayersChange({ arabic: true, transliteration: true, english: true, urdu: true });
            }
          }}
          style={[
            styles.chip,
            { borderColor: softBorder },
            allOn && { backgroundColor: accentSoft, borderColor: accent },
          ]}
        >
          <Text
            style={[
              styles.chipText,
              night && { color: night.textMuted },
              allOn && { color: accent, fontWeight: '700' },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <View style={[styles.scaleWrap, { borderColor: softBorder }]}>
          <TouchableOpacity
            style={styles.scaleBtn}
            activeOpacity={0.8}
            onPress={() => onTextScaleChange(Math.max(0.8, Number((textScale - 0.1).toFixed(2))))}
            hitSlop={6}
          >
            <MaterialIcons name="text-decrease" size={16} color={night ? night.textMuted : Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.scaleValue, night && { color: night.text }]}>{Math.round(textScale * 100)}%</Text>
          <TouchableOpacity
            style={styles.scaleBtn}
            activeOpacity={0.8}
            onPress={() => onTextScaleChange(Math.min(1.8, Number((textScale + 0.1).toFixed(2))))}
            hitSlop={6}
          >
            <MaterialIcons name="text-increase" size={16} color={night ? night.textMuted : Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.languageScalePanel, { borderColor: softBorder }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowLanguageScale((prev) => !prev)}
          style={styles.languageScaleHeader}
        >
          <Text style={[styles.languageScaleHeaderText, night && { color: night.text }]}>Language Font Sizes</Text>
          <MaterialIcons
            name={showLanguageScale ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={18}
            color={night ? night.textMuted : Colors.textSecondary}
          />
        </TouchableOpacity>

        {showLanguageScale ? (
          <View style={styles.languageScaleRow}>
            <View style={styles.themeToggleRow}>
              <NightModeToggle nightMode={nightMode} onToggle={onNightToggle} />
            </View>
            {LAYER_OPTIONS.map((item) => (
              <View key={`scale-${item.key}`} style={[styles.languageScaleCard, { borderColor: softBorder }]}>
                <Text style={[styles.languageScaleLabel, night && { color: night.textMuted }]}>{item.label}</Text>
                <View style={[styles.languageScaleControl, { borderColor: softBorder }]}>
                  <TouchableOpacity
                    style={styles.scaleBtn}
                    activeOpacity={0.8}
                    onPress={() => updateLanguageScale(item.key, -0.1)}
                    hitSlop={6}
                  >
                    <MaterialIcons
                      name="remove"
                      size={16}
                      color={night ? night.textMuted : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.scaleValue, night && { color: night.text }]}>
                    {Math.round(languageScales[item.key] * 100)}%
                  </Text>
                  <TouchableOpacity
                    style={styles.scaleBtn}
                    activeOpacity={0.8}
                    onPress={() => updateLanguageScale(item.key, 0.1)}
                    hitSlop={6}
                  >
                    <MaterialIcons name="add" size={16} color={night ? night.textMuted : Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 7,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
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
    width: 24,
    height: 24,
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
  languageScaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  languageScalePanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: 7,
    gap: 6,
  },
  languageScaleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageScaleHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  themeToggleRow: {
    width: '100%',
    marginBottom: 2,
  },
  languageScaleCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: 5,
    paddingHorizontal: 7,
    gap: 5,
    minWidth: 110,
    flex: 1,
  },
  languageScaleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
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
});
