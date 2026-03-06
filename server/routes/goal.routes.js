const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { goalSchema, updateGoalSchema, contributeSchema } = require("../validators/goal.validator");
const {
  createGoal,
  getGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
  optimizeGoal,
} = require("../controllers/goal.controller");

router.use(protect);

router.get("/",                 getGoals);
router.post("/",                validate(goalSchema),        createGoal);
router.get("/:id",              getGoal);
router.patch("/:id",            validate(updateGoalSchema),  updateGoal);
router.delete("/:id",           deleteGoal);
router.post("/:id/contribute",  validate(contributeSchema),  contributeToGoal);
router.get("/:id/optimize",     optimizeGoal);

module.exports = router;