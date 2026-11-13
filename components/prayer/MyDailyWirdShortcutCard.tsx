import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export function MyDailyWirdShortcutCard() {
  const router = useRouter();
  const { darkMode } = useAppTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Open My Daily Wird"
      activeOpacity={0.82}
      onPress={() => router.push('/(tabs)/my-daily-wird')}
      style={[
        styles.card,
        darkMode && styles.cardNight,
      ]}
    >
      <View style={[styles.iconWrap, darkMode && styles.iconWrapNight]}>
        <MaterialIcons
          name="auto-awesome"
          size={21}
          color={darkMode ? '#A7E6BD' : Colors.primary}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, darkMode && styles.titleNight]}>My Daily Wird</Text>
        <Text style={[styles.subtitle, darkMode && styles.subtitleNight]}>
          Quran • Adhkar • Dhikr
        </Text>
      </View>
      <MaterialIcons
        name="chevron-right"
        size={23}
        color={darkMode ? '#A8BAD8' : '#718278'}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#D6E6D9',
    backgroundColor: '#FBF8F1',
    boxShadow: '0px 4px 14px rgba(27, 85, 52, 0.08)',
    elevation: 2,
  },
  cardNight: {
    borderColor: 'rgba(173, 198, 235, 0.24)',
    backgroundColor: '#111A2E',
    boxShadow: 'none',
  },
  iconWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#E8F3E9',
  },
  iconWrapNight: {
    backgroundColor: 'rgba(167, 230, 189, 0.12)',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  titleNight: {
    color: '#FFFFFF',
  },
  subtitle: {
    color: '#6B7A72',
    fontSize: 11,
    fontWeight: '600',
  },
  subtitleNight: {
    color: '#A8BAD8',
  },
});
