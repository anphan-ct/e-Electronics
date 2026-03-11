import { useState, useEffect, useContext, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";

const socket = io("http://localhost:5000", { transports: ["websocket"] });

function AdminChat() {
  const { theme } = useContext(ThemeContext);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [targetUserId, setTargetUserId] = useState(null);
  const [targetUserName, setTargetUserName] = useState("");
  const scrollRef = useRef(null);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/auth/users", { headers: { Authorization: token } });
        setUsers(res.data.map(u => ({ ...u, unread: false })));
      } catch (err) { console.error("Lỗi lấy user", err); }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (targetUserId) {
      const fetchHistory = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`http://localhost:5000/api/messages/history/${targetUserId}`, { headers: { Authorization: token } });
          setMessages(res.data);
        } catch (err) { toast.error("Không thể tải lịch sử chat"); }
      };
      fetchHistory();
      socket.emit("join_room", String(targetUserId));
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, unread: false } : u));
    }

    socket.on("receive_message", (data) => {
      if (String(targetUserId) === String(data.room)) {
        setMessages(prev => [...prev, data]);
      } else {
        setUsers(prev => prev.map(u => String(u.id) === String(data.room) ? { ...u, unread: true } : u));
      }
    });

    socket.on("message_deleted", (data) => {
      setMessages(prev => prev.filter(m => String(m.id) !== String(data.messageId)));
    });

    return () => {
      socket.off("receive_message");
      socket.off("message_deleted");
    };
  }, [targetUserId]);

  const sendReply = () => {
    if (!text.trim() || !targetUserId) return;
    const admin = JSON.parse(localStorage.getItem("user"));
    const data = {
      room: String(targetUserId),
      text: text,
      senderId: admin.id,
      senderName: "Quản trị viên",
      senderRole: "admin",
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    };
    socket.emit("send_message", data);
    setText("");
  };

  const deleteMsg = async (id) => {
    if (!window.confirm("Xóa tin nhắn này vĩnh viễn?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/messages/delete/${id}`, { headers: { Authorization: token } });
      setMessages(prev => prev.filter(m => String(m.id) !== String(id)));
      socket.emit("delete_message", { room: String(targetUserId), messageId: id });
      toast.success("Đã xóa tin nhắn!");
    } catch (err) { toast.error("Lỗi xóa tin nhắn"); }
  };

  return (
    <div className={`container-fluid p-0 overflow-hidden ${theme === "dark" ? "bg-dark text-light" : "bg-light"}`} 
         style={{ height: "calc(100vh - 72px)" }}> {/* Khóa chiều cao tổng thể tránh tràn xuống footer */}
      <div className="row g-0 h-100">
        
        {/* Sidebar danh sách user */}
        <div className={`col-md-3 d-flex flex-column border-end ${theme === "dark" ? "bg-dark border-secondary" : "bg-white"}`}>
          <div className="p-3 border-bottom shadow-sm">
            <h5 className="fw-bold mb-0">Hội thoại</h5>
          </div>
          <div className="flex-grow-1 overflow-auto chat-scrollbar">
            {users.map(u => (
              <button key={u.id} 
                className={`list-group-item list-group-item-action d-flex align-items-center py-3 px-3 border-0 ${targetUserId === u.id ? "bg-primary-subtle border-start border-4 border-primary" : ""}`} 
                onClick={() => { setTargetUserId(u.id); setTargetUserName(u.name); }}>
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: "40px", height: "40px" }}>{u.name.charAt(0).toUpperCase()}</div>
                <div className="flex-grow-1 overflow-hidden">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className={`text-truncate fw-bold ${targetUserId === u.id ? "text-primary" : ""}`}>{u.name}</span>
                    {u.unread && <div className="status-dot"></div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Vùng chat chính */}
        <div className="col-md-9 d-flex flex-column h-100">
          {targetUserId ? (
            <>
              {/* Chat Header */}
              <div className={`p-3 border-bottom d-flex align-items-center ${theme === "dark" ? "bg-dark border-secondary" : "bg-white shadow-sm"}`}>
                <div className="bg-success rounded-circle me-2" style={{ width: "10px", height: "10px" }}></div>
                <span>Hỗ trợ: <strong className="text-primary">{targetUserName}</strong></span>
              </div>

              {/* Chat Messages - Phần duy nhất được cuộn */}
              <div ref={scrollRef} className="flex-grow-1 overflow-y-auto p-4 chat-scrollbar" 
                   style={{ background: theme === "dark" ? "#1a1a1b" : "#f4f7f6" }}>
                {messages.map((m, i) => {
                  const isAdmin = m.senderRole === "admin";
                  return (
                    <div key={i} className={`mb-4 d-flex chat-bubble-wrapper ${isAdmin ? "justify-content-end" : "justify-content-start"}`}>
                      <div className="d-flex align-items-center gap-2" style={{ flexDirection: isAdmin ? "row-reverse" : "row" }}>
                        <div className={`chat-bubble shadow-sm ${isAdmin ? "chat-bubble-admin" : "chat-bubble-user"}`}>
                          <div className="fw-bold mb-1" style={{ fontSize: "11px", opacity: 0.6 }}>{isAdmin ? "Bạn" : m.senderName}</div>
                          <div style={{ wordBreak: "break-word" }}>{m.text || m.message_text}</div>
                          <div style={{ fontSize: "10px", opacity: 0.5, marginTop: "4px", textAlign: "right" }}>
                            {m.time || new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <span className="delete-action px-2" onClick={() => deleteMsg(m.id)}>🗑️</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input - Cố định ở đáy col-md-9 */}
              <div className={`p-3 border-top ${theme === "dark" ? "bg-dark border-secondary" : "bg-white"}`}>
                <div className="input-group shadow-sm bg-light rounded-pill p-1 border">
                  <input className="form-control border-0 bg-transparent px-4" 
                    placeholder="Nhập nội dung phản hồi..." 
                    value={text} 
                    onChange={(e) => setText(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && sendReply()} 
                  />
                  <button className="btn btn-primary rounded-pill px-4" onClick={sendReply}>GỬI</button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
              <div className="display-4 mb-3">💬</div>
              <h5>Chọn khách hàng để bắt đầu hỗ trợ</h5>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminChat;