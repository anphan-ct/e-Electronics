import { useState, useEffect } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { StatusBadge, LoadingSpinner } from "../../layouts/AdminUI";

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// ════════════════════════════════════════════════════════════
// USERS PAGE  —  route: /admin/dashboard/users
// ════════════════════════════════════════════════════════════
export default function UsersPage() {
  // searchQuery từ AdminLayout
  const { searchQuery = "" } = useOutletContext() || {};

  const [users,   setUsers]   = useState(null);

  // ★ Fetch riêng — chỉ gọi /dashboard/users
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/dashboard/users", { headers: auth() })
      .then(res => setUsers(res.data))
      .catch(() => toast.error("Không thể tải danh sách người dùng"));
  }, []);

  if (!users) return <LoadingSpinner />;

  const filtered = users.filter(u =>
    !searchQuery ||
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">

      {/* HEADER */}
      <div className="adm-tab-header">
        <div>
          <h2 className="adm-tab-title">Quản lý người dùng</h2>
          <p className="adm-tab-count">{filtered.length} thành viên trong hệ thống</p>
        </div>
      </div>

      {/* USER GRID — dùng class từ AdminDashboard.css */}
      <div className="adm-users-grid">
        {filtered.map(u => (
          <div key={u.id} className="adm-user-card">

            {/* Avatar — class admin-role / user-role từ AdminDashboard.css */}
            <div className={`adm-user-avatar ${u.role === "admin" ? "admin-role" : "user-role"}`}>
              {u.name?.charAt(0).toUpperCase()}
            </div>

            <div className="adm-user-info">
              {/* Tên + Badge vai trò */}
              <div className="adm-user-name-row">
                <div className="adm-user-name">{u.name}</div>
                <StatusBadge status={u.role} />
              </div>

              {/* Email */}
              <div className="adm-user-email">{u.email}</div>

              {/* Thống kê */}
              <div className="adm-user-stats">
                <div>
                  <div className="adm-user-stat-val">{u.total_orders || 0}</div>
                  <div className="adm-user-stat-label">Đơn hàng</div>
                </div>
                <div>
                  <div className="adm-user-stat-val green">
                    ${parseFloat(u.total_spent || 0).toFixed(0)}
                  </div>
                  <div className="adm-user-stat-label">Đã chi</div>
                </div>
                <div>
                  <div className="adm-user-stat-val" style={{ fontSize:12 }}>
                    {new Date(u.created_at).toLocaleDateString("vi-VN")}
                  </div>
                  <div className="adm-user-stat-label">Tham gia</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:48, color:"var(--text2)", fontSize:14 }}>
          Không tìm thấy người dùng{searchQuery ? ` "${searchQuery}"` : ""}
        </div>
      )}
    </div>
  );
}