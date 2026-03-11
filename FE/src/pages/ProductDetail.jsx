import { useParams } from "react-router-dom";
import { products } from "../data";
import { useContext } from "react";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";

function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useContext(CartContext);
  const { theme } = useContext(ThemeContext);
  
  const product = products.find(p => p.id === parseInt(id));
  if (!product) return <div className="container py-5 text-center">Sản phẩm không tồn tại</div>;

  return (
    <div className={`min-vh-100 py-5 ${theme === "dark" ? "bg-dark text-light" : ""}`}>
      <div className="container">
        <div className="row align-items-center g-5">
          <div className="col-md-6">
            <div className="p-2 shadow-lg auth-modal-content bg-white">
               <img
                src={product.image}
                className="img-fluid rounded-4"
                alt={product.name}
              />
            </div>
          </div>

          <div className="col-md-6">
            <h2 className="fw-bold mb-2">{product.name}</h2>
            <h3 className="text-danger fw-bold mb-4">${product.price}</h3>

            <p className={theme === "dark" ? "text-light-50" : "text-secondary"}>
              {product.description}
            </p>

            <h5 className="mt-5 mb-3 fw-bold">Specifications</h5>
            {/* Chỉnh sửa List Group để phù hợp Dark Mode */}
            <div className={`auth-modal-content overflow-hidden border ${theme === 'dark' ? 'border-secondary' : ''}`}>
              <ul className="list-group list-group-flush">
                {Object.entries(product.specs).map(([key, value]) => (
                  <li
                    key={key}
                    className={`list-group-item d-flex justify-content-between py-3 ${
                      theme === "dark" ? "bg-dark text-light border-secondary" : "bg-white"
                    }`}
                  >
                    <strong className="text-primary">{key.toUpperCase()}</strong>
                    <span className="fw-medium">{value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              className="btn btn-auth-gradient w-100 py-3 mt-4 fw-bold shadow"
              onClick={() => addToCart(product)}
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