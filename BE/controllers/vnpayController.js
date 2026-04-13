// BE/controllers/vnpayController.js — ĐÃ TÍCH HỢP VOUCHER

const crypto = require("crypto");
const db = require("../config/db");
const { calculateAndAddPoints, getConfig } = require("./loyaltyController");
// FIX: Import thêm verifyAndCalculateVoucher
const { verifyAndCalculateVoucher } = require("./voucherController");

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
// 1. TẠO URL THANH TOÁN VNPAY (ĐÃ THÊM VOUCHER)
// ════════════════════════════════════════════════════════════
exports.createPayment = async (req, res) => {
  const hashSecret = (process.env.VNP_HASH_SECRET || "").trim();
  const tmnCode    = (process.env.VNP_TMN_CODE    || "").trim();
  const returnUrl  = (process.env.VNP_RETURN_URL  || "").trim();
  const vnpUrl     = (process.env.VNP_URL         || "").trim();

  const {
    userId,
    amount,
    orderInfo,
    items,
    shippingName,
    shippingPhone,
    shippingAddress,
    pointsToUse = 0,
    voucherCode = null,
  } = req.body;

  try {
    const cfg = await getConfig();
    const pointValueUsd    = parseFloat(cfg.point_value_usd    || 0.004);
    const maxRedeemPercent = parseInt(cfg.max_redeem_percent    || 30);
    const minRedeem        = parseInt(cfg.min_points_to_redeem || 100);

    // ── FIX BƯỚC 1: Tính giá thật từ DB ──────────────────
    let subtotal = 0;
    const processedItems = [];

    for (const item of items || []) {
      const [product] = await query(
        "SELECT price, category_id FROM products WHERE id = ?",
        [item.id]
      );
      if (!product) throw new Error(`Sản phẩm ID ${item.id} không tồn tại`);
      const realPrice = parseFloat(product.price);
      subtotal += realPrice * (item.quantity || 1);
      processedItems.push({
        id:          item.id,
        quantity:    item.quantity || 1,
        price:       realPrice,
        category_id: product.category_id,
      });
    }

    // Nếu FE không gửi items (gửi amount trực tiếp từ cart), dùng amount từ request
    // Nhưng ưu tiên tính từ DB nếu có items
    const baseAmount = processedItems.length > 0 ? subtotal : parseFloat(amount);

    // ── FIX BƯỚC 2: Tính giảm từ voucher ─────────────────
    let discountFromVoucher  = 0;
    let validatedVoucherId   = null;
    let validatedVoucherCode = null;

    if (voucherCode && voucherCode.trim()) {
      const vResult = await verifyAndCalculateVoucher(
        voucherCode.trim(),
        processedItems,
        userId
      );
      discountFromVoucher  = vResult.discountAmount;
      validatedVoucherId   = vResult.voucher.id;
      validatedVoucherCode = vResult.voucher.code;
    }

    // ── BƯỚC 3: Tính giảm từ điểm ────────────────────────
    let actualPointsUsed   = 0;
    let discountFromPoints = 0;
    let finalAmount        = parseFloat((baseAmount - discountFromVoucher).toFixed(2));

    if (pointsToUse > 0) {
      const [user] = await query(
        "SELECT loyalty_points FROM users WHERE id = ?",
        [userId]
      );
      const availablePoints = user?.loyalty_points || 0;

      if (availablePoints < minRedeem) {
        return res.status(400).json({
          message: `Cần ít nhất ${minRedeem} điểm. Bạn chỉ có ${availablePoints} điểm.`
        });
      }

      const requestedDiscount = pointsToUse * pointValueUsd;
      const maxDiscount       = finalAmount * maxRedeemPercent / 100;
      const actualDiscount    = Math.min(requestedDiscount, maxDiscount);

      actualPointsUsed   = Math.min(
        pointsToUse,
        Math.ceil(actualDiscount / pointValueUsd),
        availablePoints
      );
      discountFromPoints = parseFloat((actualPointsUsed * pointValueUsd).toFixed(2));
      finalAmount        = parseFloat((finalAmount - discountFromPoints).toFixed(2));
      if (finalAmount < 0.01) finalAmount = 0.01;

      // Trừ điểm trước (optimistic deduct)
      const updateRes = await query(
        "UPDATE users SET loyalty_points = loyalty_points - ? WHERE id = ? AND loyalty_points >= ?",
        [actualPointsUsed, userId, actualPointsUsed]
      );
      if (updateRes.affectedRows === 0) {
        return res.status(400).json({ message: "Điểm không đủ hoặc giao dịch bị trùng lặp!" });
      }

      // Ghi lịch sử trừ điểm tạm (order_id = NULL, sẽ update sau)
      const [userAfter] = await query(
        "SELECT loyalty_points FROM users WHERE id = ?",
        [userId]
      );
      await query(
        `INSERT INTO loyalty_transactions
           (user_id, order_id, type, points, balance_after, description)
         VALUES (?, NULL, 'redeem', ?, ?, ?)`,
        [
          userId,
          -actualPointsUsed,
          userAfter.loyalty_points,
          `Dùng ${actualPointsUsed} điểm giảm $${discountFromPoints} cho đơn VNPay mới`,
        ]
      );
    }

    // ── BƯỚC 4: Xóa đơn pending cũ ───────────────────────
    const pendingOrders = await query(
      `SELECT id FROM orders
       WHERE user_id = ? AND payment_status = 'pending'
         AND payment_method = 'vnpay'
         AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (pendingOrders.length > 0) {
      const oldId = pendingOrders[0].id;
      await query("DELETE FROM order_items WHERE order_id = ?", [oldId]);
      await query("DELETE FROM orders WHERE id = ?", [oldId]);
    }

    // ── BƯỚC 5: Tạo đơn hàng ─────────────────────────────
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

    // FIX: Lưu đủ voucher_id, voucher_code, discount_from_voucher
    const orderResult = await query(
      `INSERT INTO orders
         (user_id, total, status, payment_method, payment_status, vnp_txn_ref,
          shipping_name, shipping_phone, shipping_address,
          points_used, discount_from_points,
          voucher_id, voucher_code, discount_from_voucher)
       VALUES (?, ?, 'pending', 'vnpay', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        finalAmount,
        txnRef,
        shippingName,
        shippingPhone,
        shippingAddress,
        actualPointsUsed,
        discountFromPoints,
        validatedVoucherId,    // FIX
        validatedVoucherCode,  // FIX
        discountFromVoucher,   // FIX
      ]
    );
    const orderId = orderResult.insertId;

    // Cập nhật order_id cho loyalty_transaction điểm vừa trừ
    if (actualPointsUsed > 0) {
      await query(
        `UPDATE loyalty_transactions SET order_id = ?
         WHERE user_id = ? AND type = 'redeem' AND order_id IS NULL
         ORDER BY id DESC LIMIT 1`,
        [orderId, userId]
      );
    }

    // FIX: Cập nhật trạng thái voucher ngay khi tạo đơn VNPay
    // (Mark as "pending_use" để tránh dùng lại, sẽ confirm ở callback)
    if (validatedVoucherId) {
      const [existingUV] = await query(
        `SELECT id FROM user_vouchers
         WHERE user_id = ? AND voucher_id = ? AND status = 'active'
         LIMIT 1`,
        [userId, validatedVoucherId]
      );
      if (existingUV) {
        // Đổi thành used tạm (nếu VNPay fail sẽ rollback lại active)
        await query(
          "UPDATE user_vouchers SET status='pending_use', order_id=? WHERE id=?",
          [orderId, existingUV.id]
        );
      } else {
        // Nhập mã trực tiếp → insert với pending_use
        await query(
          `INSERT INTO user_vouchers
             (user_id, voucher_id, order_id, status, points_spent)
           VALUES (?, ?, ?, 'pending_use', 0)`,
          [userId, validatedVoucherId, orderId]
        );
      }
    }

    // Chèn order items
    if (processedItems.length > 0) {
      const itemValues = processedItems.map(i => [orderId, i.id, i.quantity, i.price]);
      await query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?",
        [itemValues]
      );
    }

    // ── BƯỚC 6: Build VNPay URL ───────────────────────────
    const vnpParams = {
      vnp_Version:   "2.1.0",
      vnp_Command:   "pay",
      vnp_TmnCode:   tmnCode,
      vnp_Amount:    String(Math.round(finalAmount * 2500000)),
      vnp_CurrCode:  "VND",
      vnp_TxnRef:    txnRef,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_OrderType: "other",
      vnp_Locale:    "vn",
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr:    "127.0.0.1",
      vnp_CreateDate: createDate,
    };

    const sortedParams = sortObject(vnpParams);
    const signData     = buildQueryString(sortedParams);
    const hmac         = crypto.createHmac("sha512", hashSecret);
    const secureHash   = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    const paymentUrl   = vnpUrl + "?" + signData + "&vnp_SecureHash=" + secureHash;

    res.json({
      paymentUrl,
      orderId,
      pointsUsed:          actualPointsUsed,
      discountFromPoints,
      discountFromVoucher,
      voucherCode:         validatedVoucherCode,
      finalAmount,
      originalAmount:      baseAmount,
    });

  } catch (err) {
    console.error("createPayment error:", err.message);
    res.status(400).json({ message: err.message || "Lỗi tạo đơn hàng" });
  }
};

