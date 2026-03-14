import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  analyzePhoto,
  confirmMeal,
  type PhotoMealEstimate,
  type PhotoMealConfirmRequest,
} from '@/services/photoMealApi';

const C = {
  background: '#0A0A0A',
  card: '#141414',
  border: '#1E1E1E',
  title: '#F5F5F5',
  body: '#C8D1CC',
  muted: '#93A19A',
  accent: '#00E676',
  accentSoft: 'rgba(0,230,118,0.15)',
  alert: '#FF6B6B',
} as const;

type TimeOfDay = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type Props = {
  onComplete?: () => void;
};

export function PhotoMealCapture({ onComplete }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<PhotoMealEstimate | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealName, setMealName] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => {
    const h = new Date().getHours();
    if (h < 11) return 'breakfast';
    if (h < 15) return 'lunch';
    if (h < 19) return 'dinner';
    return 'snack';
  });

  const handleCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required to capture meal photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    setImageUri(uri);
    setEstimate(null);
    setError(null);
    setAnalyzing(true);

    try {
      const est = await analyzePhoto(uri);
      setEstimate(est);
      setMealName(est.food_items.map((f) => f.name).join(', '));
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to analyze photo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!estimate) return;
    setConfirming(true);
    try {
      const req: PhotoMealConfirmRequest = {
        meal_name: mealName || 'Meal',
        food_items: estimate.food_items,
        total_calories: estimate.total_calories,
        total_protein_g: estimate.total_protein_g,
        total_carbs_g: estimate.total_carbs_g,
        total_fat_g: estimate.total_fat_g,
        time_of_day: timeOfDay,
      };
      await confirmMeal(req);
      Alert.alert('Logged', 'Meal has been saved.');
      setImageUri(null);
      setEstimate(null);
      setMealName('');
      onComplete?.();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save meal.');
    } finally {
      setConfirming(false);
    }
  };

  const handleReset = () => {
    setImageUri(null);
    setEstimate(null);
    setError(null);
    setMealName('');
  };

  // No photo captured yet — show capture button
  if (!imageUri) {
    return (
      <TouchableOpacity
        style={styles.captureBtn}
        onPress={handleCapture}
        accessibilityRole="button"
        accessibilityLabel="Take a photo of your meal"
      >
        <Text style={styles.captureBtnIcon}>📸</Text>
        <Text style={styles.captureBtnText}>Snap a Meal Photo</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      <Image source={{ uri: imageUri }} style={styles.preview} />

      {analyzing && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={C.accent} size="small" />
          <Text style={styles.loadingText}>Analyzing your meal…</Text>
        </View>
      )}

      {error && (
        <View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleReset} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {estimate && (
        <View style={styles.results}>
          <View style={styles.macroRow}>
            <MacroPill label="Cal" value={estimate.total_calories} />
            <MacroPill label="P" value={estimate.total_protein_g} unit="g" />
            <MacroPill label="C" value={estimate.total_carbs_g} unit="g" />
            <MacroPill label="F" value={estimate.total_fat_g} unit="g" />
          </View>

          <TextInput
            style={styles.nameInput}
            value={mealName}
            onChangeText={setMealName}
            placeholder="Meal name"
            placeholderTextColor={C.muted}
          />

          <View style={styles.timeRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as TimeOfDay[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.timeChip, timeOfDay === t && styles.timeChipActive]}
                onPress={() => setTimeOfDay(t)}
                accessibilityRole="button"
                accessibilityState={{ selected: timeOfDay === t }}
              >
                <Text style={[styles.timeChipText, timeOfDay === t && styles.timeChipTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleReset} accessibilityRole="button">
              <Text style={styles.cancelBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              disabled={confirming}
              accessibilityRole="button"
            >
              {confirming ? (
                <ActivityIndicator color="#0A0A0A" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>Log Meal</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function MacroPill({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <View style={pillStyles.pill}>
      <Text style={pillStyles.value}>
        {value}
        {unit ?? ''}
      </Text>
      <Text style={pillStyles.label}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    backgroundColor: C.accentSoft,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minWidth: 60,
  },
  value: { fontSize: 16, fontWeight: '800', color: C.accent },
  label: { fontSize: 10, fontWeight: '600', color: C.muted },
});

const styles = StyleSheet.create({
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accentSoft,
    borderRadius: 14,
    paddingVertical: 14,
  },
  captureBtnIcon: { fontSize: 20 },
  captureBtnText: { fontSize: 15, fontWeight: '700', color: C.accent },
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    gap: 12,
  },
  preview: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingText: { fontSize: 14, color: C.body },
  errorText: { fontSize: 14, color: C.alert, paddingHorizontal: 16 },
  retryText: { fontSize: 14, fontWeight: '600', color: C.accent, paddingHorizontal: 16, paddingBottom: 16 },
  results: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  macroRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  nameInput: {
    backgroundColor: C.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.title,
    fontSize: 14,
  },
  timeRow: { flexDirection: 'row', gap: 6 },
  timeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.background,
  },
  timeChipActive: { backgroundColor: C.accentSoft },
  timeChipText: { fontSize: 12, fontWeight: '600', color: C.muted },
  timeChipTextActive: { color: C.accent },
  actionRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: C.muted },
  confirmBtn: {
    flex: 2,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.accent,
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: C.background },
});
