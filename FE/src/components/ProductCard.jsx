import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";

function ProductCard({ product }) {
  const { addToCart } = useContext(CartContext);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleAddToCart = () => {
    const user = localStorage.getItem("user");

    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
      navigate("/login");
      return;
    }

    addToCart(product);
    toast.success("Sản phẩm đã được thêm vào giỏ hàng!");
  }

  return (
    <div className="col-lg-3 col-md-4 col-sm-6 mb-4">
      <div className={`card h-100 auth-modal-content product-card-hover transition-all ${
        theme === "dark" 
          ? "bg-dark text-light border border-secondary shadow-sm" 
          : "bg-white text-dark border border-light-subtle shadow-sm"
      }`}>
        
        <div className={`p-3 ${theme === "dark" ? "" : "bg-light-subtle"} rounded-top-5`}>
          {/* Bao bọc phần ảnh bằng Link để có thể nhấn vào */}
          <Link to={`/product/${product.id}`} className="text-decoration-none">
            <div className="overflow-hidden rounded-4">
              <img
                src={`/assets/img/${product.image}`}
                className="card-img-top img-zoom" 
                alt={product.name}
                style={{ objectFit: "cover", height: "200px", cursor: "pointer" }}
              />
            </div>
          </Link>
        </div>

        <div className="card-body text-center pt-3">
          <h5 className="card-title fw-bold fs-6 mb-2 text-truncate">{product.name}</h5>
          
          <span className="badge rounded-pill bg-primary-subtle text-primary mb-2 px-3" style={{ fontSize: '10px' }}>
            NEW RELEASE
          </span>

          <p className="text-primary fw-bold fs-5 mb-3">${product.price}</p>

          <div className="d-flex justify-content-center gap-2">
            <button
              className="btn btn-primary btn-sm rounded-pill px-3 fw-bold shadow-sm"
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
            <Link
              to={`/product/${product.id}`}
              className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                theme === 'dark' ? 'btn-outline-light' : 'btn-outline-dark'
              }`}
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;