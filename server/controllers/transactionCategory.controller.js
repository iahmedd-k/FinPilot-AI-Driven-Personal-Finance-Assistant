const TransactionCategory = require("../models/TransactionCategory");
const Transaction = require("../models/Transaction");

const listTransactionCategories = async (req, res, next) => {
  try {
    const categories = await TransactionCategory.find({ userId: req.user._id }).sort({ type: 1, name: 1 });
    res.status(200).json({ success: true, categories });
  } catch (err) {
    next(err);
  }
};

const createTransactionCategory = async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const type = req.body?.type === "income" ? "income" : "expense";

    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const existing = await TransactionCategory.findOne({
      userId: req.user._id,
      type,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const category = await TransactionCategory.create({
      userId: req.user._id,
      name,
      type,
    });

    res.status(201).json({ success: true, category });
  } catch (err) {
    next(err);
  }
};

const updateTransactionCategory = async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const category = await TransactionCategory.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const duplicate = await TransactionCategory.findOne({
      _id: { $ne: category._id },
      userId: req.user._id,
      type: category.type,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (duplicate) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }

    const previousName = category.name;
    category.name = name;
    await category.save();
    await Transaction.updateMany(
      {
        userId: req.user._id,
        type: category.type,
        category: previousName,
      },
      {
        $set: { category: name },
      }
    );

    res.status(200).json({
      success: true,
      category,
      previousName,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTransactionCategories,
  createTransactionCategory,
  updateTransactionCategory,
};
