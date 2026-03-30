const express = require("express");
const router = express.Router();
const { getMyOrders } = require("../controllers/orderController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/my-orders", authMiddleware, getMyOrders);

module.exports = router;