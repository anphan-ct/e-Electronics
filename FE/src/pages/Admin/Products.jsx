import { useState, useEffect } from "react";
import axios from "axios";
import { useOutletContext, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LoadingSpinner } from "../../layouts/AdminUI";

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const API_URL = "http://localhost:5000/api/dashboard/products";

export default function Products() {
  const { searchQuery = "" } = useOutletContext() || {};
  const navigate = useNavigate(); // Dùng để chuyển trang
  const [products, setProducts] = useState(null);

  // States quản lý Modal Form (Thêm/Sửa)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "", price: "", description: "", image: "", category_id: "", specs: ""
  });

  // ─── 1. FETCH DANH SÁCH ──────────────────────────────────────
  const fetchProducts = async () => {
    try {
      const res = await axios.get(API_URL, { headers: auth() });
      setProducts(res.data);
    } catch (error) {
      toast.error("Không thể tải danh sách sản phẩm");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ─── 2. XỬ LÝ FORM THÊM / SỬA ───────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openFormModal = (product = null) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name || "",
        price: product.price || "",
        description: product.description || "",
        image: product.image || "",
        category_id: product.category_id || "",
        specs: product.specs ? JSON.stringify(product.specs, null, 2) : "" 
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", price: "", description: "", image: "", category_id: "", specs: "" });
    }
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate JSON
      let parsedSpecs = null;
      if (formData.specs.trim()) {
        try { 
          parsedSpecs = JSON.parse(formData.specs); 
        } catch (e) { 
          return toast.error("Thông số kỹ thuật (Specs) phải là chuỗi JSON hợp lệ!"); 
        }
      }

      const payload = { ...formData, specs: parsedSpecs };

      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, payload, { headers: auth() });
        toast.success("Cập nhật sản phẩm thành công!");
      } else {
        await axios.post(API_URL, payload, { headers: auth() });
        toast.success("Thêm sản phẩm thành công!");
      }
      closeFormModal();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra khi lưu sản phẩm!");
    }
  };

  // ─── 3. XÓA SẢN PHẨM ─────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`, { headers: auth() });
      toast.success("Đã xóa sản phẩm!");
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      toast.error("Không thể xóa sản phẩm này!");
    }
  };

  // ─── 4. XEM CHI TIẾT (CHUYỂN TRANG) ──────────────────────────
  const handleViewDetail = (id) => {
    // Chuyển hướng sang trang chi tiết (AdminProductDetail)
    navigate(`/admin/products/${id}`);
  };

  if (!products) return <LoadingSpinner />;

  const filtered = products.filter(p =>
    !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ position: "relative" }}>
      
      {/* HEADER */}
      <div className="adm-tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="adm-tab-title">Kho hàng</h2>
          <p className="adm-tab-count">Tổng cộng {filtered.length} sản phẩm</p>
        </div>
        <button onClick={() => openFormModal()} className="adm-btn adm-btn-primary">
          + Thêm Sản Phẩm
        </button>
      </div>

      {/* PRODUCT GRID */}
      <div className="adm-products-grid">
        {filtered.map(p => (
          <div key={p.id} className="adm-product-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="adm-product-img-wrap" onClick={() => handleViewDetail(p.id)} style={{ cursor: 'pointer' }}>
              <img
                src={`/assets/img/${p.image}`}
                alt={p.name}
                className="adm-product-img"
                onError={e => { e.target.src = "https://placehold.co/200x140?text=No+Image"; }}
              />
            </div>
            
            <div className="adm-product-info" style={{ flexGrow: 1 }}>
              <div className="adm-product-info-name" title={p.name}>{p.name}</div>
              <div className="adm-product-info-price">${parseFloat(p.price).toLocaleString()}</div>
              <div className="adm-product-info-id" style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                ID: #{p.id} | Danh mục: {p.category_id || 'N/A'}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="adm-action-actions-wrap">
              <button onClick={() => handleViewDetail(p.id)} className="adm-action-btn adm-action-detail">Chi tiết</button>
              <button onClick={() => openFormModal(p)} className="adm-action-btn adm-action-edit">Sửa</button>
              <button onClick={() => handleDelete(p.id)} className="adm-action-btn adm-action-delete">Xóa</button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:48, color:"var(--text2)", fontSize:14 }}>
            Không tìm thấy sản phẩm {searchQuery ? ` "${searchQuery}"` : ""}
          </div>
        )}
      </div>

      {/* MODAL 1: FORM THÊM / SỬA */}
      {showFormModal && (
        <div className="adm-modal-overlay">
          <div className="adm-modal-content">
            <h3 className="adm-modal-header">
              {editingId ? "Sửa Sản Phẩm" : "Thêm Sản Phẩm Mới"}
            </h3>
            <form onSubmit={handleSubmit}>
              
              <label className="adm-form-label">Tên sản phẩm:
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="adm-form-input" />
              </label>

              <div className="adm-form-group-row">
                <label className="adm-form-label">Giá bán ($):
                  <input required type="number" step="0.01" name="price" value={formData.price} onChange={handleInputChange} className="adm-form-input" />
                </label>
                <label className="adm-form-label">ID Danh mục:
                  <input required type="number" name="category_id" value={formData.category_id} onChange={handleInputChange} className="adm-form-input" />
                </label>
              </div>

              <label className="adm-form-label">File Ảnh (vd: product-1.jpg):
                <input required type="text" name="image" value={formData.image} onChange={handleInputChange} className="adm-form-input" />
              </label>

              <label className="adm-form-label">Mô tả:
                <textarea rows="3" name="description" value={formData.description} onChange={handleInputChange} className="adm-form-input" />
              </label>

              <label className="adm-form-label">Thông số (Định dạng JSON - Tùy chọn):
                <textarea rows="4" name="specs" value={formData.specs} onChange={handleInputChange} placeholder='{"screen": "6.1 inch", "ram": "8GB"}' className="adm-form-input" style={{fontFamily: "monospace"}} />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" onClick={closeFormModal} className="adm-btn adm-btn-secondary">Hủy</button>
                <button type="submit" className="adm-btn adm-btn-primary">{editingId ? "Lưu Cập Nhật" : "Thêm Mới"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}