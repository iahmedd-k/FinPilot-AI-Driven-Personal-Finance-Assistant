const { z } = require("zod");

const CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Other Income",
  "Dining",
  "Groceries",
  "Transport",
  "Subscriptions",
  "Shopping",
  "Health",
  "Education",
  "Utilities",
  "Rent",
  "Entertainment",
  "Travel",
  "Other Expense",
];

const transactionSchema = z.object({
  amount: z
    .number({ required_error: "Amount is required" })
    .positive("Amount must be positive"),
  type: z.enum(["income", "expense"], { required_error: "Type is required" }),
  category: z.enum(CATEGORIES).optional(),
  merchant: z.string().max(100).optional().default(""),
  date: z.string().optional(),
  notes: z.string().max(300).optional().default(""),
  isRecurring: z.boolean().optional().default(false),
});

const updateTransactionSchema = transactionSchema.partial();

module.exports = {
  transactionSchema,
  updateTransactionSchema,
};