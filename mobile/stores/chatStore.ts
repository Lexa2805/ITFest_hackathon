/**
 * Zustand store for the Conversational Nutrition Agent chat.
 */

import { create } from "zustand";
import { streamChatMessage, type ChatStreamToken } from "@/services/chatApi";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  streaming: boolean;
  error: string | null;

  sendMessage: (text: string) => Promise<void>;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  streaming: false,
  error: null,

  sendMessage: async (text: string) => {
    const { sessionId } = get();

    // Append user message immediately
    set((s) => ({
      messages: [...s.messages, { role: "user", content: text }],
      streaming: true,
      error: null,
    }));

    // Placeholder for the assistant response we'll build up
    let assistantContent = "";
    let resolvedSessionId = sessionId;

    try {
      const stream = streamChatMessage(sessionId, text);

      for await (const chunk of stream) {
        assistantContent += chunk.token;
        if (!resolvedSessionId) resolvedSessionId = chunk.session_id;

        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { role: "assistant", content: assistantContent };
          } else {
            msgs.push({ role: "assistant", content: assistantContent });
          }
          return { messages: msgs, sessionId: resolvedSessionId };
        });
      }

      set({ streaming: false });
    } catch (err: any) {
      const msg =
        err?.message || "The nutrition agent is temporarily unavailable.";
      set({ error: msg, streaming: false });
    }
  },

  resetChat: () =>
    set({ messages: [], sessionId: null, streaming: false, error: null }),
}));
