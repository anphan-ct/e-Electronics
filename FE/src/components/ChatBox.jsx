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

  const loadUser = () => { setUser(JSON.parse(localStorage.getItem("user"))); };

  // FIX LỖI INVALID DATE: Kiểm tra nếu là chuỗi đã format thì giữ nguyên
  const formatTime = (dateInput) => {
    if (!dateInput) return "";
    // Nếu dateInput đã là chuỗi format AM/PM thì không format lại nữa
    if (typeof dateInput === 'string' && (dateInput.includes('AM') || dateInput.includes('PM'))) {
      return dateInput;
    }
    const date = new Date(dateInput);
    // Kiểm tra tính hợp lệ của Date object
    return isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    loadUser();
    window.addEventListener("login", loadUser);
    
    socket.on("receive_message", (data) => setMessages(prev => [...prev, data]));
    
    socket.on("message_deleted", (data) => {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      if (currentUser && String(data.room) === String(currentUser.id)) {
        setMessages(prev => prev.filter(m => String(m.id) !== String(data.messageId)));
      }
    });

    return () => { socket.off("receive_message"); socket.off("message_deleted"); };
  }, []);

  useEffect(() => {
    if (user && user.role !== "admin") {
      socket.emit("join_room", String(user.id));
      axios.get(`http://localhost:5000/api/messages/history/${user.id}`, {
        headers: { Authorization: localStorage.getItem("token") }
      }).then(res => setMessages(res.data));
    }
  }, [user?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen]);

  const sendMessage = () => {
    if (!message.trim() || !user) return;
    const data = {
      room: String(user.id),
      text: message,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      time: formatTime(new Date()) // Gửi thời gian đã format chuẩn HH:MM:SS AM/PM
    };
    socket.emit("send_message", data);
    setMessage("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa tin nhắn này?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/messages/delete/${id}`, { headers: { Authorization: token } });
      setMessages(prev => prev.filter(m => String(m.id) !== String(id)));
      socket.emit("delete_message", { room: String(user.id), messageId: id });
      toast.success("Đã xóa!");
    } catch (err) { toast.error("Lỗi xóa"); }
  };

  if (!user || user?.role === "admin") return null;

  return (
    <>
      <button className="btn btn-primary position-fixed shadow-lg d-flex align-items-center justify-content-center" 
              style={{ bottom: "25px", right: "25px", borderRadius: "50%", width: "60px", height: "60px", zIndex: 9999 }} 
              onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "✖" : "💬"}
      </button>

      {isOpen && (
        <div className={`card position-fixed shadow-lg border-0 auth-modal-content ${theme === "dark" ? "bg-dark text-light" : "bg-white text-dark"}`} 
             style={{ width: "360px", height: "500px", bottom: "100px", right: "25px", zIndex: 10000, borderRadius: "25px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          
          <div className="p-3 text-white" style={{ background: "linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)" }}>
            <div className="d-flex align-items-center">
              <div className="bg-white rounded-circle me-3 d-flex align-items-center justify-content-center shadow-sm" style={{ width: "40px", height: "40px" }}>
                <span className="text-primary fw-bold">🛒</span>
              </div>
              <div>
                <h6 className="mb-0 fw-bold">Hỗ trợ trực tuyến</h6>
                <small style={{ opacity: 0.8 }}>Chào {user.name}!</small>
              </div>
            </div>
          </div>

          <div ref={scrollRef} className="card-body overflow-auto p-3 flex-grow-1 chat-scrollbar" 
               style={{ background: theme === "dark" ? "#121212" : "#f4f7f6" }}>
            {messages.map((m, i) => {
              const isMe = String(m.senderName) === String(user.name);
              const displayTime = formatTime(m.time || m.created_at);

              return (
                <div key={m.id || i} className={`d-flex mb-4 ${isMe ? "justify-content-end" : "justify-content-start"}`}>
                  <div className="position-relative chat-bubble-wrapper" style={{ maxWidth: "80%" }}>
                    {isMe && <button className="btn-delete-msg-client" onClick={() => handleDelete(m.id)}>×</button>}

                    {/* BONG BÓNG CHAT CHỨA NHÃN TÊN Ở TRONG */}
                    <div className={`p-2 px-3 rounded-4 shadow-sm ${isMe ? "bg-primary text-white" : (theme === "dark" ? "bg-secondary text-white border-0" : "bg-white border text-dark")}`}
                         style={{ borderRadius: isMe ? "18px 18px 0 18px" : "18px 18px 18px 0" }}>
                      <div className="fw-bold mb-1" style={{ fontSize: "11px", opacity: 0.8 }}>
                        {isMe ? "Bạn" : "Admin"}
                      </div>
                      <div style={{ fontSize: "14px", wordBreak: "break-word" }}>{m.text || m.message_text}</div>
                    </div>

                    {/* THỜI GIAN NẰM NGOÀI BONG BÓNG CHUẨN ĐÉT */}
                    <div style={{ fontSize: "10px", marginTop: "4px", textAlign: isMe ? "right" : "left", opacity: 0.5, color: theme === "dark" ? "#ccc" : "#666" }}>
                      {displayTime}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`p-3 border-top ${theme === "dark" ? "bg-dark border-secondary" : "bg-white"}`}>
            <div className="input-group align-items-center">
              <input className={`form-control border-0 px-3 py-2 text-dark ${theme === "dark" ? "bg-light" : "bg-light"}`} 
                     placeholder="Hỏi gì đó..." value={message} onChange={(e) => setMessage(e.target.value)}
                     onKeyDown={(e) => e.key === "Enter" && sendMessage()} style={{ borderRadius: "25px", fontSize: "14px" }} />
              <button className="btn btn-primary ms-2 rounded-circle d-flex align-items-center justify-content-center shadow-sm" 
                      onClick={sendMessage} style={{ width: "35px", height: "35px" }}>➤</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBox;