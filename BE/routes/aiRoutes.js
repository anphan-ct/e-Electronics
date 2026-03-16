const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../config/db");

router.post("/chat", async (req, res) => {
  const { message, userId } = req.body;

  console.log(`👤 [USER ${userId}]: ${message}`);

  // 1. Tìm hoặc tạo cuộc hội thoại AI trước
  const findConv = "SELECT id FROM ai_conversations WHERE user_id=? LIMIT 1";

  db.query(findConv, [userId], (err, result) => {
    if (err) return res.status(500).json(err);

    // Hàm xử lý lưu tin nhắn và gọi AI
    const processChat = async (convId) => {
      // BƯỚC A: LƯU & PHÁT TIN NHẮN USER NGAY LẬP TỨC (REAL-TIME CHO ADMIN)
      db.query(
        "INSERT INTO ai_messages (conversation_id, role, message_text) VALUES (?, 'user', ?)",
        [convId, message],
        (e, r) => {
          if (!e) {
            global.io.emit("ai_message", {
              id: r.insertId, // Gửi ID thật để Admin có thể xóa đồng bộ
              sender: "user",
              text: message,
              userId: userId
            });
          }
        }
      );

      try {
        // BƯỚC B: GỌI GEMINI (Trong lúc này Admin đã thấy tin nhắn của khách ở trên)
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            contents: [
              {
                role: "user",
                parts: [{ text: message }]
              }
            ]
          }
        );

        const aiText = response.data.candidates[0].content.parts[0].text;
        console.log(`🤖 [AI]: ${aiText}`);

        // BƯỚC C: LƯU & PHÁT TIN NHẮN AI SAU KHI CÓ KẾT QUẢ
        db.query(
          "INSERT INTO ai_messages (conversation_id, role, message_text) VALUES (?, 'assistant', ?)",
          [convId, aiText],
          (e2, r2) => {
            if (!e2) {
              global.io.emit("ai_message", {
                id: r2.insertId, // Gửi ID thật để Admin có thể xóa đồng bộ
                sender: "ai",
                text: aiText,
                userId: userId
              });
            }
          }
        );

        res.json({ reply: aiText });

      } catch (err) {
        console.log("AI ERROR:", err.response?.data || err.message);
        res.status(500).json({ reply: "AI hiện đang bận." });
      }
    };

    // Kiểm tra và thực thi
    let convId = result?.length ? result[0].id : null;

    if (convId !== null) {
      processChat(convId);
    } else {
      // Tạo hội thoại mới nếu chưa có
      db.query("INSERT INTO ai_conversations (user_id) VALUES (?)", [userId], (e, r) => {
        if (!e) processChat(r.insertId);
        else res.status(500).json({ message: "Lỗi tạo hội thoại" });
      });
    }
  });
});

router.get("/history/:userId", (req, res) => {
  const { userId } = req.params;
  const findConv = "SELECT id FROM ai_conversations WHERE user_id=? LIMIT 1";

  db.query(findConv, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result.length) return res.json([]);

    const convId = result[0].id;
    const sql = `
      SELECT id, role, message_text, created_at
      FROM ai_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `;

    db.query(sql, [convId], (err2, messages) => {
      if (err2) return res.status(500).json(err2);

      const formatted = messages.map(msg => ({
        id: msg.id, // Trả về ID để FE có thể xóa
        senderId: msg.role === "user" ? userId : 0,
        text: msg.message_text,
        time: msg.created_at
      }));

      res.json(formatted);
    });
  });
});

module.exports = router;