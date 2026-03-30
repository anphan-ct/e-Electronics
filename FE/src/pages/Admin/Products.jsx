import { useState, useEffect } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import { toast } from "react-toastify";
import { LoadingSpinner } from "../../layouts/AdminUI";

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

// ════════════════════════════════════════════════════════════
// PRODUCTS PAGE  —  route: /admin/dashboard/products
// ════════════════════════════════════════════════════════════
export default function Products() {
  // searchQuery từ AdminLayout
  const { searchQuery = "" } = useOutletContext() || {};

  const [products, setProducts] = useState(null);

  // ★ Fetch riêng — chỉ gọi /dashboard/products
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/dashboard/products", { headers: auth() })
      .then(res => setProducts(res.data))
      .catch(() => toast.error("Không thể tải sản phẩm"));
  }, []);

  if (!products) return <LoadingSpinner />;

  const filtered = products.filter(p =>
    !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">

      {/* HEADER */}
      <div className="adm-tab-header">
        <div>
          <h2 className="adm-tab-title">Kho hàng</h2>
          <p className="adm-tab-count">Tổng cộng {filtered.length} sản phẩm</p>
        </div>
      </div>

      {/* PRODUCT GRID — dùng class từ AdminDashboard.css */}
      <div className="adm-products-grid">
        {filtered.map(p => (
          <div key={p.id} className="adm-product-card">
            {/* Ảnh sản phẩm */}
            <div className="adm-product-img-wrap">
              <img
                src={`/assets/img/${p.image}`}
                alt={p.name}
                className="adm-product-img"
                onError={e => { e.target.src = "https://placehold.co/200x140?text=No+Image"; }}
              />
            </div>
            {/* Thông tin */}
            <div className="adm-product-info">
              <div className="adm-product-info-name" title={p.name}>{p.name}</div>
              <div className="adm-product-info-price">${parseFloat(p.price).toLocaleString()}</div>
              <div className="adm-product-info-id">ID: #{p.id}</div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:48, color:"var(--text2)", fontSize:14 }}>
            Không tìm thấy sản phẩm{searchQuery ? ` "${searchQuery}"` : ""}
          </div>
        )}
      </div>
    </div>
  );
}