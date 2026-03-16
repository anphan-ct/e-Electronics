import { useState, useEffect, useContext, useLayoutEffect } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import { ThemeContext } from "../context/ThemeContext";

function Shop() {
  const { theme } = useContext(ThemeContext);
  
  // 1. KHỞI TẠO DỮ LIỆU TỪ CACHE (Giúp giữ nguyên chiều cao trang, chống giật)
  const [products, setProducts] = useState(() => {
    const cachedProducts = sessionStorage.getItem('shop_products_cache');
    return cachedProducts ? JSON.parse(cachedProducts) : [];
  });
  
  // 2. CHỈ HIỆN LOADING KHI CHƯA CÓ CACHE
  const [loading, setLoading] = useState(() => {
    const cachedProducts = sessionStorage.getItem('shop_products_cache');
    return !cachedProducts; // Nếu có cache rồi thì không cần hiện loading xoay xoay nữa
  });
  
  // --- LOGIC PHÂN TRANG TỪ CACHE ---
  const [currentPage, setCurrentPage] = useState(() => {
    const cachedPage = sessionStorage.getItem('shop_last_page');
    return cachedPage ? parseInt(cachedPage) : 1;
  });
  const productsPerPage = 10;

  // --- LƯU VỊ TRÍ CUỘN CHUỘT ---
  useEffect(() => {
    const handleScroll = () => {
      sessionStorage.setItem('shop_scroll_pos', window.scrollY.toString());
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- PHỤC HỒI VỊ TRÍ CUỘN ---
  useLayoutEffect(() => {
    if (!loading && products.length > 0) {
      const savedScrollPos = sessionStorage.getItem('shop_scroll_pos');
      if (savedScrollPos) {
        // Vì đã có cache, DOM render ngay lập tức -> Giảm thời gian chờ xuống 10ms để cuộn tức thì
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPos));
        }, 10);
      }
    }
  }, [loading, products.length]);

  // --- GỌI API & LƯU CACHE LẠI ---
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/products");
        setProducts(response.data);
        // Lưu data vào session để dùng cho lần Back sau
        sessionStorage.setItem('shop_products_cache', JSON.stringify(response.data));
      } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);
      } finally {
        setLoading(false);
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
    sessionStorage.setItem('shop_last_page', pageNumber.toString());
    sessionStorage.setItem('shop_scroll_pos', '0'); // Reset cuộn khi sang trang mới
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

        {/* Danh sách sản phẩm */}
        {loading && products.length === 0 ? (
            <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>
        ) : (
            <div className="row g-4">
            {currentProducts.map(product => (
                <ProductCard key={product.id} product={product} />
            ))}
            </div>
        )}

        {/* --- THANH PHÂN TRANG HIỆN ĐẠI --- */}
        {!loading && totalPages > 1 && (
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