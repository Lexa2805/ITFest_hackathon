/**
 * Zustand store for the Fridge system.
 * Wraps fridgeApi with loading/error state management.
 */

import { create } from "zustand";
import {
  getFridgeItems,
  addFridgeItem,
  deleteFridgeItem,
  scanImageUpload,
  bulkAddItems,
  type FridgeItem,
  type FridgeItemCreate,
  type ScannedIngredient,
} from "@/services/fridgeApi";

interface FridgeState {
  items: FridgeItem[];
  scannedIngredients: ScannedIngredient[];
  isLoading: boolean;
  isScanning: boolean;
  error: string | null;

  fetchItems: () => Promise<void>;
  addItem: (item: FridgeItemCreate) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  scanImage: (imageUri: string) => Promise<void>;
  confirmScan: () => Promise<void>;
  clearScan: () => void;
}

export const useFridgeStore = create<FridgeState>((set, get) => ({
  items: [],
  scannedIngredients: [],
  isLoading: false,
  isScanning: false,
  error: null,

  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await getFridgeItems();
      set({ items, isLoading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to load items.";
      set({ error: msg, isLoading: false });
    }
  },

  addItem: async (item) => {
    set({ isLoading: true, error: null });
    try {
      const created = await addFridgeItem(item);
      set((s) => ({ items: [created, ...s.items], isLoading: false }));
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to add item.";
      set({ error: msg, isLoading: false });
      throw err;
    }
  },

  removeItem: async (id) => {
    // Optimistic removal
    const prev = get().items;
    set({ items: prev.filter((i) => i.id !== id) });
    try {
      await deleteFridgeItem(id);
    } catch (err: any) {
      // Revert on failure
      set({ items: prev, error: "Failed to delete item." });
    }
  },

  scanImage: async (imageUri) => {
    set({ isScanning: true, error: null, scannedIngredients: [] });
    try {
      const result = await scanImageUpload(imageUri);
      set({ scannedIngredients: result.ingredients, isScanning: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Scan failed.";
      set({ error: msg, isScanning: false });
    }
  },

  confirmScan: async () => {
    const { scannedIngredients } = get();
    if (scannedIngredients.length === 0) return;

    const payload: FridgeItemCreate[] = scannedIngredients.map((ing) => ({
      name: ing.name,
      quantity: ing.estimated_quantity,
      unit: ing.unit,
      category: ing.category,
    }));

    set({ isLoading: true, error: null });
    try {
      const created = await bulkAddItems(payload);
      set((s) => ({
        items: [...created, ...s.items],
        scannedIngredients: [],
        isLoading: false,
      }));
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to save scanned items.";
      set({ error: msg, isLoading: false });
    }
  },

  clearScan: () => set({ scannedIngredients: [], error: null }),
}));
