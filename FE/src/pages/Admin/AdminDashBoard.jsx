import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../../context/ThemeContext";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard, ShoppingCart, Users, Package,
  MessageSquare, Search, ChevronRight, ArrowUpRight,
  ArrowDownRight, DollarSign, RefreshCw, LogOut, Menu,
  Zap, Moon, Sun, Home,
} from "lucide-react";
import "../../AdminDashboard.css";
 
const API = "http://localhost:5000/api";
 
// ─── Sparkline SVG ───────────────────────────────────────
function Sparkline({ data = [], color = "#6366f1", height = 32 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100, h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const uid = color.replace("#", "");
  return (
    <svg width={w} height={h} style={{ overflow: "visible", flexShrink: 0 }}>
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#sg-${uid})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
 
// ─── Status Badge ────────────────────────────────────────
const BADGE_MAP = {
  pending:   { label: "Chờ xử lý", bg: "#fef3c7", color: "#d97706" },
  confirmed: { label: "Xác nhận",  bg: "#d1fae5", color: "#059669" },
  shipping:  { label: "Đang giao", bg: "#dbeafe", color: "#2563eb" },
  delivered: { label: "Đã giao",   bg: "#d1fae5", color: "#059669" },
  cancelled: { label: "Đã hủy",    bg: "#fee2e2", color: "#dc2626" },
  paid:      { label: "Đã TT",     bg: "#d1fae5", color: "#059669" },
  failed:    { label: "Thất bại",  bg: "#fee2e2", color: "#dc2626" },
  cod:       { label: "COD",       bg: "#e0e7ff", color: "#4f46e5" },
  vnpay:     { label: "VNPay",     bg: "#fce7f3", color: "#be185d" },
  admin:     { label: "Admin",     bg: "#fef3c7", color: "#d97706" },
  user:      { label: "User",      bg: "#dbeafe", color: "#2563eb" },
};
 
function StatusBadge({ status }) {
  const s = BADGE_MAP[status] || { label: status, bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span className="adm-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}
 
// ─── Revenue Chart ───────────────────────────────────────
function RevenueChart({ data, isDark }) {
  if (!data || data.length < 2) return (
    <div style={{ height: 160, display: "flex", alignItems: "center",
      justifyContent: "center", color: "var(--text2)", fontSize: 13 }}>
      Chưa có dữ liệu doanh thu
    </div>
  );
  const W = 600, H = 160, PAD = 30;
  const values = data.map(d => parseFloat(d.revenue));
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [
    PAD + (i / (values.length - 1)) * (W - PAD * 2),
    H - PAD - (v / max) * (H - PAD * 2),
  ]);
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]},${p[1]}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]},${H - PAD} L ${pts[0][0]},${H - PAD} Z`;
  const dates = data.slice(-6).map(d =>
    new Date(d.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
  );
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 160, overflow: "visible" }}>
        <defs>
          <linearGradient id="rg-chart" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i}
            x1={PAD} y1={PAD + t * (H - PAD * 2)}
            x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
            stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"} strokeWidth="1" />
        ))}
        <path d={areaPath} fill="url(#rg-chart)" />
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {(() => { const [x, y] = pts[pts.length - 1]; return <circle cx={x} cy={y} r={5} fill="#6366f1" stroke="white" strokeWidth={2} />; })()}
      </svg>
      <div className="adm-chart-dates">
        {dates.map((d, i) => <span key={i} className="adm-chart-date-label">{d}</span>)}
      </div>
    </>
  );
}
 
// ─── Payment Donut ───────────────────────────────────────
function PaymentDonut({ data, isDark }) {
  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  let angle = -90;
  const r = 50, cx = 70, cy = 70;
  const rad = d => (d * Math.PI) / 180;
 
  const slices = data.map((d, i) => {
    const a = (d.count / total) * 360;
    const x1 = cx + r * Math.cos(rad(angle));
    const y1 = cy + r * Math.sin(rad(angle));
    angle += a;
    const x2 = cx + r * Math.cos(rad(angle));
    const y2 = cy + r * Math.sin(rad(angle));
    return {
      path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${a > 180 ? 1 : 0} 1 ${x2} ${y2} Z`,
      color: COLORS[i % COLORS.length],
    };
  });
 
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg viewBox="0 0 140 140" style={{ width: 110, height: 110 }}>
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0"} strokeWidth={20} />
          {data.length === 0 && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6366f1" strokeWidth={20}
              strokeDasharray="314" strokeDashoffset="78" strokeLinecap="round" />
          )}
          {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.9} />)}
          <circle cx={cx} cy={cy} r={r - 15} fill={isDark ? "#1c2030" : "white"} />
          <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight={800}
            fill={isDark ? "#e8eaf6" : "#1a1d2e"}>{total}</text>
        </svg>
      </div>
      <div className="adm-donut-legend">
        {data.map((p, i) => (
          <div key={i} className="adm-donut-legend-row">
            <div className="adm-donut-legend-left">
              <div className="adm-dot" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="adm-donut-legend-label">
                {p.payment_method?.toUpperCase()} — {p.payment_status}
              </span>
            </div>
            <span className="adm-donut-legend-count">{p.count}</span>
          </div>
        ))}
      </div>
    </>
  );
}
 
