import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

export type AnnouncementCategory =
  | 'Important'
  | 'News'
  | 'Event'
  | 'Notice'
  | 'Volunteer'
  | 'Class'
  | 'Reminder'
  | string;

export interface CommunityUpdateItem {
  id: string;
  category: AnnouncementCategory;
  title: string;
  date: string;
  priority?: number;
  isPinned?: boolean;
  excerpt?: string;
}

interface CommunityUpdatesSectionProps {
  title?: string;
  items: CommunityUpdateItem[];
  isLoading?: boolean;
  onPressItem: (item: CommunityUpdateItem) => void;
  onPressSeeAll: () => void;
  nightMode?: boolean;
  maxItems?: number;
}

const NIGHT = {
  sectionTitle: '#E6EDF9',
  seeAll: '#9FCAFF',
  cardBg: '#121929',
  cardBorder: '#21314A',
  divider: 'rgba(255,255,255,0.07)',
  metaDate: '#99A9C0',
  rowTitle: '#F4F7FC',
  excerpt: '#A9B7CD',
  chevron: '#8EA4C4',
  pressed: 'rgba(147,172,206,0.10)',
  pinnedRowBg: 'rgba(214,177,106,0.08)',
  skeleton: 'rgba(255,255,255,0.11)',
  emptyTitle: '#DCE7F6',
  emptyBody: '#9CB0CB',
};

type BadgeTone = {
  bg: string;
  border: string;
  text: string;
};

function getBadgeTone(category: string, nightMode: boolean): BadgeTone {
  const key = category.trim().toLowerCase();

  if (nightMode) {
    const nightTones: Record<string, BadgeTone> = {
      important: { bg: '#3A3020', border: '#6D5730', text: '#E7C885' },
      news: { bg: '#1E3428', border: '#2F5841', text: '#9ECFAE' },
      event: { bg: '#1E3435', border: '#2F5A58', text: '#9CCBC6' },
      notice: { bg: '#332A20', border: '#5F4B35', text: '#D7BE96' },
      volunteer: { bg: '#342D22', border: '#5C4D39', text: '#D8C2A0' },
      class: { bg: '#253424', border: '#3C5A3A', text: '#B5CFA8' },
      reminder: { bg: '#2C3321', border: '#4B5B35', text: '#C8D3A8' },
      prayer: { bg: '#212F40', border: '#39577B', text: '#AAC4E6' },
      closure: { bg: '#3A2320', border: '#6A3935', text: '#E0A5A0' },
      general: { bg: '#223127', border: '#3E5947', text: '#A9CCB2' },
    };
    return nightTones[key] ?? nightTones.general;
  }

  const dayTones: Record<string, BadgeTone> = {
    important: { bg: '#F7F1DF', border: '#D8C79F', text: '#7A5F24' },
    news: { bg: '#EAF3ED', border: '#C3D8C9', text: '#2F6845' },
    event: { bg: '#EBF3F1', border: '#C2D6D1', text: '#2F5E58' },
    notice: { bg: '#F4EFE6', border: '#D9C9AF', text: '#6E5833' },
    volunteer: { bg: '#F5F0E7', border: '#D9C9AF', text: '#715A35' },
    class: { bg: '#ECF2E8', border: '#C7D6BD', text: '#4C623E' },
    reminder: { bg: '#EEF1E5', border: '#CBD3B6', text: '#596139' },
    prayer: { bg: '#EAF0F7', border: '#C7D4E5', text: '#3B5979' },
    closure: { bg: '#F8ECEB', border: '#E1C4C2', text: '#8A4A45' },
    general: { bg: '#EAF3ED', border: '#C3D8C9', text: '#2F6845' },
  };

  return dayTones[key] ?? dayTones.general;
}

export function AnnouncementBadge({
  category,
  nightMode,
}: {
  category: string;
  nightMode: boolean;
}) {
  const tone = getBadgeTone(category, nightMode);

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.badgeText, { color: tone.text }]} numberOfLines={1}>
        {category}
      </Text>
    </View>
  );
}

export function AnnouncementRow({
  item,
  nightMode,
  onPress,
}: {
  item: CommunityUpdateItem;
  nightMode: boolean;
  onPress: (item: CommunityUpdateItem) => void;
}) {
  const N = nightMode ? NIGHT : null;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        item.isPinned && [styles.pinnedRow, N && { backgroundColor: N.pinnedRowBg }],
        pressed && [styles.rowPressed, N && { backgroundColor: N.pressed }],
      ]}
    >
      <View style={styles.rowMain}>
        <View style={styles.metaLine}>
          <AnnouncementBadge category={item.category} nightMode={nightMode} />
          <Text style={[styles.metaDate, N && { color: N.metaDate }]}>{item.date}</Text>
          {item.isPinned ? (
            <View style={styles.pinnedTag}>
              <MaterialIcons name="push-pin" size={10} color={nightMode ? '#E7C885' : '#8D6B2B'} />
              <Text style={[styles.pinnedTagText, nightMode && { color: '#E7C885' }]}>Pinned</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.rowTitle, N && { color: N.rowTitle }]} numberOfLines={2}>
          {item.title}
        </Text>

        {item.excerpt ? (
          <Text style={[styles.rowExcerpt, N && { color: N.excerpt }]} numberOfLines={1}>
            {item.excerpt}
          </Text>
        ) : null}
      </View>

      <MaterialIcons
        name="chevron-right"
        size={18}
        color={N ? N.chevron : Colors.textSubtle}
        style={styles.chevron}
      />
    </Pressable>
  );
}

