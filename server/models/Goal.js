const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Goal title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    targetAmount: {
      type: Number,
      required: [true, "Target amount is required"],
      min: [1, "Target amount must be at least 1"],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, "Current amount cannot be negative"],
    },
    deadline: {
      type: Date,
      required: [true, "Deadline is required"],
    },
    category: {
      type: String,
      enum: [
        "Emergency Fund",
        "Travel",
        "Education",
        "Home",
        "Car",
        "Retirement",
        "Business",
        "Other",
      ],
      default: "Other",
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    aiSuggestion: {
      type: String,       // Cached AI advice for this goal
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ─── Virtual: progress percentage ─────────────────────
goalSchema.virtual("progressPercent").get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(Math.round((this.currentAmount / this.targetAmount) * 100), 100);
});

// ─── Virtual: days remaining ───────────────────────────
goalSchema.virtual("daysRemaining").get(function () {
  const diff = new Date(this.deadline) - new Date();
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
});

// ─── Virtual: monthly saving needed ───────────────────
goalSchema.virtual("monthlySavingNeeded").get(function () {
  const monthsLeft = this.daysRemaining / 30;
  if (monthsLeft <= 0) return 0;
  const remaining = this.targetAmount - this.currentAmount;
  return Math.max(Math.ceil(remaining / monthsLeft), 0);
});

// ─── Auto mark complete ────────────────────────────────
goalSchema.pre("save", function (next) {
  if (this.currentAmount >= this.targetAmount) {
    this.isCompleted = true;
  }

});

module.exports = mongoose.model("Goal", goalSchema);