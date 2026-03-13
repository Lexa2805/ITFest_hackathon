import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFridgeStore } from '@/stores/fridgeStore';

const C = {
  bg: '#0A0A0A',
  card: '#151515',
  border: '#1E1E1E',
  accent: '#00E676',
  text: '#F5F5F5',
  muted: '#94A39A',
} as const;

export default function HomeScreen() {
  const { items, fetchItems } = useFridgeStore();

  useEffect(() => {
    fetchItems();
  }, []);

  const totalItems = items.length;
  const expiringSoon = items.filter((i) => i.expiring_soon).length;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Health OS</Text>
        <Text style={styles.subtitle}>Clean health companion dashboard</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroText}>
            Use the Fridge tab to manage ingredients, run image recognition, and send data to your Nutrition Agent.
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalItems}</Text>
            <Text style={styles.statLabel}>Fridge items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{expiringSoon}</Text>
            <Text style={styles.statLabel}>Expiring soon</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's focus</Text>
          <Text style={styles.cardText}>- Update expiring ingredients</Text>
          <Text style={styles.cardText}>- Add new groceries manually or by image</Text>
          <Text style={styles.cardText}>- Send latest list to Nutrition Agent</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 24,
  },
  title: {
    color: C.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    marginTop: -4,
  },
  heroCard: {
    backgroundColor: '#102017',
    borderColor: '#1E3A2A',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  heroTitle: {
    color: C.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  heroText: {
    color: '#C4D7CC',
    fontSize: 13,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    color: C.accent,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardText: {
    color: C.muted,
    fontSize: 13,
  },
});
