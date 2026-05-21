const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // ─── Core auth ────────────────────────────────────────
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
    googleId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    // ─── Personal Information (Profile tab) ───────────────
    dob: {
      type: String,   // stored as "MM/DD/YYYY" or ISO string
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },

    // ─── Taxes & Income (Profile tab) ─────────────────────
    employment: {
      type: String,
      enum: [
        "Employed", "Self-employed", "Freelance",
        "Business owner", "Student", "Retired",
        "Unemployed", null,
      ],
      default: null,
    },
    annualIncome: {
      type: Number,
      default: null,
      min: [0, "Annual income cannot be negative"],
    },
    taxStatus: {
      type: String,
      enum: [
        "Single",
        "Married filing jointly",
        "Married filing separately",
        "Head of household",
        "Qualifying widow(er)",
        null,
      ],
      default: null,
    },
    preferredCurrency: {
      type: String,
      uppercase: true,
      trim: true,
      match: [/^[A-Z]{3}$/, "Preferred currency must be a valid 3-letter currency code"],
      default: "USD",
    },

    // ─── AI Financial Profile tab ─────────────────────────
    age: {
      type: Number,
      default: null,
      min: [0, "Age cannot be negative"],
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    riskProfile: {
      type: String,
      enum: [
        "Conservative",
        "Moderately Conservative",
        "Moderate",
        "Moderately Aggressive",
        "Aggressive",
        null,
      ],
      default: null,
    },
    dependents: {
      type: Number,
      default: 0,
      min: [0, "Dependents cannot be negative"],
    },
    memoryAssistEnabled: {
      type: Boolean,
      default: true,
    },

    // ─── Subscription ─────────────────────────────────────
    subscriptionTier: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    subscriptionStatus: {
      type: String,
      default: null, // e.g. "active", "past_due", "canceled"
    },
    subscriptionExpiryDate: {
      type: Date,
      default: null,
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

    // ─── Auth tokens ──────────────────────────────────────
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

    // ─── Onboarding & usage ───────────────────────────────
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
        d.setMonth(d.getMonth() + 1, 1);
        return d;
      },
    },

    // ─── Monthly budgets ──────────────────────────────────
    budgets: [
      {
        month:  { type: String, required: true },  // "YYYY-MM"
        amount: { type: Number, required: true, min: [0, "Budget cannot be negative"] },
      },
    ],

    // ─── Spending settings ────────────────────────────────
    spendingSettings: {
      budgetSettings: {
        defaultMonthlyBudget: { type: Number, default: 0, min: [0, "Budget cannot be negative"] },
        budgetWarning50: { type: Boolean, default: true },
        budgetWarning80: { type: Boolean, default: true },
        budgetWarning100: { type: Boolean, default: true },
        carryForwardBudget: { type: Boolean, default: true },
        resetPeriod: { type: String, enum: ["monthly"], default: "monthly" },
      },
      categorySettings: {
        hiddenCategoryIds: { type: [String], default: [] },
      },
      alertSettings: {
        notificationsEnabled: { type: Boolean, default: true },
        categorySpikeAlerts: { type: Boolean, default: true },
        categorySpikePercent: { type: Number, default: 25, min: 0, max: 500 },
        largeTransactionAlerts: { type: Boolean, default: true },
        largeTransactionAmount: { type: Number, default: 500, min: [0, "Amount cannot be negative"] },
        recurringReminderAlerts: { type: Boolean, default: true },
      },
      recurringSettings: {
        reminderDaysBefore: { type: Number, default: 3, min: 0, max: 60 },
        autoDetectRecurring: { type: Boolean, default: true },
        showInferredRecurring: { type: Boolean, default: true },
        defaultExpenseCategory: { type: String, default: "Subscriptions" },
        defaultIncomeCategory: { type: String, default: "Salary" },
      },
      transactionPreferences: {
        defaultReviewStatus: { type: String, enum: ["needs_review", "reviewed"], default: "needs_review" },
        includeHiddenInAnalytics: { type: Boolean, default: false },
        includeRecurringInBudget: { type: Boolean, default: true },
        defaultSortDirection: { type: String, enum: ["asc", "desc"], default: "desc" },
      },
      reportPreferences: {
        defaultRange: { type: String, enum: ["last_30_days", "last_90_days", "last_6_months", "year_to_date", "all_time"], default: "last_6_months" },
        defaultTab: { type: String, enum: ["cashflow", "expenses", "income"], default: "cashflow" },
        defaultViewBy: { type: String, enum: ["Category", "Merchant"], default: "Category" },
      },
      rules: [
        {
          name: { type: String, default: "" },
          conditions: [
            {
              field: { type: String, required: true },
              operator: { type: String, required: true },
              value: { type: String, default: "" }
            }
          ],
          actions: [
            {
              field: { type: String, required: true },
              value: { type: String, default: "" }
            }
          ]
        }
      ]
    },
  },
  {
    timestamps: true,
  }
);

// ─── Hash password before saving ─────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
});

// ─── Compare password ─────────────────────────────────
userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

// ─── Free tier limit checks ───────────────────────────
userSchema.methods.canAddTransaction = function () {
  if (this.subscriptionTier === "pro") return true;
  return this.transactionsUsed < 10;
};

userSchema.methods.canUseAI = function () {
  if (this.subscriptionTier === "pro") return true;
  return this.aiQueriesUsed < 5;
};

// ─── Reset monthly usage ──────────────────────────────
userSchema.methods.resetMonthlyUsage = async function () {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  await this.constructor.updateOne(
    { _id: this._id },
    { aiQueriesUsed: 0, transactionsUsed: 0, usageResetDate: d }
  );
};

module.exports = mongoose.model("User", userSchema);
