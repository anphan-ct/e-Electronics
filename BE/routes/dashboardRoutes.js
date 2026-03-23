const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const verifyToken = require("../middleware/authMiddleware");
 
// Middleware kiểm tra admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  // Nếu không có role trong token, vẫn cho qua (tùy chỉnh theo nhu cầu)
  next();
};
 
router.get("/stats", verifyToken, dashboardController.getStats);
router.get("/revenue-chart", verifyToken, dashboardController.getRevenueChart);
router.get("/recent-orders", verifyToken, dashboardController.getRecentOrders);
router.get("/top-products", verifyToken, dashboardController.getTopProducts);
router.get("/users", verifyToken, dashboardController.getUsers);
router.get("/orders", verifyToken, dashboardController.getAllOrders);
router.put("/orders/:id/status", verifyToken, dashboardController.updateOrderStatus);
router.get("/products", verifyToken, dashboardController.getProducts);
router.get("/payment-stats", verifyToken, dashboardController.getPaymentStats);
 
module.exports = router;