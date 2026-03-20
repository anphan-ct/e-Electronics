import React, { useState, useEffect, useContext, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ProductCard from '../components/ProductCard'; 
import { ThemeContext } from '../context/ThemeContext';
import { Search as SearchIcon, PackageSearch, Loader2 } from 'lucide-react';


const Search = () => {
    const { theme } = useContext(ThemeContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';

    const [keyword, setKeyword] = useState(initialQuery);
    
    // 1. Logic Cache & State (Giữ nguyên)
    const [products, setProducts] = useState(() => {
        const cachedResults = sessionStorage.getItem('last_search_results');
        const cachedQuery = sessionStorage.getItem('last_search_query');
        return (cachedResults && cachedQuery === initialQuery) ? JSON.parse(cachedResults) : [];
    });

    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(() => {
        const cachedPage = sessionStorage.getItem('last_search_page');
        const cachedQuery = sessionStorage.getItem('last_search_query');
        return (cachedPage && cachedQuery === initialQuery) ? parseInt(cachedPage) : 1;
    });

    const productsPerPage = 10;

    // 2. Logic Scroll Restoration (Giữ nguyên)
    useEffect(() => {
        const handleScroll = () => {
            sessionStorage.setItem('search_scroll_pos', window.scrollY.toString());
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useLayoutEffect(() => {
        if (!loading && products.length > 0) {
            const savedScrollPos = sessionStorage.getItem('search_scroll_pos');
            const cachedQuery = sessionStorage.getItem('last_search_query');
            if (savedScrollPos && cachedQuery === initialQuery) {
                setTimeout(() => { window.scrollTo(0, parseInt(savedScrollPos)); }, 100);
            }
        }
    }, [loading, products.length, initialQuery]);

    // 3. Logic Fetch Data
    useEffect(() => {
        const fetchSearchResults = async () => {
            if (products.length === 0) setLoading(true); 
            try {
                const res = await axios.get(`http://localhost:5000/api/products/search?q=${keyword}`);
                setProducts(res.data);
                sessionStorage.setItem('last_search_results', JSON.stringify(res.data));
                sessionStorage.setItem('last_search_query', keyword);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            if (keyword.trim() !== '') {
                fetchSearchResults();
                setCurrentPage(1);
                setSearchParams({ q: keyword });
            } else {
                setProducts([]);
                setSearchParams({});
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [keyword, setSearchParams]);

    useEffect(() => { setKeyword(searchParams.get("q") || ""); }, [searchParams]);

    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(products.length / productsPerPage);

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
        sessionStorage.setItem('last_search_page', pageNumber.toString());
        sessionStorage.setItem('search_scroll_pos', '0');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className={`min-vh-100 py-5 ${theme === "dark" ? "bg-dark" : "bg-white"}`}>
            <div className="container">
                
                {/* Header Tìm kiếm */}
                <div className="text-center mb-5">
                    <h2 className={`fw-bold mb-2 ${theme === "dark" ? "text-light" : "text-dark"}`}>
                        {keyword ? <>Kết quả cho <span className="text-primary">"{keyword}"</span></> : "Tìm kiếm sản phẩm"}
                    </h2>
                    <div className="mx-auto btn-auth-gradient mb-4" style={{ width: "60px", height: "4px", borderRadius: "10px" }}></div>
                    
                    {/* Ô Input Search */}
                    <div className="row justify-content-center">
                        <div className="col-md-8 col-lg-6">
                            <div className="search-wrapper shadow-sm">
                                <SearchIcon className="ms-3 text-primary" size={20} />
                                <input
                                    type="text"
                                    className="form-control border-0 bg-transparent shadow-none"
                                    placeholder="Nhập tên sản phẩm..."
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                />
                                {loading && <Loader2 className="me-3 animate-spin text-primary" size={20} />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kết quả hiển thị dùng Grid y hệt trang Shop */}
                {loading && products.length === 0 ? (
                    <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>
                ) : products.length === 0 && keyword.trim() !== '' ? (
                    <div className="text-center py-5 opacity-50">
                        <PackageSearch size={60} className="mb-3" />
                        <h4>Không tìm thấy sản phẩm nào</h4>
                    </div>
                ) : (
                    <>
                        <div className="row g-4"> {/* SỬ DỤNG CLASS ROW G-4 CỦA BOOTSTRAP NHƯ TRANG SHOP */}
                            {currentProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        {/* Pagination y hệt trang Shop */}
                        {totalPages > 1 && (
                            <nav className="mt-5 pt-4">
                                <ul className="pagination justify-content-center gap-2 border-0">
                                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                        <button className={`page-link rounded-circle border-0 shadow-sm d-flex align-items-center justify-content-center ${theme === 'dark' ? 'bg-secondary text-light' : 'bg-light text-dark'}`} style={{ width: '45px', height: '45px' }} onClick={() => paginate(currentPage - 1)}>&lt;</button>
                                    </li>
                                    {[...Array(totalPages)].map((_, index) => (
                                        <li key={index + 1} className="page-item">
                                            <button onClick={() => paginate(index + 1)} className={`page-link rounded-circle border-0 shadow-sm fw-bold d-flex align-items-center justify-content-center transition-all ${currentPage === index + 1 ? 'btn-auth-gradient text-white scale-110' : (theme === 'dark' ? 'bg-dark text-light border border-secondary' : 'bg-white text-dark')}`} style={{ width: '45px', height: '45px' }}>{index + 1}</button>
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