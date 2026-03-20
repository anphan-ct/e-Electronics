import { useEffect, useState, useContext } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { CartContext } from "../context/CartContext";
import { CheckCircle2, XCircle, AlertCircle, ShoppingBag, Home, Receipt, User } from "lucide-react";

 
function PaymentResult() {
  const { theme } = useContext(ThemeContext);
  const { clearCart } = useContext(CartContext);
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
 
  // ── Giữ nguyên toàn bộ logic gốc ─────────────────────────────
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
        .catch(() => {});
    }
  }, [status, txnRef]);
 
  const isSuccess = status === "success";
  const isFailed = status === "failed" || status === "invalid";
  // ─────────────────────────────────────────────────────────────
 
  const isDark = theme === "dark";
 
  return (
    <div className={`pr-page min-vh-100 d-flex align-items-center justify-content-center py-5 ${isDark ? "bg-dark text-light" : "pr-page-light"}`}>
      <div className="container" style={{ maxWidth: "520px" }}>
 
        <div className={`pr-card ${isDark ? "pr-card-dark" : "pr-card-light"}`}>
 
          {/* ── Icon trạng thái ─────────────────────────────── */}
          <div className={`pr-icon-wrap mb-4 ${isSuccess ? "pr-icon-success" : isFailed ? "pr-icon-failed" : "pr-icon-warning"}`}>
            {isSuccess && <CheckCircle2 size={44} />}
            {isFailed  && <XCircle      size={44} />}
            {!isSuccess && !isFailed && <AlertCircle size={44} />}
          </div>
 
          {/* ── Tiêu đề ─────────────────────────────────────── */}
          <h3 className="fw-bold mb-2 text-center">
            {isSuccess && "Thanh toán thành công!"}
            {isFailed  && "Thanh toán thất bại"}
            {!isSuccess && !isFailed && "Không xác định"}
          </h3>
 
          <p className={`text-center mb-4 ${isDark ? "text-white-50" : "text-muted"}`} style={{ fontSize: "0.95rem" }}>
            {isSuccess && "Đơn hàng đã được xác nhận. Cảm ơn bạn đã mua sắm tại E-Electronics!"}
            {isFailed  && "Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức khác."}
          </p>
 
          {/* ── Chi tiết giao dịch ──────────────────────────── */}
          {(txnRef || transactionNo || order) && (
            <div className={`pr-detail-box mb-4 ${isDark ? "pr-detail-box-dark" : "pr-detail-box-light"}`}>
              <div className="d-flex align-items-center gap-2 mb-3">
                <Receipt size={16} className="text-primary" />
                <span className="fw-bold" style={{ fontSize: "0.9rem" }}>Chi tiết giao dịch</span>
              </div>
 
              {txnRef && (
                <div className="pr-detail-row">
                  <span className={isDark ? "text-white-50" : "text-muted"}>Mã đơn hàng</span>
                  <span className="fw-bold font-monospace pr-detail-val">{txnRef}</span>
                </div>
              )}
              {transactionNo && (
                <div className="pr-detail-row">
                  <span className={isDark ? "text-white-50" : "text-muted"}>Mã giao dịch VNPay</span>
                  <span className="fw-bold font-monospace pr-detail-val">{transactionNo}</span>
                </div>
              )}
              {order && (
                <>
                  <div className="pr-detail-row">
                    <span className={isDark ? "text-white-50" : "text-muted"}>Tổng tiền</span>
                    <span className="fw-bold text-primary">${parseFloat(order.total).toFixed(2)}</span>
                  </div>
                  <div className="pr-detail-row" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: 0 }}>
                    <span className={isDark ? "text-white-50" : "text-muted"}>Người nhận</span>
                    <span className="fw-bold">{order.shipping_name}</span>
                  </div>
                </>
              )}
            </div>
          )}
 
          {/* ── Nút action ──────────────────────────────────── */}
          <div className="d-flex flex-column gap-2">
            <Link to="/" className="btn btn-auth-gradient pr-btn d-flex align-items-center justify-content-center gap-2">
              <Home size={18} /> Về trang chủ
            </Link>
            <Link to="/shop" className={`btn pr-btn d-flex align-items-center justify-content-center gap-2 ${isDark ? "btn-outline-light" : "btn-outline-dark"}`}>
              <ShoppingBag size={18} /> Tiếp tục mua sắm
            </Link>
            {isFailed && (
              <Link to="/checkout" className="btn btn-danger pr-btn fw-bold d-flex align-items-center justify-content-center gap-2">
                Thử lại thanh toán
              </Link>
            )}
          </div>
 
        </div>
      </div>
    </div>
  );
}
 
export default PaymentResult;