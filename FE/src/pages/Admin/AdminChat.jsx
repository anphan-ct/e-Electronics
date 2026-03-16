import { useState, useEffect, useContext, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import { Send, Trash2, LogOut, MessageSquare, User, Circle, Bot } from "lucide-react";

const socket = io("http://localhost:5000", { transports: ["websocket"] });

function AdminChat() {
  const { theme } = useContext(ThemeContext);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [targetUserId, setTargetUserId] = useState(null);
  const [targetUserName, setTargetUserName] = useState("");
  const scrollRef = useRef(null);

  const admin = JSON.parse(localStorage.getItem("user"));

  // --- GIỮ NGUYÊN LOGIC CŨ ---
  const formatTime = (dateInput) => {
    if (!dateInput) return "";
    if (typeof dateInput === 'string' && (dateInput.includes('AM') || dateInput.includes('PM'))) return dateInput;
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/auth/users", { headers: { Authorization: `Bearer ${token}` } });
        setUsers(res.data.map(u => ({ ...u, unread: false })));
      } catch (err) { console.error("Lỗi lấy user", err); }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!targetUserId) return;
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`http://localhost:5000/api/messages/history/${targetUserId}`, { headers: { Authorization: `Bearer ${token}` } });
        setMessages(res.data);
      } catch (err) { toast.error("Không thể tải lịch sử chat"); }
    };
    fetchHistory();
    socket.emit("join_room", String(targetUserId));
    setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, unread: false } : u));
  }, [targetUserId]);

  useEffect(() => {
    const handleReceive = (data) => {
      if (String(targetUserId) === String(data.room)) { setMessages(prev => [...prev, data]); }
      else setUsers(prev => prev.map(u => String(u.id) === String(data.room) ? { ...u, unread: true } : u));
    };

    const handleAIMessage = (data) => {
      if (String(targetUserId) === String(data.userId)) {
        setMessages(prev => [...prev, { id: data.id, senderId: data.sender === "user" ? data.userId : 0, senderRole: data.sender === "user" ? "user" : "ai", text: data.text, time: new Date() }]);
      } else {
        setUsers(prev => prev.map(u => String(u.id) === String(data.userId) ? { ...u, unread: true } : u));
      }
    };

    const handleDelete = (data) => { setMessages(prev => prev.filter(m => String(m.id) !== String(data.messageId))); };
    socket.on("receive_message", handleReceive);
    socket.on("message_deleted", handleDelete);
    socket.on("ai_message", handleAIMessage);
    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("message_deleted", handleDelete);
      socket.off("ai_message", handleAIMessage);
    };
  }, [targetUserId]);

  const sendReply = () => {
    if (!text.trim() || !targetUserId) return;
    const data = { room: String(targetUserId), text: text, senderId: admin.id, senderName: "Admin", senderRole: "admin", time: new Date() };
    socket.emit("send_message", data);
    setText("");
  };

  const deleteMsg = async (id) => {
    if (!window.confirm("Xóa tin nhắn này?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:5000/api/messages/delete/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(prev => prev.filter(m => String(m.id) !== String(id)));
      socket.emit("delete_message", { room: String(targetUserId), messageId: id });
      toast.success("Đã xóa tin nhắn!");
    } catch (err) { toast.error("Lỗi xóa tin nhắn"); }
  };

  if (!admin || admin.role !== 'admin') return <div className="p-5 text-center">Truy cập bị từ chối</div>;

  // --- GIAO DIỆN MỚI ---
  return (
    <div className={`container-fluid p-0 overflow-hidden ${theme === "dark" ? "bg-dark text-light" : "bg-white"}`} style={{ height: "calc(100vh - 72px)" }}>
      <div className="row g-0 h-100">
        
        {/* Sidebar: Danh sách hội thoại */}
        <div className={`col-md-3 d-flex flex-column border-end ${theme === "dark" ? "bg-dark border-secondary" : "bg-light border-light-subtle shadow-sm"}`} style={{ zIndex: 10 }}>
          <div className="p-4 border-bottom d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2">
              <MessageSquare className="text-primary" size={22} />
              <h5 className="fw-bold mb-0" style={{ letterSpacing: '0.5px' }}>Hội thoại</h5>
            </div>
            <span className="badge rounded-pill bg-primary-subtle text-primary px-3 py-2">{users.length} khách</span>
          </div>
          
          <div className="flex-grow-1 overflow-auto custom-scrollbar p-3">
            {users.map(u => (
              <div 
                key={u.id} 
                className={`p-3 d-flex align-items-center cursor-pointer rounded-4 mb-3 transition-all ${targetUserId === u.id ? "btn-auth-gradient text-white shadow-lg scale-up" : (theme === "dark" ? "hover-dark border border-secondary" : "bg-white border hover-light shadow-sm")}`} 
                onClick={() => { setTargetUserId(u.id); setTargetUserName(u.name); }}
                style={{ position: 'relative' }}
              >
                <div className="position-relative">
                  <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm ${targetUserId === u.id ? "bg-white text-primary" : "bg-primary text-white"}`} style={{ width: "52px", height: "52px", fontSize: '1.2rem' }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  {u.unread && <span className="position-absolute top-0 start-100 translate-middle p-2 bg-danger border border-2 border-white rounded-circle unread-pulse"></span>}
                </div>
                <div className="ms-3 flex-grow-1 overflow-hidden">
                  <h6 className="mb-1 text-truncate fw-bold">{u.name}</h6>
                  <small className={targetUserId === u.id ? "text-white-50" : "text-muted"}>
                    {u.unread ? "Tin nhắn mới đang chờ..." : "Sẵn sàng hỗ trợ"}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Khu vực Chat Area */}
        <div className="col-md-9 d-flex flex-column h-100 position-relative" style={{ backgroundColor: theme === 'dark' ? '#14171a' : '#f0f2f5' }}>
          {targetUserId ? (
            <>
              {/* Header của Chat */}
              <div className={`p-3 border-bottom d-flex align-items-center justify-content-between shadow-sm ${theme === "dark" ? "bg-dark border-secondary" : "bg-white"}`}>
                <div className="d-flex align-items-center gap-3 ps-2">
                  <div className="position-relative">
                    <div className="bg-primary-subtle p-2 rounded-circle"><User size={26} className="text-primary" /></div>
                    <Circle size={12} fill="#22c55e" className="text-success position-absolute bottom-0 end-0 border border-2 border-white rounded-circle" />
                  </div>
                  <div>
                    <h6 className="mb-0 fw-bold">{targetUserName}</h6>
                    <small className="text-success fw-medium">Đang trực tuyến</small>
                  </div>
                </div>
                <button className="btn btn-outline-danger btn-sm rounded-pill px-4 border-0 hover-lift d-flex align-items-center gap-2" onClick={() => setTargetUserId(null)}>
                  <LogOut size={16} /> Thoát
                </button>
              </div>

              {/* Vùng hiển thị tin nhắn */}
              <div ref={scrollRef} className="flex-grow-1 overflow-y-auto p-4 custom-scrollbar d-flex flex-column gap-2">
                {messages.map((m, i) => {
                  const isAI = m.senderRole === 'ai' || String(m.senderId) === "0";
                  const isAdmin = m.senderRole === 'admin' || String(m.senderId) === String(admin.id);
                  const isCustomer = !isAI && !isAdmin;
                  
                  return (
                    <div key={i} className={`d-flex flex-column mb-3 chat-msg-item ${isAdmin ? "align-items-end" : "align-items-start"}`}>
                      <div className="d-flex align-items-center gap-2 mb-1 px-2">
                        {isAI && <Bot size={14} className="text-info" />}
                        <small className="fw-bold opacity-75 text-uppercase" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>
                          {isAI ? "Trợ lý AI" : (isAdmin ? "Bạn" : targetUserName)}
                        </small>
                      </div>

                      <div className={`d-flex align-items-center gap-2 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`p-3 shadow-sm transition-all ${
                            isAI ? (theme === 'dark' ? "bg-dark text-info border-info" : "bg-light text-secondary border-info") + " border-dashed" : 
                            isAdmin ? "btn-auth-gradient text-white shadow-blue rounded-bottom-right-0" : 
                            (theme === 'dark' ? "bg-secondary text-light" : "bg-white text-dark border") + " rounded-bottom-left-0"
                          }`} 
                          style={{ maxWidth: "70%", borderRadius: '20px', borderStyle: isAI ? 'dashed' : 'solid', borderWidth: '1px' }}>
                          <div className="fs-6" style={{ wordBreak: "break-word", lineHeight: '1.5' }}>{m.text || m.message_text}</div>
                        </div>

                        <button onClick={() => deleteMsg(m.id)} className="btn-admin-delete-msg border-0 bg-transparent p-2 text-danger opacity-0 transition-all hover-scale">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <small className="mt-1 opacity-50 px-2" style={{ fontSize: "10px" }}>{formatTime(m.time || m.created_at)}</small>
                    </div>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className={`p-4 border-top ${theme === "dark" ? "bg-dark border-secondary" : "bg-white shadow-lg-top"}`}>
                <div className={`d-flex align-items-center rounded-pill p-2 border transition-all ${theme === "dark" ? "bg-secondary border-secondary focus-within-primary" : "bg-light border-light-subtle focus-within-shadow"}`}>
                  <input 
                    className={`form-control border-0 bg-transparent px-4 shadow-none ${theme === "dark" ? "text-light" : "text-dark"}`} 
                    placeholder="Viết phản hồi tới khách hàng..." 
                    value={text} 
                    onChange={(e) => setText(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && sendReply()} 
                  />
                  <button className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center p-0 hover-rotate" onClick={sendReply} style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #21d4fd 0%, #b721ff 100%)', border: 'none' }}>
                    <Send size={22} color="white" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Trạng thái trống */
            <div className="h-100 d-flex flex-column align-items-center justify-content-center opacity-75">
              <div className="bg-white p-5 rounded-circle shadow-sm mb-4 animate-bounce">
                <MessageSquare size={80} className="text-primary" />
              </div>
              <h4 className="fw-bold">Trung tâm hỗ trợ MyShop</h4>
              <p className="text-muted">Chọn một khách hàng từ danh sách bên trái để bắt đầu hỗ trợ</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminChat;