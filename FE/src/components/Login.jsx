import { useState, useContext, useEffect } from "react";
import { login } from "../api/authApi";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
 
function Login() {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
 
  useEffect(() => {
    const cleanup = () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      const backdrops = document.querySelectorAll(".modal-backdrop");
      backdrops.forEach(b => b.remove());
    };
    const loginModalEl = document.getElementById("loginModal");
    loginModalEl?.addEventListener("hidden.bs.modal", cleanup);
    return () => loginModalEl?.removeEventListener("hidden.bs.modal", cleanup);
  }, []);
 
  const closeModal = () => {
    const modalElement = document.getElementById("loginModal");
    if (window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(modalElement).hide();
    }
    setTimeout(() => {
      document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }, 100);
  };
 
  const handleSwitchToRegister = (e) => {
    e.preventDefault();
    const loginModalEl = document.getElementById("loginModal");
    const registerModalEl = document.getElementById("registerModal");
    if (window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(loginModalEl).hide();
      setTimeout(() => {
        window.bootstrap.Modal.getOrCreateInstance(registerModalEl).show();
      }, 400);
    }
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
 
    try {
      const data = await login({ email, password });
 
      // Lưu token & user
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("login"));
 
      toast.success("Đăng nhập thành công!");
      setError("");
      closeModal();
 
      // Reset form
      setEmail("");
      setPassword("");
 
      // ★ Nếu là admin → chuyển thẳng vào dashboard
      if (data.user.role === "admin") {
        setTimeout(() => navigate("/admin/dashboard"), 200);
      }
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("login"));
      const message = err.response?.data?.message || "Email hoặc mật khẩu không chính xác";
      setError(message);
      toast.error(message);
    }
    setLoading(false);
  };
 
  return (
    <div className="modal fade" id="loginModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className={`modal-content auth-modal-content border-0 shadow-lg ${
          theme === "dark" ? "bg-dark text-light" : "bg-white text-dark"
        }`}>
 
          <div className="auth-header position-relative text-center pt-5 pb-2">
            <h2 className="fw-bold mb-0">Login Form</h2>
            <button
              type="button"
              className={`btn-close position-absolute top-0 end-0 m-3 ${theme === "dark" ? "btn-close-white" : ""}`}
              data-bs-dismiss="modal"
            />
          </div>
 
          <div className="modal-body px-4 px-md-5 pb-5">
            {error && (
              <div className="alert alert-danger py-2 mb-4 text-center">{error}</div>
            )}
 
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <input
                  type="email"
                  className={`form-control auth-input py-3 ${
                    theme === "dark" ? "bg-secondary text-white border-0" : "bg-light border"
                  }`}
                  placeholder="Email or Username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
 
              <div className="mb-4">
                <input
                  type="password"
                  className={`form-control auth-input py-3 ${
                    theme === "dark" ? "bg-secondary text-white border-0" : "bg-light border"
                  }`}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
 
              <button type="submit" className="btn btn-auth-gradient w-100 py-3 fw-bold shadow">
                {loading ? "ĐANG ĐĂNG NHẬP..." : "LOGIN"}
              </button>
 
              <div className="text-center mt-4">
                <span className={theme === "dark" ? "text-white-50" : "text-muted"}>
                  Not a member?{" "}
                </span>
                <a href="#" className="text-primary text-decoration-none fw-bold"
                  onClick={handleSwitchToRegister}>
                  Signup now
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
 
export default Login;