import React, { useState, useCallback } from 'react';
import { AdhkarSelection, PRAYER_TIMES, PrayerTimeId } from '@/types/duasTypes';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  ASR_GROUP_TO_SELECTION,
  BEFORE_FAJR_GROUP_TO_SELECTION,
  DEFAULT_COLORS,
  DEFAULT_COLORS_ASR,
  DEFAULT_COLORS_JUMUAH,
  DEFAULT_COLORS_DHUHR,
  DHUHR_GROUP_TO_SELECTION,
  FAJR_GROUP_TO_SELECTION,
  ISHA_GROUP_TO_SELECTION,
  JUMUAH_GROUP_TO_SELECTION,
  MAGHRIB_GROUP_TO_SELECTION,
  KNOWN_ASR_GROUPS,
  KNOWN_DHUHR_GROUPS,
  KNOWN_FAJR_GROUPS,
  KNOWN_JUMUAH_GROUPS,
  resolveGroupSelection,
} from '@/constants/duasGroups';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { useNightMode } from '@/hooks/useNightMode';
import { fetchAdhkarForPrayerTime, fetchAdhkarGroupsForPrayerTime, AdhkarGroupMeta, AdhkarRow, resolveAdhkarUrduTranslation } from '@/services/contentService';
import { ImranMushafPlaceholder, LuqmanMushafPlaceholder, MulkMushafPlaceholder, SajdahMushafPlaceholder } from '@/components/MushafimageViewer';
import { StarField } from '@/components/adhkar/StarField';
import { NightModeToggle } from '@/components/adhkar/NightModeToggle';
import { PrayerTimeChipBar } from '@/components/adhkar/PrayerTimeChipBar';
import { DbAdhkarScreen } from '@/components/adhkar/DbAdhkarScreen';
import { NIGHT_PALETTE as NIGHT } from '@/components/quran_screen/shared';
import { SurahKahfScreen, SurahSajdahScreen, SurahWaqiahMushafScreen, SurahYaseenScreen } from '@/components/quran_screen';

// StarField, NightModeToggle, PrayerTimeChipBar, DbAdhkarScreen — imported from components/adhkar/

function resolveSelectionFromGroupMeta(
  group: Pick<AdhkarGroupMeta, 'group_name' | 'arabic_title' | 'card_subtitle' | 'description' | 'content_key' | 'content_type'>,
  routeMap: Record<string, AdhkarSelection>
): AdhkarSelection | undefined {
  const routedSelection = resolveGroupSelection(routeMap, group.group_name);
  if (routedSelection) return routedSelection;

  const contentKey = (group.content_key ?? '').toLowerCase().trim();
  const searchableText = [
    group.group_name,
    group.arabic_title,
    group.card_subtitle,
    group.description,
    group.content_key,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const matchingText = `${contentKey} ${searchableText}`;
  const normalized = matchingText
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .trim();
  const compact = normalized.replace(/\s+/g, '');

  if (/(surah\s*18|kahf|kaaf|khf|kafh|kahaf|khaf|الكهف)/.test(normalized) || /(k+a*h+f|k+h+f)/.test(compact)) {
    return 'kahf-mushaf';
  }
  if (/(dua|dua\s+after|supplication)/.test(normalized) && /(surah\s*36|yaseen|yasin|ya\s*seen|يس)/.test(normalized)) {
    return 'yaseen-dua';
  }
  if (/(surah\s*36|yaseen|yasin|ya\s*seen|يس)/.test(normalized)) {
    return 'yaseen';
  }
  if (/(surah\s*56|waqiah|waqia|waqea|waqeah|الواقعة)/.test(normalized)) {
    return 'waqiah';
  }
  if (/(surah\s*32|sajdah|sajda|sajadah|السجدة)/.test(normalized)) {
    return 'sajdah-mushaf';
  }
  if (/(surah\s*67|mulk|الملك)/.test(normalized)) {
    return 'mulk-mushaf';
  }
  if (/(surah\s*31|luqman|luqmaan|لقمان)/.test(normalized)) {
    return 'luqman-mushaf';
  }
  if (/(ali?\s*imran|aal\s*imran|al\s*imran|عمران)/.test(normalized)) {
    return 'imran-mushaf';
  }

  return undefined;
}

export default function DuasScreen() {
  const insets = useSafeAreaInsets();
  const { nightMode, toggleManual } = useNightMode();
  const [selectedPrayerTime, setSelectedPrayerTime] = useState<PrayerTimeId>('after-fajr');
  const [fajrSelection, setFajrSelection] = useState<AdhkarSelection>(null);
  const [viewingGroup, setViewingGroup] = useState<{ groupName: string; prayerTime: PrayerTimeId } | null>(null);
  // Maps pageNum → resolved source: local file URI (instant) or CDN URL (fallback)
  // expo-image disk cache populated at startup — no extra state needed
  // no waqiah sources state — expo-image handles caching

  // Pre-select prayer time + optional group from navigation param (e.g. from For You Today cards)
  const { prayerTime: prayerTimeParam, group: groupParam } = useLocalSearchParams<{ prayerTime?: string; group?: string }>();
  const lastAppliedParam = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (prayerTimeParam && prayerTimeParam !== lastAppliedParam.current) {
      lastAppliedParam.current = prayerTimeParam;
      // Normalise legacy 'after-dhuhr' param to 'after-zuhr'
      const normParam = prayerTimeParam === 'after-dhuhr' ? 'after-zuhr' : prayerTimeParam;
      if (PRAYER_TIMES.some(pt => pt.id === normParam)) {
        setSelectedPrayerTime(normParam as PrayerTimeId);
        setAdhkarFlowActive(false);
        setAsrFlowActive(false);
        // If a group param is provided, jump straight to that group
        if (groupParam) {
          setViewingGroup({ groupName: groupParam, prayerTime: normParam as PrayerTimeId });
        } else {
          setViewingGroup(null);
        }
      }
    }
  }, [prayerTimeParam, groupParam]);

  // Preload Surah Yaseen images when Adhkar tab is first focused
  useFocusEffect(
    useCallback(() => {
      // Load cached pages into state immediately
      // Resolve local filesystem sources — local files load instantly, no spinner
      // expo-image disk cache handles preloading transparently (started at app startup)
      // (waqiah cache handled by expo-image automatically)
    }, [])
  );

  // Load Scheherazade New — standard Indo/Pak Quranic typeface with full harakat
  // Scheherazade New — Indo/Pak Quranic Naskh with full harakat support
  // Using Google Fonts CDN TTF which works natively in Expo
  useFonts({
    'IndoPakNastaleeq': 'https://static-cdn.tarteel.ai/qul/fonts/nastaleeq/Hanafi/normal-v4.2.2/with-waqf-lazmi/font.ttf',
    'MarwanIndoPak': 'https://static-cdn.tarteel.ai/qul/fonts/nastaleeq/Hanafi/normal-v4.2.2/with-waqf-lazmi/font.ttf',
    'UrduNastaliq': require('@/assets/fonts/UrduNastaliq.ttf'),
  });
  const [adhkarFlowActive, setAdhkarFlowActive] = useState(false);
  const [adhkarFlowStep, setAdhkarFlowStep] = useState<1|2|3|4>(1);
  const [asrFlowActive, setAsrFlowActive]   = useState(false);
  const [asrFlowStep, setAsrFlowStep]       = useState<1|2|3|4>(1);

  const debugLog = (...parts: any[]) => {
    if (__DEV__) {
      console.log('[duas]', ...parts);
    }
  };

  React.useEffect(() => {
    debugLog('state', {
      selectedPrayerTime,
      fajrSelection,
      viewingGroup,
      adhkarFlowActive,
      asrFlowActive,
    });
  }, [selectedPrayerTime, fajrSelection, viewingGroup, adhkarFlowActive, asrFlowActive]);

  // Reset all sub-screens when the tab is tapped / re-focused
  useFocusEffect(
    useCallback(() => {
      return () => {
        // On blur (leaving tab) — no-op
      };
    }, [])
  );

  // Expose a single reset fn so the header logo can also trigger it
  const resetToMain = () => {
    setAdhkarFlowActive(false);
    setAdhkarFlowStep(1);
    setAsrFlowActive(false);
    setAsrFlowStep(1);
    setFajrSelection(null);
    setViewingGroup(null);
  };

  const startAdhkarFlow = () => {
    setAdhkarFlowActive(true);
    setAdhkarFlowStep(1);
    setFajrSelection(null);
    setSelectedPrayerTime('after-fajr');
  };

  const exitAdhkarFlow = () => {
    setAdhkarFlowActive(false);
    setAdhkarFlowStep(1);
  };

  const startAsrFlow = () => {
    setAsrFlowActive(true);
    setAsrFlowStep(1);
    setFajrSelection(null);
    setSelectedPrayerTime('after-asr');
  };

  const exitAsrFlow = () => {
    setAsrFlowActive(false);
    setAsrFlowStep(1);
  };

  const openGroupOrSpecial = (groupName: string, prayerTime: PrayerTimeId) => {
    const normalizedGroupName = (groupName ?? '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
      .trim();

    // Keep Fajr Surah Yaseen as group-first navigation.
    // Special Yaseen screen should open from entry tap inside the DB group.
    if (
      prayerTime === 'after-fajr' &&
      (/(surah\s*36|yaseen|yasin|ya\s*seen|يس)/.test(normalizedGroupName))
    ) {
      debugLog('openGroupOrSpecial -> forced-db-group', { groupName, prayerTime });
      setViewingGroup({ groupName, prayerTime });
      return;
    }

    const routeMapByPrayerTime: Partial<Record<PrayerTimeId, Record<string, AdhkarSelection>>> = {
      'before-fajr': BEFORE_FAJR_GROUP_TO_SELECTION,
      'after-fajr': FAJR_GROUP_TO_SELECTION,
      'after-zuhr': DHUHR_GROUP_TO_SELECTION,
      'after-jumuah': JUMUAH_GROUP_TO_SELECTION,
      'after-asr': ASR_GROUP_TO_SELECTION,
      'after-maghrib': MAGHRIB_GROUP_TO_SELECTION,
      'after-isha': ISHA_GROUP_TO_SELECTION,
    };

    const routeMap = routeMapByPrayerTime[prayerTime] ?? {};
    const mapped = resolveSelectionFromGroupMeta(
      {
        group_name: groupName,
        arabic_title: null,
        card_subtitle: null,
        description: null,
        content_key: null,
        content_type: null,
      },
      routeMap
    );

    if (mapped) {
      debugLog('openGroupOrSpecial -> special', { groupName, prayerTime, mapped });
      setViewingGroup(null);
      setAdhkarFlowActive(false);
      setAsrFlowActive(false);
      setFajrSelection(mapped);
      return;
    }

    debugLog('openGroupOrSpecial -> db-group', { groupName, prayerTime });
    setViewingGroup({ groupName, prayerTime });
  };

  const N = nightMode ? NIGHT : null;

  const renderPrayerTimePicker = () => (
    <View style={{ flex: 1 }}>
      <PrayerTimeChipBar
        selected={selectedPrayerTime}
        onSelect={(t) => { setSelectedPrayerTime(t); setFajrSelection(null); setViewingGroup(null); }}
        nightMode={nightMode}
      />
      <PrayerTimeContent
        prayerTime={selectedPrayerTime}
        nightMode={nightMode}
        onSelectSpecial={(selection) => {
          debugLog('onSelectSpecial', { selection, selectedPrayerTime });
          setViewingGroup(null);
          setAdhkarFlowActive(false);
          setAsrFlowActive(false);
          setFajrSelection(selection);
        }}
        onSelectGroup={openGroupOrSpecial}
        onStartFlow={selectedPrayerTime === 'after-fajr' ? startAdhkarFlow : selectedPrayerTime === 'after-asr' ? startAsrFlow : undefined}
      />
    </View>
  );

  const renderActiveContent = () => {
    if (asrFlowActive) {
      return (
        <AsrFlowScreen
          step={asrFlowStep}
          onStepChange={setAsrFlowStep}
          onExit={exitAsrFlow}
          nightMode={nightMode}
        />
      );
    }

    if (adhkarFlowActive) {
      return (
        <AdhkarFlowScreen
          step={adhkarFlowStep}
          onStepChange={setAdhkarFlowStep}
          onExit={exitAdhkarFlow}
          nightMode={nightMode}
        />
      );
    }

    switch (fajrSelection) {
      case 'yaseen':
        return <SurahYaseenScreen nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case 'wird-al-latif':
        return (
          <DbAdhkarScreen
            prayerTime="after-fajr"
            groupFilter="Wird al-Latif"
            nightMode={nightMode}
            onBack={() => setFajrSelection(null)}
            onOpenSpecialGroup={setFajrSelection}
          />
        );
      case 'wird-abu-bakr':
        return <WirdAbuBakrFullScreen nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case 'yaseen-dua':
        return <DuaYaseenScreen nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case 'waqiah':
        return <SurahWaqiahMushafScreen nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case 'hizb-bahr':
        return <DbAdhkarScreen prayerTime="after-asr" groupFilter="Hizb ul Bahr" nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case 'kahf-mushaf':
        return <SurahKahfScreen nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case 'mulk-mushaf':
        return <MulkMushafPlaceholder nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case 'luqman-mushaf':
        return <LuqmanMushafPlaceholder nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case 'imran-mushaf':
        return <ImranMushafPlaceholder nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case 'sajdah-mushaf':
        return <SurahSajdahScreen nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case 'kahf':
        return <SurahKahfScreen nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      case '__all-dhuhr__':
        return <DbAdhkarScreen prayerTime={'after-zuhr' as any} nightMode={nightMode} onBack={() => setFajrSelection(null)} onOpenSpecialGroup={setFajrSelection} />;
      case '__all-jumuah__':
        return <DbAdhkarScreen prayerTime="after-jumuah" nightMode={nightMode} onBack={() => setFajrSelection(null)} onOpenSpecialGroup={setFajrSelection} />;
      case 'morning-adhkar':
        return <DbAdhkarScreen prayerTime="after-fajr" nightMode={nightMode} onBack={() => setFajrSelection(null)} onOpenSpecialGroup={setFajrSelection} />;
      case 'waqiah-dua':
        return <DuaWaqiahScreen nightMode={nightMode} onBack={() => setFajrSelection(null)} />;
      default:
        break;
    }

    if (viewingGroup !== null) {
      return (
        <DbAdhkarScreen
          prayerTime={viewingGroup.prayerTime as any}
          groupFilter={viewingGroup.groupName}
          nightMode={nightMode}
          onBack={() => setViewingGroup(null)}
          onOpenSpecialGroup={setFajrSelection}
        />
      );
    }

    return renderPrayerTimePicker();
  };

  // Unique warm parchment background for day; deep navy for night
  const pageBg = N ? N.bg : '#F5EFE6';

  return (
    <View style={[styles.container, { paddingTop: insets.top }, { backgroundColor: pageBg }]}>
      {/* Hero Header with masjid image — compact */}
      <ImageBackground
        source={require('@/assets/images/masjid-building.jpg')}
        style={[styles.heroHeader, { paddingTop: insets.top }]}
        imageStyle={{ opacity: N ? 0.25 : 0.75 }}
      >
        <LinearGradient
          colors={N
            ? ['rgba(3,5,12,0.94)', 'rgba(6,9,18,0.90)', 'rgba(6,9,18,0.97)']
            : ['rgba(180,80,10,0.55)', 'rgba(230,120,20,0.45)', 'rgba(245,180,60,0.55)']}
          style={StyleSheet.absoluteFillObject}
        />
        {N ? <StarField /> : null}
        {/* Nav row */}
        <View style={styles.heroNav}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity onPress={resetToMain} activeOpacity={0.8}>
              <Image
                source={require('@/assets/images/masjid-logo.png')}
                style={styles.headerLogo}
                contentFit="contain"
                tintColor={undefined}
              />
            </TouchableOpacity>
            <View>
              <Text style={styles.heroMasjidName}>JMN</Text>
              <Text style={styles.heroTitle}>Quran & Duas</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <NightModeToggle nightMode={nightMode} onToggle={toggleManual} />
          </View>
        </View>


      </ImageBackground>

      {/* Back-to-main bar — visible whenever not on the root chip-bar view */}
      {(asrFlowActive || adhkarFlowActive || fajrSelection !== null || viewingGroup !== null) ? (
        <TouchableOpacity
          onPress={resetToMain}
          activeOpacity={0.8}
          style={[
            mainBackStyles.bar,
            N && { backgroundColor: N.surface, borderBottomColor: N.border },
          ]}
        >
          <MaterialIcons name="arrow-back" size={18} color={N ? N.accent : Colors.primary} />
          <Text style={[mainBackStyles.label, { color: N ? N.accent : Colors.primary }]}>
            Back to Adhkar
          </Text>
        </TouchableOpacity>
      ) : null}

      {renderActiveContent()}
    </View>
  );
}

