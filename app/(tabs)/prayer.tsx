import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { useNightMode } from '@/hooks/useNightMode';
import MonthlyCalendarSection from '@/components/prayer/MonthlyCalendarSection';

const ARABIC_MONTHS: Record<string, string> = {
  'ذو القعدة': "Dhul Qa'dah",
  'ذو الحجّة': 'Dhul Hijjah',
  'ربيع الأوّل': "Rabi' al-Awwal",
  'ربيع الآخر': "Rabi' al-Akhir",
  'جمادى الأولى': 'Jumada al-Ula',
  'جمادى الآخرة': 'Jumada al-Akhirah',
  'محرّم': 'Muharram',
  'رجب': 'Rajab',
  'شعبان': "Sha'ban",
  'رمضان': 'Ramadan',
  'شوّال': 'Shawwal',
  'صفر': 'Safar',
};

const ARABIC_DAYS: Record<string, string> = {
  'الاثنين': 'Monday',
  'الثلاثاء': 'Tuesday',
  'الأربعاء': 'Wednesday',
  'الخميس': 'Thursday',
  'الجمعة': 'Friday',
  'السبت': 'Saturday',
  'الأحد': 'Sunday',
};

const NIGHT = {
  bg: '#0A0F1E',
  surface: '#121929',
  surfaceAlt: '#192338',
  border: '#1E2D47',
  text: '#EEF3FC',
  textSub: '#93B4D8',
  textMuted: '#5A7A9E',
};

function transliterateHijri(arabic: string): string {
  let result = arabic;
  for (const [ar, en] of Object.entries(ARABIC_DAYS)) {
    result = result.replace(ar, en);
  }
  const sorted = Object.entries(ARABIC_MONTHS).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of sorted) {
    result = result.replace(ar, en);
  }
  return result;
}

function getHijriDayNum(hijri: string): string {
  const match = hijri.match(/\b(\d{1,2})\b/);
  return match ? match[1] : '';
}

function getHijriMonthName(hijri: string): string {
  const sorted = Object.entries(ARABIC_MONTHS).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of sorted) {
    if (hijri.includes(ar)) return en;
  }
  return '';
}

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function PrayerScreen() {
  const insets = useSafeAreaInsets();
  const now = useCurrentTime();
  const { nightMode } = useNightMode();
  const { data } = usePrayerTimes();
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  useEffect(() => {
    if (data) setLastUpdated(new Date());
  }, [data]);

  const N = nightMode ? NIGHT : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }, N && { backgroundColor: N.bg }]}>
      <View style={[styles.header, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        <View style={styles.headerRowCompact}>
          <Text style={[styles.headerMasjidCompact, N && { color: N.text }]}>Jami&apos; Masjid Noorani</Text>
          <Text style={{ fontSize: 10, color: N ? N.textMuted : Colors.textSubtle }}>
            Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <TouchableOpacity activeOpacity={0.9} style={[styles.headerMetaRow, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}>
          <View style={styles.headerMetaLeft}>
            <MaterialIcons name="calendar-month" size={12} color={N ? '#9BC2EA' : Colors.textSubtle} />
            <Text style={[styles.headerMetaDate, N && { color: N.text }]}>Full timetable</Text>
          </View>
          <View style={styles.headerMetaRight}>
            <MaterialIcons name="place" size={12} color={N ? '#6BB89A' : '#2F8E47'} />
            <Text style={[styles.headerMetaLocation, N && { color: N.textSub }]}>Halifax</Text>
            <View style={[styles.headerMetaAction, N && { backgroundColor: '#2A4A7A', borderColor: '#456A9E' }]}>
              <Text style={[styles.headerMetaActionText, N && { color: '#D7E8FF' }]}>Today</Text>
              <MaterialIcons name="today" size={13} color={N ? '#D7E8FF' : '#1E5BA8'} />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <MonthlyCalendarSection
        today={now}
        nightMode={nightMode}
        nightPalette={NIGHT}
        transliterateHijri={transliterateHijri}
        getHijriDayNum={getHijriDayNum}
        getHijriMonthName={getHijriMonthName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'column',
    paddingHorizontal: Spacing.md,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 6,
  },
  headerRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerMasjidCompact: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2F8E47',
    letterSpacing: 0.1,
    flex: 1,
  },
  headerMetaRow: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  headerMetaDate: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerMetaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerMetaLocation: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  headerMetaAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#A8D7B3',
    backgroundColor: '#EDF8F0',
  },
  headerMetaActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2F8E47',
  },
});