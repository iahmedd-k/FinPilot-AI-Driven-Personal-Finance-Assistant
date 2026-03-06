import api from "./api";

/**
 * history: array of { role: "user" | "assistant", content: string }
 * Backend uses user's transactions (current month) + goals as context.
 */
export const aiService = {
  chat: (message, history = []) =>
    api.post("/ai/chat", { message: message.trim(), history }),
  getQuickPrompts: () => api.get("/ai/quick-prompts"),
};
