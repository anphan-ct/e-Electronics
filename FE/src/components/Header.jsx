import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { CartContext } from "../context/CartContext";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import { Search, Moon, Sun, ShoppingCart, LogOut, User, LayoutDashboard, Menu } from 'lucide-react';

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
    setTimeout(() => { window.location.href = "/"; }, 1500);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/search?q=${encodeURIComponent(keyword.trim())}`);
    }
  };

  // Hiệu ứng Glassmorphism cho Header
  const headerStyle = {
    backdropFilter: 'blur(12px)',
    backgroundColor: theme === "dark" ? "rgba(18, 18, 18, 0.85)" : "rgba(255, 255, 255, 0.85)",
  };

  return (
    <>
      <nav className={`navbar navbar-expand-lg sticky-top border-bottom transition-all ${
        theme === "dark" ? "navbar-dark border-secondary" : "navbar-light border-light-subtle shadow-sm"
      }`} style={headerStyle}>
        <div className="container py-1">
          {/* LOGO */}
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <span className={`fw-bold fs-4 tracking-tight ${theme === "dark" ? "text-light" : "text-dark"}`}>
              E-<span className="text-primary">Electronics</span>
            </span>
          </Link>

          <button className="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
            <Menu size={24} />
          </button>

          <div className="collapse navbar-collapse" id="navContent">
            {/* LINKS CHÍNH */}
            <ul className="navbar-nav mx-auto gap-1">
              <li className="nav-item">
                <Link to="/" className={`nav-link px-3 py-2 rounded-pill fw-semibold transition-all ${
                  isActive("/") ? "bg-primary text-white shadow-sm" : "hover-bg-theme"
                }`}>Home</Link>
              </li>
              <li className="nav-item">
                <Link to="/shop" className={`nav-link px-3 py-2 rounded-pill fw-semibold transition-all ${
                  isActive("/shop") ? "bg-primary text-white shadow-sm" : "hover-bg-theme"
                }`}>Shop</Link>
              </li>
            </ul>

            {/* ACTIONS */}
            <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0">
              {/* SEARCH BOX */}
              <form onSubmit={handleSearch} className="position-relative d-none d-xl-block">
                <input
                  type="text"
                  className={`form-control border-0 rounded-pill ps-4 pe-5 shadow-sm ${
                    theme === "dark" ? "bg-secondary bg-opacity-25 text-light" : "bg-light text-dark"
                  }`}
                  placeholder="Search products..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  style={{ width: '200px', fontSize: '0.85rem' }}
                />
                <button type="submit" className="btn position-absolute end-0 top-50 translate-middle-y border-0 text-primary pe-3">
                  <Search size={16} />
                </button>
              </form>

              {/* THEME TOGGLE */}
              <button className={`btn btn-icon rounded-circle p-2 border-0 shadow-sm ${
                theme === "dark" ? "bg-dark text-warning" : "bg-light text-primary"
              }`} onClick={toggleTheme}>
                {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              {/* CART */}
              <Link to="/cart" className={`btn position-relative p-2 rounded-circle border-0 shadow-sm ${
                theme === 'dark' ? 'bg-dark text-light' : 'bg-light text-dark'
              }`}>
                <ShoppingCart size={20} />
                {cart.length > 0 && (
                  <span className="badge bg-danger position-absolute top-0 start-100 translate-middle rounded-pill border border-2 border-white" style={{ fontSize: '0.6rem' }}>
                    {cart.length}
                  </span>
                )}
              </Link>

              {/* USER ACTIONS */}
              {user ? (
                <div className="d-flex align-items-center gap-2 ps-2 border-start border-secondary-subtle">
                  {user.role === "admin" && (
                    <Link to="/admin/chat" className="btn btn-warning btn-sm rounded-pill fw-bold px-3 shadow-sm d-none d-md-flex align-items-center gap-1">
                      <LayoutDashboard size={14} /> Admin
                    </Link>
                  )}
                  <Link to="/profile" className="d-flex align-items-center gap-2 text-decoration-none group">
                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-sm" style={{ width: "38px", height: "38px" }}>
                      {user.name.substring(0, 1).toUpperCase()}
                    </div>
                  </Link>
                  <button className="btn btn-outline-danger btn-sm rounded-circle p-2 border-0 shadow-sm" data-bs-toggle="modal" data-bs-target="#logoutModal">
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary rounded-pill px-4 fw-bold shadow transition-all hover-scale" data-bs-toggle="modal" data-bs-target="#loginModal">
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* MODAL XÁC NHẬN - UI Nâng cấp */}
      <div className="modal fade" id="logoutModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-sm modal-dialog-centered">
          <div className={`modal-content border-0 shadow-lg ${
            theme === "dark" ? "bg-dark text-light border border-secondary" : "bg-white text-dark"
          }`} style={{ borderRadius: '20px' }}>
            <div className="modal-body text-center p-4">
              <div className="bg-warning-subtle text-warning d-inline-flex p-3 rounded-circle mb-3">
                <LogOut size={32} />
              </div>
              <h5 className="fw-bold mb-2">Đăng xuất?</h5>
              <p className={`small ${theme === 'dark' ? 'text-white-50' : 'text-muted'}`}>Bạn sẽ cần đăng nhập lại để xem thông tin cá nhân.</p>
              <div className="d-flex gap-2 mt-4">
                <button type="button" className={`btn w-100 rounded-pill fw-bold ${theme === 'dark' ? 'btn-outline-secondary' : 'btn-light border'}`} data-bs-dismiss="modal">Hủy</button>
                <button type="button" className="btn btn-danger w-100 rounded-pill fw-bold" onClick={confirmLogout}>Logout</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Header;