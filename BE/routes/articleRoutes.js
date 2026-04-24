// BE/routes/articleRoutes.js

const express    = require("express");
const router     = express.Router();
const ctrl       = require("../controllers/articleController");
const verifyToken = require("../middleware/authMiddleware");

// Middleware chỉ Admin mới được dùng
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Chỉ Admin mới có quyền thực hiện thao tác này." });
  }
  next();
};


// Lấy bài viết đã xuất bản của 1 sản phẩm (User xem ở ProductDetail)
router.get("/public/:productId", ctrl.getPublicArticle);

// ════════════════════════════════════════════════════════════
// ADMIN ROUTES (Cần đăng nhập + quyền Admin)
// ════════════════════════════════════════════════════════════

// Tổng quan tất cả bài viết
router.get("/admin/all", verifyToken, isAdmin, ctrl.adminGetAllArticles);

// AI tạo bài viết mới (POST body: { productId })
router.post("/generate", verifyToken, isAdmin, ctrl.generateArticle);

// Lấy danh sách bài viết theo sản phẩm
router.get("/product/:productId", verifyToken, isAdmin, ctrl.getArticlesByProduct);

// Xem chi tiết 1 bài viết
router.get("/:id", verifyToken, isAdmin, ctrl.getArticleById);

// Cập nhật nội dung bài viết
router.put("/:id", verifyToken, isAdmin, ctrl.updateArticle);

// Xuất bản bài viết (draft → published)
router.put("/:id/publish", verifyToken, isAdmin, ctrl.publishArticle);

// Gỡ xuất bản (published → draft)
router.put("/:id/unpublish", verifyToken, isAdmin, ctrl.unpublishArticle);

// Xoá bài viết
router.delete("/:id", verifyToken, isAdmin, ctrl.deleteArticle);

module.exports = router;