const groq = require("../../config/groq");

const CATEGORIES = {
  income: [
    "Salary",
    "Freelance",
    "Investment",
    "Other Income",
  ],
  expense: [
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
  ],
};

const categorizeTransaction = async (merchant, type) => {
  // If no merchant name, return default
  if (!merchant || merchant.trim() === "") {
    return type === "income" ? "Other Income" : "Other Expense";
  }

  try {
    const validCategories = CATEGORIES[type].join(", ");

    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      max_tokens: 20,
      temperature: 0, // Deterministic output
      messages: [
        {
          role: "system",
          content:
            "You are a financial transaction categorizer. Respond ONLY with a JSON object like: {\"category\": \"CategoryName\"}. No explanation. No extra text.",
        },
        {
          role: "user",
          content: `Classify this merchant into one of these categories: ${validCategories}.\nMerchant: "${merchant}"\nType: ${type}`,
        },
      ],
    });

    const raw = response.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);

    // Validate returned category is actually valid
    const allCategories = [
      ...CATEGORIES.income,
      ...CATEGORIES.expense,
    ];
    if (allCategories.includes(parsed.category)) {
      return parsed.category;
    }

    return type === "income" ? "Other Income" : "Other Expense";
  } catch (err) {
    console.error("AI categorization failed:", err.message);
    return type === "income" ? "Other Income" : "Other Expense";
  }
};

module.exports = categorizeTransaction;