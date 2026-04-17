import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { LoadingSpinner, StatusBadge } from "../../layouts/AdminUI";
import { Ticket, Calendar, Settings, Tag, Target, Users, Zap, Package } from "lucide-react";

const API = "http://localhost:5000/api/vouchers/admin";
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

const SCOPE_MAP = { all: "Toàn bộ cửa hàng", category: "Theo ngành hàng (Danh mục)", product: "Theo sản phẩm cụ thể" };

export default function VoucherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        const res = await axios.get(`${API}/${id}`, auth());
        setVoucher(res.data);
      } catch (err) {
        toast.error("Không tìm thấy voucher");
        navigate("/admin/vouchers");
      } finally {
        setLoading(false);
      }
    };
    fetchVoucher();
  }, [id, navigate]);

  const handleToggle = async () => {
    try {
      await axios.put(`${API}/${voucher.id}/toggle`, {}, auth());
      setVoucher(prev => ({ ...prev, is_active: !prev.is_active }));
      toast.success(voucher.is_active ? "Đã tắt voucher" : "Đã kích hoạt voucher");
    } catch {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!voucher) return null;

  const isExpired = voucher.expire_at && new Date(voucher.expire_at) < new Date();

  return (
    <div className="animate-fade-in adm-vd-container">
      {/* HEADER */}
      <div className="adm-od-header">
        <div className="adm-od-header-left">
          <button className="adm-od-back-btn" onClick={() => navigate("/admin/vouchers")} title="Quay lại">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          <div>
            <h2 className="adm-od-title">
              Chi tiết Voucher <span className="adm-od-id-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent)' }}>
                <Ticket size={16} /> {voucher.code}
              </span>
            </h2>
            <p className="adm-od-date">Tạo ngày: {new Date(voucher.created_at).toLocaleString("vi-VN")}</p>
          </div>
        </div>
        <div>
           <button onClick={handleToggle} className={`adm-btn ${voucher.is_active ? 'adm-btn-danger' : 'adm-btn-primary'}`}>
              {voucher.is_active ? "Vô hiệu hóa Voucher" : "Kích hoạt Voucher"}
           </button>
        </div>
      </div>

      <div className="adm-od-cards-grid">
        {/* CARD 1: Thông tin chung */}
        <div className="adm-od-card">
          <div className="adm-od-card-header">
            <div className="adm-od-card-icon" style={{ backgroundColor: "rgba(99, 102, 241, 0.1)", color: "var(--accent)" }}>
              <Tag size={22} strokeWidth={2.5} />
            </div>
            <h4 className="adm-od-card-title">Thông tin chung</h4>
          </div>
          <div className="adm-od-card-content">
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Tên Voucher:</span>
              <strong className="adm-od-card-value">{voucher.name}</strong>
            </div>
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Mô tả:</span>
              <strong className="adm-od-card-value">{voucher.description || "Không có"}</strong>
            </div>
            <div className="adm-od-card-row border-top">
              <span className="adm-od-card-label">Trạng thái:</span>
              <span className="adm-od-card-value">
                {voucher.is_active ? <span style={{ color: 'var(--green)' }}>Đang hoạt động</span> : <span style={{ color: 'var(--red)' }}>Đã tắt</span>}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: Giá trị & Điều kiện */}
        <div className="adm-od-card">
          <div className="adm-od-card-header">
            <div className="adm-od-card-icon" style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--green)" }}>
              <Target size={22} strokeWidth={2.5} />
            </div>
            <h4 className="adm-od-card-title">Giá trị & Điều kiện</h4>
          </div>
          <div className="adm-od-card-content">
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Loại giảm giá:</span>
              <strong className="adm-od-card-value">{voucher.discount_type === "percent" ? "Phần trăm (%)" : "Số tiền cố định ($)"}</strong>
            </div>
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Mức giảm:</span>
              <strong className="adm-od-card-value" style={{ color: 'var(--red)', fontSize: '18px' }}>
                {voucher.discount_type === "percent" ? `${voucher.discount_value}%` : `$${voucher.discount_value}`}
              </strong>
            </div>
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Giảm tối đa:</span>
              <strong className="adm-od-card-value">{voucher.max_discount ? `$${voucher.max_discount}` : "Không giới hạn"}</strong>
            </div>
            <div className="adm-od-card-row border-top">
              <span className="adm-od-card-label">Đơn tối thiểu:</span>
              <strong className="adm-od-card-value">${voucher.min_order}</strong>
            </div>
          </div>
        </div>

        {/* CARD 3: Giới hạn & Hiệu lực */}
        <div className="adm-od-card">
          <div className="adm-od-card-header">
            <div className="adm-od-card-icon" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", color: "var(--yellow)" }}>
              <Calendar size={22} strokeWidth={2.5} />
            </div>
            <h4 className="adm-od-card-title">Hiệu lực & Giới hạn</h4>
          </div>
          <div className="adm-od-card-content">
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Ngày bắt đầu:</span>
              <strong className="adm-od-card-value">{voucher.start_at ? new Date(voucher.start_at).toLocaleString("vi-VN") : "Ngay lập tức"}</strong>
            </div>
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Ngày hết hạn:</span>
              <strong className="adm-od-card-value" style={{ color: isExpired ? 'var(--red)' : 'inherit' }}>
                {voucher.expire_at ? new Date(voucher.expire_at).toLocaleString("vi-VN") : "Không thời hạn"}
              </strong>
            </div>
            <div className="adm-od-card-row border-top">
              <span className="adm-od-card-label">Lượt dùng thực tế:</span>
              <strong className="adm-od-card-value">{voucher.real_used_count || 0} / {voucher.usage_limit || "∞"}</strong>
            </div>
            <div className="adm-od-card-row">
              <span className="adm-od-card-label">Giới hạn mỗi User:</span>
              <strong className="adm-od-card-value">{voucher.usage_per_user} lần</strong>
            </div>
          </div>
        </div>
      </div>

      {/* THÔNG TIN NÂNG CAO */}
      <div className="adm-od-card">
        <h4 className="adm-od-section-title">
          <Settings size={20} /> Thiết lập nâng cao
        </h4>
        
        <div className="adm-table-wrap adm-od-table-wrap mt-3">
          <table className="adm-od-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Cấu hình</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Nguồn phát hành</strong></td>
                <td>
                  {voucher.source === 'redeem_points' ? (
                    <span style={{ display: 'inline-block', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '6px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '13px' }}>
                       Đổi bằng điểm ({voucher.points_cost} điểm)
                    </span>
                  ) : (
                    <span style={{ display: 'inline-block', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '6px 14px', borderRadius: '20px', fontWeight: '700', fontSize: '13px' }}>
                       Admin tạo (Public / Tặng thẳng)
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Phạm vi áp dụng</strong></td>
                <td>
                  <span style={{ fontWeight: '600', color: 'var(--text)' }}>{SCOPE_MAP[voucher.apply_scope]}</span>
                </td>
              </tr>
              
              {/* HIỂN THỊ DANH SÁCH CHI TIẾT */}
              {voucher.apply_scope !== 'all' && (
                <tr>
                  <td>
                    <strong>
                      {voucher.apply_scope === 'category' ? 'Ngành hàng áp dụng' : 'Sản phẩm áp dụng'}
                    </strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {voucher.conditions?.map((c, i) => {
                        const name = c.ref_type === 'category' ? c.category_name : c.product_name;
                        const ItemIcon = c.ref_type === 'category' ? Tag : Package;
                        const iconColor = c.ref_type === 'category' ? 'var(--blue)' : 'var(--green)';

                        return (
                          <div key={i} style={{ 
                            background: 'var(--card2)', 
                            border: '1px solid var(--border)', 
                            padding: '8px 14px', 
                            borderRadius: '10px', 
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--text)'
                          }}>
                            <ItemIcon size={16} color={iconColor} />
                            <span style={{ fontWeight: '700' }}>{name || "Không tìm thấy tên"}</span> 
                            <span style={{ color: 'var(--text2)', fontSize: '12px', fontWeight: '500', background: 'var(--card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                              ID: {c.ref_id}
                            </span>
                          </div>
                        );
                      })}
                      {(!voucher.conditions || voucher.conditions.length === 0) && (
                        <span style={{ color: 'var(--text2)', fontStyle: 'italic' }}>Chưa cấu hình mục nào cụ thể</span>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}