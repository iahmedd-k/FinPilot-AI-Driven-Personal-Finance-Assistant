const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createSession,
  getSessions,
  getMessages,
  addMessage,
  renameSession,
  deleteSession,
} = require("../controllers/chatSessionController");

router.use(protect);

router.post  ("/sessions",               createSession);
router.get   ("/sessions",               getSessions);
router.get   ("/sessions/:id/messages",  getMessages);
router.post  ("/sessions/:id/messages",  addMessage);
router.patch ("/sessions/:id",           renameSession);
router.delete("/sessions/:id",           deleteSession);

module.exports = router;