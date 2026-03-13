/**
 * Axios instance & auth API helpers.
 * All calls go to the FastAPI backend – no Supabase JS on the client.
 */

import axios from "axios";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
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
  const { data } = await api.post<AuthResponse>("/api/auth/login", {
    email,
    password,
  });
  return data;
}

export async function signUpUser(
  email: string,
  password: string
): Promise<SignUpResponse> {
  const { data } = await api.post<SignUpResponse>("/api/auth/signup", {
    email,
    password,
  });
  return data;
}

export default api;

