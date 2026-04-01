import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import Overview from "./Overview";
import Orders from "./Orders";
import Products from "./Products";
import Users from "./Users";
import AdminChat from "./AdminChat";
import Security from "./Security";

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
        <Route path="security" element={<Security />} />
      </Route>
    </Routes>
  );
}