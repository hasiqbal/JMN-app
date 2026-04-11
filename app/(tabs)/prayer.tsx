import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import {
  getPrayerTimesForDate,
  getPrayerTimesFromTimetable,
  getNextPrayer,
  getForbiddenTimeInfo,
  formatCountdownSeconds,
  PrayerTimesData,
  PrayerTime,
  ForbiddenTimeInfo,
} from '@/services/prayerService';
import PrayerHeroCard from '@/components/prayer/PrayerHeroCard';
import MonthlyCalendarSection from '@/components/prayer/MonthlyCalendarSection';
import { PRAYER_BG_IMAGES, PRAYER_ICONS } from '@/components/prayer/heroConfig';
import { buildHeroState } from '@/components/prayer/heroState';
import { buildActivePrayerState } from '@/components/prayer/activePrayerState';
import { buildTodayTableRows } from '@/components/prayer/todayRows';
import { useNightMode } from '@/hooks/useNightMode';
import { useLocalSearchParams } from 'expo-router';

// ── Hijri Transliteration ─────────────────────────────────────────────────
const ARABIC_MONTHS: Record<string, string> = {
  'ذو القعدة': "Dhul Qa'dah",
  'ذو الحجّة': 'Dhul Hijjah',
  'ربيع الأوّل': "Rabi' al-Awwal",
  'ربيع الآخر': "Rabi' al-Akhir",
  'جمادى الأولى': 'Jumada al-Ula',
  'جمادى الآخرة': 'Jumada al-Akhirah',
  'محرّم': 'Muharram',
  'رجب': 'Rajab',
  "شعبان": "Sha'ban",
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

function transliterateHijri(arabic: string): string {
  let result = arabic;
  for (const [ar, en] of Object.entries(ARABIC_DAYS)) {
    result = result.replace(ar, en);
  }
  // Sort month keys longest first to avoid partial matches
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

const NIGHT = {
  bg:         '#0A0F1E',
  surface:    '#121929',
  surfaceAlt: '#192338',
  border:     '#1E2D47',
  text:       '#EEF3FC',
  textSub:    '#93B4D8',
  textMuted:  '#5A7A9E',
  rowCurrent: '#173226',
  rowNext:    '#162638',
  rowSpecial: '#141E2F',
  jumuahBg:   '#1A160A',
  jumuahBord: '#3D2F00',
};

const PRAYER_HEADER_GREEN = '#3FAE5A';
const PRAYER_HEADER_GREEN_DARK = '#2F8E47';

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function PrayerScreen() {
  const { width: viewportWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const [data, setData] = useState<PrayerTimesData | null>(null);
  const [loading, setLoading] = useState(true);
  const { view: viewParam } = useLocalSearchParams<{ view?: string }>();
  const [viewMode, setViewMode] = useState<'today' | 'month'>(viewParam === 'month' ? 'month' : 'today');
  const [monthViewSeed, setMonthViewSeed] = useState(0);

  const openMonthlyView = React.useCallback(() => {
    setMonthViewSeed((s) => s + 1);
    setViewMode('month');
  }, []);

  // Respond to navigation param changes (e.g. from Home date card)
  React.useEffect(() => {
    if (viewParam === 'month') openMonthlyView();
  }, [viewParam, openMonthlyView]);
  const [forbiddenInfo, setForbiddenInfo] = useState<ForbiddenTimeInfo | null>(null);
  const now = useCurrentTime();

  // next prayer info - updated every second
  const [nextInfo, setNextInfo] = useState<{ prayer: PrayerTime; secondsLeft: number } | null>(null);

  // ── Prayer alert state ──────────────────────────────────────────────────
  const flashAnim = useRef(new Animated.Value(1)).current;
  const flashLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const {
    activePrayer,
    jamaatStarted,
    jamaatOngoing,
    alertMode,
    jamaatCountdown,
    hasJamaat,
  } = React.useMemo(() => buildActivePrayerState(data?.prayers, now), [data, now]);

  useEffect(() => {
    if (jamaatStarted && jamaatOngoing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 0.15, duration: 400, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      flashLoopRef.current = loop;
      loop.start();
    } else {
      flashLoopRef.current?.stop();
      flashLoopRef.current = null;
      flashAnim.setValue(1);
    }
    return () => { flashLoopRef.current?.stop(); };
  }, [jamaatStarted, jamaatOngoing, flashAnim]);

  const loadTimes = useCallback(async () => {
    // Seed instantly from local timetable
    const local = getPrayerTimesFromTimetable();
    if (local) setData(local);
    setLoading(true);
    try {
      const result = await getPrayerTimesForDate();
      if (result) setData(result);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadTimes(); }, [loadTimes]);

  // Refresh at midnight
  useEffect(() => {
    if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
      loadTimes();
    }
  }, [now, loadTimes]);

  // Update next prayer / forbidden info every second
  useEffect(() => {
    if (!data) return;
    setNextInfo(getNextPrayer(data.prayers));
    setForbiddenInfo(getForbiddenTimeInfo(data.prayers));
  }, [data, now]);

  const countdown = nextInfo ? formatCountdownSeconds(nextInfo.secondsLeft) : '';
  const nextPrayerName = nextInfo?.prayer.name ?? '';

  // show a subtle source indicator
  const sourceLabel = loading ? 'Syncing with database…' : 'Live · Jami\u2019 Masjid Noorani, Halifax · 2026';

  const hasPassed = useCallback((prayer: PrayerTime): boolean => {
    return prayer.timeDate <= now;
  }, [now]);

  const isCurrentPrayer = useCallback((prayer: PrayerTime): boolean => {
    if (!data) return false;
    const timeline = data.prayers;
    const idx = timeline.findIndex(p => p.name === prayer.name);
    if (idx < 0) return false;
    const start = timeline[idx].timeDate;
    const end = timeline[idx + 1]?.timeDate ?? new Date(start.getTime() + 3600000);
    return now >= start && now < end;
  }, [data, now]);

  // Night mode (auto from prayer times, overrideable via toggle)
  const N = nightMode ? NIGHT : null; // shorthand; null = day mode

  // Find next prayer Iqamah
  const nextIqamah = nextInfo?.prayer.iqamah && nextInfo.prayer.iqamah !== '-'
    ? nextInfo.prayer.iqamah
    : null;

  const {
    heroImageKey,
    heroGradientColors,
    heroProgress,
    heroJamaatMarker,
    heroEndMarker,
    heroPrayerName,
    heroCountdownInfo,
  } = React.useMemo(() => buildHeroState({
    forbiddenInfo,
    data,
    now,
    activePrayer,
    nextPrayerName,
    nextInfo,
    hasJamaat,
    jamaatStarted,
    jamaatOngoing,
    jamaatCountdown,
    countdown,
  }), [
    forbiddenInfo,
    data,
    now,
    activePrayer,
    nextPrayerName,
    nextInfo,
    hasJamaat,
    jamaatStarted,
    jamaatOngoing,
    jamaatCountdown,
    countdown,
  ]);

  const isFridayJumuahHero = false;

  const heroWide = viewportWidth >= 700;
  const todayRows = React.useMemo(() => {
    if (!data) return [];
    return buildTodayTableRows({
      prayers: data.prayers,
      now,
      nextPrayerName,
      nightMode,
      hasPassed,
      isCurrentPrayer,
    });
  }, [data, now, nextPrayerName, nightMode, hasPassed, isCurrentPrayer]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }, N && { backgroundColor: N.bg }]}>
      {/* Header — compact in month view, full in today view */}
      {viewMode === 'month' ? (
        /* ── Compact month header ── */
        <View style={[styles.headerCompact, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
          <TouchableOpacity onPress={() => setViewMode('today')} style={styles.backToTodayBtn} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back" size={18} color={N ? '#69A8FF' : PRAYER_HEADER_GREEN_DARK} />
            <Text style={[styles.backToTodayText, N && { color: '#69A8FF' }]}>Today</Text>
          </TouchableOpacity>
          <Text style={[styles.headerCompactTitle, N && { color: N.text }]}>Monthly View</Text>
        </View>
      ) : (
        /* ── Full today header ── */
        <View style={[styles.header, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
          <View style={styles.headerRowCompact}>
            <Text style={[styles.headerMasjidCompact, N && { color: N.text }]}>Jami&apos; Masjid Noorani</Text>
          </View>

          <TouchableOpacity
            onPress={openMonthlyView}
            activeOpacity={0.82}
            style={[styles.headerMetaRow, N && { backgroundColor: N.surfaceAlt, borderColor: N.border }]}
          >
            <View style={styles.headerMetaLeft}>
              <MaterialIcons name="calendar-today" size={12} color={N ? '#9BC2EA' : Colors.textSubtle} />
              <Text style={[styles.headerMetaDate, N && { color: N.text }]}>
                {now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                {data ? ` • ${transliterateHijri(data.hijriDate)}` : ''}
              </Text>
            </View>
            <View style={styles.headerMetaRight}>
              <MaterialIcons name="place" size={12} color={N ? '#6BB89A' : PRAYER_HEADER_GREEN_DARK} />
              <Text style={[styles.headerMetaLocation, N && { color: N.textSub }]}>Halifax</Text>
              <View style={[styles.headerMetaAction, N && { backgroundColor: '#2A4A7A', borderColor: '#456A9E' }]}>
                <Text style={[styles.headerMetaActionText, N && { color: '#D7E8FF' }]}>View timetable</Text>
                <MaterialIcons name="chevron-right" size={14} color={N ? '#D7E8FF' : '#1E5BA8'} />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Monthly Calendar View — split layout fills remaining screen ── */}
      {viewMode === 'month' ? (
        <MonthlyCalendarSection
          key={`month-view-${monthViewSeed}`}
          today={now}
          nightMode={nightMode}
          nightPalette={NIGHT}
          transliterateHijri={transliterateHijri}
          getHijriDayNum={getHijriDayNum}
          getHijriMonthName={getHijriMonthName}
        />
      ) : null}

      {viewMode === 'today' ? <ScrollView showsVerticalScrollIndicator={false}>
        {/* Prayer Hero Card */}
        <PrayerHeroCard
          visible={!!(forbiddenInfo || nextPrayerName || alertMode)}
          backgroundSource={PRAYER_BG_IMAGES[heroImageKey] ?? PRAYER_BG_IMAGES['Dhuhr']}
          gradientColors={heroGradientColors}
          heroWide={heroWide}
          kicker={forbiddenInfo ? 'Prayer Pause Window' : (activePrayer ? 'Current Prayer' : 'Up Next Prayer')}
          title={heroPrayerName}
          isForbidden={!!forbiddenInfo}
          forbiddenEndsAt={forbiddenInfo?.endsAt ?? '--:--'}
          isFridayJumuahHero={isFridayJumuahHero}
          athanValue={activePrayer?.time ?? nextInfo?.prayer.time ?? ''}
          j1={''}
          j2={''}
          showJamaat={!!((alertMode && hasJamaat && activePrayer?.iqamah) || (!alertMode && nextIqamah))}
          jamaatValue={alertMode ? (activePrayer?.iqamah ?? '') : (nextIqamah ?? '')}
          countdownInfo={heroCountdownInfo}
          flashAnim={flashAnim}
          progress={heroProgress}
          jamaatMarker={heroJamaatMarker}
          endMarker={heroEndMarker}
          hasNext={!!nextInfo}
          nextPrayerName={nextPrayerName}
          nextPrayerTime={nextInfo?.prayer.time ?? ''}
          prayerIcons={PRAYER_ICONS}
        />

        {/* Daily Times (clean table) */}
        <View style={[styles.tableHeader, N && { borderBottomColor: N.border }]}> 
          <View style={styles.colPrayer}>
            <Text style={[styles.colLabel, N && { color: N.textMuted }]}>Prayer</Text>
          </View>
          <View style={styles.colTime}>
            <Text style={[styles.colLabel, N && { color: N.textMuted }]}>Begins</Text>
          </View>
          <View style={styles.colTime}>
            <Text style={[styles.colLabel, N && { color: N.textMuted }]}>Jamaat</Text>
          </View>
        </View>

        <View style={[styles.tableBody, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
          {todayRows.map((row, idx) => {
            const prayer = row.prayer;
            const rowStateStyle = row.rowState === 'current'
              ? styles.rowCurrent
              : row.rowState === 'next'
              ? styles.rowNext
              : row.rowState === 'special'
              ? styles.rowSpecial
              : null;

            return (
              <View
                key={prayer.name}
                style={[
                  styles.row,
                  idx < todayRows.length - 1 && styles.rowBorder,
                  rowStateStyle,
                  N && {
                    borderBottomColor: N.border,
                    backgroundColor: row.isCurrent ? N.rowCurrent : row.isNext ? N.rowNext : row.isSpecial ? N.rowSpecial : N.surface,
                  },
                ]}
              >
                <View style={[styles.rowLeft, styles.colPrayer]}>
                  <View
                    style={[
                      styles.prayerIconBox,
                      { backgroundColor: row.iconBg },
                    ]}
                  >
                    <MaterialIcons name={PRAYER_ICONS[prayer.name] as any} size={15} color={row.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.prayerName, N && { color: N.text }]}>{prayer.name}</Text>
                    {row.prayerGuidance ? (
                      <Text style={styles.prayerGuidance}>{row.prayerGuidance}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={[styles.timeColCenter, styles.colTime]}>
                  <Text style={[styles.timeCell, row.isCompleted && styles.timePassed, row.isCurrent && styles.timeCellCurrent, row.isNext && styles.timeCellNext, N && { color: N.text }]}>{prayer.time}</Text>
                  {row.showTomorrowBegins ? (
                    <View style={[styles.tomorrowBadge, N && { backgroundColor: 'rgba(105,168,255,0.16)' }]}>
                      <Text style={[styles.tomorrowLabel, N && { color: '#9BC2EA' }]}>+24h</Text>
                      <Text style={[styles.tomorrowTime, N && { color: '#D7E8FF' }]}>{prayer.tomorrowTime}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={[styles.timeColCenter, styles.colTime]}>
                  {row.isJumuah ? (
                    <View style={styles.jumuahJamaatWrap}>
                      <Text style={[styles.jumuahLabel, N && { color: N.textMuted }]}>First Jamaat</Text>
                      <Text style={[styles.iqamahTime, row.isCompleted && styles.timePassed, row.isCurrent && styles.timeCellCurrent, row.isNext && styles.timeCellNext, N && { color: N.text }]}>
                        {row.jumuahFirstJamaat ?? '—'}
                      </Text>

                      <Text style={[styles.jumuahLabel, styles.jumuahSecondLabel, N && { color: N.textMuted }]}>Second Jamaat</Text>
                      <Text style={[styles.iqamahTime, row.isCompleted && styles.timePassed, row.isCurrent && styles.timeCellCurrent, row.isNext && styles.timeCellNext, N && { color: N.text }]}>
                        {row.jumuahSecondJamaat ?? '—'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[row.jamaatText === '—' ? styles.timeCellMuted : styles.iqamahTime, row.isCompleted && row.jamaatText !== '—' && styles.timePassed, row.isCurrent && row.jamaatText !== '—' && styles.timeCellCurrent, row.isNext && row.jamaatText !== '—' && styles.timeCellNext, N && row.jamaatText !== '—' && { color: N.text }]}>{row.jamaatText}</Text>
                  )}
                  {row.showTomorrowJamaat ? (
                    <View style={[styles.tomorrowBadge, N && { backgroundColor: 'rgba(105,168,255,0.16)' }]}>
                      <Text style={[styles.tomorrowLabel, N && { color: '#9BC2EA' }]}>+24h</Text>
                      <Text style={[styles.tomorrowTime, N && { color: '#D7E8FF' }]}>{prayer.tomorrowIqamah}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>



        {/* Source */}
        <View style={styles.sourceRow}>
          <MaterialIcons name={loading ? 'sync' : 'check-circle'} size={12} color={N ? '#3A7A5A' : PRAYER_HEADER_GREEN_DARK} />
          <Text style={[styles.sourceText, N && { color: N.textMuted }]}>
            {sourceLabel}
          </Text>
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView> : null}

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
  // Compact header used in month view
  headerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  headerCompactTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  backToTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  backToTodayText: {
    fontSize: 13,
    fontWeight: '700',
    color: PRAYER_HEADER_GREEN_DARK,
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
    color: PRAYER_HEADER_GREEN_DARK,
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
    gap: 2,
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
    color: PRAYER_HEADER_GREEN_DARK,
  },

  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dateText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  hijriText: { ...Typography.bodySmall, color: Colors.primary, marginTop: 1 },

  // ── Compact Hero Bars ─────────────────────────────
  heroStack: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: Spacing.md,
    gap: 8,
    marginTop: 10,
  },
  heroStackMobile: {
    flexDirection: 'column',
  },
  heroMiniWrap: {
    flex: 1,
    minWidth: 0,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  heroMiniWrapMobile: {
    flex: 0,
    width: '100%',
  },
  heroMiniCard: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#0C1F3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 5,
  },
  heroMiniCardNow: {
    backgroundColor: '#2A5FAF',
  },
  heroMiniCardPause: {
    backgroundColor: '#9B3F18',
  },
  heroMiniCardNext: {
    backgroundColor: '#CF620F',
  },
  heroNextTimesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  heroNextTimeBlock: {
    flexDirection: 'column',
  },
  heroNextTimeLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  heroNextTimeValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroMini: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  heroMiniTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroMiniLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroMiniEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroMiniMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroMiniLeft: {
    flex: 1,
    paddingRight: 4,
  },
  // Hero card styles moved to components/prayer/PrayerHeroCard.tsx

  // ── Table ─────────────────────────────────────────
  prayerCardsScroller: {
    marginTop: 14,
  },
  prayerCardsTrack: {
    paddingHorizontal: Spacing.md,
    gap: 12,
    paddingBottom: 6,
  },
  prayerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  jumuahCardHighlight: {
    borderWidth: 1.5,
    borderColor: '#FFD54F',
    backgroundColor: '#FFF9E8',
  },
  prayerCardCurrentWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    transform: [{ scale: 1.08 }],
    zIndex: 2,
    marginVertical: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  prayerCardCurrentGradient: {
    padding: Spacing.md,
    gap: 10,
  },
  prayerCardNext: {
    borderLeftWidth: 3,
  },
  prayerCardSpecial: {
    backgroundColor: '#FFFDE7',
  },
  prayerCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prayerCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  prayerCardTitleOnGradient: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  prayerCardMeta: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtle,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  prayerCardTimesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  prayerCardTimeBlock: {
    flex: 1,
    gap: 3,
  },
  prayerCardTimeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  prayerCardTimeLabelOnGradient: {
    color: 'rgba(255,255,255,0.85)',
  },
  prayerCardTimeVal: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  prayerCardTimeValOnGradient: {
    color: '#FFFFFF',
  },
  prayerCardFuture: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtle,
    marginTop: 3,
  },
  zawaalModule: {
    gap: 6,
    marginTop: 2,
  },
  zawaalSkyStrip: {
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zawaalSkyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5C4A22',
    letterSpacing: 0.3,
  },
  zawaalSkyMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6E5A2C',
    fontVariant: ['tabular-nums'],
  },
  zawaalTimelineTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(91, 75, 38, 0.22)',
    overflow: 'visible',
  },
  zawaalTimelineFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: '#B8860B',
  },
  zawaalTimelineDot: {
    position: 'absolute',
    top: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#6E5A2C',
    borderWidth: 2,
    borderColor: '#F7EBD1',
    marginLeft: -5,
  },
  zawaalTimelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zawaalTimelineLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6E5A2C',
    fontVariant: ['tabular-nums'],
  },
  prayerCardFutureOnGradient: {
    color: 'rgba(255,255,255,0.88)',
  },
  prayerCardsDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 2,
  },
  prayerCardsDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(29, 90, 60, 0.24)',
  },
  prayerCardsDotActive: {
    width: 18,
    backgroundColor: Colors.primary,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  colLabel: {
    fontSize: 10, fontWeight: '700',
    color: Colors.textSubtle,
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  colPrayer: {
    flex: 1.9,
  },
  colTime: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tableBody: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
    minHeight: 60,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  // Active prayer wrapper — gradient with glow
  rowCurrentWrap: {
    marginHorizontal: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  rowCurrentGradient: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  nowPillRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  nowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  nowPillDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  nowPillText: {
    fontSize: 9, fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rowCurrentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prayerIconBoxCurrent: {
    width: 44, height: 44,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 0,
  },
  prayerNameCurrent: {
    fontSize: 20, fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  nowBadgeCurrent: {
    fontSize: 10, fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    letterSpacing: 0.4,
  },
  currentTimesCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  currentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currentTimeLabel: {
    fontSize: 10, fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    width: 40,
    textAlign: 'right',
  },
  currentTimeVal: {
    fontSize: 15, fontWeight: '800',
    color: '#fff',
  },
  currentIqamah: {
    color: '#ADFFD6',
  },
  rowCurrent: {
    backgroundColor: '#F3FAF6',
    borderLeftWidth: 3,
    borderLeftColor: '#1E6B46',
  },
  rowNext: {
    backgroundColor: '#F5F9FF',
    borderLeftWidth: 3,
    borderLeftColor: '#2A5F9A',
  },
  rowSpecial: {
    backgroundColor: '#FAF8F1',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  prayerIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  prayerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  prayerGuidance: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C0392B',
    marginTop: 3,
    lineHeight: 14,
    maxWidth: 180,
  },
  prayerNameSpecial: {
    fontSize: 14, fontWeight: '500',
    color: Colors.textSecondary,
  },
  specialBadge: {
    fontSize: 9, fontWeight: '600',
    color: '#8D6E0A',
    marginTop: 1,
  },
  forbiddenNote: {
    fontSize: 9,
    fontWeight: '600',
    color: '#B71C1C',
    marginTop: 2,
    maxWidth: 110,
  },
  forbiddenNoteOnGradient: {
    color: '#FFE7B3',
  },
  textWhite: { color: '#fff' },

  timeColCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  timeCell: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  timeCellCurrent: {
    color: '#133423',
  },
  timeCellNext: {
    color: '#173B61',
  },
  timeCellMuted: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSubtle,
    textAlign: 'center',
  },
  timePassed: {
    color: Colors.textSubtle,
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  iqamahTime: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  jumuahJamaatWrap: {
    alignItems: 'center',
  },
  jumuahLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  jumuahSecondLabel: {
    marginTop: 6,
  },

  // +24h tomorrow badge
  tomorrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accent + '30',
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tomorrowTime: {
    fontSize: 11, fontWeight: '700',
    color: Colors.accent,
  },
  tomorrowLabel: {
    fontSize: 9, fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },

  // Forbidden time banner
  forbiddenBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#A61B1B',
    marginHorizontal: Spacing.md,
    marginTop: 12,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  forbiddenLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  forbiddenTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  forbiddenReason: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    fontWeight: '700',
    fontVariant: ['tabular-nums'] as any,
  },
  forbiddenAction: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 4,
    lineHeight: 16,
  },
  forbiddenRight: {
    alignItems: 'flex-end',
    gap: 2,
    paddingTop: 1,
  },
  forbiddenUntilLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  forbiddenUntilTime: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  forbiddenTimer: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    fontVariant: ['tabular-nums'] as any,
  },
  forbiddenProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  forbiddenProgressFill: {
    height: '100%',
    backgroundColor: '#FFD08A',
  },

  // Jumuah countdown banner
  jumuahCountdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing.md,
    marginTop: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#FFD54F',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  jumuahCountdownLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8D6E0A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  jumuahCountdownTimer: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F9A825',
    fontVariant: ['tabular-nums'] as any,
  },
  jumuahCountdownTimes: {
    alignItems: 'flex-end',
    gap: 3,
  },
  jumuahCountdownSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8D6E0A',
  },

  // Jumuah card
  jumuahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginTop: 12,
    padding: Spacing.md,
    backgroundColor: '#FFF8E1',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  jumuahLeft: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, flex: 1,
  },
  jumuahTitle: { fontSize: 16, fontWeight: '700', color: '#5D4037' },
  jumuahSub: { fontSize: 12, color: '#8D6E0A', marginTop: 1 },
  jumuahRight: { alignItems: 'flex-end', gap: 4 },
  fridayBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  fridayBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  jumuahTimes: { alignItems: 'flex-end', gap: 4 },
  jumuahTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jumuahTimeBadge: {
    fontSize: 10, fontWeight: '700',
    color: '#8D6E0A',
    backgroundColor: '#FFD54F',
    paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: 4,
  },
  jumuahTime: { fontSize: 16, fontWeight: '800', color: '#F9A825' },

  // Footer notes
  legend: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md, paddingTop: 12,
  },
  specialNote: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md, paddingTop: 4,
  },
  legendText: {
    ...Typography.bodySmall,
    color: Colors.textSubtle,
    fontSize: 11, flex: 1,
  },
  sourceRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md, paddingTop: 6,
  },
  sourceText: { ...Typography.bodySmall, color: Colors.textSubtle, fontSize: 11 },
});

// ── Monthly Calendar Styles ───────────────────────────────────────────────

