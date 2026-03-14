/**
 * Nutrition API — typed wrappers for every /nutrition endpoint.
 */

import api from "./api";

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
