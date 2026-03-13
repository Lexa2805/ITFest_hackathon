import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type HealthMetric = {
  label: string;
  value: string;
  trend: string;
};

type FridgeItem = {
  name: string;
  state: string;
  tone: 'good' | 'warn' | 'alert';
};

type MealSuggestion = {
  name: string;
  subtitle: string;
};

const mockUser = {
  greeting: 'Good morning',
  name: 'Alex',
};

const aiInsight =
  'Your sleep is improving this week. A protein-rich lunch and light evening mobility will keep your energy steady.';

const healthMetrics: HealthMetric[] = [
  { label: 'Sleep', value: '7h 42m', trend: '+18 min' },
  { label: 'Heart Rate', value: '68 bpm', trend: 'Resting' },
  { label: 'Steps', value: '8,420', trend: '84% goal' },
  { label: 'Calories', value: '1,640', trend: 'Balanced' },
];

const fridgeItems: FridgeItem[] = [
  { name: 'Spinach', state: 'Fresh • 3 days left', tone: 'good' },
  { name: 'Greek Yogurt', state: 'Use soon • expires tomorrow', tone: 'warn' },
  { name: 'Salmon', state: 'Cook today', tone: 'alert' },
];

const mealSuggestions: MealSuggestion[] = [
  { name: 'Salmon Grain Bowl', subtitle: 'High protein • 28 min' },
  { name: 'Yogurt Berry Parfait', subtitle: 'Quick snack • 8 min' },
  { name: 'Spinach Omelette Wrap', subtitle: 'Recovery meal • 15 min' },
];

const workoutSuggestion = {
  title: '20-min Recovery Flow',
  detail: 'Focus on hips, thoracic mobility, and breath work after your evening walk.',
};

const shoppingItems = ['Avocado', 'Chia Seeds', 'Bell Pepper'];

const C = {
  background: '#F4F6F8',
  card: '#FFFFFF',
  border: '#E7EBF0',
  title: '#111827',
  body: '#374151',
  muted: '#6B7280',
  accent: '#4F7BFF',
  accentSoft: '#EEF3FF',
  good: '#2E8B57',
  warn: '#C88719',
  alert: '#C94646',
} as const;

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.surfaceCard}>{children}</View>;
}

function HealthMetricCard({ metric }: { metric: HealthMetric }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={styles.metricValue}>{metric.value}</Text>
      <Text style={styles.metricTrend}>{metric.trend}</Text>
    </View>
  );
}

function FridgeStateBadge({ tone }: { tone: FridgeItem['tone'] }) {
  const color = tone === 'good' ? C.good : tone === 'warn' ? C.warn : C.alert;
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeBlock}>
          <Text style={styles.greeting}>{mockUser.greeting}</Text>
          <Text style={styles.userName}>{mockUser.name}</Text>
          <Text style={styles.welcomeCaption}>Your wellness assistant is ready for today.</Text>
        </View>

        <SurfaceCard>
          <Text style={styles.aiLabel}>AI Summary</Text>
          <Text style={styles.aiInsight}>{aiInsight}</Text>
        </SurfaceCard>

        <View>
          <SectionHeader title="Health Overview" />
          <View style={styles.metricsGrid}>
            {healthMetrics.map((metric) => (
              <HealthMetricCard key={metric.label} metric={metric} />
            ))}
          </View>
        </View>

        <View>
          <SectionHeader title="Fridge Status" subtitle="Freshness and expiry at a glance" />
          <SurfaceCard>
            <View style={styles.listBlock}>
              {fridgeItems.map((item) => (
                <View key={item.name} style={styles.listRow}>
                  <View style={styles.rowLeft}>
                    <FridgeStateBadge tone={item.tone} />
                    <Text style={styles.rowTitle}>{item.name}</Text>
                  </View>
                  <Text style={styles.rowMeta}>{item.state}</Text>
                </View>
              ))}
            </View>
          </SurfaceCard>
        </View>

        <View>
          <SectionHeader title="Nutrition Picks" subtitle="Recipe suggestions from your current ingredients" />
          <SurfaceCard>
            <View style={styles.listBlock}>
              {mealSuggestions.map((meal) => (
                <View key={meal.name} style={styles.recipeRow}>
                  <Text style={styles.rowTitle}>{meal.name}</Text>
                  <Text style={styles.rowMeta}>{meal.subtitle}</Text>
                </View>
              ))}
            </View>
          </SurfaceCard>
        </View>

        <View>
          <SectionHeader title="Fitness Recommendation" />
          <SurfaceCard>
            <Text style={styles.cardTitle}>{workoutSuggestion.title}</Text>
            <Text style={styles.cardBody}>{workoutSuggestion.detail}</Text>
          </SurfaceCard>
        </View>

        <View>
          <SectionHeader title="Shopping Reminder" subtitle="Missing ingredients for your next meals" />
          <SurfaceCard>
            <View style={styles.shoppingRow}>
              {shoppingItems.map((item) => (
                <View key={item} style={styles.shoppingChip}>
                  <Text style={styles.shoppingChipText}>{item}</Text>
                </View>
              ))}
            </View>
          </SurfaceCard>
        </View>

        <View style={styles.bottomHint}>
          <Text style={styles.bottomHintText}>Home • Fridge</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 16,
  },
  welcomeBlock: {
    gap: 2,
  },
  greeting: {
    fontSize: 16,
    color: C.muted,
    fontWeight: '500',
  },
  userName: {
    fontSize: 30,
    color: C.title,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  welcomeCaption: {
    marginTop: 2,
    fontSize: 14,
    color: C.body,
  },
  surfaceCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
    gap: 8,
  },
  aiLabel: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  aiInsight: {
    color: C.title,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  sectionHeader: {
    marginBottom: 8,
    gap: 2,
  },
  sectionTitle: {
    color: C.title,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 13,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 1,
    gap: 4,
  },
  metricLabel: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    color: C.title,
    fontSize: 20,
    fontWeight: '800',
  },
  metricTrend: {
    color: C.body,
    fontSize: 12,
    fontWeight: '500',
  },
  listBlock: {
    gap: 10,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
  },
  rowTitle: {
    color: C.title,
    fontSize: 15,
    fontWeight: '600',
  },
  rowMeta: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  recipeRow: {
    gap: 2,
  },
  cardTitle: {
    color: C.title,
    fontSize: 16,
    fontWeight: '700',
  },
  cardBody: {
    color: C.body,
    fontSize: 14,
    lineHeight: 20,
  },
  shoppingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shoppingChip: {
    backgroundColor: C.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  shoppingChipText: {
    color: C.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  bottomHint: {
    alignItems: 'center',
    marginTop: 4,
  },
  bottomHintText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
