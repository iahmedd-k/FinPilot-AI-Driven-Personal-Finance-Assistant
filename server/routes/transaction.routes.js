const express = require("express");
const router = express.Router();
const multer = require("multer");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { transactionSchema, updateTransactionSchema } = require("../validators/transaction.validator");
const {
  addTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  importCSV,
} = require("../controllers/transaction.controller");

// Multer — memory storage for CSV parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },    // 2MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
});

// All routes protected
router.use(protect);

router.get("/",           getTransactions);
router.post("/",          validate(transactionSchema),       addTransaction);
router.post("/csv",       upload.single("file"),             importCSV);
router.delete("/bulk",    bulkDeleteTransactions);
router.get("/:id",        getTransaction);
router.patch("/:id",      validate(updateTransactionSchema), updateTransaction);
router.delete("/:id",     deleteTransaction);

module.exports = router;