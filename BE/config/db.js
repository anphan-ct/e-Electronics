const mysql = require("mysql2");


const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "myshop",
  timezone: "+07:00",
  waitForConnections: true,
  connectionLimit: 10, // Số lượng kết nối tối đa chạy song song
  queueLimit: 0
});

// Kiểm tra kết nối Pool
db.getConnection((err, connection) => {
  if (err) {
    console.error("DB connection failed:", err.message);
  } else {
    console.log("MySQL Connected");
    connection.release(); // Trả kết nối lại cho Pool sau khi test thành công
  }
});

// Lắng nghe lỗi rớt mạng ở cấp độ Pool để không bị crash app
db.on('error', (err) => {
  console.error("MySQL Pool Error:", err.code);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
    console.error("Kết nối database bị đứt, pool sẽ tự động kết nối lại.");
  } else {
    throw err;
  }
});

module.exports = db;