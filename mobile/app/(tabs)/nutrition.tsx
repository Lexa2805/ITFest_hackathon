import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MacroProgressRow } from '@/components/nutrition/MacroProgressRow';
import { MealRecommendationCard } from '@/components/nutrition/MealRecommendationCard';
import { NutritionCard } from '@/components/nutrition/NutritionCard';
import { RecipeSuggestionCard } from '@/components/nutrition/RecipeSuggestionCard';
import { ShoppingListItem } from '@/components/nutrition/ShoppingListItem';
import {
    dailySummary,
    fridgeBasedRecipes,
    healthAwareMessage,
    macroTargets,
    missingIngredients,
    nutritionFilters,
    nutritionHeader,
    recommendedMeals,
} from './nutrition.mock';

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
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerBlock}>
                    <View style={styles.headerTextBlock}>
                        <Text style={styles.headerTitle}>{nutritionHeader.title}</Text>
                        <Text style={styles.headerSubtitle}>{nutritionHeader.subtitle}</Text>
                    </View>
                    <Pressable style={styles.filterAction}>
                        <Ionicons name="options-outline" size={18} color="#1F2937" />
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
                            <Text style={styles.summaryStatValue}>{dailySummary.targetCalories}</Text>
                            <Text style={styles.summaryStatUnit}>kcal</Text>
                        </View>
                        <View style={styles.summaryStatCard}>
                            <Text style={styles.summaryStatLabel}>Consumed</Text>
                            <Text style={styles.summaryStatValue}>{dailySummary.consumedCalories}</Text>
                            <Text style={styles.summaryStatUnit}>kcal</Text>
                        </View>
                        <View style={styles.summaryStatCard}>
                            <Text style={styles.summaryStatLabel}>Remaining</Text>
                            <Text style={styles.summaryStatValue}>{dailySummary.remainingCalories}</Text>
                            <Text style={styles.summaryStatUnit}>kcal</Text>
                        </View>
                    </View>

                    <View style={styles.macroRows}>
                        {macroTargets.map((macro) => (
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
                        {fridgeBasedRecipes.map((recipe) => (
                            <RecipeSuggestionCard
                                key={recipe.name}
                                name={recipe.name}
                                prepTime={recipe.prepTime}
                                calories={recipe.calories}
                                description={recipe.description}
                                tag={recipe.tag}
                            />
                        ))}
                    </View>
                </View>

                <NutritionCard title="Missing Ingredients" subtitle="For selected recipes">
                    {missingIngredients.map((item) => (
                        <ShoppingListItem key={item.name} name={item.name} amount={item.amount} group={item.group} />
                    ))}
                    <Pressable style={styles.shoppingCta}>
                        <Text style={styles.shoppingCtaText}>Add to shopping list</Text>
                    </Pressable>
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
                    <Ionicons name="sparkles-outline" size={18} color="#4062D9" />
                    <Text style={styles.healthAwareText}>{healthAwareMessage}</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F4F6F8',
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
        color: '#111827',
        letterSpacing: 0.2,
    },
    headerSubtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: '#4B5563',
    },
    filterAction: {
        width: 36,
        height: 36,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5EAF1',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    filtersRow: {
        gap: 8,
        paddingRight: 12,
    },
    filterChip: {
        borderRadius: 999,
        backgroundColor: '#EDF2FA',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterChipText: {
        color: '#334155',
        fontSize: 12,
        fontWeight: '600',
    },
    summaryStatsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    summaryStatCard: {
        flex: 1,
        backgroundColor: '#F8FAFD',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E7ECF4',
        paddingVertical: 10,
        paddingHorizontal: 10,
        alignItems: 'center',
        gap: 2,
    },
    summaryStatLabel: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    summaryStatValue: {
        color: '#111827',
        fontSize: 19,
        fontWeight: '800',
    },
    summaryStatUnit: {
        color: '#64748B',
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
        color: '#111827',
        fontSize: 18,
        fontWeight: '700',
    },
    sectionSubtitle: {
        color: '#6B7280',
        fontSize: 13,
    },
    verticalList: {
        gap: 10,
    },
    shoppingCta: {
        marginTop: 4,
        borderRadius: 12,
        backgroundColor: '#E8F5EE',
        paddingVertical: 11,
        alignItems: 'center',
    },
    shoppingCtaText: {
        color: '#1C7C54',
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
        borderColor: '#E4EAFA',
        backgroundColor: '#F5F8FF',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 24,
    },
    healthAwareText: {
        flex: 1,
        color: '#334155',
        fontSize: 13,
        lineHeight: 19,
        fontWeight: '500',
    },
});