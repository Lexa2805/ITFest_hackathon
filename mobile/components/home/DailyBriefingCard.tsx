import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useBriefingStore } from '@/stores/briefingStore';

const C = {
  card: '#141414',
  border: '#1E1E1E',
  accent: '#00E676',
  title: '#F5F5F5',
  body: '#C8D1CC',
  muted: '#93A19A',
  skeleton: '#1E1E1E',
} as const;

export function DailyBriefingCard() {
  const { briefing, loading, error, fetchBriefing } = useBriefingStore();

  useEffect(() => {
    fetchBriefing();
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>AI Summary</Text>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '80%' }]} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
    );
  }

  const narrative =
    error ??
    briefing?.narrative ??
    'Upload your health data to get personalized insights and recommendations.';

  return (
    <View style={styles.card}>
      <Text style={styles.label}>AI Summary</Text>
      <Text style={styles.narrative}>{narrative}</Text>
      {briefing?.source === 'fallback' && (
        <Text style={styles.fallbackHint}>Based on local analysis</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
    gap: 8,
  },
  label: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  narrative: {
    color: C.title,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  fallbackHint: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  skeletonLine: {
    height: 14,
    borderRadius: 6,
    backgroundColor: C.skeleton,
    width: '100%',
  },
});
