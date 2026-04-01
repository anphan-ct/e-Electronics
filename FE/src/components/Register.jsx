import { useState, useContext, useEffect, useRef } from "react";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import ReCAPTCHA from "react-google-recaptcha";

function Register() {
  const { theme } = useContext(ThemeContext);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

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

    const regModalEl = document.getElementById("registerModal");
    regModalEl?.addEventListener("hidden.bs.modal", cleanup);
    return () => regModalEl?.removeEventListener("hidden.bs.modal", cleanup);
  }, []);

  // Reset reCAPTCHA khi modal đóng
  useEffect(() => {
    const regModalEl = document.getElementById("registerModal");
    const handleModalClose = () => {
      recaptchaRef.current?.reset();
      setRecaptchaToken("");
      setError("");
      setFormData({ name: "", email: "", password: "" });
    };
    regModalEl?.addEventListener("hidden.bs.modal", handleModalClose);
    return () => regModalEl?.removeEventListener("hidden.bs.modal", handleModalClose);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // Kiểm tra reCAPTCHA
    if (!recaptchaToken) {
      setError("Vui lòng xác nhận bạn không phải robot!");
      toast.error("Vui lòng xác nhận bạn không phải robot!");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        ...formData,
        recaptchaToken, // Gửi token lên server
      });

      toast.success("Đăng ký thành công! Hãy đăng nhập ngay...");

      setTimeout(() => {
        const registerModal = document.getElementById("registerModal");
        const loginModal = document.getElementById("loginModal");

        if (window.bootstrap) {
          window.bootstrap.Modal.getOrCreateInstance(registerModal).hide();
          setTimeout(() => {
            window.bootstrap.Modal.getOrCreateInstance(loginModal).show();
          }, 400);
        }

        setFormData({ name: "", email: "", password: "" });
        recaptchaRef.current?.reset();
        setRecaptchaToken("");
      }, 1500);

    } catch (err) {
      // Reset reCAPTCHA sau mỗi lần thất bại
      recaptchaRef.current?.reset();
      setRecaptchaToken("");

      const msg = err.response?.data?.message || "Đăng ký thất bại, vui lòng thử lại";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleSwitchToLogin = (e) => {
    if (e) e.preventDefault();
    const loginModalEl = document.getElementById("loginModal");
    const registerModalEl = document.getElementById("registerModal");

    if (window.bootstrap) {
      const regInstance = window.bootstrap.Modal.getOrCreateInstance(registerModalEl);
      regInstance.hide();
      setTimeout(() => {
        const loginInstance = window.bootstrap.Modal.getOrCreateInstance(loginModalEl);
        loginInstance.show();
      }, 400);
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
              className={`btn-close position-absolute top-0 end-0 m-3 ${theme === "dark" ? "btn-close-white" : ""}`}
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body px-4 px-md-5 pb-5">
            {error && (
              <div className="alert alert-danger py-2 mb-4 text-center shadow-sm" style={{ fontSize: "14px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="mb-3">
                <input
                  type="text"
                  className={`form-control auth-input py-3 ${theme === "dark" ? "bg-secondary text-white border-0" : "bg-light border"}`}
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <input
                  type="email"
                  className={`form-control auth-input py-3 ${theme === "dark" ? "bg-secondary text-white border-0" : "bg-light border"}`}
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="mb-4">
                <input
                  type="password"
                  className={`form-control auth-input py-3 ${theme === "dark" ? "bg-secondary text-white border-0" : "bg-light border"}`}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              {/* ───────────────────────── */}

              <button
                type="submit"
                className="btn btn-auth-gradient w-100 py-3 fw-bold shadow"
                disabled={!recaptchaToken}
              >
                REGISTER
              </button>

              <div className="text-center mt-4 pt-1">
                <span className={theme === "dark" ? "text-white-50" : "text-muted"}>
                  Already a member?{" "}
                </span>
                <a
                  href="#!"
                  className="text-primary text-decoration-none fw-bold"
                  onClick={handleSwitchToLogin}
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