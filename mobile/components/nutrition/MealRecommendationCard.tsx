import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type MealRecommendationCardProps = {
    mealType: string;
    title: string;
    calories: number;
    macroHint: string;
};

export function MealRecommendationCard({
    mealType,
    title,
    calories,
    macroHint,
}: MealRecommendationCardProps) {
    return (
        <View style={styles.card}>
            <Text style={styles.mealType}>{mealType}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.meta}>{calories} kcal • {macroHint}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: 170,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1E1E1E',
        padding: 12,
        backgroundColor: '#141414',
        gap: 6,
        shadowColor: '#000000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 1,
    },
    mealType: {
        color: '#93A19A',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    title: {
        color: '#F5F5F5',
        fontSize: 14,
        fontWeight: '700',
    },
    meta: {
        color: '#C8D1CC',
        fontSize: 12,
        fontWeight: '500',
    },
});