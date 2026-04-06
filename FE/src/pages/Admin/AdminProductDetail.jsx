import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { LoadingSpinner } from "../../layouts/AdminUI";
import { ThemeContext } from "../../context/ThemeContext";

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export default function AdminProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/dashboard/products/${id}`, { headers: auth() });
        setProduct(response.data);
      } catch (error) {
        console.error("Lỗi tải chi tiết sản phẩm:", error);
        toast.error("Không thể tải chi tiết sản phẩm!");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  
  if (!product) return (
    <div style={{ padding: "80px", textAlign: "center", fontSize: "18px", color: isDark ? "#fff" : "#333" }}>
      Sản phẩm không tồn tại hoặc đã bị xóa.
    </div>
  );

  return (
    <div className={`animate-fade-in apd-wrapper ${isDark ? 'dark' : 'light'}`}>
      
      {/* ─── HEADER ─── */}
      <div className="adm-tab-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => navigate(-1)} className="adm-btn adm-btn-secondary" style={{ marginRight: '16px' }}>
          &larr; Quay lại
        </button>
        <h2 className="adm-tab-title" style={{ margin: 0, color: isDark ? "#fff" : "inherit" }}>
          Thông tin chi tiết
        </h2>
      </div>

      {/* ─── NỘI DUNG CHÍNH (CARD) ─── */}
      <div className="apd-card">
        
        {/* CỘT TRÁI - ẢNH */}
        <div className="apd-img-container">
          <img
            src={`/assets/img/${product.image}`}
            alt={product.name}
            className="apd-img"
            onError={e => { e.target.src = "https://placehold.co/400x400?text=No+Image"; }}
          />
        </div>

        {/* CỘT PHẢI - THÔNG TIN */}
        <div className="apd-info">
          
          <div>
            <h2 className="apd-title">{product.name}</h2>
            <div className="apd-price">${parseFloat(product.price).toLocaleString()}</div>
          </div>

          <div className="apd-badges">
            <span className="apd-badge">ID Sản phẩm: #{product.id}</span>
            <span className="apd-badge">Danh mục: {product.category_id || "N/A"}</span>
            <span className="apd-badge secondary">Ngày tạo: {new Date(product.created_at).toLocaleDateString('vi-VN')}</span>
          </div>

          <div>
            <div className="apd-section-title">Mô tả sản phẩm</div>
            <div className="apd-desc">
              {product.description || "Chưa có mô tả cho sản phẩm này."}
            </div>
          </div>

          <div>
            <div className="apd-section-title">Thông số kỹ thuật</div>
            {product.specs && Object.keys(product.specs).length > 0 ? (
              <div className="apd-specs-grid">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="apd-spec-item">
                    <span className="apd-spec-key">{key}</span>
                    <span className="apd-spec-value">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="apd-desc" style={{ borderLeft: "none", fontStyle: "italic", opacity: 0.8 }}>
                Sản phẩm này chưa cập nhật thông số kỹ thuật.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}