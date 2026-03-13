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

  // LOGIC GIỮ NGUYÊN
  const formatTime = (dateInput) => {
    if (!dateInput) return "";
    if (typeof dateInput === 'string' && (dateInput.includes('AM') || dateInput.includes('PM'))) return dateInput;
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

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
      if (String(targetUserId) === String(data.room)) setMessages(prev => [...prev, data]);
      else setUsers(prev => prev.map(u => String(u.id) === String(data.room) ? { ...u, unread: true } : u));
    });

    socket.on("message_deleted", (data) => {
      setMessages(prev => prev.filter(m => String(m.id) !== String(data.messageId)));
    });

    return () => { socket.off("receive_message"); socket.off("message_deleted"); };
  }, [targetUserId]);

  const sendReply = () => {
    if (!text.trim() || !targetUserId) return;
    const admin = JSON.parse(localStorage.getItem("user"));
    const data = {
      room: String(targetUserId),
      text: text,
      senderId: admin.id,
      senderName: "Admin",
      senderRole: "admin",
      time: formatTime(new Date()) 
    };
    socket.emit("send_message", data);
    setText("");
  };

  const deleteMsg = async (id) => {
    if (!window.confirm("Xóa tin nhắn này?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/messages/delete/${id}`, { headers: { Authorization: token } });
      setMessages(prev => prev.filter(m => String(m.id) !== String(id)));
      socket.emit("delete_message", { room: String(targetUserId), messageId: id });
    } catch (err) { toast.error("Lỗi xóa tin nhắn"); }
  };

  // --- PHẦN THAY ĐỔI GIAO DIỆN ---
  return (
    <div className={`container-fluid p-0 overflow-hidden ${theme === "dark" ? "bg-dark text-light" : "bg-light"}`} 
         style={{ height: "calc(100vh - 72px)" }}>
      <div className="row g-0 h-100">
        
        {/* Sidebar */}
        <div className={`col-md-3 d-flex flex-column border-end ${theme === "dark" ? "bg-dark border-secondary" : "bg-white border-light"}`}>
          <div className="p-4 border-bottom">
            <h5 className="fw-bold mb-0 d-flex align-items-center">
              <span className="text-primary me-2">●</span> Hội thoại
            </h5>
          </div>
          
          <div className="flex-grow-1 overflow-auto chat-scrollbar">
            {users.length > 0 ? users.map(u => (
              <div key={u.id} 
                className={`p-3 d-flex align-items-center cursor-pointer transition-all mx-2 my-1 rounded-3 ${
                  targetUserId === u.id 
                  ? (theme === "dark" ? "bg-primary text-white" : "bg-primary-subtle border-start border-primary border-4") 
                  : (theme === "dark" ? "hover-dark" : "hover-light")
                }`} 
                onClick={() => { setTargetUserId(u.id); setTargetUserName(u.name); }}
                style={{ cursor: "pointer" }}>
                
                <div className="position-relative">
                  <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm ${targetUserId === u.id ? "bg-white text-primary" : "bg-primary text-white"}`} 
                       style={{ width: "45px", height: "45px", fontSize: "1.2rem" }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  {u.unread && (
                    <span className="position-absolute top-0 start-100 translate-middle p-2 bg-danger border border-light rounded-circle"></span>
                  )}
                </div>

                <div className="ms-3 flex-grow-1 overflow-hidden">
                  <div className="d-flex justify-content-between">
                    <h6 className={`mb-0 text-truncate fw-bold ${targetUserId === u.id && theme !== "dark" ? "text-primary" : ""}`}>
                      {u.name}
                    </h6>
                  </div>
                  <small className={`text-truncate d-block opacity-75 ${targetUserId === u.id ? "" : "text-muted"}`}>
                    Sẵn sàng hỗ trợ...
                  </small>
                </div>
              </div>
            )) : <div className="p-4 text-center text-muted">Chưa có người dùng</div>}
          </div>
        </div>

        {/* Chat Area */}
        <div className="col-md-9 d-flex flex-column h-100">
          {targetUserId ? (
            <>
              {/* Chat Header */}
              <div className={`p-3 border-bottom d-flex align-items-center justify-content-between ${theme === "dark" ? "bg-dark border-secondary" : "bg-white shadow-sm"}`}>
                <div className="d-flex align-items-center">
                  <div className="bg-success rounded-circle me-2 pulse-animation" style={{ width: "10px", height: "10px" }}></div>
                  <span className="opacity-75">Đang trò chuyện với: </span>
                  <strong className="text-primary ms-2 fs-5">{targetUserName}</strong>
                </div>
                <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={() => setTargetUserId(null)}>Đóng chat</button>
              </div>

              {/* Messages Body */}
              <div ref={scrollRef} className="flex-grow-1 overflow-y-auto p-4 chat-scrollbar" 
                   style={{ background: theme === "dark" ? "#121212" : "#f8f9fa" }}>
                {messages.map((m, i) => {
                  const isAdmin = m.senderRole === "admin";
                  const displayTime = formatTime(m.time || m.created_at);

                  return (
                    <div key={i} className={`mb-3 d-flex ${isAdmin ? "justify-content-end" : "justify-content-start"}`}>
                      <div className={`position-relative d-flex align-items-end ${isAdmin ? "flex-row-reverse" : ""}`}>
                        
                        {/* Avatar nhỏ cho user */}
                        {!isAdmin && (
                          <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-2 mb-2" 
                               style={{ width: "28px", height: "28px", fontSize: "10px" }}>{targetUserName.charAt(0)}</div>
                        )}

                        <div className="message-container">
                          <div className={`p-3 shadow-sm transition-all bubble-hover ${
                              isAdmin 
                              ? "bg-primary text-white rounded-4 rounded-bottom-right-0" 
                              : (theme === "dark" ? "bg-secondary text-light rounded-4 rounded-bottom-left-0" : "bg-white text-dark border rounded-4 rounded-bottom-left-0")
                            }`}
                            style={{ maxWidth: "500px" }}>
                            <div className="fw-bold mb-1 d-flex justify-content-between align-items-center" style={{ fontSize: "11px", opacity: 0.7 }}>
                              <span>{isAdmin ? "QUẢN TRỊ VIÊN" : "KHÁCH HÀNG"}</span>
                              {isAdmin && (
                                <i className="bi bi-trash cursor-pointer ms-3 hover-text-danger" 
                                   onClick={() => deleteMsg(m.id)} 
                                   style={{ fontSize: "12px", cursor: "pointer" }}>🗑️</i>
                              )}
                            </div>
                            <div className="fs-6" style={{ wordBreak: "break-word", lineHeight: "1.5" }}>{m.text || m.message_text}</div>
                          </div>
                          <div className={`mt-1 opacity-50 ${isAdmin ? "text-end" : "text-start"}`} style={{ fontSize: "10px" }}>{displayTime}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input Footer */}
              <div className={`p-4 border-top ${theme === "dark" ? "bg-dark border-secondary" : "bg-white"}`}>
                <div className={`d-flex align-items-center rounded-pill p-2 ${theme === "dark" ? "bg-secondary" : "bg-light border shadow-sm"}`}>
                  <input className={`form-control border-0 bg-transparent px-4 shadow-none ${theme === "dark" ? "text-light" : "text-dark"}`} 
                    placeholder="Nhập nội dung phản hồi cho khách hàng..." 
                    value={text} onChange={(e) => setText(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && sendReply()} 
                  />
                  <button className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm" onClick={sendReply}>
                    GỬI <i className="bi bi-send-fill ms-1"></i>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={`h-100 d-flex flex-column align-items-center justify-content-center ${theme === 'dark' ? 'opacity-25' : 'opacity-50'}`}>
              <div className="display-1 mb-4">💬</div>
              <h4 className="fw-bold">Hệ thống hỗ trợ trực tuyến</h4>
              <p>Chọn một hội thoại bên trái để bắt đầu trả lời khách hàng</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminChat;