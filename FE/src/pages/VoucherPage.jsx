// FE/src/pages/VoucherPage.jsx
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Ticket, ShoppingBag, Star } from "lucide-react";
import VoucherWallet from "../components/VoucherWallet";
import "../voucher.css";

export default function VoucherPage() {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const navigate = useNavigate();

  return (
    <div className={`min-vh-100 py-5 ${isDark ? "bg-dark text-light" : ""}`}>
      <div className="container vp-container">

        {/* Hero */}
        <div className="rounded-4 p-4 mb-4 text-white position-relative overflow-hidden vp-hero-card">
          
          {/* Vòng tròn trang trí background */}
          <div className="vp-hero-circle" />

          <div className="d-flex align-items-center gap-3 mb-2">
            <Ticket size={26} fill="rgba(255,255,255,0.3)" color="#fff" />
            <h4 className="fw-bold mb-0">Trung tâm Voucher</h4>
          </div>
          
          <p className="mb-3 opacity-75 vp-text-sm">
            Quản lý voucher giảm giá và đổi điểm thưởng để nhận ưu đãi độc quyền.
          </p>

          <div className="d-flex gap-3 flex-wrap">
            <button
              className="btn btn-light fw-bold px-4 rounded-pill vp-btn-light"
              onClick={() => navigate("/loyalty")}
            >
              <Star size={14} className="me-1" fill="#6366f1" />
              Xem điểm tích lũy
            </button>
            <button
              className="btn fw-bold px-4 rounded-pill vp-btn-outline"
              onClick={() => navigate("/shop")}
            >
              <ShoppingBag size={14} className="me-1" />
              Mua hàng dùng voucher
            </button>
          </div>
        </div>

        {/* Wallet Component */}
        <VoucherWallet compact={false} />

      </div>
    </div>
  );
}