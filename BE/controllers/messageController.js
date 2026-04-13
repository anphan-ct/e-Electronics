const db = require("../config/db");

// 1. Dùng cho User ChatBox (Chỉ lấy tin nhắn với Tư vấn viên)
exports.getMessagesByUserId = (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT 
      m.id, 
      m.message_text as text, 
      m.sender_id as senderId, 
      u.role as senderRole, 
      m.created_at as time
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE c.user_id = ?
    ORDER BY m.created_at ASC
  `;
  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};

// 2. Dùng cho AdminChat (GỘP cả tin AI và Admin)
exports.getAllMessagesByUserId = (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT 
      m.id, 
      m.message_text as text, 
      m.sender_id as senderId, 
      u.role as senderRole, 
      m.created_at as time
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE c.user_id = ?

    UNION ALL

    SELECT 
      aim.id, 
      aim.message_text as text, 
      CASE WHEN aim.role = 'user' THEN ? ELSE '0' END as senderId, 
      CASE WHEN aim.role = 'user' THEN 'user' ELSE 'ai' END as senderRole, 
      aim.created_at as time
    FROM ai_messages aim
    JOIN ai_conversations aic ON aim.conversation_id = aic.id
    WHERE aic.user_id = ?

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
  db.query("DELETE FROM messages WHERE id = ?", [id], (err, result) => {
    if (result && result.affectedRows > 0) {
      global.io.emit("message_deleted", { messageId: id });
      return res.json({ message: "Xóa tin nhắn thường thành công" });
    }
    db.query("DELETE FROM ai_messages WHERE id = ?", [id], (err2, result2) => {
      if (result2 && result2.affectedRows > 0) {
        global.io.emit("message_deleted", { messageId: id });
        return res.json({ message: "Xóa tin nhắn AI thành công" });
      }
      res.status(404).json({ message: "Không tìm thấy tin nhắn để xóa" });
    });
  });
};