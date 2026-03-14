/**
 * Expiry API — expiry-based recipes and fridge alerts.
 */

import api from "./api";

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface ExpiryRecipe {
  name: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prep_time_minutes: number;
  expiry_priority: boolean;
}

export interface ExpiryRecipeResponse {
  recipes: ExpiryRecipe[];
  expiring_items_used: string[];
  message: string | null;
}

export interface ExpiryAlertItem {
  item_id: string;
  name: string;
  expiry_date: string;
  status: "expiring_urgent" | "expired";
  days_until_expiry: number;
  suggested_recipe: string | null;
}

export async function getExpiryRecipes(): Promise<ExpiryRecipeResponse> {
  const { data } = await api.get<ExpiryRecipeResponse>("/recipes/expiry-based");
  return data;
}

export async function getExpiryAlerts(): Promise<ExpiryAlertItem[]> {
  const { data } = await api.get<ExpiryAlertItem[]>("/fridge/expiry-alerts");
  return data;
}
