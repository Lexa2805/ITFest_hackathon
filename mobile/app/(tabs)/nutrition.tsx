import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";

import { MacroBar } from "@/components/nutrition/MacroBar";
import { MealPlanCard } from "@/components/nutrition/MealPlanCard";
import { TabButton } from "@/components/nutrition/TabButton";
import {
    BarcodeNutritionProduct,
    DailySummaryResponse,
    MealIngredient,
    MealLogRequest,
    MealPlanResponse,
    PlannedMeal,
    generateMealPlan,
    getDailySummary,
    getLatestMealPlan,
    lookupFoodByBarcode,
    logMeal,
} from "@/services/nutritionApi";
import {
    NutritionFridgeIngredient,
    addNutritionFridgeIngredient,
    deleteNutritionFridgeIngredient,
    getNutritionFridgeIngredients,
} from "@/services/fridgeApi";
import { useAuthStore } from "@/stores/authStore";

const C = {
    bg: "#0A0A0A",
    card: "#141414",
    softCard: "#121A15",
    border: "#1E1E1E",
    text: "#F5F5F5",
    body: "#C8D1CC",
    muted: "#93A19A",
    accent: "#00E676",
    danger: "#FF6B6B",
} as const;

type NutritionTab = "plan" | "fridge" | "log";
type MealMoment = "breakfast" | "lunch" | "dinner" | "snack";

interface MealFormState {
    meal_name: string;
    ingredients: MealIngredient[];
    kcal: string;
    protein: string;
    fat: string;
    carbs: string;
    time_of_day: MealMoment;
}

const INITIAL_FORM: MealFormState = {
    meal_name: "",
    ingredients: [],
    kcal: "",
    protein: "",
    fat: "",
    carbs: "",
    time_of_day: "breakfast",
};

