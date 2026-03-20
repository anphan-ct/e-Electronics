import { useContext, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { CartContext } from "../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  MapPin, CreditCard, Truck, ShoppingBag,
  ShieldCheck, ChevronRight, CheckCircle2, Circle, Loader2, Lock
} from "lucide-react";
import "../Checkout.css";
 
function Checkout() {
  const { theme } = useContext(ThemeContext);
  const { cart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
 
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", address: "" });
 
  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const total = subtotal;
 
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      return toast.error("Vui lòng điền đầy đủ thông tin giao hàng!");
    }
    if (cart.length === 0) {
      return toast.error("Giỏ hàng của bạn đang trống!");
    }
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return toast.error("Vui lòng đăng nhập!");
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      if (paymentMethod === "cod") {
        toast.success("Đặt hàng thành công! Chúng tôi sẽ liên hệ sớm.");
        clearCart();
        navigate("/");
      } else {
        const res = await axios.post(
          "http://localhost:5000/api/vnpay/create-payment",
          {
            userId: user.id,
            amount: total,
            orderInfo: `Thanh toan ${cart.length} san pham MyShop`,
            items: cart.map((item) => ({ id: item.id, quantity: item.quantity || 1, price: item.price })),
            shippingName: formData.name,
            shippingPhone: formData.phone,
            shippingAddress: formData.address,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        window.location.href = res.data.paymentUrl;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Có lỗi xảy ra, thử lại nhé!");
    } finally {
      setLoading(false);
    }
  };
 
  const isDark = theme === "dark";
 
  return (
    <div className={`co-page py-5 min-vh-100 ${isDark ? "text-light" : "text-dark"}`}>
      <div className="container">
 
        {/* Header */}
        <div className="d-flex align-items-center gap-3 mb-5">
          <div className="btn-auth-gradient p-3 rounded-4 shadow-sm">
            <ShieldCheck size={26} color="white" />
          </div>
          <div>
            <h3 className="fw-bold mb-0">Thanh toán đơn hàng</h3>
            <p className={`mb-0 small ${isDark ? "text-white-50" : "text-muted"}`}>
              Kiểm tra thông tin trước khi đặt hàng
            </p>
          </div>
        </div>
 
        <form onSubmit={handleSubmit}>
          <div className="row g-4">
 
            {/* ── Cột trái ─────────────────────────────────────── */}
            <div className="col-lg-7">
 
              {/* THÔNG TIN NHẬN HÀNG */}
              <div className={`co-card mb-4 ${isDark ? "co-card-dark" : "co-card-light"}`}>
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="co-step">1</div>
                  <div>
                    <h6 className="fw-bold mb-0">Thông tin nhận hàng</h6>
                    <small className={isDark ? "text-white-50" : "text-muted"}>Địa chỉ sẽ được dùng để giao hàng</small>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className={`form-label small fw-semibold mb-1 ${isDark ? "text-white-50" : "text-muted"}`}>Họ và tên</label>
                    <input type="text" name="name"
                      className={`co-input form-control py-3 px-3 ${isDark ? "co-input-dark" : ""}`}
                      placeholder="Tên người nhận"
                      value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="col-md-6">
                    <label className={`form-label small fw-semibold mb-1 ${isDark ? "text-white-50" : "text-muted"}`}>Số điện thoại</label>
                    <input type="tel" name="phone"
                      className={`co-input form-control py-3 px-3 ${isDark ? "co-input-dark" : ""}`}
                      placeholder="09xx xxx xxx"
                      value={formData.phone} onChange={handleChange} required />
                  </div>
                  <div className="col-12">
                    <label className={`form-label small fw-semibold mb-1 ${isDark ? "text-white-50" : "text-muted"}`}>Địa chỉ giao hàng</label>
                    <textarea name="address"
                      className={`co-input form-control py-3 px-3 ${isDark ? "co-input-dark" : ""}`}
                      rows="3"
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                      value={formData.address} onChange={handleChange} required />
                  </div>
                </div>
              </div>
 
              {/* PHƯƠNG THỨC THANH TOÁN */}
              <div className={`co-card ${isDark ? "co-card-dark" : "co-card-light"}`}>
                <div className="d-flex align-items-center gap-3 mb-4">
                  <div className="co-step">2</div>
                  <div>
                    <h6 className="fw-bold mb-0">Phương thức thanh toán</h6>
                    <small className={isDark ? "text-white-50" : "text-muted"}>Chọn hình thức thanh toán phù hợp</small>
                  </div>
                </div>
                <div className="d-flex flex-column gap-3">
 
                  {/* COD */}
                  <div className={`co-payment ${paymentMethod === "cod" ? "co-payment-cod" : isDark ? "co-payment-dark" : "co-payment-light"}`}
                    onClick={() => setPaymentMethod("cod")}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <div className={`co-payment-icon ${paymentMethod === "cod" ? "co-payment-icon-active-cod" : isDark ? "bg-secondary bg-opacity-25" : "bg-light"}`}>
                          <Truck size={20} className={paymentMethod === "cod" ? "text-primary" : "text-muted"} />
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: "0.95rem" }}>Thanh toán khi nhận hàng (COD)</div>
                          <div className={`small ${isDark ? "text-white-50" : "text-muted"}`}>Trả tiền mặt khi nhận hàng tại nhà</div>
                        </div>
                      </div>
                      {paymentMethod === "cod"
                        ? <CheckCircle2 size={22} className="text-primary" />
                        : <Circle size={22} className={isDark ? "text-white-50" : "text-muted"} />}
                    </div>
                  </div>
 
                  {/* VNPAY */}
                  <div className={`co-payment ${paymentMethod === "vnpay" ? "co-payment-vnpay" : isDark ? "co-payment-dark" : "co-payment-light"}`}
                    onClick={() => setPaymentMethod("vnpay")}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <div className={`co-payment-icon ${paymentMethod === "vnpay" ? "co-payment-icon-active-vnpay" : isDark ? "bg-secondary bg-opacity-25" : "bg-light"}`}>
                          <span className="co-vnpay-badge">VNPay</span>
                        </div>
                        <div>
                          <div className="fw-bold" style={{ fontSize: "0.95rem" }}>Thanh toán qua VNPay</div>
                          <div className={`small ${isDark ? "text-white-50" : "text-muted"}`}>ATM, Visa, MasterCard, QR Code, Ví điện tử</div>
                        </div>
                      </div>
                      {paymentMethod === "vnpay"
                        ? <CheckCircle2 size={22} className="co-vnpay-check" />
                        : <Circle size={22} className={isDark ? "text-white-50" : "text-muted"} />}
                    </div>
                  </div>
 
                </div>
              </div>
            </div>
 
            {/* ── Cột phải: Tóm tắt ────────────────────────────── */}
            <div className="col-lg-5">
              <div className={`co-card ${isDark ? "co-card-dark" : "co-card-light"}`}>
 
                <div className="d-flex align-items-center gap-2 mb-4 pb-3 border-bottom">
                  <ShoppingBag size={20} className="text-primary" />
                  <h6 className="fw-bold mb-0">Tóm tắt đơn hàng</h6>
                  <span className="badge bg-primary rounded-pill ms-auto">{cart.length} sản phẩm</span>
                </div>
 
                {/* Danh sách sản phẩm */}
                <div className="mb-3 custom-scrollbar" style={{ maxHeight: "220px", overflowY: "auto" }}>
                  {cart.map((item) => (
                    <div key={item.id} className={`co-product-row d-flex align-items-center gap-3 mb-2 ${isDark ? "co-product-row-dark" : ""}`}>
                      <div className={`rounded-3 overflow-hidden flex-shrink-0 ${isDark ? "bg-secondary" : "bg-light"}`}
                        style={{ width: "48px", height: "48px" }}>
                        {item.image
                          ? <img src={`/assets/img/${item.image}`} alt={item.name} className="w-100 h-100 object-fit-cover" />
                          : <div className="w-100 h-100 d-flex align-items-center justify-content-center">📦</div>}
                      </div>
                      <div className="flex-grow-1 min-width-0">
                        <div className="fw-semibold text-truncate" style={{ fontSize: "0.88rem" }}>{item.name}</div>
                        <div className={`small ${isDark ? "text-white-50" : "text-muted"}`}>x{item.quantity || 1}</div>
                      </div>
                      <div className="fw-bold text-primary flex-shrink-0" style={{ fontSize: "0.9rem" }}>
                        ${(item.price * (item.quantity || 1)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
 
                {/* Tổng tiền */}
                <div className={`co-total-box rounded-3 mb-3 ${isDark ? "co-total-box-dark" : "bg-light"}`}>
                  <div className="d-flex justify-content-between mb-2">
                    <span className={`small ${isDark ? "text-white-50" : "text-muted"}`}>Tạm tính</span>
                    <span className="fw-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className={`small ${isDark ? "text-white-50" : "text-muted"}`}>Phí vận chuyển</span>
                    <span className="fw-semibold text-success">Miễn phí</span>
                  </div>
                  <hr className={`my-2 ${isDark ? "border-secondary" : ""}`} />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Tổng cộng</span>
                    <span className="fw-bold text-primary fs-5">${total.toFixed(2)}</span>
                  </div>
                </div>
 
                {/* Nút submit */}
                <button type="submit"
                  className="btn btn-auth-gradient w-100 co-submit-btn d-flex align-items-center justify-content-center gap-2"
                  disabled={loading}>
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</>
                  ) : paymentMethod === "vnpay" ? (
                    <><span className="co-vnpay-badge-btn">VNPay</span> Thanh toán ngay <ChevronRight size={18} /></>
                  ) : (
                    <>XÁC NHẬN ĐẶT HÀNG <ChevronRight size={18} /></>
                  )}
                </button>
 
                <div className={`co-security mt-2 ${isDark ? "text-white-50" : "text-muted"}`}>
                  <Lock size={11} />
                  <span>Thông tin được mã hoá và bảo mật</span>
                </div>
 
                <Link to="/cart" className={`btn btn-link w-100 mt-1 text-decoration-none small fw-semibold text-center d-block ${isDark ? "text-white-50" : "text-muted"}`}>
                  ← Quay lại giỏ hàng
                </Link>
              </div>
            </div>
 
          </div>
        </form>
      </div>
    </div>
  );
}
 
export default Checkout;