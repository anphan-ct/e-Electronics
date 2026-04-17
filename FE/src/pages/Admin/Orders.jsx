import { useState, useEffect } from "react";
import axios from "axios";
import { useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { StatusBadge, LoadingSpinner } from "../../layouts/AdminUI";

const API = "http://localhost:5000/api/dashboard/orders";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const FILTER_OPTIONS = [
  { label: "Tất cả", val: "all" },
  { label: "Chờ xử lý", val: "pending" },
  { label: "Xác nhận", val: "confirmed" },
  { label: "Đang giao", val: "shipping" },
  { label: "Đã giao", val: "delivered" },
  { label: "Đã hủy", val: "cancelled" },
];

export default function Order() {
  const { searchQuery = "" } = useOutletContext() || {};
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, { headers: auth() });
      setOrders(res.data);
    } catch { toast.error("Lỗi tải đơn hàng"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API}/${id}/status`, { status }, { headers: auth() });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      toast.success("Cập nhật trạng thái thành công");
    } catch { toast.error("Cập nhật thất bại"); }
  };

  const pendingCount = orders.filter(o => o.status === "pending").length;

  const filtered = orders.filter(o => {
    const q = searchQuery.toLowerCase();
    const matchSearch = String(o.id).includes(q) ||
      (o.shipping_name || "").toLowerCase().includes(q) ||
      (o.user_name || "").toLowerCase().includes(q) ||
      (o.user_email || "").toLowerCase().includes(q);
    const matchFilter = filter === "all" || o.status === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div className="adm-tab-header">
        <div>
          <h2 className="adm-tab-title">Quản lý đơn hàng</h2>
          <p className="adm-tab-count">{filtered.length} đơn hàng được tìm thấy</p>
        </div>
        <div className="adm-filter-row">
          {FILTER_OPTIONS.map(f => (
            <button key={f.val}
              className={`adm-filter-btn${filter === f.val ? " active" : ""}`}
              onClick={() => setFilter(f.val)}>
              {f.label}
              {f.val === "pending" && pendingCount > 0 && (
                <span className="adm-nav-badge" style={{ marginLeft: 6 }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="adm-table-wrap">
        <div style={{ overflowX: "auto" }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>#ID</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr 
                  key={o.id}
                  // 1. Thêm sự kiện click cho cả dòng
                  onClick={() => navigate(`/admin/orders/${o.id}`)}
                  style={{ cursor: "pointer", transition: "background 0.2s" }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <td><span className="adm-order-id">#{o.id}</span></td>
                  <td>
                    <div className="adm-cell-name">{o.shipping_name || o.user_name || "—"}</div>
                    <div className="adm-cell-sub">{o.user_email || o.shipping_phone}</div>
                  </td>
                  <td>
                    <div className="adm-cell-price">${parseFloat(o.total).toFixed(2)}</div>
                    <StatusBadge status={o.payment_method} />
                  </td>
                  <td><StatusBadge status={o.payment_status} /></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="adm-cell-date">
                    {new Date(o.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select className="adm-status-select"
                        value={o.status}
                        // 2. Chặn sự kiện click nảy lên dòng (<tr>) khi bấm vào Select
                        onClick={(e) => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation();
                          updateStatus(o.id, e.target.value);
                        }}>
                        <option value="pending">Chờ xử lý</option>
                        <option value="confirmed">Xác nhận</option>
                        <option value="shipping">Đang giao</option>
                        <option value="delivered">Đã giao</option>
                        <option value="cancelled">Hủy đơn</option>
                      </select>
                      
                      {/* 3. Nút xem chi tiết được thiết kế lại */}
                      <button 
                        className="adm-btn" 
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'transparent',
                          border: '1px solid var(--primary-color, #3498db)',
                          color: 'var(--primary-color, #3498db)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--primary-color, #3498db)';
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--primary-color, #3498db)';
                        }}
                        // Chặn click nảy lên dòng
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/orders/${o.id}`);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        Chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr className="adm-empty-row">
                  <td colSpan={7}>Không tìm thấy đơn hàng nào phù hợp</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}