import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type FridgeItem = {
  id: string;
  name: string;
  quantity: string;
  expiresOn: string;
};

const C = {
  bg: '#0A0A0A',
  card: '#151515',
  softCard: '#121A15',
  border: '#1E1E1E',
  accent: '#00E676',
  accentSoft: 'rgba(0,230,118,0.15)',
  text: '#F5F5F5',
  muted: '#93A19A',
  warning: '#FFD166',
  danger: '#FF6B6B',
} as const;

const demoVisionItems = [
  { name: 'Tomatoes', quantity: '4 pcs', expiresInDays: 3 },
  { name: 'Spinach', quantity: '1 bag', expiresInDays: 2 },
  { name: 'Greek Yogurt', quantity: '2 cups', expiresInDays: 6 },
];

function futureDate(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function expirationStatus(expiresOn: string): 'fresh' | 'soon' | 'expired' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresOn);
  expiry.setHours(0, 0, 0, 0);

  const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return 'expired';
  if (diff <= 2) return 'soon';
  return 'fresh';
}

export default function FridgeScreen() {
  const [ingredient, setIngredient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [items, setItems] = useState<FridgeItem[]>([
    { id: 'seed-1', name: 'Eggs', quantity: '8 pcs', expiresOn: futureDate(5) },
    { id: 'seed-2', name: 'Milk', quantity: '1 bottle', expiresOn: futureDate(2) },
  ]);

  const totalItems = items.length;
  const expiringSoonCount = useMemo(
    () => items.filter((item) => expirationStatus(item.expiresOn) === 'soon').length,
    [items]
  );

  const handleAddIngredient = () => {
    if (!ingredient.trim() || !quantity.trim() || !expiresOn.trim()) {
      Alert.alert('Missing data', 'Please add ingredient, quantity, and expiration date (YYYY-MM-DD).');
      return;
    }

    const next: FridgeItem = {
      id: Date.now().toString(),
      name: ingredient.trim(),
      quantity: quantity.trim(),
      expiresOn: expiresOn.trim(),
    };

    setItems((prev) => [next, ...prev]);
    setIngredient('');
    setQuantity('');
    setExpiresOn('');
  };

  const handleVisionRecognition = () => {
    const recognized = demoVisionItems.map((item, index) => ({
      id: `vision-${Date.now()}-${index}`,
      name: item.name,
      quantity: item.quantity,
      expiresOn: futureDate(item.expiresInDays),
    }));

    setItems((prev) => [...recognized, ...prev]);
    Alert.alert('AI Vision complete', `Detected ${recognized.length} ingredients and added to your fridge.`);
  };

  const handleSendToNutritionAgent = () => {
    const payload = items.map(({ name, quantity, expiresOn }) => ({
      name,
      quantity,
      expiresOn,
    }));

    Alert.alert(
      'Sent to Nutrition Agent',
      `Shared ${payload.length} ingredients for meal and nutrition planning.`
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Fridge System</Text>
        <Text style={styles.subtitle}>Track ingredients, expiration, and sync with Nutrition Agent</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{totalItems}</Text>
            <Text style={styles.metricLabel}>Total ingredients</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{expiringSoonCount}</Text>
            <Text style={styles.metricLabel}>Expiring soon</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manual addition</Text>
          <TextInput
            placeholder="Ingredient name"
            placeholderTextColor={C.muted}
            value={ingredient}
            onChangeText={setIngredient}
            style={styles.input}
          />
          <TextInput
            placeholder="Quantity (e.g. 2 pcs, 300g)"
            placeholderTextColor={C.muted}
            value={quantity}
            onChangeText={setQuantity}
            style={styles.input}
          />
          <TextInput
            placeholder="Expiration date (YYYY-MM-DD)"
            placeholderTextColor={C.muted}
            value={expiresOn}
            onChangeText={setExpiresOn}
            style={styles.input}
          />
          <Pressable style={styles.primaryButton} onPress={handleAddIngredient}>
            <Text style={styles.primaryButtonText}>Add Ingredient</Text>
          </Pressable>
        </View>

        <View style={[styles.card, styles.visionCard]}>
          <Text style={styles.cardTitle}>Image recognition (AI vision)</Text>
          <Text style={styles.cardText}>
            Scan your fridge image and auto-detect ingredients for faster updates.
          </Text>
          <Pressable style={styles.secondaryButton} onPress={handleVisionRecognition}>
            <Text style={styles.secondaryButtonText}>Recognize from Image</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inventory</Text>
          {items.map((item) => {
            const status = expirationStatus(item.expiresOn);
            const badgeStyle =
              status === 'expired'
                ? styles.badgeExpired
                : status === 'soon'
                  ? styles.badgeSoon
                  : styles.badgeFresh;

            const badgeText = status === 'expired' ? 'Expired' : status === 'soon' ? 'Soon' : 'Fresh';

            return (
              <View key={item.id} style={styles.row}>
                <View>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Text style={styles.rowMeta}>{item.quantity}</Text>
                  <Text style={styles.rowMeta}>Expires: {item.expiresOn}</Text>
                </View>
                <View style={[styles.badge, badgeStyle]}>
                  <Text style={styles.badgeText}>{badgeText}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Pressable style={[styles.primaryButton, styles.sendButton]} onPress={handleSendToNutritionAgent}>
          <Text style={styles.primaryButtonText}>Send Ingredients to Nutrition Agent</Text>
        </Pressable>
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
    paddingBottom: 28,
    gap: 14,
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
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: C.softCard,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  metricValue: {
    color: C.accent,
    fontSize: 24,
    fontWeight: '800',
  },
  metricLabel: {
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
    gap: 10,
  },
  visionCard: {
    backgroundColor: '#0F1712',
  },
  cardTitle: {
    color: C.text,
    fontSize: 17,
    fontWeight: '700',
  },
  cardText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: C.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#00150A',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: C.accentSoft,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#155C36',
  },
  secondaryButtonText: {
    color: '#86FFBE',
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 2,
  },
  rowTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
  rowMeta: {
    color: C.muted,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0A0A0A',
  },
  badgeFresh: {
    backgroundColor: C.accent,
  },
  badgeSoon: {
    backgroundColor: C.warning,
  },
  badgeExpired: {
    backgroundColor: C.danger,
  },
  sendButton: {
    marginTop: 2,
  },
});
