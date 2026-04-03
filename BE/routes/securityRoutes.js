// BE/routes/securityRoutes.js
const express    = require("express");
const router     = express.Router();
const secCtrl    = require("../controllers/securityController");
const verifyToken = require("../middleware/authMiddleware");

// Middleware: chỉ admin mới được truy cập
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Bạn không có quyền truy cập!" });
  }
  next();
};

// GET  /api/security/login-logs   — danh sách log
router.get("/login-logs", verifyToken, isAdmin, secCtrl.getLoginLogs);

// GET  /api/security/alerts       — cảnh báo bảo mật
router.get("/alerts",verifyToken, isAdmin, secCtrl.getSecurityAlerts);

// GET  /api/security/stats        — thống kê nhanh
router.get("/stats", verifyToken, isAdmin, secCtrl.getSecurityStats);

// POST /api/security/unlock/:userId — mở khóa tài khoản
router.post("/unlock/:userId", verifyToken, isAdmin, secCtrl.unlockAccount);

// POST /api/security/alerts/dismiss  — admin tắt cảnh báo
router.post("/alerts/dismiss", verifyToken, isAdmin, secCtrl.dismissAlert);

module.exports = router;