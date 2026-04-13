// BE/routes/orderRoutes.js — ĐÃ FIX HOÀN TOÀN
// Fix: 1) Xóa route /place-cod bị khai báo 2 lần
//      2) Lưu đủ voucher_id, voucher_code, discount_from_voucher vào orders
//      3) Cập nhật used_count và user_vouchers đúng cách trong cùng 1 transaction

const express = require("express");
const router  = express.Router();
const { getMyOrders } = require("../controllers/orderController");
const authMiddleware  = require("../middleware/authMiddleware");
const db = require("../config/db");
const { calculateAndAddPoints, getConfig } = require("../controllers/loyaltyController");
const { verifyAndCalculateVoucher } = require("../controllers/voucherController");


function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// GET /api/orders/my-orders
router.get("/my-orders", authMiddleware, getMyOrders);


// POST /api/orders/place-cod
router.post("/place-cod", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const {
    items,
    shippingName,
    shippingPhone,
    shippingAddress,
    pointsToUse  = 0,
    voucherCode  = null,
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Giỏ hàng trống" });
  }

  try {
    // ── Bắt đầu transaction ─────────────────────────────────
    await query("START TRANSACTION");

    const cfg = await getConfig();
    const pointValueUsd  = parseFloat(cfg.point_value_usd   || 0.004);
    const maxRedeemPct   = parseInt(cfg.max_redeem_percent   || 30);
    const minRedeem      = parseInt(cfg.min_points_to_redeem || 100);
    const minOrderToEarn = parseFloat(cfg.min_order_to_earn  || 10);

    // ── BƯỚC 1: Tính giá thật từ DB ────────────────────────
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const [product] = await query(
        "SELECT price, category_id FROM products WHERE id = ?",
        [item.id]
      );
      if (!product) {
        throw new Error(`Sản phẩm ID ${item.id} không tồn tại`);
      }
      const realPrice = parseFloat(product.price);
      subtotal += realPrice * (item.quantity || 1);
      processedItems.push({
        id:          item.id,
        quantity:    item.quantity || 1,
        price:       realPrice,
        category_id: product.category_id,
      });
    }

    // ── BƯỚC 2: Kiểm tra & tính giảm từ voucher ───────────
    // FIX: Dùng verifyAndCalculateVoucher (đã bao gồm check hạn, check scope,
    //       check usage per user). Kết quả trả về voucher object + discountAmount.
    let discountFromVoucher = 0;
    let validatedVoucherId  = null;
    let validatedVoucherCode = null;

    if (voucherCode && voucherCode.trim()) {
      // verifyAndCalculateVoucher ném Error nếu không hợp lệ → transaction ROLLBACK
      const vResult = await verifyAndCalculateVoucher(
        voucherCode.trim(),
        processedItems,  // cartItems gồm { id, price, quantity, category_id }
        userId
      );
      discountFromVoucher  = vResult.discountAmount;
      validatedVoucherId   = vResult.voucher.id;
      validatedVoucherCode = vResult.voucher.code;
    }

    // ── BƯỚC 3: Tính giảm từ điểm tích lũy ────────────────
    let actualPointsUsed   = 0;
    let discountFromPoints = 0;
    // Tính trên giá đã trừ voucher
    let finalAmount = parseFloat((subtotal - discountFromVoucher).toFixed(2));

    if (pointsToUse > 0) {
      // FIX: Dùng SELECT ... FOR UPDATE để lock row user tránh race condition
      const [user] = await query(
        "SELECT loyalty_points FROM users WHERE id = ? FOR UPDATE",
        [userId]
      );
      const available = user?.loyalty_points || 0;

      if (available >= minRedeem && pointsToUse <= available) {
        const requestedDiscount = pointsToUse * pointValueUsd;
        const maxDiscount       = finalAmount * maxRedeemPct / 100;
        const actualDiscount    = Math.min(requestedDiscount, maxDiscount);

        actualPointsUsed   = Math.min(
          pointsToUse,
          Math.ceil(actualDiscount / pointValueUsd),
          available
        );
        discountFromPoints = parseFloat(
          (actualPointsUsed * pointValueUsd).toFixed(2)
        );
        finalAmount = parseFloat(
          (finalAmount - discountFromPoints).toFixed(2)
        );
        if (finalAmount < 0.01) finalAmount = 0.01;

        // FIX: Trừ điểm với điều kiện loyalty_points >= actualPointsUsed
        const updateRes = await query(
          "UPDATE users SET loyalty_points = loyalty_points - ? WHERE id = ? AND loyalty_points >= ?",
          [actualPointsUsed, userId, actualPointsUsed]
        );
        if (updateRes.affectedRows === 0) {
          throw new Error("Điểm không đủ hoặc giao dịch bị trùng lặp!");
        }
      }
    }

    // ── BƯỚC 4: Tạo đơn hàng ──────────────────────────────
    // FIX: Lưu đủ voucher_id, voucher_code, discount_from_voucher
    const orderResult = await query(
      `INSERT INTO orders
         (user_id, total, status, payment_method, payment_status,
          shipping_name, shipping_phone, shipping_address,
          points_used, discount_from_points,
          voucher_id, voucher_code, discount_from_voucher)
       VALUES (?, ?, 'pending', 'cod', 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        finalAmount,
        shippingName,
        shippingPhone,
        shippingAddress,
        actualPointsUsed,
        discountFromPoints,
        validatedVoucherId,           // FIX: lưu ID vào cột voucher_id
        validatedVoucherCode,         // FIX: lưu code vào cột voucher_code
        discountFromVoucher,          // FIX: lưu số tiền giảm
      ]
    );
    const orderId = orderResult.insertId;

    // ── BƯỚC 5: Chèn order items ───────────────────────────
    if (processedItems.length > 0) {
      const itemValues = processedItems.map(i => [orderId, i.id, i.quantity, i.price]);
      await query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?",
        [itemValues]
      );
    }

    // ── BƯỚC 6: Ghi lịch sử trừ điểm (nếu có) ─────────────
    if (actualPointsUsed > 0) {
      const [userAfter] = await query(
        "SELECT loyalty_points FROM users WHERE id = ?",
        [userId]
      );
      await query(
        `INSERT INTO loyalty_transactions
           (user_id, order_id, type, points, balance_after, description)
         VALUES (?, ?, 'redeem', ?, ?, ?)`,
        [
          userId,
          orderId,
          -actualPointsUsed,
          userAfter.loyalty_points,
          `Dùng ${actualPointsUsed} điểm giảm $${discountFromPoints} cho đơn COD #${orderId}`,
        ]
      );
    }

    // ── BƯỚC 7: Cập nhật trạng thái voucher sau khi dùng ───
    // FIX: Logic đúng — tăng used_count + đổi trạng thái user_vouchers
    if (validatedVoucherId) {
      // Tăng used_count của voucher
      await query(
        "UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?",
        [validatedVoucherId]
      );

      // Tìm user_voucher đang active của user với voucher này
      const [existingUV] = await query(
        `SELECT id FROM user_vouchers
         WHERE user_id = ? AND voucher_id = ? AND status = 'active'
         LIMIT 1`,
        [userId, validatedVoucherId]
      );

      if (existingUV) {
        // User đã lưu voucher vào ví → đổi thành used
        await query(
          "UPDATE user_vouchers SET status='used', order_id=?, used_at=NOW() WHERE id=?",
          [orderId, existingUV.id]
        );
      } else {
        // User nhập mã trực tiếp mà chưa lưu vào ví → insert mới với status=used
        await query(
          `INSERT INTO user_vouchers
             (user_id, voucher_id, order_id, status, points_spent, used_at)
           VALUES (?, ?, ?, 'used', 0, NOW())`,
          [userId, validatedVoucherId, orderId]
        );
      }
    }

    // ── BƯỚC 8: Commit transaction ─────────────────────────
    await query("COMMIT");

    // ── BƯỚC 9: Tích điểm COD (gọi sau COMMIT vì hàm này có transaction riêng) ──
    let pointsEarned = 0;
    if (finalAmount >= minOrderToEarn) {
      pointsEarned = await calculateAndAddPoints(orderId, userId, finalAmount, "cod");
    }

    res.status(201).json({
      message:             "Đặt hàng thành công",
      orderId,
      pointsUsed:          actualPointsUsed,
      discountFromPoints,
      discountFromVoucher,
      voucherCode:         validatedVoucherCode,
      finalAmount,
      pointsEarned,
    });

  } catch (err) {
    await query("ROLLBACK");
    console.error("place-cod error:", err.message);
    res.status(400).json({ message: err.message || "Lỗi khi đặt hàng" });
  }
});

module.exports = router;