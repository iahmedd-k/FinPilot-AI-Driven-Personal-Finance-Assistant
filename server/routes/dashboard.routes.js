const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getDashboard, getSummary } = require("../controllers/dashboard.controller");

router.use(protect);

router.get("/",        getDashboard);   // Full dashboard data
router.get("/summary", getSummary);     // Lightweight summary only

module.exports = router;