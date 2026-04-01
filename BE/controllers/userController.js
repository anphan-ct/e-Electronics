// BE/controllers/userController.js
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const {
  onLoginSuccess,
  onLoginFailed,
  getClientIP,
} = require("../middleware/loginSecurityMiddleware");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//
// ================= LOGIN USER =================
//
exports.login = (req, res) => {
  const { email, password } = req.body;

  // Lấy metadata từ middleware loginSecurity
  const meta = req._loginMeta || {};
  const ip        = meta.ip        || getClientIP(req);
  const userAgent = meta.userAgent || req.headers["user-agent"] || "";

  const sql = "SELECT * FROM users WHERE BINARY email = ?";

  db.query(sql, [email], async (err, result) => {
    if (err) return res.status(500).json(err);

    // Email không tồn tại
    if (result.length === 0) {
      await onLoginFailed(null, email, ip, userAgent, "Email không tồn tại");
      // Trả về cùng thông báo chung để tránh lộ thông tin
      return res.status(400).json({ message: "Email hoặc mật khẩu không chính xác" });
    }

    const user = result[0];

    // Tài khoản Google không dùng login thường
    if (user.login_type === "google") {
      return res.status(400).json({
        message: "Tài khoản này dùng Google để đăng nhập",
      });
    }

    // Kiểm tra mật khẩu
    const checkPassword = await bcrypt.compare(password, user.password);

    if (!checkPassword) {
      // Ghi nhận thất bại → trả về thông tin lock / captcha nếu cần
      const failResult = await onLoginFailed(user.id, email, ip, userAgent, "Sai mật khẩu");

      let message = "Email hoặc mật khẩu không chính xác";

      if (failResult.locked) {
        message = `Tài khoản bị khóa ${failResult.lockMinutes} phút do đăng nhập sai quá nhiều lần.`;
      }

      return res.status(400).json({
        message,
        locked: failResult.locked,
        lockMinutes: failResult.lockMinutes || 0,
        attempts: failResult.attempts,
        requireCaptcha: failResult.requireCaptcha,
      });
    }

    // ✅ Đăng nhập thành công
    await onLoginSuccess(user.id, email, ip, userAgent);

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.json({
      message: "Login success",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });
};

//
// ================= REGISTER =================
//
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const checkSql = "SELECT * FROM users WHERE BINARY email = ?";
    db.query(checkSql, [email], async (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.length > 0) {
        return res.status(400).json({ message: "Email này đã được đăng ký!" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const sql =
        "INSERT INTO users (name, email, password, role, login_type) VALUES (?, ?, ?, 'user', 'local')";

      db.query(sql, [name, email, hashedPassword], (err, result) => {
        if (err) return res.status(500).json(err);

        res.status(201).json({
          message: "Đăng ký thành công!",
          userId: result.insertId,
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi đăng ký" });
  }
};

//
// ================= GOOGLE LOGIN =================
//
exports.loginGoogle = async (req, res) => {
  const { token } = req.body;
  const ip        = getClientIP(req);
  const userAgent = req.headers["user-agent"] || "";

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload        = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], (err, result) => {
      if (err) return res.status(500).json(err);

      let user;

      if (result.length === 0) {
        // Tạo user mới
        const insertSql = `
          INSERT INTO users (name, email, password, role, login_type, google_id, avatar)
          VALUES (?, ?, '', 'user', 'google', ?, ?)
        `;

        db.query(insertSql, [name, email, sub, picture], async (err, insertResult) => {
          if (err) return res.status(500).json(err);

          user = { id: insertResult.insertId, name, email, role: "user" };

          await onLoginSuccess(user.id, email, ip, userAgent);

          const jwtToken = jwt.sign(
              { id: user.id, email: user.email, role: user.role },
              process.env.JWT_SECRET,
              { expiresIn: "1d" }
          );
          return res.json({ message: "Login Google success", token: jwtToken, user });
        });
      } else {
        user = result[0];

        onLoginSuccess(user.id, email, ip, userAgent);

        const jwtToken = jwt.sign(
          { id: user.id, email: user.email },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        return res.json({
          message: "Login Google success",
          token: jwtToken,
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
      }
    });
  } catch (error) {
    res.status(401).json({ message: "Google login failed" });
  }
};

//
// ================= GET PROFILE =================
//
exports.getProfile = (req, res) => {
  const userId = req.user.id;
  const sql = "SELECT id, name, email, role, created_at FROM users WHERE id = ?";

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "User not found" });
    res.json(result[0]);
  });
};

//
// ================= GET ALL USERS =================
//
exports.getAllUsers = (req, res) => {
  const sql = "SELECT id, name, email FROM users WHERE role = 'user'";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

//
// ================= UPDATE PROFILE =================
//
exports.updateProfile = (req, res) => {
  const userId    = req.user.id;
  const { name, email } = req.body;
  const checkSql  = "SELECT id FROM users WHERE BINARY email = ? AND id != ?";

  db.query(checkSql, [email, userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length > 0) {
      return res.status(400).json({ message: "Email đã được sử dụng!" });
    }

    const updateSql = "UPDATE users SET name = ?, email = ? WHERE id = ?";
    db.query(updateSql, [name, email, userId], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Cập nhật thành công", user: { id: userId, name, email } });
    });
  });
};

//
// ================= CHANGE PASSWORD =================
//
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword } = req.body;

  try {
    const sql = "SELECT password FROM users WHERE id = ?";
    db.query(sql, [userId], async (err, result) => {
      if (err) return res.status(500).json(err);

      const user    = result[0];
      const isMatch = await bcrypt.compare(oldPassword, user.password);

      if (!isMatch) {
        return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
      }

      const salt           = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      const updateSql      = "UPDATE users SET password = ? WHERE id = ?";

      db.query(updateSql, [hashedPassword, userId], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Đổi mật khẩu thành công" });
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};