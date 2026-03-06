const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,                          // Never return password in queries
    },
    subscriptionTier: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    monthlyIncome: {
      type: Number,
      default: 0,
      min: [0, "Monthly income cannot be negative"],
    },
    savingsGoalPercent: {
      type: Number,
      default: 20,
      min: 0,
      max: 100,
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    stripeSubscriptionId: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    aiQueriesUsed: {
      type: Number,
      default: 0,
    },
    transactionsUsed: {
      type: Number,
      default: 0,
    },
    usageResetDate: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1, 1);     // 1st of next month
        return d;
      },
    },
  },
  {
    timestamps: true,                         // createdAt, updatedAt auto
  }
);

// ─── Indexes ───────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });

// ─── Hash password before saving ──────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

// ─── Instance method: compare password ────────────────
userSchema.methods.comparePassword = async function (plainPassword) {
  return await bcrypt.compare(plainPassword, this.passwordHash);
};

// ─── Instance method: check free tier limits ──────────
userSchema.methods.canAddTransaction = function () {
  if (this.subscriptionTier === "pro") return true;
  return this.transactionsUsed < 10;
};

userSchema.methods.canUseAI = function () {
  if (this.subscriptionTier === "pro") return true;
  return this.aiQueriesUsed < 5;
};

// ─── Instance method: reset monthly usage ─────────────
userSchema.methods.resetMonthlyUsage = async function () {
  this.aiQueriesUsed = 0;
  this.transactionsUsed = 0;
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  this.usageResetDate = d;
  await this.save();
};

module.exports = mongoose.model("User", userSchema);