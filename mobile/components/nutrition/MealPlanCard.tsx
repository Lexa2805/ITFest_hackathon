import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PlannedMeal } from "@/services/nutritionApi";

interface MealPlanCardProps {
    mealType: string;
    meals: PlannedMeal[];
}

export function MealPlanCard({ mealType, meals }: MealPlanCardProps) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{mealType}</Text>
            {meals.length === 0 ? (
                <Text style={styles.empty}>No meal generated.</Text>
            ) : (
                meals.map((meal, index) => (
                    <View key={`${meal.meal_name}-${index}`} style={styles.mealBlock}>
                        <Text style={styles.mealName}>{meal.meal_name}</Text>
                        {meal.ingredients.map((ingredient, ingredientIndex) => (
                            <Text key={`${ingredient.name}-${ingredientIndex}`} style={styles.ingredient}>
                                • {ingredient.name} — {ingredient.grams}g
                            </Text>
                        ))}
                        <Text style={styles.macros}>
                            {meal.kcal} kcal · P {meal.protein_g}g · F {meal.fat_g}g · C {meal.carbs_g}g
                        </Text>
                    </View>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#141414",
        borderWidth: 1,
        borderColor: "#1E1E1E",
        borderRadius: 14,
        padding: 14,
        gap: 8,
    },
    title: {
        color: "#00E676",
        fontSize: 15,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    empty: {
        color: "#93A19A",
        fontSize: 13,
    },
    mealBlock: {
        gap: 3,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#1E1E1E",
    },
    mealName: {
        color: "#F5F5F5",
        fontSize: 14,
        fontWeight: "600",
    },
    ingredient: {
        color: "#C8D1CC",
        fontSize: 12,
    },
    macros: {
        color: "#93A19A",
        fontSize: 12,
        marginTop: 2,
    },
});
