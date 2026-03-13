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
        borderColor: '#E7EBF0',
        borderRadius: 16,
        padding: 14,
        backgroundColor: '#FCFDFF',
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
        color: '#111827',
        fontSize: 15,
        fontWeight: '700',
    },
    tagPill: {
        backgroundColor: '#EEF3FF',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    tagText: {
        fontSize: 11,
        color: '#4062D9',
        fontWeight: '700',
    },
    meta: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '600',
    },
    description: {
        color: '#475569',
        fontSize: 13,
        lineHeight: 19,
    },
    ctaButton: {
        marginTop: 4,
        alignSelf: 'flex-start',
        borderRadius: 12,
        backgroundColor: '#E8F5EE',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    ctaText: {
        color: '#1C7C54',
        fontSize: 12,
        fontWeight: '700',
    },
});