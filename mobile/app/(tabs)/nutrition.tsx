import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MacroProgressRow } from '@/components/nutrition/MacroProgressRow';
import { MealRecommendationCard } from '@/components/nutrition/MealRecommendationCard';
import { NutritionCard } from '@/components/nutrition/NutritionCard';
import { RecipeSuggestionCard } from '@/components/nutrition/RecipeSuggestionCard';
import { ShoppingListItem } from '@/components/nutrition/ShoppingListItem';
import {
    getTodayLog,
    suggestRecipes,
    getLatestShoppingList,
    DailyLogResponse,
    RecipeResponse,
    ShoppingListResponse
} from '@/services/nutritionApi';
import {
    healthAwareMessage,
    nutritionFilters,
    nutritionHeader,
    recommendedMeals,
} from './nutrition.mock';

const C = {
    bg: '#0A0A0A',
    card: '#141414',
    softCard: '#121A15',
    border: '#1E1E1E',
    text: '#F5F5F5',
    body: '#C8D1CC',
    muted: '#93A19A',
    accent: '#00E676',
    accentSoft: 'rgba(0,230,118,0.15)',
} as const;

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
    );
}

function FilterChip({ label }: { label: string }) {
    return (
        <Pressable style={styles.filterChip}>
            <Text style={styles.filterChipText}>{label}</Text>
        </Pressable>
    );
}

