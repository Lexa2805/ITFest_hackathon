import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type NutritionCardProps = {
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
};

export function NutritionCard({ title, subtitle, children }: NutritionCardProps) {
    return (
        <View style={styles.card}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.content}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E7EBF0',
        padding: 16,
        shadowColor: '#0F172A',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
        color: '#6B7280',
    },
    content: {
        marginTop: 12,
        gap: 10,
    },
});