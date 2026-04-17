// BE/routes/voucherRoutes.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/voucherController");
const verifyToken = require("../middleware/authMiddleware");

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin")
    return res.status(403).json({ message: "Forbidden" });
  next();
};

// ── USER ROUTES ────────────────────────────────────────────
// Kiểm tra / validate mã voucher khi checkout
router.post("/validate", verifyToken, ctrl.validateVoucher);

// Lấy danh sách voucher của tôi (ví voucher)
router.get("/my-vouchers", verifyToken, ctrl.getMyVouchers);

// Danh sách voucher có thể đổi bằng điểm
router.get("/redeemable", verifyToken, ctrl.getRedeemableVouchers);

// Đổi điểm lấy voucher
router.post("/redeem-points", verifyToken, ctrl.redeemPointsForVoucher);

// Lấy danh sách voucher public để săn
router.get("/public", verifyToken, ctrl.getPublicVouchers);

// Lưu voucher vào ví
router.post("/save", verifyToken, ctrl.saveVoucher);


// ── ADMIN ROUTES ───────────────────────────────────────────
router.get("/admin/list",       verifyToken, isAdmin, ctrl.adminGetVouchers);
router.get("/admin/stats",      verifyToken, isAdmin, ctrl.adminGetStats);
router.post("/admin/create",    verifyToken, isAdmin, ctrl.adminCreateVoucher);
router.put("/admin/:id",        verifyToken, isAdmin, ctrl.adminUpdateVoucher);
router.delete("/admin/:id",     verifyToken, isAdmin, ctrl.adminDeleteVoucher);
router.put("/admin/:id/toggle", verifyToken, isAdmin, ctrl.adminToggleVoucher);
router.post("/admin/grant",     verifyToken, isAdmin, ctrl.adminGrantVoucher);
router.get("/admin/:id",        verifyToken, isAdmin, ctrl.adminGetVoucherById);

module.exports = router;