const cron = require("node-cron");
const db = require("../config/db"); // Trỏ đúng đường dẫn file db

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Lên lịch chạy vào 00:00 (Nửa đêm) mỗi ngày
cron.schedule("0 0 * * *", async () => {
  console.log("⏳ [CRON] Bắt đầu quét điểm hết hạn...");
  try {
    await query("START TRANSACTION");

    // Tìm các giao dịch cộng điểm đã quá hạn và chưa xử lý
    const expiredTxs = await query(`
      SELECT id, user_id, points 
      FROM loyalty_transactions 
      WHERE type = 'earn' 
        AND expire_at < CURDATE() 
        AND is_expired = FALSE
      FOR UPDATE
    `);

    if (expiredTxs.length === 0) {
      await query("COMMIT");
      return console.log("[CRON] Không có điểm nào hết hạn hôm nay.");
    }

    for (const tx of expiredTxs) {
      // Lock user để cập nhật an toàn
      const [user] = await query(
        "SELECT loyalty_points FROM users WHERE id = ? FOR UPDATE", 
        [tx.user_id]
      );

      if (!user || user.loyalty_points <= 0) {
        // User hết sạch điểm, chỉ cần đánh dấu là đã quét
        await query("UPDATE loyalty_transactions SET is_expired = TRUE WHERE id = ?", [tx.id]);
        continue;
      }

      // Tính điểm cần trừ (Chỉ trừ tối đa số điểm user đang có)
      const pointsToDeduct = Math.min(user.loyalty_points, tx.points);
      const newBalance = user.loyalty_points - pointsToDeduct;

      // Cập nhật lại số dư user
      await query("UPDATE users SET loyalty_points = ? WHERE id = ?", [newBalance, tx.user_id]);

      // Ghi lịch sử loại 'expire' (trừ điểm)
      await query(`
        INSERT INTO loyalty_transactions (user_id, type, points, balance_after, description)
        VALUES (?, 'expire', ?, ?, ?)
      `, [
        tx.user_id, 
        -pointsToDeduct, 
        newBalance, 
        `Hệ thống tự động trừ điểm hết hạn từ GD #${tx.id}`
      ]);

      // Đánh dấu giao dịch này đã xử lý xong
      await query("UPDATE loyalty_transactions SET is_expired = TRUE WHERE id = ?", [tx.id]);
    }

    await query("COMMIT");
    console.log(`[CRON] Hoàn tất trừ điểm hết hạn cho ${expiredTxs.length} giao dịch.`);

  } catch (err) {
    await query("ROLLBACK");
    console.error("[CRON] Lỗi khi xử lý điểm hết hạn:", err.message);
  }
});