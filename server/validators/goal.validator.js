const { z } = require("zod");

const GOAL_CATEGORIES = [
  "Emergency Fund", "Travel", "Education",
  "Home", "Car", "Retirement", "Business", "Other",
];

const goalSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters").max(100),
  targetAmount: z.coerce.number().positive("Target amount must be positive"),
  currentAmount: z.coerce.number().min(0).optional().default(0),
  deadline: z.string({ required_error: "Deadline is required" }).refine(
    (d) => !isNaN(Date.parse(d)),
    { message: "Invalid date format" }
  ).refine(
    (d) => new Date(d) > new Date(),
    { message: "Deadline must be in the future" }
  ),
  category: z.enum(GOAL_CATEGORIES).optional().default("Other"),
});

const updateGoalSchema = goalSchema.partial();

const contributeSchema = z.object({
  amount: z.coerce.number().positive("Contribution must be positive"),
});

module.exports = { goalSchema, updateGoalSchema, contributeSchema };