// chipBarStyles removed — PrayerTimeChipBar is imported from components/adhkar/

// ── Prayer Time Content Router ───────────────────────────────────────────
function PrayerTimeContent({
  prayerTime, nightMode, onSelectSpecial, onSelectGroup, onStartFlow,
}: { prayerTime: PrayerTimeId; nightMode: boolean; onSelectSpecial: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string, prayerTime: PrayerTimeId) => void; onStartFlow?: () => void }) {
  switch (prayerTime) {
    case 'before-fajr':   return <BeforeFajrScreen nightMode={nightMode} onSelect={onSelectSpecial} onSelectGroup={(gn) => onSelectGroup(gn, 'before-fajr')} />;
    case 'after-fajr':    return <AfterFajrScreen nightMode={nightMode} onSelect={onSelectSpecial} onSelectGroup={(gn) => onSelectGroup(gn, 'after-fajr')} onStartFlow={onStartFlow} />;
    case 'after-zuhr':    return <AfterDhuhrScreen nightMode={nightMode} onSelect={onSelectSpecial} onSelectGroup={(gn) => onSelectGroup(gn, 'after-zuhr')} />;
    case 'after-jumuah':  return <AfterJumuahScreen nightMode={nightMode} onSelect={onSelectSpecial} onSelectGroup={(gn) => onSelectGroup(gn, 'after-jumuah')} />;
    case 'after-asr':     return <AfterAsrScreen nightMode={nightMode} onSelect={onSelectSpecial} onSelectGroup={(gn) => onSelectGroup(gn, 'after-asr')} onStartFlow={onStartFlow} />;
    case 'after-maghrib': return <AfterMaghribScreen nightMode={nightMode} onSelect={onSelectSpecial} onSelectGroup={(gn) => onSelectGroup(gn, 'after-maghrib')} />;
    case 'after-isha':    return <AfterIshaScreen nightMode={nightMode} onSelectGroup={(gn) => onSelectGroup(gn, 'after-isha')} />;
    default:              return null;
  }
}

// ── Wird Abu Bakr bin Salim Content ─────────────────────────────────────
function WirdAbuBakrContent({ nightMode, onBack }: { nightMode: boolean; onBack?: () => void }) {
  return <DbAdhkarScreen prayerTime="after-fajr" groupFilter="Wird Abu Bakr bin Salim" nightMode={nightMode} onBack={onBack} />;
}

// ── REMOVED: WIRD_ABU_BAKR_ARABIC / WIRD_ABU_BAKR_TRANSLIT / WIRD_ABU_BAKR_TRANS
// Content now served from database: prayer_time='before-fajr', group_name='Wird Abu Bakr bin Salim'

// ── Before Fajr Screen ───────────────────────────────────────────────────
function BeforeFajrScreen({ nightMode, onSelect, onSelectGroup }: { nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void }) {
  return <PrayerTimeSelectionScreen
    prayerTime="before-fajr" nightMode={nightMode} onSelect={onSelect} onSelectGroup={onSelectGroup}
    routeMap={BEFORE_FAJR_GROUP_TO_SELECTION}
    icon="nights-stay" nightIcon="nights-stay" nightColor="#A5B4FC" accent="#3949AB"
    title="Before Fajr & Tahajjud" subtitle="Choose what to recite before Fajr and during Tahajjud"
    colors={['#3949AB','#1B8A5A','#6A1B9A','#1565C0','#E65100','#B8860B','#00695C']}
  />;
}

// ── After Dhuhr Screen ──────────────────────────────────────────────────
function AfterDhuhrScreen({ nightMode, onSelect, onSelectGroup }: { nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void }) {
  return <DhuhrSelectionScreen nightMode={nightMode} onSelect={onSelect} onSelectGroup={onSelectGroup} />;
}

