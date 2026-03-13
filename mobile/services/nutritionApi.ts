// mobile/services/nutritionApi.ts

import api from "./api";

// ---------------------------------------------------------------------------
// Types matching backend schemas
// ---------------------------------------------------------------------------

export interface DailyLogMeal {
    recipe_id: string;
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    logged_at: string;
}

export interface DailyLogResponse {
    id: string;
    user_id: string;
    date: string;
    meals: DailyLogMeal[];
    total_calories: number;
    total_protein_g: number;
    total_carbs_g: number;
    total_fat_g: number;
    
    goal_calories: number | null;
    goal_protein_g: number | null;
    goal_carbs_g: number | null;
    goal_fat_g: number | null;
    
    remaining_calories: number | null;
    remaining_protein_g: number | null;
    remaining_carbs_g: number | null;
    remaining_fat_g: number | null;
}

export interface RecipeIngredient {
    name: string;
    quantity: number;
    unit: string;
}

export interface RecipeResponse {
    id: string;
    user_id: string;
    generated_at: string;
    name: string;
    ingredients: RecipeIngredient[];
    instructions: string[];
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    prep_time_minutes: number;
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

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

export async function getTodayLog(): Promise<DailyLogResponse> {
    const { data } = await api.get<DailyLogResponse>("/nutrition/log/today");
    return data;
}

export async function suggestRecipes(): Promise<RecipeResponse[]> {
    const { data } = await api.post<RecipeResponse[]>("/nutrition/recipes/suggest", undefined, { timeout: 70_000 });
    return data;
}

export async function getLatestShoppingList(): Promise<ShoppingListResponse | null> {
    try {
        const { data } = await api.get<ShoppingListResponse>("/nutrition/shopping-list/latest");
        return data;
    } catch (error: any) {
        if (error?.response?.status === 404) {
            return null;
        }
        throw error;
    }
}
