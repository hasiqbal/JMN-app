import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyWirdSections } from '@/components/prayer/DailyWirdSections';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { getHijriDayNumber, getHijriMonthFromAnyFormat } from '@/services/hijriDateUtils';

export default function MyDailyWirdScreen() {
  const router = useRouter();
  const { darkMode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { data } = usePrayerTimes();
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const hijriDayNumber = data ? getHijriDayNumber(data.hijriDate) : '';
  const dayOfYear = Math.floor(
    (currentTime.getTime() - new Date(currentTime.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const hijriDay = Number.parseInt(hijriDayNumber || '0', 10) || ((dayOfYear - 1) % 30) + 1;
  const hijriMonthName = data ? getHijriMonthFromAnyFormat(data.hijriDate) : '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }, darkMode && styles.screenNight]}>
      <View style={[styles.header, darkMode && styles.headerNight]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.backButton, darkMode && styles.backButtonNight]}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="arrow-back"
            size={20}
            color={darkMode ? '#CFDCF2' : Colors.textSecondary}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, darkMode && styles.headerTitleNight]} numberOfLines={1}>
          My Daily Wird
        </Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DailyWirdSections
          prayers={data?.prayers ?? []}
          nightMode={darkMode}
          currentTime={currentTime}
          hijriDay={hijriDay}
          hijriMonthName={hijriMonthName}
        />
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenNight: {
    backgroundColor: '#0B1220',
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerNight: {
    borderBottomColor: 'rgba(173, 198, 235, 0.24)',
    backgroundColor: '#111A2E',
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  backButtonNight: {
    borderColor: 'rgba(173, 198, 235, 0.24)',
    backgroundColor: '#16223A',
  },
  headerTitle: {
    flex: 1,
    color: Colors.textPrimary,
    ...Typography.titleLarge,
  },
  headerTitleNight: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  bottomSpace: {
    height: Spacing.lg,
  },
});
