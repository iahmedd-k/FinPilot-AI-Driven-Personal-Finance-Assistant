const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  listTransactionCategories,
  createTransactionCategory,
  updateTransactionCategory,
} = require("../controllers/transactionCategory.controller");

const router = express.Router();

router.use(protect);

router.get("/", listTransactionCategories);
router.post("/", createTransactionCategory);
router.patch("/:id", updateTransactionCategory);

module.exports = router;
