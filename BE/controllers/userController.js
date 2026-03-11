const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();

// Login user
exports.login = (req, res) => {

  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, result) => {

    if (err) {
      return res.status(500).json(err);
    }

    if (result.length === 0) {
      return res.status(400).json({
        message: "Email không tồn tại"
      });
    }

    const user = result[0];

    const checkPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!checkPassword) {
      return res.status(400).json({
        message: "Sai mật khẩu"
      });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email },
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
        role: user.role
      }
    });

  });
};

// Register user
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Kiểm tra email đã tồn tại chưa
    const checkSql = "SELECT * FROM users WHERE email = ?";
    db.query(checkSql, [email], async (err, result) => {
      if (result.length > 0) {
        return res.status(400).json({ message: "Email này đã được đăng ký!" });
      }

      // 2. Mã hóa mật khẩu (Bắt buộc để login hoạt động)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // 3. Lưu vào Database (Mặc định role là 'user')
      const sql = "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')";
      db.query(sql, [name, email, hashedPassword], (err, result) => {
        if (err) return res.status(500).json(err);
        res.status(201).json({ message: "Đăng ký tài khoản thành công!" });
      });
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi máy chủ khi đăng ký" });
  }
};


// Get user profile
exports.getProfile = (req, res) => {
  // id được lấy từ authMiddleware sau khi verify token thành công
  const userId = req.user.id; 

  const sql = "SELECT id, name, email, role, created_at FROM users WHERE id = ?";

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "User not found" });

    res.json(result[0]);
  });
};

//Lấy ds user
exports.getAllUsers = (req, res) => {
  // Chỉ lấy những người có role là 'user' để admin hỗ trợ
  const sql = "SELECT id, name, email FROM users WHERE role = 'user'";

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};