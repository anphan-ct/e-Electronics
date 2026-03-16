import { useContext, useEffect, useLayoutEffect } from "react";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";
import { Link } from "react-router-dom";

function Cart() {
  const { cart, removeFromCart, clearCart, updateQuantity } = useContext(CartContext);
  const { theme } = useContext(ThemeContext);

  // --- LƯU VỊ TRÍ CUỘN CHUỘT ---
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('cart_scroll_pos', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- PHỤC HỒI VỊ TRÍ CUỘN ---
  useLayoutEffect(() => {
    const savedScrollPos = sessionStorage.getItem('cart_scroll_pos');
    if (savedScrollPos && cart.length > 0) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPos));
      }, 50); // Dữ liệu cart tải nhanh hơn API nên timeout có thể để ngắn (50ms)
    }
  }, [cart.length]);

  // Tính tổng tiền dựa trên giá và số lượng
  const total = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  return (
    <div className={`container py-5 min-vh-100 ${theme === "dark" ? "text-light" : "text-dark"}`}>
      <h2 className="mb-5 fw-bold">
        Giỏ hàng <span className="text-primary">({cart.length})</span>
      </h2>

      {cart.length === 0 ? (
        <div className={`text-center py-5 shadow-sm auth-modal-content border ${theme === "dark" ? "bg-dark border-secondary" : "bg-white border-light-subtle"}`}>
          <div className="fs-1 mb-3">🛒</div>
          <h4 className={theme === "dark" ? "text-white-50" : "text-muted"}>Giỏ hàng đang trống</h4>
          <Link to="/shop" className="btn btn-auth-gradient px-5 py-2 mt-3 fw-bold shadow">
            TIẾP TỤC MUA SẮM
          </Link>
        </div>
      ) : (
        <div className="row g-5">
          {/* CỘT TRÁI: DANH SÁCH SẢN PHẨM */}
          <div className="col-lg-8">
            <div className={`shadow-sm auth-modal-content overflow-hidden border ${
              theme === "dark" ? "bg-dark border-secondary" : "bg-white border-light-subtle"
            }`}>
              
              <div className="table-responsive custom-scrollbar" style={{ maxHeight: "480px", overflowY: "auto" }}>
                <table className={`table align-middle mb-0 ${theme === "dark" ? "table-dark" : "table-hover"}`}>
                  <thead className={`sticky-top ${theme === "dark" ? "bg-dark shadow-sm" : "bg-white shadow-sm border-bottom"}`} style={{ zIndex: 10 }}>
                    <tr className={theme === "dark" ? "border-secondary" : ""}>
                      <th className="border-0 ps-4 py-4">SẢN PHẨM</th>
                      <th className="border-0 text-center">SỐ LƯỢNG</th>
                      <th className="border-0">GIÁ</th>
                      <th className="border-0 text-center pe-4">XÓA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => (
                      <tr key={item.id} className={theme === "dark" ? "border-secondary" : "border-light"}>
                        <td className="ps-4 py-4">
                          <div className="d-flex align-items-center">
                            {/* Bọc ảnh bằng Link để có thể nhấn vào xem Detail */}
                            <Link to={`/product/${item.id}`} className="text-decoration-none">
                                <div className={`${theme === "dark" ? "bg-secondary" : "bg-light"} rounded-3 me-3 d-flex align-items-center justify-content-center shadow-sm overflow-hidden`} style={{ width: "55px", height: "55px", fontSize: "1.3rem" }}>
                                  {item.image ? <img src={`/assets/img/${item.image}`} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                                </div>
                            </Link>
                            <Link to={`/product/${item.id}`} className={`text-decoration-none ${theme === "dark" ? "text-light" : "text-dark"}`}>
                                <span className="fw-bold fs-6">{item.name}</span>
                            </Link>
                          </div>
                        </td>
                        <td className="text-center">
                          <div className={`d-inline-flex align-items-center rounded-pill p-1 shadow-sm border ${theme === "dark" ? "bg-secondary border-secondary" : "bg-light border-light-subtle"}`}>
                            <button 
                              className={`btn btn-sm rounded-circle fw-bold d-flex align-items-center justify-content-center ${theme === "dark" ? "btn-dark text-info" : "btn-white shadow-sm text-primary"}`} 
                              style={{ width: "28px", height: "28px" }}
                              onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                            >-</button>
                            <span className={`mx-3 fw-bold ${theme === "dark" ? "text-white" : "text-dark"}`}>{item.quantity || 1}</span>
                            <button 
                              className={`btn btn-sm rounded-circle fw-bold d-flex align-items-center justify-content-center ${theme === "dark" ? "btn-dark text-info" : "btn-white shadow-sm text-primary"}`} 
                              style={{ width: "28px", height: "28px" }}
                              onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                            >+</button>
                          </div>
                        </td>
                        <td className="fw-bold text-primary fs-5">${item.price}</td>
                        <td className="text-center pe-4">
                          <button className="btn btn-link text-danger p-0 text-decoration-none transition-all hover-scale" onClick={() => removeFromCart(item.id)}>
                            <span className="fs-5">🗑️</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CART FOOTER */}
              <div className={`p-3 border-top d-flex justify-content-between align-items-center ${theme === "dark" ? "bg-dark border-secondary" : "bg-light border-light-subtle"}`}>
                <Link to="/shop" className="text-decoration-none fw-bold text-primary px-3 hover-link">← Tiếp tục thêm đồ</Link>
                <button 
                  className="btn btn-sm btn-outline-danger border-0 fw-bold px-3 transition-all" 
                  onClick={() => clearCart && clearCart()}
                >
                  Xóa tất cả giỏ hàng
                </button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: TỔNG KẾT ĐƠN HÀNG */}
          <div className="col-lg-4">
            <div className={`p-4 shadow-lg auth-modal-content sticky-top border ${
              theme === "dark" ? "bg-dark border-secondary text-light" : "bg-white border-light-subtle text-dark"
            }`} style={{ top: "100px" }}>
              <h5 className="fw-bold mb-4 border-bottom pb-3">Tóm tắt đơn hàng</h5>
              
              <div className="d-flex justify-content-between mb-3 align-items-center">
                <span className={theme === "dark" ? "text-white-50" : "text-muted"}>Tổng sản phẩm:</span>
                <span className="fw-bold fs-5">{cart.length}</span>
              </div>
              
              <div className="d-flex justify-content-between mb-4 align-items-center">
                <span className={theme === "dark" ? "text-white-50" : "text-muted"}>Vận chuyển:</span>
                <span className="text-success fw-bold">Free</span>
              </div>
              
              <hr className={theme === "dark" ? "border-secondary" : "border-light"} />
              
              <div className="d-flex justify-content-between align-items-center mb-4 pt-2">
                <span className="fs-5 fw-semibold">Tổng tiền:</span>
                <span className="fs-3 fw-bold text-primary">${total.toFixed(2)}</span>
              </div>

              <Link to="/checkout" className="btn btn-auth-gradient w-100 py-3 fw-bold shadow-lg text-uppercase tracking-wider">
                THANH TOÁN NGAY
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;