export function AnnouncementListCard({
  items,
  isLoading,
  onPressItem,
  nightMode,
}: {
  items: CommunityUpdateItem[];
  isLoading: boolean;
  onPressItem: (item: CommunityUpdateItem) => void;
  nightMode: boolean;
}) {
  const N = nightMode ? NIGHT : null;

  if (isLoading) {
    return (
      <View style={[styles.card, N && { backgroundColor: N.cardBg, borderColor: N.cardBorder }]}> 
        {[0, 1, 2].map((idx) => (
          <View key={`skeleton-${idx}`}>
            {idx > 0 ? <View style={[styles.divider, N && { backgroundColor: N.divider }]} /> : null}
            <View style={styles.skeletonRow}>
              <View style={[styles.skeletonBadge, N && { backgroundColor: N.skeleton }]} />
              <View style={[styles.skeletonDate, N && { backgroundColor: N.skeleton }]} />
              <View style={[styles.skeletonTitle, N && { backgroundColor: N.skeleton }]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={[styles.card, styles.emptyCard, N && { backgroundColor: N.cardBg, borderColor: N.cardBorder }]}> 
        <MaterialIcons name="campaign" size={20} color={N ? N.emptyBody : Colors.textSubtle} />
        <Text style={[styles.emptyTitle, N && { color: N.emptyTitle }]}>No current updates</Text>
        <Text style={[styles.emptyBody, N && { color: N.emptyBody }]}>Please check again shortly.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, N && { backgroundColor: N.cardBg, borderColor: N.cardBorder }]}> 
      {items.map((item, idx) => (
        <View key={item.id}>
          {idx > 0 ? <View style={[styles.divider, N && { backgroundColor: N.divider }]} /> : null}
          <AnnouncementRow item={item} nightMode={nightMode} onPress={onPressItem} />
        </View>
      ))}
    </View>
  );
}

export function CommunityUpdatesSection({
  title = 'Community Updates',
  items,
  isLoading = false,
  onPressItem,
  onPressSeeAll,
  nightMode = false,
  maxItems = 3,
}: CommunityUpdatesSectionProps) {
  const N = nightMode ? NIGHT : null;

  const orderedItems = React.useMemo(() => {
    return [...items]
      .sort((a, b) => {
        if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
        return (b.priority ?? 0) - (a.priority ?? 0);
      })
      .slice(0, maxItems);
  }, [items, maxItems]);

  return (
    <View style={styles.sectionWrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, N && { color: N.sectionTitle }]}>{title}</Text>
        <TouchableOpacity onPress={onPressSeeAll} activeOpacity={0.75}>
          <Text style={[styles.seeAllText, N && { color: N.seeAll }]}>See all</Text>
        </TouchableOpacity>
      </View>

      <AnnouncementListCard
        items={orderedItems}
        isLoading={isLoading}
        onPressItem={onPressItem}
        nightMode={nightMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  seeAllText: {
    ...Typography.labelMedium,
    color: '#2A6A47',
    fontWeight: '700',
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: '#DCE8DF',
    backgroundColor: '#FCFBF7',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 6px 18px rgba(20,67,44,0.07)' }
      : {
          shadowColor: '#184B33',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
        }),
    elevation: 2,
  },
  divider: {
    marginHorizontal: Spacing.md,
    height: 1,
    backgroundColor: '#E6ECE5',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 10,
    minHeight: 76,
  },
  rowPressed: {
    backgroundColor: 'rgba(37,99,66,0.06)',
  },
  pinnedRow: {
    backgroundColor: '#FCF7EB',
  },
  rowMain: {
    flex: 1,
    gap: 5,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metaDate: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: '#5F6D65',
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#1B2B22',
  },
  rowExcerpt: {
    ...Typography.bodySmall,
    color: '#5A6A61',
  },
  chevron: {
    marginRight: -2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    minHeight: 20,
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pinnedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(141,107,43,0.35)',
    backgroundColor: 'rgba(245,231,196,0.55)',
  },
  pinnedTagText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '700',
    color: '#8D6B2B',
  },
  skeletonRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  skeletonBadge: {
    width: 72,
    height: 18,
    borderRadius: 20,
    backgroundColor: '#E4ECE5',
    marginBottom: 8,
  },
  skeletonDate: {
    width: 88,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#E7EEE8',
    marginBottom: 8,
  },
  skeletonTitle: {
    width: '86%',
    height: 14,
    borderRadius: 6,
    backgroundColor: '#E4ECE5',
  },
  emptyCard: {
    paddingVertical: 22,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#2A3C31',
  },
  emptyBody: {
    ...Typography.bodySmall,
    color: '#6A766F',
  },
});

export default CommunityUpdatesSection;
