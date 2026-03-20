import { useContext, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { CartContext } from "../context/CartContext";
import { Link } from "react-router-dom";
// Thêm CheckCircle2 và Circle để xử lý biểu tượng radio
import { MapPin, Phone, User, CreditCard, Truck, ShoppingBag, ShieldCheck, ChevronRight, CheckCircle2, Circle } from "lucide-react";

function Checkout() {
  const { theme } = useContext(ThemeContext);
  const { cart } = useContext(CartContext);
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  const shippingFee = 0; 
  const total = subtotal + shippingFee;

  const inputClass = `form-control auth-input py-3 ${
    theme === "dark" ? "bg-secondary text-white border-0" : "bg-light border-light-subtle"
  }`;

  const cardClass = `card border-0 shadow-lg mb-4 ${
    theme === "dark" ? "bg-dark border border-secondary" : "bg-white"
  }`;

  return (
    <div className={`py-5 min-vh-100 ${theme === "dark" ? "text-light" : "text-dark"}`}>
      <div className="container">
        <div className="d-flex align-items-center gap-3 mb-5">
          <div className="btn-auth-gradient p-3 rounded-4 shadow-sm">
            <ShieldCheck size={28} color="white" />
          </div>
          <div>
            <h2 className="fw-bold mb-0">Thanh toán đơn hàng</h2>
            <p className={`mb-0 small ${theme === 'dark' ? 'text-white-50' : 'text-muted'}`}>Vui lòng kiểm tra lại thông tin trước khi đặt hàng</p>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            {/* THÔNG TIN NHẬN HÀNG */}
            <div className={cardClass} style={{ borderRadius: '25px' }}>
              <div className="card-body p-4 p-md-5">
                <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                  <MapPin size={22} className="text-primary" /> Thông tin nhận hàng
                </h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold opacity-75">Họ và tên</label>
                    <input type="text" className={inputClass} placeholder="Nhập họ và tên người nhận" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold opacity-75">Số điện thoại</label>
                    <input type="tel" className={inputClass} placeholder="Nhập số điện thoại liên lạc" required />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold opacity-75">Địa chỉ giao hàng</label>
                    <textarea className={inputClass} rows="3" placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." required></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* PHƯƠNG THỨC THANH TOÁN */}
            <div className={cardClass} style={{ borderRadius: '25px' }}>
              <div className="card-body p-4 p-md-5">
                <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                  <CreditCard size={22} className="text-primary" /> Phương thức thanh toán
                </h5>
                <div className="d-flex flex-column gap-3">
                  {/* COD Option */}
                  <label className={`p-4 rounded-4 border transition-all cursor-pointer ${
                    paymentMethod === "cod" 
                      ? "border-primary bg-primary bg-opacity-10" 
                      : (theme === 'dark' ? 'border-secondary' : 'border-light-subtle')
                  }`} onClick={() => setPaymentMethod("cod")}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <Truck size={24} className={paymentMethod === "cod" ? "text-primary" : "text-muted"} />
                        <div>
                          <div className="fw-bold">Thanh toán khi nhận hàng (COD)</div>
                          <div className="small opacity-75">Thanh toán bằng tiền mặt khi nhận hàng tại nhà</div>
                        </div>
                      </div>
                      {/* FIX BIỂU TƯỢNG CHO DARK MODE */}
                      <div>
                        {paymentMethod === "cod" 
                          ? <CheckCircle2 size={24} className="text-primary" /> 
                          : <Circle size={24} className={theme === 'dark' ? 'text-white-50' : 'text-muted'} />
                        }
                      </div>
                    </div>
                  </label>

                  {/* ONLINE Option */}
                  <label className={`p-4 rounded-4 border transition-all cursor-pointer ${
                    paymentMethod === "online" 
                      ? "border-primary bg-primary bg-opacity-10" 
                      : (theme === 'dark' ? 'border-secondary' : 'border-light-subtle')
                  }`} onClick={() => setPaymentMethod("online")}>
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <CreditCard size={24} className={paymentMethod === "online" ? "text-primary" : "text-muted"} />
                        <div>
                          <div className="fw-bold">Thanh toán Online</div>
                          <div className="small opacity-75">Thanh toán qua ví điện tử hoặc thẻ ngân hàng (VNPay/Momo)</div>
                        </div>
                      </div>
                      {/* FIX BIỂU TƯỢNG CHO DARK MODE */}
                      <div>
                        {paymentMethod === "online" 
                          ? <CheckCircle2 size={24} className="text-primary" /> 
                          : <Circle size={24} className={theme === 'dark' ? 'text-white-50' : 'text-muted'} />
                        }
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* TÓM TẮT ĐƠN HÀNG (ĐÃ BỎ STICKY) */}
          <div className="col-lg-4">
            <div className={cardClass} style={{ borderRadius: '25px' }}>
              <div className="card-body p-4">
                <h5 className="fw-bold mb-4 d-flex align-items-center gap-2 border-bottom pb-3">
                  <ShoppingBag size={22} className="text-primary" /> Tóm tắt đơn hàng
                </h5>
                
                <div className="custom-scrollbar mb-4" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {cart.map((item) => (
                    <div key={item.id} className="d-flex align-items-center gap-3 mb-3">
                      <div className={`rounded-3 overflow-hidden ${theme === 'dark' ? 'bg-secondary' : 'bg-light'}`} style={{ width: '50px', height: '50px', flexShrink: 0 }}>
                        {item.image ? <img src={`/assets/img/${item.image}`} alt={item.name} className="w-100 h-100 object-fit-cover" /> : <div className="w-100 h-100 d-flex align-items-center justify-content-center">📦</div>}
                      </div>
                      <div className="flex-grow-1 min-width-0">
                        <div className="fw-bold small text-truncate">{item.name}</div>
                        <div className="small opacity-75">Số lượng: {item.quantity || 1}</div>
                      </div>
                      <div className="fw-bold small text-primary">${(item.price * (item.quantity || 1)).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="opacity-75">Tạm tính:</span>
                  <span className="fw-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between mb-3">
                  <span className="opacity-75">Phí vận chuyển:</span>
                  <span className="text-success fw-bold">Miễn phí</span>
                </div>
                <hr className={theme === 'dark' ? 'border-secondary' : ''} />
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <span className="fs-5 fw-bold">Tổng cộng:</span>
                  <span className="fs-3 fw-bold text-primary">${total.toFixed(2)}</span>
                </div>

                <button className="btn btn-auth-gradient w-100 py-3 fw-bold shadow-lg rounded-pill d-flex align-items-center justify-content-center gap-2">
                  XÁC NHẬN ĐẶT HÀNG <ChevronRight size={18} />
                </button>
                <Link to="/cart" className="btn btn-link w-100 mt-2 text-decoration-none small opacity-75 fw-bold text-center d-block">Quay lại giỏ hàng</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;