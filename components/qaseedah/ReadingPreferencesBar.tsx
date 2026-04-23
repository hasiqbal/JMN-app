import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { NightModeToggle } from '@/components/adhkar/NightModeToggle';
import type { LayerVisibility, NightPaletteType, ReadingMode } from './types';

type Props = {
  mode: ReadingMode;
  onModeChange: (mode: ReadingMode) => void;
  layers: LayerVisibility;
  onLayersChange: (layers: LayerVisibility) => void;
  textScale: number;
  onTextScaleChange: (next: number) => void;
  nightMode: boolean;
  onNightToggle: () => void;
  night: NightPaletteType | null;
};

const LAYER_OPTIONS: { key: keyof LayerVisibility; label: string }[] = [
  { key: 'arabic', label: 'Arabic' },
  { key: 'transliteration', label: 'Translit' },
  { key: 'english', label: 'English' },
  { key: 'urdu', label: 'Urdu' },
];

export function ReadingPreferencesBar({
  layers,
  onLayersChange,
  textScale,
  onTextScaleChange,
  nightMode,
  onNightToggle,
  night,
}: Props) {
  const accent = night ? night.accent : Colors.primary;
  const accentSoft = night ? `${night.accent}22` : Colors.primarySoft;
  const softBorder = night ? night.border : Colors.border;

  const allOn = layers.arabic && layers.transliteration && layers.english && layers.urdu;

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
        <View style={styles.nightWrap}>
          <NightModeToggle nightMode={nightMode} onToggle={onNightToggle} />
        </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  nightWrap: {
    flex: 1,
  },
  scaleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 6,
  },
  scaleBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleValue: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
