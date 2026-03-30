import { useState, useEffect } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { StatusBadge, LoadingSpinner } from "../../layouts/AdminUI";

const API = "http://localhost:5000/api/dashboard/orders";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const FILTER_OPTIONS = [
  { label:"Tất cả",    val:"all" },
  { label:"Chờ xử lý",val:"pending" },
  { label:"Xác nhận",  val:"confirmed" },
  { label:"Đang giao", val:"shipping" },
  { label:"Đã giao",   val:"delivered" },
  { label:"Đã hủy",    val:"cancelled" },
];

// ════════════════════════════════════════════════════════════
// ORDERS PAGE  —  route: /admin/dashboard/orders
// ════════════════════════════════════════════════════════════
export default function Order() {
  // searchQuery truyền từ AdminLayout qua Outlet context
  const { searchQuery = "" } = useOutletContext() || {};

  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  // ★ Fetch riêng — chỉ gọi /dashboard/orders
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API, { headers: auth() });
      setOrders(res.data);
    } catch { toast.error("Lỗi tải đơn hàng"); }
    finally  { setLoading(false); }
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
      (o.shipping_name||"").toLowerCase().includes(q) ||
      (o.user_name||"").toLowerCase().includes(q) ||
      (o.user_email||"").toLowerCase().includes(q);
    const matchFilter = filter === "all" || o.status === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">

      {/* HEADER */}
      <div className="adm-tab-header">
        <div>
          <h2 className="adm-tab-title">Quản lý đơn hàng</h2>
          <p className="adm-tab-count">{filtered.length} đơn hàng được tìm thấy</p>
        </div>
        <div className="adm-filter-row">
          {FILTER_OPTIONS.map(f => (
            <button key={f.val}
              className={`adm-filter-btn${filter===f.val?" active":""}`}
              onClick={() => setFilter(f.val)}>
              {f.label}
              {/* Badge đỏ cho "Chờ xử lý" */}
              {f.val === "pending" && pendingCount > 0 && (
                <span className="adm-nav-badge" style={{ marginLeft:6 }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* BẢNG */}
      <div className="adm-table-wrap">
        <div style={{ overflowX:"auto" }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>#ID</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Thanh toán</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  {/* ID */}
                  <td><span className="adm-order-id">#{o.id}</span></td>

                  {/* Khách hàng */}
                  <td>
                    <div className="adm-cell-name">{o.shipping_name||o.user_name||"—"}</div>
                    <div className="adm-cell-sub">{o.user_email||o.shipping_phone}</div>
                  </td>

                  {/* Tổng tiền */}
                  <td>
                    <div className="adm-cell-price">${parseFloat(o.total).toFixed(2)}</div>
                    <StatusBadge status={o.payment_method} />
                  </td>

                  {/* Thanh toán */}
                  <td><StatusBadge status={o.payment_status} /></td>

                  {/* Trạng thái */}
                  <td><StatusBadge status={o.status} /></td>

                  {/* Ngày tạo */}
                  <td className="adm-cell-date">
                    {new Date(o.created_at).toLocaleDateString("vi-VN")}
                  </td>

                  {/* Cập nhật trạng thái */}
                  <td>
                    <select className="adm-status-select"
                      value={o.status}
                      onChange={e => updateStatus(o.id, e.target.value)}>
                      <option value="pending">Chờ xử lý</option>
                      <option value="confirmed">Xác nhận</option>
                      <option value="shipping">Đang giao</option>
                      <option value="delivered">Đã giao</option>
                      <option value="cancelled">Hủy đơn</option>
                    </select>
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