// import React, { useState, useEffect, useContext, useRef } from "react";
// import axios from "axios";
// import { ThemeContext } from "../../context/ThemeContext";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useNavigate } from "react-router-dom";

// import "../../AdminDashboard.css"; // Ensure it's imported correctly
// import Sidebar from "../../components/Admin/Sidebar"; // Redesigned component
// import Topbar from "../../components/Admin/Topbar";   // Redesigned component
// import Overview from "./Overview"; // NEW redesigned component
// import Orders from "./Orders"; // Tinh chỉnh giao diện bên trong
// import Products from "./Products"; // Tinh chỉnh giao diện bên trong
// import Users from "./Users"; // Tinh chỉnh giao diện bên trong

// const API = "http://localhost:5000/api";

// export default function AdminDashBoard() {
//   const { theme, toggleTheme } = useContext(ThemeContext);
//   const navigate = useNavigate();
//   const isDark = theme === "dark";

//   // States
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [activeTab, setActiveTab] = useState("overview"); // overview, orders, products, users
//   const [loading, setLoading] = useState(true);
//   const [searchQuery, setSearchQuery] = useState("");

//   // Data states
//   const [stats, setStats] = useState({});
//   const [revenueChart, setRevenueChart] = useState([]);
//   const [recentOrders, setRecentOrders] = useState([]);
//   const [topProducts, setTopProducts] = useState([]);
//   const [users, setUsers] = useState([]);
//   const [allOrders, setAllOrders] = useState([]);
//   const [paymentStats, setPaymentStats] = useState([]);

//   // Logic: Kiểm tra quyền admin (Giữ nguyên)
//   const admin = (() => {
//     try {
//       const u = localStorage.getItem("user");
//       return u && u !== "undefined" ? JSON.parse(u) : null;
//     } catch (error) {
//       return null;
//     }
//   })();

//   useEffect(() => {
//     if (!admin || admin.role !== "admin") {
//       navigate("/");
//       return;
//     }
//     fetchAll();
//   }, []);

//   // Logic: Gọi API lấy toàn bộ dữ liệu (Giữ nguyên)
//   const fetchAll = async () => {
//     const user = JSON.parse(localStorage.getItem("user") || "{}");
//     if (!user || user.role !== "admin") return;
//     setLoading(true);

//     const token = localStorage.getItem("token");
//     const h = { Authorization: `Bearer ${token}` };

//     try {
//       const [s, r, ro, tp, u, ao, ps] = await Promise.all([
//         axios.get(`${API}/dashboard/stats`, { headers: h }),
//         axios.get(`${API}/dashboard/revenue-chart`, { headers: h }),
//         axios.get(`${API}/dashboard/recent-orders`, { headers: h }),
//         axios.get(`${API}/dashboard/top-products`, { headers: h }),
//         axios.get(`${API}/dashboard/users`, { headers: h }),
//         axios.get(`${API}/dashboard/orders`, { headers: h }),
//         axios.get(`${API}/dashboard/payment-stats`, { headers: h }),
//       ]);
//       setStats(s.data);
//       setRevenueChart(r.data);
//       setRecentOrders(ro.data);
//       setTopProducts(tp.data);
//       setUsers(u.data);
//       setAllOrders(ao.data);
//       setPaymentStats(ps.data);
//     } catch {
//       //toast.error("Không thể tải dữ liệu dashboard");
//     }
//     setLoading(false);
//   };

//   // Logic: Cập nhật trạng thái đơn hàng (Giữ nguyên, sẽ truyền cho Orders tab)
//   const updateOrderStatus = async (id, status) => {
//     try {
//       const token = localStorage.getItem("token");
//       await axios.put(`${API}/dashboard/orders/${id}/status`, { status }, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setAllOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
//       setRecentOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
//       toast.success("Cập nhật trạng thái thành công!");
//     } catch {
//       toast.error("Cập nhật thất bại");
//     }
//   };

//   // Logic: Đăng xuất (Giữ nguyên)
//   const handleLogout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     window.dispatchEvent(new Event("login"));
//     navigate("/");
//   };

//   if (!admin || admin.role !== "admin") return null;

//   // Lọc dữ liệu đơn hàng/sản phẩm theo Search (Giữ nguyên)
//   const filteredOrders = allOrders.filter(o => {
//     const query = searchQuery.toLowerCase();
//     return (
//       (!query || o.shipping_name?.toLowerCase().includes(query) ||
//       o.user_name?.toLowerCase().includes(query) ||
//       String(o.id).includes(query))
//     );
//   });

