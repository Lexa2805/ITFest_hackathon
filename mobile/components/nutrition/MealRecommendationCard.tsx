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
        borderColor: '#E6ECF5',
        padding: 12,
        backgroundColor: '#FFFFFF',
        gap: 6,
        shadowColor: '#0F172A',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 1,
    },
    mealType: {
        color: '#64748B',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    title: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '700',
    },
    meta: {
        color: '#475569',
        fontSize: 12,
        fontWeight: '500',
    },
});