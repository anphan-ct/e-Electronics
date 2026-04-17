const db = require("../config/db");
const { getConfig } = require("./loyaltyController");

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ─── HELPER: Lấy voucher kèm danh sách điều kiện ────────────
async function getVoucherWithConditions(voucherId) {
  const [voucher] = await query("SELECT * FROM vouchers WHERE id = ?", [voucherId]);
  if (!voucher) return null;
  const conditions = await query(
    "SELECT ref_type, ref_id FROM voucher_conditions WHERE voucher_id = ?",
    [voucherId]
  );
  voucher.conditions = conditions;
  return voucher;
}

// ─── HELPER: Kiểm tra cart có sản phẩm hợp lệ với voucher ───
function checkCartEligibility(voucher, cartItems) {
  if (voucher.apply_scope === "all") {
    const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    return { valid: true, eligibleTotal: total };
  }

  const conditions = voucher.conditions || [];
  const categoryIds = conditions.filter(c => c.ref_type === "category").map(c => c.ref_id);
  const productIds  = conditions.filter(c => c.ref_type === "product").map(c => c.ref_id);

  let eligibleTotal = 0;

  for (const item of cartItems) {
    const matchCategory = categoryIds.length > 0 && categoryIds.includes(item.category_id);
    const matchProduct  = productIds.length  > 0 && productIds.includes(item.product_id || item.id);
    if (matchCategory || matchProduct) {
      eligibleTotal += item.price * item.quantity;
    }
  }

  if (eligibleTotal === 0) {
    const scopeLabel = voucher.apply_scope === "category" ? "ngành hàng" : "sản phẩm";
    return {
      valid: false,
      eligibleTotal: 0,
      reason: `Voucher chỉ áp dụng cho ${scopeLabel} cụ thể. Không có sản phẩm phù hợp trong giỏ hàng.`,
    };
  }

  return { valid: true, eligibleTotal };
}

// ─── HELPER: Tính tiền giảm thực tế ─────────────────────────
function calcDiscount(voucher, eligibleTotal) {
  let discount = 0;
  if (voucher.discount_type === "percent") {
    discount = eligibleTotal * (voucher.discount_value / 100);
    if (voucher.max_discount) discount = Math.min(discount, parseFloat(voucher.max_discount));
  } else {
    discount = parseFloat(voucher.discount_value);
  }
  return parseFloat(Math.min(discount, eligibleTotal).toFixed(2));
}

// ════════════════════════════════════════════════════════════
// CORE VOUCHER LOGIC (Dùng chung cho Checkout và Validate)
// ════════════════════════════════════════════════════════════
exports.verifyAndCalculateVoucher = async (code, cartItems, userId) => {
  const [voucher] = await query("SELECT * FROM vouchers WHERE code = ? AND is_active = 1", [code.trim().toUpperCase()]);
  if (!voucher) throw new Error("Mã voucher không tồn tại hoặc đã bị vô hiệu hóa");

  // 1. Hạn sử dụng
  const now = new Date();
  if (voucher.start_at && new Date(voucher.start_at) > now) throw new Error("Voucher chưa đến thời gian hiệu lực");
  if (voucher.expire_at && new Date(voucher.expire_at) < now) throw new Error("Voucher đã hết hạn");

  // 2. Lượt dùng chung
  if (voucher.usage_limit !== null) {
    if (voucher.source !== 'redeem_points') {
      // Voucher săn: Ai thanh toán nhanh thì được
      if (voucher.used_count >= voucher.usage_limit) {
        throw new Error("Rất tiếc, mã voucher này đã được người khác sử dụng hết số lượt.");
      }
    }
    // LƯU Ý: Nếu là 'redeem_points', ta bỏ qua chặn ở đây vì họ đã tốn điểm đổi rồi.
  }

  // 3. Lượt dùng của user cụ thể
  const [{ userUsed }] = await query("SELECT COUNT(*) as userUsed FROM user_vouchers WHERE user_id = ? AND voucher_id = ? AND status = 'used'", [userId, voucher.id]);
  if (userUsed >= voucher.usage_per_user) throw new Error(`Bạn đã dùng voucher này rồi (tối đa ${voucher.usage_per_user} lần)`);

  // 4. Lấy điều kiện áp dụng
  const conditions = await query("SELECT ref_type, ref_id FROM voucher_conditions WHERE voucher_id = ?", [voucher.id]);
  voucher.conditions = conditions;

  // 5. Kiểm tra tính hợp lệ trong giỏ
  const eligibility = checkCartEligibility(voucher, cartItems);
  if (!eligibility.valid) throw new Error(eligibility.reason);

  // 6. Kiểm tra đơn tối thiểu
  const orderTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  if (orderTotal < parseFloat(voucher.min_order)) throw new Error(`Đơn tối thiểu $${voucher.min_order}`);

  return {
    voucher,
    discountAmount: calcDiscount(voucher, eligibility.eligibleTotal)
  };
};

