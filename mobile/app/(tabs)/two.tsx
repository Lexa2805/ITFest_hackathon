import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFridgeStore } from '@/stores/fridgeStore';
import type { ScannedIngredient } from '@/services/fridgeApi';

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

function expirationStatus(expiryDate: string | null): 'fresh' | 'soon' | 'expired' | 'none' {
  if (!expiryDate) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'expired';
  if (diff <= 2) return 'soon';
  return 'fresh';
}

export default function FridgeScreen() {
  const {
    items,
    scannedIngredients,
    isLoading,
    isScanning,
    error,
    fetchItems,
    addItem,
    removeItem,
    scanImage,
    confirmScan,
    clearScan,
  } = useFridgeStore();

  const [ingredient, setIngredient] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [category, setCategory] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }, [fetchItems]);

  const totalItems = items.length;
  const expiringSoonCount = useMemo(
    () => items.filter((item) => item.expiring_soon).length,
    [items]
  );

  const handleAddIngredient = async () => {
    if (!ingredient.trim()) {
      Alert.alert('Missing data', 'Please enter at least an ingredient name.');
      return;
    }

    const qty = parseFloat(quantity) || 1;

    try {
      await addItem({
        name: ingredient.trim(),
        quantity: qty,
        unit: unit.trim() || 'pcs',
        expiry_date: expiresOn.trim() || null,
        category: category.trim() || 'other',
      });
      setIngredient('');
      setQuantity('');
      setUnit('');
      setExpiresOn('');
      setCategory('');
    } catch {
      // Error is already set in the store
    }
  };

  const handlePickImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission required', 'Please allow access to your photos to scan ingredients.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await scanImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission required', 'Please allow camera access to scan ingredients.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await scanImage(result.assets[0].uri);
    }
  };

  const handleVisionRecognition = () => {
    Alert.alert('Scan Ingredients', 'Choose a source', [
      { text: 'Camera', onPress: handleTakePhoto },
      { text: 'Gallery', onPress: handlePickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleConfirmScan = async () => {
    await confirmScan();
    Alert.alert('Added!', `${scannedIngredients.length} ingredient(s) saved to your fridge.`);
  };

  const handleDeleteItem = (id: string, name: string) => {
    Alert.alert('Delete item', `Remove "${name}" from your fridge?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeItem(id),
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
      >
        <Text style={styles.title}>Fridge System</Text>
        <Text style={styles.subtitle}>Track ingredients, expiration, and sync with Nutrition Agent</Text>

        {/* Error banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠  {error}</Text>
          </View>
        )}

        {/* Metrics */}
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

        {/* Manual addition */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Manual addition</Text>
          <TextInput
            placeholder="Ingredient name *"
            placeholderTextColor={C.muted}
            value={ingredient}
            onChangeText={setIngredient}
            style={styles.input}
          />
          <View style={styles.row2col}>
            <TextInput
              placeholder="Qty (e.g. 2)"
              placeholderTextColor={C.muted}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
            />
            <TextInput
              placeholder="Unit (pcs)"
              placeholderTextColor={C.muted}
              value={unit}
              onChangeText={setUnit}
              style={[styles.input, styles.halfInput]}
            />
          </View>
          <TextInput
            placeholder="Expiry date YYYY-MM-DD (optional)"
            placeholderTextColor={C.muted}
            value={expiresOn}
            onChangeText={setExpiresOn}
            style={styles.input}
          />
          <TextInput
            placeholder="Category (e.g. dairy, meat — optional)"
            placeholderTextColor={C.muted}
            value={category}
            onChangeText={setCategory}
            style={styles.input}
          />
          <Pressable
            style={[styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={handleAddIngredient}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#00150A" />
            ) : (
              <Text style={styles.primaryButtonText}>Add Ingredient</Text>
            )}
          </Pressable>
        </View>

        {/* AI Vision */}
        <View style={[styles.card, styles.visionCard]}>
          <Text style={styles.cardTitle}>Image recognition (AI vision)</Text>
          <Text style={styles.cardText}>
            Scan your fridge image with GPT 5.1 and auto-detect ingredients.
          </Text>
          <Pressable
            style={[styles.secondaryButton, isScanning && styles.disabledButton]}
            onPress={handleVisionRecognition}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="#86FFBE" />
            ) : (
              <Text style={styles.secondaryButtonText}>Scan from Camera / Gallery</Text>
            )}
          </Pressable>
        </View>

        {/* Scanned ingredients confirmation */}
        {scannedIngredients.length > 0 && (
          <View style={[styles.card, styles.scanResultCard]}>
            <Text style={styles.cardTitle}>
              Detected {scannedIngredients.length} ingredient(s)
            </Text>
            {scannedIngredients.map((ing: ScannedIngredient, idx: number) => (
              <View key={`${ing.name}-${idx}`} style={styles.scanRow}>
                <Text style={styles.scanName}>{ing.name}</Text>
                <Text style={styles.scanMeta}>
                  {ing.estimated_quantity} {ing.unit} · {ing.category}
                </Text>
              </View>
            ))}
            <View style={styles.scanActions}>
              <Pressable style={styles.primaryButton} onPress={handleConfirmScan}>
                <Text style={styles.primaryButtonText}>Confirm & Add All</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, { marginTop: 8 }]}
                onPress={clearScan}
              >
                <Text style={styles.secondaryButtonText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Inventory */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inventory</Text>
          {isLoading && items.length === 0 ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
          ) : items.length === 0 ? (
            <Text style={styles.cardText}>No items yet. Add some ingredients!</Text>
          ) : (
            items.map((item) => {
              const status = expirationStatus(item.expiry_date);
              const badgeStyle =
                status === 'expired'
                  ? styles.badgeExpired
                  : status === 'soon'
                    ? styles.badgeSoon
                    : status === 'fresh'
                      ? styles.badgeFresh
                      : null;

              const badgeText =
                status === 'expired'
                  ? 'Expired'
                  : status === 'soon'
                    ? 'Soon'
                    : status === 'fresh'
                      ? 'Fresh'
                      : null;

              return (
                <View key={item.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text style={styles.rowMeta}>
                      {item.quantity} {item.unit} · {item.category}
                    </Text>
                    {item.expiry_date && (
                      <Text style={styles.rowMeta}>Expires: {item.expiry_date}</Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {badgeStyle && (
                      <View style={[styles.badge, badgeStyle]}>
                        <Text style={styles.badgeText}>{badgeText}</Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => handleDeleteItem(item.id, item.name)}
                      hitSlop={8}
                    >
                      <Text style={styles.deleteBtn}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
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
  errorBanner: {
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderColor: 'rgba(255,107,107,0.4)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
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
  scanResultCard: {
    backgroundColor: '#101820',
    borderColor: '#1E3050',
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
  row2col: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
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
  disabledButton: {
    opacity: 0.6,
  },
  scanRow: {
    backgroundColor: '#111820',
    borderRadius: 10,
    padding: 10,
  },
  scanName: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },
  scanMeta: {
    color: C.muted,
    fontSize: 12,
    marginTop: 2,
  },
  scanActions: {
    marginTop: 4,
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
  deleteBtn: {
    color: C.danger,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
});
