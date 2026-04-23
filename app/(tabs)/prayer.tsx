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
import {
  isAdhaanMutedEnabled,
  setAdhaanMutedEnabled,
  stopActiveAdhaan,
} from '@/hooks/useQuranPrayerPopups';
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
  const [selectedAdhaanUrl, setSelectedAdhaanUrl] = useState(DEFAULT_ADHAAN_AUDIO_URL);
  const [adhaanMuted, setAdhaanMuted] = useState(false);
  const [adhaanChooserVisible, setAdhaanChooserVisible] = useState(false);
  const [previewingUrl, setPreviewingUrl] = useState<string | null>(null);
  const previewPlayerRef = React.useRef<AudioPlayer | null>(null);
  const previewAudioModeReadyRef = React.useRef(false);

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

  useEffect(() => {
    let cancelled = false;

    isAdhaanMutedEnabled()
      .then((muted) => {
        if (cancelled) return;
        setAdhaanMuted(muted);
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
      const player = createAudioPlayer({ uri: url }, { updateInterval: 400 });
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

  const toggleAdhaanMuted = React.useCallback(() => {
    const nextMuted = !adhaanMuted;
    setAdhaanMuted(nextMuted);

    setAdhaanMutedEnabled(nextMuted).catch(() => {
      setAdhaanMuted((current) => !current);
    });
  }, [adhaanMuted]);

  const stopAdhaanNow = React.useCallback(() => {
    void stopActiveAdhaan();
  }, []);

  const selectedAdhaan =
    ADHAAN_AUDIO_OPTIONS.find((item) => item.url === selectedAdhaanUrl) ?? ADHAAN_AUDIO_OPTIONS[0];

  const N = nightMode ? NIGHT : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }, N && { backgroundColor: N.bg }]}>
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
        betweenCalendarAndTimetable={(
          <View style={[styles.adhaanUnifiedRow, N && { borderColor: N.border, backgroundColor: N.surfaceAlt }]}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setAdhaanChooserVisible(true)}
              style={styles.adhaanUnifiedPicker}
            >
              <MaterialIcons name="notifications-active" size={16} color={N ? '#9BC2EA' : '#1E5BA8'} />
              <Text style={[styles.adhaanUnifiedTitle, N && { color: N.text }]} numberOfLines={1}>Adhaan for notifications</Text>
              <Text style={[styles.adhaanUnifiedLabel, N && { color: N.textSub }]} numberOfLines={1}>{selectedAdhaan.label}</Text>
              <MaterialIcons name="expand-more" size={18} color={N ? N.textSub : Colors.textSubtle} />
            </TouchableOpacity>

            <View style={styles.adhaanControlActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={toggleAdhaanMuted}
                style={[
                  styles.adhaanMuteBtn,
                  N && { borderColor: N.border, backgroundColor: N.surface },
                  adhaanMuted && (N
                    ? { backgroundColor: '#4D2A2A', borderColor: '#7F4A4A' }
                    : { backgroundColor: '#FDECEC', borderColor: '#E4A1A1' }),
                ]}
              >
                <MaterialIcons
                  name={adhaanMuted ? 'volume-off' : 'volume-up'}
                  size={16}
                  color={adhaanMuted ? '#D43737' : (N ? '#D7E8FF' : '#1E5BA8')}
                />
                <Text
                  style={[
                    styles.adhaanMuteBtnText,
                    { color: adhaanMuted ? '#D43737' : (N ? '#D7E8FF' : '#1E5BA8') },
                  ]}
                >
                  {adhaanMuted ? 'Unmute' : 'Mute'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={stopAdhaanNow}
                style={[styles.adhaanStopBtn, N && { borderColor: N.border, backgroundColor: N.surface }]}
              >
                <MaterialIcons name="stop" size={14} color={N ? '#F2D2D2' : '#B23838'} />
                <Text style={[styles.adhaanStopBtnText, N && { color: '#F2D2D2' }]}>Stop</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  adhaanUnifiedRow: {
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
  adhaanUnifiedPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  adhaanUnifiedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E5BA8',
    maxWidth: '46%',
  },
  adhaanUnifiedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtle,
    maxWidth: '33%',
  },
  adhaanControlActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adhaanMuteBtn: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#9EC0E7',
    backgroundColor: '#EDF5FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adhaanMuteBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  adhaanStopBtn: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#E7B1B1',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adhaanStopBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B23838',
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