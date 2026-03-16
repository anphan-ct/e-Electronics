import React, { useState, useEffect, useContext, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard'; 
import { ThemeContext } from '../context/ThemeContext';
import { Search as SearchIcon } from 'lucide-react';

const Search = () => {
    const { theme } = useContext(ThemeContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';

    const [keyword, setKeyword] = useState(initialQuery);
    
    // 1. Khởi tạo state từ cache
    const [products, setProducts] = useState(() => {
        const cachedResults = sessionStorage.getItem('last_search_results');
        const cachedQuery = sessionStorage.getItem('last_search_query');
        if (cachedResults && cachedQuery === initialQuery) {
            return JSON.parse(cachedResults);
        }
        return [];
    });

    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(() => {
        const cachedPage = sessionStorage.getItem('last_search_page');
        const cachedQuery = sessionStorage.getItem('last_search_query');
        if (cachedPage && cachedQuery === initialQuery) {
            return parseInt(cachedPage);
        }
        return 1;
    });

    const productsPerPage = 10;

    // 2. Logic lưu vị trí cuộn trước khi rời trang
    useEffect(() => {
        const handleScroll = () => {
            // Lưu vị trí cuộn hiện tại vào sessionStorage
            sessionStorage.setItem('search_scroll_pos', window.scrollY.toString());
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 3. Logic khôi phục vị trí cuộn sau khi sản phẩm đã hiển thị
    useLayoutEffect(() => {
        if (!loading && products.length > 0) {
            const savedScrollPos = sessionStorage.getItem('search_scroll_pos');
            const cachedQuery = sessionStorage.getItem('last_search_query');
            
            // Chỉ khôi phục nếu từ khóa tìm kiếm vẫn giống từ khóa đã lưu
            if (savedScrollPos && cachedQuery === initialQuery) {
                // Đợi một chút để React render xong các ProductCard rồi mới cuộn
                setTimeout(() => {
                    window.scrollTo(0, parseInt(savedScrollPos));
                }, 100);
            }
        }
    }, [loading, products.length, initialQuery]);

    useEffect(() => {
        const fetchSearchResults = async () => {
            if (products.length === 0) setLoading(true); 
            try {
                const res = await axios.get(`http://localhost:5000/api/products/search?q=${keyword}`);
                setProducts(res.data);
                sessionStorage.setItem('last_search_results', JSON.stringify(res.data));
                sessionStorage.setItem('last_search_query', keyword);
            } catch (error) {
                console.error("Lỗi lấy dữ liệu:", error);
            } finally {
                setLoading(false);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            if (keyword.trim() !== '') {
                const cachedQuery = sessionStorage.getItem('last_search_query');
                if (keyword !== cachedQuery) {
                    fetchSearchResults();
                    setCurrentPage(1);
                    sessionStorage.setItem('last_search_page', '1');
                    sessionStorage.setItem('search_scroll_pos', '0'); // Reset cuộn khi tìm từ mới
                }
                setSearchParams({ q: keyword });
            } else {
                setProducts([]);
                setSearchParams({});
                sessionStorage.clear(); // Xóa sạch cache khi ô tìm kiếm trống
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [keyword, setSearchParams]);

    // Các logic tính toán phân trang giữ nguyên...
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(products.length / productsPerPage);

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
        sessionStorage.setItem('last_search_page', pageNumber.toString());
        sessionStorage.setItem('search_scroll_pos', '0'); // Reset cuộn khi sang trang mới
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className={`py-5 min-vh-100 ${theme === 'dark' ? 'bg-dark text-light' : 'bg-light text-dark'}`}>
            <div className="container">
                {/* Phần tiêu đề và input giữ nguyên... */}
                <div className="text-center mb-5">
                    <h2 className={`fw-bold mb-3 ${theme === "dark" ? "text-light" : "text-dark"}`}>
                        {keyword ? `Kết quả tìm kiếm cho "${keyword}"` : "Tìm kiếm sản phẩm"}
                    </h2>
                </div>

                <div className="row justify-content-center mb-5">
                    <div className="col-md-8 col-lg-6">
                        <div className="position-relative shadow-sm rounded-pill">
                            <SearchIcon className="position-absolute top-50 start-0 translate-middle-y ms-4 text-muted" size={22} />
                            <input
                                type="text"
                                className={`form-control form-control-lg rounded-pill pe-4 border ${theme === 'dark' ? 'bg-dark border-secondary text-light' : 'bg-white text-dark'}`}
                                placeholder="Nhập tên sản phẩm..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                style={{ padding: '1rem 1rem 1rem 3.5rem' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Phần hiển thị danh sách sản phẩm và phân trang giữ nguyên... */}
                {loading && products.length === 0 ? (
                    <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>
                ) : (
                    <>
                        <div className="row g-4">
                            {currentProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                        {/* Thanh phân trang... */}
                        {totalPages > 1 && (
                             <nav className="mt-5 pt-4">
                                <ul className="pagination justify-content-center gap-2 border-0">
                                    {/* Nút Previous, Số trang, Next giữ nguyên như code trước của bạn */}
                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                        <button className={`page-link rounded-circle border-0 shadow-sm d-flex align-items-center justify-content-center ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-light text-dark'}`} style={{ width: '45px', height: '45px' }} onClick={() => paginate(currentPage - 1)}>&lt;</button>
                                    </li>
                                    {[...Array(totalPages)].map((_, index) => (
                                        <li key={index + 1} className="page-item">
                                            <button onClick={() => paginate(index + 1)} className={`page-link rounded-circle border-0 shadow-sm fw-bold d-flex align-items-center justify-content-center ${currentPage === index + 1 ? 'btn-auth-gradient text-white' : (theme === 'dark' ? 'bg-dark text-light border border-secondary' : 'bg-white text-dark')}`} style={{ width: '45px', height: '45px' }}>{index + 1}</button>
                                        </li>
                                    ))}
                                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                        <button className={`page-link rounded-circle border-0 shadow-sm d-flex align-items-center justify-content-center ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-light text-dark'}`} style={{ width: '45px', height: '45px' }} onClick={() => paginate(currentPage + 1)}>&gt;</button>
                                    </li>
                                </ul>
                            </nav>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Search;