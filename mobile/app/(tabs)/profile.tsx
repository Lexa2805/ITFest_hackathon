import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/stores/authStore";
import { useHealthStore } from "@/stores/healthStore";
import { useProfileContext } from "@/contexts/ProfileContext";
import {
    type ActivityLevel,
    type Gender,
    type HealthGoal,
} from "@/services/profileApi";
import { ProfileHeaderCard } from "@/components/profile/ProfileHeaderCard";
import { ManualCheckinCard } from "@/components/profile/ManualCheckinCard";
import { AgentAccessSection, type AgentItem } from "@/components/profile/AgentAccessSection";

const C = {
    bg: "#0A0A0A",
    card: "#141414",
    border: "#1E1E1E",
    text: "#F5F5F5",
    body: "#C8D1CC",
    muted: "#93A19A",
    accent: "#00E676",
} as const;

const activityOptions: ActivityLevel[] = [
    "sedentary",
    "lightly active",
    "moderately active",
    "very active",
];

const goalOptions: HealthGoal[] = [
    "lose weight",
    "maintain",
    "build muscle",
    "improve endurance",
];

const genderOptions: Gender[] = [
    "male",
    "female",
    "non-binary",
    "prefer not to say",
    "other",
];

function toLbs(kg: number): number {
    return kg * 2.20462;
}

function toKg(lbs: number): number {
    return lbs / 2.20462;
}

function cmToFeetInches(cm: number): { feet: number; inches: number } {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches - feet * 12);
    return { feet, inches };
}

function feetInchesToCm(feet: number, inches: number): number {
    return feet * 30.48 + inches * 2.54;
}

function getApiErrorMessage(error: any, fallback: string): string {
    const detail = error?.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
        return detail;
    }

    if (typeof error?.response?.data === "string" && error.response.data.trim()) {
        return error.response.data;
    }

    if (typeof error?.message === "string" && error.message.trim()) {
        return error.message;
    }

    return fallback;
}

function Chip({
    label,
    selected,
    onPress,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
        </Pressable>
    );
}

function Field({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
}: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    keyboardType?: "default" | "numeric";
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={C.muted}
                keyboardType={keyboardType}
            />
        </View>
    );
}