// ─── Products Grid ───────────────────────────────────────
function ProductsGrid({ token, searchQuery }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
 
  useEffect(() => {
    axios.get(`${API}/dashboard/products`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setProducts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
 
  const filtered = products.filter(p =>
    !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
 
  if (loading) return (
    <div style={{ textAlign: "center", padding: 40, color: "var(--text2)" }}>Đang tải...</div>
  );
 
  return (
    <div className="adm-products-grid">
      {filtered.map(p => (
        <div key={p.id} className="adm-product-card">
          <div className="adm-product-img-wrap">
            <img src={`/assets/img/${p.image}`} alt={p.name} className="adm-product-img"
              onError={e => { e.target.style.display = "none"; }} />
          </div>
          <div className="adm-product-info">
            <div className="adm-product-info-name">{p.name}</div>
            <div className="adm-product-info-price">${parseFloat(p.price).toFixed(0)}</div>
            <div className="adm-product-info-id">ID: {p.id}</div>
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 40, color: "var(--text2)" }}>
          Không tìm thấy sản phẩm
        </div>
      )}
    </div>
  );
}
 
// ════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function AdminDashBoard() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const isDark = theme === "dark";
 
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [activeTab, setActiveTab]       = useState("overview");
  const [loading, setLoading]           = useState(true);
  const [searchQuery, setSearchQuery]   = useState("");
  const [stats, setStats]               = useState({});
  const [revenueChart, setRevenueChart] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts]   = useState([]);
  const [users, setUsers]               = useState([]);
  const [allOrders, setAllOrders]       = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  const [orderFilter, setOrderFilter]   = useState("all");
  const [updatingOrder, setUpdatingOrder] = useState(null);
 
  const admin = (() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  })();
 
  useEffect(() => {
    if (!admin || admin.role !== "admin") { navigate("/"); return; }
    fetchAll();
  }, []);
 
  const fetchAll = async () => {
    setLoading(true);
    const h = { Authorization: `Bearer ${localStorage.getItem("token")}` };
    try {
      const [s, r, ro, tp, u, ao, ps] = await Promise.all([
        axios.get(`${API}/dashboard/stats`,         { headers: h }),
        axios.get(`${API}/dashboard/revenue-chart`, { headers: h }),
        axios.get(`${API}/dashboard/recent-orders`, { headers: h }),
        axios.get(`${API}/dashboard/top-products`,  { headers: h }),
        axios.get(`${API}/dashboard/users`,         { headers: h }),
        axios.get(`${API}/dashboard/orders`,        { headers: h }),
        axios.get(`${API}/dashboard/payment-stats`, { headers: h }),
      ]);
      setStats(s.data);       setRevenueChart(r.data);
      setRecentOrders(ro.data); setTopProducts(tp.data);
      setUsers(u.data);       setAllOrders(ao.data);
      setPaymentStats(ps.data);
    } catch { toast.error("Không thể tải dữ liệu dashboard"); }
    setLoading(false);
  };
 
  const updateOrderStatus = async (id, status) => {
    setUpdatingOrder(id);
    try {
      await axios.put(`${API}/dashboard/orders/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setAllOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      setRecentOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      toast.success("Cập nhật trạng thái thành công!");
    } catch { toast.error("Cập nhật thất bại"); }
    setUpdatingOrder(null);
  };
 
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("login"));
    navigate("/");
  };
 
  const filteredOrders = allOrders.filter(o => {
    const q = searchQuery.toLowerCase();
    return (
      (!q || o.shipping_name?.toLowerCase().includes(q) ||
        o.user_name?.toLowerCase().includes(q) || String(o.id).includes(q)) &&
      (orderFilter === "all" || o.status === orderFilter || o.payment_status === orderFilter)
    );
  });
 
  const filteredUsers = users.filter(u =>
    !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())
      || u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
 
  const sparkData = revenueChart.slice(-12).map(r => parseFloat(r.revenue));
  const maxSold   = Math.max(...topProducts.map(p => p.total_sold), 1);
 
  const NAV_ITEMS = [
    { id: "overview", icon: LayoutDashboard, label: "Tổng quan" },
    { id: "orders",   icon: ShoppingCart,    label: "Đơn hàng",    count: stats.pendingOrders },
    { id: "products", icon: Package,         label: "Sản phẩm" },
    { id: "users",    icon: Users,           label: "Người dùng" },
    { id: "chat",     icon: MessageSquare,   label: "Hỗ trợ Chat", link: "/admin/chat" },
  ];
 
  const STAT_CARDS = [
    { label: "Tổng doanh thu", value: `$${(stats.revenue || 0).toLocaleString()}`, icon: DollarSign,  color: "#6366f1", sub: `${stats.paidOrders || 0} đơn đã TT`,    up: true  },
    { label: "Tổng đơn hàng",  value: stats.totalOrders   || 0,                   icon: ShoppingCart, color: "#10b981", sub: `${stats.pendingOrders || 0} chờ xử lý`, up: true  },
    { label: "Người dùng",     value: stats.totalUsers    || 0,                   icon: Users,        color: "#f59e0b", sub: "Khách đã đăng ký",                       up: true  },
    { label: "Sản phẩm",       value: stats.totalProducts || 0,                   icon: Package,      color: "#ef4444", sub: "Đang kinh doanh",                        up: false },
  ];
 
  const FILTERS = [
    { val: "all",       label: "Tất cả" },
    { val: "pending",   label: "Chờ xử lý" },
    { val: "confirmed", label: "Xác nhận" },
    { val: "shipping",  label: "Đang giao" },
    { val: "delivered", label: "Đã giao" },
    { val: "cancelled", label: "Đã hủy" },
  ];
 
  if (!admin || admin.role !== "admin") return null;
 
  return (
    <div className={`adm-root${isDark ? " dark" : ""}`}>
 
      {/* ══ SIDEBAR ══ */}
      <aside className={`adm-sidebar${sidebarOpen ? "" : " collapsed"}`}>
        <div className="adm-logo">
          <div className="adm-logo-icon"><Zap size={18} color="white" /></div>
          {sidebarOpen && (
            <div className="adm-logo-text">
              <div className="adm-logo-name">E-Electronics</div>
              <div className="adm-logo-sub">Admin Panel</div>
            </div>
          )}
        </div>
 
        <nav className="adm-nav">
          {NAV_ITEMS.map(item => {
            const active = activeTab === item.id && !item.link;
            return (
              <button
                key={item.id}
                className={`adm-nav-btn${active ? " active" : ""}`}
                onClick={() => item.link ? navigate(item.link) : setActiveTab(item.id)}
                title={!sidebarOpen ? item.label : undefined}
              >
                {active && <div className="adm-active-bar" />}
                <item.icon size={18} style={{ flexShrink: 0 }} />
                {sidebarOpen && (
                  <>
                    <span className="adm-nav-label">{item.label}</span>
                    {item.count > 0 && <span className="adm-nav-badge">{item.count}</span>}
                  </>
                )}
              </button>
            );
          })}
        </nav>
 
        <div className="adm-sidebar-footer">
          <button className="adm-sidebar-footer-btn home-btn" onClick={() => navigate("/")}
            title={!sidebarOpen ? "Về trang chủ" : undefined}>
            <Home size={16} />
            {sidebarOpen && "Về trang chủ"}
          </button>
          <button className="adm-sidebar-footer-btn toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={16} />
            {sidebarOpen && <span style={{ marginLeft: 4 }}>Thu gọn</span>}
          </button>
          <button className="adm-sidebar-footer-btn logout" onClick={handleLogout}
            title={!sidebarOpen ? "Đăng xuất" : undefined}>
            <LogOut size={16} />
            {sidebarOpen && "Đăng xuất"}
          </button>
        </div>
      </aside>
 
      {/* ══ MAIN ══ */}
      <main className="adm-main">
        <header className="adm-topbar">
          <div className="adm-breadcrumb">
            <span className="adm-breadcrumb-parent">Admin</span>
            <ChevronRight size={14} color="var(--text2)" />
            <span className="adm-breadcrumb-current">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label || activeTab}
            </span>
          </div>
 
          <div className="adm-search-box">
            <Search size={14} color="var(--text2)" />
            <input className="adm-search-input" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm kiếm..." />
          </div>
 
          <button className="adm-icon-btn" onClick={fetchAll} title="Tải lại">
            <RefreshCw size={15} />
          </button>
          <button className="adm-icon-btn" onClick={toggleTheme} title="Đổi theme">
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
 
          {/* ★ Nút về trang chủ nổi bật trên topbar */}
          <Link to="/" className="adm-home-btn">
            <Home size={14} /> Trang chủ
          </Link>
 
          <div className="adm-avatar-wrap">
            <div className="adm-avatar">{admin.name?.charAt(0).toUpperCase()}</div>
            <div>
              <div className="adm-avatar-name">{admin.name}</div>
              <div className="adm-avatar-role">Administrator</div>
            </div>
          </div>
        </header>
 
        <div className="adm-content">
          {loading ? (
            <div className="adm-spinner-wrap">
              <div className="adm-spinner" />
              <span className="adm-spinner-text">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <>
              {/* ══ OVERVIEW ══ */}
              {activeTab === "overview" && (
                <div>
                  <div className="adm-welcome">
                    <div>
                      <p className="adm-welcome-date">
                        {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <h2 className="adm-welcome-title">Xin chào, {admin.name}! 👋</h2>
                      <p className="adm-welcome-sub">
                        Hôm nay có <strong>{stats.pendingOrders || 0}</strong> đơn chờ xử lý
                      </p>
                    </div>
                    <div className="adm-welcome-actions">
                      <button className="adm-welcome-btn-outline" onClick={() => setActiveTab("orders")}>
                        Xem đơn hàng
                      </button>
                      <Link to="/admin/chat" className="adm-welcome-btn-solid">
                        <MessageSquare size={14} /> Chat ngay
                      </Link>
                    </div>
                  </div>
 
                  {/* Stat cards */}
                  <div className="adm-stats-grid">
                    {STAT_CARDS.map((s, i) => (
                      <div key={i} className="adm-stat-card">
                        <div className="adm-stat-card-glow" style={{ background: `${s.color}10` }} />
                        <div className="adm-stat-top">
                          <div className="adm-stat-icon" style={{ background: `${s.color}18` }}>
                            <s.icon size={20} color={s.color} />
                          </div>
                          <Sparkline data={sparkData} color={s.color} />
                        </div>
                        <div className="adm-stat-value">{s.value}</div>
                        <div className="adm-stat-label">{s.label}</div>
                        <div className="adm-stat-sub">
                          {s.up ? <ArrowUpRight size={12} color="var(--green)" /> : <ArrowDownRight size={12} color="var(--red)" />}
                          <span style={{ color: s.up ? "var(--green)" : "var(--red)" }}>{s.sub}</span>
                        </div>
                      </div>
                    ))}
                  </div>
 
                  {/* Charts row */}
                  <div className="adm-charts-row">
                    <div className="adm-card">
                      <div className="adm-card-header">
                        <div>
                          <h3 className="adm-card-title">Doanh thu 30 ngày</h3>
                          <p className="adm-card-sub">Biểu đồ doanh thu theo ngày</p>
                        </div>
                        <span className="adm-pill">30 ngày</span>
                      </div>
                      <RevenueChart data={revenueChart} isDark={isDark} />
                    </div>
                    <div className="adm-card">
                      <h3 className="adm-card-title" style={{ marginBottom: 16 }}>Phương thức TT</h3>
                      <PaymentDonut data={paymentStats} isDark={isDark} />
                    </div>
                  </div>
 
                  {/* Recent + Top */}
                  <div className="adm-bottom-row">
                    <div className="adm-card">
                      <div className="adm-section-header">
                        <h3 className="adm-card-title">Đơn hàng gần đây</h3>
                        <button className="adm-see-all-btn" onClick={() => setActiveTab("orders")}>
                          Xem tất cả <ChevronRight size={13} />
                        </button>
                      </div>
                      {recentOrders.slice(0, 5).map(o => (
                        <div key={o.id} className="adm-order-row">
                          <div className="adm-order-avatar">#{o.id}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="adm-order-name">{o.shipping_name || o.user_name}</div>
                            <div className="adm-order-date">{new Date(o.created_at).toLocaleDateString("vi-VN")}</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div className="adm-order-price">${parseFloat(o.total).toFixed(0)}</div>
                            <StatusBadge status={o.status} />
                          </div>
                        </div>
                      ))}
                      {recentOrders.length === 0 && (
                        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text2)", fontSize: 13 }}>Chưa có đơn hàng</div>
                      )}
                    </div>
 
                    <div className="adm-card">
                      <div className="adm-section-header">
                        <h3 className="adm-card-title">Top sản phẩm</h3>
                        <span className="adm-pill">Bán chạy nhất</span>
                      </div>
                      {topProducts.map((p, i) => (
                        <div key={p.id} className="adm-product-row">
                          <div className={`adm-rank-badge adm-rank-${i < 2 ? i + 1 : "3+"}`}>{i + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="adm-product-name">{p.name}</div>
                            <div className="adm-progress-wrap">
                              <div className="adm-progress-bar">
                                <div className="adm-progress-fill"
                                  style={{ width: `${Math.max((p.total_sold / maxSold) * 100, 4)}%` }} />
                              </div>
                              <span className="adm-progress-label">{p.total_sold} đã bán</span>
                            </div>
                          </div>
                          <div className="adm-product-price">${parseFloat(p.price).toFixed(0)}</div>
                        </div>
                      ))}
                      {topProducts.length === 0 && (
                        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text2)", fontSize: 13 }}>Chưa có dữ liệu</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
 
              {/* ══ ORDERS ══ */}
              {activeTab === "orders" && (
                <div>
                  <div className="adm-tab-header">
                    <div>
                      <h2 className="adm-tab-title">Quản lý đơn hàng</h2>
                      <p className="adm-tab-count">{filteredOrders.length} đơn hàng</p>
                    </div>
                    <div className="adm-filter-row">
                      {FILTERS.map(f => (
                        <button key={f.val}
                          className={`adm-filter-btn${orderFilter === f.val ? " active" : ""}`}
                          onClick={() => setOrderFilter(f.val)}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="adm-table-wrap">
                    <div style={{ overflowX: "auto" }}>
                      <table className="adm-table">
                        <thead>
                          <tr>
                            {["#ID","Khách hàng","Tổng tiền","Thanh toán","Trạng thái","Ngày tạo","Cập nhật"].map(h => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map(o => (
                            <tr key={o.id}>
                              <td><span className="adm-order-id">#{o.id}</span></td>
                              <td>
                                <div className="adm-cell-name">{o.shipping_name || o.user_name || "—"}</div>
                                <div className="adm-cell-sub">{o.user_email || o.shipping_phone}</div>
                              </td>
                              <td>
                                <div className="adm-cell-price">${parseFloat(o.total).toFixed(2)}</div>
                                <StatusBadge status={o.payment_method} />
                              </td>
                              <td><StatusBadge status={o.payment_status} /></td>
                              <td><StatusBadge status={o.status} /></td>
                              <td className="adm-cell-date">{new Date(o.created_at).toLocaleDateString("vi-VN")}</td>
                              <td>
                                <select className="adm-status-select" value={o.status}
                                  disabled={updatingOrder === o.id}
                                  onChange={e => updateOrderStatus(o.id, e.target.value)}>
                                  <option value="pending">Chờ xử lý</option>
                                  <option value="confirmed">Xác nhận</option>
                                  <option value="shipping">Đang giao</option>
                                  <option value="delivered">Đã giao</option>
                                  <option value="cancelled">Đã hủy</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                          {filteredOrders.length === 0 && (
                            <tr className="adm-empty-row"><td colSpan={7}>Không có đơn hàng nào</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
 
              {/* ══ PRODUCTS ══ */}
              {activeTab === "products" && (
                <div>
                  <div className="adm-tab-header">
                    <div>
                      <h2 className="adm-tab-title">Quản lý sản phẩm</h2>
                      <p className="adm-tab-count">{stats.totalProducts || 0} sản phẩm</p>
                    </div>
                  </div>
                  <ProductsGrid token={localStorage.getItem("token")} searchQuery={searchQuery} />
                </div>
              )}
 
              {/* ══ USERS ══ */}
              {activeTab === "users" && (
                <div>
                  <div className="adm-tab-header">
                    <div>
                      <h2 className="adm-tab-title">Quản lý người dùng</h2>
                      <p className="adm-tab-count">{filteredUsers.length} người dùng</p>
                    </div>
                  </div>
                  <div className="adm-users-grid">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="adm-user-card">
                        <div className={`adm-user-avatar ${u.role === "admin" ? "admin-role" : "user-role"}`}>
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="adm-user-info">
                          <div className="adm-user-name-row">
                            <div className="adm-user-name">{u.name}</div>
                            <StatusBadge status={u.role} />
                          </div>
                          <div className="adm-user-email">{u.email}</div>
                          <div className="adm-user-stats">
                            <div>
                              <div className="adm-user-stat-val">{u.total_orders}</div>
                              <div className="adm-user-stat-label">Đơn hàng</div>
                            </div>
                            <div>
                              <div className="adm-user-stat-val green">${parseFloat(u.total_spent || 0).toFixed(0)}</div>
                              <div className="adm-user-stat-label">Đã chi</div>
                            </div>
                            <div>
                              <div className="adm-user-stat-val" style={{ fontSize: 12 }}>
                                {new Date(u.created_at).toLocaleDateString("vi-VN")}
                              </div>
                              <div className="adm-user-stat-label">Tham gia</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}