export default function NutritionScreen() {
    const [loadingLog, setLoadingLog] = useState(true);
    const [loadingRecipes, setLoadingRecipes] = useState(true);
    const [loadingShopping, setLoadingShopping] = useState(true);

    const [log, setLog] = useState<DailyLogResponse | null>(null);
    const [recipes, setRecipes] = useState<RecipeResponse[]>([]);
    const [shoppingList, setShoppingList] = useState<ShoppingListResponse | null>(null);

    useEffect(() => {
        getTodayLog()
            .then(setLog)
            .catch(err => console.error("Error loading daily log:", err, err.response?.data))
            .finally(() => setLoadingLog(false));

        suggestRecipes()
            .then(setRecipes)
            .catch(err => console.error("Error suggesting recipes:", err, err.response?.data))
            .finally(() => setLoadingRecipes(false));

        getLatestShoppingList()
            .then(setShoppingList)
            .catch(err => {
                if (err.response?.status !== 404) {
                    console.error("Error loading shopping list:", err, err.response?.data);
                }
            })
            .finally(() => setLoadingShopping(false));
    }, []);

    const targetCalories = log?.goal_calories ?? 2000;
    const consumedCalories = log?.total_calories ?? 0;
    const remainingCalories = Math.max(0, targetCalories - consumedCalories);

    const macroTargetsData = [
        { label: 'Protein', current: log?.total_protein_g ?? 0, target: log?.goal_protein_g ?? 150, accentColor: '#00E676' },
        { label: 'Carbs', current: log?.total_carbs_g ?? 0, target: log?.goal_carbs_g ?? 200, accentColor: '#3DDC97' },
        { label: 'Fats', current: log?.total_fat_g ?? 0, target: log?.goal_fat_g ?? 70, accentColor: '#FFD166' },
    ];

    if (loadingLog) {
        return (
            <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={C.accent} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerBlock}>
                    <View style={styles.headerTextBlock}>
                        <Text style={styles.headerTitle}>{nutritionHeader.title}</Text>
                        <Text style={styles.headerSubtitle}>{nutritionHeader.subtitle}</Text>
                    </View>
                    <Pressable style={styles.filterAction}>
                        <Ionicons name="options-outline" size={18} color={C.text} />
                    </Pressable>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
                    {nutritionFilters.map((filter) => (
                        <FilterChip key={filter.id} label={filter.label} />
                    ))}
                </ScrollView>

                <NutritionCard title="Daily Nutrition Summary" subtitle="Stay aligned with your target intake">
                    <View style={styles.summaryStatsRow}>
                        <View style={styles.summaryStatCard}>
                            <Text style={styles.summaryStatLabel}>Target</Text>
                            <Text style={styles.summaryStatValue}>{targetCalories}</Text>
                            <Text style={styles.summaryStatUnit}>kcal</Text>
                        </View>
                        <View style={styles.summaryStatCard}>
                            <Text style={styles.summaryStatLabel}>Consumed</Text>
                            <Text style={styles.summaryStatValue}>{consumedCalories}</Text>
                            <Text style={styles.summaryStatUnit}>kcal</Text>
                        </View>
                        <View style={styles.summaryStatCard}>
                            <Text style={styles.summaryStatLabel}>Remaining</Text>
                            <Text style={styles.summaryStatValue}>{remainingCalories}</Text>
                            <Text style={styles.summaryStatUnit}>kcal</Text>
                        </View>
                    </View>

                    <View style={styles.macroRows}>
                        {macroTargetsData.map((macro) => (
                            <MacroProgressRow
                                key={macro.label}
                                label={macro.label}
                                current={macro.current}
                                target={macro.target}
                                accentColor={macro.accentColor}
                            />
                        ))}
                    </View>
                </NutritionCard>

                <View>
                    <SectionHeader
                        title="Cook with what you have"
                        subtitle="Recipe picks from ingredients currently in your fridge"
                    />
                    <View style={styles.verticalList}>
                        {loadingRecipes ? (
                            <ActivityIndicator size="small" color={C.accent} style={{ marginVertical: 20 }} />
                        ) : recipes.length > 0 ? (
                            recipes.map((recipe) => (
                                <RecipeSuggestionCard
                                    key={recipe.id}
                                    name={recipe.name}
                                    prepTime={`${recipe.prep_time_minutes} min`}
                                    calories={recipe.calories}
                                    description={recipe.instructions && recipe.instructions.length > 0 ? recipe.instructions[0].substring(0, 60) + '...' : 'Delicious meal'}
                                    tag={recipe.protein_g > 20 ? 'High Protein' : 'Balanced'}
                                />
                            ))
                        ) : (
                            <Text style={{ textAlign: 'center', color: C.muted, marginVertical: 20 }}>
                                No recipes could be generated right now.
                            </Text>
                        )}
                    </View>
                </View>

                <NutritionCard title="Missing Ingredients" subtitle="For selected recipes">
                    {loadingShopping ? (
                        <ActivityIndicator size="small" color={C.accent} style={{ marginVertical: 20 }} />
                    ) : shoppingList?.items && shoppingList.items.length > 0 ? (
                        <>
                            {shoppingList.items.map((item, index) => (
                                <ShoppingListItem
                                    key={`${item.name}-${index}`}
                                    name={item.name}
                                    amount={`${item.quantity_needed} ${item.unit}`}
                                    group={item.category}
                                />
                            ))}
                            <Pressable style={styles.shoppingCta}>
                                <Text style={styles.shoppingCtaText}>Add to shopping list</Text>
                            </Pressable>
                        </>
                    ) : (
                        <Text style={{ textAlign: 'center', color: C.muted, marginVertical: 20 }}>
                            You have all ingredients in your fridge!
                        </Text>
                    )}
                </NutritionCard>

                <View>
                    <SectionHeader title="Recommended Meals" subtitle="Easy-to-scan options for the rest of your day" />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mealCardsRow}>
                        {recommendedMeals.map((meal) => (
                            <MealRecommendationCard
                                key={meal.mealType}
                                mealType={meal.mealType}
                                title={meal.title}
                                calories={meal.calories}
                                macroHint={meal.macroHint}
                            />
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.healthAwareBanner}>
                    <Ionicons name="sparkles-outline" size={18} color={C.accent} />
                    <Text style={styles.healthAwareText}>{healthAwareMessage}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: C.bg,
    },
    content: {
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 28,
        gap: 16,
    },
    headerBlock: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    headerTextBlock: {
        flex: 1,
        gap: 4,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: C.text,
        letterSpacing: 0.2,
    },
    headerSubtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: C.body,
    },
    filterAction: {
        width: 36,
        height: 36,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: C.card,
    },
    filtersRow: {
        gap: 8,
        paddingRight: 12,
    },
    filterChip: {
        borderRadius: 999,
        backgroundColor: C.softCard,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: C.border,
    },
    filterChipText: {
        color: C.text,
        fontSize: 12,
        fontWeight: '600',
    },
    summaryStatsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    summaryStatCard: {
        flex: 1,
        backgroundColor: C.softCard,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        paddingVertical: 10,
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 2,
    },
    summaryStatLabel: {
        color: C.muted,
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryStatValue: {
        color: C.text,
        fontSize: 19,
        fontWeight: '800',
    },
    summaryStatUnit: {
        color: C.muted,
        fontSize: 11,
        fontWeight: '500',
    },
    macroRows: {
        marginTop: 4,
        gap: 12,
    },
    sectionHeader: {
        marginBottom: 8,
        gap: 2,
    },
    sectionTitle: {
        color: C.text,
        fontSize: 18,
        fontWeight: '700',
    },
    sectionSubtitle: {
        color: C.muted,
        fontSize: 13,
    },
    verticalList: {
        gap: 10,
    },
    shoppingCta: {
        marginTop: 4,
        borderRadius: 12,
        backgroundColor: C.accentSoft,
        paddingVertical: 11,
        alignItems: 'center',
    },
    shoppingCtaText: {
        color: C.accent,
        fontSize: 13,
        fontWeight: '700',
    },
    mealCardsRow: {
        gap: 10,
        paddingRight: 12,
    },
    healthAwareBanner: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.softCard,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 24,
    },
    healthAwareText: {
        flex: 1,
        color: C.body,
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
    },
});