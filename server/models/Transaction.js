const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Transaction type is required"],
    },
    category: {
      type: String,
      enum: [
        "Salary", "Freelance", "Investment", "Other Income",     // income
        "Dining", "Groceries", "Transport", "Subscriptions",     // expense
        "Shopping", "Health", "Education", "Utilities",
        "Rent", "Entertainment", "Travel", "Other Expense",
      ],
      default: null,                                             // AI fills this
    },
    merchant: {
      type: String,
      trim: true,
      maxlength: [100, "Merchant name too long"],
      default: "",
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, "Notes too long"],
      default: "",
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    isCategorizedByAI: {
      type: Boolean,
      default: false,
    },
    isFromCSV: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes for fast dashboard queries ───────────────
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);