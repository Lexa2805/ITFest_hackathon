/**
 * Photo Meal API — snap-to-log meal photo analysis.
 */

import api from "./api";

export interface DetectedFoodItem {
  name: string;
  estimated_calories: number;
  estimated_protein_g: number;
  estimated_carbs_g: number;
  estimated_fat_g: number;
  estimated_grams: number;
}

export interface PhotoMealEstimate {
  food_items: DetectedFoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  confidence: "high" | "medium" | "low";
}

export interface PhotoMealConfirmRequest {
  meal_name: string;
  food_items: DetectedFoodItem[];
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  time_of_day: "breakfast" | "lunch" | "dinner" | "snack";
  photo_reference?: string | null;
}

export async function analyzePhoto(
  imageUri: string
): Promise<PhotoMealEstimate> {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "meal.jpg",
    type: "image/jpeg",
  } as any);

  const { data } = await api.post<PhotoMealEstimate>(
    "/meals/photo-log",
    formData,
    { headers: { "Content-Type": "multipart/form-data" }, timeout: 60_000 }
  );
  return data;
}

export async function confirmMeal(
  request: PhotoMealConfirmRequest
): Promise<void> {
  await api.post("/meals/photo-log/confirm", request);
}
