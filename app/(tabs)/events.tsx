import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import {
  MOCK_EVENTS,
  MasjidEvent,
  getEventCategoryColor,
  getEventCategoryLabel,
} from '@/services/eventsService';
import { fetchAnnouncements, AnnouncementRow } from '@/services/contentService';
import { useNightMode } from '@/hooks/useNightMode';

type Tab = 'events' | 'announcements';

// ── Night palette ────────────────────────────────────────────────────────
const NIGHT = {
  bg:         '#0A0F1E',
  surface:    '#121929',
  surfaceAlt: '#192338',
  border:     '#1E2D47',
  text:       '#EEF3FC',
  textSub:    '#93B4D8',
  textMuted:  '#5A7A9E',
  accent:     '#6AAEFF',
  primary:    '#4DCF88',
};

function NightModeToggle({ nightMode, onToggle }: { nightMode: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.75}
      style={[nmStyles.btn, nightMode ? nmStyles.btnNight : nmStyles.btnDay]}
    >
      <MaterialIcons
        name={nightMode ? 'nights-stay' : 'wb-sunny'}
        size={15}
        color={nightMode ? '#C0D8FF' : Colors.textSubtle}
      />
      <Text style={[nmStyles.label, { color: nightMode ? '#C0D8FF' : Colors.textSubtle }]}>
        {nightMode ? 'Night' : 'Day'}
      </Text>
    </TouchableOpacity>
  );
}

const nmStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  btnNight: { backgroundColor: '#0D1E3C', borderColor: '#2A4A7A' },
  btnDay:   { backgroundColor: Colors.primarySoft, borderColor: Colors.border },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});

// ── Category color for announcements ─────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  General:   '#1B8A5A',
  Prayer:    '#3949AB',
  Event:     '#B8860B',
  Closure:   '#C62828',
  Reminder:  '#6A1B9A',
  "Jumu'ah": '#E65100',
};

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? Colors.primary;
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode, toggleManual } = useNightMode();
  const [activeTab, setActiveTab] = useState<Tab>('events');

  // ── Announcements state ─────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loadingAnn, setLoadingAnn] = useState(false);
  const [lastFetched, setLastFetched] = useState<number>(0);

  const loadAnnouncements = useCallback(async (force = false) => {
    const now = Date.now();
    // Poll every 5 seconds, unless forced
    if (!force && now - lastFetched < 4_000) return;
    setLoadingAnn(true);
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
      setLastFetched(now);
    } finally {
      setLoadingAnn(false);
    }
  }, [lastFetched]);

  // Initial load
  useEffect(() => {
    loadAnnouncements(true);
  }, [loadAnnouncements]);

  // Poll every 60 seconds when announcements tab is active
  useEffect(() => {
    if (activeTab !== 'announcements') return;
    const interval = setInterval(() => loadAnnouncements(), 5_000);
    return () => clearInterval(interval);
  }, [activeTab, loadAnnouncements]);

  // Reload when switching to announcements tab
  useEffect(() => {
    if (activeTab === 'announcements') {
      loadAnnouncements();
    }
  }, [activeTab, loadAnnouncements]);

  const N = nightMode ? NIGHT : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }, N && { backgroundColor: N.bg }]}>
      {/* Header */}
      <View style={[styles.header, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/masjid-logo.png')}
            style={styles.headerLogo}
            contentFit="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerMasjidName, N && { color: '#69C995' }]}>Jami&apos; Masjid Noorani</Text>
            <Text style={[styles.headerTitle, N && { color: N.text }]}>Events & Announcements</Text>
          </View>
        </View>
        <NightModeToggle nightMode={nightMode} onToggle={toggleManual} />
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabRow, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        {(['events', 'announcements'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, activeTab === t && [styles.tabBtnActive, N && { borderBottomColor: N.accent }]]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.tabText,
              N && { color: N.textSub },
              activeTab === t && [styles.tabTextActive, N && { color: N.accent }],
            ]}>
              {t === 'events' ? 'Events' : 'Announcements'}
            </Text>
            {t === 'announcements' && announcements.length > 0 ? (
              <View style={[styles.tabBadge, N && { backgroundColor: N.accent }]}>
                <Text style={styles.tabBadgeText}>{announcements.length}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, N && { backgroundColor: N.bg }]}
        refreshControl={
          activeTab === 'announcements' ? (
            <RefreshControl
              refreshing={loadingAnn}
              onRefresh={() => loadAnnouncements(true)}
              tintColor={N ? N.primary : Colors.primary}
            />
          ) : undefined
        }
      >
        {activeTab === 'events' ? (
          <>
            <Text style={[styles.sectionCount, N && { color: N.textMuted }]}>{MOCK_EVENTS.length} upcoming events</Text>
            {MOCK_EVENTS.map((event) => (
              <EventCard key={event.id} event={event} nightMode={nightMode} />
            ))}
          </>
        ) : (
          <>
            {loadingAnn && announcements.length === 0 ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={N ? N.primary : Colors.primary} />
                <Text style={[styles.loadingText, N && { color: N.textMuted }]}>Loading announcements...</Text>
              </View>
            ) : announcements.length === 0 ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="campaign" size={48} color={N ? N.textMuted : Colors.textSubtle} style={{ opacity: 0.4 }} />
                <Text style={[styles.emptyTitle, N && { color: N.textSub }]}>No Announcements</Text>
                <Text style={[styles.emptyBody, N && { color: N.textMuted }]}>
                  Check back soon. Pull down to refresh.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.liveRow}>
                  <View style={[styles.liveDot, N && { backgroundColor: N.primary }]} />
                  <Text style={[styles.liveLabel, N && { color: N.textMuted }]}>
                    {announcements.length} announcement{announcements.length !== 1 ? 's' : ''} · live updates
                  </Text>
                </View>
                {announcements.map((ann) => (
                  <LiveAnnouncementCard key={ann.id} announcement={ann} nightMode={nightMode} />
                ))}
              </>
            )}
          </>
        )}
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
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

