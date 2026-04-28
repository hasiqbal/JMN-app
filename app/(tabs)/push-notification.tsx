import React, { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  DEFAULT_NOTIFICATION_LANGUAGE_PREFERENCE,
  DEFAULT_SIMPLE_URDU_MODE,
  NOTIFICATION_LANGUAGE_PREFERENCE_STORAGE_KEY,
  SIMPLE_URDU_MODE_STORAGE_KEY,
  type NotificationLanguagePreference,
} from '@/constants/prayerNotifications';
import { useAppTheme } from '@/hooks/useAppTheme';

type PersistedPushMessage = {
  notificationId: string;
  title: string;
  body: string;
  urduTitle: string;
  urduBody: string;
  category: string;
  audience: string;
  imageUrl: string;
  linkUrl: string;
  receivedAt: string;
};

const PUSH_MESSAGE_STORAGE_KEY = 'jmn_last_opened_push_message_v1';

type DisplayLine = {
  text: string;
  language: 'en' | 'ur';
};

function simplifyUrduText(text: string): string {
  let value = text.trim();
  if (!value) return '';

  const replacements: [RegExp, string][] = [
    [/محترم/g, 'پیارے'],
    [/محترمہ/g, 'پیاری'],
    [/براہِ\s*کرم/g, 'مہربانی'],
    [/تشریف\s*لائیں/g, 'آئیں'],
    [/یاد\s*دہانی/g, 'یاد دہانی'],
    [/وقتِ\s*نماز/g, 'نماز کا وقت'],
    [/کا\s*آغاز\s*ہو\s*چکا\s*ہے/g, 'شروع ہو گیا ہے'],
  ];

  for (const [pattern, next] of replacements) {
    value = value.replace(pattern, next);
  }

  return value;
}

function buildDisplayLines(
  english: string,
  urdu: string,
  preference: NotificationLanguagePreference,
): DisplayLine[] {
  const en = english.trim();
  const ur = urdu.trim();

  if (preference === 'urdu-only') {
    if (ur) return [{ text: ur, language: 'ur' }];
    return en ? [{ text: en, language: 'en' }] : [];
  }

  if (preference === 'urdu-first') {
    if (ur && en) return [{ text: ur, language: 'ur' }, { text: en, language: 'en' }];
    if (ur) return [{ text: ur, language: 'ur' }];
    return en ? [{ text: en, language: 'en' }] : [];
  }

  if (en && ur) return [{ text: en, language: 'en' }, { text: ur, language: 'ur' }];
  if (en) return [{ text: en, language: 'en' }];
  if (ur) return [{ text: ur, language: 'ur' }];
  return [];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseStoredMessage(raw: string | null): PersistedPushMessage | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const notificationId = asText(parsed.notificationId);
    const title = asText(parsed.title);
    const body = asText(parsed.body);

    if (!notificationId || (!title && !body)) return null;

    return {
      notificationId,
      title,
      body,
      urduTitle: asText(parsed.urduTitle),
      urduBody: asText(parsed.urduBody),
      category: asText(parsed.category),
      audience: asText(parsed.audience),
      imageUrl: asText(parsed.imageUrl),
      linkUrl: asText(parsed.linkUrl),
      receivedAt: asText(parsed.receivedAt),
    };
  } catch {
    return null;
  }
}

