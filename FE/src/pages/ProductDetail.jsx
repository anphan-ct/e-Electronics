import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import { ArrowLeft } from "lucide-react";
 
function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useContext(CartContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/products/${id}`);
        setProduct(response.data);
      } catch (error) {
        console.error("Lỗi tải chi tiết sản phẩm:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);
 
  const handleAddToCart = () => {
    const user = localStorage.getItem("user");
    if (!user) {
      toast.info("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
      const loginModal = document.getElementById("loginModal");
      if (window.bootstrap && loginModal) {
        window.bootstrap.Modal.getOrCreateInstance(loginModal).show();
      }
      return;
    }
 
    addToCart(product);
    toast.success("Sản phẩm đã được thêm vào giỏ hàng!");
  };
 
  if (loading) return <div className="container py-5 text-center">Đang tải...</div>;
  if (!product) return <div className="container py-5 text-center">Sản phẩm không tồn tại</div>;
 
  return (
    <div className={`min-vh-100 py-5 ${theme === "dark" ? "bg-dark text-light" : ""}`} style={{ transition: "all 0.3s ease" }}>
      <div className="container">
 
        {/* --- NÚT QUAY LẠI --- */}
        <button
          className={`btn mb-4 d-flex align-items-center gap-2 border-0 px-0 shadow-none transition-all ${
            theme === "dark" ? "text-white-50 hover-text-light" : "text-muted hover-text-dark"
          }`}
          onClick={() => navigate(-1)}
          style={{ background: "transparent" }}
        >
          <ArrowLeft size={20} />
          <span className="fw-bold">Quay lại</span>
        </button>
 
        <div className="row align-items-center g-5">
          <div className="col-md-6">
            <div className={`p-2 shadow-lg rounded-4 ${theme === "dark" ? "bg-secondary border border-dark" : "bg-white"}`}>
              <img src={`/assets/img/${product.image}`} className="img-fluid rounded-4 w-100" alt={product.name} />
            </div>
          </div>
 
          <div className="col-md-6">
            <h2 className="fw-bold mb-2">{product.name}</h2>
            <h3 className="text-danger fw-bold mb-4">${product.price}</h3>
            <p className={theme === "dark" ? "text-light-50" : "text-secondary"}>{product.description}</p>
 
            <h5 className="mt-5 mb-3 fw-bold">Specifications</h5>
            <div className={`auth-modal-content overflow-hidden border rounded-4 ${theme === "dark" ? "border-secondary" : ""}`}>
              <ul className="list-group list-group-flush">
                {product.specs && Object.entries(product.specs).map(([key, value]) => (
                  <li key={key} className={`list-group-item d-flex justify-content-between py-3 ${theme === "dark" ? "bg-dark text-light border-secondary" : "bg-white"}`}>
                    <strong className="text-primary">{key.toUpperCase()}</strong>
                    <span className="fw-medium">{value}</span>
                  </li>
                ))}
              </ul>
            </div>
 
            <button
              className="btn btn-auth-gradient w-100 py-3 mt-4 fw-bold shadow-sm rounded-pill"
              onClick={handleAddToCart}
            >
              ADD TO CART
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
 
export default ProductDetail;