// ════════════════════════════════════════════════════════════
// 2. CALLBACK TỪ VNPAY (ĐÃ FIX VOUCHER)
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
    return res.redirect(
      `http://localhost:3000/checkout/result?status=invalid&txnRef=${txnRef}`
    );
  }

  try {
    if (responseCode === "00") {
      // ── THANH TOÁN THÀNH CÔNG ─────────────────────────
      await query(
        `UPDATE orders
         SET payment_status = 'paid', status = 'confirmed', vnp_transaction_no = ?
         WHERE vnp_txn_ref = ?`,
        [transactionNo, txnRef]
      );

      const [order] = await query(
        `SELECT id, user_id, total, payment_method, points_earned,
                voucher_id, voucher_code
         FROM orders WHERE vnp_txn_ref = ?`,
        [txnRef]
      );

      if (order) {
        if (order.voucher_id) {
          await query(
            `UPDATE user_vouchers
             SET status='used', used_at=NOW()
             WHERE voucher_id = ? AND order_id = ? AND status = 'pending_use'`,
            [order.voucher_id, order.id]
          );
          await query(
            "UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?",
            [order.voucher_id]
          );
        }

        // Tích điểm
        if (order.user_id && order.points_earned === 0) {
          await calculateAndAddPoints(
            order.id, order.user_id, order.total, "vnpay"
          );
        }
      }

      res.redirect(
        `http://localhost:3000/checkout/result?status=success&txnRef=${txnRef}&transactionNo=${transactionNo}`
      );

    } else {
      // ── THANH TOÁN THẤT BẠI ──────────────────────────
      const [order] = await query(
        `SELECT id, user_id, points_used, discount_from_points,
                payment_status, voucher_id
         FROM orders WHERE vnp_txn_ref = ?`,
        [txnRef]
      );

      // Hoàn lại điểm
      if (order && order.points_used > 0 && order.payment_status === "pending") {
        await query(
          "UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?",
          [order.points_used, order.user_id]
        );
        const [user] = await query(
          "SELECT loyalty_points FROM users WHERE id = ?",
          [order.user_id]
        );
        await query(
          `INSERT INTO loyalty_transactions
             (user_id, order_id, type, points, balance_after, description)
           VALUES (?, ?, 'earn', ?, ?, ?)`,
          [
            order.user_id, order.id, order.points_used, user.loyalty_points,
            `Hoàn ${order.points_used} điểm do đơn #${order.id} thanh toán thất bại`,
          ]
        );
      }

      if (order && order.voucher_id) {
        await query(
          `UPDATE user_vouchers
           SET status='active', order_id=NULL
           WHERE voucher_id = ? AND order_id = ? AND status = 'pending_use'`,
          [order.voucher_id, order.id]
        );
        // Xóa bản ghi nếu là nhập mã trực tiếp (points_spent = 0 và không phải đổi điểm)
        // Không xóa để giữ lịch sử, chỉ đổi lại active là đủ
      }

      await query(
        "UPDATE orders SET payment_status = 'failed' WHERE vnp_txn_ref = ?",
        [txnRef]
      );

      res.redirect(
        `http://localhost:3000/checkout/result?status=failed&txnRef=${txnRef}&code=${responseCode}`
      );
    }
  } catch (err) {
    console.error("vnpayReturn error:", err.message);
    res.redirect(
      `http://localhost:3000/checkout/result?status=failed&txnRef=${txnRef}`
    );
  }
};

// ════════════════════════════════════════════════════════════
// 3. KIỂM TRA TRẠNG THÁI ĐƠN HÀNG
// ════════════════════════════════════════════════════════════
exports.getOrderByTxnRef = async (req, res) => {
  const { txnRef } = req.params;
  try {
    const result = await query(
      `SELECT o.*, u.name as user_name
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       WHERE o.vnp_txn_ref = ?`,
      [txnRef]
    );
    if (!result.length) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};