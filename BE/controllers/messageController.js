const db = require("../config/db");

// Lấy lịch sử tin nhắn dựa trên userId
exports.getMessagesByUserId = (req, res) => {
  const { userId } = req.params;
  const sql = `
    (SELECT m.id, m.message_text as text, m.sender_id as senderId, u.role as senderRole, m.created_at as time
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     LEFT JOIN users u ON m.sender_id = u.id
     WHERE c.user_id = ?)
    UNION ALL
    (SELECT am.id, am.message_text as text, 
     CASE WHEN am.role = 'user' THEN ? ELSE 0 END as senderId, 
     CASE WHEN am.role = 'user' THEN 'user' ELSE 'ai' END as senderRole,
     am.created_at as time
     FROM ai_messages am
     JOIN ai_conversations ac ON am.conversation_id = ac.id
     WHERE ac.user_id = ?)
    ORDER BY time ASC
  `;

  db.query(sql, [userId, userId, userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// Xóa tin nhắn theo ID
exports.deleteMessage = (req, res) => {
  const { id } = req.params;

  // 1. Kiểm tra xóa ở bảng tin nhắn thường
  db.query("DELETE FROM messages WHERE id = ?", [id], (err, result) => {
    if (result.affectedRows > 0) {
      global.io.emit("message_deleted", { messageId: id });
      return res.json({ message: "Xóa tin nhắn thường thành công" });
    }

    // 2. Nếu không có ở bảng thường, tìm và xóa ở bảng AI
    db.query("DELETE FROM ai_messages WHERE id = ?", [id], (err2, result2) => {
      if (result2 && result2.affectedRows > 0) {
        global.io.emit("message_deleted", { messageId: id });
        return res.json({ message: "Xóa tin nhắn AI thành công" });
      }
      res.status(404).json({ message: "Không tìm thấy tin nhắn để xóa" });
    });
  });
};