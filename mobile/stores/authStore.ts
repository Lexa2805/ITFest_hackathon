/**
 * Zustand auth store.
 * Persists the access token with expo-secure-store.
 */

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import {
  loginUser,
  signUpUser,
  type AuthUser,
  type AuthResponse,
  type SignUpResponse,
} from "@/services/api";

const TOKEN_KEY = "health_os_token";
const REFRESH_KEY = "health_os_refresh";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /** Hydrate from secure storage on app launch */
  hydrate: () => Promise<void>;
  /** Sign in an existing user */
  login: (email: string, password: string) => Promise<void>;
  /** Register a new user – returns the signup result */
  signup: (email: string, password: string) => Promise<SignUpResponse>;
  /** Clear tokens & user */
  logout: () => Promise<void>;
}

function applySession(
  set: (partial: Partial<AuthState>) => void,
  res: AuthResponse
) {
  SecureStore.setItemAsync(TOKEN_KEY, res.access_token);
  SecureStore.setItemAsync(REFRESH_KEY, res.refresh_token);

  set({
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    user: res.user,
    isAuthenticated: true,
    isLoading: false,
  });
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // starts true until hydrate() finishes

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    const refresh = await SecureStore.getItemAsync(REFRESH_KEY);

    if (token) {
      set({
        accessToken: token,
        refreshToken: refresh,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await loginUser(email, password);
      applySession(set, res);
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signup: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await signUpUser(email, password);
      // Only apply session if we got tokens (email confirmation disabled)
      if (res.access_token && res.refresh_token) {
        applySession(set, res as AuthResponse);
      } else {
        set({ isLoading: false });
      }
      return res;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },
}));

