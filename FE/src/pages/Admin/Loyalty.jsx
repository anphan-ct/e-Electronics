import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { LoadingSpinner } from "../../layouts/AdminUI";
import { ThemeContext } from "../../context/ThemeContext"; 
import { Star, Users, TrendingUp, Gift, Settings, RefreshCw, Plus, Minus, Save } from "lucide-react";

const API = "http://localhost:5000/api/loyalty";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function Loyalty() {
  const { searchQuery = "" } = useOutletContext() || {};
  
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTrans] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal cộng/trừ điểm
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ points: "", description: "" });

  useEffect(() => {
    fetchStats();
    if (activeTab === "users") fetchUsers();
    if (activeTab === "history") fetchTransactions();
    if (activeTab === "config") fetchConfigs();
  }, [activeTab]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/stats`, { headers: auth() });
      setStats(r.data);
    } catch (error) {
      toast.error("Không thể tải thống kê điểm");
    } finally { 
      setLoading(false); 
    }
  };

  const fetchUsers = async () => {
    try {
      const r = await axios.get(`${API}/admin/users`, { headers: auth() });
      setUsers(r.data);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách người dùng");
    }
  };

  const fetchTransactions = async () => {
    try {
      const r = await axios.get(`${API}/admin/transactions?limit=50`, { headers: auth() });
      setTrans(r.data.transactions);
    } catch (error) {
      toast.error("Lỗi khi tải lịch sử giao dịch");
    }
  };

  const fetchConfigs = async () => {
    try {
      const r = await axios.get(`${API}/admin/config`, { headers: auth() });
      setConfigs(r.data);
    } catch (error) {
      toast.error("Lỗi khi tải cấu hình");
    }
  };

  const handleAdjust = async () => {
    if (!adjustForm.points || !adjustForm.description) {
      return toast.error("Nhập đủ thông tin");
    }
    try {
      const r = await axios.post(`${API}/admin/adjust`, {
        userId: adjustModal.id,
        points: parseInt(adjustForm.points),
        description: adjustForm.description,
      }, { headers: auth() });
      
      toast.success(r.data.message);
      setAdjustModal(null);
      setAdjustForm({ points: "", description: "" });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi");
    }
  };

  const handleSaveConfig = async () => {
    try {
      await axios.put(`${API}/admin/config`, { configs }, { headers: auth() });
      toast.success("Lưu cấu hình thành công!");
    } catch {
      toast.error("Lưu thất bại");
    }
  };

  const TYPE_COLOR = {
    earn: "#10b981", redeem: "#ef4444",
    admin_add: "#6366f1", admin_deduct: "#f59e0b", expire: "#6b7280"
  };

  if (loading && !stats) return <LoadingSpinner />;

  return (
    <div className={`animate-fade-in ${isDark ? "text-light" : "text-dark"}`}>
      <div className="adm-tab-header">
        <div>
          <h2 className="adm-tab-title d-flex align-items-center gap-2">
            <Star size={22} color="var(--accent)" fill="var(--accent)" />
            Quản lý điểm thưởng
          </h2>
          <p className="adm-tab-count">Hệ thống tích điểm & quy đổi</p>
        </div>
        <button className="adm-filter-btn d-flex align-items-center gap-2" onClick={fetchStats}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="adm-stats-grid mb-4">
          {[
            { label: "Tổng đã tích", value: (stats.totalPointsEarned||0).toLocaleString(), icon: TrendingUp, color: "#10b981" },
            { label: "Tổng đã dùng", value: (stats.totalPointsRedeemed||0).toLocaleString(), icon: Gift,      color: "#f59e0b" },
            { label: "Đang lưu hành", value: (stats.totalInCirculation||0).toLocaleString(), icon: Star,      color: "#6366f1" },
            { label: "User có điểm",  value: stats.usersWithPoints||0,                       icon: Settings,  color: "#ef4444" },
          ].map((s, i) => (
            <div key={i} className="adm-stat-card">
              <div className="adm-stat-card-glow" style={{ background: s.color + "10" }} />
              <div className="adm-stat-top">
                <div className="adm-stat-icon" style={{ background: s.color + "18" }}>
                  <s.icon size={20} color={s.color} />
                </div>
              </div>
              <div className="adm-stat-value">{s.value}</div>
              <div className="adm-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {[
          { id: "overview", label: "Tổng quan" },
          { id: "users",    label: "Người dùng" },
          { id: "history",  label: "Lịch sử" },
          { id: "config",   label: "Cấu hình" },
        ].map(tab => (
          <button key={tab.id}
            className={`adm-filter-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && stats && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="adm-card">
              <h3 className="adm-card-title mb-3">Top điểm cao nhất</h3>
              {stats.topUsers.map((u, i) => (
                <div key={u.id} className="d-flex align-items-center gap-3 mb-3">
                  <div style={{ width:28,height:28,borderRadius:8,background:"#f59e0b22",color:"#f59e0b",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12 }}>{i+1}</div>
                  <div className="flex-grow-1">
                    <div style={{fontWeight:600,fontSize:13}}>{u.name}</div>
                    <div style={{fontSize:11,color:"var(--text2)"}}>{u.email}</div>
                  </div>
                  <div style={{fontWeight:800,color:"#f59e0b"}}>{u.loyalty_points.toLocaleString()} điểm</div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-md-6">
            <div className="adm-card">
              <h3 className="adm-card-title mb-3">Hoạt động gần đây</h3>
              {stats.recentActivity.map(tx => (
                <div key={tx.id} className="d-flex align-items-center gap-3 mb-2 py-1" style={{borderBottom:"1px solid var(--border)"}}>
                  <div style={{flex:1,fontSize:12}}>{tx.user_name}</div>
                  <div style={{fontSize:11,color:"var(--text2)"}}>{tx.description.slice(0,30)}...</div>
                  <div style={{fontWeight:700,color:TYPE_COLOR[tx.type]||"#6b7280",fontSize:12}}>
                    {tx.points > 0 ? "+" : ""}{tx.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users tab */}
      {activeTab === "users" && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr>
              <th>Người dùng</th><th>Điểm hiện có</th><th>Tổng đã tích</th><th>Giao dịch</th><th>Thao tác</th>
            </tr></thead>
            <tbody>
              {users.filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{fontWeight:600,fontSize:13}}>{u.name}</div>
                    <div style={{fontSize:11,color:"var(--text2)"}}>{u.email}</div>
                  </td>
                  <td><span style={{fontWeight:800,color:"#f59e0b"}}>{u.loyalty_points.toLocaleString()} điểm</span></td>
                  <td>{u.total_points_earned.toLocaleString()}</td>
                  <td>{u.transaction_count}</td>
                  <td>
                    <button className="adm-filter-btn" style={{fontSize:11,padding:"4px 10px"}}
                      onClick={() => setAdjustModal(u)}>
                      Điều chỉnh
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr>
              <th>Người dùng</th><th>Loại</th><th>Điểm</th><th>Còn lại</th><th>Mô tả</th><th>Thời gian</th>
            </tr></thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.user_name}<div style={{fontSize:11,color:"var(--text2)"}}>{tx.user_email}</div></td>
                  <td><span style={{fontSize:11,fontWeight:700,color:TYPE_COLOR[tx.type]||"#6b7280",background:(TYPE_COLOR[tx.type]||"#6b7280")+"22",padding:"2px 8px",borderRadius:99}}>{tx.type}</span></td>
                  <td style={{fontWeight:700,color:tx.points>0?"#10b981":"#ef4444"}}>{tx.points>0?"+":""}{tx.points}</td>
                  <td>{tx.balance_after.toLocaleString()}</td>
                  <td style={{fontSize:11,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.description}</td>
                  <td className="adm-cell-date">{new Date(tx.created_at).toLocaleDateString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "config" && (
        <div className={`card border-0 shadow-sm rounded-4 p-4 ${isDark ? "bg-dark text-light border border-secondary" : "bg-white"}`}>
          <div className="d-flex align-items-center gap-2 mb-4 pb-3 border-bottom" style={{ borderColor: isDark ? "#374151" : "#f3f4f6" }}>
            <Settings size={24} className="text-primary"/>
            <h4 className="fw-bold mb-0">Cấu hình hệ thống điểm</h4>
          </div>
          
          <div className="row g-4">
            {configs.map((cfg, i) => (
              <div key={cfg.id} className="col-md-6 col-xl-4">
                <div className={`p-3 rounded-4 border h-100 d-flex flex-column shadow-sm transition-all hover-lift ${isDark ? "bg-secondary bg-opacity-10 border-secondary" : "bg-light border-light-subtle"}`}>
                  <label className="fw-bold mb-1 text-primary" style={{fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px"}}>
                    {cfg.config_key}
                  </label>
                  <p className={`small mb-3 ${isDark ? "text-white-50" : "text-muted"}`} style={{ flexGrow: 1, minHeight: "40px" }}>
                    {cfg.description || "Không có mô tả"}
                  </p>
                  <input
                    type="text"
                    value={configs[i].config_value}
                    onChange={e => {
                      const updated = [...configs];
                      updated[i] = { ...updated[i], config_value: e.target.value };
                      setConfigs(updated);
                    }}
                    className={`form-control form-control-lg fw-bold shadow-sm ${isDark ? "bg-dark text-white border-secondary" : "bg-white border-light-subtle"}`}
                    style={{ fontSize: "15px" }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-top text-end" style={{ borderColor: isDark ? "#374151" : "#f3f4f6" }}>
            {/* 🆕 NÚT LƯU CẤU HÌNH MODERN UI */}
            <button 
              onClick={handleSaveConfig}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 32px',
                borderRadius: '99px',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
              }}
            >
              <Save size={18} strokeWidth={2.5} /> 
              Lưu Cấu Hình
            </button>
          </div>
        </div>
      )}

      {/* Modal điều chỉnh điểm */}
      {adjustModal && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-content" style={{ background: isDark ? "#1f2937" : "#fff", color: isDark ? "#fff" : "#000" }}>
            <h3 className="adm-modal-header" style={{ borderColor: isDark ? "#374151" : "#eee" }}>Điều chỉnh điểm — {adjustModal.name}</h3>
            <p style={{fontSize:13,color: isDark ? "#9ca3af" : "var(--text2)"}}>Hiện có: <strong>{adjustModal.loyalty_points.toLocaleString()} điểm</strong></p>
            <label className="adm-form-label" style={{ color: isDark ? "#e5e7eb" : "#333" }}>
              Số điểm (số dương để cộng, số âm để trừ):
              <input type="number" className="adm-form-input" placeholder="Ví dụ: 100 hoặc -50"
                style={{ background: isDark ? "#374151" : "#fff", color: isDark ? "#fff" : "#000", borderColor: isDark ? "#4b5563" : "#ddd" }}
                value={adjustForm.points} onChange={e => setAdjustForm({...adjustForm, points: e.target.value})} />
            </label>
            <label className="adm-form-label" style={{ color: isDark ? "#e5e7eb" : "#333", marginTop: "10px" }}>
              Lý do:
              <input type="text" className="adm-form-input" placeholder="Lý do điều chỉnh..."
                style={{ background: isDark ? "#374151" : "#fff", color: isDark ? "#fff" : "#000", borderColor: isDark ? "#4b5563" : "#ddd" }}
                value={adjustForm.description} onChange={e => setAdjustForm({...adjustForm, description: e.target.value})} />
            </label>
            <div className="d-flex gap-2 mt-4">
              <button className="adm-btn adm-btn-secondary w-100" onClick={() => setAdjustModal(null)}>Hủy</button>
              <button className="adm-btn adm-btn-primary w-100" onClick={handleAdjust}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}