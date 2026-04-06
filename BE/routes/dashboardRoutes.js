const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const verifyToken = require("../middleware/authMiddleware");
 
// Middleware kiểm tra admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};
 
router.get("/stats", verifyToken, dashboardController.getStats);
router.get("/revenue-chart", verifyToken, dashboardController.getRevenueChart);
router.get("/recent-orders", verifyToken, dashboardController.getRecentOrders);
router.get("/top-products", verifyToken, dashboardController.getTopProducts);
router.get("/users", verifyToken, dashboardController.getUsers);
router.get("/orders", verifyToken, dashboardController.getAllOrders);
router.put("/orders/:id/status", verifyToken, dashboardController.updateOrderStatus);
router.get("/payment-stats", verifyToken, dashboardController.getPaymentStats);

// User management routes
router.get("/users/:id", verifyToken, isAdmin, dashboardController.getUserById);
router.get("/users/:id/orders", verifyToken, isAdmin, dashboardController.getUserOrders);
router.put("/users/:id/role", verifyToken, isAdmin, dashboardController.updateUserRole);
router.put("/users/:id/reset-password", verifyToken, isAdmin, dashboardController.resetUserPassword);
router.put("/users/:id/unlock", verifyToken, isAdmin, dashboardController.unlockUser);
router.put("/users/:id/lock", verifyToken, isAdmin, dashboardController.lockUser);
router.delete("/users/:id", verifyToken, isAdmin, dashboardController.deleteUser);

// Product management routes (CRUD) 
router.get("/products", verifyToken, dashboardController.getProducts);
router.get("/products/:id", verifyToken, isAdmin, dashboardController.getProductById);
router.post("/products", verifyToken, isAdmin, dashboardController.createProduct);
router.put("/products/:id", verifyToken, isAdmin, dashboardController.updateProduct);
router.delete("/products/:id", verifyToken, isAdmin, dashboardController.deleteProduct);

 
module.exports = router;