import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type HealthMetricCardProps = {
    title: string;
    totalLabel: string;
    totalValue: string;
    averageLabel: string;
    averageValue: string;
    samples: number;
};

export function HealthMetricCard({
    title,
    totalLabel,
    totalValue,
    averageLabel,
    averageValue,
    samples,
}: HealthMetricCardProps) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.row}>
                <Text style={styles.label}>{totalLabel}</Text>
                <Text style={styles.value}>{totalValue}</Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>{averageLabel}</Text>
                <Text style={styles.value}>{averageValue}</Text>
            </View>

            <Text style={styles.samples}>Samples: {samples}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#141414',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1E1E1E',
        padding: 14,
        gap: 8,
    },
    title: {
        color: '#F5F5F5',
        fontSize: 16,
        fontWeight: '700',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        color: '#93A19A',
        fontSize: 12,
        fontWeight: '600',
    },
    value: {
        color: '#C8D1CC',
        fontSize: 13,
        fontWeight: '700',
    },
    samples: {
        color: '#93A19A',
        fontSize: 11,
        fontWeight: '500',
    },
});
