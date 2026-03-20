import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { Link } from "react-router-dom";
import { 
  Mail, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  ChevronRight, 
  ShieldCheck, 
  Truck, 
  RotateCcw 
} from 'lucide-react';

function Footer() {
  const { theme } = useContext(ThemeContext);

  // 1. ĐỊNH NGHĨA BIẾN MÀU CHỮ (Quan trọng để FAQ không bị xanh)
  const footerTextClass = theme === "dark" ? "text-light" : "text-white";

  return (
    <footer className={`custom-footer pt-5 mt-auto transition-all ${footerTextClass} ${
      theme === "dark" 
        ? "bg-dark border-top border-secondary" 
        : "shadow-lg-top" // Bỏ bg-white để hiện màu Gradient từ index.css
    }`}>
      <div className="container pb-5">
        <div className="row g-4">
          
          {/* CỘT 1: THƯƠNG HIỆU */}
          <div className="col-lg-4 col-md-6">
            <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold fs-4 mb-4 text-decoration-none" to="/">
              <span className="text-white">
                E-<span className={theme === 'dark' ? 'text-primary' : 'text-dark'}>Electronics</span>
              </span>
            </Link>
            <p className="mb-4 pe-lg-5 opacity-75">
              Your premier destination for high-quality electronics at the most competitive prices.
            </p>
          </div>

          {/* CỘT 2: LIÊN KẾT NHANH */}
          <div className="col-lg-2 col-md-6 col-6">
            <h6 className="fw-bold mb-4 text-uppercase tracking-wider small">Quick Links</h6>
            <ul className="list-unstyled footer-links m-0">
              <li className="mb-2"><Link to="/" className={`text-decoration-none hover-link d-flex align-items-center gap-2 ${footerTextClass}`}><ChevronRight size={14} /> Home</Link></li>
              <li className="mb-2"><Link to="/shop" className={`text-decoration-none hover-link d-flex align-items-center gap-2 ${footerTextClass}`}><ChevronRight size={14} /> Shop</Link></li>
              <li className="mb-2"><Link to="/cart" className={`text-decoration-none hover-link d-flex align-items-center gap-2 ${footerTextClass}`}><ChevronRight size={14} /> Cart</Link></li>
              <li className="mb-2"><Link to="/profile" className={`text-decoration-none hover-link d-flex align-items-center gap-2 ${footerTextClass}`}><ChevronRight size={14} /> Profile</Link></li>
            </ul>
          </div>

          {/* CỘT 3: HỖ TRỢ (Đã sửa lỗi FAQ) */}
          <div className="col-lg-3 col-md-6 col-6">
            <h6 className="fw-bold mb-4 text-uppercase tracking-wider small">Hỗ trợ khách hàng</h6>
            <ul className="list-unstyled footer-links m-0"> {/* Thêm lại class footer-links ở đây */}
              <li className="mb-3 d-flex align-items-center gap-3 small"><Truck size={18} /> Miễn phí vận chuyển</li>
              <li className="mb-3 d-flex align-items-center gap-3 small"><ShieldCheck size={18} /> Thanh toán bảo mật</li>
              <li className="mb-3 d-flex align-items-center gap-3 small"><RotateCcw size={18} /> 7 ngày đổi trả</li>
              <li className="mb-2">
                {/* FAQ giờ sẽ nhận class text-white hoặc text-light để không bị xanh */}
                <a href="#!" className={`text-decoration-none hover-link d-flex align-items-center gap-2 ${footerTextClass}`}>
                  <ChevronRight size={14} /> FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* CỘT 4: LIÊN HỆ */}
          <div className="col-lg-3 col-md-6">
            <h6 className="fw-bold mb-4 text-uppercase tracking-wider small">Contact Us</h6>
            <div className="mb-3 d-flex gap-3 small"><MapPin size={20} className="flex-shrink-0" /><span>HCM City, Vietnam</span></div>
            <div className="mb-3 d-flex gap-3 small"><Phone size={20} className="flex-shrink-0" /><span>+84 123 456 789</span></div>
            <div className="d-flex gap-3 small"><Mail size={20} className="flex-shrink-0" /><span>support@myshop.com</span></div>
          </div>

        </div>
      </div>

      <div className={`py-4 border-top border-white border-opacity-10 ${theme === 'dark' ? 'bg-black bg-opacity-20' : 'bg-black bg-opacity-10'}`}>
        <div className="container text-center small opacity-75">
          © {new Date().getFullYear()} <span className="fw-bold">MyShop</span>. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;