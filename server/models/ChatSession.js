const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "bot"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    botType: {
      type: String,
      enum: ["ai_advisor", "copilot"],
      required: true,
      default: "ai_advisor",
    },
    title: {
      type: String,
      default: "New Chat",
      maxlength: 100,
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatSession", chatSessionSchema);