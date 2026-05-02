const ChatSession = require("../models/ChatSession");

// ─── Helper: generate title from first user message ───
const generateTitle = (text) => {
  const words = text.trim().split(/\s+/);
  const short = words.slice(0, 6).join(" ");
  return words.length > 6 ? short + "…" : short;
};

// ─── @POST /api/chat/sessions ─────────────────────────
const createSession = async (req, res, next) => {
  try {
    if (req.user?.memoryAssistEnabled === false) {
      return res.status(403).json({
        success: false,
        message: "Memory is disabled. Enable memories to save chat sessions.",
      });
    }

    const { botType = "ai_advisor", firstMessage } = req.body;

    const session = await ChatSession.create({
      userId: req.user._id,
      botType,
      title: firstMessage ? generateTitle(firstMessage) : "New Chat",
      messages: [],
    });

    res.status(201).json({ success: true, session });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/chat/sessions ──────────────────────────
const getSessions = async (req, res, next) => {
  try {
    if (req.user?.memoryAssistEnabled === false) {
      return res.status(200).json({ success: true, sessions: [] });
    }

    const { bot } = req.query; // ?bot=ai_advisor  or  ?bot=copilot

    const filter = { userId: req.user._id };
    if (bot) filter.botType = bot;

    const sessions = await ChatSession.find(filter)
      .select("_id title botType createdAt updatedAt")
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/chat/sessions/:id/messages ────────────
const getMessages = async (req, res, next) => {
  try {
    if (req.user?.memoryAssistEnabled === false) {
      return res.status(200).json({
        success: true,
        title: "Memory disabled",
        messages: [],
      });
    }

    const session = await ChatSession.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.status(200).json({
      success: true,
      title: session.title,
      messages: session.messages,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/chat/sessions/:id/messages ───────────
// Called internally by aiController & copilotController after AI replies
const addMessage = async (req, res, next) => {
  try {
    if (req.user?.memoryAssistEnabled === false) {
      return res.status(403).json({
        success: false,
        message: "Memory is disabled. Enable memories to save chat sessions.",
      });
    }

    const { role, text } = req.body;

    if (!role || !text) {
      return res.status(400).json({ success: false, message: "role and text are required" });
    }

    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $push: { messages: { role, text } } },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const newMsg = session.messages[session.messages.length - 1];
    res.status(201).json({ success: true, message: newMsg });
  } catch (err) {
    next(err);
  }
};

// ─── @PATCH /api/chat/sessions/:id ───────────────────
const renameSession = async (req, res, next) => {
  try {
    if (req.user?.memoryAssistEnabled === false) {
      return res.status(403).json({
        success: false,
        message: "Memory is disabled. Enable memories to manage chat sessions.",
      });
    }

    const { title } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: title.trim().slice(0, 100) },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.status(200).json({ success: true, session });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/chat/sessions/:id ──────────────────
const deleteSession = async (req, res, next) => {
  try {
    const session = await ChatSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    res.status(200).json({ success: true, message: "Session deleted" });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSession,
  getSessions,
  getMessages,
  addMessage,
  renameSession,
  deleteSession,
};