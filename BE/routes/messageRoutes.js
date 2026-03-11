// BE/routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const verifyToken = require("../middleware/authMiddleware");

// 1. Lấy lịch sử tin nhắn: GET /api/messages/history/:userId
router.get("/history/:userId", verifyToken, messageController.getMessagesByUserId);

// 2. Xóa tin nhắn: DELETE /api/messages/delete/:id
router.delete("/delete/:id", verifyToken, messageController.deleteMessage);

module.exports = router;