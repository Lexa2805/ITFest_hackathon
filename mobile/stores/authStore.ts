/**
 * Zustand auth store.
 * Persists the access token with secure storage.
 */

import { create } from "zustand";
import { Platform } from "react-native";
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

function getWebStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

async function setStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(key, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    getWebStorage()?.setItem(key, value);
  }
}

async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return getWebStorage()?.getItem(key) ?? null;
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return getWebStorage()?.getItem(key) ?? null;
  }
}

async function deleteStoredItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(key);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    getWebStorage()?.removeItem(key);
  }
}

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
  void setStoredItem(TOKEN_KEY, res.access_token);
  void setStoredItem(REFRESH_KEY, res.refresh_token);

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
    const token = await getStoredItem(TOKEN_KEY);
    const refresh = await getStoredItem(REFRESH_KEY);

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
    await deleteStoredItem(TOKEN_KEY);
    await deleteStoredItem(REFRESH_KEY);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    });
  },
}));

