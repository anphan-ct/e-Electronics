const express = require("express");
const router  = express.Router();
const loyaltyCtrl = require("../controllers/loyaltyController");
const verifyToken  = require("../middleware/authMiddleware");

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

// ── USER ROUTES ────────────────────────────────────────────
// Xem điểm + thông tin quy đổi
router.get("/info",    verifyToken, loyaltyCtrl.getMyPoints);
// Lịch sử giao dịch điểm
router.get("/history", verifyToken, loyaltyCtrl.getMyHistory);
// Xem trước khi quy đổi
router.post("/preview-redeem", verifyToken, loyaltyCtrl.previewRedeem);

// ── ADMIN ROUTES ───────────────────────────────────────────
router.get("/admin/stats",        verifyToken, isAdmin, loyaltyCtrl.adminGetStats);
router.get("/admin/users",        verifyToken, isAdmin, loyaltyCtrl.adminGetAllUsersPoints);
router.get("/admin/transactions", verifyToken, isAdmin, loyaltyCtrl.adminGetAllTransactions);
router.post("/admin/adjust",      verifyToken, isAdmin, loyaltyCtrl.adminAdjustPoints);
router.get("/admin/config",       verifyToken, isAdmin, loyaltyCtrl.adminGetConfig);
router.put("/admin/config",       verifyToken, isAdmin, loyaltyCtrl.adminUpdateConfig);

module.exports = router;