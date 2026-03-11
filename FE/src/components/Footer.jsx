import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { Link } from "react-router-dom";

function Footer() {
  const { theme } = useContext(ThemeContext);

  return (
    <footer className={`custom-footer pt-5 mt-auto ${
      theme === "dark" ? "bg-dark text-light border-top border-secondary" : "bg-white text-dark shadow-lg-top"
    }`}>
      <div className="container">
        <div className="row">

          {/* About MyShop */}
          <div className="col-md-4 mb-4">
            <h5 className="fw-bold mb-3 text-primary">My<span className={theme === 'dark' ? 'text-light' : 'text-dark'}>Shop</span></h5>
            <p className={theme === 'dark' ? 'text-white-50' : 'text-muted'}>
              Your premier destination for high-quality electronics at the most competitive prices in the market.
            </p>
          </div>

          {/* Quick Links Section */}
          <div className="col-md-2 mb-4">
            <h6 className="fw-bold mb-3">Quick Links</h6>
            <ul className="list-unstyled footer-links">
              <li className="mb-2"><Link to="/" className="text-decoration-none">Home</Link></li>
              <li className="mb-2"><Link to="/shop" className="text-decoration-none">Shop</Link></li>
              <li className="mb-2"><Link to="/cart" className="text-decoration-none">Cart</Link></li>
              <li className="mb-2"><Link to="/checkout" className="text-decoration-none">Checkout</Link></li>
            </ul>
          </div>

          {/* Customer Support Section */}
          <div className="col-md-3 mb-4">
            <h6 className="fw-bold mb-3">Support</h6>
            <ul className="list-unstyled footer-links">
              <li className="mb-2"><a href="#!" className="text-decoration-none">FAQ</a></li>
              <li className="mb-2"><a href="#!" className="text-decoration-none">Shipping Info</a></li>
              <li className="mb-2"><a href="#!" className="text-decoration-none">Returns & Refunds</a></li>
              <li className="mb-2"><a href="#!" className="text-decoration-none">Contact Us</a></li>
            </ul>
          </div>

          {/* Contact Information */}
          <div className="col-md-3 mb-4">
            <h6 className="fw-bold mb-3">Contact Us</h6>
            <p className="mb-2">Email: support@myshop.com</p>
            <p className="mb-2">Phone: +84 123 456 789</p>
            <p className="mb-2">Address: HCM City, Vietnam</p>
          </div>

        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className={`footer-bottom text-center py-3 mt-4 ${
        theme === 'dark' ? 'bg-black text-white-50' : 'bg-light text-muted'
      }`}>
        © {new Date().getFullYear()} <span className="fw-bold text-primary">MyShop</span>. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;