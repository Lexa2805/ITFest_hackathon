/**
 * Nutrition API — typed wrappers for every /nutrition endpoint.
 */

import api from "./api";

const OPEN_FOOD_FACTS_API = "https://world.openfoodfacts.org/api/v2/product";

// ── Types ────────────────────────────────────────────────────

export interface NutritionGoalCreate {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal_type: string;
}

export interface NutritionGoalResponse {
  id: string;
  user_id: string;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  goal_type: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface RecipeResponse {
  id: string;
  user_id: string;
  name: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  prep_time_minutes: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  generated_at: string;
}

export interface MealLog {
  id: string;
  recipe_id: string;
  recipe_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
}

export interface DailyLogResponse {
  date: string;
  meals: MealLog[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  goal_calories: number;
  goal_protein_g: number;
  goal_carbs_g: number;
  goal_fat_g: number;
}

export interface ShoppingListItem {
  name: string;
  quantity_needed: number;
  unit: string;
  category: string;
}

export interface ShoppingListResponse {
  id: string;
  user_id: string;
  items: ShoppingListItem[];
  status: string;
  generated_at: string;
}

export interface CalorieCalculationRequest {
  weight: number;
  height: number;
  age: number;
  gender: "male" | "female";
  activity_level: "sedentary" | "lightly active" | "moderately active" | "very active";
  goal: "lose weight" | "maintain" | "build muscle" | "improve endurance";
}

export interface CalorieCalculationResponse {
  bmr: number;
  tdee: number;
  daily_kcal_target: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface MealIngredient {
  name: string;
  grams: number;
}

export interface PlannedMeal {
  meal_name: string;
  ingredients: MealIngredient[];
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface MealPlanResponse {
  breakfast: PlannedMeal[];
  lunch: PlannedMeal[];
  dinner: PlannedMeal[];
  snacks: PlannedMeal[];
  total_kcal: number;
  total_protein_g: number;
  total_fat_g: number;
  total_carbs_g: number;
}

export interface MealPlanRequest {
  daily_kcal_target: number;
  macro_targets: {
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
}

export interface MealLogRequest {
  meal_name: string;
  ingredients: MealIngredient[];
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  time_of_day: "breakfast" | "lunch" | "dinner" | "snack";
  date: string;
}

export interface MealLogResponse {
  id: string;
  user_id: string;
  date: string;
  meal_name: string;
  ingredients_json: MealIngredient[];
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  time_of_day: "breakfast" | "lunch" | "dinner" | "snack";
  created_at: string;
}

export interface DailySummaryResponse {
  date: string;
  meals: MealLogResponse[];
  kcal: { consumed: number; target: number };
  protein: { consumed: number; target: number };
  fat: { consumed: number; target: number };
  carbs: { consumed: number; target: number };
  remaining_kcal: number;
  status: "On track" | "Under eating" | "Over eating";
}

export interface BarcodeNutritionProduct {
  barcode: string;
  productName: string;
  brand?: string;
  kcalPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// ── API calls ────────────────────────────────────────────────

export async function setNutritionGoals(
  goals: NutritionGoalCreate
): Promise<NutritionGoalResponse> {
  const { data } = await api.post<NutritionGoalResponse>(
    "/nutrition/goals",
    goals
  );
  return data;
}

export async function getNutritionGoals(): Promise<NutritionGoalResponse> {
  const { data } = await api.get<NutritionGoalResponse>("/nutrition/goals");
  return data;
}

export async function suggestRecipes(forceRegenerate: boolean = false): Promise<RecipeResponse[]> {
  const { data } = await api.post<RecipeResponse[]>(
    "/nutrition/recipes/suggest",
    {},
    {
      params: { force_regenerate: forceRegenerate },
      timeout: 60_000
    }
  );
  return data;
}

export async function listRecipes(limit: number = 10): Promise<RecipeResponse[]> {
  const { data } = await api.get<RecipeResponse[]>("/nutrition/recipes", {
    params: { limit }
  });
  return data;
}

export async function logRecipe(recipeId: string): Promise<DailyLogResponse> {
  const { data } = await api.post<DailyLogResponse>(
    `/nutrition/recipes/${recipeId}/log`
  );
  return data;
}

export async function getTodayLog(): Promise<DailyLogResponse> {
  const { data } = await api.get<DailyLogResponse>("/nutrition/log/today");
  return data;
}

export async function getLogHistory(): Promise<DailyLogResponse[]> {
  const { data } = await api.get<DailyLogResponse[]>("/nutrition/log/history");
  return data;
}

export async function generateShoppingList(forceRegenerate: boolean = false): Promise<ShoppingListResponse> {
  const { data } = await api.post<ShoppingListResponse>(
    "/nutrition/shopping-list/generate",
    {},
    {
      params: { force_regenerate: forceRegenerate },
      timeout: 60_000
    }
  );
  return data;
}

export async function getLatestShoppingList(): Promise<ShoppingListResponse> {
  const { data } = await api.get<ShoppingListResponse>(
    "/nutrition/shopping-list/latest"
  );
  return data;
}

export async function forwardShoppingList(
  listId: string
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(
    `/nutrition/shopping-list/${listId}/forward`
  );
  return data;
}

export async function calculateCalories(
  payload: CalorieCalculationRequest
): Promise<CalorieCalculationResponse> {
  const { data } = await api.post<CalorieCalculationResponse>(
    "/calculate-calories",
    payload
  );
  return data;
}

export async function generateMealPlan(
  payload: MealPlanRequest
): Promise<MealPlanResponse> {
  const { data } = await api.post<MealPlanResponse>(
    "/nutrition-agent/meal-plan",
    payload,
    { timeout: 60_000 }
  );
  return data;
}

export async function getLatestMealPlan(): Promise<MealPlanResponse> {
  const { data } = await api.get<MealPlanResponse>("/nutrition-agent/meal-plan/latest");
  return data;
}

export async function logMeal(payload: MealLogRequest): Promise<MealLogResponse> {
  const { data } = await api.post<MealLogResponse>("/nutrition-agent/log-meal", payload);
  return data;
}

export async function getDailySummary(userId: string, date: string): Promise<DailySummaryResponse> {
  const { data } = await api.get<DailySummaryResponse>(`/nutrition-agent/daily-summary/${userId}/${date}`);
  return data;
}

export async function lookupFoodByBarcode(barcode: string): Promise<BarcodeNutritionProduct> {
  const normalized = barcode.trim();
  if (!normalized) {
    throw new Error("Barcode is required.");
  }

  const response = await fetch(`${OPEN_FOOD_FACTS_API}/${encodeURIComponent(normalized)}.json`);
  if (!response.ok) {
    throw new Error("Could not fetch product for this barcode.");
  }

  const payload = await response.json();
  if (payload?.status !== 1 || !payload?.product) {
    throw new Error("Product not found for this barcode.");
  }

  const product = payload.product;
  const nutriments = product.nutriments ?? {};

  const kcalPer100g = toNumber(
    nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"]
  );

  return {
    barcode: normalized,
    productName: String(product.product_name ?? "Unknown product"),
    brand: product.brands ? String(product.brands) : undefined,
    kcalPer100g,
    proteinPer100g: toNumber(nutriments["proteins_100g"] ?? nutriments.proteins),
    fatPer100g: toNumber(nutriments["fat_100g"] ?? nutriments.fat),
    carbsPer100g: toNumber(
      nutriments["carbohydrates_100g"] ?? nutriments.carbohydrates
    ),
  };
}
