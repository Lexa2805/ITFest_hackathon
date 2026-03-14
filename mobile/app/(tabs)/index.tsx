import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHealthStore } from '@/stores/healthStore';
import { useFridgeStore } from '@/stores/fridgeStore';
import { useAuthStore } from '@/stores/authStore';
import { getLatestShoppingList, suggestRecipes, RecipeResponse, ShoppingListResponse } from '@/services/nutritionApi';

type HealthMetric = {
  label: string;
  value: string;
  trend: string;
};

type FridgeItem = {
  name: string;
  state: string;
  tone: 'good' | 'warn' | 'alert';
  daysLeft?: number;
};

type MealSuggestion = {
  name: string;
  subtitle: string;
};

const C = {
  background: '#0A0A0A',
  card: '#141414',
  border: '#1E1E1E',
  title: '#F5F5F5',
  body: '#C8D1CC',
  muted: '#93A19A',
  accent: '#00E676',
  accentSoft: 'rgba(0,230,118,0.15)',
  good: '#00E676',
  warn: '#FFD166',
  alert: '#FF6B6B',
} as const;

// Fallback mock data when no health data is uploaded
const mockHealthMetrics: HealthMetric[] = [
  { label: 'Sleep', value: 'No data', trend: 'Upload health data' },
  { label: 'Heart Rate', value: 'No data', trend: 'Upload health data' },
  { label: 'Steps', value: 'No data', trend: 'Upload health data' },
  { label: 'Calories', value: 'No data', trend: 'Upload health data' },
];

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
  const healthData = useHealthStore((state) => state.healthData);
  const loadHealthData = useHealthStore((state) => state.loadHealthData);
  const isHealthLoading = useHealthStore((state) => state.isLoading);
  const isHealthInitialized = useHealthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);
  const { items: fridgeItems, fetchItems } = useFridgeStore();
  
  const [recipes, setRecipes] = useState<RecipeResponse[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingListResponse | null>(null);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingShopping, setLoadingShopping] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    // Load health data from database
    if (!isHealthInitialized) {
      loadHealthData();
    }

    fetchItems().catch(err => console.error('Error fetching fridge items:', err));

    suggestRecipes()
      .then(setRecipes)
      .catch(err => console.error('Error loading recipes:', err))
      .finally(() => setLoadingRecipes(false));

    getLatestShoppingList()
      .then(setShoppingList)
      .catch(err => {
        if (err.response?.status !== 404) {
          console.error('Error loading shopping list:', err);
        }
      })
      .finally(() => setLoadingShopping(false));
  }, []);

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Get user's first name or default
  const userName = useMemo(() => {
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return 'there';
  }, [user]);

  // Generate AI insight based on health data
  const aiInsight = useMemo(() => {
    if (!healthData) {
      return 'Upload your health data to get personalized insights and recommendations.';
    }

    const m = healthData.parsed_metrics;
    const sleepHours = m.sleep_analysis.average;
    const avgSteps = Math.round(m.step_count.average);
    const avgHR = Math.round(m.heart_rate.average);

    let insights: string[] = [];

    if (sleepHours < 7) {
      insights.push('Your sleep could use improvement');
    } else if (sleepHours >= 7 && sleepHours < 8) {
      insights.push('Your sleep is on track');
    } else {
      insights.push('Great sleep quality');
    }

    if (avgSteps < 5000) {
      insights.push('Try to increase your daily movement');
    } else if (avgSteps >= 10000) {
      insights.push('Excellent activity levels');
    }

    if (avgHR >= 60 && avgHR <= 75) {
      insights.push('Your resting heart rate is healthy');
    }

    return insights.length > 0
      ? `${insights.join('. ')}. Keep up the momentum with balanced nutrition and regular movement.`
      : 'Your health metrics look good. Stay consistent with your wellness routine.';
  }, [healthData]);

  // Transform health data from the store into the format needed for display
  const healthMetrics: HealthMetric[] = useMemo(() => {
    if (!healthData) {
      return mockHealthMetrics;
    }

    const m = healthData.parsed_metrics;

    // Helper to format hours (data is already in hours, not minutes!)
    const formatHours = (hours: number): string => {
      const h = Math.floor(hours);
      const mins = Math.round((hours - h) * 60);
      return `${h}h ${mins}m`;
    };

    // Helper to format numbers with commas
    const formatNumber = (num: number): string => {
      return Math.round(num).toLocaleString();
    };

    return [
      {
        label: 'Sleep',
        value: formatHours(m.sleep_analysis.average),
        trend: `${m.sleep_analysis.sample_count} nights`,
      },
      {
        label: 'Heart Rate',
        value: `${Math.round(m.heart_rate.average)} bpm`,
        trend: 'Average',
      },
      {
        label: 'Steps',
        value: formatNumber(m.step_count.average),
        trend: 'Daily avg',
      },
      {
        label: 'Calories',
        value: formatNumber(m.active_energy_burned.average),
        trend: 'Daily avg',
      },
    ];
  }, [healthData]);

  // Transform fridge items into display format
  const fridgeItemsDisplay: FridgeItem[] = useMemo(() => {
    if (fridgeItems.length === 0) {
      return [
        { name: 'No items', state: 'Add items to your fridge', tone: 'good' },
      ];
    }

    return fridgeItems
      .slice(0, 5) // Show top 5 items
      .map(item => {
        const daysLeft = item.expiry_date
          ? Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        let state: string;
        let tone: 'good' | 'warn' | 'alert';

        if (daysLeft === null) {
          state = `${item.quantity} ${item.unit}`;
          tone = 'good';
        } else if (daysLeft <= 0) {
          state = 'Expired';
          tone = 'alert';
        } else if (daysLeft === 1) {
          state = 'Expires tomorrow';
          tone = 'alert';
        } else if (daysLeft <= 2) {
          state = `Use soon • ${daysLeft} days left`;
          tone = 'warn';
        } else if (daysLeft <= 5) {
          state = `${daysLeft} days left`;
          tone = 'warn';
        } else {
          state = `Fresh • ${daysLeft} days left`;
          tone = 'good';
        }

        return { name: item.name, state, tone, daysLeft: daysLeft ?? undefined };
      })
      .sort((a, b) => {
        // Sort by urgency: alert > warn > good
        const toneOrder = { alert: 0, warn: 1, good: 2 };
        return toneOrder[a.tone] - toneOrder[b.tone];
      });
  }, [fridgeItems]);

  // Transform recipes into meal suggestions
  const mealSuggestions: MealSuggestion[] = useMemo(() => {
    if (loadingRecipes) {
      return [];
    }

    if (recipes.length === 0) {
      return [
        { name: 'No recipes available', subtitle: 'Add items to your fridge to get suggestions' },
      ];
    }

    return recipes.slice(0, 3).map(recipe => ({
      name: recipe.name,
      subtitle: `${recipe.prep_time_minutes} min • ${recipe.calories} cal`,
    }));
  }, [recipes, loadingRecipes]);

  // Generate workout suggestion based on health data
  const workoutSuggestion = useMemo(() => {
    if (!healthData) {
      return {
        title: 'Upload Health Data',
        detail: 'Get personalized workout recommendations based on your activity levels and recovery metrics.',
      };
    }

    const avgSteps = Math.round(healthData.parsed_metrics.step_count.average);
    const sleepHours = healthData.parsed_metrics.sleep_analysis.average / 60;

    if (avgSteps < 5000) {
      return {
        title: '30-min Gentle Walk',
        detail: 'Start with a light walk to increase your daily movement. Focus on consistency over intensity.',
      };
    } else if (sleepHours < 7) {
      return {
        title: '20-min Recovery Flow',
        detail: 'Focus on gentle stretching and breathwork to support better sleep and recovery.',
      };
    } else {
      return {
        title: '25-min Strength Circuit',
        detail: 'Your metrics show good recovery. Try bodyweight exercises focusing on major muscle groups.',
      };
    }
  }, [healthData]);

  // Get shopping items
  const shoppingItems: string[] = useMemo(() => {
    if (loadingShopping) {
      return [];
    }

    if (!shoppingList || shoppingList.items.length === 0) {
      return ['All stocked up!'];
    }

    return shoppingList.items.slice(0, 5).map(item => item.name);
  }, [shoppingList, loadingShopping]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeBlock}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.userName}>{userName}</Text>
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
              {fridgeItemsDisplay.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.listRow}>
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
          {loadingRecipes ? (
            <SurfaceCard>
              <ActivityIndicator color={C.accent} size="small" />
            </SurfaceCard>
          ) : (
            <SurfaceCard>
              <View style={styles.listBlock}>
                {mealSuggestions.map((meal, index) => (
                  <View key={`${meal.name}-${index}`} style={styles.recipeRow}>
                    <Text style={styles.rowTitle}>{meal.name}</Text>
                    <Text style={styles.rowMeta}>{meal.subtitle}</Text>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          )}
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
          {loadingShopping ? (
            <SurfaceCard>
              <ActivityIndicator color={C.accent} size="small" />
            </SurfaceCard>
          ) : (
            <SurfaceCard>
              <View style={styles.shoppingRow}>
                {shoppingItems.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.shoppingChip}>
                    <Text style={styles.shoppingChipText}>{item}</Text>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          )}
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
    shadowColor: '#000000',
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
    shadowColor: '#000000',
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
