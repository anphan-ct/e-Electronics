import { useState, useContext, useEffect } from "react";
import { login } from "../api/authApi";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";

function Login() {
  const { theme } = useContext(ThemeContext);
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
    loginModalEl?.addEventListener('hidden.bs.modal', cleanup);
    return () => loginModalEl?.removeEventListener('hidden.bs.modal', cleanup);
  }, []);


  const handleSwitchToRegister = (e) => {
    e.preventDefault();
    const loginModalEl = document.getElementById("loginModal");
    const registerModalEl = document.getElementById("registerModal");

    if (window.bootstrap) {
      const loginInstance = window.bootstrap.Modal.getOrCreateInstance(loginModalEl);
      loginInstance.hide();
      setTimeout(() => {
        const registerInstance = window.bootstrap.Modal.getOrCreateInstance(registerModalEl);
        registerInstance.show();
      }, 400);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      // Gọi API đăng nhập
      const data = await login({ email, password });
      
      // 1. Lưu dữ liệu người dùng và token
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("login"));

      toast.success(`Đăng nhập thành công!`);

      // 2. Bắn sự kiện để Header cập nhật trạng thái ngay lập tức
      window.dispatchEvent(new Event("login"));

      setError(""); 

      // 3. Đóng modal an toàn thông qua Bootstrap API
      const modalElement = document.getElementById("loginModal");
      if (window.bootstrap) {
        const modalInstance = window.bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.hide();
      } 

      setTimeout(() => {
      // Xóa tất cả các lớp backdrop đen mờ còn sót lại
      const backdrops = document.querySelectorAll(".modal-backdrop");
      backdrops.forEach(backdrop => backdrop.remove());

      // Mở khóa cho thẻ body để có thể cuộn trang trở lại
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }, 100); // Đợi 100ms để hiệu ứng đóng hoàn tất

      // Reset form sau khi thành công
      setEmail("");
      setPassword("");

    } catch (err) {
      // Xóa dữ liệu rác nếu đăng nhập lỗi để Header không hiện nhầm Profile
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
        {/* Nâng cấp: Thêm border-0 và bóng đổ shadow mạnh hơn */}
        <div className={`modal-content auth-modal-content border-0 shadow-lg ${
          theme === "dark" ? "bg-dark text-light" : "bg-white text-dark"
        }`}>

          <div className="auth-header position-relative text-center pt-5 pb-2">
            <h2 className="fw-bold mb-0">Login Form</h2>
            <button
              type="button"
              className={`btn-close position-absolute top-0 end-0 m-3 ${theme === 'dark' ? 'btn-close-white' : ''}`}
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body px-4 px-md-5 pb-5">
            {error && <div className="alert alert-danger py-2 mb-4 text-center">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <input
                  type="email"
                  className={`form-control auth-input py-3 ${
                    theme === 'dark' ? 'bg-secondary text-white border-0' : 'bg-light border'
                  }`}
                  placeholder="Email or Username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <input
                  type="password"
                  className={`form-control auth-input py-3 ${
                    theme === 'dark' ? 'bg-secondary text-white border-0' : 'bg-light border'
                  }`}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-auth-gradient w-100 py-3 fw-bold shadow">
                {loading ? "LOGGING IN..." : "LOGIN"}
              </button>

              {/* FIX LỖI MẤT CHỮ: Sử dụng class text-muted hoặc text-white-50 */}
              <div className="text-center mt-4">
                <span className={theme === 'dark' ? 'text-white-50' : 'text-muted'}>
                  Not a member?{" "}
                </span>
                <a 
                  href="#" 
                  className="text-primary text-decoration-none fw-bold"
                  onClick={handleSwitchToRegister}
                >
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