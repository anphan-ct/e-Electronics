import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LoadingSpinner, StatusBadge } from "../../layouts/AdminUI";
import {
  Users, Search, Filter, Crown, UserCheck, Trash2,
  KeyRound, Unlock, Eye, X, ChevronDown, Lock,
  AlertCircle, RefreshCw,
} from "lucide-react";

const API  = "http://localhost:5000/api/dashboard";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("vi-VN") : "—";
export const fmtMoney = (n) => `$${parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;

const AVATAR_COLORS = [
  ["#6366f1","#8b5cf6"], ["#10b981","#059669"], ["#f59e0b","#d97706"],
  ["#ef4444","#dc2626"], ["#3b82f6","#2563eb"], ["#ec4899","#db2777"],
];
export const avatarColor = (id) => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];

export function UserAvatar({ user, size = 44 }) {
  const [c1, c2] = avatarColor(user?.id);
  if (user?.avatar && user?.login_type === "google") {
    return (
      <img src={user.avatar} alt={user.name} className="adm-avatar-img"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="adm-avatar-text" style={{
      width: size, height: size, fontSize: size * 0.4,
      background: `linear-gradient(135deg, ${c1}, ${c2})`,
    }}>
      {user?.name?.charAt(0).toUpperCase()}
    </div>
  );
}

// ── CẬP NHẬT CONFIRM MODAL (Thêm tính năng Input) ──────────────────
export function ConfirmModal({ 
  open, title, message, confirmLabel = "Xác nhận", confirmColor = "#ef4444", 
  requireInput = false, inputType = "text", inputPlaceholder = "",
  onConfirm, onCancel 
}) {
  const [inputValue, setInputValue] = useState("");

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm(inputValue);
  };

  return (
    <div className="adm-confirm-overlay">
      <div className="adm-confirm-modal">
        <div className="adm-confirm-header">
          <AlertCircle size={22} color={confirmColor} />
          <h3 className="adm-confirm-title">{title}</h3>
        </div>
        <p className="adm-confirm-msg">{message}</p>
        
        {/* Render thẻ Input nếu requireInput = true */}
        {requireInput && (
          <input
            type={inputType}
            placeholder={inputPlaceholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
            style={{
              width: "100%", marginBottom: "20px", padding: "12px",
              borderRadius: "8px", border: "1px solid var(--border)",
              background: "var(--card2)", color: "var(--text)", 
              outline: "none", fontSize: "14px", fontFamily: "inherit"
            }}
          />
        )}

        <div className="adm-confirm-actions">
          <button className="adm-btn-cancel" onClick={onCancel}>Hủy</button>
          <button 
            className="adm-btn-confirm" 
            onClick={handleConfirm} 
            disabled={requireInput && !inputValue.trim()}
            style={{ 
              background: confirmColor, 
              opacity: requireInput && !inputValue.trim() ? 0.6 : 1 
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionIconBtn({ children, onClick, color, title }) {
  const [hover, setHover] = useState(false);
  return (
    <button className="adm-action-icon-btn" onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderColor: `${color}33`,
        background: hover ? `${color}22` : `${color}11`,
        color: color,
      }}>
      {children}
    </button>
  );
}

export default function UsersPage() {
  const { searchQuery = "" } = useOutletContext() || {};
  const navigate = useNavigate();

  const [users,       setUsers]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [roleFilter,  setRoleFilter]  = useState("all");
  const [sortBy,      setSortBy]      = useState("created_desc");
  const [localSearch, setLocalSearch] = useState("");

  const [confirm, setConfirm] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/users`, { headers: auth() });
      setUsers(res.data);
    } catch { toast.error("Không thể tải danh sách người dùng"); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleViewDetail = (id) => {
    navigate(`/admin/users/${id}`);
  };

  const handleAction = (type, user) => {
    setConfirm({ type, user });
  };

  // ── CẬP NHẬT HÀM THỰC THI (Nhận inputValue) ──────────────────
  const executeAction = async (inputValue) => {
    const { type, user } = confirm;
    setConfirm(null);
    try {
      if (type === "delete") {
        await axios.delete(`${API}/users/${user.id}`, { headers: auth() });
        toast.success(`Đã xóa user ${user.name}`);
      } else if (type === "role") {
        const newRole = user.role === "admin" ? "user" : "admin";
        await axios.put(`${API}/users/${user.id}/role`, { role: newRole }, { headers: auth() });
        toast.success(`Đã chuyển ${user.name} thành ${newRole}`);
      } else if (type === "resetPw") {
        if (!inputValue || inputValue.length < 6) {
          toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
          return;
        }
        await axios.put(`${API}/users/${user.id}/reset-password`, { newPassword: inputValue }, { headers: auth() });
        toast.success(`Đã đặt lại mật khẩu cho ${user.name}`);
      } else if (type === "unlock") {
        await axios.put(`${API}/users/${user.id}/unlock`, {}, { headers: auth() });
        toast.success(`Đã mở khóa ${user.name}`);
      } else if (type === "lock") { // <-- XỬ LÝ KHÓA
        await axios.put(`${API}/users/${user.id}/lock`, {}, { headers: auth() });
        toast.success(`Đã khóa tài khoản ${user.name}`);
      }
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || "Thao tác thất bại");
    }
  };

  // ── THÊM CẤU HÌNH INPUT VÀO CONFIRM MODAL ──────────────────
  const confirmConfig = {
    delete:  { title: "Xóa người dùng", confirmLabel: "Xóa", confirmColor: "#ef4444",
               message: (u) => `Bạn có chắc muốn xóa "${u?.name}"? Hành động này không thể hoàn tác.` },
    role:    { title: "Thay đổi quyền", confirmLabel: "Xác nhận", confirmColor: "#6366f1",
               message: (u) => u?.role === "admin" ? `Hạ "${u.name}" xuống User?` : `Nâng "${u.name}" lên Admin?` },
    resetPw: { title: "Cấp lại mật khẩu", confirmLabel: "Cập nhật", confirmColor: "#3b82f6",
               message: (u) => `Nhập mật khẩu mới cho tài khoản "${u?.name}":`,
               requireInput: true, inputType: "password", inputPlaceholder: "Ví dụ: 123456" },
    unlock:  { title: "Mở khóa tài khoản", confirmLabel: "Mở khóa", confirmColor: "#10b981",
               message: (u) => `Mở khóa tài khoản "${u?.name}"?` },
    lock:    { title: "Khóa tài khoản", confirmLabel: "Khóa", confirmColor: "#ef4444", message: (u) => `Bạn có chắc muốn khóa tài khoản "${u?.name}"? Người dùng sẽ không thể đăng nhập.` },
  };

  const query = (localSearch || searchQuery).toLowerCase();

  const SORT_OPTIONS = [
    { val: "created_desc", label: "Mới nhất" },
    { val: "created_asc",  label: "Cũ nhất" },
    { val: "name_asc",     label: "Tên A-Z" },
    { val: "spent_desc",   label: "Chi tiêu cao" },
    { val: "orders_desc",  label: "Nhiều đơn" },
  ];

  const filtered = (users || [])
    .filter(u => {
      const matchSearch = !query ||
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    })
    .sort((a, b) => {
      if (sortBy === "created_desc") return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === "created_asc")  return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === "name_asc")     return a.name.localeCompare(b.name);
      if (sortBy === "spent_desc")   return parseFloat(b.total_spent) - parseFloat(a.total_spent);
      if (sortBy === "orders_desc")  return (b.total_orders || 0) - (a.total_orders || 0);
      return 0;
    });

  const totalUsers  = (users || []).filter(u => u.role === "user").length;
  const totalAdmins = (users || []).filter(u => u.role === "admin").length;
  const lockedCount = (users || []).filter(u => u.status === 'locked' || (u.locked_until && new Date(u.locked_until) > new Date())).length;
  const googleCount = (users || []).filter(u => u.login_type === "google").length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="adm-tab-header" style={{ marginBottom: 20 }}>
        <div>
          <h2 className="adm-tab-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={22} color="var(--accent)" /> Quản lý người dùng
          </h2>
          <p className="adm-tab-count">{filtered.length} / {(users || []).length} người dùng</p>
        </div>
        <div className="adm-header-actions">
          <button onClick={fetchUsers} className="adm-filter-btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={13} /> Làm mới
          </button>
        </div>
      </div>

      <div className="adm-stats-grid-4">
        {[
          { label: "Người dùng", value: totalUsers,  color: "#6366f1", Icon: Users },
          { label: "Quản trị",   value: totalAdmins, color: "#f59e0b", Icon: Crown },
          { label: "Bị khóa",    value: lockedCount, color: "#ef4444", Icon: Lock  },
          { label: "Google",     value: googleCount, color: "#10b981", Icon: UserCheck },
        ].map((s) => (
          <div key={s.label} className="adm-stat-card" style={{ padding: "16px 20px" }}>
            <div className="adm-stat-card-glow" style={{ background: `${s.color}10` }} />
            <div className="adm-stat-inner">
              <div>
                <div className="adm-stat-value-lg">{s.value}</div>
                <div className="adm-stat-label">{s.label}</div>
              </div>
              <div className="adm-stat-icon" style={{ background: `${s.color}18` }}>
                <s.Icon size={20} color={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="adm-filter-bar">
        <div className="adm-search-wrap">
          <Search size={14} color="var(--text2)" />
          <input className="adm-search-input" value={localSearch} onChange={e => setLocalSearch(e.target.value)}
            placeholder="Tìm tên, email..." />
          {localSearch && (
            <button className="adm-search-clear" onClick={() => setLocalSearch("")}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="adm-role-tabs">
          {[ { val: "all", label: "Tất cả" }, { val: "user", label: "User" }, { val: "admin", label: "Admin" } ].map(f => (
            <button key={f.val} onClick={() => setRoleFilter(f.val)}
              className={`adm-role-btn ${roleFilter === f.val ? "active" : ""}`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="adm-sort-wrap">
          <Filter size={13} color="var(--text2)" />
          <select className="adm-sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map(o => (
              <option key={o.val} value={o.val}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={12} color="var(--text2)" className="adm-sort-icon" />
        </div>
      </div>

      <div className="adm-table-wrap">
        <div style={{ overflowX: "auto" }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Quyền</th>
                <th>Đăng nhập</th>
                <th>Đơn hàng</th>
                <th>Chi tiêu</th>
                <th>Trạng thái</th>
                <th>Tham gia</th>
                <th style={{ textAlign: "center" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr className="adm-empty-row">
                  <td colSpan={8}>Không tìm thấy người dùng phù hợp</td>
                </tr>
              )}
              {filtered.map(u => {
                // Tài khoản bị khóa nếu status='locked' (Admin khóa) HOẶC locked_until > Hiện tại (Sai pass)
                const isLocked = u.status === 'locked' || (u.locked_until && new Date(u.locked_until) > new Date());
                return (
                  <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => handleViewDetail(u.id)}>
                    <td>
                      <div className="adm-user-cell">
                        <UserAvatar user={u} size={38} />
                        <div>
                          <div className="adm-user-cell-name">
                            <span className="adm-cell-name">{u.name}</span>
                            {u.role === "admin" && <Crown size={12} color="#f59e0b" />}
                          </div>
                          <div className="adm-cell-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge status={u.role} /></td>
                    <td>
                      <span className={u.login_type === "google" ? "adm-tag-google" : "adm-tag-local"}>
                        {u.login_type === "google" ? "Google" : "Local"}
                      </span>
                    </td>
                    <td><span className="adm-cell-orders">{u.total_orders || 0}</span></td>
                    <td><span className="adm-cell-price">{fmtMoney(u.total_spent)}</span></td>
                    <td>
                      {isLocked ? (
                        u.status === 'locked' ? (
                          <span className="user-status-locked"><Lock size={10} /> Khóa bởi Admin</span>
                        ) : (
                          <span className="user-status-locked" title="Nhập sai mật khẩu nhiều lần"><Lock size={10} /> Tạm khóa</span>
                        )
                      ) : (
                        <span className="user-status-active">Hoạt động</span>
                      )}
                    </td>
                    <td className="adm-cell-date">{fmtDate(u.created_at)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <ActionIconBtn onClick={() => handleViewDetail(u.id)} color="#6366f1" title="Xem chi tiết">
                          <Eye size={14} />
                        </ActionIconBtn>
                        
                        {/* THAY ĐỔI: HIỆN NÚT MỞ HOẶC KHÓA DỰA VÀO TRẠNG THÁI */}
                        {isLocked ? (
                          <ActionIconBtn onClick={() => handleAction("unlock", u)} color="#10b981" title="Mở khóa">
                            <Unlock size={14} />
                          </ActionIconBtn>
                        ) : (
                          <ActionIconBtn onClick={() => handleAction("lock", u)} color="#ef4444" title="Khóa tài khoản">
                            <Lock size={14} />
                          </ActionIconBtn>
                        )}
                        {/* <ActionIconBtn onClick={() => handleAction("role", u)} color="#f59e0b" title={u.role === "admin" ? "Hạ User" : "Lên Admin"}>
                          <Crown size={14} />
                        </ActionIconBtn>
                        <ActionIconBtn onClick={() => handleAction("resetPw", u)} color="#3b82f6" title="Cấp lại mật khẩu">
                          <KeyRound size={14} />
                        </ActionIconBtn> */}
                        <ActionIconBtn onClick={() => handleAction("delete", u)} color="#ef4444" title="Xóa">
                          <Trash2 size={14} />
                        </ActionIconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── HIỂN THỊ MODAL BẮT CÁC THUỘC TÍNH MỚI ────────────────── */}
      {confirm && (() => {
        const cfg = confirmConfig[confirm.type];
        return (
          <ConfirmModal 
            open 
            title={cfg.title} 
            message={cfg.message(confirm.user)}
            confirmLabel={cfg.confirmLabel} 
            confirmColor={cfg.confirmColor}
            requireInput={cfg.requireInput}
            inputType={cfg.inputType}
            inputPlaceholder={cfg.inputPlaceholder}
            onConfirm={executeAction} 
            onCancel={() => setConfirm(null)} 
          />
        );
      })()}
    </div>
  );
}