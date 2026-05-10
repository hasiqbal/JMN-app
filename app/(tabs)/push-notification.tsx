import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
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

type BilingualContent = {
  english: string;
  urdu: string;
};

const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>()]+(?:\([^\s<>()]*\))?[^\s<>()\],.!?;:'"\)])/gi;

function normalizeExternalUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) ?? [];
  const unique: string[] = [];

  for (const match of matches) {
    const normalized = normalizeExternalUrl(match);
    if (!normalized || unique.includes(normalized)) continue;
    unique.push(normalized);
  }

  return unique;
}

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

function buildBilingualContent(
  english: string,
  urdu: string,
  preference: NotificationLanguagePreference,
): BilingualContent {
  const en = english.trim();
  const ur = urdu.trim();

  if (preference === 'urdu-only') {
    return {
      english: '',
      urdu: ur || en,
    };
  }

  return { english: en, urdu: ur };
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
  const { width: viewportWidth } = useWindowDimensions();
  const { darkMode } = useAppTheme();
  const params = useLocalSearchParams<{ openedAt?: string; notificationId?: string }>();
  const [message, setMessage] = useState<PersistedPushMessage | null>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [languagePreference, setLanguagePreference] = useState<NotificationLanguagePreference>(
    DEFAULT_NOTIFICATION_LANGUAGE_PREFERENCE,
  );
  const [simpleUrduMode, setSimpleUrduMode] = useState(DEFAULT_SIMPLE_URDU_MODE);
  const imageZoomScale = useSharedValue(1);
  const imageSavedZoomScale = useSharedValue(1);
  const imageTranslateX = useSharedValue(0);
  const imageTranslateY = useSharedValue(0);
  const imageSavedTranslateX = useSharedValue(0);
  const imageSavedTranslateY = useSharedValue(0);

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

  const viewerBaseWidth = Math.max(260, viewportWidth - 28);
  const viewerBaseHeight = viewerBaseWidth * 0.62;

  const resetImageTransform = () => {
    imageZoomScale.value = 1;
    imageSavedZoomScale.value = 1;
    imageTranslateX.value = 0;
    imageTranslateY.value = 0;
    imageSavedTranslateX.value = 0;
    imageSavedTranslateY.value = 0;
  };

  const applyViewerScale = (targetScale: number) => {
    const boundedScale = Math.max(1, Math.min(targetScale, 4));
    imageZoomScale.value = withSpring(boundedScale, { damping: 20, stiffness: 260 });
    imageSavedZoomScale.value = boundedScale;

    if (boundedScale <= 1.01) {
      imageTranslateX.value = withSpring(0, { damping: 20, stiffness: 260 });
      imageTranslateY.value = withSpring(0, { damping: 20, stiffness: 260 });
      imageSavedTranslateX.value = 0;
      imageSavedTranslateY.value = 0;
      return;
    }

    const maxOffsetX = Math.max(0, ((viewerBaseWidth * boundedScale) - viewerBaseWidth) / 2);
    const maxOffsetY = Math.max(0, ((viewerBaseHeight * boundedScale) - viewerBaseHeight) / 2);
    const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, imageTranslateX.value));
    const clampedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, imageTranslateY.value));

    imageTranslateX.value = withSpring(clampedX, { damping: 20, stiffness: 260 });
    imageTranslateY.value = withSpring(clampedY, { damping: 20, stiffness: 260 });
    imageSavedTranslateX.value = clampedX;
    imageSavedTranslateY.value = clampedY;
  };

  const openImageViewer = () => {
    if (!message?.imageUrl) return;
    resetImageTransform();
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    resetImageTransform();
  };

  const urduTitle = simpleUrduMode ? simplifyUrduText(message?.urduTitle ?? '') : (message?.urduTitle ?? '');
  const urduBody = simpleUrduMode ? simplifyUrduText(message?.urduBody ?? '') : (message?.urduBody ?? '');
  const titleContent = buildBilingualContent(message?.title ?? '', urduTitle, languagePreference);
  const bodyContent = buildBilingualContent(message?.body ?? '', urduBody, languagePreference);
  const extractedBodyUrls = useMemo(() => {
    const urls = [
      ...extractUrls(message?.body ?? ''),
      ...extractUrls(urduBody),
    ];

    return urls.filter((url, idx) => urls.indexOf(url) === idx);
  }, [message?.body, urduBody]);

  const primaryLinkUrl = useMemo(() => {
    const fromPayload = normalizeExternalUrl(message?.linkUrl ?? '');
    if (fromPayload) return fromPayload;
    return extractedBodyUrls[0] ?? '';
  }, [message?.linkUrl, extractedBodyUrls]);

  const imageGestures = useMemo(
    () => Gesture.Simultaneous(
      Gesture.Pinch()
        .onUpdate((e) => {
          const nextScale = Math.max(1, Math.min(imageSavedZoomScale.value * e.scale, 4));
          imageZoomScale.value = nextScale;

          const maxOffsetX = Math.max(0, ((viewerBaseWidth * nextScale) - viewerBaseWidth) / 2);
          const maxOffsetY = Math.max(0, ((viewerBaseHeight * nextScale) - viewerBaseHeight) / 2);
          imageTranslateX.value = Math.max(-maxOffsetX, Math.min(maxOffsetX, imageTranslateX.value));
          imageTranslateY.value = Math.max(-maxOffsetY, Math.min(maxOffsetY, imageTranslateY.value));
        })
        .onEnd(() => {
          if (imageZoomScale.value < 1.03) {
            imageZoomScale.value = withSpring(1, { damping: 20, stiffness: 260 });
            imageSavedZoomScale.value = 1;
            imageTranslateX.value = withSpring(0, { damping: 20, stiffness: 260 });
            imageTranslateY.value = withSpring(0, { damping: 20, stiffness: 260 });
            imageSavedTranslateX.value = 0;
            imageSavedTranslateY.value = 0;
            return;
          }

          imageSavedZoomScale.value = imageZoomScale.value;
          const maxOffsetX = Math.max(0, ((viewerBaseWidth * imageZoomScale.value) - viewerBaseWidth) / 2);
          const maxOffsetY = Math.max(0, ((viewerBaseHeight * imageZoomScale.value) - viewerBaseHeight) / 2);
          imageTranslateX.value = Math.max(-maxOffsetX, Math.min(maxOffsetX, imageTranslateX.value));
          imageTranslateY.value = Math.max(-maxOffsetY, Math.min(maxOffsetY, imageTranslateY.value));
          imageSavedTranslateX.value = imageTranslateX.value;
          imageSavedTranslateY.value = imageTranslateY.value;
        }),
      Gesture.Pan()
        .onUpdate((e) => {
          if (imageZoomScale.value <= 1.01) return;

          const maxOffsetX = Math.max(0, ((viewerBaseWidth * imageZoomScale.value) - viewerBaseWidth) / 2);
          const maxOffsetY = Math.max(0, ((viewerBaseHeight * imageZoomScale.value) - viewerBaseHeight) / 2);
          const nextX = imageSavedTranslateX.value + e.translationX;
          const nextY = imageSavedTranslateY.value + e.translationY;

          imageTranslateX.value = Math.max(-maxOffsetX, Math.min(maxOffsetX, nextX));
          imageTranslateY.value = Math.max(-maxOffsetY, Math.min(maxOffsetY, nextY));
        })
        .onEnd(() => {
          imageSavedTranslateX.value = imageTranslateX.value;
          imageSavedTranslateY.value = imageTranslateY.value;
        }),
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
          imageZoomScale.value = withSpring(1, { damping: 20, stiffness: 260 });
          imageSavedZoomScale.value = 1;
          imageTranslateX.value = withSpring(0, { damping: 20, stiffness: 260 });
          imageTranslateY.value = withSpring(0, { damping: 20, stiffness: 260 });
          imageSavedTranslateX.value = 0;
          imageSavedTranslateY.value = 0;
        })
    ),
    [
      imageSavedTranslateX,
      imageSavedTranslateY,
      imageSavedZoomScale,
      imageTranslateX,
      imageTranslateY,
      imageZoomScale,
      viewerBaseHeight,
      viewerBaseWidth,
    ]
  );

  const imageTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: imageTranslateX.value },
      { translateY: imageTranslateY.value },
      { scale: imageZoomScale.value },
    ],
  }));

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
                {!titleContent.english && !titleContent.urdu ? (
                  <Text style={[styles.englishText, { color: palette.text }]}>No title</Text>
                ) : (
                  <View style={styles.languageBlocksWrap}>
                    {titleContent.english ? (
                      <View style={[styles.languageBlock, { borderColor: palette.border, backgroundColor: palette.badge }]}>
                        <Text style={[styles.languageBlockLabel, { color: palette.sub }]}>English</Text>
                        <Text style={[styles.englishText, { color: palette.text }]} selectable>{titleContent.english}</Text>
                      </View>
                    ) : null}
                    {titleContent.urdu ? (
                      <View style={[styles.languageBlock, { borderColor: palette.border, backgroundColor: palette.badge }]}>
                        <Text style={[styles.languageBlockLabel, { color: palette.sub }]}>اردو</Text>
                        <Text style={[styles.urduText, { color: palette.text }]} selectable>{titleContent.urdu}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: palette.border }]} />

              <View style={styles.section}>
                <Text style={[styles.label, { color: palette.sub }]}>Message</Text>
                {!bodyContent.english && !bodyContent.urdu ? (
                  <Text style={[styles.englishText, { color: palette.text }]}>No message body</Text>
                ) : (
                  <View style={styles.languageBlocksWrap}>
                    {bodyContent.english ? (
                      <View style={[styles.languageBlock, { borderColor: palette.border, backgroundColor: palette.badge }]}>
                        <Text style={[styles.languageBlockLabel, { color: palette.sub }]}>English</Text>
                        <Text style={[styles.englishText, { color: palette.text }]} selectable>{bodyContent.english}</Text>
                      </View>
                    ) : null}
                    {bodyContent.urdu ? (
                      <View style={[styles.languageBlock, { borderColor: palette.border, backgroundColor: palette.badge }]}>
                        <Text style={[styles.languageBlockLabel, { color: palette.sub }]}>اردو</Text>
                        <Text style={[styles.urduText, { color: palette.text }]} selectable>{bodyContent.urdu}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>

              {message.imageUrl ? (
                <View style={styles.section}>
                  <Text style={[styles.label, { color: palette.sub }]}>Image</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.imagePreviewWrap, { borderColor: palette.border, backgroundColor: palette.badge }]}
                    onPress={openImageViewer}
                  >
                    <Image
                      source={{ uri: message.imageUrl }}
                      style={styles.imagePreview}
                      contentFit="cover"
                      transition={120}
                    />
                    <View style={styles.imagePreviewOverlay}>
                      <MaterialIcons name="zoom-in" size={16} color="#FFFFFF" />
                      <Text style={styles.imagePreviewOverlayText}>Tap to open and zoom</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : null}

              {primaryLinkUrl ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.linkButton, { borderColor: palette.border, backgroundColor: palette.badge }]}
                  onPress={() => {
                    void Linking.openURL(primaryLinkUrl).catch(() => {});
                  }}
                >
                  <MaterialIcons name="open-in-new" size={16} color={palette.text} />
                  <Text style={[styles.linkButtonText, { color: palette.text }]}>Open link - لنک کھولیں</Text>
                </TouchableOpacity>
              ) : null}

              {extractedBodyUrls.length > 0 ? (
                <View style={styles.linkListWrap}>
                  {extractedBodyUrls.map((url) => (
                    <TouchableOpacity
                      key={url}
                      activeOpacity={0.85}
                      style={[styles.linkRow, { borderColor: palette.border, backgroundColor: palette.badge }]}
                      onPress={() => {
                        void Linking.openURL(url).catch(() => {});
                      }}
                    >
                      <MaterialIcons name="link" size={14} color={palette.text} />
                      <Text style={[styles.linkRowText, { color: palette.text }]} numberOfLines={1}>
                        {url}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <GestureHandlerRootView style={styles.viewerRoot}>
          <View style={styles.viewerBackdrop}>
            <View style={styles.viewerHeader}>
              <Text numberOfLines={2} style={styles.viewerTitle}>Image preview</Text>
              <TouchableOpacity style={styles.viewerCloseBtn} onPress={closeImageViewer} activeOpacity={0.8}>
                <MaterialIcons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.viewerBody}>
              <GestureDetector gesture={imageGestures}>
                <View style={styles.viewerGestureArea}>
                  <Reanimated.View
                    style={[
                      styles.viewerImageFrame,
                      {
                        width: viewerBaseWidth,
                        height: viewerBaseHeight,
                      },
                      imageTransformStyle,
                    ]}
                  >
                    {message?.imageUrl ? (
                      <Image
                        source={{ uri: message.imageUrl }}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="contain"
                        transition={120}
                      />
                    ) : null}
                  </Reanimated.View>
                </View>
              </GestureDetector>
            </View>

            <Text style={styles.viewerHint}>Pinch to zoom, drag to pan, and double-tap to reset.</Text>
            <View style={styles.viewerControls}>
              <TouchableOpacity style={styles.viewerControlBtn} onPress={() => applyViewerScale(imageSavedZoomScale.value - 0.35)} activeOpacity={0.8}>
                <MaterialIcons name="remove" size={22} color="#E8F0FF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.viewerControlBtn, styles.viewerControlBtnPrimary]} onPress={resetImageTransform} activeOpacity={0.8}>
                <MaterialIcons name="center-focus-weak" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.viewerControlBtn} onPress={() => applyViewerScale(imageSavedZoomScale.value + 0.35)} activeOpacity={0.8}>
                <MaterialIcons name="add" size={22} color="#E8F0FF" />
              </TouchableOpacity>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
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
  languageBlocksWrap: {
    gap: 8,
  },
  languageBlock: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  languageBlockLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  linkListWrap: {
    gap: 6,
  },
  linkRow: {
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkRowText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  imagePreviewWrap: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 190,
  },
  imagePreviewOverlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(2, 10, 24, 0.72)',
  },
  imagePreviewOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewerRoot: {
    flex: 1,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 8, 18, 0.96)',
    paddingTop: 48,
    paddingBottom: 26,
    paddingHorizontal: 12,
    gap: 12,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.14)',
    paddingBottom: 10,
    minHeight: 46,
  },
  viewerTitle: {
    color: '#F6FAFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    flex: 1,
  },
  viewerCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  viewerBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerGestureArea: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  viewerImageFrame: {
    borderRadius: Radius.md,
    backgroundColor: '#0F1A2D',
    overflow: 'hidden',
  },
  viewerHint: {
    color: '#BFD0E8',
    fontSize: 12,
    textAlign: 'center',
  },
  viewerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  viewerControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  viewerControlBtnPrimary: {
    backgroundColor: 'rgba(106,174,255,0.34)',
    borderColor: 'rgba(106,174,255,0.65)',
  },
});
