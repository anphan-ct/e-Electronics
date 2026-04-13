const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const verifyToken = require("../middleware/authMiddleware");


// Middleware Admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
};

// 1. Lấy lịch sử tin nhắn: GET /api/messages/history/:userId
router.get("/history/:userId", verifyToken, messageController.getMessagesByUserId);

//2. Lấy lịch sử tin nhắn (AdminChat - GỘP cả tin AI và Admin): GET /api/messages/admin/history/:userId
router.get("/admin/history/:userId", verifyToken, isAdmin, messageController.getAllMessagesByUserId);

// 3. Xóa tin nhắn: DELETE /api/messages/delete/:id
router.delete("/delete/:id", verifyToken, messageController.deleteMessage);

module.exports = router;