import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const C = {
    card: "#141414",
    border: "#1E1E1E",
    text: "#F5F5F5",
    body: "#C8D1CC",
    muted: "#93A19A",
    accent: "#00E676",
    warning: "#FFD166",
} as const;

export interface AgentItem {
    key: string;
    title: string;
    description: string;
    status: "Active" | "Not configured";
    onPress: () => void;
}

function StatusBadge({ status }: { status: AgentItem["status"] }) {
    const active = status === "Active";
    return (
        <View style={[styles.badge, { borderColor: active ? C.accent : C.warning }]}>
            <Text style={[styles.badgeText, { color: active ? C.accent : C.warning }]}>{status}</Text>
        </View>
    );
}

function AgentCard({ item }: { item: AgentItem }) {
    return (
        <Pressable style={styles.card} onPress={item.onPress}>
            <View style={styles.row}>
                <Text style={styles.title}>{item.title}</Text>
                <StatusBadge status={item.status} />
            </View>
            <Text style={styles.description}>{item.description}</Text>
        </Pressable>
    );
}

export function AgentAccessSection({ items }: { items: AgentItem[] }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your AI Assistants</Text>
            <Text style={styles.sectionSubtitle}>Tap a card to open that assistant workflow.</Text>
            <View style={styles.list}>
                {items.map((item) => (
                    <AgentCard key={item.key} item={item} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        gap: 6,
    },
    sectionTitle: {
        color: C.text,
        fontSize: 20,
        fontWeight: "800",
    },
    sectionSubtitle: {
        color: C.muted,
        fontSize: 12,
        marginBottom: 2,
    },
    list: {
        gap: 10,
    },
    card: {
        backgroundColor: C.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 12,
        gap: 7,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
    },
    title: {
        color: C.text,
        fontSize: 15,
        fontWeight: "700",
        flex: 1,
    },
    description: {
        color: C.body,
        fontSize: 12,
        lineHeight: 18,
    },
    badge: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "700",
    },
});
