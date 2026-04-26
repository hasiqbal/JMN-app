import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import WebView from 'react-native-webview';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { NIGHT_PALETTE } from '@/constants/nightPalette';
import { useQaseedahNightMode } from '@/hooks/useQaseedahNightMode';

type ViewerParams = {
  url?: string | string[];
  title?: string | string[];
};

function normalizeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function QaseedahViewerScreen() {
  const router = useRouter();
  const { nightMode } = useQaseedahNightMode();
  const N = nightMode ? NIGHT_PALETTE : null;
  const params = useLocalSearchParams<ViewerParams>();

  const rawUrl = normalizeParam(params.url).trim();
  const title = normalizeParam(params.title).trim() || 'Attachment';
  const safeUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : '';

  return (
    <View style={[styles.screen, N && { backgroundColor: N.bg }]}>
      <View style={[styles.header, N && { borderColor: N.border, backgroundColor: N.surfaceAlt }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, N && { borderColor: N.border, backgroundColor: N.surface }]}
          activeOpacity={0.85}
        >
          <MaterialIcons name="arrow-back" size={18} color={N ? N.textSub : Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, N && { color: N.text }]} numberOfLines={1}>{title}</Text>
      </View>

      {!safeUrl ? (
        <View style={[styles.errorCard, N && { borderColor: N.border, backgroundColor: N.surfaceAlt }]}>
          <Text style={[styles.errorText, N && { color: N.textMuted }]}>Attachment URL is missing or invalid.</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: safeUrl }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={N ? N.accent : Colors.primary} />
              <Text style={[styles.loadingText, N && { color: N.textSub }]}>Loading attachment...</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: Colors.textSubtle,
  },
  errorCard: {
    margin: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: Colors.textSubtle,
  },
});
