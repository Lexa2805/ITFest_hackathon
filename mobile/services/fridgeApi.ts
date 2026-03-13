/**
 * Fridge API — typed wrappers for every /fridge endpoint.
 */

import api from "./api";

// ── Types ────────────────────────────────────────────────────

export interface FridgeItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  category: string;
  created_at: string;
  updated_at: string;
  expiring_soon: boolean;
}

export interface FridgeItemCreate {
  name: string;
  quantity: number;
  unit: string;
  expiry_date?: string | null;
  category?: string;
}

export interface FridgeItemUpdate {
  name?: string;
  quantity?: number;
  unit?: string;
  expiry_date?: string | null;
  category?: string;
}

export interface ScannedIngredient {
  name: string;
  estimated_quantity: number;
  unit: string;
  category: string;
}

export interface ScanResponse {
  ingredients: ScannedIngredient[];
  raw_model_output: string | null;
}

export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

// ── API calls ────────────────────────────────────────────────

export async function getFridgeItems(): Promise<FridgeItem[]> {
  const { data } = await api.get<APIResponse<FridgeItem[]>>("/fridge/items");
  return data.data;
}

export async function addFridgeItem(
  item: FridgeItemCreate
): Promise<FridgeItem> {
  const { data } = await api.post<APIResponse<FridgeItem>>(
    "/fridge/items",
    item
  );
  return data.data;
}

export async function updateFridgeItem(
  id: string,
  updates: FridgeItemUpdate
): Promise<FridgeItem> {
  const { data } = await api.put<APIResponse<FridgeItem>>(
    `/fridge/items/${id}`,
    updates
  );
  return data.data;
}

export async function deleteFridgeItem(id: string): Promise<void> {
  await api.delete(`/fridge/items/${id}`);
}

export async function scanImageUpload(
  imageUri: string
): Promise<ScanResponse> {
  const formData = new FormData();

  // React Native's FormData accepts {uri, name, type} objects
  formData.append("file", {
    uri: imageUri,
    name: "scan.jpg",
    type: "image/jpeg",
  } as any);

  const { data } = await api.post<APIResponse<ScanResponse>>(
    "/fridge/scan/upload",
    formData,
    { headers: { "Content-Type": "multipart/form-data" }, timeout: 60_000 }
  );
  return data.data;
}

export async function bulkAddItems(
  items: FridgeItemCreate[]
): Promise<FridgeItem[]> {
  const { data } = await api.post<APIResponse<FridgeItem[]>>(
    "/fridge/items/bulk",
    { items }
  );
  return data.data;
}
