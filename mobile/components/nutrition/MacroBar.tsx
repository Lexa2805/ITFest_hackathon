import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface MacroBarProps {
    label: string;
    consumed: number;
    target: number;
}

export function MacroBar({ label, consumed, target }: MacroBarProps) {
    const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>
                    {consumed}g / {target}g
                </Text>
            </View>
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 6,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    label: {
        color: "#F5F5F5",
        fontSize: 13,
        fontWeight: "600",
    },
    value: {
        color: "#93A19A",
        fontSize: 12,
    },
    track: {
        width: "100%",
        height: 8,
        borderRadius: 999,
        backgroundColor: "#1E1E1E",
    },
    fill: {
        height: "100%",
        borderRadius: 999,
        backgroundColor: "#00E676",
    },
});
