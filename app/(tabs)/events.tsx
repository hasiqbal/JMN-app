import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import RenderHtml from 'react-native-render-html';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import {
  MOCK_EVENTS,
  MasjidEvent,
  getEventCategoryColor,
  getEventCategoryLabel,
} from '@/services/eventsService';
import {
  fetchAnnouncementsWithMeta,
  AnnouncementRow,
  AnnouncementFetchMeta,
} from '@/services/contentService';
import { useNightMode } from '@/hooks/useNightMode';

type LanguageMode = 'en' | 'ur';

const EVENTS_LANGUAGE_STORAGE_KEY = '@events_language_mode_v1';

const LANGUAGE_LABELS: Record<LanguageMode, string> = {
  en: 'English',
  ur: 'اردو',
};

const ANNOUNCEMENT_TYPE_OPTIONS = [
  'Urgent',
  'Jalsa',
  'Public Safety',
  'Class',
  'Special',
  'Ramadan',
  'Eid',
  'Jumuah',
  'Lecture',
  'Workshop',
  'Community',
  'Youth',
  'Funeral',
  'Nikah',
];

const NIGHT = {
  bg:         '#0A0F1E',
  surface:    '#121929',
  surfaceAlt: '#192338',
  border:     '#1E2D47',
  text:       '#EEF3FC',
  textSub:    '#93B4D8',
  textMuted:  '#5A7A9E',
  accent:     '#6AAEFF',
  primary:    '#4FE948',
  warning:    '#E8BB64',
  danger:     '#FF8A8A',
};

const CATEGORY_COLORS: Record<string, string> = {
  General:   '#4FE948',
  Prayer:    '#3949AB',
  Event:     '#B8860B',
  Closure:   '#C62828',
  Reminder:  '#6A1B9A',
  "Jumu'ah": '#E65100',
  Urgent:    '#D32F2F',
  Jalsa:     '#1E88E5',
  Class:     '#2E7D32',
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? Colors.primary;
}