export default function ProfileScreen() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const healthData = useHealthStore((state) => state.healthData);
    const loadHealthData = useHealthStore((state) => state.loadHealthData);
    const isHealthInitialized = useHealthStore((state) => state.isInitialized);

    const {
        profile,
        isLoading,
        isSaving,
        profileCompletion,
        todayCheckinSubmitted,
        updateProfile,
        submitTodayCheckin,
    } = useProfileContext();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [age, setAge] = useState("");
    const [weight, setWeight] = useState("");
    const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
    const [heightCm, setHeightCm] = useState("");
    const [heightFeet, setHeightFeet] = useState("");
    const [heightInches, setHeightInches] = useState("");
    const [heightUnit, setHeightUnit] = useState<"cm" | "ft/in">("cm");
    const [gender, setGender] = useState<Gender | null>(null);
    const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
    const [goal, setGoal] = useState<HealthGoal | null>(null);
    const [hasAppleWatch, setHasAppleWatch] = useState(true);

    const [heartRate, setHeartRate] = useState("");
    const [sleepHours, setSleepHours] = useState("");
    const [steps, setSteps] = useState("");
    const [calories, setCalories] = useState("");
    const [mood, setMood] = useState(3);
    const [stress, setStress] = useState(3);
    const [submittingCheckin, setSubmittingCheckin] = useState(false);

    // Smoothly animate manual-checkin section when Apple Watch mode is toggled.
    const manualAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!profile) return;

        setName(profile.name ?? "");
        setEmail(profile.email ?? user?.email ?? "");
        setAge(profile.age ? String(profile.age) : "");
        setGender((profile.gender as Gender | null) ?? null);
        setActivityLevel((profile.activity_level as ActivityLevel | null) ?? null);
        setGoal((profile.goal as HealthGoal | null) ?? null);
        setHasAppleWatch(profile.has_apple_watch);

        if (typeof profile.weight === "number") {
            setWeight(weightUnit === "kg" ? profile.weight.toFixed(1) : toLbs(profile.weight).toFixed(1));
        } else {
            setWeight("");
        }

        if (typeof profile.height === "number") {
            setHeightCm(profile.height.toFixed(1));
            const converted = cmToFeetInches(profile.height);
            setHeightFeet(String(converted.feet));
            setHeightInches(String(converted.inches));
        } else {
            setHeightCm("");
            setHeightFeet("");
            setHeightInches("");
        }
    }, [profile, user?.email, weightUnit]);

    useEffect(() => {
        if (hasAppleWatch && !isHealthInitialized) {
            void loadHealthData();
        }
    }, [hasAppleWatch, isHealthInitialized, loadHealthData]);

    useEffect(() => {
        Animated.timing(manualAnim, {
            toValue: hasAppleWatch ? 0 : 1,
            duration: 220,
            useNativeDriver: false,
        }).start();
    }, [hasAppleWatch, manualAnim]);

    const manualAnimatedStyle = {
        opacity: manualAnim,
        maxHeight: manualAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 720],
        }),
        transform: [
            {
                translateY: manualAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                }),
            },
        ],
        overflow: "hidden" as const,
    };

    const saveProfileHandler = async () => {
        const parsedWeight = parseFloat(weight);
        const parsedAge = parseInt(age, 10);

        const weightKg = Number.isFinite(parsedWeight)
            ? weightUnit === "kg"
                ? parsedWeight
                : toKg(parsedWeight)
            : null;

        let heightValueCm: number | null = null;
        if (heightUnit === "cm") {
            const parsedCm = parseFloat(heightCm);
            heightValueCm = Number.isFinite(parsedCm) ? parsedCm : null;
        } else {
            const ft = parseFloat(heightFeet);
            const inch = parseFloat(heightInches);
            if (Number.isFinite(ft) || Number.isFinite(inch)) {
                heightValueCm = feetInchesToCm(Number.isFinite(ft) ? ft : 0, Number.isFinite(inch) ? inch : 0);
            }
        }

        try {
            await updateProfile({
                name: name.trim() || null,
                email: email.trim() || user?.email || null,
                weight: weightKg,
                height: heightValueCm,
                age: Number.isFinite(parsedAge) ? parsedAge : null,
                gender,
                activity_level: activityLevel,
                goal,
                has_apple_watch: hasAppleWatch,
            });
            Alert.alert("Saved", "Your profile has been updated.");
        } catch (error: any) {
            Alert.alert("Save failed", getApiErrorMessage(error, "Could not save your profile."));
        }
    };

    const submitManualDataHandler = async () => {
        const hr = parseFloat(heartRate);
        const sleep = parseFloat(sleepHours);
        const stepCount = parseInt(steps, 10);
        const parsedCalories = calories.trim() ? parseFloat(calories) : undefined;

        if (!Number.isFinite(hr) || !Number.isFinite(sleep) || !Number.isFinite(stepCount)) {
            Alert.alert("Missing fields", "Please enter heart rate, sleep hours, and steps.");
            return;
        }

        if (parsedCalories !== undefined && !Number.isFinite(parsedCalories)) {
            Alert.alert("Invalid calories", "Please enter a valid calories value or leave it empty.");
            return;
        }

        try {
            setSubmittingCheckin(true);
            const response = await submitTodayCheckin({
                heart_rate: hr,
                sleep_hours: sleep,
                steps: stepCount,
                calories: parsedCalories,
                mood,
                stress_level: stress,
            });

            Alert.alert(
                "Check-in submitted",
                `Physical state score: ${response.physical_state_score}/100`
            );
        } catch (error: any) {
            Alert.alert("Submission failed", getApiErrorMessage(error, "Could not submit daily data."));
        } finally {
            setSubmittingCheckin(false);
        }
    };

    const agentItems = useMemo<AgentItem[]>(() => {
        const hasGoalConfig = Boolean(goal && activityLevel);
        const manualActive = !hasAppleWatch && todayCheckinSubmitted;
        const watchActive = hasAppleWatch && Boolean(healthData);
        const isActiveForState = manualActive || watchActive;

        const base: AgentItem[] = [
            {
                key: "nutrition",
                title: "Nutrition Agent",
                description: "Open nutrition recommendations aligned with your profile and activity.",
                status: hasGoalConfig ? "Active" : "Not configured",
                onPress: () => router.push("/(tabs)/nutrition"),
            },
            {
                key: "mood",
                title: "Mood Agent",
                description: "View mood analysis and stress-recovery tips based on your check-ins.",
                status: isActiveForState ? "Active" : "Not configured",
                onPress: () => Alert.alert("Mood Agent", "Mood analysis screen can be connected next."),
            },
            {
                key: "fitness",
                title: "Fitness Agent",
                description: "Get workout recommendations from your physical state and activity data.",
                status: isActiveForState ? "Active" : "Not configured",
                onPress: () => Alert.alert("Fitness Agent", "Workout recommendations screen can be connected next."),
            },
        ];

        if (hasAppleWatch) {
            base.push({
                key: "health-system",
                title: "Health System",
                description: "Upload your Apple Watch export ZIP to sync biometric health data.",
                status: healthData ? "Active" : "Not configured",
                onPress: () => router.push("/(tabs)/health-upload"),
            });
        }

        return base;
    }, [goal, activityLevel, hasAppleWatch, todayCheckinSubmitted, healthData, router]);

    const handleAvatarPress = () => {
        Alert.alert("Avatar", "Avatar image picker can be connected next.");
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.screenTitle}>Profile</Text>

                <ProfileHeaderCard
                    name={name}
                    email={email}
                    completion={profileCompletion}
                    onPressAvatar={handleAvatarPress}
                />

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Personal Details</Text>
                    <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
                    <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" />

                    <View style={styles.rowGap}>
                        <Field
                            label={`Weight (${weightUnit})`}
                            value={weight}
                            onChangeText={setWeight}
                            placeholder="0"
                            keyboardType="numeric"
                        />
                        <View style={styles.unitRow}>
                            <Chip
                                label="kg"
                                selected={weightUnit === "kg"}
                                onPress={() => {
                                    if (weight.trim()) {
                                        const parsed = parseFloat(weight);
                                        if (Number.isFinite(parsed)) {
                                            setWeight(
                                                weightUnit === "lbs" ? toKg(parsed).toFixed(1) : parsed.toFixed(1)
                                            );
                                        }
                                    }
                                    setWeightUnit("kg");
                                }}
                            />
                            <Chip
                                label="lbs"
                                selected={weightUnit === "lbs"}
                                onPress={() => {
                                    if (weight.trim()) {
                                        const parsed = parseFloat(weight);
                                        if (Number.isFinite(parsed)) {
                                            setWeight(
                                                weightUnit === "kg" ? toLbs(parsed).toFixed(1) : parsed.toFixed(1)
                                            );
                                        }
                                    }
                                    setWeightUnit("lbs");
                                }}
                            />
                        </View>
                    </View>

                    <View style={styles.rowGap}>
                        {heightUnit === "cm" ? (
                            <Field
                                label="Height (cm)"
                                value={heightCm}
                                onChangeText={setHeightCm}
                                placeholder="0"
                                keyboardType="numeric"
                            />
                        ) : (
                            <View style={styles.heightRow}>
                                <View style={{ flex: 1 }}>
                                    <Field
                                        label="Height (ft)"
                                        value={heightFeet}
                                        onChangeText={setHeightFeet}
                                        placeholder="ft"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ width: 8 }} />
                                <View style={{ flex: 1 }}>
                                    <Field
                                        label="Height (in)"
                                        value={heightInches}
                                        onChangeText={setHeightInches}
                                        placeholder="in"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        )}

                        <View style={styles.unitRow}>
                            <Chip
                                label="cm"
                                selected={heightUnit === "cm"}
                                onPress={() => {
                                    const ft = parseFloat(heightFeet);
                                    const inch = parseFloat(heightInches);
                                    if (Number.isFinite(ft) || Number.isFinite(inch)) {
                                        setHeightCm(
                                            feetInchesToCm(Number.isFinite(ft) ? ft : 0, Number.isFinite(inch) ? inch : 0).toFixed(1)
                                        );
                                    }
                                    setHeightUnit("cm");
                                }}
                            />
                            <Chip
                                label="ft/in"
                                selected={heightUnit === "ft/in"}
                                onPress={() => {
                                    const cm = parseFloat(heightCm);
                                    if (Number.isFinite(cm)) {
                                        const converted = cmToFeetInches(cm);
                                        setHeightFeet(String(converted.feet));
                                        setHeightInches(String(converted.inches));
                                    }
                                    setHeightUnit("ft/in");
                                }}
                            />
                        </View>
                    </View>

                    <Field
                        label="Age"
                        value={age}
                        onChangeText={setAge}
                        placeholder="0"
                        keyboardType="numeric"
                    />

                    <View style={styles.field}>
                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.chipWrap}>
                            {genderOptions.map((item) => (
                                <Chip
                                    key={item}
                                    label={item}
                                    selected={gender === item}
                                    onPress={() => setGender(item)}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Activity level</Text>
                        <View style={styles.chipWrap}>
                            {activityOptions.map((item) => (
                                <Chip
                                    key={item}
                                    label={item}
                                    selected={activityLevel === item}
                                    onPress={() => setActivityLevel(item)}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Health goal</Text>
                        <View style={styles.chipWrap}>
                            {goalOptions.map((item) => (
                                <Chip key={item} label={item} selected={goal === item} onPress={() => setGoal(item)} />
                            ))}
                        </View>
                    </View>

                    <View style={styles.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toggleTitle}>I don&apos;t have Apple Watch</Text>
                            <Text style={styles.toggleSubtitle}>
                                Enable manual mode to submit your daily health data yourself.
                            </Text>
                        </View>
                        <Switch
                            value={!hasAppleWatch}
                            onValueChange={(value) => setHasAppleWatch(!value)}
                            thumbColor={C.accent}
                            trackColor={{ false: "#2D2D2D", true: "#194E33" }}
                        />
                    </View>

                    <Pressable style={styles.saveButton} onPress={saveProfileHandler} disabled={isSaving || isLoading}>
                        <Text style={styles.saveButtonText}>{isSaving ? "Saving..." : "Save"}</Text>
                    </Pressable>
                </View>

                <Animated.View style={manualAnimatedStyle}>
                    {!hasAppleWatch ? (
                        <ManualCheckinCard
                            heartRate={heartRate}
                            sleepHours={sleepHours}
                            steps={steps}
                            calories={calories}
                            mood={mood}
                            stress={stress}
                            submitting={submittingCheckin}
                            onHeartRateChange={setHeartRate}
                            onSleepChange={setSleepHours}
                            onStepsChange={setSteps}
                            onCaloriesChange={setCalories}
                            onMoodChange={setMood}
                            onStressChange={setStress}
                            onSubmit={submitManualDataHandler}
                        />
                    ) : null}
                </Animated.View>

                {todayCheckinSubmitted && !hasAppleWatch ? (
                    <Text style={styles.checkinDone}>Today&apos;s check-in has been submitted.</Text>
                ) : null}

                <AgentAccessSection items={agentItems} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: C.bg,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 30,
        gap: 12,
    },
    screenTitle: {
        color: C.text,
        fontSize: 28,
        fontWeight: "800",
    },
    card: {
        backgroundColor: C.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        padding: 14,
        gap: 10,
    },
    cardTitle: {
        color: C.text,
        fontSize: 18,
        fontWeight: "700",
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
        backgroundColor: "#111111",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        color: C.text,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },
    rowGap: {
        gap: 8,
    },
    unitRow: {
        flexDirection: "row",
        gap: 8,
        flexWrap: "wrap",
    },
    chipWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: "#111111",
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    chipSelected: {
        borderColor: C.accent,
        backgroundColor: "#0D2015",
    },
    chipText: {
        color: C.body,
        fontSize: 12,
        fontWeight: "600",
    },
    chipTextSelected: {
        color: C.accent,
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
    },
    toggleTitle: {
        color: C.text,
        fontSize: 14,
        fontWeight: "700",
    },
    toggleSubtitle: {
        color: C.muted,
        fontSize: 12,
        marginTop: 2,
    },
    saveButton: {
        marginTop: 4,
        backgroundColor: C.accent,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 42,
    },
    saveButtonText: {
        color: "#05361D",
        fontSize: 14,
        fontWeight: "800",
    },
    heightRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    checkinDone: {
        color: C.accent,
        fontSize: 12,
        fontWeight: "600",
    },
});
