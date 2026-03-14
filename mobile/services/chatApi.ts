/**
 * Chat API — conversational nutrition agent with SSE streaming.
 *
 * On web, uses ReadableStream for true token-by-token streaming.
 * On React Native (iOS/Android), response.body is not available,
 * so we fall back to XMLHttpRequest with progressive text reading
 * to approximate streaming behaviour.
 */

import { Platform } from "react-native";
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

/* ------------------------------------------------------------------ */
/*  Helper: parse SSE lines from a text chunk                         */
/* ------------------------------------------------------------------ */
function* parseSseTokens(text: string): Generator<ChatStreamToken> {
  const lines = text.split("\n");
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

/* ------------------------------------------------------------------ */
/*  Web path — uses ReadableStream (works in browsers)                */
/* ------------------------------------------------------------------ */
async function* streamViaFetch(
  url: string,
  headers: Record<string, string>,
  body: string,
): AsyncGenerator<ChatStreamToken> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
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

      for (const token of parseSseTokens(lines.join("\n"))) {
        yield token;
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ------------------------------------------------------------------ */
/*  React Native path — uses XHR with progressive onreadystatechange  */
/* ------------------------------------------------------------------ */
async function* streamViaXHR(
  url: string,
  headers: Record<string, string>,
  body: string,
): AsyncGenerator<ChatStreamToken> {
  // We collect tokens into a queue that the generator pulls from.
  const queue: ChatStreamToken[] = [];
  let done = false;
  let error: Error | null = null;
  let seen = 0;

  // Resolve function for the "waiter" promise so the generator can
  // be notified when new tokens arrive.
  let notify: (() => void) | null = null;

  const xhr = new XMLHttpRequest();
  xhr.open("POST", url);
  for (const [key, value] of Object.entries(headers)) {
    xhr.setRequestHeader(key, value);
  }

  xhr.onreadystatechange = () => {
    // readyState 3 = LOADING (partial data available)
    if (xhr.readyState >= 3 && xhr.responseText) {
      const newText = xhr.responseText.slice(seen);
      seen = xhr.responseText.length;

      for (const token of parseSseTokens(newText)) {
        queue.push(token);
      }
      notify?.();
    }

    if (xhr.readyState === 4) {
      // Process any remaining text
      if (xhr.responseText) {
        const remaining = xhr.responseText.slice(seen);
        seen = xhr.responseText.length;
        for (const token of parseSseTokens(remaining)) {
          queue.push(token);
        }
      }
      done = true;
      notify?.();
    }
  };

  xhr.onerror = () => {
    error = new Error("Chat request failed (network error)");
    done = true;
    notify?.();
  };

  xhr.timeout = 60_000;
  xhr.ontimeout = () => {
    error = new Error("Chat request timed out");
    done = true;
    notify?.();
  };

  xhr.send(body);

  // Generator loop: yield tokens as they arrive
  try {
    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }
      if (done) break;
      // Wait for the next batch of tokens
      await new Promise<void>((resolve) => {
        notify = resolve;
      });
    }
    if (error) throw error;
  } finally {
    if (xhr.readyState !== 4) {
      xhr.abort();
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */
export async function* streamChatMessage(
  sessionId: string | null,
  message: string,
): AsyncGenerator<ChatStreamToken> {
  const baseURL = api.defaults.baseURL ?? "http://localhost:8000";
  const token = useAuthStore.getState().accessToken;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const url = `${baseURL}/chat/message`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "X-Timezone": timezone,
  };
  const body = JSON.stringify({
    session_id: sessionId,
    message,
  } satisfies ChatMessageRequest);

  if (Platform.OS === "web") {
    yield* streamViaFetch(url, headers, body);
  } else {
    yield* streamViaXHR(url, headers, body);
  }
}
