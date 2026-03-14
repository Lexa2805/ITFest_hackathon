import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type CircularScoreProps = {
    score: number;
    size?: number;
    strokeWidth?: number;
    label?: string;
};

export function CircularScore({ score, size = 170, strokeWidth = 14, label = 'Physical State' }: CircularScoreProps) {
    const clamped = Math.max(0, Math.min(100, score));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progressOffset = circumference * (1 - clamped / 100);

    return (
        <View style={styles.container}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#1E1E1E"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#00E676"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    rotation="-90"
                    originX={size / 2}
                    originY={size / 2}
                />
            </Svg>

            <View style={styles.centerContent}>
                <Text style={styles.scoreText}>{clamped}</Text>
                <Text style={styles.outOfText}>/100</Text>
                <Text style={styles.labelText}>{label}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContent: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
    },
    scoreText: {
        color: '#F5F5F5',
        fontSize: 34,
        fontWeight: '800',
        lineHeight: 38,
    },
    outOfText: {
        color: '#93A19A',
        fontSize: 13,
        fontWeight: '600',
    },
    labelText: {
        marginTop: 2,
        color: '#C8D1CC',
        fontSize: 12,
        fontWeight: '600',
    },
});
