import { Link } from "react-router-dom";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
 
function ProductCard({ product }) {
  const { addToCart } = useContext(CartContext);
  const { theme } = useContext(ThemeContext);
 
  const handleAddToCart = () => {
    const user = localStorage.getItem("user");
 
    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
      // CHỈ THAY ĐỔI: mở modal login thay vì navigate("/login")
      const loginModal = document.getElementById("loginModal");
      if (window.bootstrap && loginModal) {
        window.bootstrap.Modal.getOrCreateInstance(loginModal).show();
      }
      return;
    }
 
    addToCart(product);
    toast.success("Sản phẩm đã được thêm vào giỏ hàng!");
  };
 
  return (
    // FIX: Đã sửa lại class cột để đồng bộ với layout Shop/Search
    <div className="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
      {/* THÊM VIỀN ĐẬM: Dùng border-2 và shadow để nổi bật hơn ở cả 2 chế độ */}
      <div className={`card h-100 auth-modal-content product-card-hover transition-all border border-2 ${
        theme === "dark"
          ? "bg-dark text-light border-secondary shadow"
          : "bg-white text-dark border-light-subtle shadow"
      }`}>
 
        <div className={`p-3 position-relative ${theme === "dark" ? "" : "bg-light-subtle"} rounded-top-5`}>
 
          {/* BADGE THÔNG MINH */}
          <span
            className="position-absolute top-0 start-0 m-4 badge rounded-pill bg-danger shadow-sm px-3 py-2 fw-bold"
            style={{ fontSize: "0.65rem", zIndex: 2, letterSpacing: "0.5px" }}
          >
            NEW RELEASE
          </span>
 
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
 
        <div className="card-body text-center pt-3 d-flex flex-column">
          <Link to={`/product/${product.id}`} className="text-decoration-none">
            <h5 className={`card-title fw-bold fs-6 mb-3 text-truncate ${theme === "dark" ? "text-light" : "text-dark"}`}>
              {product.name}
            </h5>
          </Link>
 
          <div className="mt-auto">
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
                  theme === "dark" ? "btn-outline-light" : "btn-outline-dark"
                }`}
              >
                Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
 
export default ProductCard;