// ════════════════════════════════════════════════════════════
// USER API
// ════════════════════════════════════════════════════════════

// POST /api/vouchers/validate
exports.validateVoucher = async (req, res) => {
  const { code, cartItems = [] } = req.body;
  if (!code) return res.status(400).json({ message: "Vui lòng nhập mã voucher" });

  try {
    const result = await exports.verifyAndCalculateVoucher(code, cartItems, req.user.id);
    const orderTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    
    res.json({
      valid: true,
      voucher: result.voucher,
      discountAmount: result.discountAmount,
      eligibleTotal: orderTotal,
      orderTotal,
      finalTotal: parseFloat((orderTotal - result.discountAmount).toFixed(2)),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// GET /api/vouchers/my-vouchers
exports.getMyVouchers = async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await query(
      `SELECT uv.id as user_voucher_id, uv.status, uv.points_spent, uv.obtained_at, uv.used_at,
              v.id, v.code, v.name, v.description, v.discount_type, v.discount_value,
              v.max_discount, v.min_order, v.apply_scope, v.expire_at, v.source
       FROM user_vouchers uv
       JOIN vouchers v ON uv.voucher_id = v.id
       WHERE uv.user_id = ? 
       ORDER BY uv.obtained_at DESC`,
      [userId]
    );

    const result = await Promise.all(rows.map(async (r) => {
      const conds = await query("SELECT ref_type, ref_id FROM voucher_conditions WHERE voucher_id = ?", [r.id]);
      return { ...r, conditions: conds };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// GET /api/vouchers/redeemable
exports.getRedeemableVouchers = async (req, res) => {
  const userId = req.user.id;
  try {
    const [user] = await query("SELECT loyalty_points FROM users WHERE id = ?", [userId]);

    const vouchers = await query(
      `SELECT v.*,
              (SELECT COUNT(*) FROM user_vouchers uv WHERE uv.voucher_id = v.id AND uv.user_id = ? AND uv.status != 'expired') as already_obtained
       FROM vouchers v
       WHERE v.source = 'redeem_points' AND v.is_active = 1
         AND (v.expire_at IS NULL OR v.expire_at > NOW())
       ORDER BY v.points_cost ASC`,
      [userId]
    );

    const result = vouchers.map(v => ({
      ...v,
      canAfford:       (user?.loyalty_points || 0) >= v.points_cost,
      alreadyObtained: v.already_obtained > 0,
      userPoints:      user?.loyalty_points || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// POST /api/vouchers/redeem-points
exports.redeemPointsForVoucher = async (req, res) => {
  const userId = req.user.id;
  const { voucherId } = req.body;

  if (!voucherId) return res.status(400).json({ message: "Thiếu voucherId" });

  try {
    await query("START TRANSACTION");

    // 1. Lấy voucher và lock
    const [voucher] = await query(
      "SELECT * FROM vouchers WHERE id = ? AND source = 'redeem_points' AND is_active = 1 FOR UPDATE",
      [voucherId]
    );

    if (!voucher) {
      await query("ROLLBACK");
      return res.status(404).json({ message: "Voucher không tồn tại hoặc không thể đổi bằng điểm" });
    }

    // 2. Kiểm tra số lượng người đã đổi (Block nếu hết slot)
    if (voucher.usage_limit !== null) {
      const [{ total_saved }] = await query("SELECT COUNT(*) as total_saved FROM user_vouchers WHERE voucher_id = ?", [voucherId]);
      if (total_saved >= voucher.usage_limit) {
        await query("ROLLBACK");
        return res.status(400).json({ message: "Voucher này đã hết số lượng có thể đổi!" });
      }
    }

    // 3. Kiểm tra user đã có voucher này chưa
    const [{ already }] = await query(
      "SELECT COUNT(*) as already FROM user_vouchers WHERE user_id = ? AND voucher_id = ? AND status != 'expired'",
      [userId, voucherId]
    );

    if (already > 0) {
      await query("ROLLBACK");
      return res.status(400).json({ message: "Bạn đã đổi voucher này rồi" });
    }

    // 4. Trừ điểm
    const updateRes = await query(
      "UPDATE users SET loyalty_points = loyalty_points - ? WHERE id = ? AND loyalty_points >= ?",
      [voucher.points_cost, userId, voucher.points_cost]
    );

    if (updateRes.affectedRows === 0) {
      await query("ROLLBACK");
      return res.status(400).json({ message: `Không đủ điểm. Cần ${voucher.points_cost} điểm.` });
    }

    // 5. Ghi voucher cho user
    await query(
      "INSERT INTO user_vouchers (user_id, voucher_id, status, points_spent) VALUES (?, ?, 'active', ?)",
      [userId, voucherId, voucher.points_cost]
    );

    // 6. Ghi lịch sử điểm
    const [userAfter] = await query("SELECT loyalty_points FROM users WHERE id = ?", [userId]);
    await query(
      `INSERT INTO loyalty_transactions (user_id, type, points, balance_after, description)
       VALUES (?, 'redeem', ?, ?, ?)`,
      [userId, -voucher.points_cost, userAfter.loyalty_points,
       `Đổi ${voucher.points_cost} điểm lấy voucher "${voucher.code}"`]
    );

    await query("COMMIT");

    res.json({
      message: `Đổi thành công! Voucher "${voucher.code}" đã được thêm vào túi của bạn`,
      voucher: { code: voucher.code, name: voucher.name },
      pointsSpent: voucher.points_cost,
      remainingPoints: userAfter.loyalty_points,
    });

  } catch (err) {
    await query("ROLLBACK");
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// GET /api/vouchers/public
exports.getPublicVouchers = async (req, res) => {
  const userId = req.user.id;
  try {
    // Chỉ hiển thị voucher có số lượt LƯU VÀO VÍ < usage_limit
    const vouchers = await query(
      `SELECT v.*,
        (SELECT COUNT(*) FROM user_vouchers uv WHERE uv.voucher_id = v.id AND uv.user_id = ?) as user_saved_count
       FROM vouchers v
       WHERE v.source = 'admin' AND v.is_active = 1
         AND (v.start_at IS NULL OR v.start_at <= NOW())
         AND (v.expire_at IS NULL OR v.expire_at > NOW())
         AND (v.usage_limit IS NULL OR (SELECT COUNT(*) FROM user_vouchers WHERE voucher_id = v.id) < v.usage_limit)
       ORDER BY v.created_at DESC`,
      [userId]
    );

    const result = await Promise.all(vouchers.map(async v => {
      const conds = await query("SELECT ref_type, ref_id FROM voucher_conditions WHERE voucher_id = ?", [v.id]);
      return {
        ...v,
        conditions: conds,
        canSave: v.user_saved_count < v.usage_per_user 
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// POST /api/vouchers/save
exports.saveVoucher = async (req, res) => {
  const userId = req.user.id;
  const { voucherId } = req.body;

  try {
    const [voucher] = await query("SELECT * FROM vouchers WHERE id = ? AND is_active = 1 AND source = 'admin'", [voucherId]);
    if (!voucher) return res.status(404).json({ message: "Voucher không tồn tại hoặc đã hết hạn" });

    // Kiểm tra số lượng người đã lưu
    if (voucher.usage_limit !== null) {
      const [{ total_saved }] = await query("SELECT COUNT(*) as total_saved FROM user_vouchers WHERE voucher_id = ?", [voucherId]);
      if (total_saved >= voucher.usage_limit) {
        return res.status(400).json({ message: "Voucher này đã hết lượt lưu (Đã phát hết)" });
      }
    }

    // Kiểm tra giới hạn của user
    const [{ savedCount }] = await query("SELECT COUNT(*) as savedCount FROM user_vouchers WHERE user_id = ? AND voucher_id = ?", [userId, voucherId]);
    if (savedCount >= voucher.usage_per_user) {
      return res.status(400).json({ message: "Bạn đã lưu tối đa số lượng voucher này" });
    }

    // Lưu vào ví
    await query("INSERT INTO user_vouchers (user_id, voucher_id, status, points_spent) VALUES (?, ?, 'active', 0)", [userId, voucherId]);
    
    res.json({ message: "Đã lưu voucher vào ví thành công!" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// INTERNAL
// ════════════════════════════════════════════════════════════
exports.applyVoucherToOrder = async (orderId, userId, voucherCode) => {
  if (!voucherCode) return 0;
  try {
    const [uv] = await query(
      `SELECT uv.id, uv.voucher_id FROM user_vouchers uv
       JOIN vouchers v ON uv.voucher_id = v.id
       WHERE uv.user_id = ? AND v.code = ? AND uv.status = 'active'
       LIMIT 1`,
      [userId, voucherCode.toUpperCase()]
    );
    if (!uv) return 0;

    await query("UPDATE user_vouchers SET status='used', order_id=?, used_at=NOW() WHERE id=?", [orderId, uv.id]);
    await query("UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?", [uv.voucher_id]);
    return 1;
  } catch (err) {
    console.error("[VOUCHER] applyVoucherToOrder error:", err.message);
    return 0;
  }
};

// ════════════════════════════════════════════════════════════
// ADMIN API
// ════════════════════════════════════════════════════════════
exports.adminGetVouchers = async (req, res) => {
  try {
    const rows = await query(
      `SELECT v.*,
              (SELECT COUNT(*) FROM user_vouchers uv WHERE uv.voucher_id = v.id AND uv.status='used') as real_used_count
       FROM vouchers v
       ORDER BY v.created_at DESC`
    );

    const result = await Promise.all(rows.map(async r => {
      const conds = await query("SELECT ref_type, ref_id FROM voucher_conditions WHERE voucher_id = ?", [r.id]);
      return { ...r, conditions: conds };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.adminCreateVoucher = async (req, res) => {
  const { code, name, description, discount_type, discount_value, max_discount, min_order, apply_scope, source, points_cost, usage_limit, usage_per_user, start_at, expire_at, is_active, category_ids = [], product_ids = [] } = req.body;
  
  if (!code || !name || !discount_type || discount_value === undefined) return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });

  try {
    const result = await query(
      `INSERT INTO vouchers (code, name, description, discount_type, discount_value, max_discount, min_order, apply_scope, source, points_cost, usage_limit, usage_per_user, start_at, expire_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code.trim().toUpperCase(), name, description || null, discount_type, discount_value, max_discount || null, min_order || 0, apply_scope || "all", source || "admin", points_cost || null, usage_limit || null, usage_per_user || 1, start_at || null, expire_at || null, is_active !== false ? 1 : 0]
    );

    const voucherId = result.insertId;
    for (const catId of category_ids) await query("INSERT INTO voucher_conditions (voucher_id, ref_type, ref_id) VALUES (?, 'category', ?)", [voucherId, catId]);
    for (const pId of product_ids) await query("INSERT INTO voucher_conditions (voucher_id, ref_type, ref_id) VALUES (?, 'product', ?)", [voucherId, pId]);

    res.status(201).json({ message: "Tạo voucher thành công", id: voucherId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Mã voucher đã tồn tại" });
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.adminUpdateVoucher = async (req, res) => {
  const { id } = req.params;
  const { name, description, discount_type, discount_value, max_discount, min_order, apply_scope, points_cost, usage_limit, usage_per_user, start_at, expire_at, is_active, category_ids = [], product_ids = [] } = req.body;

  try {
    await query(
      `UPDATE vouchers SET name=?, description=?, discount_type=?, discount_value=?, max_discount=?, min_order=?, apply_scope=?, points_cost=?, usage_limit=?, usage_per_user=?, start_at=?, expire_at=?, is_active=? WHERE id=?`,
      [name, description || null, discount_type, discount_value, max_discount || null, min_order || 0, apply_scope || "all", points_cost || null, usage_limit || null, usage_per_user || 1, start_at || null, expire_at || null, is_active ? 1 : 0, id]
    );

    await query("DELETE FROM voucher_conditions WHERE voucher_id = ?", [id]);
    for (const catId of category_ids) await query("INSERT INTO voucher_conditions (voucher_id, ref_type, ref_id) VALUES (?, 'category', ?)", [id, catId]);
    for (const pId of product_ids) await query("INSERT INTO voucher_conditions (voucher_id, ref_type, ref_id) VALUES (?, 'product', ?)", [id, pId]);

    res.json({ message: "Cập nhật voucher thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.adminDeleteVoucher = async (req, res) => {
  try {
    await query("DELETE FROM vouchers WHERE id = ?", [req.params.id]);
    res.json({ message: "Đã xóa voucher" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.adminToggleVoucher = async (req, res) => {
  try {
    await query("UPDATE vouchers SET is_active = NOT is_active WHERE id = ?", [req.params.id]);
    res.json({ message: "Đã thay đổi trạng thái voucher" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.adminGetStats = async (req, res) => {
  try {
    const [overview] = await query(`SELECT COUNT(*) as total, SUM(is_active = 1) as active, SUM(source = 'redeem_points') as redeemable, SUM(is_active = 0) as inactive FROM vouchers`);
    const [usage] = await query(`SELECT COUNT(*) as total_used, SUM(points_spent) as total_points_spent FROM user_vouchers WHERE status = 'used'`);
    const topVouchers = await query(`
      SELECT v.code, v.name, v.discount_type, v.discount_value, COUNT(uv.id) as used_count
      FROM vouchers v LEFT JOIN user_vouchers uv ON v.id = uv.voucher_id AND uv.status = 'used'
      GROUP BY v.id ORDER BY used_count DESC LIMIT 5
    `);
    res.json({ overview, usage, topVouchers });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.adminGrantVoucher = async (req, res) => {
  const { userId, voucherId } = req.body;
  if (!userId || !voucherId) return res.status(400).json({ message: "Thiếu thông tin" });
  try {
    const [existing] = await query("SELECT id FROM user_vouchers WHERE user_id=? AND voucher_id=? AND status='active'", [userId, voucherId]);
    if (existing) return res.status(400).json({ message: "User đã có voucher này rồi"});
    await query("INSERT INTO user_vouchers (user_id, voucher_id, status, points_spent) VALUES (?, ?, 'active', 0)", [userId, voucherId]);
    res.json({ message: "Đã cấp voucher cho người dùng thành công"});
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

exports.adminGetVoucherById = async (req, res) => {
  try {
    const [voucher] = await query(`SELECT v.*, 
      (SELECT COUNT(*) FROM user_vouchers uv WHERE uv.voucher_id = v.id AND uv.status='used') as real_used_count
      FROM vouchers v WHERE v.id = ?`,
      [req.params.id]
    );

    if (!voucher) return res.status(400).json({ message: "Không tìm thấy voucher!"});

    const conditions = await query(`
      SELECT vc.ref_type, vc.ref_id, c.name AS category_name, p.name AS product_name
      FROM voucher_conditions vc LEFT JOIN categories c ON vc.ref_type = 'category' AND vc.ref_id = c.id
      LEFT JOIN products p ON vc.ref_type = 'product' AND vc.ref_id = p.id
      WHERE voucher_id = ?`, [voucher.id]);
    voucher.conditions = conditions;

    res.json(voucher); 
  } catch (err){
    res.status(500).json({ message: "Lỗi server:", error: err.message });
  }
};