export default function NutritionScreen() {
    const user = useAuthStore((state) => state.user);
    const userId = user?.id ?? "";

    const [activeTab, setActiveTab] = useState<NutritionTab>("plan");
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [mealPlan, setMealPlan] = useState<MealPlanResponse | null>(null);
    const [dailySummary, setDailySummary] = useState<DailySummaryResponse | null>(null);
    const [fridgeItems, setFridgeItems] = useState<NutritionFridgeIngredient[]>([]);

    const [showAddIngredientSheet, setShowAddIngredientSheet] = useState(false);
    const [newIngredientName, setNewIngredientName] = useState("");
    const [newIngredientQuantity, setNewIngredientQuantity] = useState("100");
    const [newIngredientUnit, setNewIngredientUnit] = useState("g");

    const [showLogMealSheet, setShowLogMealSheet] = useState(false);
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [barcodeValue, setBarcodeValue] = useState("");
    const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
    const [scannerLocked, setScannerLocked] = useState(false);
    const [mealForm, setMealForm] = useState<MealFormState>(INITIAL_FORM);
    const [ingredientDraftName, setIngredientDraftName] = useState("");
    const [ingredientDraftGrams, setIngredientDraftGrams] = useState("0");
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();

    const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

    const plannedMealsFlat = useMemo(() => {
        if (!mealPlan) return [] as PlannedMeal[];
        return [
            ...mealPlan.breakfast,
            ...mealPlan.lunch,
            ...mealPlan.dinner,
            ...mealPlan.snacks,
        ];
    }, [mealPlan]);

    const loadAll = React.useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setError(null);
        setLoading(true);
        try {
            const [summaryResult, fridgeResult, planResult] = await Promise.allSettled([
                getDailySummary(userId, todayIso),
                getNutritionFridgeIngredients(userId),
                getLatestMealPlan(),
            ]);

            if (summaryResult.status === "fulfilled") {
                setDailySummary(summaryResult.value);
            }

            if (fridgeResult.status === "fulfilled") {
                setFridgeItems(fridgeResult.value);
            }

            if (planResult.status === "fulfilled") {
                setMealPlan(planResult.value);
            }
        } catch (unknownError) {
            setError("Failed to load nutrition data.");
            console.error(unknownError);
        } finally {
            setLoading(false);
        }
    }, [todayIso, userId]);

    React.useEffect(() => {
        void loadAll();
    }, [loadAll]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    const handleGeneratePlan = async () => {
        if (!userId) return;

        const kcalTarget = dailySummary?.kcal.target || 2000;
        const proteinTarget = dailySummary?.protein.target || 130;
        const fatTarget = dailySummary?.fat.target || 70;
        const carbsTarget = dailySummary?.carbs.target || 220;

        try {
            const generated = await generateMealPlan({
                daily_kcal_target: kcalTarget,
                macro_targets: {
                    protein_g: proteinTarget,
                    fat_g: fatTarget,
                    carbs_g: carbsTarget,
                },
            });
            setMealPlan(generated);
        } catch (unknownError) {
            setError("Failed to generate meal plan.");
            console.error(unknownError);
        }
    };

    const handleAddIngredient = async () => {
        if (!userId || !newIngredientName.trim()) return;

        try {
            const quantity = Number(newIngredientQuantity);
            if (!Number.isFinite(quantity) || quantity <= 0) {
                return;
            }

            await addNutritionFridgeIngredient({
                name: newIngredientName.trim(),
                quantity,
                unit: newIngredientUnit,
            });
            setNewIngredientName("");
            setNewIngredientQuantity("100");
            setNewIngredientUnit("g");
            setShowAddIngredientSheet(false);
            setFridgeItems(await getNutritionFridgeIngredients(userId));
        } catch (unknownError) {
            setError("Failed to add ingredient.");
            console.error(unknownError);
        }
    };

    const handleDeleteIngredient = async (ingredientId: string) => {
        if (!userId) return;
        try {
            await deleteNutritionFridgeIngredient(userId, ingredientId);
            setFridgeItems(await getNutritionFridgeIngredients(userId));
        } catch (unknownError) {
            setError("Failed to delete ingredient.");
            console.error(unknownError);
        }
    };

    const handleAddDraftIngredient = () => {
        const grams = Number(ingredientDraftGrams);
        if (!ingredientDraftName.trim() || !Number.isFinite(grams) || grams < 0) return;

        setMealForm((current) => ({
            ...current,
            ingredients: [
                ...current.ingredients,
                {
                    name: ingredientDraftName.trim(),
                    grams,
                },
            ],
        }));
        setIngredientDraftName("");
        setIngredientDraftGrams("0");
    };

    const handlePickFromPlan = (meal: PlannedMeal) => {
        setMealForm({
            meal_name: meal.meal_name,
            ingredients: meal.ingredients,
            kcal: String(meal.kcal),
            protein: String(meal.protein_g),
            fat: String(meal.fat_g),
            carbs: String(meal.carbs_g),
            time_of_day: "dinner",
        });
    };

    const handleLogMeal = async () => {
        if (!userId || !mealForm.meal_name.trim()) return;

        const payload: MealLogRequest = {
            meal_name: mealForm.meal_name,
            ingredients: mealForm.ingredients,
            kcal: Number(mealForm.kcal || 0),
            protein: Number(mealForm.protein || 0),
            fat: Number(mealForm.fat || 0),
            carbs: Number(mealForm.carbs || 0),
            time_of_day: mealForm.time_of_day,
            date: todayIso,
        };

        try {
            await logMeal(payload);
            setMealForm(INITIAL_FORM);
            setShowLogMealSheet(false);
            setDailySummary(await getDailySummary(userId, todayIso));
        } catch (unknownError) {
            setError("Failed to log meal.");
            console.error(unknownError);
        }
    };

    const applyBarcodeProductToMealForm = (product: BarcodeNutritionProduct, grams: number = 100) => {
        const ratio = grams / 100;
        setMealForm((current) => ({
            ...current,
            meal_name: product.productName,
            ingredients: [
                ...current.ingredients,
                {
                    name: product.productName,
                    grams,
                },
            ],
            kcal: String(Math.round(product.kcalPer100g * ratio)),
            protein: String(Math.round(product.proteinPer100g * ratio)),
            fat: String(Math.round(product.fatPer100g * ratio)),
            carbs: String(Math.round(product.carbsPer100g * ratio)),
        }));
    };

    const handleLookupBarcode = async (inputBarcode?: string) => {
        const targetBarcode = (inputBarcode ?? barcodeValue).trim();
        if (!targetBarcode) {
            setError("Enter or scan a barcode first.");
            return;
        }

        setBarcodeLookupLoading(true);
        setError(null);
        try {
            const product = await lookupFoodByBarcode(targetBarcode);
            applyBarcodeProductToMealForm(product, 100);
            setBarcodeValue(targetBarcode);
            setShowBarcodeScanner(false);
        } catch (lookupError: any) {
            const message = typeof lookupError?.message === "string"
                ? lookupError.message
                : "Failed to resolve product by barcode.";
            setError(message);
        } finally {
            setBarcodeLookupLoading(false);
            setScannerLocked(false);
        }
    };

    const openScanner = async () => {
        if (Platform.OS === "web") {
            setError("Camera scanning is not available on web. Enter barcode manually.");
            return;
        }

        if (!cameraPermission?.granted) {
            const permission = await requestCameraPermission();
            if (!permission.granted) {
                Alert.alert("Permission required", "Camera permission is required to scan barcodes.");
                return;
            }
        }

        setScannerLocked(false);
        setShowBarcodeScanner(true);
    };

    const onBarcodeScanned = ({ data }: BarcodeScanningResult) => {
        if (scannerLocked) return;
        setScannerLocked(true);
        setBarcodeValue(data);
        void handleLookupBarcode(data);
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.safeArea, styles.loadingState]}>
                <ActivityIndicator color={C.accent} size="large" />
            </SafeAreaView>
        );
    }

    const consumedKcal = dailySummary?.kcal.consumed ?? 0;
    const targetKcal = dailySummary?.kcal.target ?? 0;
    const progressRatio = targetKcal > 0 ? Math.min(consumedKcal / targetKcal, 1) : 0;

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.screen}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
            >
                <Text style={styles.title}>Nutrition</Text>
                <Text style={styles.subtitle}>Meal planning, fridge inventory, and daily food tracking</Text>

                <View style={styles.tabRow}>
                    <TabButton label="My Plan" active={activeTab === "plan"} onPress={() => setActiveTab("plan")} />
                    <TabButton label="My Fridge" active={activeTab === "fridge"} onPress={() => setActiveTab("fridge")} />
                    <TabButton label="Food Log" active={activeTab === "log"} onPress={() => setActiveTab("log")} />
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                {activeTab === "plan" ? (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Daily Energy Progress</Text>
                            <View style={styles.progressWrap}>
                                <View style={styles.ringOuter}>
                                    <View style={styles.ringInner}>
                                        <Text style={styles.progressValue}>{Math.round(progressRatio * 100)}%</Text>
                                        <Text style={styles.progressLabel}>kcal</Text>
                                    </View>
                                </View>
                                <Text style={styles.summaryText}>
                                    {consumedKcal} / {targetKcal} kcal consumed
                                </Text>
                            </View>
                            <View style={styles.macroWrap}>
                                <MacroBar
                                    label="Protein"
                                    consumed={dailySummary?.protein.consumed ?? 0}
                                    target={dailySummary?.protein.target ?? 0}
                                />
                                <MacroBar
                                    label="Fat"
                                    consumed={dailySummary?.fat.consumed ?? 0}
                                    target={dailySummary?.fat.target ?? 0}
                                />
                                <MacroBar
                                    label="Carbs"
                                    consumed={dailySummary?.carbs.consumed ?? 0}
                                    target={dailySummary?.carbs.target ?? 0}
                                />
                            </View>
                        </View>

                        <Pressable style={styles.primaryButton} onPress={handleGeneratePlan}>
                            <Text style={styles.primaryButtonText}>Generate new plan</Text>
                        </Pressable>

                        <MealPlanCard mealType="breakfast" meals={mealPlan?.breakfast ?? []} />
                        <MealPlanCard mealType="lunch" meals={mealPlan?.lunch ?? []} />
                        <MealPlanCard mealType="dinner" meals={mealPlan?.dinner ?? []} />
                        <MealPlanCard mealType="snacks" meals={mealPlan?.snacks ?? []} />
                    </>
                ) : null}

                {activeTab === "fridge" ? (
                    <>
                        <Pressable style={styles.primaryButton} onPress={() => setShowAddIngredientSheet(true)}>
                            <Text style={styles.primaryButtonText}>Add ingredient</Text>
                        </Pressable>

                        <Pressable style={styles.secondaryButton} onPress={handleGeneratePlan}>
                            <Text style={styles.secondaryButtonText}>Generate meal plan from fridge</Text>
                        </Pressable>

                        {fridgeItems.map((ingredient) => (
                            <Swipeable
                                key={ingredient.id}
                                renderRightActions={() => (
                                    <Pressable
                                        style={styles.deleteAction}
                                        onPress={() => {
                                            void handleDeleteIngredient(ingredient.id);
                                        }}
                                    >
                                        <Text style={styles.deleteActionText}>Delete</Text>
                                    </Pressable>
                                )}
                            >
                                <View style={styles.ingredientRow}>
                                    <Text style={styles.ingredientName}>{ingredient.ingredient_name}</Text>
                                    <Text style={styles.ingredientMeta}>
                                        {ingredient.quantity} {ingredient.unit}
                                    </Text>
                                </View>
                            </Swipeable>
                        ))}

                        {fridgeItems.length === 0 ? <Text style={styles.emptyText}>No ingredients in your fridge yet.</Text> : null}
                    </>
                ) : null}

                {activeTab === "log" ? (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Daily Summary</Text>
                            <Text style={styles.summaryText}>
                                {dailySummary?.kcal.consumed ?? 0} / {dailySummary?.kcal.target ?? 0} kcal · {dailySummary?.status ?? "On track"}
                            </Text>
                            <View style={styles.macroGrid}>
                                <View style={styles.macroRing}>
                                    <Text style={styles.macroRingValue}>{dailySummary?.protein.consumed ?? 0}</Text>
                                    <Text style={styles.macroRingLabel}>Protein</Text>
                                </View>
                                <View style={styles.macroRing}>
                                    <Text style={styles.macroRingValue}>{dailySummary?.fat.consumed ?? 0}</Text>
                                    <Text style={styles.macroRingLabel}>Fat</Text>
                                </View>
                                <View style={styles.macroRing}>
                                    <Text style={styles.macroRingValue}>{dailySummary?.carbs.consumed ?? 0}</Text>
                                    <Text style={styles.macroRingLabel}>Carbs</Text>
                                </View>
                            </View>
                        </View>

                        <Pressable style={styles.primaryButton} onPress={() => setShowLogMealSheet(true)}>
                            <Text style={styles.primaryButtonText}>Log a meal</Text>
                        </Pressable>

                        {(["breakfast", "lunch", "dinner", "snack"] as const).map((timeOfDay) => {
                            const meals = (dailySummary?.meals ?? []).filter((meal) => meal.time_of_day === timeOfDay);
                            return (
                                <View style={styles.card} key={timeOfDay}>
                                    <Text style={styles.cardTitle}>{timeOfDay}</Text>
                                    {meals.length === 0 ? (
                                        <Text style={styles.emptyText}>No meal logged.</Text>
                                    ) : (
                                        meals.map((meal) => (
                                            <View key={meal.id} style={styles.loggedMealRow}>
                                                <Text style={styles.loggedMealName}>{meal.meal_name}</Text>
                                                <Text style={styles.loggedMealMeta}>
                                                    {meal.kcal} kcal · P {meal.protein} · F {meal.fat} · C {meal.carbs}
                                                </Text>
                                            </View>
                                        ))
                                    )}
                                </View>
                            );
                        })}
                    </>
                ) : null}
            </ScrollView>

            <Modal visible={showAddIngredientSheet} transparent animationType="slide" onRequestClose={() => setShowAddIngredientSheet(false)}>
                <View style={styles.sheetBackdrop}>
                    <View style={styles.sheetCard}>
                        <Text style={styles.sheetTitle}>Add Ingredient</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ingredient name"
                            placeholderTextColor={C.muted}
                            value={newIngredientName}
                            onChangeText={setNewIngredientName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Quantity"
                            placeholderTextColor={C.muted}
                            keyboardType="numeric"
                            value={newIngredientQuantity}
                            onChangeText={setNewIngredientQuantity}
                        />
                        <View style={styles.unitRow}>
                            {(["g", "ml", "pieces"] as const).map((unit) => (
                                <Pressable
                                    key={unit}
                                    style={[styles.unitChip, newIngredientUnit === unit && styles.unitChipActive]}
                                    onPress={() => setNewIngredientUnit(unit)}
                                >
                                    <Text style={[styles.unitChipText, newIngredientUnit === unit && styles.unitChipTextActive]}>{unit}</Text>
                                </Pressable>
                            ))}
                        </View>
                        <Pressable style={styles.primaryButton} onPress={handleAddIngredient}>
                            <Text style={styles.primaryButtonText}>Save ingredient</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <Modal visible={showLogMealSheet} transparent animationType="slide" onRequestClose={() => setShowLogMealSheet(false)}>
                <View style={styles.sheetBackdrop}>
                    <ScrollView style={styles.sheetCard} contentContainerStyle={styles.sheetContent}>
                        <Text style={styles.sheetTitle}>Log a Meal</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Meal name"
                            placeholderTextColor={C.muted}
                            value={mealForm.meal_name}
                            onChangeText={(value) => setMealForm((current) => ({ ...current, meal_name: value }))}
                        />

                        <Text style={styles.fieldLabel}>Scan product barcode or enter manually</Text>
                        <View style={styles.rowInputs}>
                            <TextInput
                                style={[styles.input, styles.rowInput]}
                                placeholder="Barcode"
                                placeholderTextColor={C.muted}
                                value={barcodeValue}
                                onChangeText={setBarcodeValue}
                                keyboardType="numeric"
                            />
                            <Pressable
                                style={[styles.secondaryButton, styles.inlineButton]}
                                onPress={() => {
                                    void handleLookupBarcode();
                                }}
                                disabled={barcodeLookupLoading}
                            >
                                <Text style={styles.secondaryButtonText}>{barcodeLookupLoading ? "Looking up..." : "Use barcode"}</Text>
                            </Pressable>
                        </View>
                        <Pressable style={styles.secondaryButton} onPress={() => void openScanner()}>
                            <Text style={styles.secondaryButtonText}>Scan barcode with camera</Text>
                        </Pressable>

                        <Text style={styles.fieldLabel}>Pick from today's plan</Text>
                        <View style={styles.planPickWrap}>
                            {plannedMealsFlat.map((meal, index) => (
                                <Pressable key={`${meal.meal_name}-${index}`} style={styles.planPickChip} onPress={() => handlePickFromPlan(meal)}>
                                    <Text style={styles.planPickText}>{meal.meal_name}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>Add ingredients one by one</Text>
                        <View style={styles.rowInputs}>
                            <TextInput
                                style={[styles.input, styles.rowInput]}
                                placeholder="Name"
                                placeholderTextColor={C.muted}
                                value={ingredientDraftName}
                                onChangeText={setIngredientDraftName}
                            />
                            <TextInput
                                style={[styles.input, styles.rowInput]}
                                placeholder="Grams"
                                placeholderTextColor={C.muted}
                                keyboardType="numeric"
                                value={ingredientDraftGrams}
                                onChangeText={setIngredientDraftGrams}
                            />
                        </View>
                        <Pressable style={styles.secondaryButton} onPress={handleAddDraftIngredient}>
                            <Text style={styles.secondaryButtonText}>Add ingredient</Text>
                        </Pressable>

                        {mealForm.ingredients.map((ingredient, index) => (
                            <Text key={`${ingredient.name}-${index}`} style={styles.ingredientMeta}>
                                • {ingredient.name} — {ingredient.grams}g
                            </Text>
                        ))}

                        <View style={styles.rowInputs}>
                            <TextInput
                                style={[styles.input, styles.rowInput]}
                                placeholder="kcal"
                                placeholderTextColor={C.muted}
                                keyboardType="numeric"
                                value={mealForm.kcal}
                                onChangeText={(value) => setMealForm((current) => ({ ...current, kcal: value }))}
                            />
                            <TextInput
                                style={[styles.input, styles.rowInput]}
                                placeholder="Protein"
                                placeholderTextColor={C.muted}
                                keyboardType="numeric"
                                value={mealForm.protein}
                                onChangeText={(value) => setMealForm((current) => ({ ...current, protein: value }))}
                            />
                            <TextInput
                                style={[styles.input, styles.rowInput]}
                                placeholder="Fat"
                                placeholderTextColor={C.muted}
                                keyboardType="numeric"
                                value={mealForm.fat}
                                onChangeText={(value) => setMealForm((current) => ({ ...current, fat: value }))}
                            />
                            <TextInput
                                style={[styles.input, styles.rowInput]}
                                placeholder="Carbs"
                                placeholderTextColor={C.muted}
                                keyboardType="numeric"
                                value={mealForm.carbs}
                                onChangeText={(value) => setMealForm((current) => ({ ...current, carbs: value }))}
                            />
                        </View>

                        <Text style={styles.fieldLabel}>Time of day</Text>
                        <View style={styles.unitRow}>
                            {(["breakfast", "lunch", "dinner", "snack"] as const).map((time) => (
                                <Pressable
                                    key={time}
                                    style={[styles.unitChip, mealForm.time_of_day === time && styles.unitChipActive]}
                                    onPress={() => setMealForm((current) => ({ ...current, time_of_day: time }))}
                                >
                                    <Text style={[styles.unitChipText, mealForm.time_of_day === time && styles.unitChipTextActive]}>
                                        {time}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable style={styles.primaryButton} onPress={handleLogMeal}>
                            <Text style={styles.primaryButtonText}>Save meal log</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </Modal>

            <Modal visible={showBarcodeScanner} transparent animationType="slide" onRequestClose={() => setShowBarcodeScanner(false)}>
                <View style={styles.sheetBackdrop}>
                    <View style={styles.scannerCard}>
                        <Text style={styles.sheetTitle}>Scan barcode</Text>
                        <Text style={styles.summaryText}>Align the product barcode inside the frame.</Text>
                        <View style={styles.scannerFrame}>
                            <CameraView
                                style={styles.scannerCamera}
                                facing="back"
                                onBarcodeScanned={onBarcodeScanned}
                                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
                            />
                        </View>
                        <Pressable style={styles.secondaryButton} onPress={() => setShowBarcodeScanner(false)}>
                            <Text style={styles.secondaryButtonText}>Close scanner</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: C.bg,
    },
    loadingState: {
        justifyContent: "center",
        alignItems: "center",
    },
    screen: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    title: {
        color: C.text,
        fontSize: 30,
        fontWeight: "800",
    },
    subtitle: {
        color: C.body,
        fontSize: 13,
    },
    tabRow: {
        flexDirection: "row",
        gap: 8,
    },
    error: {
        color: C.danger,
        fontSize: 13,
    },
    card: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        padding: 14,
        gap: 10,
    },
    cardTitle: {
        color: C.text,
        fontSize: 15,
        fontWeight: "700",
        textTransform: "capitalize",
    },
    progressWrap: {
        alignItems: "center",
        gap: 8,
    },
    ringOuter: {
        width: 120,
        height: 120,
        borderRadius: 999,
        backgroundColor: C.softCard,
        borderWidth: 8,
        borderColor: C.accent,
        alignItems: "center",
        justifyContent: "center",
    },
    ringInner: {
        width: 88,
        height: 88,
        borderRadius: 999,
        backgroundColor: C.card,
        alignItems: "center",
        justifyContent: "center",
    },
    progressValue: {
        color: C.text,
        fontSize: 22,
        fontWeight: "700",
    },
    progressLabel: {
        color: C.muted,
        fontSize: 12,
    },
    summaryText: {
        color: C.body,
        fontSize: 13,
    },
    macroWrap: {
        gap: 10,
    },
    primaryButton: {
        backgroundColor: C.accent,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    primaryButtonText: {
        color: "#0A0A0A",
        fontSize: 14,
        fontWeight: "700",
    },
    secondaryButton: {
        backgroundColor: C.softCard,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 12,
        paddingVertical: 11,
        alignItems: "center",
    },
    secondaryButtonText: {
        color: C.accent,
        fontSize: 13,
        fontWeight: "600",
    },
    ingredientRow: {
        backgroundColor: C.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.border,
        padding: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    ingredientName: {
        color: C.text,
        fontSize: 14,
        fontWeight: "600",
    },
    ingredientMeta: {
        color: C.muted,
        fontSize: 12,
    },
    deleteAction: {
        backgroundColor: C.danger,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        width: 90,
        marginBottom: 8,
    },
    deleteActionText: {
        color: C.text,
        fontWeight: "700",
    },
    emptyText: {
        color: C.muted,
        fontSize: 13,
    },
    macroGrid: {
        flexDirection: "row",
        gap: 10,
    },
    macroRing: {
        flex: 1,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: C.accent,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        backgroundColor: C.softCard,
    },
    macroRingValue: {
        color: C.text,
        fontSize: 16,
        fontWeight: "700",
    },
    macroRingLabel: {
        color: C.muted,
        fontSize: 11,
    },
    loggedMealRow: {
        gap: 2,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    loggedMealName: {
        color: C.text,
        fontSize: 14,
        fontWeight: "600",
    },
    loggedMealMeta: {
        color: C.body,
        fontSize: 12,
    },
    sheetBackdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheetCard: {
        backgroundColor: C.card,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        padding: 16,
        maxHeight: "85%",
    },
    sheetContent: {
        gap: 10,
        paddingBottom: 16,
    },
    sheetTitle: {
        color: C.text,
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#121212",
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: C.text,
        fontSize: 14,
    },
    unitRow: {
        flexDirection: "row",
        gap: 8,
        flexWrap: "wrap",
    },
    unitChip: {
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#121212",
    },
    unitChipActive: {
        borderColor: C.accent,
        backgroundColor: C.softCard,
    },
    unitChipText: {
        color: C.muted,
        fontSize: 12,
        fontWeight: "600",
    },
    unitChipTextActive: {
        color: C.accent,
    },
    fieldLabel: {
        color: C.body,
        fontSize: 13,
        fontWeight: "600",
        marginTop: 4,
    },
    planPickWrap: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    planPickChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: C.border,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: C.softCard,
    },
    planPickText: {
        color: C.accent,
        fontSize: 12,
    },
    rowInputs: {
        flexDirection: "row",
        gap: 8,
    },
    rowInput: {
        flex: 1,
    },
    inlineButton: {
        paddingHorizontal: 10,
        justifyContent: "center",
    },
    scannerCard: {
        backgroundColor: C.card,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        padding: 16,
        gap: 10,
    },
    scannerFrame: {
        height: 340,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: "#000",
    },
    scannerCamera: {
        flex: 1,
    },
});
