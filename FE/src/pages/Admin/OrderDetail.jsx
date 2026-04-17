import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { StatusBadge, LoadingSpinner } from "../../layouts/AdminUI";

const API = "http://localhost:5000/api/dashboard/orders";
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const res = await axios.get(`${API}/${id}`, auth());
        setOrder(res.data.order);
        setItems(res.data.items);
      } catch (err) {
        toast.error("Không tìm thấy dữ liệu đơn hàng");
        navigate("/admin/orders"); 
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetails();
  }, [id, navigate]);

  const updateStatus = async (newStatus) => {
    try {
      await axios.put(`${API}/${id}/status`, { status: newStatus }, auth());
      setOrder({ ...order, status: newStatus });
      toast.success("Cập nhật trạng thái thành công");
    } catch {
      toast.error("Cập nhật thất bại");
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return null;

  return (
    <div className="animate-fade-in adm-od-container">
      
      {/* ================= HEADER ================= */}
      <div className="adm-od-header">
        <div className="adm-od-header-left">
          <button 
            className="adm-od-back-btn" 
            onClick={() => navigate("/admin/orders")} 
            title="Quay lại"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <h2 className="adm-od-title">
              Đơn hàng <span className="adm-od-id-badge">#{order.id}</span>
            </h2>
            <p className="adm-od-date">
              Đặt lúc: {new Date(order.created_at).toLocaleString("vi-VN", { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* ================= 3 INFO CARDS ================= */}
      <div className="adm-od-cards-grid">
        
        {/* CARD 1: Thông tin khách hàng (Nền Icon Xanh Dương) */}
        <div className="adm-od-card">
          <div className="adm-od-card-header">
            <div className="adm-od-card-icon" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <h4 className="adm-od-card-title">Khách hàng</h4>
          </div>
          <div className="adm-od-card-content">
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Họ tên:</span>
              <strong className="adm-od-card-value">{order.user_name || "Khách vãng lai"}</strong>
            </div>
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Email:</span>
              <strong className="adm-od-card-value break-all">{order.user_email || "—"}</strong>
            </div>
          </div>
        </div>

        {/* CARD 2: Thông tin giao hàng (Nền Icon Xanh Lá) */}
        <div className="adm-od-card">
          <div className="adm-od-card-header">
            <div className="adm-od-card-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            </div>
            <h4 className="adm-od-card-title">Giao hàng</h4>
          </div>
          <div className="adm-od-card-content">
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Người nhận:</span>
              <strong className="adm-od-card-value">{order.shipping_name || "—"}</strong>
            </div>
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Điện thoại:</span>
              <strong className="adm-od-card-value">{order.shipping_phone || "—"}</strong>
            </div>
            <div className="adm-od-card-col">
              <span className="adm-od-card-label">Địa chỉ:</span>
              <strong className="adm-od-card-value line-height">{order.shipping_address || "—"}</strong>
            </div>
          </div>
        </div>

        {/* CARD 3: Trạng thái & Thanh toán (Nền Icon Tím) */}
        <div className="adm-od-card">
          <div className="adm-od-card-header">
            <div className="adm-od-card-icon" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h4 className="adm-od-card-title">Trạng thái đơn</h4>
          </div>
          <div className="adm-od-card-content">
            <div className="adm-od-card-row align-center">
              <span className="adm-od-card-label">Thanh toán ({order.payment_method}):</span>
              <StatusBadge status={order.payment_status} />
            </div>
            <div className="adm-od-card-row align-center border-top">
              <span className="adm-od-card-label">Tình trạng:</span>
              <select 
                className="adm-od-status-select"
                value={order.status}
                onChange={e => updateStatus(e.target.value)}
              >
                <option value="pending">Chờ xử lý</option>
                <option value="confirmed">Xác nhận</option>
                <option value="shipping">Đang giao</option>
                <option value="delivered">Đã giao</option>
                <option value="cancelled">Hủy đơn</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ================= DANH SÁCH SẢN PHẨM ================= */}
      <div className="adm-od-card">
        <h4 className="adm-od-section-title">
          Sản phẩm đã đặt <span className="adm-od-section-subtitle">{items.length}</span>
        </h4>
        
        <div className="adm-od-table-wrap">
          <table className="adm-od-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th style={{ textAlign: "center" }}>Số lượng</th>
                <th style={{ textAlign: "right" }}>Đơn giá</th>
                <th style={{ textAlign: "right" }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="adm-od-product-info">
                      {item.image ? (
                        <img src={`/assets/img/${item.image}`} alt={item.product_name} className="adm-od-product-img" 
                            onError={e => { e.target.src = "https://placehold.co/200x140?text=No+Image"; }}
                        />
                      ) : (
                        <div className="adm-od-product-placeholder">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </div>
                      )}
                      <span className="adm-od-product-name">{item.product_name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span className="adm-od-qty-pill">{item.quantity}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>${parseFloat(item.price).toFixed(2)}</td>
                  <td style={{ textAlign: "right" }} className="adm-od-price-total">
                    ${(item.quantity * item.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ================= TỔNG KẾT ================= */}
        <div className="adm-od-summary-section">
          <div className="adm-od-summary-box">
            <div className="adm-od-summary-row">
              <span>Tổng phụ:</span>
              <span>${parseFloat(order.total).toFixed(2)}</span>
            </div>
            <div className="adm-od-summary-row">
              <span>Phí vận chuyển:</span>
              <span>$0.00</span>
            </div>
            <div className="adm-od-summary-total-row">
              <span className="adm-od-summary-total-label">Thành tiền:</span>
              <span className="adm-od-summary-total-value">${parseFloat(order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}