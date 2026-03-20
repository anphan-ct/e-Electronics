const crypto = require("crypto");
const db = require("../config/db");
 
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
 
// Hàm build query string theo đúng chuẩn VNPay (không dùng thư viện ngoài)
function buildQueryString(params) {
  return Object.keys(params)
    .map(key => {
      const value = params[key];
      // Encode value nhưng giữ nguyên dấu + (VNPay dùng + cho khoảng trắng)
      return encodeURIComponent(key) + "=" + encodeURIComponent(value).replace(/%20/g, "+");
    })
    .join("&");
}
 
// 1. TẠO URL THANH TOÁN VNPAY
exports.createPayment = async (req, res) => {
  const hashSecret = (process.env.VNP_HASH_SECRET || "").trim();
  const tmnCode    = (process.env.VNP_TMN_CODE || "").trim();
  const returnUrl  = (process.env.VNP_RETURN_URL || "").trim();
  const vnpUrl     = (process.env.VNP_URL || "").trim();
 
  const { userId, amount, orderInfo, items, shippingName, shippingPhone, shippingAddress } = req.body;
 
  try {
    // Xóa đơn pending cũ (trong 15 phút)
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
 
    // Tạo đơn mới
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
 
    const orderResult = await query(`
      INSERT INTO orders 
        (user_id, total, status, payment_method, payment_status, vnp_txn_ref, shipping_name, shipping_phone, shipping_address)
      VALUES (?, ?, 'pending', 'vnpay', 'pending', ?, ?, ?, ?)
    `, [userId, amount, txnRef, shippingName, shippingPhone, shippingAddress]);
 
    const orderId = orderResult.insertId;
    console.log("✅ orderId:", orderId);
 
    if (items && items.length > 0) {
      const itemValues = items.map((item) => [orderId, item.id, item.quantity || 1, item.price]);
      await query("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ?", [itemValues]);
    }
 
    // Build params VNPay - tất cả value đều là string
    const vnpParams = {
      vnp_Version:    "2.1.0",
      vnp_Command:    "pay",
      vnp_TmnCode:    tmnCode,
      vnp_Amount:     String(Math.round(amount * 10000)),
      vnp_CurrCode:   "VND",
      vnp_TxnRef:     txnRef,
      vnp_OrderInfo:  `Thanh toan don hang ${orderId}`,
      vnp_OrderType:  "other",
      vnp_Locale:     "vn",
      vnp_ReturnUrl:  returnUrl,
      vnp_IpAddr:     "127.0.0.1",
      vnp_CreateDate: createDate,
    };
 
    // Sort params theo alphabet
    const sortedParams = sortObject(vnpParams);
 
    // Tạo signData - dùng đúng cách VNPay: encode value, dấu cách thành +
    const signData = buildQueryString(sortedParams);
 
    // Tạo HMAC-SHA512
    const hmac = crypto.createHmac("sha512", hashSecret);
    const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
 
    // URL cuối = signData + secureHash
    const paymentUrl = vnpUrl + "?" + signData + "&vnp_SecureHash=" + secureHash;
 
    console.log("createDate:", createDate);
    console.log("signData:", signData);
    console.log("secureHash length:", secureHash.length);
    console.log("secureHash:", secureHash);
    console.log("paymentUrl:", paymentUrl);
 
    res.json({ paymentUrl, orderId });
 
  } catch (err) {
    console.error("❌ Lỗi createPayment:", err);
    res.status(500).json({ message: "Lỗi tạo đơn hàng", error: err.message });
  }
};
 
// 2. XỬ LÝ CALLBACK TỪ VNPAY
exports.vnpayReturn = async (req, res) => {
  const hashSecret = (process.env.VNP_HASH_SECRET || "").trim();
 
  const vnpParams  = { ...req.query };
  const secureHash = vnpParams["vnp_SecureHash"];
 
  delete vnpParams["vnp_SecureHash"];
  delete vnpParams["vnp_SecureHashType"];
 
  // Sort và build signData theo đúng cách
  const sortedParams = sortObject(vnpParams);
  const signData = buildQueryString(sortedParams);
 
  const hmac = crypto.createHmac("sha512", hashSecret);
  const calculatedHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
 
  console.log("signData return:", signData);
  console.log("calculatedHash:", calculatedHash);
  console.log("secureHash VNPay:", secureHash);
  console.log("Khớp:", calculatedHash === secureHash);
 
  const txnRef        = vnpParams["vnp_TxnRef"];
  const responseCode  = vnpParams["vnp_ResponseCode"];
  const transactionNo = vnpParams["vnp_TransactionNo"];
 
  if (calculatedHash !== secureHash) {
    return res.redirect(`http://localhost:3000/checkout/result?status=invalid&txnRef=${txnRef}`);
  }
 
  try {
    if (responseCode === "00") {
      await query(`
        UPDATE orders 
        SET payment_status = 'paid', status = 'confirmed', vnp_transaction_no = ?
        WHERE vnp_txn_ref = ?
      `, [transactionNo, txnRef]);
      res.redirect(`http://localhost:3000/checkout/result?status=success&txnRef=${txnRef}&transactionNo=${transactionNo}`);
    } else {
      await query(`UPDATE orders SET payment_status = 'failed' WHERE vnp_txn_ref = ?`, [txnRef]);
      res.redirect(`http://localhost:3000/checkout/result?status=failed&txnRef=${txnRef}&code=${responseCode}`);
    }
  } catch (err) {
    console.error("❌ Lỗi vnpayReturn:", err);
    res.redirect(`http://localhost:3000/checkout/result?status=failed&txnRef=${txnRef}`);
  }
};
 
// 3. KIỂM TRA TRẠNG THÁI ĐƠN HÀNG
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