function LiveAnnouncementCard({ announcement, nightMode }: { announcement: AnnouncementRow; nightMode: boolean }) {
  const N = nightMode ? NIGHT : null;
  const catColor = getCategoryColor(announcement.category);
  const isPinned = announcement.pinned;

  const publishedDate = new Date(announcement.published_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <View style={[
      styles.annCard,
      N && { backgroundColor: N.surface, borderColor: N.border },
      isPinned && [styles.annCardPinned, { borderLeftColor: catColor }],
    ]}>
      {/* Header row */}
      <View style={styles.annCardHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.annBadgeRow}>
            <View style={[styles.catBadge, { backgroundColor: catColor + '22' }]}>
              <Text style={[styles.catBadgeText, { color: catColor }]}>{announcement.category}</Text>
            </View>
            {isPinned ? (
              <View style={[styles.pinnedBadge, N && { backgroundColor: N.surfaceAlt }]}>
                <MaterialIcons name="push-pin" size={11} color={catColor} />
                <Text style={[styles.pinnedText, { color: catColor }]}>Pinned</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.annTitle, N && { color: N.text }]}>{announcement.title}</Text>
        </View>
      </View>

      <Text style={[styles.annBody, N && { color: N.textSub }]}>{announcement.body}</Text>

      <View style={styles.annFooter}>
        <MaterialIcons name="calendar-today" size={12} color={N ? N.textMuted : Colors.textSubtle} />
        <Text style={[styles.annDate, N && { color: N.textMuted }]}>{publishedDate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
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
    gap: 10,
    flex: 1,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  headerMasjidName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  headerTitle: { ...Typography.titleLarge, color: Colors.textPrimary },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
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
  content: { padding: Spacing.md },
  sectionCount: { ...Typography.bodySmall, color: Colors.textSubtle, marginBottom: Spacing.sm },
  // Loading / empty states
  loadingWrap: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  loadingText: { fontSize: 13, color: Colors.textSubtle },
  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 56, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textSubtle },
  emptyBody: { fontSize: 13, color: Colors.textSubtle, textAlign: 'center', lineHeight: 20 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  liveDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  liveLabel: { fontSize: 11, color: Colors.textSubtle, fontWeight: '500' },
  // Event cards
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
  // Announcement cards
  annCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  annCardPinned: { borderLeftWidth: 4 },
  annCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  annBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  annTitle: { ...Typography.titleSmall, color: Colors.textPrimary },
  pinnedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  pinnedText: { fontSize: 10, fontWeight: '700' },
  annBody: { ...Typography.bodyMedium, color: Colors.textSecondary, lineHeight: 22 },
  annFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  annDate: { ...Typography.bodySmall, color: Colors.textSubtle },
});
