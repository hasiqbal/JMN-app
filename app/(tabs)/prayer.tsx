import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import MonthlyCalendarSection from '@/components/prayer/MonthlyCalendarSection';
import { lookupTimetable } from '@/services/timetableData';

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

const ENGLISH_HIJRI_MONTH_ALIASES: Record<string, string> = {
  muharram: 'Muharram',
  safar: 'Safar',
  "rabi al awwal": "Rabi' al-Awwal",
  "rabi' al-awwal": "Rabi' al-Awwal",
  "rabi al-awwal": "Rabi' al-Awwal",
  "rabi i": "Rabi' al-Awwal",
  "rabi al akhir": "Rabi' al-Akhir",
  "rabi' al-akhir": "Rabi' al-Akhir",
  "rabi al-akhir": "Rabi' al-Akhir",
  "rabi ii": "Rabi' al-Akhir",
  "jumada al ula": 'Jumada al-Ula',
  "jumada al-ula": 'Jumada al-Ula',
  'jumada i': 'Jumada al-Ula',
  "jumada al akhirah": 'Jumada al-Akhirah',
  "jumada al-akhirah": 'Jumada al-Akhirah',
  'jumada ii': 'Jumada al-Akhirah',
  rajab: 'Rajab',
  "sha'ban": "Sha'ban",
  shaban: "Sha'ban",
  ramadan: 'Ramadan',
  shawwal: 'Shawwal',
  "dhul qadah": "Dhul Qa'dah",
  "dhul qidah": "Dhul Qa'dah",
  "dhu al qidah": "Dhul Qa'dah",
  "dhul hijjah": 'Dhul Hijjah',
  "dhu al hijjah": 'Dhul Hijjah',
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
  const lower = hijri.toLowerCase();
  const englishCandidates = Object.keys(ENGLISH_HIJRI_MONTH_ALIASES).sort((a, b) => b.length - a.length);
  for (const key of englishCandidates) {
    if (lower.includes(key)) return ENGLISH_HIJRI_MONTH_ALIASES[key];
  }

  const sorted = Object.entries(ARABIC_MONTHS).sort((a, b) => b[0].length - a[0].length);
  for (const [ar, en] of sorted) {
    if (hijri.includes(ar)) return en;
  }
  return '';
}

function useTodayDate() {
  const [todayDate, setTodayDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      setTodayDate((prev) => (prev.getTime() === nextDate.getTime() ? prev : nextDate));
    }, 60_000);

    return () => clearInterval(id);
  }, []);

  return todayDate;
}

export default function PrayerScreen() {
  const insets = useSafeAreaInsets();
  const todayDate = useTodayDate();
  const { nightMode } = useNightMode();
  const N = nightMode ? NIGHT : null;
  const todayHijriRaw = lookupTimetable(todayDate)?.hijri ?? '';
  const todayHijriYear = todayHijriRaw.match(/\b(\d{4})\b/)?.[1] ?? '';
  const currentHijriMonthYearLabel = todayHijriRaw
    ? `${getHijriMonthName(todayHijriRaw)}${todayHijriYear ? ` ${todayHijriYear} AH` : ''}`.trim()
    : '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }, N && { backgroundColor: N.bg }]}> 
      <MonthlyCalendarSection
        today={todayDate}
        nightMode={nightMode}
        nightPalette={NIGHT}
        transliterateHijri={transliterateHijri}
        getHijriDayNum={getHijriDayNum}
        getHijriMonthName={getHijriMonthName}
        currentHijriMonthYearLabel={currentHijriMonthYearLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
