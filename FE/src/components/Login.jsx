// FE/src/components/Login.jsx
import { useState, useContext, useEffect, useRef } from "react";
import { login } from "../api/authApi";
import { ThemeContext } from "../context/ThemeContext";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import ReCAPTCHA from "react-google-recaptcha";
import { ShieldAlert, Lock, Clock, Link as LinkIcon } from "lucide-react";

function Login() {
  const { theme } = useContext(ThemeContext);
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // ── Liên kết Google ───────────────────────────────────────
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [googleToken,     setGoogleToken]     = useState("");
  const [googleEmail,     setGoogleEmail]     = useState("");

  // ── reCAPTCHA ─────────────────────────────────────────────
  const recaptchaRef = useRef(null);
  const [recaptchaToken, setRecaptchaToken] = useState("");

  // ── Bảo mật ───────────────────────────────────────────────
  const [attempts,       setAttempts]       = useState(0);
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [locked,         setLocked]         = useState(false);
  const [lockCountdown,  setLockCountdown]  = useState(0);
  const [adminLocked,    setAdminLocked]    = useState(false); // Thêm state kiểm tra khóa bởi admin

  // Đếm ngược khi bị khóa tạm thời
  useEffect(() => {
    if (lockCountdown <= 0) {
      if (locked) setLocked(false);
      return;
    }
    const timer = setTimeout(() => setLockCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [lockCountdown, locked]);

  // Cleanup khi modal đóng
  useEffect(() => {
    const loginModalEl = document.getElementById("loginModal");

    const cleanup = () => {
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      document.querySelectorAll(".modal-backdrop").forEach(b => b.remove());
    };

    const handleModalClose = () => {
      cleanup();
      recaptchaRef.current?.reset();
      setRecaptchaToken("");
      setError("");
      setEmail("");
      setPassword("");
      setIsLinkingGoogle(false);
      setGoogleToken("");
      setGoogleEmail("");
      setAdminLocked(false); // Reset trạng thái admin lock
    };

    loginModalEl?.addEventListener("hidden.bs.modal", cleanup);
    loginModalEl?.addEventListener("hidden.bs.modal", handleModalClose);
    return () => {
      loginModalEl?.removeEventListener("hidden.bs.modal", cleanup);
      loginModalEl?.removeEventListener("hidden.bs.modal", handleModalClose);
    };
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
    const loginModalEl    = document.getElementById("loginModal");
    const registerModalEl = document.getElementById("registerModal");
    if (window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(loginModalEl).hide();
      setTimeout(() => {
        window.bootstrap.Modal.getOrCreateInstance(registerModalEl).show();
      }, 400);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();

      // Trường hợp 1: Admin khóa tài khoản
      if (res.status === 403 && data.locked && !data.requiresLinking) {
        setAdminLocked(true);
        setError(data.message);
        toast.error("Tài khoản của bạn đã bị khóa.");
        return;
      }

      // Trường hợp 2: Yêu cầu nhập mật khẩu để liên kết
      if (res.status === 403 && data.requiresLinking) {
        setIsLinkingGoogle(true);
        setGoogleEmail(data.email);
        setGoogleToken(credentialResponse.credential);
        setEmail(data.email);
        setError("");
        toast.info("Vui lòng nhập mật khẩu để liên kết tài khoản Google");
        return;
      }

      if (!res.ok) throw new Error(data.message || "Google login thất bại");

      handleSuccessLogin(data);
    } catch (err) {
      toast.error(err.message || "Google login thất bại");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || (locked && lockCountdown > 0) || adminLocked) return;

    if (requireCaptcha && !recaptchaToken) {
      setError("Vui lòng xác nhận bạn không phải robot!");
      toast.error("Vui lòng xác nhận bạn không phải robot!");
      return;
    }

    setError("");
    setLoading(true);

    try {
      let data;
      
      if (isLinkingGoogle) {
        const res = await fetch("http://localhost:5000/api/auth/google/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: googleEmail, password, token: googleToken }),
        });
        data = await res.json();

        if (!res.ok) {
          throw { response: { status: res.status, data } };
        }
        toast.success("Liên kết tài khoản Google thành công!");
      } 
      else {
        const payload = { email, password };
        if (requireCaptcha && recaptchaToken) payload.recaptchaToken = recaptchaToken;
        data = await login(payload);
        toast.success("Đăng nhập thành công!");
      }

      handleSuccessLogin(data);

    } catch (err) {
      recaptchaRef.current?.reset();
      setRecaptchaToken("");

      const resData = err.response?.data || {};
      const status  = err.response?.status;

      // ── XỬ LÝ NẾU BỊ ADMIN KHÓA THỦ CÔNG ──
      if (status === 403 && resData.locked && !resData.lockMinutes) {
        setAdminLocked(true);
        setError(resData.message || "Tài khoản của bạn đã bị khóa bởi Quản trị viên.");
      } 
      // ── XỬ LÝ NẾU SAI MẬT KHẨU / KHÓA TẠM THỜI ──
      else {
        const newAttempts = resData.attempts || (attempts + 1);
        setAttempts(newAttempts);

        if (resData.requireCaptcha || newAttempts >= 3) setRequireCaptcha(true);

        if (resData.locked || resData.retryAfter) {
          setLocked(true);
          setLockCountdown(resData.retryAfter || (resData.lockMinutes || 1) * 60);
        }

        const message = resData.message || "Email hoặc mật khẩu không chính xác";
        setError(message);
        if (!resData.locked && !resData.retryAfter) toast.error(message);
      }

      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("login"));
    }

    setLoading(false);
  };

  const handleSuccessLogin = (data) => {
    setAttempts(0);
    setRequireCaptcha(false);
    setLocked(false);
    setLockCountdown(0);
    setIsLinkingGoogle(false);
    setAdminLocked(false);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    window.dispatchEvent(new Event("login"));

    closeModal();
    setEmail("");
    setPassword("");
    recaptchaRef.current?.reset();
    setRecaptchaToken("");

    if (data.user.role === "admin") {
      setTimeout(() => navigate("/admin/dashboard"), 200);
    }
  };

  const formatCountdown = (s) => {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
  };

  const isDisabled = loading || (locked && lockCountdown > 0) || adminLocked;

  return (
    <div className="modal fade" id="loginModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className={`modal-content auth-modal-content border-0 shadow-lg ${
          theme === "dark" ? "bg-dark text-light" : "bg-white text-dark"
        }`}>

          <div className="auth-header position-relative text-center pt-5 pb-2">
            <h2 className="fw-bold mb-0">
              {isLinkingGoogle ? "Liên kết tài khoản" : "Login Form"}
            </h2>
            <button type="button"
              className={`btn-close position-absolute top-0 end-0 m-3 ${theme === "dark" ? "btn-close-white" : ""}`}
              data-bs-dismiss="modal" />
          </div>

          <div className="modal-body px-4 px-md-5 pb-5">

            {isLinkingGoogle && !error && (
              <div className="alert alert-primary border-0 mb-4 p-3 rounded-4 d-flex align-items-center gap-3" style={{ fontSize: "13px" }}>
                <LinkIcon size={22} className="flex-shrink-0" />
                <div>Email này đã được đăng ký. Vui lòng nhập mật khẩu để xác nhận liên kết với Google.</div>
              </div>
            )}

            {/* ── BANNER KHÓA BỞI ADMIN ── */}
            {adminLocked ? (
              <div className="alert border-0 mb-4 p-3 rounded-4 d-flex align-items-center gap-3"
                style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
                <ShieldAlert size={26} className="flex-shrink-0" />
                <div>
                  <div className="fw-bold" style={{ fontSize: "14px", marginBottom: "4px" }}>Tài khoản đã bị vô hiệu hóa</div>
                  <div style={{ fontSize: "12px", lineHeight: "1.4" }}>{error}</div>
                </div>
              </div>
            ) : 
            /* ── BANNER KHÓA TẠM THỜI (Sai pass) ── */
            locked && lockCountdown > 0 ? (
              <div className="alert border-0 mb-4 p-3 rounded-4 d-flex align-items-center gap-3"
                style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}>
                <Lock size={22} className="flex-shrink-0" />
                <div>
                  <div className="fw-bold" style={{ fontSize: "13px" }}>Khóa do nhập sai nhiều lần</div>
                  <div style={{ fontSize: "12px" }}>
                    Thử lại sau:{" "}
                    <span className="fw-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatCountdown(lockCountdown)}
                    </span>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="alert alert-danger py-2 mb-4 text-center d-flex align-items-center gap-2 justify-content-center"
                style={{ fontSize: "13px" }}>
                <ShieldAlert size={16} />
                {error}
              </div>
            ) : null}

            {!locked && !adminLocked && attempts >= 3 && attempts < 5 && (
              <div className="alert border-0 mb-3 p-2 rounded-3 text-center"
                style={{ background: "rgba(245,158,11,0.1)", color: "#d97706", fontSize: "12px" }}>
                <Clock size={13} className="me-1" />
                Còn <strong>{5 - attempts}</strong> lần thử trước khi tài khoản bị khóa
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                {/* Đã thêm autoComplete */}
                <input type="email"
                  autoComplete="username" 
                  className={`form-control auth-input py-3 ${
                    theme === "dark" ? "bg-secondary text-white border-0" : "bg-light border"
                  }`}
                  placeholder="Email or Username"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isDisabled || isLinkingGoogle}
                  required />
              </div>

              <div className="mb-4">
                 {/* Đã thêm autoComplete */}
                <input type="password"
                  autoComplete="current-password"
                  className={`form-control auth-input py-3 ${
                    theme === "dark" ? "bg-secondary text-white border-0" : "bg-light border"
                  }`}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={isDisabled}
                  required />
              </div>

              {requireCaptcha && !isDisabled && (
                <div className="mb-4">
                  <div className={`p-2 rounded-3 mb-2 text-center ${
                    theme === "dark" ? "bg-secondary bg-opacity-25" : "bg-light"
                  }`} style={{ fontSize: "11px", color: theme === "dark" ? "#adb5bd" : "#6c757d" }}>
                    <ShieldAlert size={12} className="me-1" />
                    Xác minh bảo mật cần thiết sau nhiều lần đăng nhập sai
                  </div>
                  <div className="d-flex justify-content-center">
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
                </div>
              )}

              <button type="submit"
                className={`btn btn-auth-gradient w-100 py-3 fw-bold shadow ${isLinkingGoogle ? "btn-primary" : ""}`}
                disabled={isDisabled || (requireCaptcha && !recaptchaToken)}>
                {loading              ? "ĐANG XỬ LÝ..." :
                 adminLocked          ? "BỊ VÔ HIỆU HÓA" :
                 locked && lockCountdown > 0 ? `Chờ ${formatCountdown(lockCountdown)}` :
                 isLinkingGoogle      ? "XÁC NHẬN LIÊN KẾT" :
                 "LOGIN"}
              </button>
              
              {isLinkingGoogle && (
                <button type="button" 
                  className={`btn w-100 mt-3 fw-medium shadow-sm ${
                    theme === "dark" ? "btn-outline-light" : "btn-outline-danger"
                  }`}
                  style={{ transition: "all 0.2s ease-in-out" }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                  onClick={() => {
                    setIsLinkingGoogle(false);
                    setError("");
                    setPassword("");
                  }}>
                  Hủy và đăng nhập bằng tài khoản khác
                </button>
              )}

              {!isLinkingGoogle && (
                <>
                  <div className="text-center my-3">
                    <span className={theme === "dark" ? "text-white-50" : "text-muted"}>OR</span>
                  </div>

                  {/* Ẩn nút Google nếu tài khoản đang bị khóa vĩnh viễn để tránh người dùng nhấn nhầm */}
                  {!adminLocked && (
                    <div className="d-flex justify-content-center mb-3">
                      <GoogleLogin
                        onSuccess={handleGoogleLogin}
                        onError={() => toast.error("Google Login Failed")}
                      />
                    </div>
                  )}

                  <div className="text-center mt-3">
                    <span className={theme === "dark" ? "text-white-50" : "text-muted"}>
                      Not a member?{" "}
                    </span>
                    <a href="#" className="text-primary text-decoration-none fw-bold"
                      onClick={handleSwitchToRegister}>
                      Signup now
                    </a>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;