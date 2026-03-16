import { useState, useEffect, useContext, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import { Send, Trash2, LogOut, MessageSquare, User, Circle } from "lucide-react";

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
    const handleDelete = (data) => {
      setMessages(prev => prev.filter(m => String(m.id) !== String(data.messageId)));
    };
    socket.on("receive_message", handleReceive);
    socket.on("message_deleted", handleDelete);
    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("message_deleted", handleDelete);
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
      toast.success("Đã xóa tin nhắn!"); // Hiển thị thông báo xóa thành công
    } catch (err) { toast.error("Lỗi xóa tin nhắn"); }
  };

  if (!admin || admin.role !== 'admin') return <div className="p-5 text-center">Truy cập bị từ chối</div>;

  return (
    <div className={`container-fluid p-0 overflow-hidden ${theme === "dark" ? "bg-dark text-light" : "bg-white"}`} style={{ height: "calc(100vh - 72px)" }}>
      <div className="row g-0 h-100">
        {/* Sidebar */}
        <div className={`col-md-3 d-flex flex-column border-end ${theme === "dark" ? "bg-dark border-secondary" : "bg-light border-light-subtle"}`}>
          <div className="p-4 border-bottom d-flex align-items-center gap-2">
            <MessageSquare className="text-primary" size={24} />
            <h5 className="fw-bold mb-0">Hội thoại</h5>
          </div>
          <div className="flex-grow-1 overflow-auto custom-scrollbar p-2">
            {users.map(u => (
              <div key={u.id} className={`p-3 d-flex align-items-center cursor-pointer rounded-4 mb-2 transition-all ${targetUserId === u.id ? "btn-auth-gradient text-white shadow" : (theme === "dark" ? "hover-dark" : "bg-white border hover-light")}`} onClick={() => { setTargetUserId(u.id); setTargetUserName(u.name); }}>
                <div className="position-relative">
                  <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${targetUserId === u.id ? "bg-white text-primary" : "bg-primary text-white"}`} style={{ width: "48px", height: "48px" }}>{u.name.charAt(0).toUpperCase()}</div>
                  {u.unread && <span className="position-absolute top-0 start-100 translate-middle p-2 bg-danger border border-2 border-white rounded-circle"></span>}
                </div>
                <div className="ms-3 flex-grow-1 overflow-hidden">
                  <h6 className="mb-0 text-truncate fw-bold">{u.name}</h6>
                  <small className={targetUserId === u.id ? "text-white-50" : "text-muted"}>Sẵn sàng hỗ trợ...</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="col-md-9 d-flex flex-column h-100 shadow-sm" style={{ backgroundColor: theme === 'dark' ? '#1a1d21' : '#f8faff' }}>
          {targetUserId ? (
            <>
              <div className={`p-3 border-bottom d-flex align-items-center justify-content-between ${theme === "dark" ? "bg-dark border-secondary" : "bg-white shadow-sm"}`}>
                <div className="d-flex align-items-center gap-3 ps-2">
                  <div className="position-relative"><User size={28} className="text-primary" /><Circle size={10} fill="#22c55e" className="text-success position-absolute bottom-0 end-0" /></div>
                  <div><h6 className="mb-0 fw-bold">{targetUserName}</h6><small className="text-muted">Đang trực tuyến</small></div>
                </div>
                <button className="btn btn-outline-danger btn-sm rounded-pill px-4 border-0 d-flex align-items-center gap-2" onClick={() => setTargetUserId(null)}><LogOut size={16} /> Thoát</button>
              </div>

              <div ref={scrollRef} className="flex-grow-1 overflow-y-auto p-4 custom-scrollbar">
                {messages.map((m, i) => {
                  const isAdminMsg = m.senderRole === "admin" || String(m.senderId) === String(admin.id);
                  return (
                    <div key={i} className={`d-flex flex-column mb-4 chat-msg-item ${isAdminMsg ? "align-items-end" : "align-items-start"}`}>
                      <small className="mb-1 px-2 fw-bold opacity-75 text-uppercase" style={{ fontSize: '10px' }}>{isAdminMsg ? "Quản trị viên" : "Khách hàng"}</small>
                      <div className={`d-flex align-items-center gap-2 ${isAdminMsg ? "flex-row-reverse" : "flex-row"}`}>
                        <div className={`p-3 shadow-sm rounded-4 ${isAdminMsg ? "btn-auth-gradient text-white rounded-bottom-right-0" : (theme === "dark" ? "bg-secondary text-light rounded-bottom-left-0" : "bg-white text-dark border rounded-bottom-left-0")}`} style={{ maxWidth: "550px" }}>
                          <div className="fs-6" style={{ wordBreak: "break-word" }}>{m.text || m.message_text}</div>
                        </div>
                        {/* Nút xóa sẽ ẩn theo CSS của chat-msg-item:hover */}
                        <button onClick={() => deleteMsg(m.id)} className={`btn-admin-delete-msg border-0 bg-transparent p-1 transition-all ${theme === 'dark' ? 'text-light opacity-50' : 'text-muted'}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <small className="mt-1 opacity-50 px-2" style={{ fontSize: "10px" }}>{formatTime(m.time || m.created_at)}</small>
                    </div>
                  );
                })}
              </div>

              <div className={`p-4 border-top ${theme === "dark" ? "bg-dark border-secondary" : "bg-white shadow-lg-top"}`}>
                <div className={`d-flex align-items-center rounded-pill p-2 border ${theme === "dark" ? "bg-secondary border-secondary" : "bg-light border-light-subtle"}`}>
                  <input className={`form-control border-0 bg-transparent px-4 shadow-none ${theme === "dark" ? "text-light" : "text-dark"}`} placeholder="Nhập phản hồi..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendReply()} />
                  <button className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center p-0" onClick={sendReply} style={{ width: '45px', height: '45px', background: 'linear-gradient(135deg, #21d4fd 0%, #b721ff 100%)', border: 'none' }}><Send size={20} color="white" /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center opacity-50"><div className="display-1 mb-4">💬</div><h4 className="fw-bold">Trung tâm hỗ trợ MyShop</h4><p>Chọn một hội thoại để bắt đầu</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminChat;