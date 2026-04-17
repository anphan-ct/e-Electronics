// FE/src/pages/Admin/Vouchers.jsx
import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { LoadingSpinner, StatusBadge } from "../../layouts/AdminUI";
import { ThemeContext } from "../../context/ThemeContext";
import {
  Ticket, Plus, RefreshCw, Tag, ToggleLeft, ToggleRight,
  Trash2, Edit3, TrendingUp, Gift, Users, Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../../voucher.css";

const API  = "http://localhost:5000/api/vouchers/admin";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// Danh sách category cho FE dùng khi tạo voucher
const CATEGORIES = [
  { id: 1, name: "Smartphone" }, { id: 2, name: "Laptop" },
  { id: 3, name: "Máy tính bảng" }, { id: 4, name: "Đồng hồ thông minh" },
  { id: 5, name: "Âm thanh" }, { id: 6, name: "Phụ kiện & Linh kiện" },
  { id: 7, name: "Màn hình" }, { id: 8, name: "Máy ảnh & Drone" },
  { id: 9, name: "Thiết bị chơi game" },
];

const SCOPE_MAP = { all: "Toàn shop", category: "Theo ngành", product: "Theo sản phẩm" };
const SCOPE_COLOR = { all: "#6366f1", category: "#0891b2", product: "#059669" };

const EMPTY_FORM = {
  code: "", name: "", description: "", discount_type: "percent",
  discount_value: "", max_discount: "", min_order: "0",
  apply_scope: "all", source: "admin", points_cost: "",
  usage_limit: "", usage_per_user: "1",
  start_at: "", expire_at: "", is_active: true,
  category_ids: [], product_ids: [],
};

export default function Vouchers() {
  const { searchQuery = "" } = useOutletContext() || {};
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [vouchers, setVouchers] = useState(null);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);

  const [products, setProducts] = useState([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [vRes, sRes, pRes] = await Promise.all([
        axios.get(`${API}/list`,  { headers: auth() }),
        axios.get(`${API}/stats`, { headers: auth() }),
        axios.get("http://localhost:5000/api/dashboard/products", { headers: auth() }),
      ]);
      setVouchers(vRes.data);
      setStats(sRes.data);
      setProducts(pRes.data);
    } catch { toast.error("Không thể tải dữ liệu voucher"); }
    finally  { setLoading(false); }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (v) => {
    setEditId(v.id);
    setForm({
      code: v.code, name: v.name, description: v.description || "",
      discount_type: v.discount_type, discount_value: String(v.discount_value),
      max_discount: v.max_discount ? String(v.max_discount) : "",
      min_order: String(v.min_order),
      apply_scope: v.apply_scope, source: v.source,
      points_cost: v.points_cost ? String(v.points_cost) : "",
      usage_limit: v.usage_limit ? String(v.usage_limit) : "",
      usage_per_user: String(v.usage_per_user),
      start_at: v.start_at ? v.start_at.slice(0, 16) : "",
      expire_at: v.expire_at ? v.expire_at.slice(0, 16) : "",
      is_active: Boolean(v.is_active),
      category_ids: (v.conditions || []).filter(c => c.ref_type === "category").map(c => c.ref_id),
      product_ids:  (v.conditions || []).filter(c => c.ref_type === "product").map(c => c.ref_id),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        discount_value: parseFloat(form.discount_value),
        max_discount:   form.max_discount ? parseFloat(form.max_discount) : null,
        min_order:      parseFloat(form.min_order) || 0,
        points_cost:    form.points_cost ? parseInt(form.points_cost) : null,
        usage_limit:    form.usage_limit ? parseInt(form.usage_limit) : null,
        usage_per_user: parseInt(form.usage_per_user) || 1,
      };

      if (editId) {
        await axios.put(`${API}/${editId}`, payload, { headers: auth() });
        toast.success("Cập nhật voucher thành công!");
      } else {
        await axios.post(`${API}/create`, payload, { headers: auth() });
        toast.success("Tạo voucher thành công!");
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi lưu voucher");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await axios.put(`${API}/${id}/toggle`, {}, { headers: auth() });

      toast.success(
        currentStatus
          ? "Đã tắt voucher"
          : "Đã bật voucher"
      );
      fetchAll();
    } catch {
      toast.error("Lỗi thay đổi trạng thái");
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Xóa voucher "${code}"?`)) return;
    try {
      await axios.delete(`${API}/${id}`, { headers: auth() });
      toast.success("Đã xóa voucher");
      fetchAll();
    } catch { toast.error("Không thể xóa voucher"); }
  };

  const toggleCatId = (id) => {
    setForm(f => ({
      ...f,
      category_ids: f.category_ids.includes(id)
        ? f.category_ids.filter(x => x !== id)
        : [...f.category_ids, id],
    }));
  };

  const filtered = (vouchers || []).filter(v =>
    !searchQuery ||
    v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className={`animate-fade-in ${isDark ? "dark" : ""}`}>
      {/* Header */}
      <div className="adm-tab-header">
        <div>
          <h2 className="adm-tab-title d-flex align-items-center gap-2">
            <Ticket size={22} color="var(--accent)" />
            Quản lý Voucher
          </h2>
          <p className="adm-tab-count">
            {filtered.length} voucher · Áp dụng theo ngành hàng / sản phẩm / toàn shop
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="adm-filter-btn d-flex align-items-center gap-2" onClick={fetchAll}>
            <RefreshCw size={14} /> Làm mới
          </button>
          <button
            className="adm-filter-btn active d-flex align-items-center gap-2"
            onClick={openCreate}
          >
            <Plus size={14} /> Tạo voucher
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="adm-stats-grid mb-4">
          {[
            { label: "Tổng voucher",   value: stats.overview.total,        color: "#6366f1", Icon: Ticket    },
            { label: "Đang hoạt động", value: stats.overview.active,       color: "#10b981", Icon: Zap       },
            { label: "Đổi bằng điểm",  value: stats.overview.redeemable,   color: "#f59e0b", Icon: Gift      },
            { label: "Lượt đã dùng",   value: stats.usage.total_used || 0, color: "#3b82f6", Icon: TrendingUp },
          ].map((s, i) => (
            <div key={i} className="adm-stat-card">
              <div className="adm-stat-card-glow" style={{ background: `${s.color}10` }} />
              <div className="adm-stat-top">
                <div className="adm-stat-icon" style={{ background: `${s.color}18` }}>
                  <s.Icon size={20} color={s.color} />
                </div>
              </div>
              <div className="adm-stat-value">{s.value}</div>
              <div className="adm-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="adm-table-wrap">
        <div style={{ overflowX: "auto" }}>
          <table className="adm-table">
            <thead>
              <tr>
                <th>Mã / Tên</th>
                <th>Giảm giá</th>
                <th>Phạm vi</th>
                <th>Nguồn</th>
                <th>Lượt dùng</th>
                <th>Hiệu lực</th>
                <th>Trạng thái</th>
                <th className="vc-text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr className="adm-empty-row"><td colSpan={8}>Chưa có voucher nào</td></tr>
              )}
              {filtered.map(v => {
                const scopeColor = SCOPE_COLOR[v.apply_scope] || "#6366f1";
                const isExpired = v.expire_at && new Date(v.expire_at) < new Date();
                return (
                  <tr key={v.id}
                      onClick={() => navigate(`/admin/vouchers/${v.id}`)}
                      style={{ cursor: "pointer" }}
                      className="adm-table-row-hover"
                  >
                    <td>
                      <div className="vc-code-text">{v.code}</div>
                      <div className="adm-cell-sub">{v.name}</div>
                    </td>
                    <td>
                      <div className="vc-discount-val">
                        {v.discount_type === "percent" ? `${v.discount_value}%` : `$${v.discount_value}`}
                        {v.max_discount && (
                          <span className="vc-discount-max">
                            {" "}(tối đa {v.max_discount})
                          </span>
                        )}
                      </div>
                      {v.min_order > 0 && (
                        <div className="adm-cell-sub">Đơn từ ${v.min_order}</div>
                      )}
                    </td>
                    <td>
                      <span className="vc-badge-scope" style={{ "--scope-c": scopeColor, "--scope-bg": scopeColor + "22" }}>
                        {SCOPE_MAP[v.apply_scope]}
                      </span>
                      {v.conditions?.length > 0 && (
                        <div className="adm-cell-sub vc-mt-2">
                          {v.conditions.length} điều kiện
                        </div>
                      )}
                    </td>
                    <td>
                      {v.source === "redeem_points" ? (
                        <span className="vc-badge-source vc-source-redeem">
                          ⭐ {v.points_cost?.toLocaleString()} điểm
                        </span>
                      ) : (
                        <span className="vc-badge-source vc-source-admin">
                          Admin
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="vc-usage-text">
                        {v.real_used_count || 0}
                        {v.usage_limit && <span className="vc-usage-limit">/{v.usage_limit}</span>}
                      </div>
                      <div className="adm-cell-sub">Tối đa {v.usage_per_user}x/user</div>
                    </td>
                    <td className="adm-cell-date">
                      {v.expire_at
                        ? <span className={isExpired ? "vc-expiry-expired" : "vc-expiry-valid"}>
                            {isExpired ? "Hết hạn · " : "HSD: "}
                            {new Date(v.expire_at).toLocaleDateString("vi-VN")}
                          </span>
                        : <span className="vc-expiry-valid">Không hết hạn</span>}
                    </td>
                    <td>
                      {v.is_active ? (
                        <span className="vc-badge-status vc-status-active">Hoạt động</span>
                      ) : (
                        <span className="vc-badge-status vc-status-inactive">Tắt</span>
                      )}
                    </td>
                    <td>
                      <div className="vc-action-group">
                        <button
                          title={v.is_active ? "Tắt voucher" : "Bật voucher"}
                          onClick={(e) => { e.stopPropagation(); handleToggle(v.id, v.is_active); }} // Chặn sự kiện click dòng
                          className={`vc-btn-toggle ${v.is_active ? 'active' : 'inactive'}`}
                        >
                          {v.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                        <button
                          title="Chỉnh sửa"
                          onClick={(e) => { e.stopPropagation(); openEdit(v); }}
                          className="vc-btn-icon vc-btn-edit"
                        >
                          <Edit3 size={13} /> 
                        </button>
                        <button
                          title="Xóa"
                          onClick={(e) => { e.stopPropagation(); handleDelete(v.id, v.code); }}
                          className="vc-btn-icon vc-btn-delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ FORM MODAL ══ */}
      {showForm && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-content large vc-modal-content">
            <h3 className="adm-modal-header vc-modal-header">
              {editId ? "Chỉnh sửa Voucher" : "Tạo Voucher mới"}
            </h3>
            <form onSubmit={handleSubmit}>
              {/* Code & Name */}
              <div className="adm-form-group-row">
                <label className="adm-form-label vc-label">
                  Mã voucher *
                  <input
                    required type="text" className="adm-form-input vc-input"
                    value={form.code} disabled={!!editId}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="VD: SALE20"
                  />
                </label>
                <label className="adm-form-label vc-label">
                  Tên voucher *
                  <input
                    required type="text" className="adm-form-input vc-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="VD: Ưu đãi Laptop"
                  />
                </label>
              </div>

              {/* Discount type & value */}
              <div className="adm-form-group-row">
                <label className="adm-form-label vc-label">
                  Loại giảm *
                  <select
                    className="adm-form-input vc-input"
                    value={form.discount_type}
                    onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                  >
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định ($)</option>
                  </select>
                </label>
                <label className="adm-form-label vc-label">
                  Giá trị giảm *
                  <input
                    required type="number" step="0.01" min="0" className="adm-form-input vc-input"
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === "percent" ? "VD: 15" : "VD: 50"}
                  />
                </label>
              </div>

              <div className="adm-form-group-row">
                {form.discount_type === "percent" && (
                  <label className="adm-form-label vc-label">
                    Giảm tối đa ($)
                    <input
                      type="number" step="0.01" min="0" className="adm-form-input vc-input"
                      value={form.max_discount}
                      onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))}
                      placeholder="VD: 100 (bỏ trống = không giới hạn)"
                    />
                  </label>
                )}
                <label className="adm-form-label vc-label">
                  Đơn tối thiểu ($)
                  <input
                    type="number" step="0.01" min="0" className="adm-form-input vc-input"
                    value={form.min_order}
                    onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))}
                    placeholder="0"
                  />
                </label>
              </div>

              {/* Apply scope */}
              <label className="adm-form-label vc-label">
                Phạm vi áp dụng
                <select
                  className="adm-form-input vc-input"
                  value={form.apply_scope}
                  onChange={e => setForm(f => ({ ...f, apply_scope: e.target.value, category_ids: [], product_ids: [] }))}
                >
                  <option value="all">Toàn shop</option>
                  <option value="category">Theo ngành hàng</option>
                  <option value="product">Theo sản phẩm cụ thể</option>
                </select>
              </label>

              {/* Category checkboxes */}
              {form.apply_scope === "category" && (
                <div className="vc-cat-wrap">
                  <div className="vc-cat-title">
                    Chọn ngành hàng áp dụng:
                  </div>
                  <div className="vc-cat-grid">
                    {CATEGORIES.map(cat => (
                      <label key={cat.id} className={`vc-cat-item ${form.category_ids.includes(cat.id) ? "selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={form.category_ids.includes(cat.id)}
                          onChange={() => toggleCatId(cat.id)}
                          style={{ display: "none" }}
                        />
                        {cat.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              
              {form.apply_scope === "product" && (
                <div className="vc-cat-wrap mt-3">
                  <div className="vc-cat-title">Chọn sản phẩm áp dụng:</div>
                  <div className="vc-cat-grid" style={{ maxHeight: "200px", overflowY: "auto" }}>
                    {products.map(p => (
                      <label key={p.id} className={`vc-cat-item ${form.product_ids.includes(p.id) ? "selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={form.product_ids.includes(p.id)}
                          onChange={() => {
                            setForm(f => ({
                              ...f,
                              product_ids: f.product_ids.includes(p.id)
                                ? f.product_ids.filter(x => x !== p.id)
                                : [...f.product_ids, p.id]
                            }));
                          }}
                          style={{ display: "none" }}
                        />
                        {p.name} - ${p.price}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Source */}
              <div className="adm-form-group-row">
                <label className="adm-form-label vc-label">
                  Nguồn voucher
                  <select
                    className="adm-form-input vc-input"
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  >
                    <option value="admin">Admin tạo</option>
                    <option value="redeem_points">Đổi bằng điểm</option>
                  </select>
                </label>
                {form.source === "redeem_points" && (
                  <label className="adm-form-label vc-label">
                    Số điểm cần đổi
                    <input
                      type="number" min="1" className="adm-form-input vc-input"
                      value={form.points_cost}
                      onChange={e => setForm(f => ({ ...f, points_cost: e.target.value }))}
                      placeholder="VD: 2500"
                    />
                  </label>
                )}
              </div>

              {/* Usage limits */}
              <div className="adm-form-group-row">
                <label className="adm-form-label vc-label">
                  Tổng lượt dùng (bỏ trống = không giới hạn)
                  <input
                    type="number" min="1" className="adm-form-input vc-input"
                    value={form.usage_limit}
                    onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))}
                  />
                </label>
                <label className="adm-form-label vc-label">
                  Tối đa lượt/user
                  <input
                    type="number" min="1" className="adm-form-input vc-input"
                    value={form.usage_per_user}
                    onChange={e => setForm(f => ({ ...f, usage_per_user: e.target.value }))}
                  />
                </label>
              </div>

              {/* Dates */}
              <div className="adm-form-group-row">
                <label className="adm-form-label vc-label">
                  Bắt đầu (bỏ trống = ngay lập tức)
                  <input
                    type="datetime-local" className="adm-form-input vc-input"
                    value={form.start_at}
                    onChange={e => setForm(f => ({ ...f, start_at: e.target.value }))}
                  />
                </label>
                <label className="adm-form-label vc-label">
                  Hết hạn (bỏ trống = không hết hạn)
                  <input
                    type="datetime-local" className="adm-form-input vc-input"
                    value={form.expire_at}
                    onChange={e => setForm(f => ({ ...f, expire_at: e.target.value }))}
                  />
                </label>
              </div>

              {/* Active */}
              <label className="vc-active-check">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                />
                Kích hoạt voucher ngay
              </label>

              <div className="vc-form-actions">
                <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setShowForm(false)}>Hủy</button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
                  {saving ? "Đang lưu..." : (editId ? "Cập nhật" : "Tạo voucher")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}