import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type RecipeSuggestionCardProps = {
    name: string;
    prepTime: string;
    calories: number;
    description: string;
    tag: string;
    ctaLabel?: string;
};

export function RecipeSuggestionCard({
    name,
    prepTime,
    calories,
    description,
    tag,
    ctaLabel = 'View recipe',
}: RecipeSuggestionCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <Text style={styles.name}>{name}</Text>
                <View style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                </View>
            </View>

            <Text style={styles.meta}>{prepTime} • {calories} kcal</Text>
            <Text style={styles.description}>{description}</Text>

            <Pressable style={styles.ctaButton}>
                <Text style={styles.ctaText}>{ctaLabel}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: '#1E1E1E',
        borderRadius: 16,
        padding: 14,
        backgroundColor: '#141414',
        gap: 8,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    name: {
        flex: 1,
        color: '#F5F5F5',
        fontSize: 15,
        fontWeight: '700',
    },
    tagPill: {
        backgroundColor: 'rgba(0,230,118,0.15)',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    tagText: {
        fontSize: 11,
        color: '#00E676',
        fontWeight: '700',
    },
    meta: {
        color: '#93A19A',
        fontSize: 12,
        fontWeight: '600',
    },
    description: {
        color: '#C8D1CC',
        fontSize: 13,
        lineHeight: 19,
    },
    ctaButton: {
        marginTop: 4,
        alignSelf: 'flex-start',
        borderRadius: 12,
        backgroundColor: 'rgba(0,230,118,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    ctaText: {
        color: '#00E676',
        fontSize: 12,
        fontWeight: '700',
    },
});