/**
 * Chat API — conversational nutrition agent with SSE streaming.
 *
 * Uses native fetch() (not axios) for ReadableStream support.
 * Manually attaches Bearer token and X-Timezone header.
 */

import api from "./api";
import { useAuthStore } from "@/stores/authStore";

export interface ChatMessageRequest {
  session_id: string | null;
  message: string;
}

export interface ChatStreamToken {
  token: string;
  session_id: string;
}

/**
 * Stream a chat response from the conversational agent.
 * Yields parsed SSE token objects as they arrive.
 */
export async function* streamChatMessage(
  sessionId: string | null,
  message: string
): AsyncGenerator<ChatStreamToken> {
  const baseURL = api.defaults.baseURL ?? "http://localhost:8000";
  const token = useAuthStore.getState().accessToken;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  const response = await fetch(`${baseURL}/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Timezone": timezone,
    },
    body: JSON.stringify({
      session_id: sessionId,
      message,
    } satisfies ChatMessageRequest),
    signal: controller.signal,
  });

  if (!response.ok) {
    clearTimeout(timeoutId);
    throw new Error(`Chat request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    clearTimeout(timeoutId);
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const payload = trimmed.slice(6);
        if (payload === "[DONE]") return;

        try {
          yield JSON.parse(payload) as ChatStreamToken;
        } catch {
          // skip malformed chunks
        }
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
