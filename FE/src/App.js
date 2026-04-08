import { useContext } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ThemeContext } from "./context/ThemeContext";

// Import Layout mới
import UserLayout from "./components/layouts/UserLayout";

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
import AdminLayout from "./layouts/AdminLayout";
import Orders from "./pages/Admin/Orders";
import Products from "./pages/Admin/Products";
import Users from "./pages/Admin/Users";
import Overview from "./pages/Admin/Overview";
import LoyaltyPage from "./pages/LoyaltyPage";
import { useEffect } from "react";



function App() {
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
  console.log("ORIGIN:", window.location.origin);
}, []);

  return (
    <div className={`d-flex flex-column min-vh-100 ${theme === "dark" ? "bg-dark text-light" : "bg-white"}`}>
      
      <Routes>
        {/* ── NHÓM CÁC TRANG USER (CÓ HEADER/FOOTER) ── */}
        <Route element={<UserLayout />}>
          <Route path="/"                  element={<Home />} />
          <Route path="/shop"              element={<Shop />} />
          <Route path="/product/:id"       element={<ProductDetail />} />
          <Route path="/cart"              element={<Cart />} />
          <Route path="/checkout"          element={<Checkout />} />
          <Route path="/profile"           element={<UserProfile />} />
          <Route path="/search"            element={<Search />} />
          <Route path="/checkout/result"   element={<PaymentResult />} />
          <Route path="/loyalty"           element={<LoyaltyPage />} />
        </Route>

        {/* ── NHÓM CÁC TRANG ADMIN (KHÔNG CÓ HEADER/FOOTER USER) ── */}
        <Route path="/admin/*" element={<AdminDashBoard />} />

      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={1500}
        theme={theme === "dark" ? "dark" : "light"}
      />
    </div>
  );
}

export default App;