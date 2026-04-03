import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { LoadingSpinner, StatusBadge } from "../../layouts/AdminUI";
import {
  ArrowLeft, Crown, Lock, Mail, Calendar, ShoppingBag, TrendingUp,
  Unlock, KeyRound, Trash2
} from "lucide-react";
import { UserAvatar, ConfirmModal, fmtDate, fmtMoney } from "./Users";

const API  = "http://localhost:5000/api/dashboard";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

function ActionBtn({ color, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "12px", borderRadius: "10px", cursor: "pointer",
      fontSize: "13px", fontWeight: "700", border: `1px solid ${color}33`,
      background: `${color}12`, color: color, width: "100%",
      transition: "all 0.2s"
    }}>
      {children}
    </button>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const fetchUserDetail = async () => {
    setLoading(true);
    try {
      const [resUser, resOrders] = await Promise.all([
        axios.get(`${API}/users/${id}`, { headers: auth() }),
        axios.get(`${API}/users/${id}/orders`, { headers: auth() })
      ]);
      setUser(resUser.data);
      setOrders(resOrders.data);
    } catch {
      toast.error("Không thể tải thông tin người dùng");
      navigate("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, [id]);

  const handleAction = (type) => setConfirm({ type, user });

  const executeAction = async (inputValue) => {
    const { type, user } = confirm;
    setConfirm(null);
    try {
      if (type === "delete") {
        await axios.delete(`${API}/users/${user.id}`, { headers: auth() });
        toast.success("Đã xóa người dùng");
        navigate("/admin/users");
        return;
      } else if (type === "role") {
        const newRole = user.role === "admin" ? "user" : "admin";
        await axios.put(`${API}/users/${user.id}/role`, { role: newRole }, { headers: auth() });
        toast.success(`Đã chuyển thành ${newRole}`);
      } else if (type === "resetPw") {
        if (!inputValue || inputValue.length < 6) {
          toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
          return;
        }
        await axios.put(`${API}/users/${user.id}/reset-password`, { newPassword: inputValue }, { headers: auth() });
        toast.success("Đã đặt lại mật khẩu mới");
      } else if (type === "unlock") {
        await axios.put(`${API}/users/${user.id}/unlock`, {}, { headers: auth() });
        toast.success("Đã mở khóa tài khoản");
      } else if (type === "lock") {
        await axios.put(`${API}/users/${user.id}/lock`, {}, { headers: auth() });
        toast.success("Đã khóa tài khoản");
      }
      fetchUserDetail(); 
    } catch (e) {
      toast.error(e.response?.data?.message || "Thao tác thất bại");
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!user) return null;

  const isLocked = user.status === 'locked' || (user.locked_until && new Date(user.locked_until) > new Date());

  const confirmConfig = {
    delete:  { title: "Xóa người dùng", confirmLabel: "Xóa", confirmColor: "#ef4444", msg: `Xóa "${user.name}"?` },
    role:    { title: "Đổi quyền", confirmLabel: "Xác nhận", confirmColor: "#6366f1", msg: user.role === "admin" ? `Hạ "${user.name}"?` : `Nâng "${user.name}" lên Admin?` },
    resetPw: { title: "Cấp lại mật khẩu", confirmLabel: "Cập nhật", confirmColor: "#3b82f6", msg: `Nhập mật khẩu mới cho tài khoản "${user.name}":`, requireInput: true, inputType: "password", inputPlaceholder: "Ví dụ: 123456" },
    unlock:  { title: "Mở khóa", confirmLabel: "Mở khóa", confirmColor: "#10b981", msg: `Mở khóa "${user.name}"?` },
    lock:    { title: "Khóa tài khoản", confirmLabel: "Khóa", confirmColor: "#ef4444", msg: `Khóa tài khoản "${user.name}"? Người dùng sẽ không thể đăng nhập.` },
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button onClick={() => navigate("/admin/users")} className="adm-filter-btn" style={{ padding: "8px 12px" }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "700", margin: 0, color: "var(--text)" }}>Chi tiết người dùng</h2>
          <span style={{ color: "var(--text2)", fontSize: "13px" }}>ID: {user.id}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", alignItems: "start" }}>
        
        {/* Cột trái: Thông tin cá nhân & Hành động */}
        <div className="adm-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "24px" }}>
            <UserAvatar user={user} size={72} />
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "18px", fontWeight: "800", color: "var(--text)" }}>
                {user.name} {user.role === "admin" && <Crown size={15} color="#f59e0b" style={{marginLeft: 4}}/>}
              </h3>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <StatusBadge status={user.role} />
                
                {isLocked && (
                  user.status === 'locked' ? (
                    <span className="user-status-locked"><Lock size={10} /> Khóa bởi Admin</span>
                  ) : (
                    <span className="user-status-locked" title="Nhập sai mật khẩu nhiều lần"><Lock size={10} /> Tạm khóa</span>
                  )
                )}
                {user.login_type === "google" && <span className="adm-tag-google-sm">Google</span>}
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px" }}>
             {[
                { Icon: Mail,        label: "Email",      val: user.email },
                { Icon: Calendar,    label: "Tham gia",   val: fmtDate(user.created_at) },
                { Icon: ShoppingBag, label: "Đơn hàng",   val: `${user.total_orders || 0} đơn` },
                { Icon: TrendingUp,  label: "Chi tiêu",   val: fmtMoney(user.total_spent) },
              ].map(({ Icon, label, val }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--card2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color="var(--text2)" />
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text2)", fontWeight: "600", textTransform: "uppercase" }}>{label}</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text)" }}>{val}</div>
                  </div>
                </div>
              ))}
          </div>

          {isLocked && (
            <div className="user-drawer-locked-alert" style={{ marginBottom: "20px" }}>
              {user.status === 'locked' ? (
                <div className="user-drawer-locked-text">Tài khoản đang bị khóa thủ công bởi Quản trị viên</div>
              ) : (
                <>
                  <div className="user-drawer-locked-text">Khóa đến: {new Date(user.locked_until).toLocaleString("vi-VN")}</div>
                  <div className="user-drawer-locked-sub">Sai mật khẩu: {user.login_attempts} lần</div>
                </>
              )}
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "20px", marginTop: "8px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {isLocked ? (
                <ActionBtn color="#10b981" onClick={() => handleAction("unlock")}><Unlock size={16} /> Mở khóa</ActionBtn>
              ) : (
                <ActionBtn color="#ef4444" onClick={() => handleAction("lock")}><Lock size={16} /> Khóa TK</ActionBtn>
              )}

              <ActionBtn color={user.role === "admin" ? "#f59e0b" : "#f59e0b"} onClick={() => handleAction("role")}>
                <Crown size={16} /> {user.role === "admin" ? "Hạ User" : "Lên Admin"}
              </ActionBtn>
              <ActionBtn color="#3b82f6" onClick={() => handleAction("resetPw")}><KeyRound size={16} /> Cấp lại MK</ActionBtn>
              <ActionBtn color="#ef4444" onClick={() => handleAction("delete")}><Trash2 size={16} /> Xóa User</ActionBtn>
            </div>
          </div>
        </div>

        {/* Cột phải: Lịch sử đơn hàng */}
        <div className="adm-card" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: "16px", fontWeight: "700", color: "var(--text)" }}>
            Lịch sử mua hàng ({orders.length})
          </h3>
          
          {orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text2)" }}>Người dùng chưa có đơn hàng nào.</div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Mã ĐH</th>
                    <th>Ngày mua</th>
                    <th>Trạng thái</th>
                    <th>Thanh toán</th>
                    <th>Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td><span style={{ fontWeight: "700", color: "var(--accent)" }}>#{o.id}</span></td>
                      <td className="adm-cell-date">{fmtDate(o.created_at)}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td><StatusBadge status={o.payment_status} /></td>
                      <td><span className="adm-cell-price">{fmtMoney(o.total)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── HIỂN THỊ MODAL VỚI THUỘC TÍNH MỚI ────────────────── */}
      {confirm && (() => {
        const cfg = confirmConfig[confirm.type];
        return (
          <ConfirmModal 
            open 
            title={cfg.title} 
            message={cfg.msg} 
            confirmLabel={cfg.confirmLabel} 
            confirmColor={cfg.confirmColor} 
            requireInput={cfg.requireInput}
            inputType={cfg.inputType}
            inputPlaceholder={cfg.inputPlaceholder}
            onConfirm={executeAction} 
            onCancel={() => setConfirm(null)} 
          />
        )
      })()}
    </div>
  );
}