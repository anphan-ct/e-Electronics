// FE/src/components/ChatBox.jsx

import { useState, useEffect, useContext, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";

const socket = io("http://localhost:5000", { transports: ["websocket"] });

function ChatBox() {
  const { theme } = useContext(ThemeContext);

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);

  const scrollRef = useRef(null);

  const loadUser = () => {
    setUser(JSON.parse(localStorage.getItem("user")));
  };

  useEffect(() => {
    loadUser();
    window.addEventListener("login", loadUser);

    // nhận tin nhắn mới
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    // đồng bộ xóa tin nhắn
    socket.on("message_deleted", (data) => {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (!currentUser) return;

      if (String(data.room) === String(currentUser.id)) {
        setMessages((prev) =>
          prev.filter((m) => String(m.id) !== String(data.messageId))
        );
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_deleted");
    };
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") {
      socket.emit("join_room", String(user.id));

      axios
        .get(`http://localhost:5000/api/messages/history/${user.id}`, {
          headers: { Authorization: localStorage.getItem("token") },
        })
        .then((res) => setMessages(res.data));
    }
  }, [user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = () => {
    if (!message.trim() || !user) return;

    const data = {
      room: String(user.id),
      text: message,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    };

    socket.emit("send_message", data);
    setMessage("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn muốn xóa tin nhắn này?")) return;

    try {
      const token = localStorage.getItem("token");

      await axios.delete(
        `http://localhost:5000/api/messages/delete/${id}`,
        {
          headers: { Authorization: token },
        }
      );

      // cập nhật UI
      setMessages((prev) =>
        prev.filter((m) => String(m.id) !== String(id))
      );

      toast.success("Đã xóa tin nhắn!");

      // thông báo admin
      socket.emit("delete_message", {
        room: String(user.id),
        messageId: id,
      });
    } catch (err) {
      toast.error("Lỗi xóa");
    }
  };

  if (!user || user?.role === "admin") return null;

  return (
    <>
      {/* BUTTON CHAT */}
      <button
        className="btn btn-primary position-fixed shadow-lg d-flex align-items-center justify-content-center"
        style={{
          bottom: "25px",
          right: "25px",
          borderRadius: "50%",
          width: "60px",
          height: "60px",
          zIndex: 9999,
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "✖" : "💬"}
      </button>

      {isOpen && (
        <div
          className={`card position-fixed shadow-lg border-0 auth-modal-content ${
            theme === "dark" ? "bg-dark text-light" : "bg-white text-dark"
          }`}
          style={{
            width: "360px",
            height: "500px",
            bottom: "100px",
            right: "25px",
            zIndex: 10000,
            borderRadius: "25px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* HEADER */}
          <div
            className="p-3 text-white"
            style={{
              background:
                "linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)",
            }}
          >
            <div className="d-flex align-items-center">
              <div
                className="bg-white rounded-circle me-3 d-flex align-items-center justify-content-center"
                style={{ width: "40px", height: "40px" }}
              >
                <span className="text-primary fw-bold">🛒</span>
              </div>

              <div>
                <h6 className="mb-0 fw-bold">Hỗ trợ trực tuyến</h6>
                <small style={{ opacity: 0.8 }}>
                  Chào {user.name}!
                </small>
              </div>
            </div>
          </div>

          {/* BODY CHAT */}
          <div
            ref={scrollRef}
            className="card-body overflow-auto p-3 flex-grow-1 chat-scrollbar"
            style={{
              background: theme === "dark" ? "#121212" : "#f4f7f6",
            }}
          >
            {messages.map((m, i) => {
              const isMe =
                String(m.senderName) === String(user.name);

              return (
                <div
                  key={m.id || i}
                  className={`d-flex mb-3 ${
                    isMe
                      ? "justify-content-end"
                      : "justify-content-start"
                  }`}
                >
                  <div
                    className="position-relative chat-bubble-wrapper"
                    style={{ maxWidth: "80%" }}
                  >
                    {isMe && (
                      <button
                        className="btn-delete-msg-client"
                        onClick={() => handleDelete(m.id)}
                      >
                        ×
                      </button>
                    )}

                    <div
                      className={`p-2 px-3 rounded-4 shadow-sm ${
                        isMe
                          ? "bg-primary text-white"
                          : theme === "dark"
                          ? "bg-secondary text-white"
                          : "bg-white border text-dark"
                      }`}
                      style={{
                        fontSize: "14px",
                        borderRadius: isMe
                          ? "18px 18px 0 18px"
                          : "18px 18px 18px 0",
                      }}
                    >
                      {m.text || m.message_text}
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                        marginTop: "3px",
                        textAlign: isMe ? "right" : "left",
                        opacity: 0.6,
                      }}
                    >
                      {m.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* INPUT */}
          <div
            className={`p-3 border-top ${
              theme === "dark"
                ? "bg-dark border-secondary"
                : "bg-white"
            }`}
          >
            <div className="input-group align-items-center">
              <input
                className={`form-control border-0 px-3 py-2 ${
                  theme === "dark"
                    ? "bg-secondary text-white"
                    : "bg-light text-dark"
                }`}
                placeholder="Hỏi gì đó..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && sendMessage()
                }
                style={{ borderRadius: "25px" }}
              />

              <button
                className="btn btn-primary ms-2 rounded-circle"
                onClick={sendMessage}
                style={{ width: "40px", height: "40px" }}
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBox;