import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const C = {
    card: "#141414",
    border: "#1E1E1E",
    text: "#F5F5F5",
    body: "#C8D1CC",
    muted: "#93A19A",
    accent: "#00E676",
    input: "#111111",
} as const;

interface Props {
    heartRate: string;
    sleepHours: string;
    steps: string;
    calories: string;
    mood: number;
    stress: number;
    submitting: boolean;
    onHeartRateChange: (value: string) => void;
    onSleepChange: (value: string) => void;
    onStepsChange: (value: string) => void;
    onCaloriesChange: (value: string) => void;
    onMoodChange: (value: number) => void;
    onStressChange: (value: number) => void;
    onSubmit: () => void;
}

const moodEmoji: Record<number, string> = {
    1: "😣",
    2: "😕",
    3: "😐",
    4: "🙂",
    5: "😄",
};

function NumberInput({
    label,
    value,
    placeholder,
    onChangeText,
}: {
    label: string;
    value: string;
    placeholder: string;
    onChangeText: (value: string) => void;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                value={value}
                placeholder={placeholder}
                placeholderTextColor={C.muted}
                keyboardType="numeric"
                onChangeText={onChangeText}
                style={styles.input}
            />
        </View>
    );
}

function ScaleSelector({
    label,
    value,
    onChange,
    useEmoji = false,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    useEmoji?: boolean;
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.selectorRow}>
                {[1, 2, 3, 4, 5].map((item) => {
                    const selected = item === value;
                    return (
                        <Pressable
                            key={item}
                            onPress={() => onChange(item)}
                            style={[styles.selectorChip, selected && styles.selectorChipActive]}
                        >
                            <Text style={[styles.selectorText, selected && styles.selectorTextActive]}>
                                {useEmoji ? moodEmoji[item] : item}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

export function ManualCheckinCard(props: Props) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>Daily Check-in</Text>
            <Text style={styles.subtitle}>Enter today&apos;s health metrics manually.</Text>

            {/* Step 1: numeric biometrics */}
            <NumberInput
                label="Heart rate (bpm)"
                value={props.heartRate}
                placeholder="e.g. 72"
                onChangeText={props.onHeartRateChange}
            />
            <NumberInput
                label="Hours of sleep"
                value={props.sleepHours}
                placeholder="e.g. 7.5"
                onChangeText={props.onSleepChange}
            />
            <NumberInput
                label="Steps taken today"
                value={props.steps}
                placeholder="e.g. 8450"
                onChangeText={props.onStepsChange}
            />
            <NumberInput
                label="Calories burned (optional)"
                value={props.calories}
                placeholder="e.g. 420"
                onChangeText={props.onCaloriesChange}
            />

            {/* Step 2: subjective scales */}
            <ScaleSelector label="Mood" value={props.mood} onChange={props.onMoodChange} useEmoji />
            <ScaleSelector label="Stress level" value={props.stress} onChange={props.onStressChange} />

            {/* Step 3: submit daily check-in */}
            <Pressable style={styles.submitButton} onPress={props.onSubmit} disabled={props.submitting}>
                {props.submitting ? (
                    <ActivityIndicator size="small" color="#05361D" />
                ) : (
                    <Text style={styles.submitText}>Submit today&apos;s data</Text>
                )}
            </Pressable>
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
        gap: 10,
    },
    title: {
        color: C.text,
        fontSize: 18,
        fontWeight: "700",
    },
    subtitle: {
        color: C.body,
        fontSize: 12,
        marginBottom: 4,
    },
    field: {
        gap: 6,
    },
    label: {
        color: C.body,
        fontSize: 12,
        fontWeight: "600",
    },
    input: {
        backgroundColor: C.input,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        color: C.text,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    selectorRow: {
        flexDirection: "row",
        gap: 8,
    },
    selectorChip: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#111111",
        borderWidth: 1,
        borderColor: C.border,
        alignItems: "center",
        justifyContent: "center",
    },
    selectorChipActive: {
        borderColor: C.accent,
        backgroundColor: "#0D2015",
    },
    selectorText: {
        color: C.body,
        fontSize: 15,
        fontWeight: "700",
    },
    selectorTextActive: {
        color: C.accent,
    },
    submitButton: {
        marginTop: 4,
        backgroundColor: C.accent,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 42,
    },
    submitText: {
        color: "#05361D",
        fontSize: 14,
        fontWeight: "800",
    },
});
