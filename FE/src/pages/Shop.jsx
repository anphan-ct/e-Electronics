import { products } from "../data";
import ProductCard from "../components/ProductCard";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

function Shop() {
  const { theme } = useContext(ThemeContext);

  return (
    <div className={`min-vh-100 py-5 ${theme === "dark" ? "bg-dark" : "bg-white"}`}>
      <div className="container">
        <div className="text-center mb-5">
          <h2 className={`fw-bold mb-2 ${theme === "dark" ? "text-light" : "text-dark"}`}>
            <span className="text-primary">Shop</span> Products
          </h2>
          {/* Đường line trang trí theo style MyShop */}
          <div 
            className="mx-auto btn-auth-gradient" 
            style={{ width: "60px", height: "4px", borderRadius: "10px" }}
          ></div>
        </div>

        <div className="row g-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Shop;