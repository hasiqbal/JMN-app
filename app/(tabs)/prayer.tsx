import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  ADHAAN_AUDIO_OPTIONS,
  ADHAAN_AUDIO_STORAGE_KEY,
  DEFAULT_ADHAAN_AUDIO_URL,
  isValidAdhaanAudioUrl,
} from '@/constants/prayerNotifications';
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
  const [selectedAdhaanUrl, setSelectedAdhaanUrl] = useState(DEFAULT_ADHAAN_AUDIO_URL);
  const [adhaanChooserVisible, setAdhaanChooserVisible] = useState(false);
  const [previewingUrl, setPreviewingUrl] = useState<string | null>(null);
  const previewPlayerRef = React.useRef<AudioPlayer | null>(null);
  const previewAudioModeReadyRef = React.useRef(false);

  useEffect(() => {
    if (data) setLastUpdated(new Date());
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(ADHAAN_AUDIO_STORAGE_KEY)
      .then((saved) => {
        if (cancelled) return;
        if (!isValidAdhaanAudioUrl(saved)) return;
        setSelectedAdhaanUrl(saved);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const selectAdhaan = (url: string) => {
    setSelectedAdhaanUrl(url);
    AsyncStorage.setItem(ADHAAN_AUDIO_STORAGE_KEY, url).catch(() => {});
  };

  const stopPreview = React.useCallback(async () => {
    const player = previewPlayerRef.current;
    previewPlayerRef.current = null;
    setPreviewingUrl(null);
    if (!player) return;

    try {
      player.pause();
    } catch {
      // Ignore pause failures during cleanup.
    }

    try {
      player.remove();
    } catch {
      // Ignore remove failures on unsupported devices.
    }
  }, []);

  const ensurePreviewAudioMode = React.useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    if (previewAudioModeReadyRef.current) return true;

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: true,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        interruptionModeAndroid: 'doNotMix',
      });
      previewAudioModeReadyRef.current = true;
      return true;
    } catch {
      return false;
    }
  }, []);

  const previewAdhaan = React.useCallback(async (url: string) => {
    if (Platform.OS === 'web') return;

    if (previewingUrl === url) {
      await stopPreview();
      return;
    }

    const canPlay = await ensurePreviewAudioMode();
    if (!canPlay) return;

    await stopPreview();

    try {
      const player = createAudioPlayer({ uri: url }, 400);
      previewPlayerRef.current = player;
      setPreviewingUrl(url);

      player.addListener('playbackStatusUpdate', (status) => {
        if (previewPlayerRef.current !== player) return;
        if (!(status as { didJustFinish?: boolean }).didJustFinish) return;

        try {
          player.remove();
        } catch {
          // Ignore remove failures during natural completion.
        }

        if (previewPlayerRef.current === player) {
          previewPlayerRef.current = null;
          setPreviewingUrl(null);
        }
      });

      player.play();
    } catch {
      await stopPreview();
    }
  }, [ensurePreviewAudioMode, previewingUrl, stopPreview]);

  useEffect(() => {
    return () => {
      void stopPreview();
    };
  }, [stopPreview]);

  const closeAdhaanChooser = React.useCallback(() => {
    setAdhaanChooserVisible(false);
    void stopPreview();
  }, [stopPreview]);

  const selectedAdhaan =
    ADHAAN_AUDIO_OPTIONS.find((item) => item.url === selectedAdhaanUrl) ?? ADHAAN_AUDIO_OPTIONS[0];

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

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setAdhaanChooserVisible(true)}
          style={[
            styles.adhaanStrip,
            N && { borderColor: N.border, backgroundColor: N.surfaceAlt },
          ]}
        >
          <View style={styles.adhaanStripLeft}>
            <MaterialIcons name="notifications-active" size={16} color={N ? '#9BC2EA' : '#1E5BA8'} />
            <Text style={[styles.adhaanStripLabel, N && { color: N.text }]} numberOfLines={1}>
              Choose adhaan notification
            </Text>
          </View>
          <View style={styles.adhaanStripRight}>
            <Text style={[styles.adhaanStripValue, N && { color: N.textSub }]} numberOfLines={1}>
              {selectedAdhaan.label}
            </Text>
            <MaterialIcons name="chevron-right" size={18} color={N ? N.textSub : Colors.textSubtle} />
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={adhaanChooserVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAdhaanChooser}
      >
        <TouchableOpacity activeOpacity={1} style={styles.adhaanModalOverlay} onPress={closeAdhaanChooser}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(event) => event.stopPropagation()}
            style={[styles.adhaanModalCard, N && { backgroundColor: N.surface, borderColor: N.border }]}
          >
            <View style={styles.adhaanModalHeader}>
              <Text style={[styles.adhaanModalTitle, N && { color: N.text }]}>Choose adhaan notification</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close adhaan chooser"
                onPress={closeAdhaanChooser}
                style={styles.adhaanModalCloseBtn}
              >
                <MaterialIcons name="close" size={20} color={N ? N.textSub : Colors.textSubtle} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.adhaanHint, N && { color: N.textMuted }]}>Preview each adhaan before selecting.</Text>

            <View style={styles.adhaanChipRow}>
              {ADHAAN_AUDIO_OPTIONS.map((item) => {
                const active = item.url === selectedAdhaanUrl;
                const isPreviewing = item.url === previewingUrl;
                const actionColor = N ? '#D7E8FF' : '#1E5BA8';
                const inactiveActionColor = N ? N.textSub : Colors.textSubtle;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.adhaanOptionRow,
                      N && { borderColor: N.border, backgroundColor: N.surfaceAlt },
                      active && (N
                        ? { borderColor: '#456A9E' }
                        : { borderColor: '#4E82CF' }),
                    ]}
                  >
                    <View style={styles.adhaanOptionMeta}>
                      <Text style={[styles.adhaanOptionLabel, N && { color: N.text }]}>{item.label}</Text>
                      <Text style={[styles.adhaanOptionSub, N && { color: N.textMuted }]}>
                        {active ? 'Selected' : 'Not selected'}
                      </Text>
                    </View>

                    <View style={styles.adhaanOptionActions}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => { void previewAdhaan(item.url); }}
                        style={[
                          styles.adhaanPreviewBtn,
                          N && { borderColor: N.border, backgroundColor: N.surface },
                          isPreviewing && (N
                            ? { backgroundColor: '#6B2F2F', borderColor: '#8F4545' }
                            : { backgroundColor: '#FDECEC', borderColor: '#D98A8A' }),
                        ]}
                      >
                        <MaterialIcons
                          name={isPreviewing ? 'stop' : 'play-arrow'}
                          size={15}
                          color={isPreviewing ? '#D43737' : actionColor}
                        />
                        <Text
                          style={[
                            styles.adhaanPreviewText,
                            { color: isPreviewing ? '#D43737' : actionColor },
                          ]}
                        >
                          {isPreviewing ? 'Stop' : 'Preview'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                          selectAdhaan(item.url);
                          closeAdhaanChooser();
                        }}
                        style={[
                          styles.adhaanSelectBtn,
                          N && { borderColor: N.border, backgroundColor: N.surface },
                          active && (N
                            ? { backgroundColor: '#2A4A7A', borderColor: '#456A9E' }
                            : { backgroundColor: '#E9F1FF', borderColor: '#4E82CF' }),
                        ]}
                      >
                        <MaterialIcons
                          name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                          size={18}
                          color={active ? actionColor : inactiveActionColor}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
  adhaanStrip: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#B8CEE8',
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  adhaanStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  adhaanStripLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E5BA8',
  },
  adhaanStripRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '48%',
  },
  adhaanStripValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  adhaanModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  adhaanModalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  adhaanModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  adhaanModalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  adhaanModalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adhaanChipRow: {
    gap: 6,
  },
  adhaanOptionRow: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#B8CEE8',
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  adhaanOptionMeta: {
    flex: 1,
    gap: 2,
  },
  adhaanOptionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  adhaanOptionSub: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSubtle,
  },
  adhaanOptionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adhaanPreviewBtn: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#9EC0E7',
    backgroundColor: '#EDF5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  adhaanPreviewText: {
    fontSize: 11,
    fontWeight: '700',
  },
  adhaanSelectBtn: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#9EC0E7',
    backgroundColor: '#EDF5FF',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adhaanHint: {
    fontSize: 11,
    color: Colors.textSubtle,
  },
});