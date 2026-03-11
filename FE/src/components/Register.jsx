import { useState, useContext } from "react";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify"; // Đảm bảo đã import toast

function Register() {
  const { theme } = useContext(ThemeContext);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await axios.post("http://localhost:5000/api/auth/register", formData);
      
      toast.success("Đăng ký thành công! Hãy đăng nhập ngay..."); 

      setTimeout(() => {
        const registerModal = document.getElementById("registerModal");
        const loginModal = document.getElementById("loginModal");

        if (window.bootstrap) {
          // Đóng Modal Đăng ký
          const regInstance = window.bootstrap.Modal.getOrCreateInstance(registerModal);
          regInstance.hide();

          // Mở Modal Đăng nhập
          const loginInstance = window.bootstrap.Modal.getOrCreateInstance(loginModal);
          loginInstance.show();
        }
        
        // Reset form sau khi xong
        setFormData({ name: "", email: "", password: "" });
      }, 1500);

    } catch (err) {
      const msg = err.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại";
      setError(msg);
      toast.error(msg); // Hiện lỗi nếu email đã tồn tại hoặc lỗi server
    }
  };

  return (
    <div className="modal fade" id="registerModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className={`modal-content auth-modal-content border-0 shadow-lg ${
          theme === "dark" ? "bg-dark text-light border-secondary" : "bg-white text-dark"
        }`}>

          <div className="auth-header position-relative text-center pt-5 pb-2">
            <h2 className="fw-bold mb-0">Register Form</h2>
            <button
              type="button"
              className={`btn-close position-absolute top-0 end-0 m-3 ${theme === 'dark' ? 'btn-close-white' : ''}`}
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body px-4 px-md-5 pb-5">
            {/* Hiện lỗi tại chỗ nếu có */}
            {error && <div className="alert alert-danger py-2 mb-4 text-center shadow-sm" style={{ fontSize: '14px' }}>{error}</div>}

            <form onSubmit={handleRegister}>
              <div className="mb-3">
                <input 
                  type="text" 
                  className={`form-control auth-input py-3 ${theme === 'dark' ? 'bg-secondary text-white border-0' : 'bg-light border'}`} 
                  placeholder="Full Name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>

              <div className="mb-3">
                <input 
                  type="email" 
                  className={`form-control auth-input py-3 ${theme === 'dark' ? 'bg-secondary text-white border-0' : 'bg-light border'}`} 
                  placeholder="Email Address" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  required 
                />
              </div>

              <div className="mb-4">
                <input 
                  type="password" 
                  className={`form-control auth-input py-3 ${theme === 'dark' ? 'bg-secondary text-white border-0' : 'bg-light border'}`} 
                  placeholder="Password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  required 
                />
              </div>

              <button type="submit" className="btn btn-auth-gradient w-100 py-3 fw-bold shadow">
                REGISTER
              </button>
              
              <div className="text-center mt-4 pt-1">
                <span className={theme === 'dark' ? 'text-white-50' : 'text-muted'}>
                  Already a member?{" "}
                </span>
                <a 
                  href="#!" 
                  className="text-primary text-decoration-none fw-bold" 
                  data-bs-dismiss="modal" 
                  data-bs-toggle="modal" 
                  data-bs-target="#loginModal"
                >
                  Login now
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;