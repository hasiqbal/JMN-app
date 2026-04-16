import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

type FlowCard = {
  route: string;
  title: string;
  description: string;
  icon: string;
};

const FLOW_CARDS: FlowCard[] = [
  {
    route: 'home-preview-jumuah',
    title: 'Jummah Homepage Flow',
    description: 'Full homepage states from Thursday Asr to Friday Asr.',
    icon: 'star',
  },
  {
    route: 'home-preview-eid-adha',
    title: 'Eid ul Adha Homepage Flow',
    description: 'Full homepage states from Eid eve through post-Eid Dhuhr.',
    icon: 'mosque',
  },
  {
    route: 'home-preview-eid-adha-jumuah',
    title: 'Eid ul Adha + Jummah Flow',
    description: 'Full homepage states when Eid ul Adha overlaps with Friday.',
    icon: 'auto-awesome',
  },
];

export default function HomeFlowPreviewCardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Homepage Flow Preview Cards</Text>
          <Text style={styles.subtitle}>Developer quick access for Jummah and Eid homepage flow previews</Text>
        </View>

        <View style={styles.cardList}>
          {FLOW_CARDS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.card}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              <View style={styles.cardBody}>
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
  cardList: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,28,60,0.6)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(100,184,255,0.2)',
    marginBottom: 8,
  },
  cardBody: {
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
});
