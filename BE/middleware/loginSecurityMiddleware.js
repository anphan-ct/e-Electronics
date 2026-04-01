// BE/middleware/loginSecurityMiddleware.js
// Xử lý: đếm lần sai, khóa tài khoản, ghi log, phát hiện hành vi bất thường

const db = require("../config/db");
const axios = require("axios");

// ── Helper: promise wrapper cho db.query ──────────────────
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ── Cấu hình thời gian khóa theo số lần sai ──────────────
// attempts >= 5  → khóa 1 phút
// attempts >= 8  → khóa 5 phút
// attempts >= 11 → khóa 15 phút
// attempts >= 14 → khóa 30 phút
// attempts >= 17 → khóa 60 phút
function getLockDurationMinutes(attempts) {
  if (attempts >= 20) return 24 * 60;
  if (attempts >= 17) return 60;
  if (attempts >= 14) return 30;
  if (attempts >= 11) return 15;
  if (attempts >= 8)  return 5;
  if (attempts >= 5)  return 1;
  return 0;
}

// ── Helper: parse device type từ user-agent ───────────────
function getDeviceType(userAgent = "") {
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad/.test(ua)) return "mobile";
  if (/tablet/.test(ua)) return "tablet";
  return "desktop";
}

// ── Helper: lấy IP thực từ request ───────────────────────
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// ── Middleware verify reCAPTCHA (chỉ khi FE gửi token) ───
async function verifyRecaptchaIfPresent(recaptchaToken) {
  if (!recaptchaToken) return true; // Không bắt buộc nếu FE chưa gửi
  try {
    const res = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: recaptchaToken } }
    );
    return res.data.success === true;
  } catch {
    return false;
  }
}

// ── GHI LOG ───────────────────────────────────────────────
async function writeLoginLog({ userId, email, ip, userAgent, status, failReason }) {
  try {
    const deviceType = getDeviceType(userAgent);
    await query(
      `INSERT INTO login_logs (user_id, email, ip_address, user_agent, device_type, status, fail_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, email || null, ip, userAgent || null, deviceType, status, failReason || null]
    );
  } catch (err) {
    console.error("Lỗi ghi login log:", err.message);
  }
}

// ════════════════════════════════════════════════════════════
// MIDDLEWARE CHÍNH
// ════════════════════════════════════════════════════════════
const loginSecurity = async (req, res, next) => {
  const { email, recaptchaToken } = req.body;
  const ip        = getClientIP(req);
  const userAgent = req.headers["user-agent"] || "";

  // Bỏ qua nếu không có email (validation sẽ xử lý sau)
  if (!email) return next();

  try {
    // 1. Tìm user theo email
    const users = await query(
      "SELECT id, login_attempts, locked_until, last_failed_at FROM users WHERE BINARY email = ?",
      [email]
    );

    // Email không tồn tại → để controller xử lý, nhưng vẫn ghi log
    if (users.length === 0) {
      req._loginMeta = { ip, userAgent, email, userId: null };
      return next();
    }

    const user = users[0];
    const now  = new Date();

    // 2. Kiểm tra khóa tài khoản
    if (user.locked_until && new Date(user.locked_until) > now) {
      const remaining = Math.ceil((new Date(user.locked_until) - now) / 1000); // giây
      const minutes   = Math.floor(remaining / 60);
      const seconds   = remaining % 60;

      // Ghi log
      await writeLoginLog({
        userId: user.id, email, ip, userAgent,
        status: "locked",
        failReason: `Tài khoản đang bị khóa, còn ${remaining}s`
      });

      return res.status(429).json({
        message: `Tài khoản tạm thời bị khóa. Vui lòng thử lại sau ${minutes > 0 ? `${minutes} phút ` : ""}${seconds} giây.`,
        locked: true,
        retryAfter: remaining,
        attempts: user.login_attempts,
      });
    }

    // 3. Nếu khóa đã hết hạn → auto unlock (reset attempts về 0 để bắt đầu lại)
    if (user.locked_until && new Date(user.locked_until) <= now) {
      await query(
        "UPDATE users SET locked_until = NULL WHERE id = ?",
        [user.id]
      );
    }

    // 4. Kiểm tra CAPTCHA nếu attempts >= 3
    const currentAttempts = user.login_attempts || 0;
    if (currentAttempts >= 3) {
      if (!recaptchaToken) {
        return res.status(400).json({
          message: "Vui lòng xác nhận bạn không phải robot!",
          requireCaptcha: true,
          attempts: currentAttempts,
        });
      }

      const captchaOk = await verifyRecaptchaIfPresent(recaptchaToken);
      if (!captchaOk) {
        return res.status(400).json({
          message: "Xác minh reCAPTCHA thất bại. Vui lòng thử lại!",
          requireCaptcha: true,
          attempts: currentAttempts,
        });
      }
    }

    // 5. Đính kèm metadata vào request để controller dùng sau
    req._loginMeta = {
      ip, userAgent, email,
      userId: user.id,
      currentAttempts,
    };

    return next();

  } catch (err) {
    console.error("loginSecurity middleware error:", err);
    return res.status(500).json({ message: "Lỗi server bảo mật đăng nhập" });
  }
};

// ════════════════════════════════════════════════════════════
// HÀM XỬ LÝ SAU KHI LOGIN (gọi từ controller)
// ════════════════════════════════════════════════════════════

// Gọi khi login THÀNH CÔNG
async function onLoginSuccess(userId, email, ip, userAgent) {
  try {
    // Reset attempts
    await query(
      "UPDATE users SET login_attempts = 0, locked_until = NULL, last_failed_at = NULL WHERE id = ?",
      [userId]
    );
    // Ghi log
    await writeLoginLog({ userId, email, ip, userAgent, status: "success" });
  } catch (err) {
    console.error("onLoginSuccess error:", err.message);
  }
}

// Gọi khi login THẤT BẠI
async function onLoginFailed(userId, email, ip, userAgent, reason = "Sai mật khẩu") {
  if (!userId) {
    // Email không tồn tại → chỉ ghi log
    await writeLoginLog({ userId: null, email, ip, userAgent, status: "failed", failReason: "Email không tồn tại" });
    return { locked: false, attempts: 0, requireCaptcha: false };
  }

  try {
    // Tăng attempts
    await query(
      "UPDATE users SET login_attempts = login_attempts + 1, last_failed_at = NOW() WHERE id = ?",
      [userId]
    );

    // Lấy attempts mới nhất
    const rows = await query("SELECT login_attempts FROM users WHERE id = ?", [userId]);
    const newAttempts = rows[0]?.login_attempts || 1;

    // Kiểm tra có cần khóa không
    const lockMinutes = getLockDurationMinutes(newAttempts);
    let locked = false;

    if (lockMinutes > 0) {
      await query(
        "UPDATE users SET locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?",
        [lockMinutes, userId]
      );
      locked = true;
    }

    // Ghi log
    await writeLoginLog({
      userId, email, ip, userAgent,
      status: "failed",
      failReason: `${reason} (lần ${newAttempts})`
    });

    return {
      locked,
      lockMinutes,
      attempts: newAttempts,
      requireCaptcha: newAttempts >= 3,
    };

  } catch (err) {
    console.error("onLoginFailed error:", err.message);
    return { locked: false, attempts: 0, requireCaptcha: false };
  }
}

module.exports = {
  loginSecurity,
  onLoginSuccess,
  onLoginFailed,
  getClientIP,
  getDeviceType,
  writeLoginLog,
};