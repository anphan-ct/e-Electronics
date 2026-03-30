import React, { useState, useContext, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import { 
  LayoutDashboard, ShoppingCart, Users, Package, MessageSquare, 
  Search, ChevronRight, RefreshCw, LogOut, Menu, Zap, Moon, Sun, Home 
} from "lucide-react";
import axios from "axios";
import "../AdminDashboard.css";

export default function AdminLayout() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({}); // Lưu pendingOrders cho Sidebar Badge
  const navigate = useNavigate();
  const location = useLocation();
  const isDark = theme === "dark";
  const admin = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchSidebarStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (e) { console.error("Sidebar stats error:", e); }
  };

  useEffect(() => { fetchSidebarStats(); }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    window.dispatchEvent(new Event("login"));
    navigate("/");
  };

  const NAV_ITEMS = [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Tổng quan" },
    { path: "/admin/orders", icon: ShoppingCart, label: "Đơn hàng", count: stats.pendingOrders }, // Thêm count
    { path: "/admin/products", icon: Package, label: "Sản phẩm" },
    { path: "/admin/users", icon: Users, label: "Người dùng" },
    { path: "/admin/chat", icon: MessageSquare, label: "Hỗ trợ Chat" },
  ];

  return (
    <div className={`adm-root${isDark ? " dark" : ""}`}>
      <aside className={`adm-sidebar${sidebarOpen ? "" : " collapsed"}`}>
        <div className="adm-logo">
          <div className="adm-logo-icon"><Zap size={20} color="white" fill="white" /></div>
          {sidebarOpen && <div className="adm-logo-text"><div className="adm-logo-name">E-Electronics</div></div>}
        </div>
        <nav className="adm-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.path} className={`adm-nav-btn${location.pathname === item.path ? " active" : ""}`} onClick={() => navigate(item.path)}>
              {location.pathname === item.path && <div className="adm-active-bar" />}
              <item.icon size={18} />
              {sidebarOpen && <span className="adm-nav-label">{item.label}</span>}
              {/* Badge thông báo màu đỏ */}
              {sidebarOpen && item.count > 0 && <span className="adm-nav-badge">{item.count}</span>}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-footer">
          <button className="adm-sidebar-footer-btn home-btn" onClick={() => navigate("/")}><Home size={16} /> {sidebarOpen && "Trang chủ"}</button>
          <button className="adm-sidebar-footer-btn toggle" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={16} /> {sidebarOpen && "Thu gọn"}</button>
          <button className="adm-sidebar-footer-btn logout" onClick={handleLogout}><LogOut size={16} /> {sidebarOpen && "Đăng xuất"}</button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-topbar">
          <div className="adm-breadcrumb"><span className="adm-breadcrumb-parent">Admin</span><ChevronRight size={14} color="var(--text2)" /><span className="adm-breadcrumb-current">Quản trị</span></div>
          <div className="adm-search-box"><Search size={14} color="var(--text2)" /><input className="adm-search-input" placeholder="Tìm kiếm..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
          <div className="d-flex align-items-center gap-2">
            <button className="adm-icon-btn" onClick={() => window.location.reload()}><RefreshCw size={15} /></button>
            <button className="adm-icon-btn" onClick={toggleTheme}>{isDark ? <Sun size={15} /> : <Moon size={15} />}</button>
            <Link to="/" className="adm-home-btn text-decoration-none"><Home size={14} /> Trang chủ</Link>
          </div>
          <div className="adm-avatar-wrap">
            <div className="adm-avatar">{admin.name?.charAt(0).toUpperCase()}</div>
            <div><div className="adm-avatar-name">{admin.name}</div><div className="adm-avatar-role">Administrator</div></div>
          </div>
        </header>
        <div className="adm-content">
          <Outlet context={{ searchQuery, stats }} />
        </div>
      </main>
    </div>
  );
}