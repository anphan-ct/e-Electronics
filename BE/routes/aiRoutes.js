const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../config/db");

router.post("/chat", async (req, res) => {
  const { message, userId } = req.body;
  console.log(`👤 [USER ${userId}]: ${message}`);

  const findConv = "SELECT id FROM ai_conversations WHERE user_id=? LIMIT 1";

  db.query(findConv, [userId], (err, result) => {
    if (err) return res.status(500).json(err);

    const processChat = async (convId) => {
      // LƯU & BÁO TIN NHẮN CỦA USER QUA SOCKET (Để Frontend cập nhật)
      db.query(
        "INSERT INTO ai_messages (conversation_id, role, message_text) VALUES (?, 'user', ?)",
        [convId, message],
        (e, r) => {
          if (!e) {
            global.io.emit("ai_message", {
              id: r.insertId, 
              sender: "user",
              text: message,
              userId: userId
            });
          }
        }
      );

      async function detectIntent(msgText) {
        try {
          // FIX: Dùng model hợp lệ (gemini-1.5-flash)
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              contents: [{ role: "user", parts: [{ text: `Phân tích câu hỏi và trả JSON.\nChỉ trả JSON, không giải thích.\n{\n  "intent": "top_products | user_orders | normal_chat",\n  "limit": number\n}\nCâu hỏi: "${msgText}"` }] }]
            }
          );
          
          let text = response.data.candidates[0].content.parts[0].text;
          // FIX: Xóa markdown code block nếu Gemini lỡ sinh ra
          text = text.replace(/```json/g, "").replace(/```/g, "").trim(); 
          return JSON.parse(text);
        } catch (err) {
          return { intent: "normal_chat" };
        }
      }

      const intentData = await detectIntent(message);
      let extraContext = "";

      if (intentData.intent === "top_products") {
        const limit = intentData.limit || 5;
        db.query(`
          SELECT p.name, p.price, SUM(oi.quantity) as sold
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          JOIN products p ON oi.product_id = p.id
          WHERE o.payment_status = 'paid'
          GROUP BY oi.product_id
          ORDER BY sold DESC
          LIMIT ?
        `, [limit], (err, rows) => {
          if (!err && rows.length) {
            extraContext = "Top sản phẩm bán chạy:\n";
            rows.forEach((p, i) => {
              extraContext += `${i + 1}. ${p.name} - ${p.sold} đã bán - ${p.price}$\n`;
            });
          }
          callAI(extraContext);
        });

      } else if (intentData.intent === "user_orders") {
        db.query("SELECT id, total, status FROM orders WHERE user_id=?", [userId], (err, orders) => {
          if (!err && orders.length) {
            extraContext = "Đơn hàng của bạn:\n";
            orders.forEach(o => { extraContext += `- Đơn #${o.id}: ${o.total}$ (${o.status})\n`; });
          }
          callAI(extraContext);
        });
      } else {
        callAI("");
      }

      async function callAI(contextText, retry = 0) {
        try {
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              contents: [{ role: "user", parts: [{ text: `Bạn là trợ lý bán hàng.\n\nDữ liệu từ hệ thống:\n${contextText}\n\nCâu hỏi: ${message}\n\nQUY TẮC:\n- Chỉ được dùng dữ liệu ở trên\n- Không được tự bịa sản phẩm\n- Nếu không có dữ liệu → nói không có\n\nHãy trả lời thân thiện, dễ hiểu.` }] }]
            }
          );

          const aiText = response.data.candidates[0].content.parts[0].text;

          db.query(
            "INSERT INTO ai_messages (conversation_id, role, message_text) VALUES (?, 'assistant', ?)",
            [convId, aiText],
            (e2, r2) => {
              if (!e2) {
                global.io.emit("ai_message", {
                  id: r2.insertId,
                  sender: "ai",
                  text: aiText,
                  userId: userId
                });
              }
            }
          );
          res.json({ reply: aiText });

        } catch (err) {
          const status = err.response?.status;
          if (status === 503 && retry < 3) {
            return setTimeout(() => { callAI(contextText, retry + 1); }, 1000); 
          }
          
          console.log("AI ERROR:", err.response?.data || err.message);

          // FIX: Thông báo lỗi ngược về UI bằng Socket nếu đứt gánh giữa đường
          global.io.emit("ai_message", {
            id: Date.now(),
            sender: "ai",
            text: "Xin lỗi, hệ thống AI đang bận hoặc quá tải. Bạn hãy thử lại sau nhé!",
            userId: userId
          });

          res.status(500).json({ reply: "Lỗi kết nối AI" });
        }
      }
    };

    let convId = result?.length ? result[0].id : null;
    if (convId !== null) {
      processChat(convId);
    } else {
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
    const sql = "SELECT id, role, message_text, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC";

    db.query(sql, [convId], (err2, messages) => {
      if (err2) return res.status(500).json(err2);

      const formatted = messages.map(msg => ({
        id: msg.id,
        senderId: msg.role === "user" ? userId : 0,
        text: msg.message_text,
        time: msg.created_at
      }));

      res.json(formatted);
    });
  });
});

module.exports = router;