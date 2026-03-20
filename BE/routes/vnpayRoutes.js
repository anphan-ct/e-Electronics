const express = require("express");
const router = express.Router();
const vnpayController = require("../controllers/vnpayController");
const verifyToken = require("../middleware/authMiddleware");

// Tạo URL thanh toán (cần đăng nhập)
router.post("/create-payment", verifyToken, vnpayController.createPayment);

// VNPay callback (KHÔNG dùng verifyToken vì VNPay gọi thẳng vào đây)
router.get("/return", vnpayController.vnpayReturn);

// Kiểm tra trạng thái đơn hàng
router.get("/order/:txnRef", verifyToken, vnpayController.getOrderByTxnRef);

module.exports = router;