//   const filteredUsers = users.filter(u =>
//     !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())
//       || u.email?.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   return (
//     <div className={`adm-root${isDark ? " dark" : ""}`}>
//       {/* ══ Giao diện chính: Sidebar & Main Content ══ */}
      
//       {/* 1. SIDEBAR (Component mới được làm lại giao diện) */}
//       <Sidebar 
//         sidebarOpen={sidebarOpen} 
//         setSidebarOpen={setSidebarOpen}
//         activeTab={activeTab}
//         setActiveTab={setActiveTab}
//         navigate={navigate}
//         handleLogout={handleLogout}
//         stats={stats}
//       />

//       {/* 2. MAIN CONTENT AREA */}
//       <main className="adm-main">
//         {/* 2.1 TOPBAR (Component mới được làm lại giao diện) */}
//         <Topbar 
//           activeTab={activeTab}
//           searchQuery={searchQuery}
//           setSearchQuery={setSearchQuery}
//           fetchAll={fetchAll}
//           toggleTheme={toggleTheme}
//           isDark={isDark}
//           admin={admin}
//         />

//         {/* 2.2 PAGE CONTENT */}
//         <div className="adm-content">
//           {loading ? (
//             <div className="adm-spinner-wrap">
//               <div className="adm-spinner" />
//               <span className="adm-spinner-text">Đang tải dữ liệu...</span>
//             </div>
//           ) : (
//             <>
//               {/* ══ RENDER TAB CONTENT ══ */}
              
//               {/* Tab: TỔNG QUAN (Được thiết kế lại hoàn toàn giống hình) */}
//               {activeTab === "overview" && (
//                 <Overview 
//                   admin={admin} 
//                   stats={stats} 
//                   revenueChart={revenueChart} 
//                   recentOrders={recentOrders} 
//                   topProducts={topProducts} 
//                   paymentStats={paymentStats} 
//                   isDark={isDark}
//                   setActiveTab={setActiveTab}
//                 />
//               )}

//               {/* Tab: ĐƠN HÀNG (Sử dụng code logic cũ của bạn) */}
//               {activeTab === "orders" && (
//                 <Orders 
//                   token={localStorage.getItem("token")}
//                   fetchAll={fetchAll}
//                   isDark={isDark}
//                   updateOrderStatus={updateOrderStatus}
//                   initialOrders={filteredOrders}
//                 />
//               )}

//               {/* Tab: SẢN PHẨM (Sử dụng code logic cũ của bạn) */}
//               {activeTab === "products" && (
//                 <Products 
//                   token={localStorage.getItem("token")}
//                   isDark={isDark}
//                   searchQuery={searchQuery}
//                 />
//               )}

//               {/* Tab: NGƯỜI DÙNG (Sử dụng code logic cũ của bạn) */}
//               {activeTab === "users" && (
//                 <Users 
//                   token={localStorage.getItem("token")}
//                   isDark={isDark}
//                   users={filteredUsers}
//                 />
//               )}
//             </>
//           )}
//         </div>
//       </main>

//       <ToastContainer
//         position="top-right"
//         autoClose={1500}
//         theme={theme === "dark" ? "dark" : "light"}
//       />
//     </div>
//   );
// }


import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import Overview from "./Overview";
import Orders from "./Orders";
import Products from "./Products";
import Users from "./Users";
import AdminChat from "./AdminChat";

export default function AdminDashBoard() {
  // Logic kiểm tra quyền admin của bạn
  const admin = JSON.parse(localStorage.getItem("user") || "{}");
  if (!admin || admin.role !== "admin") return <Navigate to="/" replace />;

  return (
    <Routes>
      {/* Tất cả các trang admin đều dùng chung khung AdminLayout */}
      <Route element={<AdminLayout />}>
        {/* Khi navigate("/admin/dashboard") ở file Login, nó sẽ khớp vào đây */}
        <Route index element={<Overview />} />
        <Route path="dashboard" element={<Overview />} />
        
        {/* Các đường dẫn con khác */}
        <Route path="orders" element={<Orders />} />
        <Route path="products" element={<Products />} />
        <Route path="users" element={<Users />} />
        <Route path="chat" element={<AdminChat />} />
      </Route>
    </Routes>
  );
}