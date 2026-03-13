/**
 * LoginScreen – Green & Black dark-mode aesthetic.
 * Pure React Native components, no web tags.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import axios from "axios";

// ── Colour tokens ────────────────────────────────────────────
const C = {
  bg: "#0A0A0A",
  surface: "#141414",
  border: "#1E1E1E",
  borderFocus: "#00E676",
  accent: "#00E676",
  accentDim: "rgba(0,230,118,0.12)",
  text: "#F5F5F5",
  textMuted: "#888888",
  error: "#FF5252",
  inputBg: "#1A1A1A",
} as const;

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      // Navigation handled by root layout auth gate
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.detail ?? "Login failed. Please try again."
        );
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Logo / Title ─────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>💚</Text>
          </View>
          <Text style={styles.appName}>Health OS</Text>
          <Text style={styles.tagline}>Your personal health companion</Text>
        </View>

        {/* ── Form Card ────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>
            Sign in to continue your journey
          </Text>

          {/* Error Banner */}
          {error !== "" && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠  {error}</Text>
            </View>
          )}

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[
              styles.input,
              emailFocused && styles.inputFocused,
            ]}
            placeholder="you@example.com"
            placeholderTextColor={C.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[
              styles.input,
              passwordFocused && styles.inputFocused,
            ]}
            placeholder="••••••••"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            onSubmitEditing={handleLogin}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Text style={styles.buttonText}>Log In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Footer link ──────────────────────────────── */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/signup")}
          style={styles.footerLink}
        >
          <Text style={styles.footerText}>
            Don't have an account?{" "}
            <Text style={styles.footerAccent}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  /* Header */
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.accentDim,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 32,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: C.accent,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },

  /* Card */
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginBottom: 20,
  },

  /* Error */
  errorBanner: {
    backgroundColor: "rgba(255,82,82,0.12)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,82,82,0.3)",
  },
  errorText: {
    color: C.error,
    fontSize: 13,
    lineHeight: 18,
  },

  /* Inputs */
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.text,
    borderWidth: 1.5,
    borderColor: C.border,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: C.borderFocus,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },

  /* Button */
  button: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: C.bg,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  /* Footer */
  footerLink: {
    marginTop: 28,
    alignItems: "center",
  },
  footerText: {
    color: C.textMuted,
    fontSize: 14,
  },
  footerAccent: {
    color: C.accent,
    fontWeight: "600",
  },
});
