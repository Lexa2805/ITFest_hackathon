import { create } from 'zustand';
import { HealthExportUploadResponse, getHealthData } from '@/services/healthExportApi';

interface HealthStore {
  healthData: HealthExportUploadResponse | null;
  isLoading: boolean;
  isInitialized: boolean;
  setHealthData: (data: HealthExportUploadResponse) => void;
  clearHealthData: () => void;
  loadHealthData: () => Promise<void>;
}

export const useHealthStore = create<HealthStore>((set) => ({
  healthData: null,
  isLoading: false,
  isInitialized: false,
  
  setHealthData: (data) => set({ healthData: data }),
  
  clearHealthData: () => set({ healthData: null }),
  
  loadHealthData: async () => {
    set({ isLoading: true });
    try {
      const data = await getHealthData();
      set({ healthData: data, isLoading: false, isInitialized: true });
    } catch (error) {
      console.error('Error loading health data:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },
}));
