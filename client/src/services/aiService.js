import api from "./api";

export const aiService = {
  // ── AI chat (both AI Advisor & Copilot) ──────────────
  // sessionId is optional — if passed, backend auto-saves messages
  chat: (message, history = [], sessionId = null) =>
    api.post("/ai/chat", { message: message.trim(), history, sessionId }),

  getQuickPrompts: () => api.get("/ai/quick-prompts"),

  // ── Session management ────────────────────────────────
  createSession: (botType, firstMessage) =>
    api.post("/chat/sessions", { botType, firstMessage }),

  getSessions: (botType) =>
    api.get("/chat/sessions", { params: { bot: botType } }),

  getMessages: (sessionId) =>
    api.get(`/chat/sessions/${sessionId}/messages`),

  renameSession: (sessionId, title) =>
    api.patch(`/chat/sessions/${sessionId}`, { title }),

  deleteSession: (sessionId) =>
    api.delete(`/chat/sessions/${sessionId}`),
};