import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const C = {
    card: "#141414",
    border: "#1E1E1E",
    text: "#F5F5F5",
    body: "#C8D1CC",
    muted: "#93A19A",
    accent: "#00E676",
    accentSoft: "rgba(0,230,118,0.15)",
} as const;

interface Props {
    name?: string | null;
    email?: string | null;
    completion: number;
    onPressAvatar: () => void;
}

function initialsFromName(name?: string | null): string {
    if (!name?.trim()) return "U";
    const parts = name
        .trim()
        .split(" ")
        .filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function ProfileHeaderCard({ name, email, completion, onPressAvatar }: Props) {
    const initials = useMemo(() => initialsFromName(name), [name]);

    return (
        <View style={styles.card}>
            <View style={styles.row}>
                {/* Tappable avatar for future image/avatar edit flow */}
                <Pressable onPress={onPressAvatar} style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </Pressable>

                <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.name}>{name?.trim() || "Your Name"}</Text>
                    <Text style={styles.email}>{email || "No email"}</Text>
                    <Text style={styles.hint}>Tap avatar to change</Text>
                </View>
            </View>

            <View style={styles.progressRow}>
                <Text style={styles.progressText}>Profile {completion}% complete</Text>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${completion}%` }]} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: C.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        padding: 14,
        gap: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: C.accentSoft,
        borderWidth: 1,
        borderColor: C.accent,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: C.accent,
        fontWeight: "800",
        fontSize: 20,
    },
    name: {
        color: C.text,
        fontSize: 18,
        fontWeight: "700",
    },
    email: {
        color: C.body,
        fontSize: 13,
    },
    hint: {
        color: C.muted,
        fontSize: 12,
    },
    progressRow: {
        gap: 6,
    },
    progressText: {
        color: C.body,
        fontSize: 12,
        fontWeight: "600",
    },
    progressTrack: {
        height: 8,
        borderRadius: 8,
        backgroundColor: "#0D2015",
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: C.accent,
    },
});
