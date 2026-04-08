// BE/server.js
const express = require("express");
const cors    = require("cors");
const http    = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const db = require("./config/db");

const authRoutes      = require("./routes/authRoutes");
const messageRoutes   = require("./routes/messageRoutes");
const productRoutes   = require("./routes/productRoutes");
const aiRoutes        = require("./routes/aiRoutes");
const vnpayRoutes     = require("./routes/vnpayRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const orderRoutes     = require("./routes/orderRoutes");
const securityRoutes  = require("./routes/securityRoutes");
const loyaltyRoutes = require("./routes/loyaltyRoutes");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth",      authRoutes);
app.use("/api/messages",  messageRoutes);
app.use("/api/products",  productRoutes);
app.use("/api/ai",        aiRoutes);
app.use("/api/vnpay",     vnpayRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/orders",    orderRoutes);
app.use("/api/security",  securityRoutes);
app.use("/api/loyalty", loyaltyRoutes);

require("./cron/loyaltyCron");

const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });
global.io = io;

io.on("connection", (socket) => {

  socket.on("join_room", (userId) => {
    socket.join(String(userId));
  });

  socket.on("send_message", (data) => {
    const { room, text, senderId } = data;
    console.log("SOCKET SEND:", data);
    console.log(`[USER ${senderId}]: ${text}`);

    const findConv = "SELECT id FROM conversations WHERE user_id = ? LIMIT 1";

    db.query(findConv, [room], (err, result) => {
      if (err) { console.error("Find conversation error:", err); return; }

      let convId = result && result.length > 0 ? result[0].id : null;

  const saveMsg = (convId) => {
    const sql = "INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)";

    db.query(sql, [convId, senderId, text], (err, res) => {
      if (err) {
        console.error("Insert message error:", err);
        return;
      }
      io.to(String(room)).emit("receive_message", {
        id: res.insertId,
        room: String(room),
        senderId: senderId,
        senderRole: String(senderId) === String(room) ? "user" : "admin",
        text: text,
        time: new Date(),
      });
    });
  };

      if (convId !== null) {
        saveMsg(convId);
      } else {
        db.query("INSERT INTO conversations (user_id,status) VALUES (?, 'open')", [room], (e, r) => {
          if (e) {
            console.error("Create conversation error:", e);
            return;
          }

          saveMsg(r.insertId);
        });
      }
    });
  });

  socket.on("admin_join", (userId) => {
    socket.join(String(userId));
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));