import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ExpiryAlertItem } from '@/services/expiryApi';

const C = {
  alert: '#FF6B6B',
  alertSoft: 'rgba(255,107,107,0.12)',
  title: '#F5F5F5',
  muted: '#93A19A',
  accent: '#00E676',
} as const;

type Props = {
  items: ExpiryAlertItem[];
  onViewRecipes?: () => void;
};

export function ExpiryAlertBanner({ items, onViewRecipes }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.heading}>⚠️ Expiring Soon</Text>
      {items.map((item) => (
        <View key={item.item_id} style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.status}>
            {item.status === 'expired'
              ? 'Expired'
              : item.days_until_expiry === 0
                ? 'Today'
                : 'Tomorrow'}
          </Text>
        </View>
      ))}
      {onViewRecipes && (
        <TouchableOpacity
          onPress={onViewRecipes}
          style={styles.link}
          accessibilityRole="button"
          accessibilityLabel="View expiry-based recipes"
        >
          <Text style={styles.linkText}>View recipes to use these up →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: C.alertSoft,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  heading: {
    fontSize: 14,
    fontWeight: '700',
    color: C.alert,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: C.title,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    color: C.alert,
  },
  link: {
    marginTop: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.accent,
  },
});
