const crypto = require("crypto");
const db = require("../config/db");
const { calculateAndAddPoints, getConfig } = require("./loyaltyController");

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach((key) => { sorted[key] = obj[key]; });
  return sorted;
}

function buildQueryString(params) {
  return Object.keys(params)
    .map(key => {
      const value = params[key];
      return encodeURIComponent(key) + "=" + encodeURIComponent(value).replace(/%20/g, "+");
    })
    .join("&");
}

// ════════════════════════════════════════════════════════════
// 1. TẠO URL THANH TOÁN VNPAY
// Thêm hỗ trợ: pointsToUse (số điểm muốn dùng để giảm giá)
// ════════════════════════════════════════════════════════════
exports.createPayment = async (req, res) => {
  const hashSecret = (process.env.VNP_HASH_SECRET || "").trim();
  const tmnCode    = (process.env.VNP_TMN_CODE || "").trim();
  const returnUrl  = (process.env.VNP_RETURN_URL || "").trim();
  const vnpUrl     = (process.env.VNP_URL || "").trim();

  const {
    userId, amount, orderInfo, items,
    shippingName, shippingPhone, shippingAddress,
    pointsToUse = 0
  } = req.body;

  try {
    const cfg = await getConfig();
    const pointValueUsd = parseFloat(cfg.point_value_usd || 0.004);
    const maxRedeemPercent = parseInt(cfg.max_redeem_percent || 30);
    const minRedeem = parseInt(cfg.min_points_to_redeem || 100);

    // ── VALIDATE & TÍNH GIẢM GIÁ TỪ ĐIỂM ─────────────────
    let actualPointsUsed  = 0;
    let discountFromPoints = 0;
    let finalAmount        = parseFloat(amount);

    if (pointsToUse > 0) {
      const [user] = await query("SELECT loyalty_points FROM users WHERE id = ?", [userId]);
      const availablePoints = user?.loyalty_points || 0;

      if (availablePoints < minRedeem) {
        return res.status(400).json({
          message: `Cần ít nhất ${minRedeem} điểm. Bạn chỉ có ${availablePoints} điểm.`
        });
      }

      const requestedDiscount = pointsToUse * pointValueUsd;
      const maxDiscount = amount * maxRedeemPercent / 100;
      const actualDiscount = Math.min(requestedDiscount, maxDiscount);

      actualPointsUsed   = Math.min(pointsToUse, Math.ceil(actualDiscount / pointValueUsd), availablePoints);
      discountFromPoints = parseFloat((actualPointsUsed * pointValueUsd).toFixed(2));
      finalAmount        = parseFloat((amount - discountFromPoints).toFixed(2));

      if (finalAmount < 0.01) finalAmount = 0.01; // Tối thiểu $0.01
    }

    // ── XÓA ĐƠN PENDING CŨ ────────────────────────────────
    const pendingOrders = await query(`
      SELECT id FROM orders
      WHERE user_id = ?
        AND payment_status = 'pending'
        AND payment_method = 'vnpay'
        AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
      ORDER BY created_at DESC LIMIT 1
    `, [userId]);

    if (pendingOrders.length > 0) {
      const oldId = pendingOrders[0].id;
      await query("DELETE FROM order_items WHERE order_id = ?", [oldId]);
      await query("DELETE FROM orders WHERE id = ?", [oldId]);
    }

    // ── TẠO ĐƠN MỚI ────────────────────────────────────────
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const createDate =
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    const txnRef = Date.now() + "_" + userId;

    // Nếu dùng điểm → trừ điểm TRƯỚC khi tạo đơn (optimistic deduct)
    if (actualPointsUsed > 0) {
      // Đảm bảo điểm thực tế đủ để trừ (Race Condition Fix)
      const updateRes = await query(
        "UPDATE users SET loyalty_points = loyalty_points - ? WHERE id = ? AND loyalty_points >= ?",
        [actualPointsUsed, userId, actualPointsUsed]
      );

      if (updateRes.affectedRows === 0) {
        return res.status(400).json({ message: "Điểm không đủ hoặc giao dịch bị trùng lặp!" });
      }

      // Lấy số dư sau khi trừ để lưu lịch sử (FIX LỖI MẤT BIẾN userAfter)
      const [userAfter] = await query("SELECT loyalty_points FROM users WHERE id = ?", [userId]);

      // Ghi lịch sử trừ điểm
      await query(
        `INSERT INTO loyalty_transactions
          (user_id, order_id, type, points, balance_after, description)
         VALUES (?, NULL, 'redeem', ?, ?, ?)`,
        [
          userId, -actualPointsUsed, userAfter.loyalty_points,
          `Dùng ${actualPointsUsed} điểm giảm $${discountFromPoints} cho đơn hàng mới`
        ]
      );
    }

    // Tạo đơn hàng
    const orderResult = await query(`
      INSERT INTO orders
        (user_id, total, status, payment_method, payment_status, vnp_txn_ref,
         shipping_name, shipping_phone, shipping_address,
         points_used, discount_from_points)
      VALUES (?, ?, 'pending', 'vnpay', 'pending', ?, ?, ?, ?, ?, ?)
    `, [
      userId, finalAmount, txnRef,
      shippingName, shippingPhone, shippingAddress,
      actualPointsUsed, discountFromPoints
    ]);

    const orderId = orderResult.insertId;

    // Cập nhật order_id cho transaction vừa tạo (nếu có dùng điểm)
    if (actualPointsUsed > 0) {
      await query(
        "UPDATE loyalty_transactions SET order_id = ? WHERE user_id = ? AND type = 'redeem' AND order_id IS NULL ORDER BY id DESC LIMIT 1",
        [orderId, userId]
      );
    }

    if (items && items.length > 0) {
      const itemValues = items.map((item) => [orderId, item.id, item.quantity || 1, item.price]);
      await query("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?", [itemValues]);
    }

    // ── BUILD VNPAY URL ────────────────────────────────────
    const vnpParams = {
      vnp_Version:    "2.1.0",
      vnp_Command:    "pay",
      vnp_TmnCode:    tmnCode,
      vnp_Amount:     String(Math.round(finalAmount * 2500000)), // USD -> VND (tỉ giá 25k) -> VNPay format (*100)
      vnp_CurrCode:   "VND",
      vnp_TxnRef:     txnRef,
      vnp_OrderInfo:  `Thanh toan don hang ${orderId}`,
      vnp_OrderType:  "other",
      vnp_Locale:     "vn",
      vnp_ReturnUrl:  returnUrl,
      vnp_IpAddr:     "127.0.0.1",
      vnp_CreateDate: createDate,
    };

    const sortedParams  = sortObject(vnpParams);
    const signData      = buildQueryString(sortedParams);
    const hmac          = crypto.createHmac("sha512", hashSecret);
    const secureHash    = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    const paymentUrl    = vnpUrl + "?" + signData + "&vnp_SecureHash=" + secureHash;

    res.json({
      paymentUrl,
      orderId,
      pointsUsed: actualPointsUsed,
      discountFromPoints,
      finalAmount,
      originalAmount: parseFloat(amount),
    });

  } catch (err) {
    console.error("❌ Lỗi createPayment:", err);
    res.status(500).json({ message: "Lỗi tạo đơn hàng", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// 2. XỬ LÝ CALLBACK TỪ VNPAY
// Sau khi thanh toán thành công → tự động tích điểm
// ════════════════════════════════════════════════════════════
exports.vnpayReturn = async (req, res) => {
  const hashSecret = (process.env.VNP_HASH_SECRET || "").trim();

  const vnpParams  = { ...req.query };
  const secureHash = vnpParams["vnp_SecureHash"];

  delete vnpParams["vnp_SecureHash"];
  delete vnpParams["vnp_SecureHashType"];

  const sortedParams   = sortObject(vnpParams);
  const signData       = buildQueryString(sortedParams);
  const hmac           = crypto.createHmac("sha512", hashSecret);
  const calculatedHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const txnRef        = vnpParams["vnp_TxnRef"];
  const responseCode  = vnpParams["vnp_ResponseCode"];
  const transactionNo = vnpParams["vnp_TransactionNo"];

  if (calculatedHash !== secureHash) {
    return res.redirect(`http://localhost:3000/checkout/result?status=invalid&txnRef=${txnRef}`);
  }

  try {
    if (responseCode === "00") {
      // ── THANH TOÁN THÀNH CÔNG ──
      await query(`
        UPDATE orders
        SET payment_status = 'paid', status = 'confirmed', vnp_transaction_no = ?
        WHERE vnp_txn_ref = ?
      `, [transactionNo, txnRef]);

      const [order] = await query(
        "SELECT id, user_id, total, payment_method, points_earned FROM orders WHERE vnp_txn_ref = ?",
        [txnRef]
      );

      if (order && order.user_id && order.points_earned === 0) {
        await calculateAndAddPoints(order.id, order.user_id, order.total, "vnpay");
      }

      res.redirect(
        `http://localhost:3000/checkout/result?status=success&txnRef=${txnRef}&transactionNo=${transactionNo}`
      );
    } else {
      // ── THANH TOÁN THẤT BẠI ──
      
      // FIX LỖI REFUND: Thêm payment_status vào câu SELECT
      const [order] = await query(
        "SELECT id, user_id, points_used, discount_from_points, payment_status FROM orders WHERE vnp_txn_ref = ?",
        [txnRef]
      );

      // Chỉ hoàn lại điểm nếu đơn hàng đang ở trạng thái pending (Chống dội API làm nhân bản điểm)
      if (order && order.points_used > 0 && order.payment_status === 'pending') {
        
        await query(
          "UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?",
          [order.points_used, order.user_id]
        );

        const [user] = await query("SELECT loyalty_points FROM users WHERE id = ?", [order.user_id]);

        await query(
          `INSERT INTO loyalty_transactions
            (user_id, order_id, type, points, balance_after, description)
           VALUES (?, ?, 'earn', ?, ?, ?)`,
          [order.user_id, order.id, order.points_used, user.loyalty_points, 
          `Hoàn ${order.points_used} điểm do đơn #${order.id} thanh toán thất bại`]
        );
      }

      await query("UPDATE orders SET payment_status = 'failed' WHERE vnp_txn_ref = ?", [txnRef]);

      res.redirect(`http://localhost:3000/checkout/result?status=failed&txnRef=${txnRef}&code=${responseCode}`);
    }
  } catch (err) {
    console.error("❌ Lỗi vnpayReturn:", err);
    res.redirect(`http://localhost:3000/checkout/result?status=failed&txnRef=${txnRef}`);
  }
};

// ════════════════════════════════════════════════════════════
// 3. KIỂM TRA TRẠNG THÁI ĐƠN HÀNG
// ════════════════════════════════════════════════════════════
exports.getOrderByTxnRef = async (req, res) => {
  const { txnRef } = req.params;
  try {
    const result = await query(`
      SELECT o.*, u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.vnp_txn_ref = ?
    `, [txnRef]);

    if (!result.length) return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};