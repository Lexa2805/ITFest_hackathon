import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

interface TabButtonProps {
    label: string;
    active: boolean;
    onPress: () => void;
}

export function TabButton({ label, active, onPress }: TabButtonProps) {
    return (
        <Pressable style={[styles.tab, active && styles.activeTab]} onPress={onPress}>
            <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    tab: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: "#1E1E1E",
        alignItems: "center",
        backgroundColor: "#141414",
    },
    activeTab: {
        borderColor: "#00E676",
        backgroundColor: "#121A15",
    },
    text: {
        color: "#93A19A",
        fontWeight: "600",
        fontSize: 13,
    },
    activeText: {
        color: "#00E676",
    },
});
