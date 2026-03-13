import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type MacroProgressRowProps = {
    label: string;
    current: number;
    target: number;
    accentColor: string;
};

export function MacroProgressRow({ label, current, target, accentColor }: MacroProgressRowProps) {
    const progressRatio = target > 0 ? Math.min(current / target, 1) : 0;

    return (
        <View style={styles.container}>
            <View style={styles.rowHeader}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>
                    {current}g / {target}g
                </Text>
            </View>

            <View style={styles.track}>
                <View style={[styles.fill, { width: `${progressRatio * 100}%`, backgroundColor: accentColor }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 6,
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 13,
        color: '#374151',
        fontWeight: '600',
    },
    value: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    track: {
        width: '100%',
        height: 8,
        borderRadius: 99,
        backgroundColor: '#E9EEF5',
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 99,
    },
});