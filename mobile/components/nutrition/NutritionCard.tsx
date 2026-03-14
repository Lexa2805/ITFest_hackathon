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
        backgroundColor: '#141414',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#1E1E1E',
        padding: 16,
        shadowColor: '#000000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
        elevation: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F5F5F5',
    },
    subtitle: {
        marginTop: 2,
        fontSize: 13,
        color: '#93A19A',
    },
    content: {
        marginTop: 12,
        gap: 10,
    },
});