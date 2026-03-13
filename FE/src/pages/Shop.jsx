import { useState, useEffect, useContext } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import { ThemeContext } from "../context/ThemeContext";

function Shop() {
  const { theme } = useContext(ThemeContext);
  const [products, setProducts] = useState([]);
  
  // --- LOGIC PHÂN TRANG ---
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/products");
        setProducts(response.data);
      } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);
      }
    };
    fetchProducts();
  }, []);

  // Tính toán các chỉ số sản phẩm
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(products.length / productsPerPage);

  // Hàm chuyển trang và cuộn lên đầu
  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`min-vh-100 py-5 ${theme === "dark" ? "bg-dark" : "bg-white"}`}>
      <div className="container">
        {/* Tiêu đề */}
        <div className="text-center mb-5">
          <h2 className={`fw-bold mb-2 ${theme === "dark" ? "text-light" : "text-dark"}`}>
            <span className="text-primary">Shop</span> Products
          </h2>
          <div 
            className="mx-auto btn-auth-gradient" 
            style={{ width: "60px", height: "4px", borderRadius: "10px" }}
          ></div>
        </div>

        {/* Danh sách sản phẩm (đã cắt theo trang) */}
        <div className="row g-4">
          {currentProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* --- THANH PHÂN TRANG HIỆN ĐẠI --- */}
        {totalPages > 1 && (
          <nav className="mt-5 pt-4">
            <ul className="pagination justify-content-center gap-2 border-0">
              {/* Nút Previous */}
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className={`page-link rounded-circle border-0 shadow-sm d-flex align-items-center justify-content-center ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-light text-dark'}`}
                  style={{ width: '45px', height: '45px' }}
                  onClick={() => paginate(currentPage - 1)}
                >
                  <i className="bi bi-chevron-left">&lt;</i>
                </button>
              </li>

              {/* Danh sách số trang */}
              {[...Array(totalPages)].map((_, index) => {
                const pageNum = index + 1;
                return (
                  <li key={pageNum} className="page-item">
                    <button
                      onClick={() => paginate(pageNum)}
                      className={`page-link rounded-circle border-0 shadow-sm fw-bold d-flex align-items-center justify-content-center transition-all ${
                        currentPage === pageNum 
                          ? 'btn-auth-gradient text-white scale-110' 
                          : (theme === 'dark' ? 'bg-dark text-light border border-secondary' : 'bg-white text-dark')
                      }`}
                      style={{ width: '45px', height: '45px' }}
                    >
                      {pageNum}
                    </button>
                  </li>
                );
              })}

              {/* Nút Next */}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className={`page-link rounded-circle border-0 shadow-sm d-flex align-items-center justify-content-center ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-light text-dark'}`}
                  style={{ width: '45px', height: '45px' }}
                  onClick={() => paginate(currentPage + 1)}
                >
                  <i className="bi bi-chevron-right">&gt;</i>
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}

export default Shop;