function DhuhrSelectionScreen({ nightMode, onSelect, onSelectGroup }: { nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void }) {
  const N = nightMode ? NIGHT : null;
  const [groups, setGroups] = React.useState<AdhkarGroupMeta[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchAdhkarGroupsForPrayerTime('after-zuhr' as any).then(g => {
      setGroups(g);
      setLoading(false);
    });
  }, []);

  const accent = '#0A5C9E';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[fajrSelStyles.container, N && { backgroundColor: N.bg }]}>
      <View style={[fajrSelStyles.headerBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="wb-sunny" size={22} color={N ? '#60A5FA' : accent} />
        <View style={{ flex: 1 }}>
          <Text style={[fajrSelStyles.headerTitle, N && { color: N.text }]}>After Dhuhr</Text>
          <Text style={[fajrSelStyles.headerSub, N && { color: N.textSub }]}>Choose what to recite after Dhuhr prayer</Text>
        </View>
      </View>

      {/* Dynamic DB groups — purely from portal */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 12, color: N ? N.textMuted : Colors.textSubtle }}>Loading adhkar…</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
          <MaterialIcons name="auto-awesome" size={36} color={N ? N.textMuted : Colors.textSubtle} style={{ opacity: 0.4 }} />
          <Text style={{ fontSize: 13, color: N ? N.textMuted : Colors.textSubtle, textAlign: 'center', lineHeight: 20 }}>
            Adhkar coming soon.
          </Text>
        </View>
      ) : groups.map((grp, idx) => {
        const meta = KNOWN_DHUHR_GROUPS[grp.group_name];
        const color = grp.card_color ?? meta?.color ?? DEFAULT_COLORS_DHUHR[idx % DEFAULT_COLORS_DHUHR.length];
        const icon  = meta?.icon  ?? 'auto-awesome';
        const badge = meta?.badge ?? 'Adhkar';
        const subtitle = grp.card_subtitle || `${grp.item_count} dua${grp.item_count !== 1 ? 's' : ''}`;
        const detail  = grp.description ?? null;

        return (
          <TouchableOpacity
            key={grp.group_name}
            style={[fajrSelStyles.card, N && { backgroundColor: N.surface, borderColor: N.border }]}
            onPress={() => {
              const knownKey = resolveSelectionFromGroupMeta(grp, DHUHR_GROUP_TO_SELECTION);
              if (knownKey) {
                onSelect(knownKey);
              } else {
                onSelectGroup(grp.group_name);
              }
            }}
            activeOpacity={0.85}
          >
            <View style={[fajrSelStyles.iconBox, { backgroundColor: color + '22' }]}>
              <MaterialIcons name={icon as any} size={28} color={color} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={fajrSelStyles.titleRow}>
                <Text style={[fajrSelStyles.cardTitle, N && { color: N.text }]}>{grp.group_name}</Text>
                <View style={[fajrSelStyles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                  <Text style={[fajrSelStyles.badgeText, { color }]}>{badge}</Text>
                </View>
              </View>
              <Text style={[fajrSelStyles.subtitle, N && { color: N.textSub }]}>{subtitle}</Text>
              {detail ? <Text style={[fajrSelStyles.detail, { color: color + 'BB' }, N && { color: N.textMuted }]}>{detail}</Text> : null}
            </View>
            <MaterialIcons name="chevron-right" size={24} color={N ? N.textMuted : Colors.textSubtle} />
          </TouchableOpacity>
        );
      })}

      <View style={[fajrSelStyles.tip, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="info-outline" size={14} color={N ? N.textMuted : Colors.textSubtle} />
        <Text style={[fajrSelStyles.tipText, N && { color: N.textMuted }]}>Adhkar coming soon.</Text>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ── After Jumu'ah Screen ─────────────────────────────────────────────────
function AfterJumuahScreen({ nightMode, onSelect, onSelectGroup }: { nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void }) {
  return <JumuahSelectionScreen nightMode={nightMode} onSelect={onSelect} onSelectGroup={onSelectGroup} />;
}

function JumuahSelectionScreen({ nightMode, onSelect, onSelectGroup }: { nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void }) {
  const N = nightMode ? NIGHT : null;
  const [groups, setGroups] = React.useState<AdhkarGroupMeta[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchAdhkarGroupsForPrayerTime('after-jumuah').then(g => {
      setGroups(g);
      setLoading(false);
    });
  }, []);

  const accent = '#B8860B';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[fajrSelStyles.container, N && { backgroundColor: N.bg }]}>
      <View style={[fajrSelStyles.headerBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="star" size={22} color={N ? '#F9C74F' : accent} />
        <View style={{ flex: 1 }}>
          <Text style={[fajrSelStyles.headerTitle, N && { color: N.text }]}>{"After Jumu'ah"}</Text>
          <Text style={[fajrSelStyles.headerSub, N && { color: N.textSub }]}>{"Choose what to recite after Jumu'ah"}</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 12, color: N ? N.textMuted : Colors.textSubtle }}>Loading adhkar…</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
          <MaterialIcons name="auto-awesome" size={36} color={N ? N.textMuted : Colors.textSubtle} style={{ opacity: 0.4 }} />
          <Text style={{ fontSize: 13, color: N ? N.textMuted : Colors.textSubtle, textAlign: 'center', lineHeight: 20 }}>
            Adhkar coming soon.
          </Text>
        </View>
      ) : groups.map((grp, idx) => {
        const meta = KNOWN_JUMUAH_GROUPS[grp.group_name];
        const color = grp.card_color ?? meta?.color ?? DEFAULT_COLORS_JUMUAH[idx % DEFAULT_COLORS_JUMUAH.length];
        const icon  = meta?.icon  ?? 'auto-awesome';
        const badge = meta?.badge ?? 'Adhkar';
        const subtitle = grp.card_subtitle || `${grp.item_count} dua${grp.item_count !== 1 ? 's' : ''}`;
        const detail  = grp.description ?? null;

        return (
          <TouchableOpacity
            key={grp.group_name}
            style={[fajrSelStyles.card, N && { backgroundColor: N.surface, borderColor: N.border }]}
            onPress={() => {
              const groupNameNormalized = (grp.group_name ?? '')
                .toLowerCase()
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
                .trim();

              // Keep Friday "Quran" as a group-first navigation.
              // Special screens (Kahf/Yaseen/Sajdah) should open from entry tap inside the group.
              if (/^(quran|qur an|القران|القرآن)$/.test(groupNameNormalized)) {
                if (__DEV__) {
                  console.log('[duas][jumuah-press] quran-group', { groupName: grp.group_name });
                }
                onSelectGroup(grp.group_name);
                return;
              }

              const jumuahSearchText = [
                grp.group_name,
                grp.arabic_title,
                grp.card_subtitle,
                grp.description,
                grp.content_key,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
                .trim();
              const jumuahCompact = jumuahSearchText.replace(/\s+/g, '');

              // Final safety net for portal naming drift in Jumu'ah groups.
              if (/(kahf|kaaf|khf|kafh|kahaf|khaf|الكهف|surah\s*18)/.test(jumuahSearchText) || /(k+a*h+f|k+h+f)/.test(jumuahCompact)) {
                if (__DEV__) {
                  console.log('[duas][jumuah-press] kahf-fallback', { groupName: grp.group_name, jumuahSearchText, jumuahCompact });
                }
                onSelect('kahf-mushaf');
                return;
              }

              const knownKey = resolveSelectionFromGroupMeta(grp, JUMUAH_GROUP_TO_SELECTION);
              if (knownKey) {
                if (__DEV__) {
                  console.log('[duas][jumuah-press] mapped', { groupName: grp.group_name, knownKey });
                }
                onSelect(knownKey);
              } else {
                if (__DEV__) {
                  console.log('[duas][jumuah-press] db-group', { groupName: grp.group_name });
                }
                onSelectGroup(grp.group_name);
              }
            }}
            activeOpacity={0.85}
          >
            <View style={[fajrSelStyles.iconBox, { backgroundColor: color + '22' }]}>
              <MaterialIcons name={icon as any} size={28} color={color} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={fajrSelStyles.titleRow}>
                <Text style={[fajrSelStyles.cardTitle, N && { color: N.text }]}>{grp.group_name}</Text>
                <View style={[fajrSelStyles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                  <Text style={[fajrSelStyles.badgeText, { color }]}>{badge}</Text>
                </View>
              </View>
              <Text style={[fajrSelStyles.subtitle, N && { color: N.textSub }]}>{subtitle}</Text>
              {detail ? <Text style={[fajrSelStyles.detail, { color: color + 'BB' }, N && { color: N.textMuted }]}>{detail}</Text> : null}
            </View>
            <MaterialIcons name="chevron-right" size={24} color={N ? N.textMuted : Colors.textSubtle} />
          </TouchableOpacity>
        );
      })}

      <View style={[fajrSelStyles.tip, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="info-outline" size={14} color={N ? N.textMuted : Colors.textSubtle} />
        <Text style={[fajrSelStyles.tipText, N && { color: N.textMuted }]}>Adhkar coming soon.</Text>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ── After Asr Screen ─────────────────────────────────────────────────────
function AfterAsrScreen({ nightMode, onSelect, onSelectGroup, onStartFlow }: { nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void; onStartFlow?: () => void }) {
  return <AsrSelectionScreen nightMode={nightMode} onSelect={onSelect} onSelectGroup={onSelectGroup} onStartFlow={onStartFlow} />;
}

function AsrSelectionScreen({ nightMode, onSelect, onSelectGroup, onStartFlow }: { nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void; onStartFlow?: () => void }) {
  const N = nightMode ? NIGHT : null;
  const [groups, setGroups] = React.useState<AdhkarGroupMeta[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchAdhkarGroupsForPrayerTime('after-asr').then(g => {
      setGroups(g);
      setLoading(false);
    });
  }, []);

  const accent = '#E65100';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[fajrSelStyles.container, N && { backgroundColor: N.bg }]}>
      {onStartFlow ? (
        <TouchableOpacity
          style={[fajrSelStyles.flowStartBtn, { backgroundColor: accent, borderColor: accent, shadowColor: accent }, N && { backgroundColor: '#BF4500', borderColor: '#BF4500' }]}
          onPress={onStartFlow}
          activeOpacity={0.88}
        >
          <View style={fajrSelStyles.flowStartLeft}>
            <View style={fajrSelStyles.flowPlayIcon}>
              <MaterialIcons name="play-arrow" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fajrSelStyles.flowStartTitle}>Start After Asr Adhkar</Text>
              <Text style={fajrSelStyles.flowStartSub}>Waqiah · Hizb ul Bahr · Dua  ·  8–10 mins</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      ) : null}

      <View style={[fajrSelStyles.headerBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="wb-cloudy" size={22} color={N ? '#F9A825' : accent} />
        <View style={{ flex: 1 }}>
          <Text style={[fajrSelStyles.headerTitle, N && { color: N.text }]}>After Asr</Text>
          <Text style={[fajrSelStyles.headerSub, N && { color: N.textSub }]}>Choose what to recite after Asr prayer</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 12, color: N ? N.textMuted : Colors.textSubtle }}>Loading adhkar…</Text>
        </View>
      ) : groups.map((grp, idx) => {
        const meta     = KNOWN_ASR_GROUPS[grp.group_name];
        const color    = grp.card_color ?? meta?.color ?? DEFAULT_COLORS_ASR[idx % DEFAULT_COLORS_ASR.length];
        const icon     = meta?.icon     ?? 'auto-awesome';
        const badge    = meta?.badge    ?? 'Adhkar';
        const subtitle = grp.card_subtitle || `${grp.item_count} dua${grp.item_count !== 1 ? 's' : ''}`;
        const detail   = grp.description ?? null;

        return (
          <TouchableOpacity
            key={grp.group_name}
            style={[fajrSelStyles.card, N && { backgroundColor: N.surface, borderColor: N.border }]}
            onPress={() => {
              const knownKey = resolveSelectionFromGroupMeta(grp, ASR_GROUP_TO_SELECTION);
              if (knownKey) {
                onSelect(knownKey);
              } else {
                onSelectGroup(grp.group_name);
              }
            }}
            activeOpacity={0.85}
          >
            <View style={[fajrSelStyles.iconBox, { backgroundColor: color + '22' }]}>
              <MaterialIcons name={icon as any} size={28} color={color} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={fajrSelStyles.titleRow}>
                <Text style={[fajrSelStyles.cardTitle, N && { color: N.text }]}>{grp.group_name}</Text>
                <View style={[fajrSelStyles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                  <Text style={[fajrSelStyles.badgeText, { color }]}>{badge}</Text>
                </View>
              </View>
              <Text style={[fajrSelStyles.subtitle, N && { color: N.textSub }]}>{subtitle}</Text>
              {detail ? <Text style={[fajrSelStyles.detail, { color: color + 'BB' }, N && { color: N.textMuted }]}>{detail}</Text> : null}
            </View>
            <MaterialIcons name="chevron-right" size={24} color={N ? N.textMuted : Colors.textSubtle} />
          </TouchableOpacity>
        );
      })}

      {!loading && groups.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
          <MaterialIcons name="auto-awesome" size={36} color={N ? N.textMuted : Colors.textSubtle} style={{ opacity: 0.4 }} />
          <Text style={{ fontSize: 13, color: N ? N.textMuted : Colors.textSubtle, textAlign: 'center', lineHeight: 20 }}>
            Adhkar coming soon.
          </Text>
        </View>
      ) : null}

      <View style={[fajrSelStyles.tip, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="info-outline" size={14} color={N ? N.textMuted : Colors.textSubtle} />
        <Text style={[fajrSelStyles.tipText, N && { color: N.textMuted }]}>Adhkar coming soon.</Text>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// ── Dua after Surah Yaseen Screen ──────────────────────────────────────
function DuaYaseenScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <DbAdhkarScreen prayerTime="after-fajr" groupFilter="Dua after Surah Yaseen" nightMode={nightMode} onBack={onBack} />;
}


// ── Dua after Surah Waqiah Screen ─────────────────────────────────────────
function DuaWaqiahScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <DbAdhkarScreen prayerTime="after-asr" groupFilter="Dua al-Waqiah" nightMode={nightMode} onBack={onBack} />;
}



// ── After Maghrib Screen ─────────────────────────────────────────────────
function AfterMaghribScreen({ nightMode, onSelect, onSelectGroup }: { nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void }) {
  return <PrayerTimeSelectionScreen
    prayerTime="after-maghrib" nightMode={nightMode} onSelect={onSelect} onSelectGroup={onSelectGroup}
    routeMap={MAGHRIB_GROUP_TO_SELECTION}
    icon="bedtime" nightIcon="bedtime" nightColor="#C084FC" accent="#6A1B9A"
    title="After Maghrib" subtitle="Choose what to recite after Maghrib prayer"
    colors={['#6A1B9A','#AD1457','#1565C0','#1B8A5A','#E65100','#3949AB','#B8860B']}
  />;
}

// ── After Isha Screen ────────────────────────────────────────────────────
function AfterIshaScreen({ nightMode, onSelectGroup }: { nightMode: boolean; onSelectGroup: (groupName: string) => void }) {
  const [sel, setSel] = React.useState<AdhkarSelection>(null);
  const [viewingGroupName, setViewingGroupName] = React.useState<string | null>(null);
  const N = nightMode ? NIGHT : null;

  const openIshaSpecial = React.useCallback((selection: AdhkarSelection) => {
    setViewingGroupName(null);
    setSel(selection);
  }, []);
  
  // If a group is being viewed, show it
  if (viewingGroupName !== null) {
    return (
      <>
        <TouchableOpacity onPress={() => setViewingGroupName(null)} activeOpacity={0.8} style={[mainBackStyles.bar, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
          <MaterialIcons name="arrow-back" size={18} color={N ? N.accent : Colors.primary} />
          <Text style={[mainBackStyles.label, { color: N ? N.accent : Colors.primary }]}>Back to Adhkar</Text>
        </TouchableOpacity>
        <DbAdhkarScreen
          prayerTime="after-isha"
          groupFilter={viewingGroupName}
          nightMode={nightMode}
          onBack={() => setViewingGroupName(null)}
          onOpenSpecialGroup={openIshaSpecial}
        />
      </>
    );
  }
  
  // Dedicated mushaf viewers
  if (sel === 'sajdah-mushaf') return (
    <>
      <TouchableOpacity onPress={() => setSel(null)} activeOpacity={0.8} style={[mainBackStyles.bar, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        <MaterialIcons name="arrow-back" size={18} color={N ? N.accent : Colors.primary} />
        <Text style={[mainBackStyles.label, { color: N ? N.accent : Colors.primary }]}>Back to Adhkar</Text>
      </TouchableOpacity>
      <SajdahMushafPlaceholder nightMode={nightMode} onBack={() => setSel(null)} />
    </>
  );
  if (sel === 'mulk-mushaf') return (
    <>
      <TouchableOpacity onPress={() => setSel(null)} activeOpacity={0.8} style={[mainBackStyles.bar, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        <MaterialIcons name="arrow-back" size={18} color={N ? N.accent : Colors.primary} />
        <Text style={[mainBackStyles.label, { color: N ? N.accent : Colors.primary }]}>Back to Adhkar</Text>
      </TouchableOpacity>
      <MulkMushafPlaceholder nightMode={nightMode} onBack={() => setSel(null)} />
    </>
  );
  if (sel === 'luqman-mushaf') return (
    <>
      <TouchableOpacity onPress={() => setSel(null)} activeOpacity={0.8} style={[mainBackStyles.bar, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        <MaterialIcons name="arrow-back" size={18} color={N ? N.accent : Colors.primary} />
        <Text style={[mainBackStyles.label, { color: N ? N.accent : Colors.primary }]}>Back to Adhkar</Text>
      </TouchableOpacity>
      <LuqmanMushafPlaceholder nightMode={nightMode} onBack={() => setSel(null)} />
    </>
  );
  if (sel === 'imran-mushaf') return (
    <>
      <TouchableOpacity onPress={() => setSel(null)} activeOpacity={0.8} style={[mainBackStyles.bar, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        <MaterialIcons name="arrow-back" size={18} color={N ? N.accent : Colors.primary} />
        <Text style={[mainBackStyles.label, { color: N ? N.accent : Colors.primary }]}>Back to Adhkar</Text>
      </TouchableOpacity>
      <ImranMushafPlaceholder nightMode={nightMode} onBack={() => setSel(null)} />
    </>
  );
  
  const handleIshaSelect = (s: AdhkarSelection) => {
    const mapped = resolveGroupSelection(ISHA_GROUP_TO_SELECTION, s as string);
    if (mapped) { 
      setSel(mapped); 
      return; 
    }
    setSel(s);
  };
  
  return <PrayerTimeSelectionScreen
    prayerTime="after-isha" nightMode={nightMode} onSelect={handleIshaSelect} onSelectGroup={(gn) => setViewingGroupName(gn)}
    icon="nightlight" nightIcon="nightlight" nightColor="#93C5FD" accent="#1565C0"
    title="After Isha" subtitle="Choose what to recite after Isha prayer"
    colors={['#1565C0','#3949AB','#6A1B9A','#1B8A5A','#00695C','#AD1457','#B8860B']}
  />;
}

// ── Generic Prayer Time Selection Screen (shared between Maghrib & Isha) ───────
function PrayerTimeSelectionScreen({
  prayerTime, nightMode, onSelect, onSelectGroup, routeMap, icon, nightColor, accent, title, subtitle, colors,
}: {
  prayerTime: AdhkarRow['prayer_time']; nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void;
  routeMap?: Record<string, AdhkarSelection>;
  icon: string; nightIcon?: string; nightColor: string; accent: string;
  title: string; subtitle: string; colors: string[];
}) {
  const N = nightMode ? NIGHT : null;
  const [groups, setGroups] = React.useState<AdhkarGroupMeta[]>([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    fetchAdhkarGroupsForPrayerTime(prayerTime).then(g => { setGroups(g); setLoading(false); });
  }, [prayerTime]);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[fajrSelStyles.container, N && { backgroundColor: N.bg }]}>
      <View style={[fajrSelStyles.headerBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name={icon as any} size={22} color={N ? nightColor : accent} />
        <View style={{ flex: 1 }}>
          <Text style={[fajrSelStyles.headerTitle, N && { color: N.text }]}>{title}</Text>
          <Text style={[fajrSelStyles.headerSub, N && { color: N.textSub }]}>{subtitle}</Text>
        </View>
      </View>
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 12, color: N ? N.textMuted : Colors.textSubtle }}>Loading adhkar…</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
          <MaterialIcons name="auto-awesome" size={36} color={N ? N.textMuted : Colors.textSubtle} style={{ opacity: 0.4 }} />
          <Text style={{ fontSize: 13, color: N ? N.textMuted : Colors.textSubtle, textAlign: 'center', lineHeight: 20 }}>
            Adhkar coming soon.
          </Text>
        </View>
      ) : groups.map((grp, idx) => {
        const color = grp.card_color ?? colors[idx % colors.length];
        const badge = 'Adhkar';
        const subtitleText = grp.card_subtitle || `${grp.item_count} dua${grp.item_count !== 1 ? 's' : ''}`;
        const detail = grp.description ?? null;
        return (
          <TouchableOpacity key={grp.group_name} style={[fajrSelStyles.card, N && { backgroundColor: N.surface, borderColor: N.border }]}
            onPress={() => {
              const knownKey = routeMap?.[grp.group_name];
              if (knownKey) {
                onSelect(knownKey);
              } else {
                onSelectGroup(grp.group_name);
              }
            }} activeOpacity={0.85}>
            <View style={[fajrSelStyles.iconBox, { backgroundColor: color + '22' }]}>
              <MaterialIcons name="auto-awesome" size={28} color={color} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={fajrSelStyles.titleRow}>
                <Text style={[fajrSelStyles.cardTitle, N && { color: N.text }]}>{grp.group_name}</Text>
                <View style={[fajrSelStyles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                  <Text style={[fajrSelStyles.badgeText, { color }]}>{badge}</Text>
                </View>
              </View>
              <Text style={[fajrSelStyles.subtitle, N && { color: N.textSub }]}>{subtitleText}</Text>
              {detail ? <Text style={[fajrSelStyles.detail, { color: color + 'BB' }, N && { color: N.textMuted }]}>{detail}</Text> : null}
            </View>
            <MaterialIcons name="chevron-right" size={24} color={N ? N.textMuted : Colors.textSubtle} />
          </TouchableOpacity>
        );
      })}
      <View style={[fajrSelStyles.tip, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="info-outline" size={14} color={N ? N.textMuted : Colors.textSubtle} />
        <Text style={[fajrSelStyles.tipText, N && { color: N.textMuted }]}>Adhkar coming soon.</Text>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

// PRAYER_TIME_META, ENHANCED_ARABIC_GROUPS, DbAdhkarScreen — provided by components/adhkar/DbAdhkarScreen


// dbStyles removed — DbAdhkarScreen is imported from components/adhkar/

// ── After Fajr Selection Screen ─────────────────────────────────────────
function AfterFajrScreen({ nightMode, onSelect, onSelectGroup, onStartFlow }: { nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void; onStartFlow?: () => void }) {
  return <FajrSelectionScreen nightMode={nightMode} onSelect={onSelect} onSelectGroup={onSelectGroup} onStartFlow={onStartFlow} />;
}

function FajrSelectionScreen({ nightMode, onSelect, onSelectGroup, onStartFlow }: { nightMode: boolean; onSelect: (s: AdhkarSelection) => void; onSelectGroup: (groupName: string) => void; onStartFlow?: () => void }) {
  const N = nightMode ? NIGHT : null;
  const [groups, setGroups] = React.useState<AdhkarGroupMeta[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchAdhkarGroupsForPrayerTime('after-fajr').then(g => {
      setGroups(g);
      setLoading(false);
    });
  }, []);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[fajrSelStyles.container, N && { backgroundColor: N.bg }]}>
      {/* ── Guided Morning Adhkar Flow CTA ─────────────────── */}
      {onStartFlow ? (
        <TouchableOpacity
          style={[fajrSelStyles.flowStartBtn, N && { backgroundColor: '#1B7A47', borderColor: '#1B7A47' }]}
          onPress={onStartFlow}
          activeOpacity={0.88}
        >
          <View style={fajrSelStyles.flowStartLeft}>
            <View style={fajrSelStyles.flowPlayIcon}>
              <MaterialIcons name="play-arrow" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fajrSelStyles.flowStartTitle}>Start Morning Adhkar</Text>
              <Text style={fajrSelStyles.flowStartSub}>Wird al-Latif · Dua  ·  5–7 mins</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      ) : null}

      <View style={[fajrSelStyles.headerBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="wb-twilight" size={22} color={N ? '#F9C74F' : '#F57C00'} />
        <View style={{ flex: 1 }}>
          <Text style={[fajrSelStyles.headerTitle, N && { color: N.text }]}>After Fajr</Text>
          <Text style={[fajrSelStyles.headerSub, N && { color: N.textSub }]}>Choose what to recite after Fajr prayer</Text>
        </View>
      </View>

      {/* ── Dynamic: one card per DB group (includes Surah Yaseen from DB) ── */}
      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <Text style={{ fontSize: 12, color: N ? N.textMuted : Colors.textSubtle }}>Loading adhkar…</Text>
        </View>
      ) : groups.map((grp, idx) => {
        const meta = KNOWN_FAJR_GROUPS[grp.group_name];
        const color = grp.card_color ?? meta?.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
        const icon  = meta?.icon  ?? 'auto-awesome';
        const badge = meta?.badge ?? 'Adhkar';
        const subtitle = grp.card_subtitle || `${grp.item_count} dua${grp.item_count !== 1 ? 's' : ''}`;
        const detail  = grp.description ?? null;

        return (
          <TouchableOpacity
            key={grp.group_name}
            style={[fajrSelStyles.card, N && { backgroundColor: N.surface, borderColor: N.border }]}
            onPress={() => {
              const groupNameNormalized = (grp.group_name ?? '')
                .toLowerCase()
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
                .trim();

              // Keep Fajr Surah Yaseen at group level first.
              if (/(surah\s*36|yaseen|yasin|ya\s*seen|يس)/.test(groupNameNormalized)) {
                if (__DEV__) {
                  console.log('[duas][fajr-press] yaseen-group', { groupName: grp.group_name });
                }
                onSelectGroup(grp.group_name);
                return;
              }

              const knownKey = resolveSelectionFromGroupMeta(grp, FAJR_GROUP_TO_SELECTION);
              if (knownKey) {
                onSelect(knownKey);
              } else {
                onSelectGroup(grp.group_name);
              }
            }}
            activeOpacity={0.85}
          >
            <View style={[fajrSelStyles.iconBox, { backgroundColor: color + '22' }]}>
              <MaterialIcons name={icon as any} size={28} color={color} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={fajrSelStyles.titleRow}>
                <Text style={[fajrSelStyles.cardTitle, N && { color: N.text }]}>{grp.group_name}</Text>
                <View style={[fajrSelStyles.badge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
                  <Text style={[fajrSelStyles.badgeText, { color }]}>{badge}</Text>
                </View>
              </View>
              <Text style={[fajrSelStyles.subtitle, N && { color: N.textSub }]}>{subtitle}</Text>
              {detail ? <Text style={[fajrSelStyles.detail, { color: color + 'BB' }, N && { color: N.textMuted }]}>{detail}</Text> : null}
            </View>
            <MaterialIcons name="chevron-right" size={24} color={N ? N.textMuted : Colors.textSubtle} />
          </TouchableOpacity>
        );
      })}

      <View style={[fajrSelStyles.tip, N && { backgroundColor: N.surface, borderColor: N.border }]}>
        <MaterialIcons name="info-outline" size={14} color={N ? N.textMuted : Colors.textSubtle} />
        <Text style={[fajrSelStyles.tipText, N && { color: N.textMuted }]}>Adhkar coming soon.</Text>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const fajrSelStyles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.sm },
  headerBand: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: 4,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 11, fontWeight: '500', color: Colors.textSubtle, marginTop: 1 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  iconBox: {
    width: 52, height: 52, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  arabicTitle: { fontSize: 18, fontWeight: '700' } as any,
  badge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: Radius.full, borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  subtitle: { fontSize: 12, fontWeight: '600', color: Colors.textSubtle },
  detail: { fontSize: 12.5, fontWeight: '500', fontStyle: 'italic', lineHeight: 20, color: Colors.textSubtle, marginTop: 4 },
  tip: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 10, marginTop: 4,
  },
  tipText: { flex: 1, fontSize: 11, fontWeight: '400', lineHeight: 16, color: Colors.textSubtle },
  flowStartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.primary,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  flowStartLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  flowPlayIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  flowStartTitle: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.1 },
  flowStartSub: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
});

// ── Surah Yaseen — Authentic Mushaf page layout with pinch-to-zoom ──────

const WIRD_SURAHS = [
  {
    id: 'ikhlas',
    number: 112,
    title: 'Surah Al-Ikhlas',
    arabicTitle: 'سُورَةُ الإِخْلَاص',
    color: '#6A1B9A',
    arabic:
      'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ\n' +
      'قُلْ هُوَ ٱللَّهُ أَحَدٌ ﴿١﴾ ٱللَّهُ ٱلصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌ ﴿٤﴾',
    transliteration:
      'Bismillahi r-Rahmani r-Rahim.\nQul huwa Llahu ahad. Allahu s-Samad. Lam yalid wa lam yulad. Wa lam yakun lahu kufuwan ahad.',
    translation:
      'In the name of Allah, the Most Gracious, the Most Merciful.\nSay: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is begotten. And there is none comparable to Him.',
    reference: 'Quran 112 · Recite ×3',
  },
  {
    id: 'falaq',
    number: 113,
    title: 'Surah Al-Falaq',
    arabicTitle: 'سُورَةُ الْفَلَق',
    color: '#1565C0',
    arabic:
      'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ\n' +
      'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ ﴿١﴾ مِن شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِن شَرِّ ٱلنَّفَّـٰثَـٰتِ فِى ٱلْعُقَدِ ﴿٤﴾ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾',
    transliteration:
      'Bismillahi r-Rahmani r-Rahim.\nQul aAuthu bi-Rabbi l-falaq. Min sharri ma khalaq. Wa min sharri ghasiqin idha waqab. Wa min sharri n-naffathati fi l-uqad. Wa min sharri hasidin idha hasad.',
    translation:
      'In the name of Allah, the Most Gracious, the Most Merciful.\nSay: I seek refuge in the Lord of the daybreak, from the evil of what He has created, and from the evil of darkness when it settles, and from the evil of those who blow on knots, and from the evil of an envier when he envies.',
    reference: 'Quran 113 · Recite ×3',
  },
  {
    id: 'nas',
    number: 114,
    title: 'Surah An-Nas',
    arabicTitle: 'سُورَةُ النَّاس',
    color: '#00695C',
    arabic:
      'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ\n' +
      'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ ﴿١﴾ مَلِكِ ٱلنَّاسِ ﴿٢﴾ إِلَـٰهِ ٱلنَّاسِ ﴿٣﴾ مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ ﴿٤﴾ ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ ﴿٥﴾ مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ ﴿٦﴾',
    transliteration:
      'Bismillahi r-Rahmani r-Rahim.\nQul aAuthu bi-Rabbi n-nas. Maliki n-nas. Ilahi n-nas. Min sharri l-waswasi l-khannas. Alladhi yuwaswisu fi suduri n-nas. Mina l-jinnati wa n-nas.',
    translation:
      'In the name of Allah, the Most Gracious, the Most Merciful.\nSay: I seek refuge in the Lord of mankind, the King of mankind, the God of mankind, from the evil of the retreating whisperer who whispers into the hearts of mankind — from among the jinn and mankind.',
    reference: 'Quran 114 · Recite ×3',
  },
  {
    id: 'refuge-shaytan',
    number: null,
    title: 'Seeking Refuge from Shaytan',
    arabicTitle: 'الاسْتِعَاذَة',
    color: '#1565C0',
    arabic:
      'رَبِّ أَعُوذُ بِكَ مِنْ هَمَزَاتِ الشَّيَاطِينِ ﴿٩٧﴾ وَأَعُوذُ بِكَ رَبِّ أَن يَحْضُرُونِ ﴿٩٨﴾',
    transliteration:
      "Rabbi a'udhu bika min hamazati sh-shayatin. Wa a'udhu bika Rabbi an yahdurun.",
    translation:
      'My Lord, I seek refuge in You from the incitements of the devils. And I seek refuge with You, my Lord, lest they be present with me.',
    reference: 'Quran 23:97-98 · Recite ×3',
  },
  {
    id: 'created-in-vain',
    number: null,
    title: 'Affirmation of Allah\'s Sovereignty',
    arabicTitle: 'تَعَالَى اللَّهُ الْمَلِكُ الْحَقُّ',
    color: '#00695C',
    arabic:
      'أَفَحَسِبْتُمْ أَنَّمَا خَلَقْنَاكُمْ عَبَثًا وَأَنَّكُمْ إِلَيْنَا لَا تُرْجَعُونَ ﴿١١٥﴾ فَتَعَالَى اللَّهُ الْمَلِكُ الْحَقُّ ۖ لَا إِلَٰهَ إِلَّا هُوَ رَبُّ الْعَرْشِ الْكَرِيمِ ﴿١١٦﴾ وَمَن يَدْعُ مَعَ اللَّهِ إِلَٰهًا آخَرَ لَا بُرْهَانَ لَهُ بِهِ فَإِنَّمَا حِسَابُهُ عِندَ رَبِّهِ ۚ إِنَّهُ لَا يُفْلِحُ الْكَافِرُونَ ﴿١١٧﴾ وَقُل رَّبِّ اغْفِرْ وَارْحَمْ وَأَنتَ خَيْرُ الرَّاحِمِينَ ﴿١١٨﴾',
    transliteration:
      "Afa-hasibtum annama khalaqnakum abathan wa annakum ilayna la turja'un. Fata'ala Llahu l-Maliku l-Haqq, la ilaha illa Huwa Rabbu l-Arshi l-Karim. Wa man yadAu ma'a Llahi ilahan akhara la burhana lahu bihi fa-innama hisabuhu Inda Rabbih. Innahu la yuflihu l-kafirun. Wa qul Rabbi-ghfir wa-rham wa Anta khayru r-rahimin.",
    translation:
      'Did you then think that We created you uselessly and that you would not be returned to Us? So exalted is Allah, the Sovereign, the Truth; there is no deity except Him, Lord of the Noble Throne. And whoever invokes besides Allah another deity — there is no proof for him; indeed his account is only with his Lord. Indeed, the disbelievers will not succeed. And say: My Lord, forgive and have mercy, and You are the best of the merciful.',
    reference: 'Quran 23:115-118',
  },
  {
    id: 'tasbih-evening',
    number: null,
    title: 'Evening & Morning Glorification',
    arabicTitle: 'تَسْبِيحُ اللَّيْلِ وَالنَّهَار',
    color: '#E65100',
    arabic:
      'فَسُبْحَانَ اللَّهِ حِينَ تُمْسُونَ وَحِينَ تُصْبِحُونَ ﴿١٧﴾ وَلَهُ الْحَمْدُ فِي السَّمَاوَاتِ وَالْأَرْضِ وَعَشِيًّا وَحِينَ تُظْهِرُونَ ﴿١٨﴾ يُخْرِجُ الْحَيَّ مِنَ الْمَيِّتِ وَيُخْرِجُ الْمَيِّتَ مِنَ الْحَيِّ وَيُحْيِي الْأَرْضَ بَعْدَ مَوْتِهَا ۚ وَكَذَٰلِكَ تُخْرَجُونَ ﴿١٩﴾',
    transliteration:
      'Fa-subhana Llahi hina tumsuuna wa hina tusbihun. Wa lahu l-hamdu fi s-samawati wa l-ardi wa Ashiyyan wa hina tuzHirun. Yukhrijul-hayya mina l-mayyiti wa yukhrijul-mayyita mina l-hayyi wa yuhyi l-arda baAda mawtiha wa kadhalika tukhrajun.',
    translation:
      'So exalted is Allah when you reach the evening and when you reach the morning. And to Him is [due all] praise throughout the heavens and the earth. And [exalted is He] at night and when you are at noon. He brings the living out of the dead and brings the dead out of the living and brings to life the earth after its lifelessness. And thus will you be brought out.',
    reference: 'Quran 30:17-19',
  },
  {
    id: 'aoudhu-samii',
    number: null,
    title: 'Refuge from Shaytan — Expanded',
    arabicTitle: 'أَعُوذُ بِاللَّهِ السَّمِيع',
    color: '#B8860B',
    arabic:
      'أَعُوذُ بِاللَّهِ السَّمِيعِ الْعَلِيمِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
    transliteration:
      "A'udhu billahi s-Samii'i l-'Alimi mina sh-shaytani r-rajim.",
    translation:
      'I seek refuge in Allah the All-Hearing, the All-Knowing from the accursed devil.',
    reference: 'Recite ×3 — Al-Wird al-Latif',
  },
  {
    id: 'hashr-last',
    number: null,
    title: 'Last Verses of Al-Hashr',
    arabicTitle: 'خَوَاتِيمُ سُورَةِ الْحَشْر',
    color: '#3949AB',
    arabic:
      'لَوْ أَنزَلْنَا هَٰذَا الْقُرْآنَ عَلَىٰ جَبَلٍ لَّرَأَيْتَهُ خَاشِعًا مُّتَصَدِّعًا مِّنْ خَشْيَةِ اللَّهِ ۚ وَتِلْكَ الْأَمْثَالُ نَضْرِبُهَا لِلنَّاسِ لَعَلَّهُمْ يَتَفَكَّرُونَ ﴿٢١﴾ هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ ۖ عَالِمُ الْغَيْبِ وَالشَّهَادَةِ ۖ هُوَ الرَّحْمَٰنُ الرَّحِيمُ ﴿٢٢﴾ هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ الْمَلِكُ الْقُدُّوسُ السَّلَامُ الْمُؤْمِنُ الْمُهَيْمِنُ الْعَزِيزُ الْجَبَّارُ الْمُتَكَبِّرُ ۚ سُبْحَانَ اللَّهِ عَمَّا يُشْرِكُونَ ﴿٢٣﴾ هُوَ اللَّهُ الْخَالِقُ الْبَارِئُ الْمُصَوِّرُ ۖ لَهُ الْأَسْمَاءُ الْحُسْنَىٰ ۚ يُسَبِّحُ لَهُ مَا فِي السَّمَاوَاتِ وَالْأَرْضِ ۖ وَهُوَ الْعَزِيزُ الْحَكِيمُ ﴿٢٤﴾',
    transliteration:
      'Law anzalna hadha l-Qurana Ala jabalin la-raAytahu khashiAan mutasaddian min khashyati Llah. Wa tilka l-amthalu nadribuha li-n-nasi laAllahum yatafakkarun. Huwa Llahu lladhi la ilaha illa Huw. Alimu l-ghaybi wa sh-shahadah. Huwa r-Rahmanu r-Rahim. Huwa Llahu lladhi la ilaha illa Huwa l-Maliku l-Quddusi s-Salamu l-Muuminu l-Muhaymin l-Azizu l-Jabbaru l-Mutakabbir. SubhanAllahi Amma yushrikun. Huwa Llahu l-Khaliqu l-Bariuu l-Musawwir. Lahu l-asmauu l-husna. Yusabbihu lahu ma fi s-samawati wa l-ard. Wa Huwa l-Azizu l-Hakim.',
    translation:
      'Had We sent down this Quran upon a mountain, you would have seen it humbled and split apart from fear of Allah. And these examples We present to the people that perhaps they will give thought. He is Allah, other than whom there is no deity — Knower of the unseen and the witnessed. He is the Most Gracious, the Most Merciful. He is Allah, other than whom there is no deity — the Sovereign, the Pure, the Perfection, the Bestower of Faith, the Overseer, the Almighty, the Compeller, the Superior. Exalted is Allah above whatever they associate with Him. He is Allah, the Creator, the Inventor, the Fashioner; to Him belong the best names. Whatever is in the heavens and earth is exalting Him. And He is the Almighty, the Wise.',
    reference: 'Quran 59:21-24',
  },
  {
    id: 'salaam-nuh',
    number: null,
    title: 'Peace upon Nuh (AS)',
    arabicTitle: 'سَلَامٌ عَلَى نُوح',
    color: '#1B8A5A',
    arabic:
      'سَلَامٌ عَلَىٰ نُوحٍ فِي الْعَالَمِينَ ﴿٧٩﴾ إِنَّا كَذَٰلِكَ نَجْزِي الْمُحْسِنِينَ ﴿٨٠﴾ إِنَّهُ مِنْ عِبَادِنَا الْمُؤْمِنِينَ ﴿٨١﴾',
    transliteration:
      'Salamun Ala Nuhin fi l-Aalamin. Inna kadhalika najzi l-muhsinin. Innahu min Ibadina l-muminin.',
    translation:
      'Peace upon Noah among the worlds. Indeed, We thus reward the doers of good. Indeed, he was of Our believing servants.',
    reference: 'Quran 37:79-81',
  },
  {
    id: 'kalimat-allah',
    number: null,
    title: 'Perfect Words of Allah',
    arabicTitle: 'كَلِمَاتُ اللَّهِ التَّامَّات',
    color: '#6A1B9A',
    arabic:
      'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِن شَرِّ مَا خَلَقَ',
    transliteration:
      "A'udhu bi-kalimati Llahi t-tammati min sharri ma khalaq.",
    translation:
      'I seek refuge in the perfect words of Allah from the evil of what He has created.',
    reference: 'Muslim 2709 · Recite ×3',
  },
  {
    id: 'bismillah-protection',
    number: null,
    title: 'Bismillah Protection',
    arabicTitle: 'بِسْمِ اللَّهِ الحِفْظ',
    color: '#00695C',
    count: '×3',
    arabic:
      'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration:
      "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wala fis-sama'i wahuwa s-sami'ul-Alim.",
    translation:
      'In the name of Allah with whose name nothing in the earth or heaven can cause harm, and He is the All-Hearing, All-Knowing.',
    reference: 'Abu Dawud 5088 · Recite ×3 — nothing shall harm the one who says this',
  },
  {
    id: 'morning-blessing',
    number: null,
    title: 'Morning Blessing & Protection',
    arabicTitle: 'اللَّهُمَّ إِنِّي أَصْبَحْتُ',
    color: '#1B8A5A',
    count: '×3',
    arabic:
      'اللَّهُمَّ إِنِّي أَصْبَحْتُ مِنْكَ فِي نِعْمَةٍ وَعَافِيَةٍ وَسِتْرٍ، فَأَتِمَّ نِعْمَتَكَ عَلَيَّ وَعَافِيَتَكَ وَسِتْرَكَ فِي الدُّنْيَا وَالْآخِرَةِ',
    transliteration:
      "Allahumma inni asbahtu minka fi ni'matin wa 'afiyatin wa sitr, fa-atimma ni'mataka 'alayya wa 'afiyataka wa sitraka fi d-dunya wa l-akhirah.",
    translation:
      'O Allah, as morning arrives I remain in Your blessings, wellbeing and Covering (Protection), so make complete Your blessings, wellbeing and Covering (Protection) upon me in this world and the hereafter.',
    reference: 'Al-Wird al-Latif · Recite ×3',
  },
  {
    id: 'witness-throne',
    number: null,
    title: 'Witness of the Throne Bearers',
    arabicTitle: 'اللَّهُمَّ إِنِّي أُشْهِدُكَ',
    color: '#3949AB',
    count: '×4',
    arabic:
      'اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ سَيِّدَنَا مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ',
    transliteration:
      "Allahumma inni asbahtu ushhiduka wa ushhidu hamalata 'arshika wa mala'ikataka wa jami'a khalqika annaka Anta Llahu la ilaha illa Anta wahdaka la sharika lak, wa anna Sayyidana Muhammadan 'abduka wa rasuluk.",
    translation:
      'O Allah, as morning arrives, I bear witness before You and I bear witness before the Carriers of Your Throne, and Your Angels, and Your entire creation, that You are Allah — there is no God except You Alone with no partners — and that our Master Muhammad \u{FDBF} is Your servant and Your Messenger.',
    reference: 'Al-Wird al-Latif · Recite ×4',
  },
  {
    id: 'hamd-yuwafi',
    number: null,
    title: 'Praise Commensurate with His Bounties',
    arabicTitle: 'حَمْدًا يُوَافِي نِعَمَهُ',
    color: '#E65100',
    count: '×3',
    arabic:
      'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ حَمْدًا يُوَافِي نِعَمَهُ وَيُكَافِئُ مَزِيدَهُ',
    transliteration:
      "Al-hamdu lillahi Rabbi l-'alamin, hamdan yuwa fi ni'amahu wa yukafi'u mazidah.",
    translation:
      'All praise belongs to Allah, Lord of the worlds — praise that is commensurate with His bounties and equal to His abundance.',
    reference: 'Al-Wird al-Latif · Recite ×3',
  },
  {
    id: 'amantu-billah',
    number: null,
    title: "Declaration of Faith — Urwat al-Wuthqa",
    arabicTitle: 'آمَنْتُ بِاللَّهِ الْعَظِيمِ',
    color: '#6A1B9A',
    count: '×3',
    arabic:
      'آمَنْتُ بِاللَّهِ الْعَظِيمِ وَكَفَرْتُ بِالْجِبْتِ وَالطَّاغُوتِ وَاسْتَمْسَكْتُ بِالْعُرْوَةِ الْوُثْقَى لَا انْفِصَامَ لَهَا وَاللَّهُ سَمِيعٌ عَلِيمٌ',
    transliteration:
      "Amantu billahi l-'Azim, wa kafarthu bi-l-jibti wa t-taghut, wa-stamsaktu bi-l-'urwati l-wuthqa la-nfisama laha wa Llahu Sami'un 'Alim.",
    translation:
      'I believe in Allah the Great, and I denounce the idols and the sorcerers, and I hold tightly to the strongest handhold which shall never break, and Allah is All-Hearing, All-Knowing.',
    reference: 'Al-Wird al-Latif · Quran 2:256 · Recite ×3',
  },
  {
    id: 'raditu-billah',
    number: null,
    title: 'Contentment with Allah, Islam and the Prophet',
    arabicTitle: 'رَضِيتُ بِاللَّهِ رَبًّا',
    color: '#1565C0',
    count: '×3',
    arabic:
      'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِسَيِّدِنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَآلِهِ وَسَلَّمَ نَبِيًّا وَرَسُولًا',
    transliteration:
      "Raditu billahi Rabban, wa bi-l-Islami dinan, wa bi-Sayyidina Muhammadin salla Llahu 'alayhi wa alihi wa sallama Nabiyyan wa Rasulan.",
    translation:
      'I am content with Allah as my Lord, Islam as my Religion, and our Master Muhammad (peace be upon him) as the Prophet and Messenger of Allah.',
    reference: 'Tirmidhi 3389 · Recite ×3 — guaranteed entry to Paradise',
  },
  {
    id: 'hasbiyallah',
    number: null,
    title: 'Allah is Sufficient — Tawakkul',
    arabicTitle: 'حَسْبِيَ اللَّهُ',
    color: '#B8860B',
    count: '×7',
    arabic:
      'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    transliteration:
      "Hasbiya Llahu la ilaha illa Huwa, 'alayhi tawakkaltu wa Huwa Rabbu l-'arshi l-'azim.",
    translation:
      'Allah is sufficient for me. There is no God but He. In Him I place my trust, and He is the Lord of the Great Throne.',
    reference: 'Quran 9:129 · Abu Dawud 5081 · Recite ×7 morning and evening',
  },
  {
    id: 'salawat-wird',
    number: null,
    title: 'Salawat on the Prophet',
    arabicTitle: 'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا',
    color: '#1B8A5A',
    count: '×10',
    arabic:
      'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ وَآلِهِ وَصَحْبِهِ وَسَلِّمْ',
    transliteration:
      "Allahumma salli 'ala Sayyidina Muhammadin wa alihi wa sahbihi wa sallim.",
    translation:
      'O Allah, send peace and blessings upon our Master Muhammad, His pure Family and blessed Companions.',
    reference: 'Al-Wird al-Latif · Recite ×10',
  },
  {
    id: 'fujaat-khayr',
    number: null,
    title: 'Seeking Sudden Good',
    arabicTitle: 'فُجَاءَةُ الْخَيْر',
    color: '#00695C',
    count: '×1',
    arabic:
      'اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فُجَاءَةِ الْخَيْرِ وَأَعُوذُ بِكَ مِنْ فُجَاءَةِ الشَّرِّ',
    transliteration:
      "Allahumma inni as'aluka min fuja'ati l-khayri wa a'udhu bika min fuja'ati sh-sharr.",
    translation:
      'O Allah, grant me sudden good, and I seek refuge in You from sudden evil.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'sayyid-istighfar-wird',
    number: null,
    title: 'Sayyid al-Istighfar',
    arabicTitle: 'سَيِّدُ الاسْتِغْفَار',
    color: '#3949AB',
    count: '×1',
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration:
      "Allahumma Anta Rabbi la ilaha illa Anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika masta-ta'tu, abu'u laka bi-ni'matika 'alayya wa abu'u bi-dhanbi, fa-ghfir li, fa-innahu la yaghfiru dh-dhunuba illa Ant.",
    translation:
      'O Allah, You are my Lord. None has the right to be worshipped but You. You created me and I am Your servant. I abide to Your covenant and promise as best I can. I take refuge in You from the evil of what I have committed. I acknowledge Your favour upon me and I acknowledge my sin, so forgive me, for verily none can forgive sins except You.',
    reference: 'Bukhari 6306 — best dua for seeking forgiveness',
  },
  {
    id: 'tawakkul-arsh',
    number: null,
    title: 'Tawakkul — Trust in Allah',
    arabicTitle: 'أَنْتَ رَبُّ الْعَرْشِ الْعَظِيم',
    color: '#6A1B9A',
    count: '×1',
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ عَلَيْكَ تَوَكَّلْتُ وَأَنْتَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    transliteration:
      "Allahumma Anta Rabbi la ilaha illa Anta, 'alayka tawakkaltu wa Anta Rabbu l-'arshi l-'azim.",
    translation:
      'O Allah, You are my Lord. There is no God but You. Upon You I place my trust, and You are the Lord of the Great Throne.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'masha-allah',
    number: null,
    title: 'Ma Sha Allah — No Might Except with Allah',
    arabicTitle: 'مَا شَاءَ اللَّهُ كَانَ',
    color: '#E65100',
    count: '×1',
    arabic:
      'مَا شَاءَ اللَّهُ كَانَ وَمَا لَمْ يَشَأْ لَمْ يَكُنْ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ أَعْلَمُ أَنَّ اللَّهَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ وَأَنَّ اللَّهَ قَدْ أَحَاطَ بِكُلِّ شَيْءٍ عِلْمًا',
    transliteration:
      "Ma sha'a Llahu kana wa ma lam yasha' lam yakun, wa la hawla wa la quwwata illa billahi l-'Aliyyi l-'Azim. A'lamu anna Llaha 'ala kulli shay'in qadir, wa anna Llaha qad ahata bi-kulli shay'in 'ilma.",
    translation:
      'Whatever Allah has willed comes to be, and what He has not willed does not. There is no might and no power except with Allah, the Most High, the Most Great. I know that Allah has power over all things and that Allah encompasses everything with His knowledge.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'refuge-nafs',
    number: null,
    title: 'Refuge from the Evil of the Self',
    arabicTitle: 'شَرِّ نَفْسِي',
    color: '#1565C0',
    count: '×1',
    arabic:
      'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ كُلِّ دَابَّةٍ أَنْتَ آخِذٌ بِنَاصِيَتِهَا، إِنَّ رَبِّي عَلَى صِرَاطٍ مُسْتَقِيمٍ',
    transliteration:
      "Allahumma inni a'udhu bika min sharri nafsi, wa min sharri kulli dabbatin Anta akhidhun bi-nasiyatiha, inna Rabbi 'ala siratin mustaqim.",
    translation:
      'O Allah, I seek Your protection from the evil of myself, and from the evil of every creature You have taken by the forelock. Truly, my Lord is on the Straight Path.',
    reference: 'Al-Wird al-Latif · Hud 11:56',
  },
  {
    id: 'ya-hayyu-qayyum',
    number: null,
    title: 'Ya Hayyu Ya Qayyum — Relief and Ease',
    arabicTitle: 'يَاحَيُّ يَاقَيُّوم',
    color: '#B8860B',
    count: '×1',
    arabic:
      'يَاحَيُّ يَاقَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، وَمِنْ عَذَابِكَ أَسْتَجِيرُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
    transliteration:
      "Ya Hayyu Ya Qayyum, bi-rahmatika astaghith, wa min 'adhabika astajir, aslih li sha'ni kullahu, wa la takilni ila nafsi tarfata 'ayn.",
    translation:
      'O Ever-Living, O Sustaining — in Your mercy I seek relief, and from Your punishment I seek protection. Make easy all my affairs, and do not leave me to myself even for the blink of an eye.',
    reference: 'Al-Hakim 1/545 · Al-Wird al-Latif',
  },
  {
    id: 'refuge-anxiety',
    number: null,
    title: 'Refuge from Anxiety & Grief',
    arabicTitle: 'أَعُوذُ بِكَ مِنَ الْهَمِّ',
    color: '#1B8A5A',
    count: '×1',
    arabic:
      'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ',
    transliteration:
      "Allahumma inni a'udhu bika mina l-hammi wa l-hazan, wa a'udhu bika mina l-'ajzi wa l-kasal, wa a'udhu bika mina l-jubni wa l-bukhl, wa a'udhu bika min ghalabati d-dayni wa qahri r-rijal.",
    translation:
      'O Allah! I seek refuge in You from anxiety and grief, and I seek refuge in You from weakness and laziness, and I seek refuge in You from cowardice and miserliness, and I seek refuge in You from being overwhelmed by debt and the cruelty of men.',
    reference: 'Bukhari 6369 · Al-Wird al-Latif',
  },
  {
    id: 'afiyah-dunya-akhirah',
    number: null,
    title: 'Wellbeing in Both Worlds',
    arabicTitle: 'الْعَافِيَةُ فِي الدُّنْيَا وَالْآخِرَة',
    color: '#3949AB',
    count: '×1',
    arabic:
      'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
    transliteration:
      "Allahumma inni as'aluka l-'afiyata fi d-dunya wa l-akhirah.",
    translation:
      'O Allah, I seek from You wellbeing in this world and the Hereafter.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'afwu-afiyah-muafat',
    number: null,
    title: 'Forgiveness & Everlasting Safety',
    arabicTitle: 'الْعَفْوُ وَالْعَافِيَةُ وَالْمُعَافَاة',
    color: '#6A1B9A',
    count: '×1',
    arabic:
      'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ وَالْمُعَافَاةَ الدَّائِمَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي',
    transliteration:
      "Allahumma inni as'aluka l-'afwa wa l-'afiyata wa l-mu'afata d-da'imata fi dini wa dunyaya wa ahli wa mali.",
    translation:
      'O Allah, I seek from You forgiveness, wellbeing and everlasting safety in my religion, this world, for my family and my wealth.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'stur-awrat',
    number: null,
    title: 'Cover My Shame & Ease My Fears',
    arabicTitle: 'اسْتُرْ عَوْرَاتِي',
    color: '#E65100',
    count: '×1',
    arabic:
      'اللَّهُمَّ اسْتُرْ عَوْرَاتِي، وَآمِنْ رَوْعَاتِي',
    transliteration:
      "Allahumma-stur 'awrati, wa amin raw'ati.",
    translation:
      'O Allah! Cover my shame and grant me relief from fears.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'ihfazni-jihat',
    number: null,
    title: 'Protection from All Directions',
    arabicTitle: 'احْفَظْنِي مِنْ بَيْنِ يَدَيَّ',
    color: '#1565C0',
    count: '×1',
    arabic:
      'اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي',
    transliteration:
      "Allahumma-hfazni min bayni yadayya wa min khalfi wa 'an yamini wa 'an shimali wa min fawqi, wa a'udhu bi-'azamatika an ughtala min tahti.",
    translation:
      'O Allah! Grant me safety from the front of me and from behind me, and from my right and from my left, and from above me, and I seek refuge in Your Greatness from unexpected harm from beneath me.',
    reference: 'Abu Dawud 5074 · Al-Wird al-Latif',
  },
  {
    id: 'anta-khalaqtani',
    number: null,
    title: 'Allah Guides, Provides & Gives Life',
    arabicTitle: 'أَنْتَ خَلَقْتَنِي',
    color: '#B8860B',
    count: '×1',
    arabic:
      'اللَّهُمَّ أَنْتَ خَلَقْتَنِي وَأَنْتَ تَهْدِينِي، وَأَنْتَ تُطْعِمُنِي، وَأَنْتَ تَسْقِينِي، وَأَنْتَ تُمِيتُنِي، وَأَنْتَ تُحْيِينِي',
    transliteration:
      'Allahumma Anta khalaqtani wa Anta tahdini, wa Anta tutimuni, wa Anta tasqini, wa Anta tumituni, wa Anta tuhyini.',
    translation:
      'O Allah, You created me and You guide me, and You provide me with food and You provide me with drink, and You will cause me to die and You will give me life again.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'fitrah-islam',
    number: null,
    title: 'Morning upon the Fitrah of Islam',
    arabicTitle: 'أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَام',
    color: '#1B8A5A',
    count: '×1',
    arabic:
      'أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَآلِهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
    transliteration:
      "Asbahna 'ala fitrati l-Islam, wa 'ala kalimati l-ikhlas, wa 'ala dini Nabiyyina Muhammadin salla Llahu 'alayhi wa alihi wa sallam, wa 'ala millati Abina Ibrahima hanifan musliman wa ma kana mina l-mushrikin.",
    translation:
      'This morning we have risen upon the natural disposition of Islam, and on the Words of Sincerity, and on the religion of our Prophet Muhammad (peace be upon him and his Family), and on the creed of our fore-father (Prophet) Ibrahim who was upright, a Muslim, and not an idolater.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'bika-asbahna',
    number: null,
    title: 'By You We Rise & By You We Set',
    arabicTitle: 'بِكَ أَصْبَحْنَا',
    color: '#3949AB',
    count: '×1',
    arabic:
      'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا وَبِكَ نَمُوتُ، وَعَلَيْكَ تَوَكَّلْنَا وَإِلَيْكَ النُّشُورُ وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    transliteration:
      "Allahumma bika asbahna wa bika amsayna, wa bika nahya wa bika namutu, wa 'alayka tawakkalna wa ilayka n-nushur, wa asbahal-mulku lillahi wa l-hamdu lillahi Rabbi l-Alamin.",
    translation:
      'O Allah! By You we rise and by You we set, by You we live and by You we die. Upon You we rely, and to You is the final return. Morning is upon us and all sovereignty belongs to Allah. All Praise belongs to Allah, Lord of the worlds.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'khayra-yawm',
    number: null,
    title: 'Good of This Day',
    arabicTitle: 'خَيْرُ هَذَا الْيَوم',
    color: '#6A1B9A',
    count: '×1',
    arabic:
      'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ فَتْحَهُ وَنَصْرَهُ وَنُورَهُ وَبَرَكَتَهُ وَهُدَاهُ',
    transliteration:
      "Allahumma inni as'aluka khayra hadha l-yawmi fatHahu wa nasrahu wa nurahu wa barakatahu wa hudah.",
    translation:
      'O Allah! I ask of You the good of this day — its openings, its victories, its light, its blessings and right guidance.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'khayra-yawm-wa-sharr',
    number: null,
    title: 'Good of This Day & Refuge from its Evil',
    arabicTitle: 'خَيْرَ هَذَا الْيَوْمِ وَشَرِّه',
    color: '#E65100',
    count: '×1',
    arabic:
      'اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ، وَخَيْرَ مَا فِيهِ، وَخَيْرَ مَا قَبْلَهُ، وَخَيْرَ مَا بَعْدَهُ وَأَعُوذُ بِكَ مِنْ شَرِّ هَذَا الْيَوْمِ، وَشَرِّ مَا فِيهِ، وَشَرِّ مَا أَقْبَلَهُ، وَشَرِّ مَا بَعْدَهُ',
    transliteration:
      "Allahumma inni as'aluka khayra hadha l-yawmi wa khayra ma fihi, wa khayra ma qablahu, wa khayra ma badahu, wa a'udhu bika min sharri hadha l-yawmi wa sharri ma fihi, wa sharri ma aqbalahu, wa sharri ma badahu.",
    translation:
      'O Allah! I ask You for the good of this day and the good of what is in it, and the best of what came before it and the best of what comes after it; and I seek refuge in You from the evil of this day and the evil of what is in it, and the evil of what came before it and the evil of what comes after it.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'maa-asbaha-nimah',
    number: null,
    title: 'All Blessings Are from You Alone',
    arabicTitle: 'مَا أَصْبَحَ بِي مِنْ نِعْمَة',
    color: '#00695C',
    count: '×1',
    arabic:
      'اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَاشَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ عَلَى ذَلِكَ',
    transliteration:
      'Allahumma ma asbaha bi min nimatin aw bi-ahadin min khalqika fa-minka wahdaka la sharika lak, fa-laka l-hamdu wa laka sh-shukru Ala dhalik.',
    translation:
      'O Allah, whatever blessing I have or any of Your creation have, it is from You alone with no partners. To You belongs all praise and to You all thanks is due.',
    reference: 'Abu Dawud 5073 · Al-Wird al-Latif',
  },
  {
    id: 'subhan-adad-khalq',
    number: null,
    title: 'SubhanAllah — Equal to His Creation',
    arabicTitle: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِه',
    color: '#1B8A5A',
    count: '×3',
    arabic:
      'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَاءَ نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ',
    transliteration:
      "SubHana Llahi wa bi-hamdihi, Adada khalqihi wa rida'a nafsihi, wa zinata 'arshihi, wa midada kalimatihi.",
    translation:
      'Transcendent is Allah and All Praise belongs to Him — equal to the number of His creation, His good pleasure, the weight of His Throne, and the amount of His words.',
    reference: 'Muslim 2726 · Recite ×3 — Al-Wird al-Latif',
  },
  {
    id: 'subhan-azim-adad',
    number: null,
    title: 'SubhanAllah al-Azim — Equal to His Creation',
    arabicTitle: 'سُبْحَانَ اللَّهِ الْعَظِيمِ وَبِحَمْدِه',
    color: '#3949AB',
    count: '×3',
    arabic:
      'سُبْحَانَ اللَّهِ الْعَظِيمِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَاءَ نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ',
    transliteration:
      "SubHana Llahi l-Azimi wa bi-hamdihi, Adada khalqihi wa rida'a nafsihi, wa zinata 'arshihi, wa midada kalimatihi.",
    translation:
      'Transcendent is Allah the Almighty — All Praise belongs to Him, equal to the number of His creation, His good pleasure, the weight of His Throne, and the amount of His words.',
    reference: 'Al-Wird al-Latif · Recite ×3',
  },
  {
    id: 'subhan-adad-sama-ard',
    number: null,
    title: 'Tasbih Equal to All Creation',
    arabicTitle: 'سُبْحَانَ اللَّهِ عَدَدَ مَا خَلَق',
    color: '#6A1B9A',
    count: '×1',
    arabic:
      'سُبْحَانَ اللَّهِ عَدَدَ مَا خَلَقَ فِي السَّمَاءِ، سُبْحَانَ اللَّهِ عَدَدَ مَا خَلَقَ فِي الْأَرْضِ، سُبْحَانَ اللَّهِ عَدَدَ مَا بَيْنَ ذَلِكَ، سُبْحَانَ اللَّهِ عَدَدَ مَا هُوَ خَالِقٌ' +
      '\n\nالْحَمْدُ لِلَّهِ عَدَدَ مَا خَلَقَ فِي السَّمَاءِ، الْحَمْدُ لِلَّهِ عَدَدَ مَا خَلَقَ فِي الْأَرْضِ، الْحَمْدُ لِلَّهِ عَدَدَ مَا بَيْنَ ذَلِكَ، الْحَمْدُ لِلَّهِ عَدَدَ مَا هُوَ خَالِقٌ' +
      '\n\nلَا إِلَهَ إِلَّا اللَّهُ عَدَدَ مَا خَلَقَ فِي السَّمَاءِ، لَا إِلَهَ إِلَّا اللَّهُ عَدَدَ مَا خَلَقَ فِي الْأَرْضِ، لَا إِلَهَ إِلَّا اللَّهُ عَدَدَ مَا بَيْنَ ذَلِكَ، لَا إِلَهَ إِلَّا اللَّهُ عَدَدَ مَا هُوَ خَالِقٌ' +
      '\n\nاللَّهُ أَكْبَرُ عَدَدَ مَا خَلَقَ فِي السَّمَاءِ، اللَّهُ أَكْبَرُ عَدَدَ مَا خَلَقَ فِي الْأَرْضِ، اللَّهُ أَكْبَرُ عَدَدَ مَا بَيْنَ ذَلِكَ، اللَّهُ أَكْبَرُ عَدَدَ مَا هُوَ خَالِقٌ',
    transliteration:
      "SubHana Llahi Adada ma khalaqa fi s-sama', SubHana Llahi Adada ma khalaqa fi l-ard, SubHana Llahi Adada ma bayna dhalik, SubHana Llahi Adada ma Huwa khaliq.\n\nAl-hamdu lillahi Adada ma khalaqa fi s-sama', Al-hamdu lillahi Adada ma khalaqa fi l-ard, Al-hamdu lillahi Adada ma bayna dhalik, Al-hamdu lillahi Adada ma Huwa khaliq.\n\nLa ilaha illa Llahu Adada ma khalaqa fi s-sama', La ilaha illa Llahu Adada ma khalaqa fi l-ard, La ilaha illa Llahu Adada ma bayna dhalik, La ilaha illa Llahu Adada ma Huwa khaliq.\n\nAllahu akbaru Adada ma khalaqa fi s-sama', Allahu akbaru Adada ma khalaqa fi l-ard, Allahu akbaru Adada ma bayna dhalik, Allahu akbaru Adada ma Huwa khaliq.",
    translation:
      'SubhanAllah: equal to what He created in the Heavens / on earth / between them / and all He has created.\n\nAlhamdulillah: equal to what He created in the Heavens / on earth / between them / and all He has created.\n\nLa ilaha illa Allah: equal to what He created in the Heavens / on earth / between them / and all He has created.\n\nAllahu Akbar: equal to what He created in the Heavens / on earth / between them / and all He has created.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'la-hawla-adad',
    number: null,
    title: 'La Hawla — Equal to All Creation',
    arabicTitle: 'لَا حَوْلَ وَلَا قُوَّة — عَدَدَ الْخَلْق',
    color: '#B8860B',
    count: '×1',
    arabic:
      'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ عَدَدَ مَا خَلَقَ فِي السَّمَاءِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ عَدَدَ مَا خَلَقَ فِي الْأَرْضِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ عَدَدَ مَا بَيْنَ ذَلِكَ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ عَدَدَ مَا هُوَ خَالِقٌ',
    transliteration:
      "La hawla wa la quwwata illa billahi l-Aliyyi l-Azim, Adada ma khalaqa fi s-sama'. La hawla wa la quwwata illa billahi l-Aliyyi l-Azim, Adada ma khalaqa fi l-ard. La hawla wa la quwwata illa billahi l-Aliyyi l-Azim, Adada ma bayna dhalik. La hawla wa la quwwata illa billahi l-Aliyyi l-Azim, Adada ma Huwa khaliq.",
    translation:
      'There is no might nor power except with Allah, the Most High, the Almighty — equal to what He created in the Heavens; equal to what He created on earth; equal to what is between them; equal to all that He has Created.',
    reference: 'Al-Wird al-Latif',
  },
  {
    id: 'la-ilaha-adad-dharrah',
    number: null,
    title: 'La Ilaha illa Allah — Final Closing Dhikr',
    arabicTitle: 'لَا إِلَهَ إِلَّا اللَّهُ — خَاتِمَة',
    color: '#1B8A5A',
    count: '×3',
    arabic:
      'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَاشَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٍ عَدَدَ كُلِّ ذَرَّةٍ أَلْفَ مَرَّةٍ',
    transliteration:
      "La ilaha illa Llahu wahdahu la sharika lah, lahu l-mulku wa lahu l-hamdu, yuhyi wa yumitu wa Huwa Ala kulli shay'in qadir, Adada kulli dharratin alfa marrah.",
    translation:
      'There is no God except Allah, One without partner. All control and praise belong to Him. He gives life and death, and He has power over all things — equal to every grain a thousand times over.',
    reference: 'Al-Wird al-Latif · Recite ×3 — closing dhikr of the Wird',
  },
];

export function WirdAlLatifScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  const N = nightMode ? NIGHT : null;
  const [rows, setRows] = React.useState<AdhkarRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [urduById, setUrduById] = React.useState<Record<string, boolean>>({});
  const scrollRef = React.useRef<ScrollView>(null);
  const cardYRefs = React.useRef<Record<string, number>>({});

  React.useEffect(() => {
    fetchAdhkarForPrayerTime('after-fajr').then(all => {
      // Filter only Wird al-Latif group
      const wird = all.filter(r => r.group_name === 'Wird al-Latif');
      // Fallback to hardcoded if DB returned nothing
      if (wird.length === 0) {
        // Use hardcoded WIRD_SURAHS as AdhkarRow-compatible objects
        const mapped: AdhkarRow[] = WIRD_SURAHS.map((s, i) => ({
          id: s.id,
          prayer_time: 'after-fajr',
          title: s.title,
          arabic_title: s.arabicTitle,
          arabic: s.arabic,
          transliteration: s.transliteration,
          translation: s.translation,
          reference: s.reference,
          count: (s as any).count ?? '×3',
          display_order: (i + 1) * 10,
          is_active: true,
          sections: null,
          group_name: 'Wird al-Latif',
          group_order: 100,
          description: null,
        }));
        setRows(mapped);
      } else {
        setRows(wird);
      }
      setLoading(false);
    });
  }, []);

  const accent = '#6A1B9A';

  const handleToggle = (id: string) => {
    const isOpening = expandedId !== id;
    setExpandedId(isOpening ? id : null);
    if (isOpening) {
      setTimeout(() => {
        const y = cardYRefs.current[id];
        if (y !== undefined) {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
        }
      }, 80);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: 24, gap: Spacing.sm }}
      >
        {/* Info band */}
        <View style={[wirdStyles.infoBand, N && { backgroundColor: '#6A1B9A15', borderColor: '#6A1B9A30' }]}>
          <MaterialIcons name="auto-awesome" size={18} color={accent} />
          <Text style={[wirdStyles.infoText, N && { color: N.textSub }]}>
            Recite each Surah three times. The Prophet ﷺ said these three surahs suffice as protection every morning and evening.
          </Text>
        </View>

        <View style={[wirdStyles.refBand, N && { backgroundColor: N.surface, borderColor: N.border }]}>
          <MaterialIcons name="info-outline" size={14} color={N ? N.textMuted : Colors.textSubtle} />
          <Text style={[wirdStyles.refText, N && { color: N.textMuted }]}>
            [Abu Dawud 5082, Tirmidhi 3575 — Hadith Hasan]
          </Text>
        </View>

        {loading ? (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ fontSize: 13, color: N ? N.textMuted : Colors.textSubtle }}>Loading…</Text>
          </View>
        ) : rows.map((item) => {
          const isOpen = expandedId === item.id;
          const itemColor = accent;
          const urduTranslation = resolveAdhkarUrduTranslation(item);
          const hasUrduTranslation = urduTranslation.length > 0;
          const showUrdu = !!urduById[item.id] && hasUrduTranslation;
          const selectedTranslation = showUrdu ? urduTranslation : item.translation;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                wirdStyles.surahCard,
                N && { backgroundColor: N.surface, borderColor: N.border },
                isOpen && { borderColor: itemColor },
              ]}
              onPress={() => handleToggle(item.id)}
              activeOpacity={0.85}
              onLayout={(e) => { cardYRefs.current[item.id] = e.nativeEvent.layout.y; }}
            >
              <View style={wirdStyles.cardHeader}>
                <View style={[wirdStyles.numBadge, { backgroundColor: itemColor + '22' }]}>
                  <MaterialIcons name="auto-awesome" size={18} color={itemColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[wirdStyles.surahTitle, N && { color: N.text }, isOpen && { color: itemColor }]}>
                    {item.title}
                  </Text>
                  {item.arabic_title ? (
                    <Text style={[wirdStyles.arabicTitle, { color: itemColor }]}>{item.arabic_title}</Text>
                  ) : null}
                </View>
                {item.count ? (
                  <View style={[wirdStyles.countPill, { backgroundColor: itemColor + '22', borderColor: itemColor + '44' }]}>
                    <Text style={[wirdStyles.countText, { color: itemColor }]}>×{item.count}</Text>
                  </View>
                ) : null}
                <MaterialIcons
                  name={isOpen ? 'expand-less' : 'expand-more'}
                  size={22}
                  color={N ? N.textMuted : Colors.textSubtle}
                />
              </View>

              {isOpen ? (
                <View style={wirdStyles.expandedBody}>
                  <View style={[wirdStyles.arabicBox, { backgroundColor: itemColor + '10', borderColor: itemColor + '30', marginBottom: 14 }]}>
                    <Text style={[wirdStyles.arabicText, N && { color: N.text }]}>
                      {item.arabic}
                    </Text>
                  </View>
                  {item.transliteration ? (
                    <Text style={[wirdStyles.translit, { marginBottom: 8 }, N && { color: N.textSub }]}>{item.transliteration}</Text>
                  ) : null}
                  <View style={wirdStyles.translationToggleRow}>
                    <TouchableOpacity
                      style={[
                        wirdStyles.translationToggleBtn,
                        { borderColor: itemColor + '88' },
                        showUrdu && { backgroundColor: itemColor + '22', borderColor: itemColor },
                        !hasUrduTranslation && { opacity: 0.55 },
                      ]}
                      onPress={() => {
                        if (!hasUrduTranslation) return;
                        setUrduById(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[wirdStyles.translationToggleText, { color: itemColor }]}> 
                        {hasUrduTranslation ? 'Urdu' : 'Urdu (N/A)'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {selectedTranslation ? (
                    <Text
                      style={[
                        wirdStyles.translation,
                        { marginBottom: item.reference ? 10 : 0 },
                        N && { color: N.text },
                        showUrdu && wirdStyles.translationUrdu,
                      ]}
                    >
                      {selectedTranslation}
                    </Text>
                  ) : null}
                  {item.reference ? (
                    <View style={[wirdStyles.refRow, { paddingTop: 6, borderTopWidth: 1, borderTopColor: N ? N.border : Colors.border + '80' }]}>
                      <MaterialIcons name="info-outline" size={11} color={N ? N.textMuted : Colors.textSubtle} />
                      <Text style={[wirdStyles.refLabel, N && { color: N.textMuted }]}>{item.reference}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}

        <View style={[wirdStyles.completionNote, N && { backgroundColor: N.surface, borderColor: N.border }]}>
          <MaterialIcons name="check-circle-outline" size={16} color="#43A047" />
          <Text style={[wirdStyles.completionText, N && { color: N.textSub }]}>
            {rows.length} adhkar · managed via Cloud → Data → adhkar table.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const wirdStyles = StyleSheet.create({
  infoBand: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#6A1B9A12', borderRadius: Radius.md,
    borderWidth: 1, borderColor: '#6A1B9A25',
    padding: 10, marginBottom: 2,
  },
  infoText: {
    flex: 1, fontSize: 12, lineHeight: 18, color: Colors.textSecondary, fontWeight: '500',
  },
  refBand: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 7,
    marginBottom: 2,
  },
  refText: { fontSize: 11, fontWeight: '400', color: Colors.textSubtle, flex: 1 },
  surahCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numBadge: {
    width: 42, height: 42, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  numText: { fontSize: 13, fontWeight: '800' },
  surahTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  arabicTitle: { fontSize: 15, fontWeight: '700', marginTop: 1 } as any,
  countPill: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full, borderWidth: 1,
  },
  countText: { fontSize: 13, fontWeight: '800' },
  expandedBody: { marginTop: 14, gap: 0 },
  arabicBox: {
    borderWidth: 1, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  arabicText: {
    fontSize: 26, textAlign: 'right', lineHeight: 54,
    fontFamily: 'MarwanIndoPak',
    color: Colors.textPrimary,
    writingDirection: 'rtl',
  } as any,
  divider: { height: 1, backgroundColor: Colors.border },
  translit: { fontSize: 13, fontStyle: 'italic', color: Colors.textSecondary, lineHeight: 21 },
  translation: { fontSize: 14, color: Colors.textPrimary, lineHeight: 23 },
  translationUrdu: { writingDirection: 'rtl', textAlign: 'right', fontFamily: 'UrduNastaliq', fontSize: 22, lineHeight: 40 } as any,
  translationToggleRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
  translationToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  translationToggleText: { fontSize: 11, fontWeight: '700' },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  refLabel: { fontSize: 11, color: Colors.textSubtle, flex: 1, lineHeight: 16 },
  completionNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: 10,
  },
  completionText: { flex: 1, fontSize: 12, lineHeight: 18, color: Colors.textSecondary },
});

// ── After Asr Guided Flow ──────────────────────────────────────────────
const ASR_FLOW_STEPS = [
  { num: 1 as const, label: 'Surah Waqiah',  icon: 'menu-book', color: '#E65100' },
  { num: 2 as const, label: 'Hizb ul Bahr',  icon: 'waves',     color: '#1565C0' },
  { num: 3 as const, label: 'Dua al-Waqiah', icon: 'auto-awesome', color: '#6A1B9A' },
];

function AsrFlowScreen({
  step, onStepChange, onExit, nightMode,
}: { step: 1|2|3|4; onStepChange: (s: 1|2|3|4) => void; onExit: () => void; nightMode: boolean }) {
  const N = nightMode ? NIGHT : null;
  if (step === 4) return <AsrDoneScreen onExit={onExit} nightMode={nightMode} />;
  return (
    <View style={{ flex: 1, backgroundColor: N ? N.bg : '#FFF8F2' }}>
      {/* Progress header */}
      <View style={[flowStyles.progressBar, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        <TouchableOpacity onPress={onExit} style={[flowStyles.exitBtn, N && { backgroundColor: N.surfaceAlt }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="close" size={18} color={N ? N.textMuted : Colors.textSubtle} />
        </TouchableOpacity>
        <View style={flowStyles.stepsRow}>
          {ASR_FLOW_STEPS.map((s) => {
            const isDone = step > s.num;
            const isActive = step === s.num;
            return (
              <View key={s.num} style={flowStyles.stepItem}>
                <View style={[flowStyles.stepCircle, { backgroundColor: isDone || isActive ? s.color : (N ? N.border : Colors.border) }]}>
                  {isDone ? <MaterialIcons name="check" size={11} color="#fff" /> : <Text style={flowStyles.stepCircleText}>{s.num}</Text>}
                </View>
                <Text style={[flowStyles.stepLabel, N && { color: N.textMuted }, isActive && { color: s.color, fontWeight: '800' }]} numberOfLines={1}>{s.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
      {step === 1 ? (
        <View style={{ flex: 1 }}>
          <DbAdhkarScreen prayerTime="after-asr" groupFilter="Surah Al-Waqiah" nightMode={nightMode} />
          <FlowNavBar color="#E65100" nightMode={nightMode} showSkip skipLabel="Skip Waqiah" nextLabel="Done — Next Step" onSkip={() => onStepChange(2)} onNext={() => onStepChange(2)} />
        </View>
      ) : step === 2 ? (
        <View style={{ flex: 1 }}>
          <DbAdhkarScreen prayerTime="after-asr" groupFilter="Hizb ul Bahr" nightMode={nightMode} />
          <FlowNavBar color="#1565C0" nightMode={nightMode} showSkip skipLabel="Skip Hizb" nextLabel="Next: Dua al-Waqiah" onSkip={() => onStepChange(3)} onNext={() => onStepChange(3)} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <DuaWaqiahScreen nightMode={nightMode} onBack={() => onStepChange(2)} />
          <FlowNavBar color="#6A1B9A" nightMode={nightMode} nextLabel="Complete Adhkar" onNext={() => onStepChange(4)} />
        </View>
      )}
    </View>
  );
}

function AsrDoneScreen({ onExit, nightMode }: { onExit: () => void; nightMode: boolean }) {
  const N = nightMode ? NIGHT : null;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[flowStyles.doneContainer, N && { backgroundColor: N.bg }]}>
      <Text style={[flowStyles.doneTitle, N && { color: N.text }]}>After Asr Adhkar Complete</Text>
      <TouchableOpacity style={[flowStyles.doneBtn, { backgroundColor: '#E65100' }]} onPress={onExit} activeOpacity={0.85}>
        <MaterialIcons name="wb-sunny" size={18} color="#fff" />
        <Text style={flowStyles.doneBtnText}>Back to Adhkar</Text>
      </TouchableOpacity>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ── Morning Adhkar Guided Flow — Dynamic (loads all after-fajr groups from DB) ──
function AdhkarFlowScreen({
  step, onStepChange, onExit, nightMode,
}: { step: 1|2|3|4; onStepChange: (s: 1|2|3|4) => void; onExit: () => void; nightMode: boolean }) {
  const N = nightMode ? NIGHT : null;
  const [groups, setGroups] = React.useState<AdhkarGroupMeta[]>([]);
  const [loadingGroups, setLoadingGroups] = React.useState(true);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isDone, setIsDone] = React.useState(false);

  React.useEffect(() => {
    fetchAdhkarGroupsForPrayerTime('after-fajr').then(g => {
      setGroups(g);
      setLoadingGroups(false);
    });
  }, []);

  if (isDone) return <AdhkarDoneScreen onExit={onExit} nightMode={nightMode} />;

  if (loadingGroups) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: N ? N.textMuted : Colors.textSubtle, fontSize: 13 }}>Loading adhkar…</Text>
      </View>
    );
  }

  const totalSteps = groups.length;
  const currentGroup = groups[currentStep];
  const stepMeta = currentGroup ? (KNOWN_FAJR_GROUPS[currentGroup.group_name] ?? null) : null;
  const stepColor = stepMeta?.color ?? DEFAULT_COLORS[currentStep % DEFAULT_COLORS.length];
  const isLastStep = currentStep === totalSteps - 1;
  const nextGroupName = !isLastStep ? groups[currentStep + 1]?.group_name : '';
  const nextLabel = isLastStep
    ? 'Complete Adhkar'
    : `Next: ${nextGroupName?.split(' ').slice(0, 2).join(' ') ?? 'Next'}`;

  const handleNext = () => {
    if (isLastStep) setIsDone(true);
    else setCurrentStep(s => s + 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: N ? N.bg : '#F5EFE6' }}>
      {/* Progress header — scrollable step dots */}
      <View style={[flowStyles.progressBar, N && { backgroundColor: N.surface, borderBottomColor: N.border }]}>
        <TouchableOpacity onPress={onExit} style={[flowStyles.exitBtn, N && { backgroundColor: N.surfaceAlt }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="close" size={18} color={N ? N.textMuted : Colors.textSubtle} />
        </TouchableOpacity>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={[flowStyles.stepsRow, { paddingHorizontal: 4 }]}>
          {groups.map((grp, idx) => {
            const grpMeta = KNOWN_FAJR_GROUPS[grp.group_name];
            const grpColor = grpMeta?.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            const done = idx < currentStep;
            const active = idx === currentStep;
            return (
              <View key={grp.group_name} style={flowStyles.stepItem}>
                <View style={[flowStyles.stepCircle, { backgroundColor: done || active ? grpColor : (N ? N.border : Colors.border) }]}>
                  {done
                    ? <MaterialIcons name="check" size={11} color="#fff" />
                    : <Text style={flowStyles.stepCircleText}>{idx + 1}</Text>}
                </View>
                <Text style={[flowStyles.stepLabel, N && { color: N.textMuted }, active && { color: grpColor, fontWeight: '800' }]} numberOfLines={1}>
                  {grp.group_name.split(' ').slice(0, 2).join(' ')}
                </Text>
              </View>
            );
          })}
        </ScrollView>
        <Text style={{ fontSize: 10, fontWeight: '700', color: N ? N.textMuted : Colors.textSubtle, marginLeft: 4, flexShrink: 0 }}>
          {currentStep + 1}/{totalSteps}
        </Text>
      </View>

      {/* Step content — DbAdhkarScreen for current group */}
      {currentGroup ? (
        <View style={{ flex: 1 }}>
          <DbAdhkarScreen
            prayerTime="after-fajr"
            groupFilter={currentGroup.group_name}
            nightMode={nightMode}
          />
          <FlowNavBar
            color={stepColor}
            nightMode={nightMode}
            nextLabel={nextLabel}
            onNext={handleNext}
          />
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: N ? N.textMuted : Colors.textSubtle, textAlign: 'center' }}>Adhkar coming soon.</Text>
        </View>
      )}
    </View>
  );
}

function FlowNavBar({
  color, nightMode, showSkip, skipLabel, nextLabel, onSkip, onNext,
}: {
  color: string; nightMode: boolean;
  showSkip?: boolean; skipLabel?: string;
  nextLabel: string;
  onSkip?: () => void; onNext: () => void;
}) {
  const N = nightMode ? NIGHT : null;
  return (
    <View style={[flowStyles.navBar, N && { backgroundColor: N.surface, borderTopColor: N.border }]}>
      {showSkip ? (
        <TouchableOpacity style={[flowStyles.skipBtn, N && { borderColor: N.border }]} onPress={onSkip} activeOpacity={0.8}>
          <Text style={[flowStyles.skipBtnText, N && { color: N.textSub }]}>{skipLabel ?? 'Skip'}</Text>
        </TouchableOpacity>
      ) : <View style={{ flex: 1 }} />}
      <TouchableOpacity style={[flowStyles.nextBtn, { backgroundColor: color }]} onPress={onNext} activeOpacity={0.85}>
        <MaterialIcons name="check-circle" size={17} color="#fff" />
        <Text style={flowStyles.nextBtnText}>{nextLabel}</Text>
        <MaterialIcons name="chevron-right" size={18} color="rgba(255,255,255,0.85)" />
      </TouchableOpacity>
    </View>
  );
}

// ── Standalone Wird Abu Bakr Full Screen ────────────────────────────────
function WirdAbuBakrFullScreen({ nightMode, onBack }: { nightMode: boolean; onBack: () => void }) {
  return <WirdAbuBakrContent nightMode={nightMode} onBack={onBack} />;
}

function AdhkarDoneScreen({ onExit, nightMode }: { onExit: () => void; nightMode: boolean }) {
  const N = nightMode ? NIGHT : null;
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[flowStyles.doneContainer, N && { backgroundColor: N.bg }]}
    >
      <Text style={[flowStyles.doneTitle, N && { color: N.text }]}>Morning Adhkar Complete</Text>
      <TouchableOpacity
        style={[flowStyles.doneBtn, N && { backgroundColor: N.primary }]}
        onPress={onExit}
        activeOpacity={0.85}
      >
        <MaterialIcons name="wb-twilight" size={18} color="#fff" />
        <Text style={flowStyles.doneBtnText}>Back to Adhkar</Text>
      </TouchableOpacity>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const flowStyles = StyleSheet.create({
  progressBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  exitBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  stepsRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  stepItem: { alignItems: 'center', gap: 4, flex: 1 },
  stepCircle: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  stepLabel: { fontSize: 9, fontWeight: '600', color: Colors.textSubtle, textAlign: 'center', letterSpacing: 0.2 },
  navBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 4,
  },
  skipBtn: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
  },
  skipBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  nextBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: Radius.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 5, elevation: 3,
  },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: '#fff', flex: 1 },
  doneContainer: { alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 },
  doneTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', letterSpacing: 0.2 },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full, paddingHorizontal: 28, paddingVertical: 14,
    width: '100%', maxWidth: 320,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  doneBtnText: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
});

const mainBackStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  label: { fontSize: 13, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroHeader: {
    overflow: 'hidden',
    paddingBottom: 6,
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: '#fff',
  },
  heroMasjidName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFE88A',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  fajrTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingBottom: 2,
    opacity: 0.9,
  },
  fajrTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,230,140,0.95)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroAyahRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
    alignItems: 'center',
    gap: 4,
  },
  heroAyahArabic: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFE88A',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  heroAyahTrans: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    padding: 3,
  },
  tabBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { ...Typography.labelMedium, color: Colors.textSecondary, fontSize: 11 },
  tabBtnTextActive: { color: Colors.textInverse },
  categoryBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flexDirection: 'row',
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { ...Typography.labelMedium, color: Colors.textSecondary },
  catChipTextActive: { color: Colors.textInverse },
  content: { padding: Spacing.md, gap: Spacing.sm },
  duaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  duaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  duaTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  duaTitle: { ...Typography.titleSmall, color: Colors.textPrimary, flex: 1 },
  categoryBadge: { ...Typography.bodySmall, color: Colors.primary, marginTop: 4 },
  duaExpanded: { marginTop: Spacing.md, gap: Spacing.sm },
  duaArabic: {
    ...Typography.arabic,
    fontFamily: 'MarwanIndoPak',
    color: Colors.textPrimary,
    textAlign: 'right',
    lineHeight: 52,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: Radius.sm,
  },
  divider: { height: 1, backgroundColor: Colors.border },
  duaTranslit: { ...Typography.bodyMedium, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 21 },
  duaTrans: { ...Typography.bodyMedium, color: Colors.textPrimary, lineHeight: 23 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  duaRef: { ...Typography.bodySmall, color: Colors.textSubtle, flex: 1, lineHeight: 16 },
  ratibIndex: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  ratibIndexText: { fontSize: 11, fontWeight: '800', color: Colors.primary },
  countBadge: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  countBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  sectionLabel: { ...Typography.titleSmall, color: Colors.textPrimary, marginBottom: Spacing.sm },
  surahRow: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm,
  },
  surahNumber: {
    width: 40, height: 40, borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  surahNumberText: { ...Typography.labelLarge, color: Colors.primary },
  surahInfo: { flex: 1 },
  surahName: { ...Typography.titleSmall, color: Colors.textPrimary },
  surahMeta: { ...Typography.bodySmall, color: Colors.textSubtle, marginTop: 2 },
  surahArabic: { ...Typography.arabic, color: Colors.accent, fontSize: 18 },
});

