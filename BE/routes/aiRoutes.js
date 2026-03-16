const express = require("express");
const router = express.Router();
const axios = require("axios");
const db = require("../config/db");

router.post("/chat", async (req, res) => {

  const { message, userId } = req.body;

  console.log(`👤 [USER ${userId}]: ${message}`);

  try {

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: message }]
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const aiText =
      response.data.candidates[0].content.parts[0].text;

    console.log(`🤖 [AI]: ${aiText}`);

    // tìm ai conversation
    const findConv =
      "SELECT id FROM ai_conversations WHERE user_id=? LIMIT 1";

    db.query(findConv, [userId], (err, result) => {

      if (err) return res.status(500).json(err);

      let convId = result?.[0]?.id;

      const saveMessages = (convId) => {

        db.query(
          "INSERT INTO ai_messages (conversation_id, role, message_text) VALUES (?, 'user', ?)",
          [convId, message]
        );

        db.query(
          "INSERT INTO ai_messages (conversation_id, role, message_text) VALUES (?, 'assistant', ?)",
          [convId, aiText]
        );

      };

      if (convId) {

        saveMessages(convId);

      } else {

        db.query(
          "INSERT INTO ai_conversations (user_id) VALUES (?)",
          [userId],
          (e, r) => {

            if (!e) saveMessages(r.insertId);

          }
        );

      }

    });

    res.json({
      reply: aiText
    });

  } catch (err) {

      console.log("AI ERROR:", err.response?.data || err.message);

      res.status(500).json({
        reply: "AI hiện đang bận."
      });

    }

});

router.get("/history/:userId", (req, res) => {

  const { userId } = req.params;

  const findConv =
    "SELECT id FROM ai_conversations WHERE user_id=? LIMIT 1";

  db.query(findConv, [userId], (err, result) => {

    if (err) return res.status(500).json(err);

    if (!result.length) {
      return res.json([]); // chưa có conversation
    }

    const convId = result[0].id;

    const sql = `
      SELECT role, message_text, created_at
      FROM ai_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `;

    db.query(sql, [convId], (err2, messages) => {

      if (err2) return res.status(500).json(err2);

      const formatted = messages.map(msg => ({
        senderId: msg.role === "user" ? userId : 0,
        text: msg.message_text,
        time: msg.created_at
      }));

      res.json(formatted);

    });

  });

});

module.exports = router;