const express = require("express");
const router  = express.Router();
const { getMyOrders } = require("../controllers/orderController");
const authMiddleware  = require("../middleware/authMiddleware");
const db = require("../config/db");
const { calculateAndAddPoints, getConfig } = require("../controllers/loyaltyController");

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// GET /api/orders/my-orders (giữ nguyên)
router.get("/my-orders", authMiddleware, getMyOrders);

// ────────────────────────────────────────────────────────────────────
// POST /api/orders/place-cod — Đặt hàng COD (có hỗ trợ điểm)
// ────────────────────────────────────────────────────────────────────
router.post("/place-cod", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const {
    items, shippingName, shippingPhone, shippingAddress,
    pointsToUse = 0
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Giỏ hàng trống" });
  }

  try {
    const cfg = await getConfig();
    const pointValueUsd   = parseFloat(cfg.point_value_usd || 0.004);
    const maxRedeemPct    = parseInt(cfg.max_redeem_percent || 30);
    const minRedeem       = parseInt(cfg.min_points_to_redeem || 100);
    const minOrderToEarn  = parseFloat(cfg.min_order_to_earn || 10);

    // ── FIX 1: BẢO MẬT - TÍNH LẠI TỔNG TIỀN TỪ DATABASE ───────────
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      // Lấy giá trị thật của sản phẩm từ Database
      const [product] = await query("SELECT price FROM products WHERE id = ?", [item.id]);
      
      if (!product) {
        return res.status(400).json({ message: `Sản phẩm ID ${item.id} không tồn tại hoặc đã bị xóa.` });
      }

      const realPrice = parseFloat(product.price);
      subtotal += realPrice * item.quantity;
      
      // Lưu lại giá trị thật để insert vào order_items sau này
      processedItems.push([item.id, item.quantity, realPrice]); 
    }

    // ── Xử lý điểm quy đổi ────────────────────────────────
    let actualPointsUsed   = 0;
    let discountFromPoints = 0;
    let finalAmount        = subtotal;

    if (pointsToUse > 0) {
      const [user] = await query("SELECT loyalty_points FROM users WHERE id = ?", [userId]);
      const available = user?.loyalty_points || 0;

      if (available >= minRedeem) {
        const requestedDiscount = pointsToUse * pointValueUsd;
        const maxDiscount       = subtotal * maxRedeemPct / 100;
        const actualDiscount    = Math.min(requestedDiscount, maxDiscount);

        actualPointsUsed   = Math.min(pointsToUse, Math.ceil(actualDiscount / pointValueUsd), available);
        discountFromPoints = parseFloat((actualPointsUsed * pointValueUsd).toFixed(2));
        finalAmount        = parseFloat((subtotal - discountFromPoints).toFixed(2));

        if (finalAmount < 0.01) finalAmount = 0.01;

        // ── FIX 2: RACE CONDITION - TRỪ ĐIỂM AN TOÀN ───────────
        const updateRes = await query(
          "UPDATE users SET loyalty_points = loyalty_points - ? WHERE id = ? AND loyalty_points >= ?",
          [actualPointsUsed, userId, actualPointsUsed]
        );

        // Nếu update không thành công (do điểm không đủ hoặc gửi 2 request cùng lúc)
        if (updateRes.affectedRows === 0) {
          return res.status(400).json({ message: "Điểm không đủ hoặc giao dịch bị trùng lặp!" });
        }
      }
    }

    // ── Tạo đơn hàng ──────────────────────────────────────
    const orderResult = await query(`
      INSERT INTO orders
        (user_id, total, status, payment_method, payment_status,
         shipping_name, shipping_phone, shipping_address,
         points_used, discount_from_points)
      VALUES (?, ?, 'pending', 'cod', 'pending', ?, ?, ?, ?, ?)
    `, [userId, finalAmount, shippingName, shippingPhone, shippingAddress,
        actualPointsUsed, discountFromPoints]);

    const orderId = orderResult.insertId;

    // ── Insert order items (sử dụng giá thật từ DB) ───────
    if (processedItems.length > 0) {
      const itemValues = processedItems.map(i => [orderId, i[0], i[1], i[2]]);
      await query("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?", [itemValues]);
    }

    // Ghi lịch sử trừ điểm (nếu có dùng)
    if (actualPointsUsed > 0) {
      const [userAfter] = await query("SELECT loyalty_points FROM users WHERE id = ?", [userId]);
      await query(
        `INSERT INTO loyalty_transactions
          (user_id, order_id, type, points, balance_after, description)
         VALUES (?, ?, 'redeem', ?, ?, ?)`,
        [userId, orderId, -actualPointsUsed, userAfter.loyalty_points,
         `Dùng ${actualPointsUsed} điểm giảm $${discountFromPoints} cho đơn COD #${orderId}`]
      );
    }

    // ── Tích điểm COD (tích ngay vì COD không cần xác nhận thanh toán) ──
    let pointsEarned = 0;
    if (finalAmount >= minOrderToEarn) {
      pointsEarned = await calculateAndAddPoints(orderId, userId, finalAmount, "cod");
    }

    res.status(201).json({
      message: "Đặt hàng thành công",
      orderId,
      pointsUsed: actualPointsUsed,
      discountFromPoints,
      finalAmount,
      pointsEarned,
    });

  } catch (err) {
    console.error("place-cod error:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;