export default function PushNotificationScreen() {
  const insets = useSafeAreaInsets();
  const { darkMode } = useAppTheme();
  const params = useLocalSearchParams<{ openedAt?: string; notificationId?: string }>();
  const [message, setMessage] = useState<PersistedPushMessage | null>(null);
  const [languagePreference, setLanguagePreference] = useState<NotificationLanguagePreference>(
    DEFAULT_NOTIFICATION_LANGUAGE_PREFERENCE,
  );
  const [simpleUrduMode, setSimpleUrduMode] = useState(DEFAULT_SIMPLE_URDU_MODE);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [raw, languageRaw, simpleModeRaw] = await Promise.all([
        AsyncStorage.getItem(PUSH_MESSAGE_STORAGE_KEY).catch(() => null),
        AsyncStorage.getItem(NOTIFICATION_LANGUAGE_PREFERENCE_STORAGE_KEY).catch(() => null),
        AsyncStorage.getItem(SIMPLE_URDU_MODE_STORAGE_KEY).catch(() => null),
      ]);
      if (cancelled) return;

      setMessage(parseStoredMessage(raw));
      setLanguagePreference(
        languageRaw === 'urdu-first' || languageRaw === 'urdu-only'
          ? languageRaw
          : DEFAULT_NOTIFICATION_LANGUAGE_PREFERENCE,
      );
      setSimpleUrduMode(simpleModeRaw == null ? DEFAULT_SIMPLE_URDU_MODE : simpleModeRaw !== 'false');
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.openedAt, params.notificationId]);

  const palette = useMemo(
    () =>
      darkMode
        ? {
            bg: '#0A0F1E',
            card: '#121929',
            border: '#1E2D47',
            text: '#EEF3FC',
            sub: '#93B4D8',
            accent: '#69A8FF',
            badge: '#1A2640',
          }
        : {
            bg: Colors.background,
            card: Colors.surface,
            border: Colors.border,
            text: Colors.textPrimary,
            sub: Colors.textSecondary,
            accent: Colors.primary,
            badge: '#EDF5FF',
          },
    [darkMode],
  );

  const receivedAt = message?.receivedAt
    ? new Date(message.receivedAt).toLocaleString()
    : '';

  const urduTitle = simpleUrduMode ? simplifyUrduText(message?.urduTitle ?? '') : (message?.urduTitle ?? '');
  const urduBody = simpleUrduMode ? simplifyUrduText(message?.urduBody ?? '') : (message?.urduBody ?? '');
  const titleLines = buildDisplayLines(message?.title ?? '', urduTitle, languagePreference);
  const bodyLines = buildDisplayLines(message?.body ?? '', urduBody, languagePreference);

  return (
    <View style={[styles.container, { backgroundColor: palette.bg, paddingTop: insets.top + 8 }]}> 
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(22, insets.bottom + 14) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.text }]}>Notification</Text>
          <Text style={[styles.subtitle, { color: palette.sub }]}>Full message view from your latest push tap.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <View style={styles.cardHeader}>
            <MaterialIcons name="notifications-active" size={18} color={palette.accent} />
            <Text style={[styles.cardTitle, { color: palette.text }]}>Message details</Text>
          </View>

          {!message ? (
            <Text style={[styles.empty, { color: palette.sub }]}>No push message found yet. Tap a notification to open it here.</Text>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={[styles.label, { color: palette.sub }]}>Title</Text>
                {titleLines.length === 0 ? (
                  <Text style={[styles.englishText, { color: palette.text }]}>No title</Text>
                ) : (
                  titleLines.map((line, idx) => (
                    <Text
                      key={`title-${idx}`}
                      style={line.language === 'ur' ? [styles.urduText, { color: palette.text }] : [styles.englishText, { color: palette.text }]}
                      selectable
                    >
                      {line.text}
                    </Text>
                  ))
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: palette.border }]} />

              <View style={styles.section}>
                <Text style={[styles.label, { color: palette.sub }]}>Message</Text>
                {bodyLines.length === 0 ? (
                  <Text style={[styles.englishText, { color: palette.text }]}>No message body</Text>
                ) : (
                  bodyLines.map((line, idx) => (
                    <Text
                      key={`body-${idx}`}
                      style={line.language === 'ur' ? [styles.urduText, { color: palette.text }] : [styles.englishText, { color: palette.text }]}
                      selectable
                    >
                      {line.text}
                    </Text>
                  ))
                )}
              </View>

              <View style={[styles.metaWrap, { backgroundColor: palette.badge, borderColor: palette.border }]}> 
                {message.category ? <Text style={[styles.metaText, { color: palette.sub }]}>Category: {message.category}</Text> : null}
                {message.audience ? <Text style={[styles.metaText, { color: palette.sub }]}>Audience: {message.audience}</Text> : null}
                {receivedAt ? <Text style={[styles.metaText, { color: palette.sub }]}>Received: {receivedAt}</Text> : null}
              </View>

              {message.linkUrl ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.linkButton, { borderColor: palette.border, backgroundColor: palette.badge }]}
                  onPress={() => {
                    void Linking.openURL(message.linkUrl).catch(() => {});
                  }}
                >
                  <MaterialIcons name="open-in-new" size={16} color={palette.text} />
                  <Text style={[styles.linkButtonText, { color: palette.text }]}>Open link</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    gap: 12,
  },
  header: {
    marginBottom: 2,
    gap: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  empty: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  section: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  englishText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  urduText: {
    fontSize: 16,
    lineHeight: 28,
    textAlign: 'right',
    fontFamily: 'System',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  metaWrap: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 2,
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
