const db = require("../config/db");

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ── Lấy cấu hình từ DB (cache trong memory 5 phút) ────────
let configCache = null;
let configCacheTime = 0;

async function getConfig() {
  const now = Date.now();
  if (configCache && now - configCacheTime < 5 * 60 * 1000) {
    return configCache;
  }
  const rows = await query("SELECT config_key, config_value FROM loyalty_config");
  const cfg = {};
  rows.forEach(r => { cfg[r.config_key] = r.config_value; });
  configCache = cfg;
  configCacheTime = now;
  return cfg;
}


// TÍNH ĐIỂM CHO ĐƠN HÀNG (gọi nội bộ sau khi đơn được paid)
async function calculateAndAddPoints(orderId, userId, total, paymentMethod) {
  try {
    await query("START TRANSACTION");

    // CHECK VÀ LOCK ĐƠN HÀNG LẠI
    const [order] = await query(
      "SELECT points_earned_flag FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );

    if (order?.points_earned_flag) {
      console.log("⚠️ Order đã được cộng điểm trước đó");
      await query("ROLLBACK"); // Nhớ rollback nếu thoát sớm
      return 0;
    }

    // LOGIC TÍNH ĐIỂM (Bỏ qua nếu đơn quá nhỏ, etc...)
    const cfg = await getConfig();
    const minOrder = parseFloat(cfg.min_order_to_earn || 10);
    
    if (total < minOrder) {
      await query("ROLLBACK");
      return 0; 
    }

    const pointsPerDollar = parseFloat(cfg.points_per_dollar || 1);
    const multiplier = paymentMethod === "vnpay" ? parseFloat(cfg.vnpay_multiplier || 1.5) : parseFloat(cfg.cod_multiplier || 1.0);
    const pointsEarned = Math.floor(total * pointsPerDollar * multiplier);
    
    if (pointsEarned <= 0) {
      await query("ROLLBACK");
      return 0;
    }

    const expiryDays = parseInt(cfg.points_expiry_days || 365);
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + expiryDays);
    const expireDateStr = expireDate.toISOString().split("T")[0];

    // LOCK USER VÀ CỘNG ĐIỂM
    const [user] = await query(
      "SELECT loyalty_points FROM users WHERE id = ? FOR UPDATE",
      [userId]
    );

    const newBalance = user.loyalty_points + pointsEarned;

    await query(
      "UPDATE users SET loyalty_points = ?, total_points_earned = total_points_earned + ? WHERE id = ?",
      [newBalance, pointsEarned, userId]
    );

    // GHI LỊCH SỬ (Chỉ ghi 1 lần duy nhất)
    await query(
      `INSERT INTO loyalty_transactions (user_id, order_id, type, points, balance_after, description, expire_at)
       VALUES (?, ?, 'earn', ?, ?, ?, ?)`,
      [userId, orderId, pointsEarned, newBalance, `Tích điểm từ đơn hàng #${orderId}`, expireDateStr]
    );

    // CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (Set cờ thành TRUE)
    await query(
      "UPDATE orders SET points_earned = ?, points_earned_flag = TRUE WHERE id = ?",
      [pointsEarned, orderId]
    );

    //  HOÀN TẤT
    await query("COMMIT");
    console.log(`[LOYALTY] User ${userId} earned ${pointsEarned} points from order #${orderId}`);
    
    return pointsEarned;

  } catch (err) {
    await query("ROLLBACK");
    console.error(" [LOYALTY] calculateAndAddPoints error:", err.message);
    return 0;
  }
}


