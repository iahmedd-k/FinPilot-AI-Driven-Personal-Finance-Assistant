const { z } = require("zod");

const transactionSchema = z.object({
  amount: z
    .number({ required_error: "Amount is required" })
    .positive("Amount must be positive"),
  type: z.enum(["income", "expense"], { required_error: "Type is required" }),
  category: z.string().trim().max(60).optional(),
  merchant: z.string().max(100).optional().default(""),
  date: z.string().optional(),
  notes: z.string().max(300).optional().default(""),
  tag: z.string().max(80).optional().default(""),
  isHidden: z.boolean().optional().default(false),
  reviewStatus: z.enum(["needs_review", "reviewed"]).optional().default("needs_review"),
  isRecurring: z.boolean().optional().default(false),
});

const updateTransactionSchema = transactionSchema.partial();

module.exports = {
  transactionSchema,
  updateTransactionSchema,
};
