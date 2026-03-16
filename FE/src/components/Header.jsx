import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import { Search } from 'lucide-react';

function Header() {
  const { cart } = useContext(CartContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [keyword, setKeyword] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const loadUser = () => {
    try {
      const data = localStorage.getItem("user");
      if (data && data !== "undefined") {
        setUser(JSON.parse(data));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener("storage", loadUser);
    window.addEventListener("login", loadUser);
    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("login", loadUser);
    };
  }, []);

  const isActive = (path) => location.pathname === path;

  const confirmLogout = () => {
    localStorage.clear();
    setUser(null);
    toast.info("Logout successful!");

    const modalElement = document.getElementById("logoutModal");
    if (window.bootstrap) {
      const modalInstance = window.bootstrap.Modal.getOrCreateInstance(modalElement);
      modalInstance.hide();
    }

    setTimeout(() => {
      window.location.href = "/";
    }, 1500);
  };

  const handleSearch = (e) => {
        e.preventDefault();
        if (keyword.trim()) {
            // Chuyển hướng sang trang tìm kiếm kèm theo từ khóa trên URL
            navigate(`/search?q=${encodeURIComponent(keyword.trim())}`);
        }
    };

  return (
    <>
      {/* Navbar: Tối ưu viền mảnh cho Light Mode */}
      <nav className={`navbar navbar-expand-lg py-3 sticky-top transition-all ${
        theme === "dark" 
          ? "navbar-dark bg-dark border-bottom border-secondary shadow-sm" 
          : "navbar-light bg-white border-bottom border-light-subtle shadow-sm"
      }`} style={{ transition: 'all 0.3s ease' }}>
        <div className="container">
          <Link className={`navbar-brand fw-bold fs-3 ${theme === "dark" ? "text-light" : "text-dark"}`} to="/">
            My<span className="text-primary">Shop</span>
          </Link>

          <div className="collapse navbar-collapse justify-content-center">
            <ul className="navbar-nav gap-4">
              <li className="nav-item">
                <Link to="/" className={`nav-link fw-bold ${
                  isActive("/") ? "text-primary border-bottom border-primary border-2" : ""
                }`}>Home</Link>
              </li>
              <li className="nav-item">
                <Link to="/shop" className={`nav-link fw-bold ${
                  isActive("/shop") ? "text-primary border-bottom border-primary border-2" : ""
                }`}>Shop</Link>
              </li>
            </ul>
          </div>

          <div className="d-flex align-items-center gap-2">

                
            {/* ---------- PHẦN MỚI THÊM: THANH TÌM KIẾM ---------- */}
            <form onSubmit={handleSearch} className="d-flex position-relative d-none d-md-flex me-2" style={{ maxWidth: '250px' }}>
              <input
                type="text"
                className={`form-control rounded-pill pe-5 ${theme === "dark" ? "bg-dark border-secondary text-light" : "bg-light border-light-subtle text-dark"}`}
                placeholder="Tìm kiếm..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ fontSize: '0.9rem' }}
              />
              <button
                type="submit"
                className={`btn position-absolute end-0 top-50 translate-middle-y rounded-pill ${theme === "dark" ? "text-light" : "text-dark"}`}
                style={{ border: 'none', background: 'transparent' }}
              >
                <Search size={18} />
              </button>
            </form>
            

            {/* Toggle Button: Sử dụng outline-dark cho Light Mode để rõ nét hơn */}
              <button 
              className={`btn rounded-pill px-3 fw-bold d-flex align-items-center gap-2 ${
                theme === "light" ? "btn-outline-dark shadow-sm" : "btn-outline-info"
              }`} 
              onClick={toggleTheme}
            >
              {theme === "light" ? "🌙 Dark" : "☀️ Light"}
            </button>

            {user ? (
              <div className="d-flex align-items-center gap-3">
                {user.role === "admin" && (
                  <Link to="/admin/chat" className="btn btn-warning btn-sm rounded-pill fw-bold px-3 shadow-sm">
                    Admin Chat
                  </Link>
                )}

                <Link to="/profile" className="d-flex align-items-center gap-2 text-decoration-none">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow" style={{ width: "38px", height: "38px" }}>
                    {user.name.substring(0, 1).toUpperCase()}
                  </div>
                  <span className={`fw-bold d-none d-md-inline ${theme === "dark" ? "text-light" : "text-dark"}`}>
                    {user.name}
                  </span>
                </Link>

                <button 
                  className="btn btn-danger btn-sm rounded-pill px-3 fw-bold shadow-sm" 
                  data-bs-toggle="modal" 
                  data-bs-target="#logoutModal"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" data-bs-toggle="modal" data-bs-target="#loginModal">
                Login
              </button>
            )}

            <Link to="/cart" className={`btn position-relative ms-2 p-2 rounded-circle ${theme === 'dark' ? 'btn-dark' : 'btn-light'}`}>
              <span className="fs-5">🛒</span>
              <span className="badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill border border-2 border-white" style={{ fontSize: '0.65rem' }}>
                {cart.length}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* MODAL XÁC NHẬN: Tinh chỉnh cho Light Mode */}
      <div className="modal fade" id="logoutModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className={`modal-content auth-modal-content border-0 shadow-lg ${
            theme === "dark" ? "bg-dark text-light border border-secondary" : "bg-white text-dark"
          }`} style={{ borderRadius: '25px' }}>
            <div className="modal-body text-center p-4">
              <div className="fs-1 text-warning mb-3">⚠️</div>
              <h5 className="fw-bold mb-3">Confirm Logout</h5>
              <p className={theme === 'dark' ? 'text-white-50' : 'text-muted'}>
                Are you sure you want to log out?
              </p>
              
              <div className="d-flex gap-2 mt-4">
                <button type="button" className={`btn w-100 rounded-pill fw-bold ${theme === 'dark' ? 'btn-secondary' : 'btn-light border'}`} data-bs-dismiss="modal">Cancel</button>
                <button type="button" className="btn btn-danger w-100 rounded-pill fw-bold shadow-sm" onClick={confirmLogout}>Logout</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;