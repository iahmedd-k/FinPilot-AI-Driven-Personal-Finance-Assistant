const Transaction = require("../models/Transaction");
const User = require("../models/User");
const categorizeTransaction = require("../services/ai/categorizeTransaction");
const { parseCSV } = require("../utils/csvParser");

// ─── @POST /api/transactions ───────────────────────────
const addTransaction = async (req, res, next) => {
  try {
    const user = req.user;

    // Check free tier limit
    if (!user.canAddTransaction()) {
      return res.status(403).json({
        success: false,
        message: "Free tier limit reached (10/month). Upgrade to Pro.",
      });
    }

    const { amount, type, category, merchant, date, notes, isRecurring } = req.body;

    // AI auto-categorize if no category provided
    let finalCategory = category;
    let isCategorizedByAI = false;
    if (!category && merchant) {
      finalCategory = await categorizeTransaction(merchant, type);
      isCategorizedByAI = true;
    }

    const transaction = await Transaction.create({
      userId: user._id,
      amount,
      type,
      category: finalCategory,
      merchant,
      date: date || Date.now(),
      notes,
      isRecurring,
      isCategorizedByAI,
    });

    // Increment usage counter for free users
    await User.findByIdAndUpdate(user._id, { $inc: { transactionsUsed: 1 } });

    res.status(201).json({ success: true, transaction });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/transactions ────────────────────────────
const getTransactions = async (req, res, next) => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 20 } = req.query;

    const filter = { userId: req.user._id };
    if (type)      filter.type = type;
    if (category)  filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate)   filter.date.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      transactions,
    });
  } catch (err) {
    next(err);
  }
};

// ─── @GET /api/transactions/:id ────────────────────────
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({ success: true, transaction });
  } catch (err) {
    next(err);
  }
};

// ─── @PATCH /api/transactions/:id ─────────────────────
const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({ success: true, transaction });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/transactions/:id ────────────────────
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    // Decrement usage counter
    await User.findByIdAndUpdate(req.user._id, { $inc: { transactionsUsed: -1 } });

    res.status(200).json({ success: true, message: "Transaction deleted" });
  } catch (err) {
    next(err);
  }
};

// ─── @DELETE /api/transactions/bulk ───────────────────
const bulkDeleteTransactions = async (req, res, next) => {
  try {
    const { ids } = req.body;                // Array of transaction IDs
    if (!ids || !ids.length) {
      return res.status(400).json({ success: false, message: "No IDs provided" });
    }

    const result = await Transaction.deleteMany({
      _id: { $in: ids },
      userId: req.user._id,
    });

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { transactionsUsed: -result.deletedCount },
    });

    res.status(200).json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    next(err);
  }
};

// ─── @POST /api/transactions/csv ──────────────────────
const importCSV = async (req, res, next) => {
  try {
    const user = req.user;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No CSV file uploaded" });
    }

    const rows = parseCSV(req.file.buffer.toString());
    if (!rows.length) {
      return res.status(400).json({ success: false, message: "CSV is empty or invalid" });
    }

    // Check free tier limit
    if (!user.canAddTransaction()) {
      return res.status(403).json({
        success: false,
        message: "Free tier limit reached. Upgrade to Pro.",
      });
    }

    // Build transactions with AI categorization
    const transactions = await Promise.all(
      rows.map(async (row) => {
        const category = await categorizeTransaction(row.merchant, row.type);
        return {
          userId: user._id,
          amount: row.amount,
          type: row.type,
          merchant: row.merchant || "",
          date: row.date || Date.now(),
          notes: row.notes || "",
          category,
          isCategorizedByAI: true,
          isFromCSV: true,
        };
      })
    );

    const inserted = await Transaction.insertMany(transactions);

    await User.findByIdAndUpdate(user._id, {
      $inc: { transactionsUsed: inserted.length },
    });

    res.status(201).json({
      success: true,
      message: `${inserted.length} transactions imported`,
      transactions: inserted,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  importCSV,
};