import { useState, useContext, useEffect, useRef } from "react";
import { login } from "../api/authApi";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import ReCAPTCHA from "react-google-recaptcha";

function Login() {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── reCAPTCHA ─────────────────────────────────────────────
  const recaptchaRef = useRef(null);
  const [recaptchaToken, setRecaptchaToken] = useState("");
  // ──────────────────────────────────────────────────────────

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

  // Reset reCAPTCHA khi modal đóng
  useEffect(() => {
    const loginModalEl = document.getElementById("loginModal");
    const handleModalClose = () => {
      recaptchaRef.current?.reset();
      setRecaptchaToken("");
      setError("");
      setEmail("");
      setPassword("");
    };
    loginModalEl?.addEventListener("hidden.bs.modal", handleModalClose);
    return () => loginModalEl?.removeEventListener("hidden.bs.modal", handleModalClose);
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

    // Kiểm tra reCAPTCHA
    if (!recaptchaToken) {
      setError("Vui lòng xác nhận bạn không phải robot!");
      toast.error("Vui lòng xác nhận bạn không phải robot!");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await login({ email, password, recaptchaToken });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("login"));

      toast.success("Đăng nhập thành công!");
      setError("");
      closeModal();

      setEmail("");
      setPassword("");
      recaptchaRef.current?.reset();
      setRecaptchaToken("");

      if (data.user.role === "admin") {
        setTimeout(() => navigate("/admin/dashboard"), 200);
      }
    } catch (err) {
      // Reset reCAPTCHA sau mỗi lần thất bại
      recaptchaRef.current?.reset();
      setRecaptchaToken("");

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("login"));
      const message = err.response?.data?.message || "Email hoặc mật khẩu không chính xác";
      setError(message);
      toast.error(message);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async (credentialResponse) => {
  try {
    const res = await fetch("http://localhost:5000/api/auth/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: credentialResponse.credential,
      }),
    });

    const data = await res.json();

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    window.dispatchEvent(new Event("login"));

    toast.success("Đăng nhập Google thành công!");
    closeModal();

    if (data.user.role === "admin") {
      setTimeout(() => navigate("/admin/dashboard"), 200);
    }

  } catch (err) {
    toast.error("Google login failed");
  }
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

              {/* ── Google reCAPTCHA v2 ── */}
              <div className="d-flex justify-content-center mb-4">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                  onChange={(token) => setRecaptchaToken(token || "")}
                  onExpired={() => {
                    setRecaptchaToken("");
                    toast.warning("reCAPTCHA đã hết hạn, vui lòng xác nhận lại!");
                  }}
                  theme={theme === "dark" ? "dark" : "light"}
                />
              </div>

              {/* LOGIN thường */}
              <button
                type="submit"
                className="btn btn-auth-gradient w-100 py-3 fw-bold shadow"
                disabled={loading || !recaptchaToken}
              >
                {loading ? "ĐANG ĐĂNG NHẬP..." : "LOGIN"}
              </button>

              {/* OR */}
              <div className="text-center my-3">
                <span className="text-muted">OR</span>
              </div>

              {/* Google Login */}
              <div className="d-flex justify-content-center mb-3">
                <GoogleLogin
                  onSuccess={handleGoogleLogin}
                  onError={() => toast.error("Google Login Failed")}
                />
              </div>

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