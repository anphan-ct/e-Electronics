// BE/server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Make `io` accessible from controllers through global (simple approach)
global.io = io;

io.on("connection", (socket) => {
  socket.on("join_room", (userId) => {
    socket.join(String(userId));
  });

  socket.on("send_message", (data) => {
    const { room, text, senderId } = data;
    const userId = String(room);
    const findConvSql = "SELECT id FROM conversations WHERE user_id = ? AND status = 'open' LIMIT 1";
    db.query(findConvSql, [userId], (err, result) => {
      if (result && result.length > 0) {
        saveMsg(result[0].id, data);
      } else {
        db.query("INSERT INTO conversations (user_id) VALUES (?)", [userId], (err, res) => {
          if (!err) saveMsg(res.insertId, data);
        });
      }
    });

    function saveMsg(convId, originalData) {
      const sql = "INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (?, ?, ?)";
      
      db.query(sql, [convId, senderId, text], (err, res) => {
        if (!err) {

          io.to(userId).emit("receive_message", {
            ...originalData,
            id: res.insertId
          });

        }
      });
    }
  });

  // ĐỒNG BỘ XÓA REAL-TIME
  socket.on("delete_message", (data) => {
    const { room, messageId } = data;

    io.to(String(room)).emit("message_deleted", {
      room: room,
      messageId: messageId
    });

  });
});

server.listen(5000, () => console.log("Server running on port 5000"));