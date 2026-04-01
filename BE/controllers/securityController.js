// Cung cấp API cho Admin xem log đăng nhập và cảnh báo bảo mật

const db = require("../config/db");

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ════════════════════════════════════════════════════════════
// GET /api/security/login-logs
// Lấy danh sách log đăng nhập (có filter + phân trang)
// ════════════════════════════════════════════════════════════
exports.getLoginLogs = async (req, res) => {
  try {
    const {
      status,    // success | failed | locked | all
      email,
      ip,
      limit  = 50,
      offset = 0,
    } = req.query;

    let conditions = [];
    let params     = [];

    if (status && status !== "all") {
      conditions.push("ll.status = ?");
      params.push(status);
    }
    if (email) {
      conditions.push("ll.email LIKE ?");
      params.push(`%${email}%`);
    }
    if (ip) {
      conditions.push("ll.ip_address LIKE ?");
      params.push(`%${ip}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = await query(
      `SELECT ll.id, ll.email, ll.ip_address, ll.device_type,
              ll.status, ll.fail_reason, ll.created_at,
              u.name as user_name, u.role as user_role
       FROM login_logs ll
       LEFT JOIN users u ON ll.user_id = u.id
       ${where}
       ORDER BY ll.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Tổng số bản ghi (để phân trang)
    const [{ total }] = await query(
      `SELECT COUNT(*) as total FROM login_logs ll ${where}`,
      params
    );

    res.json({ logs: rows, total });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/security/alerts
// Phát hiện hành vi bất thường (rule-based)
// ════════════════════════════════════════════════════════════
exports.getSecurityAlerts = async (req, res) => {
  try {
    const alerts = [];

    // ── Rule 1: IP đăng nhập sai >= 10 lần trong 1 giờ ──
    const suspiciousIPs = await query(`
      SELECT ip_address, COUNT(*) as fail_count,
             MAX(created_at) as last_attempt
      FROM login_logs
      WHERE status = 'failed'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY ip_address
      HAVING fail_count >= 10
      ORDER BY fail_count DESC
      LIMIT 10
    `);

    suspiciousIPs.forEach(row => {
      alerts.push({
        type:     "suspicious_ip",
        severity: row.fail_count >= 20 ? "high" : "medium",
        title:    "IP đáng ngờ",
        message:  `IP ${row.ip_address} đăng nhập sai ${row.fail_count} lần trong 1 giờ qua`,
        detail:   { ip: row.ip_address, failCount: row.fail_count, lastAttempt: row.last_attempt },
      });
    });

    // ── Rule 2: Tài khoản đang bị khóa ──────────────────
    const lockedAccounts = await query(`
      SELECT u.id, u.email, u.name, u.login_attempts, u.locked_until
      FROM users u
      WHERE u.locked_until > NOW()
      ORDER BY u.login_attempts DESC
      LIMIT 20
    `);

    lockedAccounts.forEach(u => {
      alerts.push({
        type:     "locked_account",
        severity: u.login_attempts >= 11 ? "high" : "medium",
        title:    "Tài khoản bị khóa",
        message:  `${u.email} bị khóa do sai mật khẩu ${u.login_attempts} lần`,
        detail:   { userId: u.id, email: u.email, name: u.name, attempts: u.login_attempts, lockedUntil: u.locked_until },
      });
    });

    // ── Rule 3: Cùng email thử từ nhiều IP khác nhau ────
    const multiIPEmails = await query(`
      SELECT email, COUNT(DISTINCT ip_address) as ip_count,
             COUNT(*) as total_fails,
             MAX(created_at) as last_attempt
      FROM login_logs
      WHERE status = 'failed'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        AND email IS NOT NULL
      GROUP BY email
      HAVING ip_count >= 3
      ORDER BY ip_count DESC
      LIMIT 10
    `);

    multiIPEmails.forEach(row => {
      alerts.push({
        type:     "multi_ip_attack",
        severity: "high",
        title:    "Tấn công từ nhiều IP",
        message:  `Tài khoản ${row.email} bị thử từ ${row.ip_count} IP khác nhau trong 1 giờ`,
        detail:   { email: row.email, ipCount: row.ip_count, totalFails: row.total_fails, lastAttempt: row.last_attempt },
      });
    });

    // ── Rule 4: Tỉ lệ thất bại cao toàn hệ thống trong 30 phút ─
    const [recentStats] = await query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'failed') as failed,
        SUM(status = 'success') as success,
        SUM(status = 'locked') as locked
      FROM login_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
    `);

    if (recentStats.total > 10) {
      const failRate = (recentStats.failed / recentStats.total) * 100;
      if (failRate >= 70) {
        alerts.push({
          type:     "high_fail_rate",
          severity: failRate >= 90 ? "high" : "medium",
          title:    "Tỉ lệ đăng nhập thất bại cao",
          message:  `${failRate.toFixed(0)}% lần thử trong 30 phút gần đây đều thất bại (${recentStats.failed}/${recentStats.total})`,
          detail:   { total: recentStats.total, failed: recentStats.failed, success: recentStats.success, failRate: failRate.toFixed(1) },
        });
      }
    }

    // ── Rule 5: Admin đăng nhập thành công (Mức THẤP) ──
    const adminLogins = await query(`
      SELECT ll.email, ll.ip_address, ll.created_at
      FROM login_logs ll
      JOIN users u ON ll.user_id = u.id
      WHERE ll.status = 'success' 
        AND u.role = 'admin'
        AND ll.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      ORDER BY ll.created_at DESC LIMIT 5
    `);

    adminLogins.forEach(row => {
      alerts.push({
        type: "admin_login",
        severity: "low", // Mức độ thấp
        title: "Admin đăng nhập",
        message: `Quản trị viên ${row.email} vừa đăng nhập hệ thống`,
        detail: { ip: row.ip_address, time: row.created_at },
      });
    });

    // Sắp xếp theo severity: high trước
    const order = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => (order[a.severity] || 2) - (order[b.severity] || 2));

    res.json({ alerts, total: alerts.length });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// GET /api/security/stats
// Thống kê nhanh cho dashboard overview
// ════════════════════════════════════════════════════════════
exports.getSecurityStats = async (req, res) => {
  try {
    const [today] = await query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'success') as success,
        SUM(status = 'failed')  as failed,
        SUM(status = 'locked')  as locked,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM login_logs
      WHERE DATE(created_at) = CURDATE()
    `);

    const [lockedNow] = await query(
      "SELECT COUNT(*) as count FROM users WHERE locked_until > NOW()"
    );

    const [alertCount] = await query(`
      SELECT COUNT(DISTINCT ip_address) as suspicious_ips
      FROM login_logs
      WHERE status = 'failed'
        AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      GROUP BY ip_address
      HAVING COUNT(*) >= 10
    `);

    res.json({
      today: {
        total:     today.total      || 0,
        success:   today.success    || 0,
        failed:    today.failed     || 0,
        locked:    today.locked     || 0,
        uniqueIPs: today.unique_ips || 0,
      },
      lockedAccounts:  lockedNow.count      || 0,
      suspiciousIPs:   alertCount ? 1 : 0,  // đơn giản hoá
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// ════════════════════════════════════════════════════════════
// POST /api/security/unlock/:userId
// Admin mở khóa tài khoản thủ công
// ════════════════════════════════════════════════════════════
exports.unlockAccount = async (req, res) => {
  const { userId } = req.params;
  try {
    await query(
      "UPDATE users SET login_attempts = 0, locked_until = NULL, last_failed_at = NULL WHERE id = ?",
      [userId]
    );
    res.json({ message: "Đã mở khóa tài khoản thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};