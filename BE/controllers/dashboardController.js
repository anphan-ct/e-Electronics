const db = require("../config/db");

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// GET /api/dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const [totalRevenue] = await query("SELECT COALESCE(SUM(total),0) as revenue FROM orders WHERE payment_status='paid'");
    const [totalOrders]  = await query("SELECT COUNT(*) as count FROM orders");
    const [totalUsers]   = await query("SELECT COUNT(*) as count FROM users WHERE role='user'");
    const [totalProducts]= await query("SELECT COUNT(*) as count FROM products");
    const [pendingOrders]= await query("SELECT COUNT(*) as count FROM orders WHERE status='pending'");
    const [paidOrders]   = await query("SELECT COUNT(*) as count FROM orders WHERE payment_status='paid'");
    res.json({
      revenue:       parseFloat(totalRevenue.revenue) || 0,
      totalOrders:   totalOrders.count,
      totalUsers:    totalUsers.count,
      totalProducts: totalProducts.count,
      pendingOrders: pendingOrders.count,
      paidOrders:    paidOrders.count,
    });
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// GET /api/dashboard/revenue-chart?range=day|week|month|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getRevenueChart = async (req, res) => {
  const { range = "day", from, to } = req.query;

  try {
    let rows = [];

    // 👉 CUSTOM
    if (range === "custom") {
      if (!from || !to) {
        return res.status(400).json({ message: "Thiếu ngày bắt đầu hoặc kết thúc" });
      }

      if (from > to) {
        return res.status(400).json({ message: "Ngày bắt đầu phải trước ngày kết thúc" });
      }

      const fromDate = from + " 00:00:00";
      const toDate   = to   + " 23:59:59";

      rows = await query(`
        SELECT DATE(created_at) as date,
               COALESCE(SUM(total),0) as revenue,
               COUNT(*) as orders
        FROM orders
        WHERE payment_status = 'paid'
          AND created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [fromDate, toDate]);

    }

    // 👉 NGÀY HIỆN TẠI
    else if (range === "day") {
      rows = await query(`
        SELECT DATE(created_at) as date,
               COALESCE(SUM(total),0) as revenue,
               COUNT(*) as orders
        FROM orders
        WHERE payment_status = 'paid'
          AND DATE(created_at) = CURDATE()
        GROUP BY DATE(created_at)
      `);
    }

    // 👉 TUẦN HIỆN TẠI
    else if (range === "week") {
      rows = await query(`
        SELECT DATE(created_at) as date,
               COALESCE(SUM(total),0) as revenue,
               COUNT(*) as orders
        FROM orders
        WHERE payment_status = 'paid'
          AND YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
    }

    // 👉 THÁNG HIỆN TẠI
    else if (range === "month") {
      rows = await query(`
        SELECT DATE(created_at) as date,
               COALESCE(SUM(total),0) as revenue,
               COUNT(*) as orders
        FROM orders
        WHERE payment_status = 'paid'
          AND YEAR(created_at) = YEAR(CURDATE())
          AND MONTH(created_at) = MONTH(CURDATE())
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `);
    }

    res.json(rows);

  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// GET /api/dashboard/recent-orders
exports.getRecentOrders = async (req, res) => {
  try {
    const rows = await query(`
      SELECT o.id, o.total, o.status, o.payment_status, o.payment_method,
             o.shipping_name, o.shipping_phone, o.created_at,
             u.name as user_name, u.email as user_email
      FROM orders o LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC LIMIT 10
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// GET /api/dashboard/top-products
exports.getTopProducts = async (req, res) => {
  try {
    const rows = await query(`
      SELECT p.id, p.name, p.price, p.image,
             COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN oi.quantity ELSE 0 END),0) as total_sold,
             COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN oi.quantity*oi.price ELSE 0 END),0) as total_revenue
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      GROUP BY p.id ORDER BY total_sold DESC LIMIT 8
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// GET /api/dashboard/users
exports.getUsers = async (req, res) => {
  try {
    const rows = await query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at,
             COUNT(o.id) as total_orders,
             COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN o.total ELSE 0 END),0) as total_spent
      FROM users u LEFT JOIN orders o ON u.id = o.user_id
      GROUP BY u.id ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// GET /api/dashboard/orders
exports.getAllOrders = async (req, res) => {
  try {
    const rows = await query(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// PUT /api/dashboard/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await query("UPDATE orders SET status=? WHERE id=?", [status, id]);
    res.json({ message: "Cập nhật thành công" });
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// GET /api/dashboard/products
exports.getProducts = async (req, res) => {
  try {
    const rows = await query("SELECT * FROM products ORDER BY created_at DESC");
    const formatted = rows.map(p => ({
      ...p,
      specs: (() => { try { return p.specs ? JSON.parse(p.specs) : {}; } catch { return {}; } })()
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// GET /api/dashboard/payment-stats
exports.getPaymentStats = async (req, res) => {
  try {
    const rows = await query(`
      SELECT payment_method, payment_status, COUNT(*) as count, COALESCE(SUM(total),0) as total
      FROM orders GROUP BY payment_method, payment_status
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};