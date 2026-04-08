const db = require("../config/db");

// LẤY ĐƠN HÀNG
exports.getMyOrders = (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      o.id AS order_id,
      o.total,
      o.status,
      o.created_at,
      o.payment_status,
      oi.quantity,
      oi.price,
      p.name AS product_name,
      p.image
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error(" SQL ERROR:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }

    res.json(results);
  });
};