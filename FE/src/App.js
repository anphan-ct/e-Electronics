import { useContext } from "react"; // FIX: Thêm dòng này để sử dụng được useContext
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
import Search from './pages/Search';


function App() {
  // Bây giờ useContext đã được import, dòng này sẽ không còn lỗi "theme is not defined"
  const { theme } = useContext(ThemeContext);
  
  return (
    <div className={`d-flex flex-column min-vh-100 ${theme === "dark" ? "bg-dark text-light" : "bg-white"}`}>

      {/* HEADER */}
      <Header />

      {/* CONTENT */}
      <main className="flex-fill">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/search" element={<Search />} />

          {/* Admin Chat */}
          <Route path="/admin/chat" element={<AdminChat />} />
        </Routes>
      </main>

      {/* FOOTER */}
      <Footer />

      {/* Các thành phần bổ trợ luôn hiển thị hoặc ẩn hiện theo logic nội bộ */}
      <Login />
      <Register />
      <ChatBox />

      {/* THÔNG BÁO: Tự động đổi màu theo theme của MyShop */}
      <ToastContainer 
        position="top-right" 
        autoClose={1500} 
        theme={theme === "dark" ? "dark" : "light"} 
      />

    </div>
  );
}

export default App;