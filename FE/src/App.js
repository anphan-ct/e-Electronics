import { useContext } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeContext } from "./context/ThemeContext";
 
// Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import Login from "./components/Login";
import Register from "./components/Register";
import ChatBox from "./components/ChatBox";
 
// Pages
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import UserProfile from "./pages/UserProfile";
import AdminChat from "./pages/Admin/AdminChat";
import AdminDashBoard from "./pages/Admin/AdminDashBoard";
import Search from "./pages/Search";
import PaymentResult from "./pages/PaymentResult";
 
// Các trang admin không hiển thị Header/Footer
const ADMIN_PATHS = ["/admin/dashboard", "/admin/chat"];
 
function App() {
  const { theme } = useContext(ThemeContext);
  const isAdminPage = ADMIN_PATHS.some(p => window.location.pathname.startsWith(p));
 
  return (
    <div className={`d-flex flex-column min-vh-100 ${theme === "dark" ? "bg-dark text-light" : "bg-white"}`}>
 
      {/* Header & Footer ẩn trên trang admin */}
      {!isAdminPage && <Header />}
 
      <main className="flex-fill">
        <Routes>
          {/* ── Public routes ── */}
          <Route path="/"                  element={<Home />} />
          <Route path="/shop"              element={<Shop />} />
          <Route path="/product/:id"       element={<ProductDetail />} />
          <Route path="/cart"              element={<Cart />} />
          <Route path="/checkout"          element={<Checkout />} />
          <Route path="/profile"           element={<UserProfile />} />
          <Route path="/search"            element={<Search />} />
          <Route path="/checkout/result"   element={<PaymentResult />} />
 
          {/* ── Admin routes ── */}
          <Route path="/admin/dashboard"   element={<AdminDashBoard />} />
          <Route path="/admin/chat"        element={<AdminChat />} />
        </Routes>
      </main>
 
      {!isAdminPage && <Footer />}
 
      {/* Modal & ChatBox chỉ hiện ở trang user */}
      {!isAdminPage && (
        <>
          <Login />
          <Register />
          <ChatBox />
        </>
      )}
 
      <ToastContainer
        position="top-right"
        autoClose={1500}
        theme={theme === "dark" ? "dark" : "light"}
      />
    </div>
  );
}
 
export default App; 