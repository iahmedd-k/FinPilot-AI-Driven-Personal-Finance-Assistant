const Goal = require("../models/Goal");

// ─── @POST /api/goals ──────────────────────────────────
const createGoal = async (req, res, next) => {
  try {
    const goal = await Goal.create({ userId: req.user._id, ...req.body });
    res.status(201).json({ success: true, goal });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/goals ───────────────────────────────────
const getGoals = async (req, res, next) => {
  try {
    const { isCompleted } = req.query;
    const filter = { userId: req.user._id };
    if (isCompleted !== undefined) filter.isCompleted = isCompleted === "true";

    const goals = await Goal.find(filter).sort({ deadline: 1 });
    res.status(200).json({ success: true, goals });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/goals/:id ───────────────────────────────
const getGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: "Goal not found" });
    }
    res.status(200).json({ success: true, goal });
  } catch (err) {
    next(err);
  }
};

// ─── @PATCH /api/goals/:id ─────────────────────────────
const updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!goal) {
      return res.status(404).json({ success: false, message: "Goal not found" });
    }
    res.status(200).json({ success: true, goal });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/goals/:id ────────────────────────────
const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: "Goal not found" });
    }
    res.status(200).json({ success: true, message: "Goal deleted" });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/goals/:id/contribute ──────────────────
const contributeToGoal = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: "Goal not found" });
    }
    if (goal.isCompleted) {
      return res.status(400).json({ success: false, message: "Goal already completed" });
    }

    goal.currentAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
    await goal.save();

    res.status(200).json({ success: true, goal });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/goals/:id/optimize ─────────────────────
const optimizeGoal = async (req, res, next) => {
  try {
    const user = req.user;

    // Check AI usage limit
    if (!user.canUseAI()) {
      return res.status(403).json({
        success: false,
        message: "Free tier AI limit reached (5/month). Upgrade to Pro.",
      });
    }

    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: "Goal not found" });
    }

    const prompt = `
A user has the following financial goal:
- Title: ${goal.title}
- Target Amount: $${goal.targetAmount}
- Current Savings: $${goal.currentAmount}
- Deadline: ${new Date(goal.deadline).toDateString()}
- Days Remaining: ${goal.daysRemaining}
- Monthly Saving Needed: $${goal.monthlySavingNeeded}
- Monthly Income: $${user.monthlyIncome}

Give 3 short, practical, personalized tips to help them reach this goal on time.
Be direct. No fluff. Format as a plain numbered list.
Add a financial disclaimer at the end in one sentence.
    `;

    const response = await gemini.chat.completions.create({
      model: process.env.GEMINI_MODEL || "gemini-1.5-pro",
      max_tokens: 300,
      messages: [
        { role: "system", content: "You are a concise personal finance advisor." },
        { role: "user", content: prompt },
      ],
    });

    const suggestion = response.choices[0].message.content.trim();

    // Cache suggestion on goal
    goal.aiSuggestion = suggestion;
    await goal.save();

    // Increment AI usage
    user.aiQueriesUsed += 1;
    await user.save();

    res.status(200).json({ success: true, suggestion });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGoal,
  getGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
  optimizeGoal,
};