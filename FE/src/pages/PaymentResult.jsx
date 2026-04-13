import { useEffect, useState, useContext } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { CartContext } from "../context/CartContext";
import { 
  CheckCircle2, XCircle, AlertCircle, ShoppingBag, 
  Home, Receipt, Ticket, Coins, Star 
} from "lucide-react";

function PaymentResult() {
  const { theme } = useContext(ThemeContext);
  const { clearCart } = useContext(CartContext);
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);

  // ── Logic lấy thông tin VNPay ─────────────────────────────
  const status = searchParams.get("status");
  const txnRef = searchParams.get("txnRef");
  const transactionNo = searchParams.get("transactionNo");

  useEffect(() => {
    if (status === "success") {
      clearCart();
    }
    if (txnRef) {
      const token = localStorage.getItem("token");
      axios
        .get(`http://localhost:5000/api/vnpay/order/${txnRef}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setOrder(res.data))
        .catch((err) => console.error("Lỗi lấy thông tin đơn hàng:", err));
    }
  }, [status, txnRef, clearCart]);

  const isSuccess = status === "success";
  const isFailed = status === "failed" || status === "invalid";
  const isDark = theme === "dark";

  return (
    <div className={`pr-page min-vh-100 d-flex align-items-center justify-content-center py-5 ${isDark ? "bg-dark text-light" : "pr-page-light"}`}>
      <div className="container" style={{ maxWidth: "520px" }}>

        <div className={`pr-card shadow-lg rounded-4 p-4 ${isDark ? "pr-card-dark bg-secondary bg-opacity-10 border border-secondary" : "pr-card-light bg-white"}`}>

          {/* ── Icon trạng thái ─────────────────────────────── */}
          <div className="d-flex justify-content-center mb-3">
            <div className={`rounded-circle d-flex align-items-center justify-content-center p-3 ${isSuccess ? "bg-success bg-opacity-10 text-success" : isFailed ? "bg-danger bg-opacity-10 text-danger" : "bg-warning bg-opacity-10 text-warning"}`}>
              {isSuccess && <CheckCircle2 size={50} />}
              {isFailed  && <XCircle      size={50} />}
              {!isSuccess && !isFailed && <AlertCircle size={50} />}
            </div>
          </div>

          {/* ── Tiêu đề ─────────────────────────────────────── */}
          <h3 className="fw-bold mb-2 text-center">
            {isSuccess && "Thanh toán thành công!"}
            {isFailed  && "Thanh toán thất bại"}
            {!isSuccess && !isFailed && "Trạng thái không xác định"}
          </h3>

          <p className={`text-center mb-4 ${isDark ? "text-white-50" : "text-muted"}`} style={{ fontSize: "0.95rem" }}>
            {isSuccess && "Đơn hàng đã được xác nhận. Cảm ơn bạn đã mua sắm tại E-Electronics!"}
            {isFailed  && "Giao dịch không thành công. Điểm thưởng và Voucher của bạn (nếu có) đã được hoàn lại vào ví."}
          </p>

          {/* ── Chi tiết giao dịch ──────────────────────────── */}
          {(txnRef || transactionNo || order) && (
            <div className={`pr-detail-box mb-4 p-3 rounded-3 ${isDark ? "pr-detail-box-dark bg-dark border border-secondary" : "pr-detail-box-light bg-light border"}`}>
              <div className="d-flex align-items-center gap-2 mb-3 border-bottom pb-2" style={{ borderColor: isDark ? '#4b5563' : '#e5e7eb' }}>
                <Receipt size={18} className="text-primary" />
                <span className="fw-bold" style={{ fontSize: "1rem" }}>Chi tiết giao dịch</span>
              </div>

              {txnRef && (
                <div className="d-flex justify-content-between mb-2">
                  <span className={isDark ? "text-white-50" : "text-muted"}>Mã đơn hàng:</span>
                  <span className="fw-bold font-monospace">{txnRef}</span>
                </div>
              )}
              {transactionNo && (
                <div className="d-flex justify-content-between mb-2">
                  <span className={isDark ? "text-white-50" : "text-muted"}>Mã VNPay:</span>
                  <span className="fw-bold font-monospace">{transactionNo}</span>
                </div>
              )}

              {order && (
                <>
                  <div className="d-flex justify-content-between mb-2">
                    <span className={isDark ? "text-white-50" : "text-muted"}>Người nhận:</span>
                    <span className="fw-bold">{order.shipping_name}</span>
                  </div>

                  {/* Hiển thị Voucher đã dùng */}
                  {order.voucher_code && (
                    <div className="d-flex justify-content-between mb-2">
                      <span className={isDark ? "text-white-50" : "text-muted"}>Voucher áp dụng:</span>
                      <span className="fw-bold text-success d-flex align-items-center gap-1">
                        <Ticket size={14} /> {order.voucher_code} (-${parseFloat(order.discount_from_voucher || 0).toFixed(2)})
                      </span>
                    </div>
                  )}

                  {/* Hiển thị Điểm đã dùng */}
                  {order.points_used > 0 && (
                    <div className="d-flex justify-content-between mb-2">
                      <span className={isDark ? "text-white-50" : "text-muted"}>Dùng điểm đổi:</span>
                      <span className="fw-bold text-warning d-flex align-items-center gap-1">
                        <Coins size={14} /> {order.points_used} điểm (-${parseFloat(order.discount_from_points || 0).toFixed(2)})
                      </span>
                    </div>
                  )}

                  <div className="d-flex justify-content-between mb-3 mt-2 pt-2 border-top" style={{ borderColor: isDark ? '#4b5563' : '#e5e7eb' }}>
                    <span className="fw-bold">Tổng thanh toán:</span>
                    <span className="fw-bold text-primary fs-5">${parseFloat(order.total).toFixed(2)}</span>
                  </div>

                  {/* Hiển thị Điểm Tích Lũy Nhận Được (Chỉ khi success) */}
                  {isSuccess && order.points_earned > 0 && (
                    <div 
                      className="d-flex justify-content-between align-items-center p-2 rounded-3 mt-2" 
                      style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5', border: '1px dashed #10b981' }}
                    >
                      <span className="fw-bold text-success d-flex align-items-center gap-2">
                        <Star size={16} fill="#10b981" /> Điểm thưởng nhận được:
                      </span>
                      <span className="fw-bold text-success fs-6">+{order.points_earned} điểm</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Nút action ──────────────────────────────────── */}
          <div className="d-flex flex-column gap-2">
            {isSuccess && (
              <Link to="/profile" className="btn btn-primary fw-bold d-flex align-items-center justify-content-center gap-2">
                <Receipt size={18} /> Xem đơn hàng của tôi
              </Link>
            )}
            
            {isFailed && (
              <Link to="/checkout" className="btn btn-danger fw-bold d-flex align-items-center justify-content-center gap-2">
                <AlertCircle size={18} /> Thử thanh toán lại
              </Link>
            )}

            <Link to="/shop" className={`btn fw-bold d-flex align-items-center justify-content-center gap-2 ${isDark ? "btn-outline-light" : "btn-outline-dark"}`}>
              <ShoppingBag size={18} /> Tiếp tục mua sắm
            </Link>

            <Link to="/" className="btn btn-link text-decoration-none text-muted d-flex align-items-center justify-content-center gap-2 mt-2">
              <Home size={16} /> Về trang chủ
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default PaymentResult;