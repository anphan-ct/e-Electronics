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
    const [lockedNow] = await query("SELECT COUNT(*) as count FROM users WHERE status = 'locked' OR locked_until > NOW()");
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

    // CUSTOM
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

    // NGÀY HIỆN TẠI
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

    // TUẦN HIỆN TẠI
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

    // THÁNG HIỆN TẠI
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
      SELECT u.id, u.name, u.email, u.role, u.status, u.created_at, 
             u.login_type, u.avatar, u.locked_until, u.login_attempts,
             COUNT(o.id) as total_orders,
             COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN o.total ELSE 0 END),0) as total_spent
      FROM users u LEFT JOIN orders o ON u.id = o.user_id
      GROUP BY u.id 
      ORDER BY u.created_at DESC
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

// GET /api/dashboard/product-categories  — Lấy danh sách ID danh mục sản phẩm
exports.getProductCategories = async (req, res) => {
  try {
    // Lấy ID và Tên danh mục từ đúng bảng categories
    const rows = await query("SELECT id, name FROM categories ORDER BY id ASC");
    
    res.json(rows); 
  } catch (err) { 
    res.status(500).json({ message: "Lỗi server", error: err.message }); 
  }
};

// GET /api/dashboard/products
exports.getProducts = async (req, res) => {
  const { search, category_id } = req.query;
  try {
    let sql = "SELECT * FROM products WHERE 1=1";
    let params = [];

    // Nếu FE gửi từ khóa tìm kiếm
    if (search) {
      sql += " AND (name LIKE ? OR description LIKE ? OR id LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Nếu FE gửi ID danh mục cần lọc
    if (category_id) {
      sql += " AND category_id = ?";
      params.push(category_id);
    }

    sql += " ORDER BY created_at DESC";

    const rows = await query(sql, params);
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

// GET /api/dashboard/users/:id  — Chi tiết 1 user
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const [user] = await query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.status,
             u.login_type, u.avatar, u.login_attempts, u.locked_until,
             COUNT(o.id) as total_orders,
             COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN o.total ELSE 0 END),0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `, [id]);
    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
    res.json(user);
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};
 
// PUT /api/dashboard/users/:id/role  — Đổi role user
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!["user", "admin"].includes(role))
    return res.status(400).json({ message: "Role không hợp lệ" });
  try {
    await query("UPDATE users SET role=? WHERE id=?", [role, id]);
    res.json({ message: "Cập nhật role thành công" });
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};
 
// DELETE /api/dashboard/users/:id  — Xóa user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  // Không cho xóa chính mình
  if (String(id) === String(req.user.id))
    return res.status(400).json({ message: "Không thể tự xóa chính mình!" });
  try {
    await query("DELETE FROM users WHERE id=?", [id]);
    res.json({ message: "Xóa user thành công" });
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};
 
// PUT /api/dashboard/users/:id/reset-password  — Reset mật khẩu
exports.resetUserPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const bcrypt = require("bcrypt");

  // Kiểm tra nếu admin không nhập hoặc nhập quá ngắn
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await query("UPDATE users SET password=?, login_attempts=0, locked_until=NULL WHERE id=?", [hashed, id]);
    res.json({ message: "Cập nhật mật khẩu mới thành công" });
  } catch (err) { 
    res.status(500).json({ message: "Lỗi server", error: err.message }); 
  }
};
 
// PUT /api/dashboard/users/:id/unlock  — Mở khóa tài khoản
exports.unlockUser = async (req, res) => {
  const { id } = req.params;
  try {
    await query("UPDATE users SET status='active', login_attempts=0, locked_until=NULL, last_failed_at=NULL WHERE id=?", [id]);
    res.json({ message: "Mở khóa tài khoản thành công" });
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// PUT /api/dashboard/users/:id/lock
// PUT /api/dashboard/users/:id/lock  — Khóa tài khoản thủ công
exports.lockUser = async (req, res) => {
  const { id } = req.params;
  if (String(id) === String(req.user.id)) {
    return res.status(400).json({ message: "Không thể tự khóa tài khoản của chính mình!" });
  }
  try {
    await query("UPDATE users SET status='locked' WHERE id=?", [id]);
    res.json({ message: "Khóa tài khoản thành công" });
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};
 
// GET /api/dashboard/users/:id/orders  — Đơn hàng của user
exports.getUserOrders = async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await query(`
      SELECT o.id, o.total, o.status, o.payment_status, o.payment_method,
             o.shipping_name, o.shipping_phone, o.created_at
      FROM orders o WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};


// ==============================================================================
// CÁC API QUẢN LÝ SẢN PHẨM (CRUD)
// ==============================================================================

// GET /api/dashboard/products/:id — Xem chi tiết 1 sản phẩm
exports.getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const [product] = await query("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    
    // Parse JSON specs
    product.specs = product.specs ? JSON.parse(product.specs) : {};
    res.json(product);
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// POST /api/dashboard/products — Thêm sản phẩm mới
exports.createProduct = async (req, res) => {
  const { name, description, price, image, category_id, specs } = req.body;
  try {
    // specs từ FE gửi lên có thể là object, cần stringify để lưu vào DB
    const specsJson = specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : null;
    
    const result = await query(
      "INSERT INTO products (name, description, price, image, category_id, specs) VALUES (?, ?, ?, ?, ?, ?)",
      [name, description, price, image, category_id, specsJson]
    );
    res.status(201).json({ message: "Thêm sản phẩm thành công", id: result.insertId });
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// PUT /api/dashboard/products/:id — Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, image, category_id, specs } = req.body;
  try {
    const specsJson = specs ? (typeof specs === 'string' ? specs : JSON.stringify(specs)) : null;

    await query(
      "UPDATE products SET name=?, description=?, price=?, image=?, category_id=?, specs=? WHERE id=?",
      [name, description, price, image, category_id, specsJson, id]
    );
    res.json({ message: "Cập nhật sản phẩm thành công" });
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};

// DELETE /api/dashboard/products/:id — Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM products WHERE id=?", [id]);
    res.json({ message: "Xóa sản phẩm thành công" });
  } catch (err) { res.status(500).json({ message: "Lỗi server", error: err.message }); }
};