/**
 * Zustand store for the AI Daily Briefing.
 */

import { create } from "zustand";
import {
  getTodayBriefing,
  type BriefingResponse,
} from "@/services/briefingApi";

interface BriefingState {
  briefing: BriefingResponse | null;
  loading: boolean;
  error: string | null;

  fetchBriefing: () => Promise<void>;
}

export const useBriefingStore = create<BriefingState>((set) => ({
  briefing: null,
  loading: false,
  error: null,

  fetchBriefing: async () => {
    set({ loading: true, error: null });
    try {
      const briefing = await getTodayBriefing();
      set({ briefing, loading: false });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Failed to load briefing.";
      set({ error: msg, loading: false });
    }
  },
}));
