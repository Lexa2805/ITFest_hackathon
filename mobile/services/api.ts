/**
 * Axios instance & auth API helpers.
 * All calls go to the FastAPI backend – no Supabase JS on the client.
 */

import axios from "axios";
import Constants from "expo-constants";

function stripQuotes(value: string): string {
  return value.replace(/^['\"]|['\"]$/g, "").trim();
}

function getExpoHostApiUrl(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(":")[0];
  if (!host) {
    return null;
  }

  return `http://${host}:8000`;
}

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL
  ? stripQuotes(process.env.EXPO_PUBLIC_API_URL)
  : "";

const pointsToLoopback =
  configuredApiUrl.includes("localhost") ||
  configuredApiUrl.includes("127.0.0.1");

const expoHostApiUrl = getExpoHostApiUrl();

const API_URL =
  configuredApiUrl && !pointsToLoopback
    ? configuredApiUrl
    : expoHostApiUrl || configuredApiUrl || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ── Auth interceptor — attach Bearer token to every request ──
api.interceptors.request.use((config) => {
  // Lazy import to avoid circular dependency at module load time
  const { useAuthStore } = require("@/stores/authStore");
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth helpers ──────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface SignUpResponse {
  access_token?: string;
  refresh_token?: string;
  user?: AuthUser;
  message?: string;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/api/auth/login",
    { email, password },
    { timeout: 30_000 },
  );
  return data;
}

export async function signUpUser(
  email: string,
  password: string
): Promise<SignUpResponse> {
  const { data } = await api.post<SignUpResponse>("/api/auth/signup",
    { email, password },
    { timeout: 30_000 },
  );
  return data;
}

export default api;