// GET /api/loyalty/info — Thông tin điểm của user hiện tại
exports.getMyPoints = async (req, res) => {
  const userId = req.user.id;
  try {
    const cfg = await getConfig();

    const [user] = await query(
      "SELECT loyalty_points, total_points_earned FROM users WHERE id = ?",
      [userId]
    );

    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    const pointValueUsd = parseFloat(cfg.point_value_usd || 0.004);
    const pointValueVnd = parseInt(cfg.point_value_vnd || 100);
    const minRedeem = parseInt(cfg.min_points_to_redeem || 100);
    const maxRedeemPercent = parseInt(cfg.max_redeem_percent || 30);

    res.json({
      currentPoints: user.loyalty_points,
      totalEarned: user.total_points_earned,
      pointValueUsd,
      pointValueVnd,
      minPointsToRedeem: minRedeem,
      maxRedeemPercent,
      // Quy đổi sang tiền: bao nhiêu USD nếu dùng hết
      equivalentUsd: parseFloat((user.loyalty_points * pointValueUsd).toFixed(2)),
      equivalentVnd: user.loyalty_points * pointValueVnd,
      config: {
        pointsPerDollar: parseFloat(cfg.points_per_dollar || 1),
        vnpayMultiplier: parseFloat(cfg.vnpay_multiplier || 1.5),
        codMultiplier: parseFloat(cfg.cod_multiplier || 1.0),
        expiryDays: parseInt(cfg.points_expiry_days || 365),
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// GET /api/loyalty/history — Lịch sử giao dịch điểm
exports.getMyHistory = async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const rows = await query(
      `SELECT lt.*, o.total as order_total, o.payment_method
       FROM loyalty_transactions lt
       LEFT JOIN orders o ON lt.order_id = o.id
       WHERE lt.user_id = ?
       ORDER BY lt.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    const [{ total }] = await query(
      "SELECT COUNT(*) as total FROM loyalty_transactions WHERE user_id = ?",
      [userId]
    );

    res.json({ transactions: rows, total });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// POST /api/loyalty/preview-redeem — Xem trước khi dùng điểm
// Body: { pointsToUse, orderTotal }
exports.previewRedeem = async (req, res) => {
  const userId = req.user.id;
  const { pointsToUse, orderTotal } = req.body;

  if (!pointsToUse || !orderTotal) {
    return res.status(400).json({ message: "Thiếu thông tin" });
  }

  try {
    const cfg = await getConfig();
    const [user] = await query(
      "SELECT loyalty_points FROM users WHERE id = ?", [userId]
    );

    const pointValueUsd = parseFloat(cfg.point_value_usd || 0.004);
    const maxRedeemPercent = parseInt(cfg.max_redeem_percent || 30);
    const minRedeem = parseInt(cfg.min_points_to_redeem || 100);

    // Validate
    if (user.loyalty_points < minRedeem) {
      return res.status(400).json({
        message: `Cần ít nhất ${minRedeem} điểm để quy đổi. Bạn có ${user.loyalty_points} điểm.`,
        canRedeem: false
      });
    }

    if (pointsToUse > user.loyalty_points) {
      return res.status(400).json({
        message: "Bạn không đủ điểm",
        canRedeem: false
      });
    }

    // Tính giá trị điểm muốn dùng
    const discountUsd = parseFloat((pointsToUse * pointValueUsd).toFixed(2));

    // Giới hạn tối đa 30% tổng đơn
    const maxDiscountUsd = parseFloat((orderTotal * maxRedeemPercent / 100).toFixed(2));
    const actualDiscount = Math.min(discountUsd, maxDiscountUsd);
    const actualPointsUsed = Math.ceil(actualDiscount / pointValueUsd);

    res.json({
      canRedeem: true,
      requestedPoints: pointsToUse,
      actualPointsUsed,
      discountUsd: actualDiscount,
      orderTotal,
      finalTotal: parseFloat((orderTotal - actualDiscount).toFixed(2)),
      maxDiscountUsd,
      maxRedeemPercent,
      remainingPoints: user.loyalty_points - actualPointsUsed,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// ADMIN: GET /api/loyalty/admin/users — Danh sách điểm users
exports.adminGetAllUsersPoints = async (req, res) => {
  try {
    const rows = await query(`
      SELECT u.id, u.name, u.email, u.loyalty_points, u.total_points_earned,
             COUNT(lt.id) as transaction_count,
             MAX(lt.created_at) as last_transaction
      FROM users u
      LEFT JOIN loyalty_transactions lt ON u.id = lt.user_id
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY u.loyalty_points DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// ADMIN: GET /api/loyalty/admin/transactions — Tất cả giao dịch
exports.adminGetAllTransactions = async (req, res) => {
  const { limit = 50, offset = 0, userId, type } = req.query;
  try {
    let conditions = [];
    let params = [];

    if (userId) { conditions.push("lt.user_id = ?"); params.push(userId); }
    if (type)   { conditions.push("lt.type = ?");    params.push(type); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await query(
      `SELECT lt.*, u.name as user_name, u.email as user_email
       FROM loyalty_transactions lt
       JOIN users u ON lt.user_id = u.id
       ${where}
       ORDER BY lt.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [{ total }] = await query(
      `SELECT COUNT(*) as total FROM loyalty_transactions lt ${where}`,
      params
    );

    res.json({ transactions: rows, total });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// ADMIN: POST /api/loyalty/admin/adjust — Cộng/trừ điểm thủ công
// Body: { userId, points, description } — points có thể âm để trừ
// Thay thế hàm adminAdjustPoints
exports.adminAdjustPoints = async (req, res) => {
  const { userId, points, description } = req.body;
  const adminId = req.user.id;
  const adjustPoints = parseInt(points);

  if (!userId || isNaN(adjustPoints) || !description) {
    return res.status(400).json({ message: "Thiếu thông tin hoặc sai định dạng: userId, points, description" });
  }

  try {
    await query("START TRANSACTION");

    const [user] = await query("SELECT loyalty_points, name FROM users WHERE id = ? FOR UPDATE", [userId]);
    if (!user) {
      await query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy user" });
    }

    const newBalance = user.loyalty_points + adjustPoints;
    if (newBalance < 0) {
      await query("ROLLBACK");
      return res.status(400).json({ message: `Không thể trừ. User chỉ có ${user.loyalty_points} điểm.` });
    }

    const type = adjustPoints >= 0 ? "admin_add" : "admin_deduct";
    const earnedPoints = Math.max(0, adjustPoints); // Chỉ cộng vào total_points_earned nếu là điểm cộng

    await query(
      "UPDATE users SET loyalty_points = ?, total_points_earned = total_points_earned + ? WHERE id = ?",
      [newBalance, earnedPoints, userId]
    );

    await query(
      `INSERT INTO loyalty_transactions (user_id, type, points, balance_after, description) VALUES (?, ?, ?, ?, ?)`,
      [userId, type, adjustPoints, newBalance, `[Admin #${adminId}] ${description}`]
    );

    await query("COMMIT");

    res.json({
      message: "Điều chỉnh điểm thành công",
      userId,
      userName: user.name,
      pointsAdjusted: adjustPoints,
      newBalance,
    });
  } catch (err) {
    await query("ROLLBACK");
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// ADMIN: GET/PUT /api/loyalty/admin/config — Quản lý cấu hình
exports.adminGetConfig = async (req, res) => {
  try {
    const rows = await query("SELECT * FROM loyalty_config ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.adminUpdateConfig = async (req, res) => {
  const { configs } = req.body; // Array of { config_key, config_value }
  if (!Array.isArray(configs)) {
    return res.status(400).json({ message: "configs phải là array" });
  }

  try {
    for (const cfg of configs) {
      await query(
        "UPDATE loyalty_config SET config_value = ? WHERE config_key = ?",
        [cfg.config_value, cfg.config_key]
      );
    }
    // Xóa cache
    configCache = null;
    res.json({ message: "Cập nhật cấu hình thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// ADMIN: GET /api/loyalty/admin/stats — Thống kê tổng quan
exports.adminGetStats = async (req, res) => {
  try {
    const [totals] = await query(`
      SELECT
        SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END) as total_earned,
        SUM(CASE WHEN type = 'redeem' THEN ABS(points) ELSE 0 END) as total_redeemed,
        COUNT(DISTINCT user_id) as users_with_points
      FROM loyalty_transactions
    `);

    const [circulation] = await query(
      "SELECT SUM(loyalty_points) as total_in_circulation, COUNT(*) as total_users FROM users WHERE role = 'user'"
    );

    const topUsers = await query(`
      SELECT u.id, u.name, u.email, u.loyalty_points, u.total_points_earned
      FROM users u
      WHERE u.role = 'user' AND u.loyalty_points > 0
      ORDER BY u.loyalty_points DESC
      LIMIT 5
    `);

    const recentActivity = await query(`
      SELECT lt.*, u.name as user_name
      FROM loyalty_transactions lt
      JOIN users u ON lt.user_id = u.id
      ORDER BY lt.created_at DESC
      LIMIT 10
    `);

    res.json({
      totalPointsEarned:    totals.total_earned || 0,
      totalPointsRedeemed:  totals.total_redeemed || 0,
      usersWithPoints:      totals.users_with_points || 0,
      totalInCirculation:   circulation.total_in_circulation || 0,
      totalUsers:           circulation.total_users || 0,
      topUsers,
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// Export hàm nội bộ để gọi từ các controller khác
exports.calculateAndAddPoints = calculateAndAddPoints;
exports.getConfig = getConfig;