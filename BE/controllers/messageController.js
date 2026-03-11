const db = require("../config/db");

// Lấy lịch sử tin nhắn dựa trên userId
exports.getMessagesByUserId = (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT m.id, m.message_text as text, u.name as senderName, u.role as senderRole, m.created_at as time
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

// Xóa tin nhắn theo ID
exports.deleteMessage = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM messages WHERE id = ?";

  // First, find the related conversation -> user_id so we know which room to notify
  const findRoomSql = `SELECT c.user_id FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE m.id = ? LIMIT 1`;
  db.query(findRoomSql, [id], (err, rows) => {
    if (err) return res.status(500).json(err);

    const roomUserId = rows && rows.length > 0 ? rows[0].user_id : null;

    db.query(sql, [id], (err2, result) => {
      if (err2) return res.status(500).json(err2);

      // Emit socket event to notify other clients in the room (if io available)
      try {
        if (global.io && roomUserId) {
          global.io.to(String(roomUserId)).emit("message_deleted", {
            room: roomUserId,
            messageId: id
          });
        }
      } catch (e) {
        console.error('Emit message_deleted error:', e);
      }

      res.json({ message: "Xóa tin nhắn thành công" });
    });
  });
};