import React, { useState, useEffect, useRef, useContext } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import { Bot, Send, Headset, X, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

const socket = io("http://localhost:5000");

function ChatBox() {
  const { theme } = useContext(ThemeContext);
  const location = useLocation();
  const socketRef = useRef(socket);
  const scrollRef = useRef();

  const [isOpen, setIsOpen] = useState(false);
  const [isAiMode, setIsAiMode] = useState(true);
  const [adminMessages, setAdminMessages] = useState([]);
  const [aiMessages, setAiMessages] = useState([]);
  const [input, setInput] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  // 1. Tải lịch sử Chat (Cả AI và Admin)
  useEffect(() => {

    if (!user) return;

    axios
      .get(`http://localhost:5000/api/ai/history/${user.id}`)
      .then(res => setAiMessages(res.data))
      .catch(() => setAiMessages([]));

  }, [user?.id]);

  useEffect(() => {

    if (!user) return;

    const token = localStorage.getItem("token");

    axios
      .get(`http://localhost:5000/api/messages/history/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setAdminMessages(res.data))
      .catch(() => setAdminMessages([]));

  }, [user?.id]);

  // 2. Nhận tin nhắn Real-time
  useEffect(() => {
    if (user?.id) socketRef.current.emit("join_room", user.id);

    const handleReceive = (msg) => {

      if (String(msg.senderId) === "0") {
        setAiMessages(prev => [...prev, msg]);
      } else {
        setAdminMessages(prev => [...prev, msg]);
      }
    };

    const handleDeleted = ({ messageId }) => {
      const id = parseInt(messageId);
      setAdminMessages(prev => prev.filter(m => m.id !== id));
      setAiMessages(prev => prev.filter(m => m.id !== id));
    };

    socketRef.current.on("receive_message", handleReceive);
    socketRef.current.on("message_deleted", handleDeleted);

    return () => {
      socketRef.current.off("receive_message", handleReceive);
      socketRef.current.off("message_deleted", handleDeleted);
    };
  }, [user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [adminMessages, aiMessages, isAiMode, isOpen]);

  const handleDeleteMessage = async (id) => {
    if (!window.confirm("Xóa tin nhắn này?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/messages/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Xóa tin nhắn thành công!");
    } catch (err) {
      toast.error("Không thể xóa tin nhắn.");
    }
  };

  const sendMessage = async (e) => {

    e.preventDefault();

    if (!input.trim() || !user) return;

    const text = input;

    setInput("");

    // ================= AI CHAT =================
    if (isAiMode) {

      const userMsg = {
        senderId: user.id,
        text: text,
        time: new Date()
      };

      // hiển thị message user ngay
      setAiMessages(prev => [...prev, userMsg]);

      try {

        const res = await axios.post(
          "http://localhost:5000/api/ai/chat",
          {
            message: text,
            userId: user.id
          }
        );

        const aiMsg = {
          senderId: 0,
          text: res.data.reply,
          time: new Date()
        };

        setAiMessages(prev => [...prev, aiMsg]);

      } catch (err) {

        setAiMessages(prev => [
          ...prev,
          { senderId: 0, text: "AI hiện đang bận." }
        ]);

      }

    }

    // ================= ADMIN CHAT =================
    else {

      socketRef.current.emit("send_message", {
        room: user.id,
        text: text,
        senderId: user.id
      });

    }

  };

  // QUY TẮC HOOK: Không return sớm trước khi gọi hết useEffect
  if (location.pathname === "/admin/chat") return null;

  const displayMessages = isAiMode ? aiMessages : adminMessages;

  return (
    <div className="fixed-bottom d-flex flex-column align-items-end p-4" style={{ zIndex: 1050, right: 0 }}>
      {isOpen && (
        <div className={`card shadow-2xl mb-3 border-0 transition-all ${theme === "dark" ? "bg-dark shadow-dark" : "bg-white shadow-light"}`}
             style={{ width: "380px", borderRadius: "25px", overflow: "hidden", animation: "slideUp 0.3s ease-out" }}>
          
          <div className="btn-auth-gradient p-4 d-flex justify-content-between align-items-center text-white">
            <div className="d-flex align-items-center gap-3">
              {isAiMode ? <Bot size={22} /> : <Headset size={22} />}
              <h6 className="mb-0 fw-bold">{isAiMode ? "Trợ lý ảo AI" : "Tư vấn viên"}</h6>
            </div>
            <button className="btn btn-sm btn-light rounded-pill px-3 fw-bold shadow-sm" onClick={() => setIsAiMode(!isAiMode)}>
              {isAiMode ? "Gặp Admin" : "Dùng AI"}
            </button>
          </div>

          <div ref={scrollRef} className="card-body overflow-auto p-4 d-flex flex-column custom-scrollbar" style={{ height: "420px", backgroundColor: theme === "dark" ? "#1a1d21" : "#f8faff" }}>
            {displayMessages.map((msg, index) => {
              const isMe = String(msg.senderId) === String(user?.id);
              const msgId = msg.id || msg._id;

              return (
                <div key={index} className={`d-flex flex-column mb-4 chat-bubble-wrapper ${isMe ? "align-items-end" : "align-items-start"}`}>
                  <small className={`mb-1 px-2 fw-bold ${theme === 'dark' ? 'text-light' : 'text-dark'}`} style={{ fontSize: "0.85rem", opacity: 0.9 }}>
                    {isMe ? "Bạn" : (String(msg.senderId) === "0" ? "AI Assistant" : "Admin")}
                  </small>

                  <div className={`d-flex align-items-center w-100 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`px-3 py-2 shadow-sm ${isMe ? "btn-auth-gradient text-white rounded-start-4 rounded-bottom-4" : (theme === "dark" ? "bg-secondary text-light" : "bg-white text-dark border") + " rounded-end-4 rounded-bottom-4"}`}
                         style={{ maxWidth: "80%", fontSize: "0.95rem" }}>
                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.text || msg.message_text}</div>
                    </div>

                    {isMe && msgId && (
                      <div className="delete-btn-container">
                        <button onClick={() => handleDeleteMessage(msgId)} className="btn-delete-msg border-0 bg-transparent">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <small className="mt-1 px-2 opacity-50" style={{ fontSize: "0.75rem" }}>
                    {msg.time ? new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </small>
                </div>
              );
            })}
          </div>

          <form onSubmit={sendMessage} className={`card-footer p-3 border-0 ${theme === "dark" ? "bg-dark" : "bg-white"}`}>
            <div className={`d-flex align-items-center rounded-pill p-2 border ${theme === "dark" ? "bg-secondary border-secondary" : "bg-light"}`}>
              <input className={`form-control border-0 bg-transparent ps-3 shadow-none ${theme === 'dark' ? 'text-white' : ''}`} placeholder="Aa..." value={input} onChange={(e) => setInput(e.target.value)} />
              <button className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center p-0" type="submit" style={{ width: "40px", height: "40px", background: "linear-gradient(135deg, #21d4fd 0%, #b721ff 100%)", border: 'none' }}>
                <Send size={18} color="white" />
              </button>
            </div>
          </form>
        </div>
      )}

      <button className="btn btn-auth-gradient rounded-circle shadow-lg d-flex align-items-center justify-content-center transition-all hover-lift"
              onClick={() => setIsOpen(!isOpen)} style={{ width: "65px", height: "65px", border: "none", zIndex: 1100 }}>
        {isOpen ? <X size={30} color="white" /> : (isAiMode ? <Bot size={32} color="white" /> : <Headset size={32} color="white" />)}
      </button>
    </div>
  );
}

export default ChatBox;