function asTrimmed(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function containsHtml(value: string | null | undefined): boolean {
  return /<[^>]+>/.test(value ?? '');
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitGuestNames(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function splitAnnouncementTimeEntries(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\s*\|\s*|\n+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function formatSimpleTimeForDisplay(value: string): string {
  const plain = value.match(/^(\d{1,2}):(\d{2})$/);
  if (plain) {
    const hour24 = Number(plain[1]);
    const minute = plain[2];
    const suffix = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minute} ${suffix}`;
  }

  const range = value.match(/^(.*?)\s*[-\u2013]\s*(.*?)$/);
  if (range) {
    const start = formatSimpleTimeForDisplay(range[1].trim());
    const end = formatSimpleTimeForDisplay(range[2].trim());
    return `${start} - ${end}`;
  }

  return value;
}

function getAnnouncementType(announcement: AnnouncementRow): string {
  const value = asTrimmed(announcement.type ?? announcement.category);
  return value || 'General';
}

function isEventTaggedAnnouncement(announcement: AnnouncementRow): boolean {
  if (announcement.tag) return true;
  const typeValue = getAnnouncementType(announcement).toLowerCase();
  return typeValue === 'event';
}

function getAnnouncementTitle(announcement: AnnouncementRow, languageMode: LanguageMode): string {
  if (languageMode === 'ur') {
    return asTrimmed(announcement.urdu_title) || announcement.title;
  }
  return announcement.title;
}

function getAnnouncementPlain(announcement: AnnouncementRow, languageMode: LanguageMode): string {
  if (languageMode === 'ur') {
    const urduBody = asTrimmed(announcement.urdu_body);
    return containsHtml(urduBody) ? stripHtml(urduBody) : urduBody;
  }

  const englishBody = asTrimmed(announcement.body_plain ?? announcement.body_html ?? announcement.body);
  return containsHtml(englishBody) ? stripHtml(englishBody) : englishBody;
}

function getAnnouncementBodyHtml(announcement: AnnouncementRow, languageMode: LanguageMode): string | null {
  const source = languageMode === 'ur'
    ? asTrimmed(announcement.urdu_body)
    : asTrimmed(announcement.body_html ?? announcement.body);

  if (!source) return null;
  if (containsHtml(source)) return source;
  return `<p>${escapeHtml(source).replace(/\n/g, '<br />')}</p>`;
}

function formatAnnouncementDate(announcement: AnnouncementRow): string {
  const published = Date.parse(announcement.published_at || '');
  if (!Number.isFinite(published)) return 'Unknown date';
  return new Date(published).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ensureExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode } = useNightMode();
  const [refreshing, setRefreshing] = useState(false);

  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loadingAnn, setLoadingAnn] = useState(false);
  const [lastFetched, setLastFetched] = useState<number>(0);
  const [annMeta, setAnnMeta] = useState<AnnouncementFetchMeta | null>(null);
  const [annNotice, setAnnNotice] = useState<string | null>(null);
  const [annError, setAnnError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('All');
  const [languageMode, setLanguageModeState] = useState<LanguageMode>('en');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementRow | null>(null);

  const setLanguageMode = useCallback((mode: LanguageMode) => {
    setLanguageModeState(mode);
    AsyncStorage.setItem(EVENTS_LANGUAGE_STORAGE_KEY, mode).catch(() => {
      // Persist failure should not block UX.
    });
  }, []);

  const lastFetchedRef = useRef(0);

  const loadAnnouncements = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchedRef.current < 9_000) return;

    setLoadingAnn(true);

    try {
      const result = await fetchAnnouncementsWithMeta();

      setAnnouncements(result.rows);
      setAnnMeta(result.meta);
      setAnnNotice(result.meta.notice);
      setAnnError(result.meta.error);
      setLastFetched(result.meta.fetchedAt);
      lastFetchedRef.current = result.meta.fetchedAt;
    } catch {
      setAnnError('Refresh failed. Please retry.');
      setAnnNotice(null);
    } finally {
      setLoadingAnn(false);
    }
  }, []);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAnnouncements(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadAnnouncements]);

  const handleOpenExternalLink = useCallback(async (url: string | null | undefined) => {
    const value = asTrimmed(url);
    if (!value) return;

    try {
      const normalized = ensureExternalUrl(value);
      await Linking.openURL(normalized);
    } catch {
      setAnnError('Unable to open link. Please retry.');
    }
  }, []);

  useEffect(() => {
    loadAnnouncements(true);
  }, [loadAnnouncements]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(EVENTS_LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (!mounted) return;
        if (stored === 'en' || stored === 'ur') {
          setLanguageModeState(stored);
        }
      })
      .catch(() => {
        // Ignore read failures and keep default.
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAnnouncements();
    }, 10_000);
    return () => clearInterval(interval);
  }, [loadAnnouncements]);

  const typeOptions = useMemo(() => {
    const optionSet = new Set<string>(['All', ...ANNOUNCEMENT_TYPE_OPTIONS]);
    for (const event of MOCK_EVENTS) {
      optionSet.add(getEventCategoryLabel(event.category));
    }
    for (const ann of announcements) {
      optionSet.add(getAnnouncementType(ann));
    }
    return Array.from(optionSet);
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    if (selectedType === 'All') return announcements;
    return announcements.filter((ann) => getAnnouncementType(ann) === selectedType);
  }, [announcements, selectedType]);

  const filteredEventAnnouncements = useMemo(() => {
    return filteredAnnouncements.filter((ann) => isEventTaggedAnnouncement(ann));
  }, [filteredAnnouncements]);

  const filteredAnnouncementPosts = useMemo(() => {
    return filteredAnnouncements.filter((ann) => !isEventTaggedAnnouncement(ann));
  }, [filteredAnnouncements]);

  const filteredEvents = useMemo(() => {
    if (selectedType === 'All') return MOCK_EVENTS;
    return MOCK_EVENTS.filter((event) => getEventCategoryLabel(event.category) === selectedType);
  }, [selectedType]);

  const N = nightMode ? NIGHT : null;
  const bannerMessage = annError ?? annNotice;
  const isErrorBanner = Boolean(annError);
  const isOffline = Boolean(annMeta?.fromCache);

  return (
    <View style={[styles.container, { paddingTop: insets.top }, N && { backgroundColor: N.bg }]}> 
      <View style={[styles.header, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}> 
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/masjid-logo.png')}
            style={styles.headerLogo}
            contentFit="contain"
          />
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerMasjidName, N && { color: '#4FE948' }]}>Events & Announcements</Text>
            {announcements.length > 0 ? (
              <View style={[styles.tabBadge, N && { backgroundColor: N.accent }]}> 
                <Text style={styles.tabBadgeText}>{announcements.length}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.tabMetaWrap}>
          <Text style={[styles.tabMetaText, N && { color: N.textMuted }]}> 
            Updated {lastFetched ? new Date(lastFetched).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
          </Text>
          {isOffline ? (
            <View style={[styles.offlinePill, N && { backgroundColor: N.surfaceAlt, borderColor: N.warning + '66' }]}> 
              <MaterialIcons name="cloud-off" size={11} color={N ? N.warning : '#8A6A2D'} />
              <Text style={[styles.offlinePillText, N && { color: N.warning }]}>Offline cache</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, N && { backgroundColor: N.bg }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loadingAnn}
            onRefresh={onPullRefresh}
            tintColor={N ? N.primary : Colors.primary}
          />
        }
      >
        <View style={[styles.controlsWrap, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
          <View style={styles.languageRow}>
            <Text style={[styles.controlLabel, N && { color: N.textMuted }]}>Language</Text>
            <View style={styles.controlsLanguageChipRow}>
              {(['en', 'ur'] as LanguageMode[]).map((mode) => {
                const active = languageMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setLanguageMode(mode)}
                    style={[
                      styles.controlsLanguageBtn,
                      mode === 'ur' && styles.controlsLanguageBtnUrdu,
                      N && !active && { backgroundColor: N.surfaceAlt, borderColor: N.border },
                      active && [styles.controlsLanguageBtnActive, N && { backgroundColor: N.accent + '22', borderColor: N.accent }],
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.controlsLanguageBtnText,
                        mode === 'ur' && styles.controlsLanguageBtnTextUrdu,
                        N && { color: N.textSub },
                        active && [styles.controlsLanguageBtnTextActive, N && { color: N.accent }],
                      ]}
                    >
                      {LANGUAGE_LABELS[mode]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.typeRow}>
            <Text style={[styles.controlLabel, N && { color: N.textMuted }]}>Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeScroll}
              contentContainerStyle={styles.typeScrollContent}
            >
              {typeOptions.map((type) => {
                const active = selectedType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      N && { borderColor: N.border, backgroundColor: N.surfaceAlt },
                      active && [styles.typeChipActive, N && { borderColor: N.accent, backgroundColor: N.accent + '22' }],
                    ]}
                    onPress={() => setSelectedType(type)}
                    activeOpacity={0.82}
                  >
                    <Text style={[
                      styles.typeChipText,
                      N && { color: N.textSub },
                      active && [styles.typeChipTextActive, N && { color: N.accent }],
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {bannerMessage ? (
          <View
            style={[
              styles.banner,
              isErrorBanner ? styles.bannerError : styles.bannerInfo,
              N && (isErrorBanner
                ? { borderColor: N.danger + '66', backgroundColor: '#2A1216' }
                : { borderColor: N.warning + '66', backgroundColor: '#241E12' }),
            ]}
          >
            <Text style={[styles.bannerText, N && { color: N.textSub }]}>{bannerMessage}</Text>
            <TouchableOpacity
              style={[styles.bannerRetry, N && { borderColor: N.accent }]}
              onPress={() => loadAnnouncements(true)}
              activeOpacity={0.85}
            >
              <MaterialIcons name="refresh" size={13} color={N ? N.accent : Colors.primary} />
              <Text style={[styles.bannerRetryText, N && { color: N.accent }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loadingAnn && filteredAnnouncements.length === 0 && filteredEvents.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={N ? N.primary : Colors.primary} />
            <Text style={[styles.loadingText, N && { color: N.textMuted }]}>Loading updates...</Text>
          </View>
        ) : filteredAnnouncements.length === 0 && filteredEvents.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialIcons name="campaign" size={48} color={N ? N.textMuted : Colors.textSubtle} style={{ opacity: 0.4 }} />
            <Text style={[styles.emptyTitle, N && { color: N.textSub }]}>No Events or Announcements</Text>
            <Text style={[styles.emptyBody, N && { color: N.textMuted }]}> 
              Check back soon. Pull down to refresh.
            </Text>
          </View>
        ) : (
          <>
            {filteredEventAnnouncements.length > 0 ? (
              <>
                <Text style={[styles.sectionCount, N && { color: N.textMuted }]}>
                  {filteredEventAnnouncements.length} portal event post{filteredEventAnnouncements.length !== 1 ? 's' : ''}
                </Text>
                {filteredEventAnnouncements.map((ann) => (
                  <LiveAnnouncementCard
                    key={ann.id}
                    announcement={ann}
                    nightMode={nightMode}
                    languageMode={languageMode}
                    onPress={() => setSelectedAnnouncement(ann)}
                  />
                ))}
              </>
            ) : null}

            {filteredAnnouncementPosts.length > 0 ? (
              <>
                <View style={styles.liveRow}>
                  <View style={[styles.liveDot, N && { backgroundColor: N.primary }]} />
                  <Text style={[styles.liveLabel, N && { color: N.textMuted }]}> 
                    {filteredAnnouncementPosts.length} announcement{filteredAnnouncementPosts.length !== 1 ? 's' : ''} · live
                  </Text>
                </View>
                {filteredAnnouncementPosts.map((ann) => (
                  <LiveAnnouncementCard
                    key={ann.id}
                    announcement={ann}
                    nightMode={nightMode}
                    languageMode={languageMode}
                    onPress={() => setSelectedAnnouncement(ann)}
                  />
                ))}
              </>
            ) : null}

            {filteredEvents.length > 0 ? (
              <>
                <Text style={[styles.sectionCount, N && { color: N.textMuted }]}>{filteredEvents.length} upcoming events</Text>
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} nightMode={nightMode} />
                ))}
              </>
            ) : null}
          </>
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      <AnnouncementDetailModal
        visible={!!selectedAnnouncement}
        announcement={selectedAnnouncement}
        nightMode={nightMode}
        languageMode={languageMode}
        onChangeLanguage={setLanguageMode}
        onClose={() => setSelectedAnnouncement(null)}
        onOpenLink={handleOpenExternalLink}
      />
    </View>
  );
}

function EventCard({ event, nightMode }: { event: MasjidEvent; nightMode: boolean }) {
  const N = nightMode ? NIGHT : null;
  const catColor = getEventCategoryColor(event.category);
  return (
    <View style={[styles.eventCard, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
      <View style={[styles.catBar, { backgroundColor: catColor }]} />
      <View style={styles.eventBody}>
        <View style={styles.eventTop}>
          <View style={[styles.catBadge, { backgroundColor: catColor + (N ? '30' : '20') }]}> 
            <Text style={[styles.catBadgeText, { color: catColor }]}> 
              {getEventCategoryLabel(event.category)}
            </Text>
          </View>
        </View>
        <Text style={[styles.eventTitle, N && { color: N.text }]}>{event.title}</Text>
        {event.speaker ? (
          <View style={styles.speakerRow}>
            <MaterialIcons name="person" size={14} color={N ? N.textMuted : Colors.textSubtle} />
            <Text style={[styles.speaker, N && { color: N.textMuted }]}>{event.speaker}</Text>
          </View>
        ) : null}
        <Text style={[styles.eventDesc, N && { color: N.textSub }]}>{event.description}</Text>
        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="event" size={14} color={N ? N.primary : Colors.primary} />
            <Text style={[styles.metaText, N && { color: N.primary }]}>{event.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="access-time" size={14} color={N ? N.primary : Colors.primary} />
            <Text style={[styles.metaText, N && { color: N.primary }]}>{event.time}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function LiveAnnouncementCard({
  announcement,
  nightMode,
  languageMode,
  onPress,
}: {
  announcement: AnnouncementRow;
  nightMode: boolean;
  languageMode: LanguageMode;
  onPress: () => void;
}) {
  const N = nightMode ? NIGHT : null;

  const typeLabel = getAnnouncementType(announcement);
  const catColor = getCategoryColor(typeLabel);
  const isPinned = announcement.pinned;

  const title = getAnnouncementTitle(announcement, languageMode);
  const plainBody = getAnnouncementPlain(announcement, languageMode);
  const publishedDate = formatAnnouncementDate(announcement);

  const guestSource = languageMode === 'ur'
    ? (announcement.urdu_lead_names ?? announcement.lead_names)
    : announcement.lead_names;
  const guests = splitGuestNames(guestSource);
  const guestsDisplay = guests.join(', ');
  const timeEntries = splitAnnouncementTimeEntries(announcement.start_time).map(formatSimpleTimeForDisplay);
  const timeSummary = timeEntries.length === 0
    ? null
    : timeEntries.length === 1
      ? timeEntries[0]
      : `${timeEntries[0]} +${timeEntries.length - 1} more`;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.annCard,
        N && { backgroundColor: N.surface, borderColor: N.border },
      ]}
    >
      <View style={[styles.annAccentBar, { backgroundColor: catColor }]} />

      {announcement.image_url ? (
        <Image
          source={{ uri: announcement.image_url }}
          style={styles.annImage}
          contentFit="cover"
          transition={160}
        />
      ) : null}

      <View style={styles.annCardInner}>
        <View style={styles.annCardHeader}>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.annBadgeRow}>
              <View style={[styles.annTagPill, { backgroundColor: catColor + '1F' }]}> 
                <Text style={[styles.annTagPillText, { color: catColor }]}>{typeLabel}</Text>
              </View>

              <View style={styles.annTagPill}>
                <Text style={styles.annTagPillText}>{announcement.tag ? 'Event' : 'Announcement'}</Text>
              </View>

              {isPinned ? (
                <View style={styles.annTagPill}>
                  <Text style={[styles.annTagPillText, { color: catColor }]}>Pinned</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.annTitle, N && { color: N.text }, languageMode === 'ur' && styles.urduText]}>{title}</Text>

            {guestsDisplay ? (
              <View style={styles.annSpeakerRow}>
                <MaterialIcons name="person" size={15} color={N ? N.textMuted : '#8B9491'} />
                <Text
                  style={[
                    styles.annSpeakerText,
                    N && { color: N.textMuted },
                    languageMode === 'ur' && styles.urduText,
                  ]}
                  numberOfLines={2}
                >
                  {guestsDisplay}
                </Text>
              </View>
            ) : null}

            <Text
              style={[
                styles.annBody,
                N && { color: N.textSub },
                languageMode === 'ur' && styles.urduText,
              ]}
              numberOfLines={2}
            >
              {plainBody}
            </Text>

            <View style={styles.annFooter}>
              <View style={styles.annFooterMeta}>
                <MaterialIcons name="calendar-today" size={14} color={N ? N.textMuted : '#8B9491'} />
                <Text style={[styles.annDate, N && { color: N.primary }]}>{publishedDate}</Text>
              </View>

              {timeSummary ? (
                <View style={styles.annFooterMeta}>
                  <MaterialIcons name="access-time" size={15} color={N ? N.primary : Colors.primary} />
                  <Text style={[styles.annTime, N && { color: N.primary }]}>{timeSummary}</Text>
                </View>
              ) : null}

              <MaterialIcons name="open-in-new" size={16} color={N ? N.accent : Colors.primary} style={styles.annOpenIcon} />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AnnouncementDetailModal({
  visible,
  announcement,
  nightMode,
  languageMode,
  onChangeLanguage,
  onClose,
  onOpenLink,
}: {
  visible: boolean;
  announcement: AnnouncementRow | null;
  nightMode: boolean;
  languageMode: LanguageMode;
  onChangeLanguage: (mode: LanguageMode) => void;
  onClose: () => void;
  onOpenLink: (url: string | null | undefined) => void;
}) {
  const N = nightMode ? NIGHT : null;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const MODAL_PREVIEW_LINES = 4;

  useEffect(() => {
    if (visible) {
      setBodyExpanded(false);
    }
  }, [announcement?.id, languageMode, visible]);

  if (!announcement) return null;

  const title = getAnnouncementTitle(announcement, languageMode);
  const bodyPlain = getAnnouncementPlain(announcement, languageMode);
  const bodyHtml = getAnnouncementBodyHtml(announcement, languageMode);
  const shouldShowBodyToggle = !bodyHtml && bodyPlain.length > 280;
  const typeLabel = getAnnouncementType(announcement);
  const dateLabel = formatAnnouncementDate(announcement);

  const primaryGuests = splitGuestNames(announcement.lead_names);
  const urduGuests = splitGuestNames(announcement.urdu_lead_names);
  const timeEntries = splitAnnouncementTimeEntries(announcement.start_time).map(formatSimpleTimeForDisplay);
  const modalBottomInset = Math.max(Spacing.md, insets.bottom + 10);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismissZone} onPress={onClose} />
        <View style={[
          styles.modalSheet,
          { paddingBottom: modalBottomInset },
          N && { backgroundColor: N.surface, borderColor: N.border },
        ]}> 
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, N && { color: N.text }, languageMode === 'ur' && styles.urduText]} numberOfLines={2}>{title}</Text>
              <Text style={[styles.modalDate, N && { color: N.textMuted }]}>{dateLabel}</Text>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.85}>
              <MaterialIcons name="close" size={20} color={N ? N.text : '#334155'} />
            </TouchableOpacity>
          </View>

          <View style={[styles.modalControlsStrip, N && { borderColor: N.border, backgroundColor: N.surfaceAlt }]}>
            <View style={[styles.modalLanguageRow, N && { borderColor: N.border, backgroundColor: N.surface }]}> 
              {(['en', 'ur'] as LanguageMode[]).map((mode) => {
                const active = mode === languageMode;
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => onChangeLanguage(mode)}
                    style={[
                      styles.modalLanguageBtn,
                      mode === 'ur' && styles.languageBtnUrdu,
                      active && [styles.modalLanguageBtnActive, N && { borderColor: N.accent, backgroundColor: N.accent + '22' }],
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.modalLanguageBtnText,
                        mode === 'ur' && styles.languageBtnTextUrdu,
                        N && { color: N.textSub },
                        active && [styles.modalLanguageBtnTextActive, N && { color: N.accent }],
                      ]}
                    >
                      {LANGUAGE_LABELS[mode]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalBadgeRowCompact}>
              <View style={[styles.modalBadge, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
                <Text style={[styles.modalBadgeText, N && { color: N.textSub }]}>{typeLabel}</Text>
              </View>
              <View style={[styles.modalBadge, N && { backgroundColor: N.surface, borderColor: N.border }]}> 
                <Text style={[styles.modalBadgeText, N && { color: N.textSub }]}>{announcement.tag ? 'Event' : 'Announcement'}</Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={[styles.modalScrollContent, { paddingBottom: modalBottomInset + 12 }]}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            scrollIndicatorInsets={{ bottom: modalBottomInset }}
          >
            {announcement.image_url ? (
              <Image
                source={{ uri: announcement.image_url }}
                style={styles.modalImage}
                contentFit="cover"
                transition={180}
              />
            ) : null}

            <View style={[styles.modalBodyWrap, N && { borderColor: N.border, backgroundColor: N.surfaceAlt }]}> 
              {bodyHtml ? (
                <RenderHtml
                  contentWidth={Math.max(240, width - 72)}
                  source={{ html: bodyHtml }}
                  baseStyle={{
                    color: N ? N.textSub : Colors.textSecondary,
                    fontSize: 15,
                    lineHeight: 24,
                    ...(languageMode === 'ur' ? { writingDirection: 'rtl' as const, textAlign: 'right' as const, fontFamily: 'UrduNastaliq' } : {}),
                  }}
                  tagsStyles={{
                    p: { marginTop: 0, marginBottom: 8 },
                    li: { marginBottom: 4 },
                    ul: { marginTop: 0, marginBottom: 8, paddingLeft: 18 },
                    ol: { marginTop: 0, marginBottom: 8, paddingLeft: 18 },
                    strong: { fontWeight: '700' },
                    em: { fontStyle: 'italic' },
                    h1: { marginTop: 0, marginBottom: 8, fontSize: 18, fontWeight: '700' },
                    h2: { marginTop: 0, marginBottom: 7, fontSize: 17, fontWeight: '700' },
                    h3: { marginTop: 0, marginBottom: 6, fontSize: 16, fontWeight: '700' },
                  }}
                />
              ) : (
                <Text
                  style={[styles.modalBodyText, N && { color: N.textSub }, languageMode === 'ur' && styles.urduText]}
                  numberOfLines={bodyExpanded ? undefined : MODAL_PREVIEW_LINES}
                >
                  {bodyPlain}
                </Text>
              )}

              {shouldShowBodyToggle ? (
                <TouchableOpacity
                  onPress={() => setBodyExpanded((prev) => !prev)}
                  activeOpacity={0.8}
                  style={styles.modalReadToggleBtn}
                >
                  <Text style={[styles.modalReadToggleText, N && { color: N.accent }]}>
                    {bodyExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {timeEntries.length > 0 ? (
              <View style={[styles.modalMetaBlock, N && { borderColor: N.border }]}> 
                <Text style={[styles.modalMetaLabel, N && { color: N.textMuted }]}>{languageMode === 'ur' ? 'اوقات' : 'Start Time'}</Text>
                <Text style={[styles.modalMetaValue, N && { color: N.text }, languageMode === 'ur' && styles.urduText]}>
                  {timeEntries.join('\n')}
                </Text>
              </View>
            ) : null}

            {primaryGuests.length > 0 ? (
              <View style={[styles.modalMetaBlock, N && { borderColor: N.border }]}> 
                <Text style={[styles.modalMetaLabel, N && { color: N.textMuted }]}>Speakers</Text>
                <Text style={[styles.modalMetaValue, N && { color: N.text }]}>
                  {primaryGuests.join(primaryGuests.length >= 3 ? '\n' : ', ')}
                </Text>
              </View>
            ) : null}

            {languageMode === 'ur' && urduGuests.length > 0 ? (
              <View style={[styles.modalMetaBlock, N && { borderColor: N.border }]}> 
                <Text style={[styles.modalMetaLabel, N && { color: N.textMuted }]}>مقررین</Text>
                <Text style={[styles.modalMetaValue, N && { color: N.text }, styles.urduText]}>
                  {urduGuests.join(urduGuests.length >= 3 ? '\n' : ', ')}
                </Text>
              </View>
            ) : null}

            {announcement.link_url ? (
              <TouchableOpacity
                style={[styles.modalLinkBtn, N && { borderColor: N.accent, backgroundColor: N.accent + '22' }]}
                onPress={() => onOpenLink(announcement.link_url)}
                activeOpacity={0.85}
              >
                <MaterialIcons name="open-in-new" size={16} color={N ? N.accent : Colors.primary} />
                <Text style={[styles.modalLinkBtnText, N && { color: N.accent }]}>Open external link</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  headerMasjidName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#D9B87A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: '#FFF6E8',
  },
  offlinePillText: { fontSize: 10, fontWeight: '700', color: '#8A6A2D' },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
    gap: 8,
  },
  tabButtonsWrap: { flexDirection: 'row', gap: Spacing.md },
  unifiedTabWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unifiedTabTitle: { ...Typography.titleSmall, color: Colors.primary },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabText: { ...Typography.titleSmall, color: Colors.textSubtle },
  tabTextActive: { color: Colors.primary },
  tabBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  tabMetaWrap: { alignItems: 'flex-end', gap: 4 },
  tabMetaText: { ...Typography.bodySmall, color: Colors.textSubtle, fontSize: 11 },
  content: { paddingHorizontal: Spacing.md, paddingTop: 6, paddingBottom: Spacing.md },
  sectionCount: { ...Typography.bodySmall, color: Colors.textSubtle, marginBottom: Spacing.sm },

  controlsWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  languageRow: { gap: 4, alignSelf: 'flex-start' },
  typeRow: { gap: 3, alignSelf: 'flex-start' },
  controlLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.25,
  },
  controlsLanguageChipRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 6,
  },
  controlsLanguageBtn: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsLanguageBtnUrdu: {
    paddingHorizontal: 11,
  },
  controlsLanguageBtnActive: {
    borderColor: '#A9C2E8',
    backgroundColor: '#EDF4FF',
  },
  controlsLanguageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  controlsLanguageBtnTextUrdu: {
    fontFamily: 'UrduNastaliq',
    fontSize: 13,
  },
  controlsLanguageBtnTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  languageBtn: {
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  languageBtnUrdu: {
    minWidth: 102,
  },
  languageBtnActive: { backgroundColor: '#EDF4FF', borderColor: '#A9C2E8' },
  languageBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textSubtle },
  languageBtnTextUrdu: { fontFamily: 'UrduNastaliq', fontSize: 13 },
  languageBtnTextActive: { color: Colors.primary, fontWeight: '800' },
  typeScroll: { alignSelf: 'flex-start', maxWidth: '100%' },
  typeScrollContent: { flexDirection: 'row', gap: 5, paddingRight: 2 },
  typeChip: {
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: '#EDF8ED' },
  typeChipText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.primary, fontWeight: '800' },

  banner: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  bannerInfo: { borderColor: '#D9B87A', backgroundColor: '#FFF8EA' },
  bannerError: { borderColor: '#E7A2A2', backgroundColor: '#FFF0F0' },
  bannerText: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  bannerRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bannerRetryText: { fontSize: 12, fontWeight: '700', color: Colors.primary },

  loadingWrap: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  loadingText: { fontSize: 13, color: Colors.textSubtle },
  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textSubtle },
  emptyBody: { fontSize: 13, color: Colors.textSubtle, textAlign: 'center', lineHeight: 20 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  liveLabel: { fontSize: 11, color: Colors.textSubtle, fontWeight: '500' },

  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  catBar: { width: 4 },
  eventBody: { flex: 1, padding: Spacing.md },
  eventTop: { flexDirection: 'row', marginBottom: 6 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  catBadgeText: { ...Typography.labelMedium, fontSize: 11 },
  eventTitle: { ...Typography.titleSmall, color: Colors.textPrimary, marginBottom: 2 },
  speakerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  speaker: { ...Typography.bodySmall, color: Colors.textSubtle },
  eventDesc: { ...Typography.bodyMedium, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.sm },
  eventMeta: { flexDirection: 'row', gap: Spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Typography.bodySmall, color: Colors.primary },

  annCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  annAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    zIndex: 2,
  },
  annCardInner: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 6,
  },
  annImage: {
    width: '100%',
    height: 132,
    backgroundColor: '#F2F3F5',
    marginBottom: 2,
  },
  annCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  annBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  annTagPill: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  annTagPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSubtle,
  },
  annTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  annSpeakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -2,
  },
  annSpeakerText: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSubtle,
    flex: 1,
  },
  annBody: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  annFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  annFooterMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  annDate: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  annTime: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  annOpenIcon: { marginLeft: 'auto' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,18,28,0.42)',
    justifyContent: 'flex-end',
  },
  modalDismissZone: { flex: 1 },
  modalSheet: {
    height: '90%',
    minHeight: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 10,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  modalTitle: { ...Typography.titleLarge, color: Colors.textPrimary },
  modalDate: { ...Typography.bodySmall, color: Colors.textSubtle, marginTop: 2 },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F6',
  },
  modalControlsStrip: {
    borderWidth: 1,
    borderColor: '#E6EAF0',
    backgroundColor: '#FBFCFD',
    borderRadius: Radius.md,
    padding: 8,
    gap: 8,
  },
  modalLanguageRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    padding: 3,
  },
  modalLanguageBtn: {
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: Radius.full,
    paddingHorizontal: 13,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  modalLanguageBtnActive: {
    borderColor: '#A9C2E8',
    backgroundColor: '#EDF4FF',
  },
  modalLanguageBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textSubtle },
  modalLanguageBtnTextActive: { color: Colors.primary, fontWeight: '800' },
  modalScroll: { flex: 1, minHeight: 0 },
  modalScrollContent: { flexGrow: 1, gap: 8, paddingBottom: 20 },
  modalImage: {
    width: '100%',
    height: 190,
    borderRadius: Radius.md,
    backgroundColor: '#F2F3F5',
  },
  modalBadgeRowCompact: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalBadge: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  modalBodyWrap: {
    borderWidth: 1,
    borderColor: '#E6EAF0',
    backgroundColor: '#FBFCFD',
    borderRadius: Radius.md,
    padding: 10,
  },
  modalBodyText: { fontSize: 15, lineHeight: 24, color: Colors.textSecondary },
  modalReadToggleBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  modalReadToggleText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  modalMetaBlock: {
    borderWidth: 1,
    borderColor: '#E6EAF0',
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  modalMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalMetaValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  modalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: '#F0F8F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalLinkBtnText: { fontSize: 13, fontWeight: '800', color: Colors.primary },
  urduText: { writingDirection: 'rtl', textAlign: 'right', fontFamily: 'UrduNastaliq' },
});
