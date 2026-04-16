import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { MaterialIcons } from '@expo/vector-icons';
import { Radius, Spacing } from '@/constants/theme';
import PrayerTimesTable from '@/components/prayer/PrayerTimesTable';
import type { DrawerPrayerRow } from '@/components/prayer/prayerDrawerState';

type PrayerDrawerSheetProps = {
  bottomSheetRef: React.RefObject<BottomSheet | null>;
  rows: DrawerPrayerRow[];
  dateLine: string;
  nightMode: boolean;
  bottomInset: number;
  onOpenCalendar: () => void;
  onIndexChange: (index: number) => void;
  webVisible?: boolean;
  onWebClose?: () => void;
};

const NIGHT = {
  sheet: '#111E33',
  text: '#EAF4F0',
  textSub: '#AFC9BE',
  divider: 'rgba(214, 236, 223, 0.18)',
  actionBg: '#1B2D47',
  actionBorder: 'rgba(170, 225, 196, 0.3)',
  actionText: '#DDF1E7',
};

export default function PrayerDrawerSheet({
  bottomSheetRef,
  rows,
  dateLine,
  nightMode,
  bottomInset,
  onOpenCalendar,
  onIndexChange,
  webVisible = false,
  onWebClose,
}: PrayerDrawerSheetProps) {
  const snapPoints = useMemo(() => ['22%', '58%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.28}
      />
    ),
    [],
  );

  if (Platform.OS === 'web') {
    return (
      <Modal
        visible={webVisible}
        transparent
        animationType="fade"
        onRequestClose={onWebClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.webOverlay} onPress={onWebClose}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(event) => event.stopPropagation()}
            style={[styles.webSheet, nightMode ? styles.backgroundNight : styles.backgroundDay, { paddingBottom: Math.max(14, bottomInset + 6) }]}
          >
            <View style={[styles.handle, nightMode && { backgroundColor: 'rgba(214, 236, 223, 0.62)' }]} />

            <View style={[styles.header, nightMode && { borderBottomColor: NIGHT.divider }]}>
              <View style={styles.headerTextBlock}>
                <Text style={[styles.title, nightMode && { color: NIGHT.text }]}>Today&apos;s Salah</Text>
                <Text style={[styles.date, nightMode && { color: NIGHT.textSub }]} numberOfLines={1}>{dateLine}</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close today's salah drawer"
                onPress={onWebClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
              >
                <MaterialIcons name="close" size={22} color={nightMode ? NIGHT.text : '#1E362A'} />
              </TouchableOpacity>
            </View>

            <PrayerTimesTable rows={rows} nightMode={nightMode} />

            <View style={styles.actionWrap}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Open full prayer calendar"
                activeOpacity={0.88}
                onPress={onOpenCalendar}
                style={[
                  styles.actionBtn,
                  nightMode
                    ? { backgroundColor: NIGHT.actionBg, borderColor: NIGHT.actionBorder }
                    : styles.actionBtnDay,
                ]}
              >
                <MaterialIcons name="calendar-month" size={16} color={nightMode ? '#9BE5A8' : '#2D8B5F'} />
                <Text style={[styles.actionText, nightMode ? { color: NIGHT.actionText } : styles.actionTextDay]}>Open Calendar</Text>
                <MaterialIcons name="arrow-forward" size={15} color={nightMode ? NIGHT.actionText : '#2D8B5F'} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={onIndexChange}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={[styles.handle, nightMode && { backgroundColor: 'rgba(214, 236, 223, 0.62)' }]}
      backgroundStyle={[styles.background, nightMode ? styles.backgroundNight : styles.backgroundDay]}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(14, bottomInset + 6) }]}>
        <View style={[styles.header, nightMode && { borderBottomColor: NIGHT.divider }]}> 
          <View style={styles.headerTextBlock}>
            <Text style={[styles.title, nightMode && { color: NIGHT.text }]}>Today&apos;s Salah</Text>
            <Text style={[styles.date, nightMode && { color: NIGHT.textSub }]} numberOfLines={1}>{dateLine}</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close today's salah drawer"
            onPress={() => bottomSheetRef.current?.close()}
            style={styles.closeBtn}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <MaterialIcons name="close" size={22} color={nightMode ? NIGHT.text : '#1E362A'} />
          </TouchableOpacity>
        </View>

        <PrayerTimesTable rows={rows} nightMode={nightMode} />

        {/* Keep this action inside the sheet to preserve the home-context feel. */}
        <View style={styles.actionWrap}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open full prayer calendar"
            activeOpacity={0.88}
            onPress={onOpenCalendar}
            style={[
              styles.actionBtn,
              nightMode
                ? { backgroundColor: NIGHT.actionBg, borderColor: NIGHT.actionBorder }
                : styles.actionBtnDay,
            ]}
          >
            <MaterialIcons name="calendar-month" size={16} color={nightMode ? '#9BE5A8' : '#2D8B5F'} />
            <Text style={[styles.actionText, nightMode ? { color: NIGHT.actionText } : styles.actionTextDay]}>Open Calendar</Text>
            <MaterialIcons name="arrow-forward" size={15} color={nightMode ? NIGHT.actionText : '#2D8B5F'} />
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  webSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    maxHeight: '72%',
  },
  background: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  backgroundDay: {
    backgroundColor: '#F2F9F3',
  },
  backgroundNight: {
    backgroundColor: NIGHT.sheet,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(45, 120, 82, 0.45)',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 111, 79, 0.16)',
  },
  headerTextBlock: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1C3025',
    letterSpacing: 0.2,
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
    color: '#637A6D',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionWrap: {
    marginTop: 12,
  },
  actionBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionBtnDay: {
    backgroundColor: '#E7F3EA',
    borderColor: 'rgba(45, 120, 82, 0.24)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionTextDay: {
    color: '#1D5238',
  },
});
