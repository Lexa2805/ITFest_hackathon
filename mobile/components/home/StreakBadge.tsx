import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const C = {
  card: '#141414',
  border: '#1E1E1E',
  title: '#F5F5F5',
  muted: '#93A19A',
  accent: '#00E676',
  accentSoft: 'rgba(0,230,118,0.15)',
} as const;

const LABELS: Record<string, string> = {
  checkin: 'Check-ins',
  meal_logged: 'Meals Logged',
  calorie_goal: 'Calorie Goal',
};

type Props = {
  activityType: string;
  currentStreak: number;
};

export function StreakBadge({ activityType, currentStreak }: Props) {
  const label = LABELS[activityType] ?? activityType;

  return (
    <View style={styles.badge}>
      <Text style={styles.emoji}>🔥</Text>
      <Text style={styles.count}>{currentStreak}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 90,
    gap: 2,
  },
  emoji: {
    fontSize: 20,
  },
  count: {
    fontSize: 22,
    fontWeight: '800',
    color: C.accent,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    textAlign: 'center',
  },
});
