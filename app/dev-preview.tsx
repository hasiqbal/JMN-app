import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

interface PreviewItem {
  route: string;
  title: string;
  description: string;
  icon: string;
}

const PREVIEW_ITEMS: PreviewItem[] = [
  {
    route: 'compartment-hero-preview',
    title: 'Donation Hero Redesign',
    description: 'Two modern nonprofit donation hero mockups — impact banner vs story panel',
    icon: 'volunteer-activism',
  },
  {
    route: 'hero-preview',
    title: 'Prayer Hero Preview',
    description: 'All daily prayer times and hero card states',
    icon: 'wb-sunny',
  },
  {
    route: 'hero-preview-jumuah',
    title: 'Jummah Preview',
    description: 'Thursday Asr through Friday Asr with Jummah info strip',
    icon: 'star',
  },
  {
    route: 'home-preview-jumuah',
    title: 'Homepage Jummah Preview',
    description: 'Full homepage states from Thursday Asr through Friday Asr',
    icon: 'home',
  },
  {
    route: 'hero-preview-eid',
    title: 'Eid ul Fitr Preview',
    description: 'Eid prayer times (30 Ramadan through 1st Shawaal)',
    icon: 'celebration',
  },
  {
    route: 'hero-preview-eid-adha',
    title: 'Eid ul Adha Preview',
    description: '9th Dhul Hijjah Maghrib through Eid prayer to Dhuhr',
    icon: 'mosque',
  },
  {
    route: 'hero-preview-eid-jumuah',
    title: 'Eid + Jummah Preview',
    description: 'Preview when 1st Shawaal falls on Friday',
    icon: 'auto-awesome',
  },
  {
    route: 'home-preview-eid-jumuah',
    title: 'Homepage Eid + Jummah',
    description: 'Full homepage preview when Eid ul Fitr falls on Friday',
    icon: 'home-filled',
  },
  {
    route: 'hero-preview-eid-adha-jumuah',
    title: 'Eid ul Adha + Jummah Preview',
    description: 'Preview when 10th Dhul Hijjah falls on Friday',
    icon: 'mosque',
  },
  {
    route: 'home-preview-eid-adha-jumuah',
    title: 'Homepage Eid ul Adha + Jummah',
    description: 'Full homepage preview when 10th Dhul Hijjah falls on Friday',
    icon: 'home-filled',
  },
];

export default function DevPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Preview Viewer</Text>
          <Text style={styles.subtitle}>Hero and homepage development previews</Text>
        </View>

        <View style={styles.previewList}>
          {PREVIEW_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.previewCard}
              onPress={() => handleNavigate(item.route)}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <MaterialIcons name={item.icon as any} size={24} color="#64B8FF" />
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="rgba(100,184,255,0.6)" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tap any preview to view the live hero-only or full-homepage scenario screens
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041024',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(216,232,255,0.7)',
    fontWeight: '500',
  },
  previewList: {
    gap: 12,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,28,60,0.6)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(100,184,255,0.2)',
    marginBottom: 8,
  },
  cardContent: {
    flex: 1,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardDescription: {
    fontSize: 13,
    color: 'rgba(216,232,255,0.75)',
    fontWeight: '400',
    marginLeft: 36,
  },
  footer: {
    marginTop: 32,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(50,100,150,0.15)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(100,184,255,0.5)',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(216,232,255,0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
});
