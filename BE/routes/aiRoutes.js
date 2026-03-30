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


          async function detectIntent(message) {
      try {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `
                          Phân tích câu hỏi và trả JSON.

                          Chỉ trả JSON, không giải thích.

                          {
                            "intent": "top_products | user_orders | normal_chat",
                            "limit": number
                          }

                          Câu hỏi: "${message}"
                          `
                  }
                ]
              }
            ]
          }
        );

        const text = response.data.candidates[0].content.parts[0].text;

        return JSON.parse(text);

      } catch (err) {
        return { intent: "normal_chat" };
      }
    }



      // BƯỚC B: PHÂN TÍCH CÂU HỎI
      //let extraContext = "";

      // Nếu hỏi sản phẩm
      // if (message.toLowerCase().includes("sản phẩm")) {

      //   db.query("SELECT name, price, description FROM products LIMIT 5", (err3, products) => {
      //     if (!err3 && products.length) {
      //       extraContext = "Danh sách sản phẩm:\n" + products.map(p =>
      //         `- ${p.name} (${p.price}$): ${p.description}`
      //       ).join("\n");
      //     }

      //     callAI(extraContext);
      //   });

      // }
      // // Nếu hỏi đơn hàng
      // else if (message.toLowerCase().includes("đơn hàng")) {

      //   db.query("SELECT id, total, status FROM orders WHERE user_id=?", [userId], (err4, orders) => {
      //     if (!err4 && orders.length) {
      //       extraContext = "Đơn hàng của user:\n" + orders.map(o =>
      //         `- Đơn #${o.id}: ${o.total}$ (${o.status})`
      //       ).join("\n");
      //     }

      //     callAI(extraContext);
      //   });

      // }
      // // Không liên quan DB
      // else {
      //   callAI("");
      // }


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

      }
      else if (intentData.intent === "user_orders") {

        db.query(
          "SELECT id, total, status FROM orders WHERE user_id=?",
          [userId],
          (err, orders) => {

            if (!err && orders.length) {
              extraContext = "Đơn hàng của bạn:\n";

              orders.forEach(o => {
                extraContext += `- Đơn #${o.id}: ${o.total}$ (${o.status})\n`;
              });
            }

            callAI(extraContext);
          }
        );

      }
      else {
        callAI("");
      }


      // ===== HÀM GỌI AI =====
      async function callAI(contextText, retry = 0) {
        try {
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `
                Bạn là trợ lý bán hàng.

                Dữ liệu từ hệ thống:
                ${contextText}

                Câu hỏi: ${message}

                QUY TẮC:
                - Chỉ được dùng dữ liệu ở trên
                - Không được tự bịa sản phẩm
                - Nếu không có dữ liệu → nói không có

                Hãy trả lời thân thiện, dễ hiểu. Nếu có thể, hãy gợi ý sản phẩm hoặc đơn hàng liên quan để khách hàng tham khảo nhé!
                `
                    }
                  ]
                }
              ]
            }
          );

          const aiText = response.data.candidates[0].content.parts[0].text;

          // Lưu DB như cũ
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

          // Retry tối đa 3 lần nếu bị 503
          if (status === 503 && retry < 3) {
            console.log(`Retry lần ${retry + 1}...`);

            return setTimeout(() => {
              callAI(contextText, retry + 1);
            }, 1000); // đợi 1s rồi gọi lại
          }

          console.log("AI ERROR:", err.response?.data || err.message);

          res.status(500).json({
            reply: "AI đang bận, bạn thử lại sau vài giây nhé!"
          });
        }
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