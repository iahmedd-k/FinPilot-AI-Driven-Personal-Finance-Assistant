const mongoose = require("mongoose");

const transactionCategorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [60, "Category name too long"],
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
      default: "expense",
    },
  },
  {
    timestamps: true,
  }
);

transactionCategorySchema.index({ userId: 1, type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("TransactionCategory", transactionCategorySchema);
